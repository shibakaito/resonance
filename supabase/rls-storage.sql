-- ============================================================================
-- rls-storage.sql — 새 Supabase 프로젝트 재생성용 ② (RLS 등록 정책 + Storage 버킷 + Data API GRANT + keepalive 크론 + 칸 추가)
-- ----------------------------------------------------------------------------
-- 실행 순서:  ① supabase/listings.sql  →  ② 이 파일
-- 사용법:    Supabase 대시보드 → SQL Editor 에 전체를 붙여넣고 RUN.
--            여러 번 실행해도 안전합니다 (drop ... if exists / on conflict).
--
-- ⚠️ 현재 상태(2026-09-30): kaito Project엔 이미 전부 적용돼 있음
--            (정책명 listings_select_all / listings_insert_temp, Storage 정책 2개).
--            섹션 5(keepalive 테이블 + pg_cron)는 2026-10-10 대시보드에서 적용됨.
--            → 새 프로젝트 재생성 시에만 실행. 지금 프로젝트에는 돌리지 말 것.
--
-- 왜 필요한가:
--   · listings.sql 은 RLS "조회(SELECT)" 정책만 만듭니다.
--   · 그런데 앱은 로그인 없이 anon 키로 매물을 등록(insert)하고
--     (src/lib/listings.ts → .insert(row).select('id'))
--     이미지를 Storage 'listings' 버킷에 올립니다 (src/lib/upload-image.ts).
--   → 아래 INSERT 정책과 버킷/Storage 정책이 없으면 등록·업로드가 전부 실패합니다.
--   · 2026-05-30 이후 만든 새 프로젝트는 public 테이블이 Data API(supabase-js)에
--     자동 노출되지 않습니다 → 테이블별 GRANT 필요 (섹션 4).
--     예전 프로젝트(2026-04-20 생성)는 기본 GRANT가 있어 해당 없었습니다.
--
-- 보안 메모: 아직 회원 기능이 없어 "누구나" 등록·업로드를 허용합니다 (스팸 가능).
--   회원 기능이 생기면 with check (auth.uid() = seller_id) 처럼 좁히세요.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) listings 테이블 RLS — 누구나 조회 + 누구나 등록
-- ----------------------------------------------------------------------------
alter table public.listings enable row level security;   -- 이미 켜져 있어도 안전

-- 조회 (listings.sql 에도 있음 — 중복 실행 안전)
drop policy if exists listings_select_all on public.listings;
create policy listings_select_all
  on public.listings
  for select
  using (true);

-- 등록 (listings.sql 에 없던 정책 — 앱의 .insert() 에 필수)
drop policy if exists listings_insert_all on public.listings;
create policy listings_insert_all
  on public.listings
  for insert
  with check (true);

-- update / delete 정책은 두지 않음 → anon 은 수정·삭제 불가.
-- (테스트 매물 정리 등은 대시보드 SQL Editor 에서 직접 DELETE)

-- ----------------------------------------------------------------------------
-- 2) Storage 버킷 'listings' — 공개(public) · 5MB · JPEG/PNG/WebP
--    값은 src/lib/upload-image.ts 의 BUCKET / MAX_BYTES / ALLOWED_TYPES 와 동일
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listings',
  'listings',
  true,                                             -- public → getPublicUrl() 로 영구 공개 URL
  5242880,                                          -- 5MB = 5 * 1024 * 1024 바이트
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ----------------------------------------------------------------------------
-- 3) Storage 정책 (storage.objects) — 'listings' 버킷만 누구나 업로드 + 조회
--    storage.objects 는 Supabase 가 기본으로 RLS 를 켜둡니다 (alter 불필요).
-- ----------------------------------------------------------------------------
-- 조회: public 버킷이라 공개 URL 은 정책 없이도 열리지만, list() 등 API 조회용으로 둠
drop policy if exists storage_listings_select_all on storage.objects;
create policy storage_listings_select_all
  on storage.objects
  for select
  using (bucket_id = 'listings');

-- 업로드: 앱의 supabase.storage.from('listings').upload(...) 에 필수
drop policy if exists storage_listings_insert_all on storage.objects;
create policy storage_listings_insert_all
  on storage.objects
  for insert
  with check (bucket_id = 'listings');

-- update / delete 정책은 두지 않음 → 올린 파일 덮어쓰기·삭제는 anon 불가.
-- (upload-image.ts 도 upsert:false 로 덮어쓰기를 막고 있음)

-- ----------------------------------------------------------------------------
-- 4) Data API 노출 GRANT — listings 테이블을 anon/authenticated 가 "볼 수 있게"
--    (RLS 와는 별개의 층. 출처: github.com/orgs/supabase/discussions/45329)
-- ----------------------------------------------------------------------------
-- 왜 RLS 와 별개로 필요한가:
--   · Postgres 는 쿼리를 두 단계로 검사합니다.
--       ① GRANT(권한) — 이 역할(anon 등)이 이 테이블을 아예 건드릴 수 있나?
--       ② RLS(정책)   — 건드릴 수 있다면, 어느 행을 보고/넣을 수 있나?
--     ①이 없으면 ②(섹션 1의 정책)는 평가조차 되지 않고
--     42501 "permission denied for table listings" 로 거절됩니다.
--   · 예전에는 public 스키마의 모든 테이블에 anon/authenticated/service_role 권한이
--     자동으로 붙었지만(4/20 생성 프로젝트가 그랬음), 2026-05-30 이후 새 프로젝트는
--     자동 GRANT 가 없고(2026-10-30 부터는 기존 프로젝트에도 적용), 테이블마다
--     명시적으로 GRANT 해야 supabase-js 가 접근할 수 있습니다.
--   · GRANT 는 같은 문장을 다시 실행해도 변화가 없어 재실행 안전합니다.
--   · storage/auth 스키마는 이 변경 대상이 아니라 섹션 2·3 은 그대로 유효합니다.

