# Supabase 정리 전 파악 (2026-11-10)

- 읽기만 했고 DB, Storage, 코드는 바꾸지 않았습니다.
- 행과 Storage 목록은 .env.local의 anon 키로 REST와 Storage API를 불러 읽었습니다. 키는 출력하지 않았습니다.
- 정책과 cron은 Supabase 대시보드를 Chrome으로 보기만 했습니다.
- 컬럼 형식은 supabase/listings.sql 기준입니다. 실제 DB의 칸 이름 30개는 행 조회 결과와 같습니다. anon 키로는 PostgREST 스키마 조회가 401로 막혀 있습니다.
- 조회 시각: 2026-11-10 16시대(한국).

## 1. listings 행

| 항목 | 수 | 메모 |
|---|---|---|
| 전체 | 21 | 모두 2026-11-10 14:52(한국)에 시드로 등록 |
| status | active 21 | reserved, sold, draft는 0 |
| [테스트] 접두 | 21 | 모두 description이 '[테스트]'로 시작. title, brand, model에는 없음 (= 시드 21행 전부) |
| 이미지 있는 행 | 4 | 각 5장, 모두 Storage 파일 (Accuphase E-380, McIntosh MC275, KEF LS50 Meta, Rega Planar 3) |
| 지역(location) 빈 행 | 0 | 21행 모두 kr_ 지역 값 있음. 지금 폼은 listingRegion이 꺼져 있어 새 매물은 지역 null |
| updated_at 있는 행 | 0 | 21행 모두 비어 있음 (등록 뒤 수정한 행 없음) |

### 카테고리별 (category 칸 기준. 21행 모두 categories = [category]라 교차 등록 없음)

보이는 10개

| 대분류 | 세부 카테고리 | 행 |
|---|---|---|
| 앰프 | 프리앰프 | 1 |
| 앰프 | 파워앰프 | 2 |
| 앰프 | 인티앰프 | 2 |
| 앰프 | 리시버 | 0 |
| 스피커 | 북쉘프 스피커 | 2 |
| 스피커 | 플로어 스탠딩 스피커 | 1 |
| 소스기기 | 턴테이블 | 3 |
| 소스기기 | 카세트 데크 | 4 |
| 소스기기 | CD 플레이어 | 0 |
| 소스기기 | 튜너 | 0 |
| | 합계 | 15 |

숨긴 카테고리 (목록과 개수에서 빠지고 상세 주소로만 열림)

| 대분류 | 세부 카테고리 | 행 |
|---|---|---|
| 앰프 | 포노앰프 | 1 |
| 앰프 | 헤드폰 앰프 | 1 |
| 스피커 | 톨보이 스피커 | 1 |
| 스피커 | 서브우퍼 | 1 |
| 스피커 | 사운드바 | 1 |
| 소스기기 | 올인원 오디오 | 1 |
| | 합계 | 6 |

### 새 폼 형식(specs.tech.customSpecs)이 아닌 행: 5

| id 앞 8자 | 매물 | 세부 카테고리 | 상세 모드 |
|---|---|---|---|
| aa996f16 | Musical Fidelity MX-VYNL | 포노앰프 | fields |
| df6c595f | Sennheiser HDV 820 | 헤드폰 앰프 | fields |
| aa7e10a7 | DALI Oberon 7 | 톨보이 스피커 | fields |
| 10c44172 | SVS SB-2000 Pro | 서브우퍼 | fields |
| db90a297 | Sonos Arc + Sub (Gen 3) | 사운드바 | fields |

- 5행 모두 숨긴 카테고리이고 상세 모드가 'fields'(정해진 칸)입니다. 이 모드에서는 지금 폼도 customSpecs를 쓰지 않으므로 옛 형식이라서 빠진 것이 아닙니다.
- 상세 모드 'custom' 16행은 모두 customSpecs가 2~5줄 있습니다.
- 옛 형식 행(specs.tech가 없거나 평면 사양 키가 있는 행)은 0입니다. 21행 모두 specs 맨 위 키가 appearance, working, tech, components뿐이고 condition은 모두 used, currency는 모두 krw입니다.
- 지금 폼과 다른 점: 21행 모두 specs.tech.type(11-10에 지운 '타입' 칸 값, 한글 세부 카테고리 이름)이 남아 있습니다. 지금 폼과 시드는 이 값을 저장하지 않고 화면도 읽지 않습니다.

