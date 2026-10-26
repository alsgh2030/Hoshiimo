from sqlalchemy import MetaData, event
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.settings import settings


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention={
        'ix': 'ix_%(table_name)s_%(column_0_name)s',
        'uq': 'uq_%(table_name)s_%(column_0_name)s',
        'ck': 'ck_%(table_name)s_%(constraint_name)s',
        'fk': 'fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s',
        'pk': 'pk_%(table_name)s',
    })


engine_options = {'isolation_level': 'READ COMMITTED'} if str(settings.db_url).startswith('mysql') else {}
async_engine = create_async_engine(settings.db_url, pool_pre_ping=True, **engine_options)
SessionLocal = async_sessionmaker(async_engine, expire_on_commit=False)

if async_engine.dialect.name == 'sqlite':
    @event.listens_for(async_engine.sync_engine, 'connect')
    def sqlite_foreign_keys(connection, _):
        connection.execute('PRAGMA foreign_keys=ON')


async def get_db():
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.rollback()
