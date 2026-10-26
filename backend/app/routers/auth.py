from datetime import timedelta
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError

from app.core.security import DUMMY_HASH, access_token, digest, hash_password, refresh_secret, verify_password
from app.core.settings import settings
from app.db.models import AuthSession, User, utcnow
from app.dependencies import CurrentUser, DB, trusted_origin
from app.schemas import Login, Signup, TokenResponse, UserRead

router = APIRouter(prefix='/auth', tags=['Authentication'])
COOKIE = 'hoshiimo_refresh'


def set_refresh(response: Response, raw: str):
    response.set_cookie(COOKIE, raw, httponly=True, secure=settings.cookie_secure,
                        samesite='strict', max_age=settings.refresh_token_seconds, path='/api/auth')
    response.headers['Cache-Control'] = 'no-store'


async def issue(db, user, response):
    raw = refresh_secret()
    session = AuthSession(id=str(uuid4()), user_id=user.id, token_hash=digest(raw),
                          expires_at=utcnow() + timedelta(seconds=settings.refresh_token_seconds))
    db.add(session)
    await db.commit()
    set_refresh(response, raw)
    return TokenResponse(access_token=access_token(user.id, session.id), user=UserRead.model_validate(user))


@router.post('/signup', response_model=TokenResponse, status_code=201)
async def signup(data: Signup, response: Response, db: DB):
    user = User(email=data.email, username=data.username,
                password_hash=await run_in_threadpool(hash_password, data.password))
    db.add(user)
    try:
        await db.flush()
        return await issue(db, user, response)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, 'このメールアドレスは登録済みです')


@router.post('/login', response_model=TokenResponse)
async def login(data: Login, response: Response, db: DB):
    user = await db.scalar(select(User).where(User.email == data.email))
    valid = await run_in_threadpool(verify_password, data.password, user.password_hash if user else DUMMY_HASH)
    if not user or not valid:
        raise HTTPException(401, 'メールアドレスまたはパスワードが違います')
    return await issue(db, user, response)


@router.post('/refresh', response_model=TokenResponse, dependencies=[Depends(trusted_origin)])
async def refresh(request: Request, response: Response, db: DB):
    raw = request.cookies.get(COOKIE)
    if not raw:
        raise HTTPException(401, 'ログインが必要です')
    old_hash = digest(raw)
    session = await db.scalar(select(AuthSession).where(
        AuthSession.token_hash == old_hash, AuthSession.revoked.is_(False), AuthSession.expires_at > utcnow()
    ))
    if not session:
        raise HTTPException(401, 'セッションが終了しました')
    new_raw = refresh_secret()
    result = await db.execute(update(AuthSession).where(
        AuthSession.id == session.id, AuthSession.token_hash == old_hash,
        AuthSession.revoked.is_(False), AuthSession.expires_at > utcnow(),
    ).values(token_hash=digest(new_raw)).execution_options(synchronize_session=False))
    if result.rowcount != 1:
        raise HTTPException(401, 'セッションは更新済みです')
    user = await db.get(User, session.user_id)
    await db.commit()
    set_refresh(response, new_raw)
    return TokenResponse(access_token=access_token(user.id, session.id), user=UserRead.model_validate(user))


@router.post('/logout', status_code=204, dependencies=[Depends(trusted_origin)])
async def logout(request: Request, response: Response, db: DB):
    raw = request.cookies.get(COOKIE)
    if raw:
        await db.execute(update(AuthSession).where(AuthSession.token_hash == digest(raw)).values(revoked=True))
        await db.commit()
    response.delete_cookie(COOKIE, path='/api/auth', secure=settings.cookie_secure, httponly=True, samesite='strict')


@router.get('/me', response_model=UserRead)
async def me(user: CurrentUser):
    return user
