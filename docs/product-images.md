# 상품 정보와 이미지 동시 등록

## 최초 적용

DB 접속 정보가 설정된 backend 디렉터리에서 실행합니다. Aiven에 적용하려면
해당 DB의 DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_SSL 설정을 사용하세요.
환경변수는 새 PowerShell 창에 자동으로 유지되지 않습니다.

```powershell
git pull origin main
conda activate fastapi
python -m pip install -r requirements.txt
python -m alembic upgrade head
python -m app.import_product_images
python main.py
```

이미지 이관은 저장소 전체가 있는 PC에서 실행합니다(frontend/public/images/products 사용).
상품이 아직 없는 새 DB에서는 이관 전에 `python -m app.seed`를 실행합니다.
기존 12종 상품이 있으면 첫 이관은 `12 product images imported`가 표시됩니다.
재실행 시 이미 연결된 이미지를 다시 삽입하지 않습니다.
마이그레이션은 기존에 직접 생성한 images 테이블과 기존 이미지 바이트를 보존합니다.

## Swagger 테스트

1. http://localhost:8081/docs 접속
2. `POST /api/auth/login`으로 관리자 로그인
3. 응답의 access_token을 상단 Authorize에 입력(HTTP Bearer이므로 토큰 값만 입력)
4. `POST /api/admin/products` → Try it out
5. slug, name, description, category, weight_g, price_yen, stock, is_active 입력
6. file에서 JPEG/PNG/WebP 파일 선택 → Execute

파일은 선택 사항이며 최대 3 MiB, 2천만 픽셀입니다.
상품과 이미지를 하나의 트랜잭션으로 저장합니다. 중복 상품 코드나 잘못된 이미지이면
상품 또는 이미지만 따로 남지 않습니다. 비관리자에게는 등록 권한이 없습니다.
관리자가 없다면 `python -m app.create_admin --email 본인관리자이메일 --name 관리자이름`으로
새 관리자 계정을 만들고 표시되는 프롬프트에서 비밀번호를 입력합니다.

## 조회와 저장 구조

- `GET /api/images`: 관리자용 이미지 목록(기존 이미지와 새 이미지 모두)
- `GET /api/images?product_id=13`: 상품별 이미지
- `GET /api/images/{id}`: 파일명, 상품 ID, MIME 타입, URL
- `GET /api/images/{id}/content`: 원본 이미지 응답, 브라우저에서 바로 표시
- 상품 조회의 image_url도 `/api/images/{id}/content`를 가리킵니다.

images에는 id, filename, data(MySQL LONGBLOB), product_id(FK/UNIQUE), content_type을
저장합니다. 상품당 대표 이미지 1개이며, 이전에 단독 업로드한 이미지는 product_id가
비어 있을 수 있습니다. 목록 응답은 큰 이미지 바이트를 포함하지 않습니다.

기존 main.py의 `/upload`, `/image/{id}`, `/image/show/{id}`는 위 API로 대체했습니다.
파일 없이 JSON으로 등록하려면 `POST /api/admin/products/json`을 사용할 수 있습니다.
관리자 웹 화면의 신규 상품 등록도 같은 multipart API를 사용합니다.

Vercel에는 파일을 임시 저장하지 않고 DB에 원본을 보관합니다. 코드 배포만으로 운영
DB의 마이그레이션·이관이 실행되지는 않으므로 최초 적용 명령을 운영 DB 대상으로
한 번 실행해야 합니다.
