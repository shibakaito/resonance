-- ============================================================================
-- listings 테이블 — Resonance(Grace) 매물 저장용
-- ----------------------------------------------------------------------------
-- 사용법: Supabase 대시보드 → SQL Editor 에 이 파일 전체를 붙여넣고 RUN.
-- 설계 원칙:
--   · 선택지가 정해진 필드(condition, category, country 등)는 "영문 키"로 저장
--     → DB는 언어 중립, 화면에서 labels.ts로 언어별 변환 (다국어 대비)
--   · 자유 입력(title, description, finish)은 사용자가 쓴 그대로 저장
--   · 카테고리별 상세 스펙은 specs(jsonb)에 모아서 저장
--   · seller_id 는 아직 로그인 기능이 없어 nullable
--   · RLS 는 "누구나 조회"만 허용 (수정/삭제는 회원 기능 생길 때 추가)
-- 이 스크립트는 여러 번 실행해도 안전합니다(if not exists / drop ... if exists).
-- ============================================================================

-- gen_random_uuid() 를 쓰기 위한 확장 (Supabase엔 보통 이미 설치돼 있음)
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1) 테이블
-- ----------------------------------------------------------------------------
create table if not exists public.listings (
  -- 식별 / 메타
  id            uuid        primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),  -- 등록 시각 (코드의 daysAgo 기준)
  updated_at    timestamptz,                         -- 수정 시각 (아래 트리거가 자동 갱신)
  seller_id     uuid        references auth.users(id) on delete set null, -- 로그인 전이라 nullable
  status        text        not null default 'active', -- active/reserved/sold/draft

  -- 자유 입력 텍스트 (다국어 변환 안 함)
  title         text,
  description   text,

  -- 제품 정보
  brand         text        not null,
  model         text        not null,
  year          text,                  -- 원문 연식 ('2022', '1963-1972년')
  release_year  int,                   -- 정렬/필터용 숫자 (year에서 파싱)
  category      text        not null,  -- 메인 카테고리 슬러그 (예: 'integrated-amp')
  categories    text[]      not null default '{}',  -- 노출 슬러그 배열 (다중등록)
  finish        text,                  -- 마감/색상 (자유 텍스트)
  country       text,                  -- 제조국 키 (us/jp/uk/...)
  handmade      boolean     not null default false,

  -- 상태 / 가격
  condition     text        not null,  -- 영문 키 (new/nos/used_mint/...)
  price         bigint      not null,  -- 원(KRW), 소수점 없음 → 정수
  compare_price bigint,                -- 비교가/정가
  accept_offers boolean     not null default true,
  ownership     text,                  -- single_owner / multiple_owners
  location      text,                  -- 지역 키 (seoul/gyeonggi/...)

  -- 부가
  sku           text,
  youtube_link  text,
  images        text[]      not null default '{}',  -- Supabase Storage URL 목록

  -- 배송
  shipping_type text,                  -- free / flat / calculated
  shipping_cost int,
  local_pickup  boolean     not null default false,

  -- 카테고리별 상세 스펙 (key=영문, 코드 필드명 그대로)
  specs         jsonb       not null default '{}'
);

-- ----------------------------------------------------------------------------
-- 2) 인덱스 (자주 거르는 컬럼 — 검색 속도용)
-- ----------------------------------------------------------------------------
create index if not exists listings_category_idx   on public.listings (category);
create index if not exists listings_brand_idx      on public.listings (brand);
create index if not exists listings_status_idx     on public.listings (status);
create index if not exists listings_created_at_idx on public.listings (created_at desc);
create index if not exists listings_categories_idx on public.listings using gin (categories);
create index if not exists listings_specs_idx      on public.listings using gin (specs);

-- ----------------------------------------------------------------------------
-- 3) updated_at 자동 갱신 트리거
--    (행을 수정할 때마다 updated_at 을 현재 시각으로 자동 세팅)
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists listings_set_updated_at on public.listings;
create trigger listings_set_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 4) RLS (행 수준 보안) — 누구나 조회만 가능
-- ----------------------------------------------------------------------------
alter table public.listings enable row level security;

drop policy if exists listings_select_all on public.listings;
create policy listings_select_all
  on public.listings
  for select
  using (true);
-- insert/update/delete 정책 없음 → 일반(anon) 사용자는 읽기만 가능.
-- 매물 추가는 지금은 대시보드나 서버(service_role 키)로. 회원 기능 생기면 정책 추가.

-- ----------------------------------------------------------------------------
-- (선택) 값 검증 CHECK 제약 — 더 엄격하게 막고 싶을 때만 주석 해제
--   ⚠️ 켜두면 나중에 새 선택지를 추가할 때 이 제약도 같이 고쳐야 함(ALTER).
-- ----------------------------------------------------------------------------
-- alter table public.listings
--   add constraint listings_status_chk
--   check (status in ('active','reserved','sold','draft'));
-- alter table public.listings
--   add constraint listings_condition_chk
--   check (condition in ('new','nos','used_mint','used_excellent',
--                        'used_good','used_fair','used_needs_service','used_not_working'));
-- alter table public.listings
--   add constraint listings_shipping_type_chk
--   check (shipping_type in ('free','flat','calculated'));
