# 첨부 코드 진단과 반영 내용

검토 대상은 `cmh (2).zip`과 GitHub Hoshiimo 저장소의 `main` 브랜치(`e86ec8d`)입니다.

| 첨부 코드에서 확인한 점 | 이번 전달본 |
|---|---|
| signup에서 `get_password_hash` 호출 | 해싱 의도는 이미 올바름. bcrypt 직접 호출·검증 보강 |
| `UserRead → UserInDB → UserBase`에 password 포함 | 출력 DTO에 password/hash 필드 없음 |
| UTF-8 비밀번호를 `[:72]`로 자름 | 72바이트 초과 입력을 422로 거부 |
| 문자열 길이 72 제한만 있음 | 문자 길이 + UTF-8 바이트 길이 검증 |
| `passlib 1.7.4`에서 bcrypt backend 호출 | passlib은 목록에만 유지, bcrypt 5 직접 사용 |
| JWT 함수는 있지만 login에서 사용자만 반환 | 서명된 access token 및 DB refresh session 발급 |
| `timedelta(seconds=expire_delta)`에 timedelta가 전달될 수 있음 | 정수 초 환경 설정과 datetime 연산 명확히 분리 |
| 사용자 인증 dependency 없음 | Bearer 검증·DB 세션 검증·관리자 dependency |
| `allow_credentials=["*"]` 사용 | bool `True`, 허용 Origin 목록 제한 |
| Alembic `target_metadata=None`, versions 비어 있음 | metadata 연결·초기 migration·upgrade/downgrade |
| 앱 시작 시 `create_all` | 명시적 Alembic 실행, 앱 시작 때 스키마 변경 안 함 |
| URL을 문자열 f-string으로 조합 | SQLAlchemy URL.create로 특수문자 비밀번호 처리 |
| 모든 회원가입 오류를 401로 처리 | 중복 409, 인증 실패 401, 입력 422, 권한 403 분리 |
| 사용자명 중복만 사전 확인 | 이메일 unique를 DB에서 보장. 표시 이름 중복은 허용 |
| 상품·카트·주문 없음 | 해당 도메인과 관리자 기능 추가 |

코드는 `routers`, `core`, `db`, `services`로 나누는 기존 학습 방향을 유지했습니다. 다만 모든 구조를 그대로 복제하지는 않았습니다. `schemas.py`는 현재 크기에서 한 곳에 두었고, 주문처럼 복잡한 규칙은 서비스에서 처리합니다.

첨부 파일의 `.env` 값은 읽거나 전달본으로 복사하지 않았습니다. 새 키를 생성하도록 `.env.example`을 제공합니다. 원본 ZIP도 변경하지 않았습니다.

## 기존 GitHub 프론트엔드 병합

기존 저장소는 React/Vite/Tailwind로 만든 단일 프론트엔드였습니다. 정적 상품 배열과 React state 장바구니를 FastAPI API 기반 데이터로 교체했고, 프로젝트를 `frontend`, `backend`, `docs` 모노레포 구조로 정리했습니다. 실제 가게 CDN 이미지·임의 리뷰 수·결제수단 표시는 포트폴리오 방문자가 실구매 사이트로 오해할 수 있어 제거했습니다. 기존 로컬 `hero.png`는 `frontend/src/assets/original-hero.png`에 보존했습니다.

## 참고한 공식 자료

- [FastAPI — OAuth2 and JWT](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/)
- [bcrypt 프로젝트 — passlib 1.7.4/bcrypt 5 이슈](https://github.com/pyca/bcrypt/issues/1079)
- [SQLAlchemy — AsyncSession](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)
- [SQLAlchemy — Session Basics](https://docs.sqlalchemy.org/en/20/orm/session_basics.html)

공식 가게 사이트는 메뉴 및 상품 분류를 이해하는 참고로 사용했습니다. 고객 리뷰·고객 정보·사진을 가져오거나 실제 사이트를 변경하지 않았습니다.