## 2. Storage listings 버킷

| 항목 | 값 |
|---|---|
| 파일 | 21개, 18,189,820바이트(약 18.2MB). 폴더 없이 전부 버킷 맨 위 |
| 매물 images가 참조하는 파일 | 20개, 18,189,820바이트 (4행 × 5장) |
| 참조되지 않는 파일(고아) | 1개, 0바이트 |
| images가 가리키는데 Storage에 없는 파일 | 0 |

고아 목록

| 파일 | 크기 | 만든 날 | 메모 |
|---|---|---|---|
| .emptyFolderPlaceholder | 0바이트 | 2026-05-28 | 대시보드가 빈 폴더 표시용으로 만드는 파일. 시드 스크립트도 '.'으로 시작하는 이름은 건너뜀 |

## 3. listings 컬럼 30개

판정: 사용 중 / 유지(숨김 칸) = 플래그로 숨긴 칸의 컬럼 / 넣기만 함 = 폼이 값을 받지만 읽는 곳 없음 / 삭제 후보 = 넣지도 읽지도 않음

| 컬럼 | 형식(기본값) | 등록 폼(toListingRow)이 넣나 | 화면이나 필터가 읽나 | 같은 값을 담는 다른 곳 | 판정 |
|---|---|---|---|---|---|
| id | uuid (자동) | 아니오, DB가 만듦 | 예: 상세 주소, 카드 링크 | 없음 | 사용 중 |
| created_at | timestamptz (now) | 아니오, DB가 만듦 | 예: 최신순 정렬, 상세의 'N일 전' | 없음 | 사용 중 |
| updated_at | timestamptz | 아니오. 수정할 때 트리거가 넣음(21행 모두 빈 값) | 아니오 | 없음 | 삭제 후보 |
| seller_id | uuid (auth.users 참조) | null만 넣음 | 아니오 | 없음 | 삭제 후보(규칙상). 회원 기능 때 판매자 연결 자리 |
| status | text ('active') | 'active' 고정 | 예: 목록은 active만 가져옴 | 없음 | 사용 중 |
| title | text | 예. 브랜드 + 모델 + 세부 카테고리로 자동, 고칠 수 있음 | 둘러보기 검색어 대상만. 카드와 상세는 브랜드, 모델을 씀 | brand, model, category로 만들 수 있음 | 사용 중 |
| description | text | 예 | 둘러보기 검색어 대상만. 상세의 '제품 설명'은 고정 글(McIntosh MC152)이라 이 값을 보여 주지 않음 | 없음 | 사용 중 |
| brand | text | 예 | 예 | 없음 | 사용 중 |
| model | text | 예 | 예 | 없음 | 사용 중 |
| year | text | 예 | 예: 상세 출시 연도, 연도 표시 | release_year (21행 모두 같은 값) | 사용 중 |
| release_year | int | 예, year에서 숫자로 | 예: 출시 연도 범위 필터 | year | 사용 중 |
| category | text (슬러그) | 예 | 예 | categories의 첫 값, specs.tech.type(지운 칸, 한글) | 사용 중 |
| categories | text[] ('{}') | 예, 교차 등록 포함 | 예: 숨긴 카테고리 판정, 카드 | category (21행 모두 [category]) | 사용 중 |
| finish | text | 폼에 칸이 없어 늘 null. 시드 14행만 값 | 아니오 | specs.tech.finish (fields 모드 3행, 같은 값) | 삭제 후보 |
| country | text (제조국 키) | 예, 제조국 칸 | 예: 제조국 필터, 상세 | 없음 | 사용 중 |
| handmade | boolean (false) | 칸 숨김이라 늘 false | 예: 상세 | 없음 | 유지(숨김 칸, handmadeField) |
| condition | text | 예 | 예 | 없음 | 사용 중 |
| price | bigint | 예 | 예 | 없음 | 사용 중 |
| compare_price | bigint | 예, 정가 칸 | 아니오 | 없음 | 넣기만 함 |
| accept_offers | boolean (true) | 칸 숨김이라 늘 false | 아니오 | 없음 | 유지(숨김 칸, commerce) |
| ownership | text | 칸 숨김이라 null(시드는 값 있음) | 플래그가 꺼져 필터와 상세 줄도 숨김 | 없음 | 유지(숨김 칸, ownership) |
| location | text (지역 키) | 칸 숨김이라 null(시드 21행은 값 있음) | 예: 둘러보기 지역 필터, 카드, 상세(비면 줄 숨김) | 없음 | 유지(숨김 칸, listingRegion) |
| sku | text | 칸 숨김이라 null | 아니오 | 없음 | 유지(숨김 칸, sku) |
| youtube_link | text | 예, 유튜브 영상 칸 | 아니오 | 없음 | 넣기만 함 |
| images | text[] ('{}') | 예 | 예 | 없음 | 사용 중 |
| shipping_type | text | 예, 배송 방법 | 아니오 | 없음 | 넣기만 함 |
| shipping_cost | int | 예 | 아니오 | 없음 | 넣기만 함 |
| local_pickup | boolean (false) | 예, 직거래 체크 | 아니오 | 없음 | 넣기만 함 |
| specs | jsonb ('{}') | 예 | 예 | 위 tech.type, tech.finish | 사용 중 |
| currency | text ('krw') | 칸 숨김이라 늘 'krw' | 예: 가격 표시(₩) | 없음 | 유지(숨김 칸, japan) |

