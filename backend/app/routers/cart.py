from fastapi import APIRouter, HTTPException
from sqlalchemy import delete, select

from app.db.models import CartItem, Product
from app.dependencies import CurrentUser, DB
from app.schemas import CartQuantity, CartRead
from app.services.shop import lock_customer, read_cart

router = APIRouter(prefix='/cart', tags=['Cart'])


@router.get('', response_model=CartRead)
async def cart(user: CurrentUser, db: DB):
    return await read_cart(db, user.id)


@router.put('/items/{product_id}', response_model=CartRead)
async def set_quantity(product_id: int, data: CartQuantity, user: CurrentUser, db: DB):
    await lock_customer(db, user.id)
    product = await db.scalar(select(Product).where(Product.id == product_id).with_for_update())
    if not product or not product.is_active:
        raise HTTPException(404, '商品が見つかりません')
    if product.stock < data.quantity:
        raise HTTPException(409, '在庫が不足しています')
    item = await db.scalar(select(CartItem).where(CartItem.user_id == user.id, CartItem.product_id == product_id).with_for_update())
    if item:
        item.quantity = data.quantity
    else:
        db.add(CartItem(user_id=user.id, product_id=product_id, quantity=data.quantity))
    await db.commit()
    return await read_cart(db, user.id)


@router.delete('/items/{product_id}', response_model=CartRead)
async def remove(product_id: int, user: CurrentUser, db: DB):
    await lock_customer(db, user.id)
    await db.execute(delete(CartItem).where(CartItem.user_id == user.id, CartItem.product_id == product_id))
    await db.commit()
    return await read_cart(db, user.id)
