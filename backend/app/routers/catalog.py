from typing import Literal
import unicodedata

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import func, or_, select

from app.db.models import Product
from app.dependencies import DB
from app.schemas import Category, ProductPage, ProductRead

router = APIRouter(prefix='/products', tags=['Products'])


@router.get('', response_model=ProductPage)
async def products(db: DB, q: str = Query('', max_length=100), category: Category | None = None,
                   sort: Literal['recommended', 'price_asc', 'price_desc', 'newest'] = 'recommended',
                   in_stock: bool = False,
                   page: int = Query(1, ge=1), page_size: int = Query(12, ge=1, le=50)):
    filters = [Product.is_active.is_(True)]
    if category:
        filters.append(Product.category == category)
    if in_stock:
        filters.append(Product.stock > 0)
    for term in unicodedata.normalize('NFKC', q).split():
        filters.append(or_(Product.name.contains(term, autoescape=True),
                           Product.description.contains(term, autoescape=True),
                           Product.slug.contains(term, autoescape=True)))
    ordering = {
        'recommended': (Product.image_url.is_(None), Product.id),
        'price_asc': (Product.price_yen, Product.id),
        'price_desc': (Product.price_yen.desc(), Product.id),
        'newest': (Product.id.desc(),),
    }[sort]
    total = await db.scalar(select(func.count()).select_from(Product).where(*filters))
    rows = (await db.scalars(select(Product).where(*filters).order_by(*ordering)
                            .offset((page - 1) * page_size).limit(page_size))).all()
    return ProductPage(items=[ProductRead.model_validate(p) for p in rows], total=total, page=page, page_size=page_size)


@router.get('/{product_id}', response_model=ProductRead)
async def product(product_id: int, db: DB):
    row = await db.get(Product, product_id)
    if not row or not row.is_active:
        raise HTTPException(404, '商品が見つかりません')
    return row