- 칸을 DB에서 지우기 전에 코드(toListingRow, 시드)에서 그 칸을 먼저 빼야 합니다. 코드가 없는 칸에 값을 넣으려 하면 등록과 재시드가 실패합니다. (updated_at은 코드가 넣지 않으므로 해당 없음)

## 4. 정책과 cron (대시보드 읽기)

| 종류 | 이름 | 명령 | 대상 | 왜 필요한지 |
|---|---|---|---|---|
| listings RLS | listings_select_all | SELECT | public | 누구나 매물 목록과 상세를 봄 |
| listings RLS | listings_insert_temp | INSERT | public | 로그인 없이 등록 폼과 시드가 매물을 넣음. 회원 기능이 생기면 좁힐 임시 정책 |
| keepalive RLS | (정책 없음, RLS 켜짐) | | | 앱 키로는 읽지도 쓰지도 못함. cron은 postgres 역할이라 영향 없음 |
| Storage (listings 버킷, 공개) | Anyone can view listing images | SELECT | public | 파일 목록 조회(list)용. 공개 주소는 정책 없이도 열림 |
| Storage (listings 버킷, 공개) | Anyone can upload listing images (temporary) | INSERT | public | 등록 폼의 사진 올리기 |
| Storage 그 밖 | storage.objects 다른 정책, storage.buckets 정책 | | | 없음 |
| pg_cron | keepalive_hourly | 7 * * * * (매시 7분) | 마지막 실행 2026-11-10 16:07 성공, 다음 17:07, 켜짐 | Free 플랜 일시정지 방지. 매시간 keepalive 1행 갱신 |

- UPDATE, DELETE 정책은 listings와 Storage 모두 없습니다. 앱 키로는 수정, 삭제가 안 되고 삭제는 대시보드 SQL로 합니다.
- 이름이 rls-storage.sql과 다릅니다. 파일은 listings_insert_all, storage_listings_select_all, storage_listings_insert_all입니다. 새 프로젝트 복원에는 상관없지만, 지금 프로젝트에 파일을 돌리면 같은 일을 하는 정책이 하나씩 더 생깁니다(파일 머리 주석도 지금 프로젝트엔 돌리지 말라고 적혀 있음).

## 5. supabase/*.sql 절별 판정

