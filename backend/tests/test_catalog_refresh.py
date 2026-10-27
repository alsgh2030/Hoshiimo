from sqlalchemy import func, select

from app.db.models import Product
from app.seed import PRODUCTS, seed_products


async def test_search_description_terms_sort_stock_and_literal_wildcards(client, db_factory):
    async with db_factory() as db:
        row = await db.get(Product, 1)
        row.description = '小分け 100g 食べ比べ'
        row.stock = 0
        row.image_url = '/images/products/tokusenhiraboshi.jpg'
        await db.commit()
    result = (await client.get('/api/products', params={'q': '小分け　１００g'})).json()
    assert result['total'] == 1
    assert result['items'][0]['image_url'].endswith('tokusenhiraboshi.jpg')
    assert (await client.get('/api/products?q=%25')).json()['total'] == 0
    assert (await client.get('/api/products?q=_')).json()['total'] == 0
    assert (await client.get('/api/products?q=小分け&in_stock=true')).json()['total'] == 0
    result = (await client.get('/api/products?sort=price_desc&page_size=1')).json()
    assert result['total'] == 2
    assert result['items'][0]['price_yen'] == 2000
    assert (await client.get('/api/products?sort=untrusted')).status_code == 422


async def test_seed_repeatedly_preserves_existing_stock_and_edits(db_factory):
    async with db_factory() as db:
        assert await seed_products(db) == 12
        row = await db.scalar(select(Product).where(Product.slug == PRODUCTS[0]['slug']))
        row.stock = 7
        row.price_yen = 1234
        row.name = 'Administrator edit'
        await db.commit()
        assert await seed_products(db) == 0
        await db.refresh(row)
        assert (row.stock, row.price_yen, row.name) == (7, 1234, 'Administrator edit')
        assert await db.scalar(select(func.count()).select_from(Product)) == 14
