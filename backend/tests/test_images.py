import io

import pytest
from PIL import Image as PillowImage
from sqlalchemy import select, func

from app.db.models import Image, Product
from app.import_product_images import import_images
from app.seed import seed_products
from conftest import admin_headers
from main import app


def png():
    output = io.BytesIO()
    PillowImage.new('RGB', (2, 2), 'red').save(output, format='PNG')
    return output.getvalue()


FIELDS = dict(slug='uploaded-image', name='Image product', description='Test', category='standard',
              weight_g='250', price_yen='1000', stock='4')


def test_swagger_has_multipart_file_and_product_fields():
    schema = app.openapi()
    content = schema['paths']['/api/admin/products']['post']['requestBody']['content']
    reference = content['multipart/form-data']['schema']['$ref'].split('/')[-1]
    properties = schema['components']['schemas'][reference]['properties']
    assert set(FIELDS) <= set(properties)
    assert {'type': 'string', 'format': 'binary'} in properties['file']['anyOf']


@pytest.mark.asyncio
async def test_product_image_roundtrip_and_rollback(client, db_factory):
    headers = await admin_headers(client)
    response = await client.post('/api/admin/products', data=FIELDS, files={'file': ('test.png', png(), 'image/png')}, headers=headers)
    assert response.status_code == 201, response.text
    product = response.json()
    content = await client.get(product['image_url'])
    assert content.content == png()
    assert content.headers['content-type'] == 'image/png'
    listing = await client.get('/api/images', params={'product_id': product['id']}, headers=headers)
    assert len(listing.json()) == 1
    assert 'data' not in listing.json()[0]
    duplicate = await client.post('/api/admin/products', data=FIELDS, files={'file': ('test.png', png())}, headers=headers)
    assert duplicate.status_code == 409
    async with db_factory() as db:
        assert await db.scalar(select(func.count()).select_from(Image)) == 1


@pytest.mark.asyncio
async def test_invalid_upload_and_permissions(client, db_factory):
    headers = await admin_headers(client)
    bad = await client.post('/api/admin/products', data=FIELDS, files={'file': ('fake.png', b'not an image', 'image/png')}, headers=headers)
    assert bad.status_code == 422
    oversized = await client.post('/api/admin/products', data=FIELDS,
        files={'file': ('large.png', b'x' * (3 * 1024 * 1024 + 1))}, headers=headers)
    assert oversized.status_code == 413
    denied = await client.post('/api/admin/products', data=FIELDS, files={'file': ('test.png', png())})
    assert denied.status_code == 401
    missing = await client.get('/api/images/999/content')
    assert missing.status_code == 404
    async with db_factory() as db:
        assert await db.scalar(select(func.count()).select_from(Image)) == 0


@pytest.mark.asyncio
async def test_import_existing_images_is_idempotent(db_factory):
    async with db_factory() as db:
        await seed_products(db)
        assert await import_images(db) == 12
        assert await import_images(db) == 0
        assert await db.scalar(select(func.count()).select_from(Image)) == 12
        product = await db.scalar(select(Product).where(Product.slug == 'tsukada-maruboshi-250'))
        assert product.image_url.startswith('/api/images/')
