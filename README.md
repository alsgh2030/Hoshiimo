# Hoshiimo — 干し芋のある、やさしい毎日。

React + FastAPI + MySQL로 만든 일본어 쇼핑몰 포트폴리오입니다. 기존 React 시제품을 바탕으로 회원 인증, 상품·재고, 장바구니, 모의 주문, 관리자 기능까지 연결했습니다.

> 이 저장소는 학습·포트폴리오용입니다. 실제 결제·배송·메일 발송은 이루어지지 않으며, 상품명·가격·재고·배송비는 샘플입니다. 실제 구매는 [塚田商店 공식 사이트](https://t-shoten.jp/)를 이용해 주세요.

## 주요 기능

| 영역 | 구현 내용 |
|---|---|
| 인증 | 회원가입, bcrypt 비밀번호 해싱, JWT access token, 회전형 refresh session |
| 상품 | 원본 사진 기반 12종, 이름·설명 검색, 카테고리, 가격순·신착순, 재고 필터, 페이지네이션 |
| 장바구니 | 회원별 DB 저장, 수량·재고 검증 |
| 모의 주문 | 서버 가격 계산, 상품 스냅샷, 재고 차감·주문 저장 transaction |
| 중복·취소 | Idempotency-Key, 사용자별 접근 제한, 취소 시 재고 복구 |
| 관리자 | 상품·재고 편집, 낙관적 잠금, 주문 상태 전환, 감사 로그 |
| 품질 | Alembic, pytest, MySQL CI, Docker Compose, OpenAPI 문서 |

## 폴더 구조

```text
Hoshiimo/
├─ frontend/   React + Vite
├─ backend/    FastAPI + SQLAlchemy + Alembic
├─ docs/       설계·검증·배포·일본어 소개
├─ compose.yaml
└─ environment.yml
```

초기 React 시제품의 `hero.png`는 `frontend/src/assets/original-hero.png`에 보존했습니다. 상품 사진 12장과 메인 사진 1장은 요청에 따라 공식 사이트의 원본 파일을 그대로 저장해 사용합니다. 출처와 체크섬은 [이미지 출처](docs/IMAGE_SOURCES.md)에 기록했습니다. 사진이 없는 기존 상품에는 일러스트가 표시됩니다.

## Vercel 공개 테스트 배포

[Vercel + MySQL 연결 가이드](docs/VERCEL_MYSQL.md)를 참고하세요. 저장소 **루트**를 Vercel 프로젝트로 연결하며, `vercel.json`의 Services(Beta)가 React와 FastAPI를 한 도메인에 배포합니다. 회원가입·장바구니·모의 주문은 연결된 MySQL에 저장됩니다. 배포 계정과 외부 접속 가능한 본인 DB 설정이 필요합니다.

## Windows + 미니콘다 + MySQL 실행

MySQL 8.0.16 이상(권장 8.4), Python 3.12, Node.js 22.12 이상이 필요합니다.

### 1. 백엔드 환경

```powershell
conda create -n hoshiimo python=3.12 -y
conda activate hoshiimo
cd backend
pip install -r requirements.txt
Copy-Item .env.example .env
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

출력한 문자열을 `backend/.env`의 `SECRET_KEY`에 넣고, DB 접속값도 본인 환경에 맞게 수정합니다.

### 2. MySQL 스키마

```sql
CREATE DATABASE hoshiimo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'hoshiimo'@'localhost' IDENTIFIED BY '새_DB_비밀번호';
GRANT ALL PRIVILEGES ON hoshiimo.* TO 'hoshiimo'@'localhost';
```

### 3. 테이블·샘플·관리자

```powershell
alembic upgrade head
python -m app.seed
python -m app.create_admin --email admin@example.com --name Minho
python main.py
```

- API: <http://127.0.0.1:8081>
- Swagger: <http://127.0.0.1:8081/docs>

### 4. React

새 터미널에서 저장소의 `frontend` 폴더로 이동합니다.

```powershell
npm ci
npm run dev
```

<http://localhost:5173>에서 확인합니다. 한 브라우저에서는 `localhost` 또는 `127.0.0.1` 중 하나를 일관되게 사용하세요.

## 테스트

```powershell
cd backend
pip install -r requirements-dev.txt
python -m pytest -q

cd ../frontend
npm ci
npm run build
```

기본 테스트는 임시 SQLite DB를 사용합니다. MySQL 동시성 테스트는 `_test`로 끝나는 폐기 가능한 전용 DB에서만 실행하세요.

```powershell
$env:TEST_DATABASE_URL="mysql+asyncmy://hoshiimo:비밀번호@127.0.0.1:3306/hoshiimo_test"
python -m pytest -q
Remove-Item Env:TEST_DATABASE_URL
```

## 문서

- [설계·ERD·API](docs/ARCHITECTURE.md)
- [기존 코드 진단과 변경 사항](docs/CHANGES.md)
- [검증 결과와 로드맵](docs/VALIDATION_AND_ROADMAP.md)
- [배포 전 점검](docs/DEPLOYMENT.md)
- [일본어 포트폴리오 소개](docs/PORTFOLIO_JA.md)
- [OpenAPI 명세](docs/openapi.json)

## 패키지 메모

사용자가 지정한 Python 버전 목록은 `backend/requirements.txt`에 반영했습니다. 다른 PC에서 설치할 수 없는 로컬 경로형 `packaging` 항목만 일반 버전 고정으로 바꿨습니다. `passlib==1.7.4`는 목록에 남아 있지만 bcrypt 5와의 호환 문제 때문에 앱의 비밀번호 처리는 `bcrypt`를 직접 사용합니다.
