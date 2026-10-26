from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Header, Query
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.db.models import Order
from app.dependencies import CurrentUser, DB
from app.schemas import OrderPage, OrderRead
from app.services.shop import checkout, get_order, transition_order

router = APIRouter(prefix='/orders', tags=['Demo orders'])


@router.post('', response_model=OrderRead, status_code=201)
async def create_order(user: CurrentUser, db: DB, idempotency_key: Annotated[UUID, Header()]):
    return await checkout(db, user.id, str(idempotency_key))


@router.get('', response_model=OrderPage)
async def orders(user: CurrentUser, db: DB, page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=50)):
    total = await db.scalar(select(func.count()).select_from(Order).where(Order.user_id == user.id))
    items = (await db.scalars(select(Order).where(Order.user_id == user.id).options(selectinload(Order.items))
                             .order_by(Order.created_at.desc(), Order.id).offset((page-1)*page_size).limit(page_size))).all()
    return OrderPage(items=[OrderRead.model_validate(o) for o in items], total=total, page=page, page_size=page_size)


@router.get('/{order_id}', response_model=OrderRead)
async def order(order_id: str, user: CurrentUser, db: DB):
    return await get_order(db, order_id, user.id)


@router.post('/{order_id}/cancel', response_model=OrderRead)
async def cancel(order_id: str, user: CurrentUser, db: DB):
    return await transition_order(db, order_id, 'cancelled', user)
