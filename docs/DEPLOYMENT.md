# 임시 포트폴리오 운영 안내

현재 전달물은 로컬에서 실행 가능한 소스 패키지입니다. 공개 URL을 발급하거나 사용자 GitHub에 push하지 않았습니다. Docker 설정은 제공하지만 이 실행 환경에는 Docker/MySQL 서버가 없어 실제 컨테이너 기동은 검증하지 못했습니다.

## 권장 배치 구조

한 출처 아래 React 정적 파일과 `/api`를 함께 제공합니다. 예를 들어 `https://demo.example.com`의 정적 파일은 Nginx, `/api`는 사설 네트워크의 FastAPI로 전달합니다. MySQL은 인터넷에 공개하지 않습니다.

이 구조에서 브라우저는 same-origin cookie를 쓰므로, 별도 도메인 간 third-party cookie 문제를 줄일 수 있습니다. 프론트만 정적 호스팅하고 FastAPI와 MySQL을 배치하지 않으면 이 쇼핑몰은 동작하지 않습니다. 이 프로젝트의 Python FastAPI+MySQL 요구를 유지하므로 Cloudflare Workers/D1용 별도 앱으로 바꾸지 않았습니다.

## 개발과 공개 운영의 차이

| 항목 | 로컬 | 공개 데모에서 할 일 |
|---|---|---|
| 주소 | http://localhost | 신뢰되는 인증서의 HTTPS |
| ENVIRONMENT | development | production |
| COOKIE_SECURE | false | true |
| CORS_ORIGINS | localhost 목록 | 정확한 HTTPS 공개 origin만 |
| SECRET_KEY | 새 난수 | 별도 운영용 강한 난수, 호스팅 secret 설정 |
| DB | 연습 전용 | 운영용 전용 DB, 백업·복구 검증 |
| DB 권한 | 로컬 schema 전체 | migration 계정/CRUD 앱 계정 분리 |
| 관리자 | CLI 생성 | 강한 전용 비밀번호, 일반 방문자에게 계정 공유 안 함 |
| 로그 | 최소 예외 종류·request id | secret/개인정보를 제외한 구조화 로그·알림 |
| rate limit | 한 프로세스 메모리/IP | reverse proxy 또는 Redis 기반 공용 제한 |
| 데이터 | 임의 샘플 | 데모임을 상시 표시, 실제 고객정보 수집 안 함 |

Nginx 뒤의 실제 IP 인식은 배포 네트워크에 맞게 설정하세요. 신뢰할 프록시 IP만 Uvicorn에 지정하고 임의 `X-Forwarded-For`를 그대로 신뢰하면 안 됩니다. 현재 Compose에서는 모든 요청이 프록시 IP로 묶여 인증 제한에 함께 걸릴 수 있습니다. 공개 운영 전에 ingress의 rate limit과 전달 헤더 정책을 검증해야 합니다.

## 공개 데모를 띄우기 전 순서

1. 새 GitHub 브랜치에서 기존 저장소와 이 전달본을 비교·병합하고 CI를 실행합니다.
2. MySQL 8.4 전용 테스트 DB에서 전체 테스트와 마이그레이션 upgrade/downgrade를 통과시킵니다.
3. HTTPS, 공개 Origin, Secure cookie, 별도 비밀값을 설정합니다.
4. 운영 DB는 먼저 백업하고 배포 작업에서 `alembic upgrade head`를 1회 실행합니다. 매 worker 시작마다 migration하지 않습니다.
5. 샘플 상품 seed와 관리자 CLI를 수행합니다. 소스나 README에 관리자 비밀번호를 적지 않습니다.
6. 같은 도메인의 `/api`를 연결하고 브라우저에서 가입 → 로그인 → 새로고침 → 주문 → 취소 → 로그아웃까지 확인합니다.
7. 다른 계정으로 타인 주문 접근, 재고 1개 동시 주문, 관리자 재고 편집 충돌을 확인합니다.
8. 개인정보 보관 정책, 만료 세션 정리, DB 백업 복원, 장애 로그·알림을 준비합니다.

실제 결제 키, 카드 정보, 고객 주소를 넣는 단계는 이 데모 범위 밖입니다. 미래의 실운영 전환에는 별도의 결제 테스트 모드 연동, webhook 서명 검증·중복 처리, 주문/결제/재고 상태 설계, 배송·취소·환불 정책이 필요합니다.

## 아직 없는 운영 기능

이메일 소유 검증, 비밀번호 재설정·변경, 다중 세션 관리 UI, 세션 정리 배치, 공유 rate limit, 이미지 업로드, 주문 견적 재확인, 실제 결제·배송·세금 문서, 실사용 데이터 마이그레이션, 부하 시험은 미구현입니다.

현재 '데모 주문 총액'은 취소되지 않은 모의 주문 합계이며 실제 매출이 아닙니다. 관리자 화면도 그렇게 표시합니다.
