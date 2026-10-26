import os

os.environ.setdefault('SECRET_KEY', 'test-only-secret-with-at-least-32-characters')
os.environ.setdefault('DATABASE_URL', 'sqlite+aiosqlite:///:memory:')
os.environ.setdefault('AUTH_RATE_LIMIT', '10000')

import httpx
import pytest_asyncio
from sqlalchemy import event
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.security import hash_password
from app.db.database import Base, get_db
from app.db.models import Product, User
from main import app, auth_attempts


@pytest_asyncio.fixture
async def db_factory(tmp_path):
    url = os.environ.get('TEST_DATABASE_URL', f'sqlite+aiosqlite:///{tmp_path / "test.db"}')
    if 'mysql' in url and not (make_url(url).database or '').endswith('_test'):
        raise RuntimeError('Tests may drop tables: database name must end with _test')
    options = {'isolation_level': 'READ COMMITTED'} if url.startswith('mysql') else {}
    engine = create_async_engine(url, poolclass=NullPool, **options)
    if engine.dialect.name == 'sqlite':
        @event.listens_for(engine.sync_engine, 'connect')
        def fk(conn, _):
            conn.execute('PRAGMA foreign_keys=ON')
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as db:
        db.add(User(email='admin@example.com', username='Admin', is_admin=True,
                    password_hash=hash_password('AdminTest123!')))
        db.add_all([
            Product(slug='premium', name='特選干し芋', description='Test product', category='premium', weight_g=300, price_yen=1500, stock=10),
            Product(slug='standard', name='標準干し芋', description='Test product', category='standard', weight_g=500, price_yen=2000, stock=5),
        ])
        await db.commit()
    async def override_db():
        async with factory() as db:
            try:
                yield db
            finally:
                await db.rollback()
    app.dependency_overrides[get_db] = override_db
    auth_attempts.clear()
    yield factory
    app.dependency_overrides.clear()
    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_factory):
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://localhost',
                                 headers={'Origin': 'http://localhost:5173'}) as client:
        yield client


async def register(client, email='demo@example.com'):
    result = await client.post('/api/auth/signup', json={'email': email, 'username': 'Demo', 'password': 'DemoTest123!'})
    assert result.status_code == 201, result.text
    token = result.json()['access_token']
    return {'Authorization': f'Bearer {token}'}


async def admin_headers(client):
    result = await client.post('/api/auth/login', json={'email': 'admin@example.com', 'password': 'AdminTest123!'})
    assert result.status_code == 200
    return {'Authorization': 'Bearer ' + result.json()['access_token']}