-- 스키마 접근 권한 (보통 이미 있지만 명시해 둠 — 재실행 안전)
grant usage on schema public to anon, authenticated, service_role;

-- listings 테이블: 앱(anon 키)이 쓰는 조회 + 등록만. update/delete 는 주지 않음 (RLS 정책도 없음)
grant select, insert on table public.listings to anon, authenticated;

-- service_role: 서버/관리 작업용 전체 권한.
--   (RLS 를 우회하는 관리자 키 — 브라우저/앱 코드에는 절대 넣지 말 것. 필요 없으면 이 줄 삭제)
grant select, insert, update, delete on table public.listings to service_role;

-- 시퀀스: listings 는 id 가 uuid(gen_random_uuid) 라 시퀀스가 없어 지금은 아무것도 안 함(no-op).
--   나중에 serial/identity 컬럼을 추가하면 그 시퀀스 권한이 필요해서 미리 둠 (재실행 안전).
grant usage, select on all sequences in schema public to anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 5) keepalive 테이블 + pg_cron 스케줄 — Free 플랜 일시정지 방지(주 장치)
--    DB 안에서 매시 7분마다 keepalive 행 1개를 갱신(쓰기)합니다.
-- ----------------------------------------------------------------------------
-- 왜: 2026-10-09 Supabase에서 "활동 부족, 곧 일시정지" 경고 메일을 받음.
--   그때까지 장치는 Vercel Cron 이 하루 1번 /api/keepalive(listings 1건 읽기)를 부르는 것뿐이었음.
--   Vercel Cron 은 보조로 그대로 두고, 매시간 쓰기를 주 장치로 추가.
-- 주의:
--   · 프로젝트가 이미 일시정지되면 pg_cron 도 같이 멈춥니다 → 그때는 대시보드 Resume 뿐.
--   · pg_cron 확장을 끄면(drop extension) 등록된 작업이 전부 지워집니다.
--   · '7 * * * *' 는 UTC 기준이지만 한국과 시차가 정확히 9시간이라 한국 시간으로도 매시 7분.

-- pg_cron 확장 — Supabase 문서 권장 스키마 pg_catalog (대시보드 Integrations → Cron 에서 켜도 같음)
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- 기록용 테이블 — 행은 id = 1 하나만 계속 갱신. pinged_at = 마지막 실행 시각, pings = 누적 횟수
create table if not exists public.keepalive (
  id        int         primary key,
  pinged_at timestamptz not null default now(),
  pings     int         not null default 0
);

-- RLS 켜고 정책은 두지 않음 → 앱 키(anon/authenticated)로는 이 테이블을 읽거나 쓸 수 없음.
-- pg_cron 은 postgres 역할로 실행돼 RLS 영향이 없고, 섹션 4 같은 Data API GRANT 도 필요 없음.
alter table public.keepalive enable row level security;

-- 첫 행 (이미 있으면 그대로 둠)
insert into public.keepalive (id) values (1) on conflict (id) do nothing;

-- 매시간 갱신 작업. 같은 이름으로 다시 실행하면 새 작업을 만들지 않고 기존 작업을 고칩니다 (재실행 안전).
select cron.schedule(
  'keepalive_hourly',
  '7 * * * *',
  $$insert into public.keepalive (id) values (1)
    on conflict (id) do update set pinged_at = now(), pings = keepalive.pings + 1$$
);

-- ----------------------------------------------------------------------------
-- 6) 기존 테이블 칸 추가 — listings.sql 을 예전에 돌린 프로젝트용 (재실행 안전: if not exists)
--    새 칸의 권한은 섹션 4 의 테이블 단위 GRANT 를 그대로 따르므로 추가 GRANT 없음
-- ----------------------------------------------------------------------------
-- 2026-11-09 통화 (krw / jpy, 기본 krw)
alter table public.listings add column if not exists currency text not null default 'krw';

-- ----------------------------------------------------------------------------
-- (확인용, 선택) 적용 결과 보기 — 읽기만 하는 조회라 실행해도 변경 없음
-- ----------------------------------------------------------------------------
-- select policyname, cmd from pg_policies where schemaname = 'public'  and tablename = 'listings';
-- select policyname, cmd from pg_policies where schemaname = 'storage' and tablename = 'objects';
-- select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'listings';
-- select grantee, privilege_type from information_schema.role_table_grants
--   where table_schema = 'public' and table_name = 'listings' order by grantee, privilege_type;
-- select * from public.keepalive;                       -- pings 가 매시간 1씩 늘면 정상
-- select jobid, jobname, schedule, active from cron.job;
-- select status, return_message, start_time from cron.job_run_details order by start_time desc limit 5;
