# Vercel + MySQL 배포

React와 FastAPI를 같은 Vercel 프로젝트에 배포합니다. 저장소 루트의 `vercel.json`은 Vercel Services(Beta)를 사용합니다. `/api/*`는 FastAPI, 나머지는 React로 연결되며 인증 쿠키도 같은 도메인을 사용합니다.

## 준비할 것

1. Vercel 계정에서 GitHub `alsgh2030/Hoshiimo`를 Import합니다. Root Directory는 저장소 루트(`.`)입니다. `frontend`만 지정하면 API가 배포되지 않습니다.
2. 본인 소유의 외부 접속 가능한 **MySQL 8.0.16 이상** DB를 연결합니다. Railway MySQL 또는 기존 관리형 MySQL을 사용할 수 있습니다. Vercel은 MySQL 서버 자체를 제공하지 않습니다.
3. 아래 환경변수를 Vercel 프로젝트에 직접 저장합니다. 비밀값을 Git이나 대화창에 올리지 않습니다.

| 환경변수 | 설정 |
| --- | --- |
| `SECRET_KEY` | `python -c "import secrets; print(secrets.token_urlsafe(48))"`로 생성한 값 |
| `DATABASE_URL` | `mysql+asyncmy://사용자:비밀번호@호스트:포트/DB명` (`mysql://`도 지원) |
| `ENVIRONMENT` | `production` |
| `COOKIE_SECURE` | `true` |
| `CORS_ORIGINS` | `["https://실제프로젝트.vercel.app"]` — 로그인할 실제 origin만 입력 |
| `DB_SSL` | 인터넷을 통해 TLS 지원 MySQL에 접속할 때 `true` |
| `DB_SSL_CA` | 공급자가 사설 CA를 요구할 경우 신뢰할 CA 파일 경로 |

`localhost` 또는 `127.0.0.1`은 배포 환경에서 민호님 PC가 아니라 Vercel 실행 환경을 가리킵니다. 로컬 Workbench에서 보던 DB를 그대로 쓰려면 서버에서 접근할 수 있는 네트워크 경로가 필요합니다. 일반적으로 클라우드 MySQL을 만들고 Workbench에서 그 DB에 접속하는 구성이 간단합니다. 관리형 DB의 내부 전용 주소도 Vercel에서 접근할 수 없으므로 외부/TLS 주소를 사용합니다.

## 기존 DB 업그레이드

DB 접속 환경변수가 설정된 Miniconda `fastapi` 환경 또는 서버에서:

```powershell
cd backend
python -m pip install -r requirements.txt
alembic upgrade head
python -m app.seed
```

이 작업은 상품 사진/원본 링크 컬럼을 추가하고, 없는 상품 12종만 넣습니다. 기존 사용자·주문·상품 ID·수정한 가격·재고를 덮어쓰지 않습니다. 이미 존재하는 예전 데모 상품 6종은 그대로 남아 총 18종이 됩니다. 새 DB에는 원본 상품 기반 12종이 표시됩니다.

`alembic downgrade base`는 테이블을 삭제하므로 운영 DB에서 실행하지 마세요. CI의 전용 테스트 DB에서만 롤백을 검증합니다. 마이그레이션·seed를 Vercel 빌드마다 자동 실행하지 않도록 분리했습니다.

## 배포 후 확인

1. `/api/health`에서 API 실행, `/api/ready`에서 DB 연결을 확인합니다.
2. 새 테스트 계정으로 회원가입합니다. `users`에 사용자 1행, `auth_sessions`에 세션 1행이 생성됩니다. 비밀번호는 `password_hash`에 bcrypt 해시로 저장됩니다.
3. 장바구니에 상품을 넣으면 `cart_items`에 저장됩니다.
4. 모의 주문을 확정하면 `orders`·`order_items`에 저장되고 재고가 차감됩니다. 주문을 재시도해도 동일한 Idempotency-Key로 중복 주문을 방지합니다.
5. 새로고침 후 로그인 유지와 주문 내역을 확인합니다. 로그아웃 후 세션이 거부되는지도 확인합니다.

Workbench에서 읽기 전용으로 확인할 SQL:

```sql
SELECT id, email, username, created_at FROM users ORDER BY id DESC LIMIT 10;
SELECT id, user_id, status, subtotal_yen, shipping_yen, created_at
FROM orders ORDER BY created_at DESC LIMIT 10;
SELECT order_id, product_id, product_name, quantity, unit_price_yen
FROM order_items ORDER BY id DESC LIMIT 20;
```

회원가입·모의 주문은 실제 DB에 영구 저장되지만 결제·배송·이메일 발송은 하지 않습니다. API의 인증 요청 제한은 프로세스별이므로 공개 테스트 시 Vercel Firewall에도 인증 경로의 요청 제한을 설정하세요. Preview는 별도 DB를 사용하며 Production DB를 자동 공유하지 마세요. 배포 완료 여부와 공개 URL은 실제 배포 결과로 확인해야 합니다.

참고: https://vercel.com/docs/services · https://vercel.com/docs/frameworks/backend/fastapi
