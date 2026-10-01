// ============================================================================
// listings.ts — Supabase listings 테이블 → 사이트 Listing 형태로 변환
// ----------------------------------------------------------------------------
// DB는 영문 키(+카테고리 슬러그)로 저장돼 있어서, 화면/필터가 쓰는 한글 값으로
// 매핑합니다. (임시 단계: 기존 코드가 한글을 직접 읽기 때문. 다국어 전환은 다음에)
// ============================================================================
import { supabase } from './supabase';
import type { Listing } from '@/app/components/browse-filters';
import { computeCategories, parseYear } from '@/app/components/browse-filters';
import { categoryFromSlug, categorySlug } from '@/app/data/category-slugs';
import { label, keyFor } from './labels';
import { optLabel, wooferBucket, SPEAKER_DETAIL_OPTS, SPEAKER_DRIVER_OPTS, TT_DRIVE_OPTS, TT_TONEARM_OPTS, TT_CARTRIDGE_OPTS, TT_SPEED_OPTS, TT_AUTO_OPTS, TT_DUSTCOVER_OPTS } from '@/app/data/category-specs';

// DB 한 행의 모양 (이번에 쓰는 컬럼 위주)
type ListingRow = {
  id: string;
  created_at: string;
  brand: string;
  model: string;
  title: string | null;
  year: string | null;
  release_year: number | null;
  category: string;
  categories: string[] | null;
  description: string | null;
  price: number;
  condition: string;
  location: string | null;
  ownership: string | null;
  country: string | null;
  handmade: boolean | null;
  images: string[] | null;
  specs: Record<string, any> | null;
};

// 카테고리 슬러그 → 한글 (없으면 원본 그대로)
const cat = (slug: string | null | undefined) => categoryFromSlug(slug ?? undefined) ?? (slug ?? '');

// ── 정격 출력 파서 ────────────────────────────────────────────────────────────
// specs.tech.powerRated 는 판매 폼의 앰프 출력 빌더(src/lib/spec-builders.ts 의 buildPower)가 만든
// 조립 문자열입니다:  "<숫자>W[ @ <숫자>Ω][ (비고)]" 항목들을 ", " 로 이어 붙인 형태.
//   예) "100W @ 8Ω, 150W @ 4Ω"  /  "60W @ 8Ω (양채널 구동)"  /  "75W"  /  "해당없음"
// 규칙: 8Ω 기준값 우선 → 없으면 첫 번째 항목의 W → 비었거나 숫자 없음("해당없음")·파싱 불가 → null(미입력).
// ⚠️ 빌더의 조립 포맷을 바꾸면 이 파서도 같이 고칠 것 (정격 출력 범위 필터가 이 값을 씁니다).
export function parsePowerW(raw: unknown): number | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  // 항목 = 맨 앞 "<숫자>W" (+ 선택 " @ <숫자>Ω"). 비고 괄호 안의 숫자는 맨 앞이 아니라 무시됩니다.
  const ITEM = /^\s*(\d+(?:\.\d+)?)\s*W(?:\s*@\s*(\d+(?:\.\d+)?)\s*[\u03A9\u2126])?/i;
  let first: number | null = null;
  for (const part of raw.split(',')) {
    const m = ITEM.exec(part);
    if (!m) continue;
    const w = Number(m[1]);
    if (m[2] !== undefined && Number(m[2]) === 8) return w; // 8Ω 기준값 우선
    if (first === null) first = w;
  }
  return first ?? null;
}

// ── 범위 파서 (같은 단위 전용) ─────────────────────────────────────────────────
// specs.tech 의 range 필드는 spec-builders.ts 의 buildFreq 가 만든 "하한단위~상한단위" 문자열.
//   예) hpImpedanceRange "16Ω~600Ω" / 한쪽만 입력 "16Ω~" · "~600Ω"
// 숫자만 꺼내고 단위는 버림 → 하한·상한 단위가 같은 필드 전용 (Hz~kHz 인 주파수 응답엔 쓰지 말 것).
// 결과: { min, max } — 빈 쪽은 null(그쪽 제한 없음). 둘 다 없으면 null(미입력 → 범위 필터에서 제외).
// ⚠️ buildFreq 포맷을 바꾸면 이 파서도 같이 고칠 것 (헤드폰 임피던스 필터가 이 값을 씀).
export function parseSameUnitRange(raw: unknown): { min: number | null; max: number | null } | null {
  if (typeof raw !== 'string' || !raw.includes('~')) return null;
  const [lo, hi] = raw.split('~');
  const num = (part: string) => { const m = part.match(/\d+(?:\.\d+)?/); return m ? Number(m[0]) : null; };
  const min = num(lo), max = num(hi);
  return min == null && max == null ? null : { min, max };
}

