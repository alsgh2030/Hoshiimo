import json

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from app.db.models import AuditLog, Order, Product, User
from app.dependencies import AdminUser, DB
from app.schemas import AuditRead, OrderPage, OrderRead, ProductInput, ProductPage, ProductRead, ProductUpdate, StatusInput
from app.services.shop import transition_order

router = APIRouter(prefix='/admin', tags=['Admin'])


@router.get('/summary')
async def summary(admin: AdminUser, db: DB):
    orders, revenue = (await db.execute(select(func.count(Order.id), func.coalesce(
        func.sum(Order.subtotal_yen + Order.shipping_yen), 0)).where(Order.status != 'cancelled'))).one()
    return {'orders': orders, 'demo_revenue_yen': revenue,
            'users': await db.scalar(select(func.count()).select_from(User)),
            'low_stock': await db.scalar(select(func.count()).select_from(Product)
                                         .where(Product.is_active.is_(True), Product.stock < 5))}


@router.get('/products', response_model=ProductPage)
async def products(admin: AdminUser, db: DB, page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=50)):
    rows = (await db.scalars(select(Product).order_by(Product.id).offset((page-1)*page_size).limit(page_size))).all()
    return ProductPage(items=[ProductRead.model_validate(p) for p in rows],
                       total=await db.scalar(select(func.count()).select_from(Product)), page=page, page_size=page_size)


@router.post('/products', response_model=ProductRead, status_code=201)
async def create_product(data: ProductInput, admin: AdminUser, db: DB):
    product = Product(**data.model_dump())
    db.add(product)
    try:
        await db.flush()
        db.add(AuditLog(actor_id=admin.id, action='product.create', target=str(product.id), detail=data.model_dump_json()))
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, 'この商品コードは使用されています')
    return product


@router.put('/products/{product_id}', response_model=ProductRead)
async def edit_product(product_id: int, data: ProductUpdate, admin: AdminUser, db: DB):
    before = await db.get(Product, product_id)
    if not before:
        raise HTTPException(404, '商品が見つかりません')
    old = ProductRead.model_validate(before).model_dump()
    try:
        result = await db.execute(update(Product).where(Product.id == product_id, Product.version == data.expected_version)
                                  .values(**data.model_dump(exclude={'expected_version'}), version=Product.version + 1)
                                  .execution_options(synchronize_session=False))
        if result.rowcount != 1:
            raise HTTPException(409, '商品が更新されています。再読み込みしてください')
        db.add(AuditLog(actor_id=admin.id, action='product.update', target=str(product_id),
                        detail=json.dumps({'before': old, 'after': data.model_dump()}, ensure_ascii=False)))
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, 'この商品コードは使用されています')
    await db.refresh(before)
    return before


@router.get('/orders', response_model=OrderPage)
async def orders(admin: AdminUser, db: DB, page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=50)):
    rows = (await db.scalars(select(Order).options(selectinload(Order.items)).order_by(Order.created_at.desc(), Order.id)
                            .offset((page-1)*page_size).limit(page_size))).all()
    return OrderPage(items=[OrderRead.model_validate(o) for o in rows],
                     total=await db.scalar(select(func.count()).select_from(Order)), page=page, page_size=page_size)


@router.patch('/orders/{order_id}', response_model=OrderRead)
async def change_status(order_id: str, data: StatusInput, admin: AdminUser, db: DB):
    return await transition_order(db, order_id, data.status, admin, admin=True)


@router.get('/audit', response_model=list[AuditRead])
async def audit(admin: AdminUser, db: DB, page: int = Query(1, ge=1)):
    return (await db.scalars(select(AuditLog).order_by(AuditLog.id.desc()).offset((page-1)*30).limit(30))).all()
