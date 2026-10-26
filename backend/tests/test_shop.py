import asyncio
import os
from uuid import uuid4

import httpx
import jwt
import pytest
from sqlalchemy import func, select, update

from app.core.security import verify_password
from app.core.settings import settings
from app.db.models import AuthSession, CartItem, Order, Product, User
from conftest import admin_headers, register
from main import app


async def put_cart(client, headers, product=1, quantity=1):
    response = await client.put(f'/api/cart/items/{product}', json={'quantity': quantity}, headers=headers)
    assert response.status_code == 200, response.text
    return response


async def place(client, headers, key=None):
    return await client.post('/api/orders', headers={**headers, 'Idempotency-Key': key or str(uuid4())})


async def test_password_hashed_never_returned(client, db_factory):
    headers = await register(client)
    me = await client.get('/api/auth/me', headers=headers)
    assert me.status_code == 200
    assert not any('password' in key for key in me.json())
    async with db_factory() as db:
        user = await db.scalar(select(User).where(User.email == 'demo@example.com'))
        assert user.password_hash.startswith('$2b$12$')
        assert verify_password('DemoTest123!', user.password_hash)
        assert user.password_hash != 'DemoTest123!'


async def test_duplicate_email_case_normalization(client):
    await register(client)
    response = await client.post('/api/auth/signup', json={'email': 'DEMO@example.com', 'username': 'Another', 'password': 'DemoTest123!'})
    assert response.status_code == 409


async def test_password_bytes_not_truncated_and_error_redacted(client):
    password = '한' * 25
    response = await client.post('/api/auth/signup', json={'email': 'long@example.com', 'username': 'Long', 'password': password})
    assert response.status_code == 422
    assert password not in response.text
    assert 'input' not in response.json()['detail'][0]
    ok = await client.post('/api/auth/signup', json={'email': 'valid@example.com', 'username': 'Valid', 'password': '한' * 24})
    assert ok.status_code == 201


async def test_login_wrong_password_and_role_injection(client):
    await register(client)
    response = await client.post('/api/auth/login', json={'email': 'demo@example.com', 'password': 'Incorrect123!'})
    assert response.status_code == 401
    role = await client.post('/api/auth/signup', json={'email': 'admin2@example.com', 'username': 'Admin', 'password': 'DemoTest123!', 'is_admin': True})
    assert role.status_code == 422


async def test_refresh_rotation_cookie_origin_logout_revocation(client, db_factory):
    headers = await register(client)
    old = client.cookies.get('hoshiimo_refresh')
    wrong_origin = await client.post('/api/auth/refresh', headers={'Origin': 'https://evil.example'})
    assert wrong_origin.status_code == 403
    refresh = await client.post('/api/auth/refresh')
    assert refresh.status_code == 200
    assert 'httponly' in refresh.headers['set-cookie'].lower()
    assert 'samesite=strict' in refresh.headers['set-cookie'].lower()
    assert old != client.cookies.get('hoshiimo_refresh')
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://localhost') as other:
        replay = await other.post('/api/auth/refresh', headers={'Origin': 'http://localhost:5173', 'Cookie': f'hoshiimo_refresh={old}'})
        assert replay.status_code == 401
    async with db_factory() as db:
        session = await db.scalar(select(AuthSession).where(AuthSession.user_id == 2))
        assert session.token_hash != client.cookies.get('hoshiimo_refresh')
    assert (await client.post('/api/auth/logout')).status_code == 204
    assert (await client.get('/api/auth/me', headers=headers)).status_code == 401


async def test_expired_and_forged_access_tokens(client):
    headers = await register(client)
    payload = jwt.decode(headers['Authorization'].split()[1], options={'verify_signature': False})
    payload['exp'] = 1
    expired = jwt.encode(payload, settings.secret_key, algorithm='HS256')
    assert (await client.get('/api/auth/me', headers={'Authorization': f'Bearer {expired}'})).status_code == 401
    forged = jwt.encode({**payload, 'exp': 9999999999}, 'not-the-right-signing-key', algorithm='HS256')
    assert (await client.get('/api/auth/me', headers={'Authorization': f'Bearer {forged}'})).status_code == 401


async def test_catalog_search_pagination_and_permissions(client):
    result = (await client.get('/api/products?category=premium&q=特選&page_size=1')).json()
    assert result['total'] == 1 and len(result['items']) == 1
    assert (await client.get('/api/products?page=0')).status_code == 422
    assert (await client.get('/api/cart')).status_code == 401
    headers = await register(client)
    assert (await client.get('/api/admin/summary', headers=headers)).status_code == 403
    assert (await client.put('/api/cart/items/1', json={'quantity': -1}, headers=headers)).status_code == 422
    assert (await client.put('/api/cart/items/1', json={'quantity': 1, 'price_yen': 1}, headers=headers)).status_code == 422


async def test_cart_isolation(client):
    a = await register(client, 'a@example.com')
    b = await register(client, 'b@example.com')
    await put_cart(client, a, quantity=2)
    assert (await client.get('/api/cart', headers=b)).json()['items'] == []
    assert (await client.get('/api/cart', headers=a)).json()['subtotal_yen'] == 3000


