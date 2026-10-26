from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import func, select

from app.db.models import Product
from app.dependencies import DB
from app.schemas import Category, ProductPage, ProductRead

router = APIRouter(prefix='/products', tags=['Products'])


@router.get('', response_model=ProductPage)
async def products(db: DB, q: str = Query('', max_length=100), category: Category | None = None,
                   page: int = Query(1, ge=1), page_size: int = Query(12, ge=1, le=50)):
    filters = [Product.is_active.is_(True)]
    if category:
        filters.append(Product.category == category)
    if q.strip():
        filters.append(Product.name.contains(q.strip(), autoescape=True))
    total = await db.scalar(select(func.count()).select_from(Product).where(*filters))
    rows = (await db.scalars(select(Product).where(*filters).order_by(Product.id)
                            .offset((page - 1) * page_size).limit(page_size))).all()
    return ProductPage(items=[ProductRead.model_validate(p) for p in rows], total=total, page=page, page_size=page_size)


@router.get('/{product_id}', response_model=ProductRead)
async def product(product_id: int, db: DB):
    row = await db.get(Product, product_id)
    if not row or not row.is_active:
        raise HTTPException(404, '商品が見つかりません')
    return row