function mapRow(row: ListingRow): Listing {
  const s = row.specs ?? {};
  // 기술 사양 네임스페이스(specs.tech) — 판매 폼이 스펙을 저장하는 곳. 옛 flat 키는 읽지 않음(2026-09-30 재시드 완료).
  // 지금 tech 에서 읽는 필드: power(powerRated 파싱) · ampDetail(channel) · ampMethod(device) · impedances(impedance)
  //   · phono · toneControl · remote · voltage (앰프 필터 옵션과 같은 문자열 그대로) · hpImpedance(hpImpedanceRange 파싱)
  //   · 턴테이블 driveType · tonearm · cartridge · speeds · autoMode · dustCover (영문키 저장 → optLabel 로 폼 옵션의 한글 label)
  //   · 스피커 speakerDetail(optLabel) · enclosure · speakerImpedance · sensitivity · recPower(techNum)
  //     · driverConfig(driverWays) · wooferSize(wooferMaxInch 구간) ← 드라이버 빌더 파생 키 (spec-builders.ts driverDerived)
  // 값은 폼 상수(category-specs.ts)가 저장한 그대로이고 필터 옵션도 같은 상수(optLabels)를 쓰므로 정규화 없음 — optLabel 은 폼 옵션표 조회일 뿐.
  const tech: Record<string, unknown> =
    s.tech && typeof s.tech === 'object' && !Array.isArray(s.tech) ? (s.tech as Record<string, unknown>) : {};
  const yn = (v: unknown) => label('yes_no', v as string);
  // tech 값 읽기: 문자열은 trim, 배열은 빈 문자열 제외. 없으면 '' / [].
  const techStr = (k: string) => (typeof tech[k] === 'string' ? (tech[k] as string).trim() : '');
  const techArr = (k: string) =>
    Array.isArray(tech[k]) ? (tech[k] as unknown[]).filter((x): x is string => typeof x === 'string' && x.trim() !== '') : [];
  // tech 숫자 → number. 숫자 문자열(text 칸, 단위 제외)·숫자(빌더 파생 키 wooferMaxInch) 둘 다. 빈 값·숫자 아님 = null (미입력 → 필터에서 제외, 3a 규칙)
  const techNum = (k: string): number | null => {
    const v = tech[k];
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    const t = techStr(k);
    return t !== '' && Number.isFinite(Number(t)) ? Number(t) : null;
  };
  return {
    id: row.id,
    brand: row.brand,
    model: row.model,
    title: row.title ?? '',
    year: row.year ?? '',
    releaseYear: row.release_year ?? 0,
    category: cat(row.category),
    categories: (row.categories && row.categories.length > 0 ? row.categories : [row.category]).map(cat),
    description: row.description ?? '',
    images: row.images ?? [],
    price: row.price,
    condition: label('condition', row.condition),
    // 외관/작동 상태 (참고용, specs에서)
    appearance: label('appearance', typeof s.appearance === 'string' ? s.appearance : ''),
    appearanceDetail: typeof s.appearanceDetail === 'string' ? s.appearanceDetail : '',
    working: label('working', typeof s.working === 'string' ? s.working : ''),
    workingDetail: typeof s.workingDetail === 'string' ? s.workingDetail : '',
    location: label('location', row.location),
    ownership: label('ownership', row.ownership),
    // 구성품 (자유 텍스트) + 기술 사양 (specs.tech 네임스페이스)
    // tech 중첩에 둔 이유: 옛 카탈로그 평면 키(phono/power/toneControl 등)와 충돌 방지
    components: typeof s.components === 'string' ? s.components : '',
    // specs.tech 의 값을 그대로 보존 (문자열 + 문자열 배열). 빈 값/빈 배열 제외.
    // 라벨·순서·표시는 상세 페이지가 카테고리별 스키마로 결정 (앰프는 배열도 포함).
    techSpecs: (() => {
      const out: Record<string, string | string[]> = {};
      for (const [k, v] of Object.entries(tech)) {
        if (typeof v === 'string') {
          const t = v.trim();
          if (t) out[k] = t;
        } else if (Array.isArray(v)) {
          const arr = v.filter((x): x is string => typeof x === 'string' && x.trim() !== '');
          if (arr.length > 0) out[k] = arr;
        }
      }
      return out;
    })(),
    country: label('country', row.country),
    handmade: row.handmade ?? false, // 자작품(DIY) 태그
    daysAgo: row.created_at
      ? Math.max(0, Math.floor((Date.now() - new Date(row.created_at).getTime()) / 86400000))
      : 0,
    // 앰프
    ampType: cat(s.ampType), // ampType은 카테고리 슬러그 재사용
    ampDetail: techStr('channel'), // 세부 카테고리(채널): tech.channel — 필터 AMP_DETAILS(=폼 AMP_CHANNEL_OPTS)와 같은 값
    ampMethod: techStr('device'),  // 증폭 방식: tech.device — 필터 AMP_METHODS(=폼 AMP_DEVICE_OPTS)와 같은 값
    power: parsePowerW(tech.powerRated), // 정격 출력(W): tech.powerRated 파싱. 미입력·해당없음 = null (범위 필터에서 제외)
    hpImpedance: parseSameUnitRange(tech.hpImpedanceRange), // 헤드폰 앰프 권장 헤드폰 임피던스 "16Ω~600Ω" → { min: 16, max: 600 }
    impedances: techArr('impedance'), // 지원 임피던스: tech.impedance — 필터 IMPEDANCE_OPTS(=폼 AMP_OHM_OPTS, '6Ω' 포함)와 같은 값
    phono: techStr('phono'),             // 포노 입력: MM / MC / MM/MC / 없음 (= 폼 AMP_PHONO_OPTS)
    toneControl: techStr('toneControl'), // 톤 컨트롤: 있음 / 없음 (= YES_NO_OPTS)
    remote: techStr('remote'),           // 리모컨: 있음 / 없음
    voltage: techStr('voltage'),         // 전원: 100V / 120V / 220V / 프리볼트 (= AMP_VOLTAGE_OPTS)
    // 스피커 — tech 직결 (드라이버 구성·우퍼 크기는 드라이버 빌더가 같이 저장한 파생 키에서)
    speakerDetail: optLabel(SPEAKER_DETAIL_OPTS, techStr('speakerDetail')), // passive → 패시브
    driverConfig: techArr('driverWays').map((x) => optLabel(SPEAKER_DRIVER_OPTS, x)), // ['coaxial','2way'] → ['동축','2-way']
    enclosure: techStr('enclosure'),               // 인클로저: 한글 저장 (= 폼 SPEAKER_ENCLOSURE_OPTS 12종)
    speakerImpedance: techStr('speakerImpedance'), // 임피던스: '8Ω' (= 폼 SPEAKER_OHM_OPTS)
    wooferSize: wooferBucket(techNum('wooferMaxInch')), // 우퍼 최대 크기(inch) → 구간 라벨 (SPEAKER_WOOFER_BUCKETS). 미입력 = ''
    sensitivity: techNum('sensitivity'), // 감도(dB). 패시브만 입력 → 액티브 등 미입력 = null (범위 필터에서 제외)
    recPower: techNum('recPower'),       // 권장 앰프 출력(W). 〃
    // 턴테이블 — tech 직결. 폼이 영문키(labelOpts)로 저장 → optLabel 로 폼 옵션의 한글 label (= 필터 옵션 optLabels(같은 상수))
    driveType: optLabel(TT_DRIVE_OPTS, techStr('driveType')),          // belt_drive → 벨트 드라이브
    tonearm: optLabel(TT_TONEARM_OPTS, techStr('tonearm')),            // 올인원은 폼에서 숨김 → '' (톤암 필터에서 제외)
    cartridge: optLabel(TT_CARTRIDGE_OPTS, techStr('cartridge')),
    speeds: techArr('speeds').map((x) => optLabel(TT_SPEED_OPTS, x)), // ['33','45'] → ['33⅓ RPM','45 RPM']
    autoMode: optLabel(TT_AUTO_OPTS, techStr('autoMode')),
    dustCover: optLabel(TT_DUSTCOVER_OPTS, techStr('dustCover')),
    // 전원 장치
    ratedCapacity: s.ratedCapacity ?? 0,
    // 케이블
    cableLength: s.cableLength ?? 0,
    terminalIn: s.terminalIn ?? '',
    terminalOut: s.terminalOut ?? '',
    directional: yn(s.directional),
    conductor: label('conductor', s.conductor),
    plating: label('plating', s.plating),
    shield: label('shield', s.shield),
    pair: label('pair', s.pair),
  };
}

