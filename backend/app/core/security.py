import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import HTTPException

from app.core.settings import settings


def hash_password(password: str) -> str:
    raw = password.encode('utf-8')
    if len(raw) > 72:
        raise ValueError('Password is longer than 72 UTF-8 bytes')
    return bcrypt.hashpw(raw, bcrypt.gensalt(rounds=12)).decode('ascii')


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('ascii'))
    except (ValueError, TypeError, UnicodeError):
        return False


# A fixed valid dummy hash gives unknown users the same expensive verification path.
DUMMY_HASH = bcrypt.hashpw(b'not-a-real-account', bcrypt.gensalt(rounds=12)).decode()


def refresh_secret():
    return secrets.token_urlsafe(48)


def digest(token: str):
    return hashlib.sha256(token.encode()).hexdigest()


def access_token(user_id: int, session_id: str):
    now = datetime.now(timezone.utc)
    return jwt.encode({
        'sub': str(user_id), 'sid': session_id, 'type': 'access',
        'iat': now, 'exp': now + timedelta(seconds=settings.access_token_seconds),
        'iss': 'hoshiimo-api', 'aud': 'hoshiimo-web',
    }, settings.secret_key, algorithm='HS256')


def decode_access(token: str):
    try:
        payload = jwt.decode(
            token, settings.secret_key, algorithms=['HS256'],
            issuer='hoshiimo-api', audience='hoshiimo-web',
            options={'require': ['exp', 'iat', 'sub', 'sid', 'type']},
        )
        if payload['type'] != 'access' or not isinstance(payload['sub'], str):
            raise ValueError('Invalid access token')
        int(payload['sub'])
        return payload
    except (jwt.InvalidTokenError, ValueError, TypeError, KeyError):
        raise HTTPException(401, 'ログインが必要です', headers={'WWW-Authenticate': 'Bearer'})