| 파일 | 절 | 판정 | 이유 |
|---|---|---|---|
| listings.sql | create extension pgcrypto | 불필요 | gen_random_uuid()는 PostgreSQL 13부터 기본 기능이고 Supabase엔 pgcrypto가 이미 있어 지금도 아무 일 안 함 |
| listings.sql | 1) create table listings | 복원에 필요 | 30칸, currency 포함으로 지금 DB 칸과 같음. 주석의 상태 키 예시(used_mint 등)는 옛 값 |
| listings.sql | 2) 인덱스 status, created_at | 복원에 필요 | 목록 쿼리가 status로 거르고 created_at으로 정렬 |
| listings.sql | 2) 인덱스 category, brand, categories, specs | 불필요 | 지금 서버 쿼리는 이 칸으로 거르지 않음(필터는 브라우저에서) |
| listings.sql | 3) updated_at 트리거와 함수 | 복원에 필요 | updated_at 칸을 둔다면. 칸을 지우면 같이 불필요 |
| listings.sql | 4) RLS 켜기, listings_select_all | 복원에 필요 | 누구나 조회 |
| listings.sql | (선택) CHECK 제약 주석 | 불필요 | 실행 안 되는 주석. 옛 상태 키라 주석을 풀면 지금 등록(used, unopened)이 막힘 |
| rls-storage.sql | 1) RLS 켜기, listings_select_all | 불필요 | listings.sql 4절과 같은 중복 |
| rls-storage.sql | 1) listings_insert_all | 복원에 필요 | 앱 등록에 필수. 지금 프로젝트 이름은 listings_insert_temp |
| rls-storage.sql | 2) 버킷 listings | 복원에 필요 | 공개, 5MB, JPEG/PNG/WebP |
| rls-storage.sql | 3) Storage 정책 2개 | 복원에 필요 | 사진 올리기와 목록 조회. 지금 프로젝트 이름은 'Anyone can …' 2개 |
| rls-storage.sql | 4) grant usage on schema public | 복원에 필요 | Data API 접근 |
| rls-storage.sql | 4) grant select, insert on listings to anon, authenticated | 복원에 필요 | 2026-05-30 이후 새 프로젝트는 이게 없으면 42501 오류 |
| rls-storage.sql | 4) grant … on listings to service_role | 불필요 | 앱과 스크립트가 service_role 키를 쓰지 않음(.env.local에도 없음) |
| rls-storage.sql | 4) grant … on all sequences | 불필요 | 시퀀스가 없어 아무 일 안 함 |
| rls-storage.sql | 5) pg_cron 확장, cron 권한 2줄 | 복원에 필요 | keepalive 작업에 필요 |
| rls-storage.sql | 5) keepalive 테이블, RLS, 첫 행 | 복원에 필요 | |
| rls-storage.sql | 5) cron.schedule keepalive_hourly | 복원에 필요 | Free 플랜 일시정지 방지 |
| rls-storage.sql | 6) currency 칸 추가 | 이미 실행돼 끝남 | 2026-11-09 적용. listings.sql 테이블 정의에 이미 있어 새 복원에도 필요 없음 |
| rls-storage.sql | 확인용 조회(주석) | 복원에 필요 | 복원 뒤 확인용. 실행 안 되는 주석 |

## 6. 삭제 후보 (SQL은 초안이고 실행하지 않았습니다)