// listings 테이블에서 판매중(active) 매물을 최신순으로 가져옴
export async function fetchListings(): Promise<Listing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapRow(row as ListingRow));
}

// id로 매물 1건을 가져옴 (상세 페이지용). 없으면 null.
export async function fetchListingById(id: string): Promise<Listing | null> {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data as ListingRow) : null;
}

// ── 등록(INSERT) ──────────────────────────────────────────────────────────
// 판매 폼이 넘기는 입력값. 선택지(category/country)는 한글, condition은 이미 영문 키.
export type ListingInput = {
  images: string[];
  title: string;
  category: string;       // 대분류 한글 (예: '앰프')
  subcategory: string;    // 하위 한글 (예: '파워앰프')
  brand: string;
  model: string;
  year: string;
  finish: string;
  country: string;        // 한글 (예: '미국')
  handmade: boolean;
  condition: string;      // 영문 키 (예: 'used_excellent')
  ownership: string;      // 영문 키 (single_owner/multiple_owners/unknown), 빈 문자열 가능
  description: string;
  sku: string;
  youtubeLink: string;
  price: string;          // 폼 문자열 (콤마 등 포함 가능)
  comparePrice: string;
  acceptOffers: boolean;
  shippingType: 'free' | 'flat' | 'calculated' | ''; // 빈 문자열 = 미선택
  shippingCost: string;
  localPickup: boolean;
  specs?: Record<string, unknown>; // jsonb로 저장될 카테고리별 상세 스펙 (외관/작동 등)
};

