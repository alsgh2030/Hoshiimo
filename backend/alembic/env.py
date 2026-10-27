import asyncio

from alembic import context
from app.core.settings import settings
from app.db.database import Base, async_engine
from app.db import models  # noqa: F401 — register every model for autogenerate

target_metadata = Base.metadata


def configure(connection):
    context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()


async def online():
    async with async_engine.connect() as connection:
        await connection.run_sync(configure)
    await async_engine.dispose()


if context.is_offline_mode():
    context.configure(url=settings.db_url, target_metadata=target_metadata, literal_binds=True,
                      dialect_opts={'paramstyle': 'named'})
    with context.begin_transaction():
        context.run_migrations()
else:
    asyncio.run(online())
