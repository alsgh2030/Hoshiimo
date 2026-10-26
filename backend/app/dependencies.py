from typing import Annotated

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access
from app.core.settings import settings
from app.db.database import get_db
from app.db.models import AuthSession, User, utcnow

DB = Annotated[AsyncSession, Depends(get_db)]
bearer = HTTPBearer(auto_error=False)


async def current_user(db: DB, credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]):
    if not credentials:
        raise HTTPException(401, 'ログインが必要です', headers={'WWW-Authenticate': 'Bearer'})
    payload = decode_access(credentials.credentials)
    session = await db.get(AuthSession, payload['sid'])
    if not session or session.revoked or session.expires_at <= utcnow() or session.user_id != int(payload['sub']):
        raise HTTPException(401, 'セッションが終了しました')
    user = await db.get(User, session.user_id)
    if not user:
        raise HTTPException(401, 'ログインが必要です')
    return user


CurrentUser = Annotated[User, Depends(current_user)]


async def admin_user(user: CurrentUser):
    if not user.is_admin:
        raise HTTPException(403, '管理者権限が必要です')
    return user


AdminUser = Annotated[User, Depends(admin_user)]


def trusted_origin(request: Request):
    # Cookie-bearing auth mutations always require an explicit trusted Origin.
    if request.headers.get('origin') not in settings.cors_origins:
        raise HTTPException(403, '許可されていないオリジンです')