async def test_checkout_server_price_snapshot_idempotency_and_clear_cart(client, db_factory):
    headers = await register(client)
    await put_cart(client, headers, quantity=2)
    async with db_factory() as db:
        await db.execute(update(Product).where(Product.id == 1).values(price_yen=1800))
        await db.commit()
    key = str(uuid4())
    result = await place(client, headers, key)
    assert result.status_code == 201, result.text
    order = result.json()
    assert order['subtotal_yen'] == 3600 and order['total_yen'] == 4200
    assert (await place(client, headers, key)).json()['id'] == order['id']
    assert (await client.get('/api/cart', headers=headers)).json()['items'] == []
    async with db_factory() as db:
        assert (await db.get(Product, 1)).stock == 8
        assert await db.scalar(select(func.count()).select_from(Order)) == 1
        await db.execute(update(Product).where(Product.id == 1).values(name='Changed', price_yen=9999))
        await db.commit()
    saved = (await client.get('/api/orders/' + order['id'], headers=headers)).json()
    assert saved['items'][0]['product_name'] == '特選干し芋'
    assert saved['items'][0]['unit_price_yen'] == 1800


async def test_checkout_rollback_all_stock_on_later_item_failure(client, db_factory):
    headers = await register(client)
    await put_cart(client, headers, 1, 2)
    await put_cart(client, headers, 2, 1)
    async with db_factory() as db:
        await db.execute(update(Product).where(Product.id == 2).values(stock=0))
        await db.commit()
    result = await place(client, headers)
    assert result.status_code == 409
    async with db_factory() as db:
        assert (await db.get(Product, 1)).stock == 10
        assert await db.scalar(select(func.count()).select_from(Order)) == 0
        assert await db.scalar(select(func.count()).select_from(CartItem)) == 2


async def test_order_ownership_cancel_exactly_once(client, db_factory):
    a = await register(client, 'a@example.com')
    b = await register(client, 'b@example.com')
    await put_cart(client, a, quantity=2)
    order = (await place(client, a)).json()
    url = '/api/orders/' + order['id']
    assert (await client.get(url, headers=b)).status_code == 404
    assert (await client.post(url + '/cancel', headers=b)).status_code == 404
    assert (await client.post(url + '/cancel', headers=a)).status_code == 200
    assert (await client.post(url + '/cancel', headers=a)).status_code == 200
    async with db_factory() as db:
        assert (await db.get(Product, 1)).stock == 10


async def test_admin_stale_version_archive_and_audit(client, db_factory):
    customer = await register(client)
    admin = await admin_headers(client)
    p = (await client.get('/api/products/1')).json()
    body = {k: v for k, v in p.items() if k not in {'id', 'version'}}
    body.update(expected_version=p['version'], stock=30, is_active=False)
    assert (await client.put('/api/admin/products/1', json=body, headers=customer)).status_code == 403
    assert (await client.put('/api/admin/products/1', json=body, headers=admin)).status_code == 200
    assert (await client.put('/api/admin/products/1', json=body, headers=admin)).status_code == 409
    assert (await client.get('/api/products/1')).status_code == 404
    assert (await client.get('/api/admin/audit', headers=admin)).json()[0]['action'] == 'product.update'


async def test_order_state_machine_free_shipping(client):
    customer = await register(client)
    admin = await admin_headers(client)
    await put_cart(client, customer, quantity=4)
    order = (await place(client, customer)).json()
    assert order['shipping_yen'] == 0
    url = '/api/admin/orders/' + order['id']
    assert (await client.patch(url, headers=admin, json={'status': 'shipped'})).status_code == 409
    assert (await client.patch(url, headers=admin, json={'status': 'packed'})).status_code == 200
    assert (await client.post('/api/orders/' + order['id'] + '/cancel', headers=customer)).status_code == 409
    assert (await client.patch(url, headers=admin, json={'status': 'shipped'})).status_code == 200
    assert (await client.patch(url, headers=admin, json={'status': 'packed'})).status_code == 409


async def test_auth_rate_limit(client, monkeypatch):
    monkeypatch.setattr(settings, 'auth_rate_limit', 2)
    for _ in range(2):
        assert (await client.post('/api/auth/login', json={'email': 'none@example.com', 'password': 'Incorrect123'})).status_code == 401
    assert (await client.post('/api/auth/login', json={'email': 'none@example.com', 'password': 'Incorrect123'})).status_code == 429


@pytest.mark.mysql
@pytest.mark.skipif(not os.environ.get('TEST_DATABASE_URL', '').startswith('mysql'), reason='Requires MySQL row-lock semantics')
async def test_mysql_concurrent_last_item_no_oversell(client, db_factory):
    a = await register(client, 'a@example.com')
    b = await register(client, 'b@example.com')
    async with db_factory() as db:
        await db.execute(update(Product).where(Product.id == 1).values(stock=1))
        await db.commit()
    await put_cart(client, a)
    await put_cart(client, b)
    results = await asyncio.gather(place(client, a), place(client, b))
    assert sorted(r.status_code for r in results) == [201, 409]
    async with db_factory() as db:
        assert (await db.get(Product, 1)).stock == 0
        assert await db.scalar(select(func.count()).select_from(Order)) == 1


@pytest.mark.mysql
@pytest.mark.skipif(not os.environ.get('TEST_DATABASE_URL', '').startswith('mysql'), reason='Requires MySQL row-lock semantics')
async def test_mysql_simultaneous_duplicate_checkout(client, db_factory):
    headers = await register(client)
    await put_cart(client, headers)
    key = str(uuid4())
    a, b = await asyncio.gather(place(client, headers, key), place(client, headers, key))
    assert a.status_code == b.status_code == 201
    assert a.json()['id'] == b.json()['id']
    async with db_factory() as db:
        assert (await db.get(Product, 1)).stock == 9
        assert await db.scalar(select(func.count()).select_from(Order)) == 1