// 문자열 → 양의 정수(원). 비었거나 0이면 null.
const toMoney = (s: string): number | null => {
  const n = Number((s ?? '').replace(/[^0-9]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};

// 판매 폼 입력값을 DB 영문 키/슬러그로 변환해 listings 테이블에 INSERT. 새 매물 id 반환.
// 판매 폼 입력값 → DB 행(컬럼 객체). 폼(insertListing)과 시드 스크립트(scripts/seed-listings.ts)가 공용 — 단일 출처.
export function toListingRow(form: ListingInput) {
  const primaryKo = form.subcategory || form.category; // 하위 카테고리 우선
  const categoriesKo = computeCategories(primaryKo);    // 교차 등록 규칙 적용(한글)
  return {
    status: 'active',
    seller_id: null, // 로그인 기능 전이라 null
    title: form.title || null,
    description: form.description || null,
    brand: form.brand,
    model: form.model,
    year: form.year || null,
    release_year: form.year ? (parseYear(form.year) || null) : null,
    category: categorySlug(primaryKo),                       // 슬러그 (예: 'power-amp')
    categories: categoriesKo.map((c) => categorySlug(c) ?? c), // 슬러그 배열
    finish: form.finish || null,
    country: keyFor('country', form.country) ?? null,        // 한글 → 키 (예: '미국'→'us')
    handmade: form.handmade,
    condition: form.condition,                              // 폼이 이미 영문 키
    ownership: form.ownership || null,                      // 폼이 이미 영문 키 (빈 값이면 null)
    price: toMoney(form.price) ?? 0,
    compare_price: toMoney(form.comparePrice),
    accept_offers: form.acceptOffers,
    sku: form.sku || null,
    youtube_link: form.youtubeLink || null,
    images: form.images ?? [],
    shipping_type: form.shippingType,
    shipping_cost: toMoney(form.shippingCost),
    local_pickup: form.localPickup,
    specs: form.specs ?? {},                                // 카테고리별 상세 스펙 (외관/작동 등)
  };
}

export async function insertListing(form: ListingInput): Promise<string> {
  const row = toListingRow(form);
  const { data, error } = await supabase
    .from('listings')
    .insert(row)
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}
