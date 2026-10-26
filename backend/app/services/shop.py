import json
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import delete, select, update
from sqlalchemy.orm import selectinload

from app.db.models import AuditLog, CartItem, Order, OrderItem, Product, User
from app.schemas import CartLine, CartRead, ProductRead


def shipping(subtotal):
    return 0 if subtotal == 0 or subtotal >= 5000 else 600


async def lock_customer(db, user_id):
    # Serialize all cart mutations / checkout for the same customer on MySQL.
    await db.scalar(select(User.id).where(User.id == user_id).with_for_update())


async def read_cart(db, user_id):
    lines = (await db.scalars(select(CartItem).where(CartItem.user_id == user_id)
                            .options(selectinload(CartItem.product)).order_by(CartItem.product_id))).all()
    items = [CartLine(product=ProductRead.model_validate(line.product), quantity=line.quantity,
                      line_total_yen=line.product.price_yen * line.quantity) for line in lines]
    subtotal = sum(i.line_total_yen for i in items)
    fee = shipping(subtotal)
    return CartRead(items=items, subtotal_yen=subtotal, shipping_yen=fee, total_yen=subtotal + fee)


async def get_order(db, order_id, user_id=None):
    query = select(Order).where(Order.id == order_id).options(selectinload(Order.items))
    if user_id is not None:
        query = query.where(Order.user_id == user_id)
    order = await db.scalar(query.execution_options(populate_existing=True))
    if not order:
        raise HTTPException(404, '注文が見つかりません')
    return order


async def checkout(db, user_id, key):
    await lock_customer(db, user_id)
    # READ COMMITTED + the customer row lock makes this a fresh, serialized read.
    # Avoid locking an absent idempotency row: gap locks can deadlock independent buyers.
    existing = await db.scalar(select(Order).where(Order.user_id == user_id, Order.idempotency_key == key))
    if existing:
        order_id = existing.id
        await db.commit()
        return await get_order(db, order_id, user_id)
    lines = (await db.scalars(select(CartItem).where(CartItem.user_id == user_id)
                             .order_by(CartItem.product_id).with_for_update())).all()
    if not lines:
        raise HTTPException(409, 'カートが空です')
    ids = [line.product_id for line in lines]
    # Acquire product locks in a stable order to reduce deadlock risk.
    products = (await db.scalars(select(Product).where(Product.id.in_(ids))
                                .order_by(Product.id).with_for_update()
                                .execution_options(populate_existing=True))).all()
    by_id = {p.id: p for p in products}
    snapshots, subtotal = [], 0
    for line in lines:
        product = by_id.get(line.product_id)
        if not product or not product.is_active or product.stock < line.quantity:
            raise HTTPException(409, '在庫が変更されました。カートを確認してください')
        result = await db.execute(update(Product).where(
            Product.id == product.id, Product.stock >= line.quantity, Product.is_active.is_(True)
        ).values(stock=Product.stock - line.quantity, version=Product.version + 1)
            .execution_options(synchronize_session=False))
        if result.rowcount != 1:
            raise HTTPException(409, '在庫が不足しています')
        subtotal += product.price_yen * line.quantity
        snapshots.append(OrderItem(product_id=product.id, product_name=product.name,
                                   unit_price_yen=product.price_yen, quantity=line.quantity))
    order = Order(id=str(uuid4()), user_id=user_id, idempotency_key=key, status='placed',
                  subtotal_yen=subtotal, shipping_yen=shipping(subtotal), items=snapshots)
    db.add(order)
    await db.flush()
    await db.execute(delete(CartItem).where(CartItem.user_id == user_id))
    await db.commit()
    return await get_order(db, order.id, user_id)


async def transition_order(db, order_id, target, actor, admin=False):
    query = select(Order).where(Order.id == order_id)
    if not admin:
        query = query.where(Order.user_id == actor.id)
    order = await db.scalar(query.with_for_update().execution_options(populate_existing=True))
    if not order:
        raise HTTPException(404, '注文が見つかりません')
    if order.status == target:
        await db.commit()
        return await get_order(db, order.id)
    transitions = {'placed': {'packed', 'cancelled'}, 'packed': {'shipped'}, 'shipped': set(), 'cancelled': set()}
    if target not in transitions[order.status] or (not admin and target != 'cancelled'):
        raise HTTPException(409, 'この注文は変更できません')
    previous = order.status
    result = await db.execute(update(Order).where(Order.id == order.id, Order.status == previous)
                              .values(status=target).execution_options(synchronize_session=False))
    if result.rowcount != 1:
        raise HTTPException(409, '注文の状態が変更されました')
    if target == 'cancelled':
        items = (await db.scalars(select(OrderItem).where(OrderItem.order_id == order.id)
                                  .order_by(OrderItem.product_id))).all()
        for item in items:
            await db.execute(update(Product).where(Product.id == item.product_id).values(
                stock=Product.stock + item.quantity, version=Product.version + 1))
    db.add(AuditLog(actor_id=actor.id, action='order.' + target, target=order.id,
                    detail=json.dumps({'from': previous, 'to': target})))
    await db.commit()
    return await get_order(db, order.id)
