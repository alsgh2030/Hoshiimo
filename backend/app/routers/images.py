from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import undefer

from app.db.models import Image
from app.dependencies import AdminUser, DB
from app.schemas import ImageModel
from app.services.images import validate_image

router = APIRouter(prefix='/images', tags=['Images'])


@router.get('', response_model=list[ImageModel])
async def images(admin: AdminUser, db: DB, product_id: int | None = None,
                 page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)):
    statement = select(Image)
    if product_id is not None:
        statement = statement.where(Image.product_id == product_id)
    return (await db.scalars(statement.order_by(Image.id).offset((page - 1) * page_size).limit(page_size))).all()


@router.get('/{image_id}', response_model=ImageModel)
async def metadata(image_id: int, admin: AdminUser, db: DB):
    image = await db.get(Image, image_id)
    if image is None:
        raise HTTPException(404, 'Image not found')
    return image


@router.get('/{image_id}/content')
async def content(image_id: int, db: DB):
    image = await db.scalar(select(Image).where(Image.id == image_id).options(undefer(Image.data)))
    if image is None:
        raise HTTPException(404, 'Image not found')
    return Response(image.data, media_type=image.content_type or validate_image(image.data),
                    headers={'X-Content-Type-Options': 'nosniff'})
