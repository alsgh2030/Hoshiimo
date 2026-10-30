import logging
import time
from collections import OrderedDict, deque
from contextlib import asynccontextmanager
from uuid import uuid4

import uvicorn
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.settings import settings
from app.db.database import async_engine
from app.routers import admin, auth, cart, catalog, orders, images

logger = logging.getLogger('hoshiimo')


@asynccontextmanager
async def lifespan(app):
    yield
    await async_engine.dispose()


app = FastAPI(title='Hoshiimo Portfolio API', version='0.1.0', lifespan=lifespan,
              description='Portfolio demo. No payments, no deliveries. All prices and inventory are sample data.')
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=True,
                   allow_methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
                   allow_headers=['Authorization', 'Content-Type', 'Idempotency-Key'])

# Single-process baseline. Put shared rate limiting at the ingress before multi-worker deployment.
auth_attempts: OrderedDict[str, deque] = OrderedDict()


@app.middleware('http')
async def request_metadata(request: Request, call_next):
    request_id = str(uuid4())
    request.state.request_id = request_id
    if request.method == 'POST' and request.url.path in {'/api/auth/login', '/api/auth/signup', '/api/auth/refresh'}:
        ip = request.client.host if request.client else 'unknown'
        now = time.monotonic()
        attempts = auth_attempts.setdefault(ip, deque())
        auth_attempts.move_to_end(ip)
        while attempts and now - attempts[0] >= 60:
            attempts.popleft()
        if len(auth_attempts) > 10000:
            auth_attempts.popitem(last=False)
        if len(attempts) >= settings.auth_rate_limit:
            return JSONResponse({'detail': 'しばらく待ってから再試行してください'}, status_code=429,
                                headers={'Retry-After': '60', 'X-Request-ID': request_id})
        attempts.append(now)
    response = await call_next(request)
    response.headers['X-Request-ID'] = request_id
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['Cache-Control'] = 'no-store'
    return response


@app.exception_handler(RequestValidationError)
async def validation_error(request, exc):
    # Pydantic input/context may contain the submitted password. Never echo it.
    errors = [{'loc': e['loc'], 'msg': e['msg'], 'type': e['type']} for e in exc.errors()]
    return JSONResponse({'detail': errors}, status_code=422)


@app.exception_handler(Exception)
async def unexpected_error(request, exc):
    request_id = getattr(request.state, 'request_id', str(uuid4()))
    logger.error('request_id=%s exception=%s', request_id, type(exc).__name__)
    return JSONResponse({'detail': '処理に失敗しました。再試行してください', 'request_id': request_id}, status_code=500)


@app.get('/api/health', tags=['Operations'])
async def health():
    return {'status': 'ok', 'mode': 'portfolio-demo'}


@app.get('/api/ready', tags=['Operations'])
async def ready():
    async with async_engine.connect() as conn:
        await conn.execute(text('SELECT 1'))
    return {'status': 'ready'}

for router in [auth.router, catalog.router, cart.router, orders.router, admin.router, images.router]:
    app.include_router(router, prefix='/api')


if __name__ == '__main__':
    uvicorn.run('main:app', host='127.0.0.1', port=8081, reload=True)