| # | 종류 | 대상 | 왜 후보인지 | 삭제 SQL 초안 |
|---|---|---|---|---|
| 1 | 행 | [테스트] 시드 21행 | description이 '[테스트]'로 시작. 지금 사이트 매물 전부라 지우면 홈과 둘러보기가 빔. 정식 매물로 바꿀 때 지울 대상. 지우면 사진 20개가 고아가 됨(Storage에서도 지워야 함) | `delete from public.listings where description like '[테스트]%';` |
| 2 | 행 데이터 | 21행의 specs.tech.type | 지운 '타입' 칸 값(한글). category와 같은 정보, 읽는 곳 없음. 재시드하면 저절로 없어짐 | `update public.listings set specs = jsonb_set(specs, '{tech}', (specs->'tech') - 'type') where specs->'tech' ? 'type';` (updated_at이 채워짐) |
| 3 | 파일 | .emptyFolderPlaceholder (0바이트) | 참조 없음. 0바이트라 둬도 해 없음 | SQL 삭제는 Supabase가 막고, 막지 않더라도 실제 파일이 남아 고아가 됨. 대시보드 Storage에서 지우거나 `supabase.storage.from('listings').remove(['.emptyFolderPlaceholder'])` (삭제 권한 있는 키 필요. anon 키는 삭제 정책이 없어 불가) |
| 4 | 컬럼 | updated_at (+ 트리거, 함수) | 넣지도 읽지도 않음. 나중에 매물 수정 기능이 생기면 다시 필요할 수 있음 | `drop trigger if exists listings_set_updated_at on public.listings; drop function if exists public.set_updated_at(); alter table public.listings drop column if exists updated_at;` |
| 5 | 컬럼 | seller_id | 늘 null, 읽는 곳 없음. 회원 기능 때 판매자 연결 자리라 두는 쪽을 권함. 지우려면 먼저 toListingRow의 seller_id 줄을 빼야 함 | `alter table public.listings drop column if exists seller_id;` |
| 6 | 컬럼 | finish | 폼에 칸이 없어 새 매물은 늘 null, 읽는 곳 없음. 시드 14행의 값은 화면에 안 나오던 값. 지우려면 먼저 toListingRow, 폼, 시드의 finish를 빼야 함. fields 모드의 마감(색상) 사양은 specs.tech.finish라 영향 없음 | `alter table public.listings drop column if exists finish;` |
| 7 | SQL 절 | listings.sql의 create extension pgcrypto | 아무 일 안 함 | 파일에서 그 줄 삭제(DB에 실행할 SQL 없음) |
| 8 | SQL 절 | listings.sql의 인덱스 4개(category, brand, categories, specs) | 지금 쿼리가 안 씀. 21행이라 있어도 차이 없음. 서버에서 거르게 되면 다시 필요 | 파일에서 4줄 삭제. DB에서도 지우려면 `drop index if exists public.listings_category_idx, public.listings_brand_idx, public.listings_categories_idx, public.listings_specs_idx;` |
| 9 | SQL 절 | listings.sql의 CHECK 제약 주석 | 옛 상태 키라 풀면 등록이 막힘 | 파일에서 주석 묶음 삭제(DB에 실행할 SQL 없음) |
| 10 | SQL 절 | rls-storage.sql 1절의 listings_select_all 재생성 | listings.sql 4절과 중복 | 파일에서 그 묶음 삭제(DB에 실행할 SQL 없음) |
| 11 | SQL 절 | rls-storage.sql 4절의 service_role GRANT | 쓰는 키가 없음. 나중에 서버 관리 스크립트를 쓰면 다시 필요 | 파일에서 그 줄 삭제. DB 권한까지 거두려면 `revoke select, insert, update, delete on table public.listings from service_role;` |
| 12 | SQL 절 | rls-storage.sql 4절의 시퀀스 GRANT | 시퀀스가 없어 아무 일 안 함 | 파일에서 그 줄 삭제(DB에 실행할 SQL 없음) |
| 13 | SQL 절 | rls-storage.sql 6절의 currency 칸 추가 | 이미 실행돼 끝남. listings.sql에 이미 있음 | 파일에서 6절 삭제(DB에 실행할 SQL 없음) |

참고: Storage 표의 행을 SQL로 지우는 것에 대한 Supabase 안내
- https://supabase.com/docs/guides/storage/management/delete-objects
- https://supabase.com/blog/supabase-storage-performance-security-reliability-updates

## 결정 (2026-11-10)

| 대상 | 결정 |
|---|---|
| [테스트] 시드 21행 | 유지. 정식 매물이 등록된 뒤 삭제 (삭제 SQL은 rls-storage.sql 맨 아래 주석) |
| specs.tech.type (21행) | SQL로 제거 (6번 표 2번 초안). 지금 시드와 폼은 이 키를 쓰지 않음(시드 dry-run 확인) |
| 컬럼 (updated_at, seller_id, finish 포함) | 전부 유지 |
| 인덱스 4개 (category, brand, categories, specs) | 유지 (DB와 listings.sql 모두) |
| .emptyFolderPlaceholder | 정하지 않음 (0바이트, 그대로) |
| SQL 파일 | 아래처럼 정리 (DB와 Storage는 바꾸지 않음) |

SQL 파일 정리 내용
- 두 파일 맨 위: "새 프로젝트에 이 파일을 위에서 아래로 돌리면 복원됨. 이미 있는 프로젝트에는 돌리지 말 것(정책 중복)."
- listings.sql: pgcrypto 줄, 옛 상태 키 CHECK 제약 주석 삭제. 인덱스 4개는 그대로
- rls-storage.sql: 1절 중복 조회 정책, 4절 service_role GRANT와 시퀀스 GRANT, 6절 currency 칸 추가 삭제
- 남은 정책 이름을 지금 DB와 같게: listings_select_all(listings.sql), listings_insert_temp, "Anyone can view listing images", "Anyone can upload listing images (temporary)"
- 시험 행 삭제 SQL은 rls-storage.sql 맨 아래 주석으로 둠 (실행은 손으로만)
