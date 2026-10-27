import asyncio
import json
from pathlib import Path

from sqlalchemy import select
from app.db.database import SessionLocal, async_engine
from app.db.models import Product

PRODUCTS = json.loads(Path(__file__).with_name('catalog.json').read_text(encoding='utf-8'))


async def seed_products(db):
    added = 0
    for item in PRODUCTS:
        if not await db.scalar(select(Product.id).where(Product.slug == item['slug'])):
            db.add(Product(**{k: v for k, v in item.items() if k != 'original_image_url'}))
            added += 1
    await db.commit()
    return added


async def main():
    async with SessionLocal() as db:
        added = await seed_products(db)
    await async_engine.dispose()
    print(f'{added} products added. Existing products, stock and orders were preserved.')


if __name__ == '__main__':
    asyncio.run(main())
