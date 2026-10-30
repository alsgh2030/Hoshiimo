"""Run after alembic upgrade head. Imports bundled images without duplicates."""
import asyncio
from pathlib import Path

from sqlalchemy import select

from app.db.database import SessionLocal, async_engine
from app.db.models import Image, Product
from app.services.images import validate_image

ASSETS = Path(__file__).resolve().parents[2] / 'frontend' / 'public'


async def import_images(db):
    added = 0
    products = (await db.scalars(select(Product).with_for_update())).all()
    for product in products:
        existing = await db.scalar(select(Image).where(Image.product_id == product.id))
        if existing:
            product.image_url = existing.url
            continue
        if not product.image_url or not product.image_url.startswith('/images/products/'):
            continue
        path = (ASSETS / product.image_url.lstrip('/')).resolve()
        if not path.is_relative_to(ASSETS.resolve()) or not path.is_file():
            raise RuntimeError(f'Missing bundled image for product {product.id}')
        data = path.read_bytes()
        image = Image(product_id=product.id, filename=path.name, data=data, content_type=validate_image(data))
        db.add(image)
        await db.flush()
        product.image_url = image.url
        added += 1
    await db.commit()
    return added


async def main():
    try:
        async with SessionLocal() as db:
            print(f'{await import_images(db)} product images imported. Existing images were preserved.')
    finally:
        await async_engine.dispose()


if __name__ == '__main__':
    asyncio.run(main())
