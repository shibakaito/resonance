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

// DB 한 행의 모양 (이번에 쓰는 컬럼 위주)
type ListingRow = {
  id: string;
  created_at: string;
  brand: string;
  model: string;
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
  specs: Record<string, any> | null;
};

// 카테고리 슬러그 → 한글 (없으면 원본 그대로)
const cat = (slug: string | null | undefined) => categoryFromSlug(slug ?? undefined) ?? (slug ?? '');

function mapRow(row: ListingRow): Listing {
  const s = row.specs ?? {};
  const yn = (v: unknown) => label('yes_no', v as string);
  return {
    id: row.id,
    brand: row.brand,
    model: row.model,
    year: row.year ?? '',
    releaseYear: row.release_year ?? 0,
    category: cat(row.category),
    categories: (row.categories && row.categories.length > 0 ? row.categories : [row.category]).map(cat),
    description: row.description ?? '',
    price: row.price,
    condition: label('condition', row.condition),
    location: label('location', row.location),
    ownership: label('ownership', row.ownership),
    country: label('country', row.country),
    daysAgo: row.created_at
      ? Math.max(0, Math.floor((Date.now() - new Date(row.created_at).getTime()) / 86400000))
      : 0,
    // 앰프
    ampType: cat(s.ampType), // ampType은 카테고리 슬러그 재사용
    ampDetail: label('ampDetail', s.ampDetail),
    ampMethod: label('ampMethod', s.ampMethod),
    power: s.power ?? 0,
    headphoneImpedance: s.headphoneImpedance ?? 0,
    impedances: Array.isArray(s.impedances) ? s.impedances.map((x: string) => label('impedance', x)) : [],
    phono: label('phono', s.phono),
    toneControl: yn(s.toneControl),
    remote: yn(s.remote),
    voltage: label('voltage', s.voltage),
    // 스피커
    speakerDetail: label('speakerDetail', s.speakerDetail),
    driverConfig: label('driverConfig', s.driverConfig),
    enclosure: label('enclosure', s.enclosure),
    speakerImpedance: label('impedance', s.speakerImpedance),
    connection: label('connection', s.connection),
    wooferSize: label('wooferSize', s.wooferSize),
    sensitivity: s.sensitivity ?? 0,
    recPower: s.recPower ?? 0,
    // 턴테이블
    driveType: label('driveType', s.driveType),
    tonearm: label('tonearm', s.tonearm),
    cartridge: label('cartridge', s.cartridge),
    speeds: Array.isArray(s.speeds) ? s.speeds.map((x: string) => label('speeds', x)) : [],
    autoMode: label('autoMode', s.autoMode),
    dustCover: label('dustCover', s.dustCover),
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
  description: string;
  sku: string;
  youtubeLink: string;
  price: string;          // 폼 문자열 (콤마 등 포함 가능)
  comparePrice: string;
  acceptOffers: boolean;
  shippingType: 'free' | 'flat' | 'calculated';
  shippingCost: string;
  localPickup: boolean;
};

// 문자열 → 양의 정수(원). 비었거나 0이면 null.
const toMoney = (s: string): number | null => {
  const n = Number((s ?? '').replace(/[^0-9]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};

// 판매 폼 입력값을 DB 영문 키/슬러그로 변환해 listings 테이블에 INSERT. 새 매물 id 반환.
export async function insertListing(form: ListingInput): Promise<string> {
  const primaryKo = form.subcategory || form.category; // 하위 카테고리 우선
  const categoriesKo = computeCategories(primaryKo);    // 교차 등록 규칙 적용(한글)
  const row = {
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
    price: toMoney(form.price) ?? 0,
    compare_price: toMoney(form.comparePrice),
    accept_offers: form.acceptOffers,
    sku: form.sku || null,
    youtube_link: form.youtubeLink || null,
    images: form.images ?? [],
    shipping_type: form.shippingType,
    shipping_cost: toMoney(form.shippingCost),
    local_pickup: form.localPickup,
    specs: {},                                             // 폼이 상세 스펙은 아직 안 받음
  };
  const { data, error } = await supabase
    .from('listings')
    .insert(row)
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}
