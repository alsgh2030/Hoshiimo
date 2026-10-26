import argparse
import asyncio
from getpass import getpass

from sqlalchemy import select

from app.core.security import hash_password
from app.db.database import SessionLocal, async_engine
from app.db.models import User
from app.schemas import Signup


async def create(email, username, password):
    data = Signup(email=email, username=username, password=password)
    async with SessionLocal() as db:
        if await db.scalar(select(User.id).where(User.email == data.email)):
            raise SystemExit('Account already exists; no account or permissions were changed.')
        db.add(User(email=data.email, username=data.username,
                    password_hash=hash_password(data.password), is_admin=True))
        await db.commit()
    await async_engine.dispose()
    print('Administrator created.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--email', required=True)
    parser.add_argument('--name', default='管理者')
    args = parser.parse_args()
    password = getpass('New administrator password (8 characters, max 72 UTF-8 bytes): ')
    if password != getpass('Confirm password: '):
        raise SystemExit('Passwords do not match')
    asyncio.run(create(args.email, args.name, password))
