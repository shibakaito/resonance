import { useState, useMemo, useRef, useEffect } from 'react';
import { Heart, ChevronDown, ChevronUp, X, Search, SlidersHorizontal, Plus, Minus } from 'lucide-react';
import { CATALOG, subcategoriesFor } from '../data/catalog';
import { terminalsPrioritized, pickTerminalPair } from '../data/cable-terminals';
import { metaFor } from '../data/category-meta';
// ⚠️ 임시 더미 매물 — 제거하려면 이 줄과 buildListings 내 DUMMY_CATALOG 사용 부분을 함께 삭제
import { DUMMY_CATALOG, INCLUDE_DUMMY } from '../data/dummy-catalog';

interface BrowsePageProps {
  onSelect: () => void;
  category?: string | null;
  initialSubCategory?: string | null;
}

// CATALOG에 실제 매물 데이터가 있는 브랜드
const SOURCE_BRANDS = ['McIntosh', 'Marantz'];
// 필터에 노출할 브랜드 — 나머지는 테스트용 더미, 매물 수는 0으로 표기됨
const BRANDS = [
  'McIntosh', 'Marantz', 'Accuphase', 'Luxman', 'Yamaha',
  'Sansui', 'Pioneer', 'Denon', 'NAD', 'Cambridge Audio'
] as const;
const CONDITIONS = ['새상품', 'NOS', '중고 - 민트', '중고 - 매우 좋음', '중고 - 좋음', '중고 - 보통', '중고 - 점검 필요', '중고 - 작동 불가'];
// 사이드바용 표시 옵션 — '중고 - 전체'는 UI 단축키 (선택 시 모든 중고-* 매물 매칭)
const USED_ALL = '중고 - 전체';
const CONDITION_DISPLAY = ['새상품', 'NOS', USED_ALL, '중고 - 민트', '중고 - 매우 좋음', '중고 - 좋음', '중고 - 보통', '중고 - 점검 필요', '중고 - 작동 불가'];
const LOCATIONS = ['서울', '경기', '부산', '대구', '인천', '광주', '대전', '울산', '강원', '제주'];
const OWNERSHIP_OPTS = ['1인 소유', '다중 소유'];
const COUNTRY_OPTS = ['미국', '일본', '영국', '독일', '프랑스', '덴마크', '캐나다', '중국'];
const SORT_OPTIONS = ['추천순', '최신순', '가격 낮은순', '가격 높은순'];

// 앰프 전용 필터 옵션
const AMP_TYPES = ['프리앰프', '파워앰프', '인티앰프', '포노 스테이지', '리시버', 'AV 리시버', '헤드폰 앰프'];
const AMP_DETAILS = ['모노블록', '스테레오', '멀티채널'];
const AMP_METHODS = ['트랜지스터', '진공관', '하이브리드'];
const IMPEDANCE_OPTS = ['2Ω', '4Ω', '8Ω', '16Ω'];
const PHONO_OPTS = ['없음', 'MM', 'MC', 'MM/MC'];
const TONE_OPTS = ['있음', '없음'];
const REMOTE_OPTS = ['있음', '없음'];
const VOLTAGE_OPTS = ['100V', '120V', '220V', '프리볼트'];

// 스피커 전용 필터 옵션
const SPEAKER_DETAILS = ['패시브', '액티브'];
const DRIVER_CONFIGS = ['풀레인지', '동축', '2-way', '3-way', '4-way 이상'];
const ENCLOSURE_TYPES = ['밀폐형', '베이스 리플렉스', '혼 로딩', '패시브 라디에이터'];
const SPEAKER_IMPEDANCE = ['4Ω', '6Ω', '8Ω', '16Ω'];
const CONNECTION_TYPES = ['유선', '블루투스', '네트워크'];
const WOOFER_SIZES = ['4인치 이하', '5인치', '6.5인치', '7~8인치', '10인치', '12인치', '15인치 이상'];
// CATALOG의 스피커 매물을 재분배할 하위 카테고리
const SPEAKER_REDIST = ['북쉘프 스피커', '플로어 스탠딩 스피커', '톨보이 스피커', '센터 스피커', '사운드바', '서브우퍼'];

// 턴테이블 전용 필터 옵션
const DRIVE_TYPES = ['벨트 드라이브', '다이렉트 드라이브', '아이들러 드라이브'];
const TONEARM_OPTS = ['포함', '미포함', '교체됨'];
const CARTRIDGE_OPTS = ['포함', '미포함'];
const SPEED_OPTS = ['33⅓ RPM', '45 RPM', '78 RPM'];
const AUTO_OPTS = ['풀 오토', '세미 오토', '매뉴얼'];
const DUSTCOVER_OPTS = ['있음', '없음', '손상 있음'];

// 소스기기 카테고리: 모달에서만 그룹별로 표시
export const SOURCE_GROUPS: { title: string; items: string[] }[] = [
  { title: '아날로그', items: ['턴테이블', '카세트 데크', '오픈릴 데크'] },
  { title: '디지털', items: ['CD 플레이어', 'CD 트랜스포트', 'SACD 플레이어', 'DAC', '네트워크 플레이어', '블루투스 리시버'] },
  { title: '튜너', items: ['FM 튜너', 'AM/FM 튜너'] },
  { title: 'AV', items: ['LD 플레이어', 'DVD 플레이어', '블루레이 플레이어'] }
];

// 앰프 카테고리 그룹 (메가 메뉴용)
export const AMP_GROUPS: { title: string; items: string[] }[] = [
  { title: 'BY TYPE', items: ['프리앰프', '파워앰프', '인티앰프', '포노 스테이지', '헤드폰 앰프', '네트워크 앰프', '리시버', 'AV 리시버'] }
];

// 스피커 카테고리 그룹 (메가 메뉴용)
export const SPEAKER_GROUPS: { title: string; items: string[] }[] = [
  { title: 'BY TYPE', items: ['북쉘프 스피커', '플로어 스탠딩 스피커', '톨보이 스피커', '센터 스피커', '사운드바', '서브우퍼'] }
];

// 액세서리 카테고리: 모달에서만 그룹별로 표시
export const ACCESSORY_GROUPS: { title: string; items: string[] }[] = [
  { title: '전원 장치', items: ['파워 컨디셔너', '전원 필터', '오디오 멀티탭', '리니어 전원장치', '스텝다운 트랜스', '아이솔레이션 트랜스'] },
  { title: '거치/받침', items: ['오디오 랙', '스피커 스탠드'] },
  { title: '진동 제어', items: ['인슐레이터', '스파이크', '슈즈', '방진 매트'] }
];
const POWER_DEVICE_ITEMS = ACCESSORY_GROUPS[0].items;

// 턴테이블 카테고리: 모달에서만 그룹별로 표시
// 포노 케이블·포노앰프·MC 스텝업 등은 다른 최상위 카테고리(케이블/앰프)의 동일 항목과
// 같은 문자열을 공유 → 어느 페이지에서 선택하든 같은 매물이 필터링됨 (연동)
export const TT_ACCESSORY_GROUPS: { title: string; items: string[] }[] = [
  { title: 'BY TYPE', items: ['턴테이블'] },
  { title: '카트리지 + 액세서리', items: ['MM 카트리지', 'MC 카트리지', '헤드쉘', '헤드쉘 와이어', '오버행 게이지', '침압계', '카트리지 정렬 게이지'] },
  { title: '포노 스테이지', items: ['MM/MC 포노앰프', 'MC 스텝업 헤드앰프', 'MC 스텝업 트랜스'] },
  { title: '톤암 + 액세서리', items: ['톤암', '톤암 리프터'] },
  { title: '턴테이블 액세서리', items: ['포노 케이블', '턴테이블 벨트', '모터 풀리', '서브 플래터', '인슐레이터', '33/45 어댑터', '턴테이블 매트', '레코드 스테빌라이저', '레코드 클리너', '스타일러스 클리너', '턴테이블 플린스', '더스트 커버'] }
];

// 케이블 전용 필터 옵션
const DIRECTIONALITY_OPTS = ['있음', '없음'];
const CONDUCTOR_OPTS = [
  '일반 구리',
  'OFC',
  'OCC / PC-OCC',
  'UP-OCC',
  '은도금 구리',
  '순은',
  '하이브리드',
  '기타'
];
const PLATING_OPTS = ['금도금', '로듐 도금', '은도금', '니켈 도금', '무도금'];
const SHIELD_OPTS = ['실드', '무실드', '이중 실드'];
const PAIR_OPTS = ['단선', '페어', '세트'];
// 차폐 필터가 의미 있는 케이블 종류 (RCA/XLR/디지털 동축/포노/파워)
const SHIELD_RELEVANT = ['RCA 케이블', 'XLR 케이블', '디지털 동축 케이블', '포노 케이블', '파워 케이블'];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pickPrice(seed: number): number {
  const min = 50;
  const max = 1500;
  const v = min + (seed % (max - min));
  return v * 10000;
}

function fmtPrice(v: number): string {
  return '₩' + v.toLocaleString('ko-KR');
}

// "1963 - 1972년" 같은 문자열에서 시작 연도 추출
function parseYear(s: string): number {
  const m = s.match(/\d{4}/);
  return m ? Number(m[0]) : 0;
}

// 항목별 개수 집계 (key가 배열이면 각 값마다 카운트)
function countBy<T>(items: T[], key: (t: T) => string | string[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const item of items) {
    const k = key(item);
    const keys = Array.isArray(k) ? k : [k];
    for (const kk of keys) map[kk] = (map[kk] ?? 0) + 1;
  }
  return map;
}

type Listing = {
  id: string;
  brand: string;
  model: string;
  year: string;
  releaseYear: number;
  category: string;          // 표시용 메인 카테고리 (브래드크럼, 카드 라벨 등)
  categories: string[];       // 필터링용 — 다중 카테고리 등록 시 두 곳 모두에 노출
  description: string;
  price: number;
  condition: string;
  location: string;
  ownership: string;
  country: string;
  daysAgo: number;
  // 앰프 전용 속성 (앰프 카테고리에서만 사용)
  ampType: string;
  ampDetail: string;
  ampMethod: string;
  power: number; // 정격 출력 (W)
  headphoneImpedance: number; // 헤드폰 앰프 지원 임피던스 (Ω)
  impedances: string[]; // 지원 임피던스
  phono: string;
  toneControl: string;
  remote: string;
  voltage: string;
  // 스피커 전용 속성 (스피커 카테고리에서만 사용)
  speakerDetail: string;
  driverConfig: string;
  enclosure: string;
  speakerImpedance: string;
  connection: string;
  wooferSize: string;
  sensitivity: number; // 감도 (dB)
  recPower: number; // 권장 앰프 출력 (W)
  // 턴테이블 전용 속성
  driveType: string;
  tonearm: string;
  cartridge: string;
  speeds: string[];
  autoMode: string;
  dustCover: string;
  // 전원 장치 전용
  ratedCapacity: number; // 정격 용량 (W)
  // 케이블 전용
  cableLength: number; // 길이 (m, 0.5 단위)
  terminalIn: string;  // 입력측 단자
  terminalOut: string; // 출력측 단자 (양쪽 동일 케이블은 terminalIn === terminalOut)
  directional: string;
  conductor: string;
  plating: string;
  shield: string;
  pair: string;
};

// 다중 카테고리 등록 규칙: 같은 매물이 여러 카테고리에서 노출되어야 하는 경우 매핑
// 예: '포노 케이블' 매물 → 케이블 메뉴와 턴테이블 액세서리 메뉴 모두에서 노출
// (Perfect Circuit 패턴: 같은 상품을 여러 카테고리 진입점에서 접근 가능)
const CROSS_LISTING: Record<string, string[]> = {
  // 앰프 카테고리의 '포노 스테이지'와 턴테이블 카테고리의 'MM/MC 포노앰프'는 동일 매물
  '포노 스테이지': ['MM/MC 포노앰프'],
  'MM/MC 포노앰프': ['포노 스테이지']
};
function computeCategories(primary: string): string[] {
  const extras = CROSS_LISTING[primary] ?? [];
  return [primary, ...extras.filter((e) => e !== primary)];
}

function buildListings(): Listing[] {
  const baseItems = CATALOG.filter((c) => SOURCE_BRANDS.includes(c.brand));
  // ⚠️ 임시 더미 매물 — 제거하려면 아래 한 줄과 import 라인을 삭제
  const items = INCLUDE_DUMMY ? [...baseItems, ...DUMMY_CATALOG] : baseItems;
  return items.map((c, idx) => {
    const seed = hash(`${c.brand}|${c.model}|${idx}`);
    const imps = IMPEDANCE_OPTS.filter((_, i) => ((seed >> (i + 1)) & 1) === 1);
    // CATALOG의 스피커 매물은 하위 카테고리로 재분배
    const category =
      c.category === '스피커' || c.category === '무선 스피커'
        ? SPEAKER_REDIST[seed % SPEAKER_REDIST.length]
        : c.category;
    // 다중 카테고리 등록: 같은 매물이 여러 카테고리에서 노출됨 (Perfect Circuit 패턴)
    // 기본은 단일 카테고리지만, 아래 규칙에 매칭되는 경우 추가 카테고리 등록
    const categories = computeCategories(category);
    return {
      id: `${c.brand}-${c.model}-${idx}`,
      brand: c.brand,
      model: c.model,
      year: c.year,
      releaseYear: parseYear(c.year),
      category,
      categories,
      description: c.description,
      price: pickPrice(seed),
      condition: CONDITIONS[seed % CONDITIONS.length],
      location: LOCATIONS[seed % LOCATIONS.length],
      ownership: OWNERSHIP_OPTS[(seed >> 15) % OWNERSHIP_OPTS.length],
      country: COUNTRY_OPTS[(seed >> 17) % COUNTRY_OPTS.length],
      daysAgo: (seed % 60) + 1,
      ampType: AMP_TYPES[seed % AMP_TYPES.length],
      ampDetail: AMP_DETAILS[(seed >> 3) % AMP_DETAILS.length],
      ampMethod: AMP_METHODS[(seed >> 5) % AMP_METHODS.length],
      power: 10 + (seed % 490),
      headphoneImpedance: 16 + (seed % 585), // 16~600Ω
      impedances: imps.length > 0 ? imps : ['8Ω'],
      phono: PHONO_OPTS[(seed >> 7) % PHONO_OPTS.length],
      toneControl: TONE_OPTS[(seed >> 9) % TONE_OPTS.length],
      remote: REMOTE_OPTS[(seed >> 11) % REMOTE_OPTS.length],
      voltage: VOLTAGE_OPTS[(seed >> 13) % VOLTAGE_OPTS.length],
      speakerDetail: SPEAKER_DETAILS[(seed >> 2) % SPEAKER_DETAILS.length],
      driverConfig: DRIVER_CONFIGS[(seed >> 4) % DRIVER_CONFIGS.length],
      enclosure: ENCLOSURE_TYPES[(seed >> 6) % ENCLOSURE_TYPES.length],
      speakerImpedance: SPEAKER_IMPEDANCE[(seed >> 8) % SPEAKER_IMPEDANCE.length],
      connection: CONNECTION_TYPES[(seed >> 10) % CONNECTION_TYPES.length],
      wooferSize: WOOFER_SIZES[(seed >> 12) % WOOFER_SIZES.length],
      sensitivity: 80 + (seed % 20),
      recPower: 10 + (seed % 290),
      driveType: DRIVE_TYPES[(seed >> 14) % DRIVE_TYPES.length],
      tonearm: TONEARM_OPTS[(seed >> 16) % TONEARM_OPTS.length],
      cartridge: CARTRIDGE_OPTS[(seed >> 18) % CARTRIDGE_OPTS.length],
      speeds: (() => {
        const ss = SPEED_OPTS.filter((_, i) => ((seed >> (i + 19)) & 1) === 1);
        return ss.length > 0 ? ss : ['33⅓ RPM'];
      })(),
      autoMode: AUTO_OPTS[(seed >> 22) % AUTO_OPTS.length],
      dustCover: DUSTCOVER_OPTS[(seed >> 24) % DUSTCOVER_OPTS.length],
      ratedCapacity: 300 + (seed % 2700),
      cableLength: 1 + (seed % 20) * 0.5, // 1m~10.5m
      ...((): { terminalIn: string; terminalOut: string } => {
        const pair = pickTerminalPair(category, seed);
        return { terminalIn: pair.in, terminalOut: pair.out };
      })(),
      directional: DIRECTIONALITY_OPTS[(seed >> 26) % DIRECTIONALITY_OPTS.length],
      conductor: CONDUCTOR_OPTS[(seed >> 23) % CONDUCTOR_OPTS.length],
      plating: PLATING_OPTS[(seed >> 24) % PLATING_OPTS.length],
      shield: SHIELD_OPTS[(seed >> 25) % SHIELD_OPTS.length],
      pair: PAIR_OPTS[(seed >> 27) % PAIR_OPTS.length],
    };
  });
}

// 통합 필터 상태
type Filters = {
  brand: Set<string>;
  condition: Set<string>;
  priceMin: number | null;
  priceMax: number | null;
  yearMin: number | null;
  yearMax: number | null;
  ownership: Set<string>;
  country: Set<string>;
  region: Set<string>;
  ampType: Set<string>;
  ampDetail: Set<string>;
  ampMethod: Set<string>;
  powerMin: number | null;
  powerMax: number | null;
  // 헤드폰 앰프 전용: 지원 임피던스 범위 (Ω)
  headphoneImpMin: number | null;
  headphoneImpMax: number | null;
  impedance: Set<string>;
  phono: Set<string>;
  toneControl: Set<string>;
  remote: Set<string>;
  voltage: Set<string>;
  // 스피커 전용
  speakerDetail: Set<string>;
  driverConfig: Set<string>;
  enclosure: Set<string>;
  speakerImpedance: Set<string>;
  connection: Set<string>;
  wooferSize: Set<string>;
  sensitivityMin: number | null;
  sensitivityMax: number | null;
  recPowerMin: number | null;
  recPowerMax: number | null;
  // 턴테이블 전용
  driveType: Set<string>;
  tonearm: Set<string>;
  cartridge: Set<string>;
  speeds: Set<string>;
  autoMode: Set<string>;
  dustCover: Set<string>;
  // 전원 장치 전용
  ratedCapacityMin: number | null;
  ratedCapacityMax: number | null;
  // 케이블 전용
  cableLengthMin: number | null;
  cableLengthMax: number | null;
  terminalIn: Set<string>;   // 입력 단자
  terminalOut: Set<string>;  // 출력 단자
  directional: Set<string>;
  conductor: Set<string>;
  plating: Set<string>;
  shield: Set<string>;
  pair: Set<string>;
};

const emptyFilters = (): Filters => ({
  brand: new Set(),
  condition: new Set(),
  priceMin: null,
  priceMax: null,
  yearMin: null,
  yearMax: null,
  ownership: new Set(),
  country: new Set(),
  region: new Set(),
  ampType: new Set(),
  ampDetail: new Set(),
  ampMethod: new Set(),
  powerMin: null,
  powerMax: null,
  headphoneImpMin: null,
  headphoneImpMax: null,
  impedance: new Set(),
  phono: new Set(),
  toneControl: new Set(),
  remote: new Set(),
  voltage: new Set(),
  speakerDetail: new Set(),
  driverConfig: new Set(),
  enclosure: new Set(),
  speakerImpedance: new Set(),
  connection: new Set(),
  wooferSize: new Set(),
  sensitivityMin: null,
  sensitivityMax: null,
  recPowerMin: null,
  recPowerMax: null,
  driveType: new Set(),
  tonearm: new Set(),
  cartridge: new Set(),
  speeds: new Set(),
  autoMode: new Set(),
  dustCover: new Set(),
  ratedCapacityMin: null,
  ratedCapacityMax: null,
  cableLengthMin: null,
  cableLengthMax: null,
  terminalIn: new Set(),
  terminalOut: new Set(),
  directional: new Set(),
  conductor: new Set(),
  plating: new Set(),
  shield: new Set(),
  pair: new Set()
});

function cloneFilters(f: Filters): Filters {
  return {
    brand: new Set(f.brand),
    condition: new Set(f.condition),
    priceMin: f.priceMin,
    priceMax: f.priceMax,
    yearMin: f.yearMin,
    yearMax: f.yearMax,
    ownership: new Set(f.ownership),
    country: new Set(f.country),
    region: new Set(f.region),
    ampType: new Set(f.ampType),
    ampDetail: new Set(f.ampDetail),
    ampMethod: new Set(f.ampMethod),
    powerMin: f.powerMin,
    powerMax: f.powerMax,
    headphoneImpMin: f.headphoneImpMin,
    headphoneImpMax: f.headphoneImpMax,
    impedance: new Set(f.impedance),
    phono: new Set(f.phono),
    toneControl: new Set(f.toneControl),
    remote: new Set(f.remote),
    voltage: new Set(f.voltage),
    speakerDetail: new Set(f.speakerDetail),
    driverConfig: new Set(f.driverConfig),
    enclosure: new Set(f.enclosure),
    speakerImpedance: new Set(f.speakerImpedance),
    connection: new Set(f.connection),
    wooferSize: new Set(f.wooferSize),
    sensitivityMin: f.sensitivityMin,
    sensitivityMax: f.sensitivityMax,
    recPowerMin: f.recPowerMin,
    recPowerMax: f.recPowerMax,
    driveType: new Set(f.driveType),
    tonearm: new Set(f.tonearm),
    cartridge: new Set(f.cartridge),
    speeds: new Set(f.speeds),
    autoMode: new Set(f.autoMode),
    dustCover: new Set(f.dustCover),
    ratedCapacityMin: f.ratedCapacityMin,
    ratedCapacityMax: f.ratedCapacityMax,
    cableLengthMin: f.cableLengthMin,
    cableLengthMax: f.cableLengthMax,
    terminalIn: new Set(f.terminalIn),
    terminalOut: new Set(f.terminalOut),
    directional: new Set(f.directional),
    conductor: new Set(f.conductor),
    plating: new Set(f.plating),
    shield: new Set(f.shield),
    pair: new Set(f.pair)
  };
}

function countFilters(f: Filters): number {
  const setKeys: (keyof Filters)[] = [
    'brand', 'condition', 'ownership', 'country', 'region',
    'ampType', 'ampDetail', 'ampMethod', 'impedance', 'phono', 'toneControl', 'remote', 'voltage',
    'speakerDetail', 'driverConfig', 'enclosure', 'speakerImpedance', 'connection', 'wooferSize',
    'driveType', 'tonearm', 'cartridge', 'speeds', 'autoMode', 'dustCover',
    'terminalIn', 'terminalOut', 'directional', 'conductor', 'plating', 'shield', 'pair'
  ];
  let n = 0;
  for (const k of setKeys) n += (f[k] as Set<string>).size;
  if (f.priceMin != null || f.priceMax != null) n += 1;
  if (f.yearMin != null || f.yearMax != null) n += 1;
  if (f.powerMin != null || f.powerMax != null) n += 1;
  if (f.headphoneImpMin != null || f.headphoneImpMax != null) n += 1;
  if (f.sensitivityMin != null || f.sensitivityMax != null) n += 1;
  if (f.recPowerMin != null || f.recPowerMax != null) n += 1;
  if (f.ratedCapacityMin != null || f.ratedCapacityMax != null) n += 1;
  if (f.cableLengthMin != null || f.cableLengthMax != null) n += 1;
  return n;
}

// 매물 목록에 필터 적용 (정렬 제외)
function applyFilters(list: Listing[], f: Filters, isAmp: boolean, isSpeaker: boolean, isTurntable: boolean, isPowerDevice: boolean, isCable: boolean): Listing[] {
  let r = list;
  if (f.brand.size > 0) r = r.filter((l) => f.brand.has(l.brand));
  if (f.condition.size > 0) {
    const usedAllSelected = f.condition.has(USED_ALL);
    r = r.filter((l) => {
      if (f.condition.has(l.condition)) return true;
      if (usedAllSelected && l.condition.startsWith('중고 -')) return true;
      return false;
    });
  }
  if (f.priceMin != null) r = r.filter((l) => l.price >= f.priceMin! * 10000);
  if (f.priceMax != null) r = r.filter((l) => l.price <= f.priceMax! * 10000);
  if (f.yearMin != null) r = r.filter((l) => l.releaseYear >= f.yearMin!);
  if (f.yearMax != null) r = r.filter((l) => l.releaseYear <= f.yearMax!);
  if (f.ownership.size > 0) r = r.filter((l) => f.ownership.has(l.ownership));
  if (f.country.size > 0) r = r.filter((l) => f.country.has(l.country));
  if (f.region.size > 0) r = r.filter((l) => f.region.has(l.location));
  if (isAmp) {
    if (f.ampType.size > 0) r = r.filter((l) => f.ampType.has(l.ampType));
    if (f.ampDetail.size > 0) r = r.filter((l) => f.ampDetail.has(l.ampDetail));
    if (f.ampMethod.size > 0) r = r.filter((l) => f.ampMethod.has(l.ampMethod));
    if (f.powerMin != null) r = r.filter((l) => l.power >= f.powerMin!);
    if (f.powerMax != null) r = r.filter((l) => l.power <= f.powerMax!);
    if (f.headphoneImpMin != null) r = r.filter((l) => l.headphoneImpedance >= f.headphoneImpMin!);
    if (f.headphoneImpMax != null) r = r.filter((l) => l.headphoneImpedance <= f.headphoneImpMax!);
    if (f.impedance.size > 0) r = r.filter((l) => l.impedances.some((i) => f.impedance.has(i)));
    if (f.phono.size > 0) r = r.filter((l) => f.phono.has(l.phono));
    if (f.toneControl.size > 0) r = r.filter((l) => f.toneControl.has(l.toneControl));
    if (f.remote.size > 0) r = r.filter((l) => f.remote.has(l.remote));
    if (f.voltage.size > 0) r = r.filter((l) => f.voltage.has(l.voltage));
  }
  if (isSpeaker) {
    if (f.speakerDetail.size > 0) r = r.filter((l) => f.speakerDetail.has(l.speakerDetail));
    if (f.driverConfig.size > 0) r = r.filter((l) => f.driverConfig.has(l.driverConfig));
    if (f.enclosure.size > 0) r = r.filter((l) => f.enclosure.has(l.enclosure));
    if (f.speakerImpedance.size > 0) r = r.filter((l) => f.speakerImpedance.has(l.speakerImpedance));
    if (f.connection.size > 0) r = r.filter((l) => f.connection.has(l.connection));
    if (f.wooferSize.size > 0) r = r.filter((l) => f.wooferSize.has(l.wooferSize));
    if (f.sensitivityMin != null) r = r.filter((l) => l.sensitivity >= f.sensitivityMin!);
    if (f.sensitivityMax != null) r = r.filter((l) => l.sensitivity <= f.sensitivityMax!);
    if (f.recPowerMin != null) r = r.filter((l) => l.recPower >= f.recPowerMin!);
    if (f.recPowerMax != null) r = r.filter((l) => l.recPower <= f.recPowerMax!);
  }
  if (isTurntable) {
    if (f.driveType.size > 0) r = r.filter((l) => f.driveType.has(l.driveType));
    if (f.tonearm.size > 0) r = r.filter((l) => f.tonearm.has(l.tonearm));
    if (f.cartridge.size > 0) r = r.filter((l) => f.cartridge.has(l.cartridge));
    if (f.speeds.size > 0) r = r.filter((l) => l.speeds.some((s) => f.speeds.has(s)));
    if (f.autoMode.size > 0) r = r.filter((l) => f.autoMode.has(l.autoMode));
    if (f.dustCover.size > 0) r = r.filter((l) => f.dustCover.has(l.dustCover));
  }
  if (isPowerDevice) {
    if (f.ratedCapacityMin != null) r = r.filter((l) => l.ratedCapacity >= f.ratedCapacityMin!);
    if (f.ratedCapacityMax != null) r = r.filter((l) => l.ratedCapacity <= f.ratedCapacityMax!);
  }
  if (isCable) {
    if (f.cableLengthMin != null) r = r.filter((l) => l.cableLength >= f.cableLengthMin!);
    if (f.cableLengthMax != null) r = r.filter((l) => l.cableLength <= f.cableLengthMax!);
    // 입력 단자: terminalIn ∈ 선택된 입력 단자들
    if (f.terminalIn.size > 0) r = r.filter((l) => f.terminalIn.has(l.terminalIn));
    // 출력 단자: terminalOut ∈ 선택된 출력 단자들
    if (f.terminalOut.size > 0) r = r.filter((l) => f.terminalOut.has(l.terminalOut));
    if (f.directional.size > 0) r = r.filter((l) => f.directional.has(l.directional));
    if (f.conductor.size > 0) r = r.filter((l) => f.conductor.has(l.conductor));
    if (f.plating.size > 0) r = r.filter((l) => f.plating.has(l.plating));
    if (f.shield.size > 0) r = r.filter((l) => f.shield.has(l.shield));
    if (f.pair.size > 0) r = r.filter((l) => f.pair.has(l.pair));
  }
  return r;
}

type Counts = Record<string, Record<string, number>>;

// 좌측 사이드바용 아코디언 섹션 필터 (Perfect Circuit 스타일)
function FilterSection({
  label,
  options,
  selected,
  onToggle,
  counts,
  maxVisible,
  step,
  searchable = false,
  defaultOpen = true
}: {
  label: string;
  options: readonly string[];
  selected: Set<string>;
  onToggle: (v: string) => void;
  counts?: Record<string, number>;
  maxVisible?: number;
  step?: number; // 지정 시 "+더보기"가 step개씩 펼침 (미지정 시 한 번에 전체)
  searchable?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(maxVisible ?? Infinity);

  const filtered = useMemo(() => {
    if (!searchable || query.trim() === '') return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, searchable, query]);

  // 옵션/검색어 변경 시 표시 개수 초기화
  useEffect(() => {
    setVisibleCount(maxVisible ?? Infinity);
  }, [maxVisible, query, options]);

  const limited = maxVisible != null;
  const visible = limited ? filtered.slice(0, visibleCount) : filtered;
  const hasMore = limited && filtered.length > visibleCount;
  const expanded = limited && visibleCount > (maxVisible ?? 0);

  const showMore = () =>
    setVisibleCount((c) => (step ? Math.min(c + step, filtered.length) : filtered.length));
  const collapse = () => setVisibleCount(maxVisible ?? Infinity);

  return (
    <div className="border-b border-[#e0e0e0] py-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full text-left"
      >
        <span className="text-sm font-semibold text-[#000000]">{label}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-600" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-600" />
        )}
      </button>
      {open && (
        <div className="mt-2.5 space-y-1">
          {searchable && (
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="검색"
                className="w-full pl-8 pr-2 py-1.5 text-sm border border-[#e0e0e0] rounded focus:outline-none focus:border-[#000000]"
              />
            </div>
          )}
          <div className={visible.length > 12 ? 'max-h-72 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full' : ''}>
            {visible.map((opt) => (
              <label
                key={opt}
                className="flex items-center gap-2 py-1 cursor-pointer text-sm text-gray-700 hover:text-[#000000]"
              >
                <input
                  type="checkbox"
                  checked={selected.has(opt)}
                  onChange={() => onToggle(opt)}
                  className="accent-[#000000] w-3.5 h-3.5"
                />
                <span className="flex-1 truncate">{opt}</span>
                {counts && (
                  <span className="text-xs text-gray-400">({counts[opt] ?? 0})</span>
                )}
              </label>
            ))}
          </div>
          {(hasMore || expanded) && (
            <div className="mt-1 flex items-center gap-3">
              {hasMore && (
                <button
                  onClick={showMore}
                  className="text-xs font-medium text-gray-600 hover:text-[#000000] underline"
                >
                  + 더보기
                </button>
              )}
              {expanded && (
                <button
                  onClick={collapse}
                  className="text-xs font-medium text-gray-600 hover:text-[#000000] underline"
                >
                  접기
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 사이드바용 범위 입력 섹션 (가격/길이)
function RangeSection({
  label,
  unit,
  min,
  max,
  step,
  onApply,
  defaultOpen = true,
  noComma = false
}: {
  label: string;
  unit?: string;
  min: number | null;
  max: number | null;
  step?: number;
  onApply: (min: number | null, max: number | null) => void;
  defaultOpen?: boolean;
  noComma?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [minInput, setMinInput] = useState(min != null ? String(min) : '');
  const [maxInput, setMaxInput] = useState(max != null ? String(max) : '');

  useEffect(() => {
    setMinInput(min != null ? String(min) : '');
    setMaxInput(max != null ? String(max) : '');
  }, [min, max]);

  const isInt = step == null;
  const fmt = (s: string) => {
    if (!isInt || noComma) return s;
    return s === '' ? '' : Number(s).toLocaleString('ko-KR');
  };

  const apply = () => {
    const parse = (s: string): number | null => {
      const t = s.trim();
      if (t === '') return null;
      const n = Number(t);
      return Number.isFinite(n) ? n : null;
    };
    onApply(parse(minInput), parse(maxInput));
  };

  return (
    <div className="border-b border-[#e0e0e0] py-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full text-left"
      >
        <span className="text-sm font-semibold text-[#000000]">
          {label}{unit ? ` (${unit})` : ''}
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-600" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-600" />
        )}
      </button>
      {open && (
        <div className="mt-2.5">
          <div className="flex items-stretch gap-1.5">
            <input
              type={isInt ? 'text' : 'number'}
              inputMode={isInt ? 'numeric' : 'decimal'}
              min={0}
              step={step}
              value={fmt(minInput)}
              onChange={(e) =>
                setMinInput(isInt ? e.target.value.replace(/[^\d]/g, '') : e.target.value)
              }
              onKeyDown={(e) => e.key === 'Enter' && apply()}
              placeholder="최소"
              className="w-0 flex-1 px-2 py-1.5 text-sm border border-[#e0e0e0] rounded focus:outline-none focus:border-[#000000]"
            />
            <input
              type={isInt ? 'text' : 'number'}
              inputMode={isInt ? 'numeric' : 'decimal'}
              min={0}
              step={step}
              value={fmt(maxInput)}
              onChange={(e) =>
                setMaxInput(isInt ? e.target.value.replace(/[^\d]/g, '') : e.target.value)
              }
              onKeyDown={(e) => e.key === 'Enter' && apply()}
              placeholder="최대"
              className="w-0 flex-1 px-2 py-1.5 text-sm border border-[#e0e0e0] rounded focus:outline-none focus:border-[#000000]"
            />
          </div>
          <button
            onClick={apply}
            className="mt-2 w-full py-1.5 text-xs font-medium bg-[#000000] text-white rounded hover:bg-gray-800"
          >
            적용
          </button>
        </div>
      )}
    </div>
  );
}

// 드롭다운 필터 (다중 선택, maxVisible 지정 시 "더보기"로 나머지 표시)
function FilterDropdown({
  label,
  options,
  selected,
  onToggle,
  onClear,
  counts,
  maxVisible,
  scrollable = false,
  variant = 'pill'
}: {
  label: string;
  options: readonly string[];
  selected: Set<string>;
  onToggle: (v: string) => void;
  onClear?: () => void;
  counts?: Record<string, number>;
  maxVisible?: number;
  scrollable?: boolean;
  variant?: 'pill' | 'box';
}) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // 드롭다운 닫히면 더보기 펼침 상태 초기화 → 다음 열 때 다시 5개부터
  useEffect(() => {
    if (!open) setShowAll(false);
  }, [open]);

  const hasMore = maxVisible != null && options.length > maxVisible;
  const visible = hasMore && !showAll ? options.slice(0, maxVisible) : options;

  const isBox = variant === 'box';
  const triggerCls = isBox
    ? `flex items-center justify-between gap-2 w-full px-3 py-2 rounded-lg border text-sm bg-white transition ${
        selected.size > 0 || open
          ? 'border-[#000000] text-[#000000]'
          : 'border-[#e0e0e0] text-gray-700 hover:border-gray-400'
      }`
    : `flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition ${
        selected.size > 0
          ? 'border-[#000000] bg-[#f7f7f7] text-[#000000]'
          : 'border-[#e0e0e0] bg-white text-gray-700 hover:border-gray-400'
      }`;

  return (
    <div className={isBox ? 'relative flex-1 min-w-0' : 'relative'} ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={triggerCls}
      >
        <span>{label}</span>
        {selected.size > 0 && (
          <span className="bg-[#000000] text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
            {selected.size}
          </span>
        )}
        {selected.size > 0 && onClear && (
          <span
            role="button"
            aria-label="선택 해제"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="w-4 h-4 flex items-center justify-center rounded-full text-[#000000] hover:bg-[#e0e0e0]"
          >
            <X className="w-3 h-3" />
          </span>
        )}
        <ChevronDown className={`w-4 h-4 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (() => {
        // 더보기 펼친 상태에서 8개 초과면 스크롤. scrollable=true도 기존대로 스크롤.
        const expandedScroll = showAll && hasMore && options.length > 8;
        const useScroll = scrollable || expandedScroll;
        const scrollCls = useScroll
          ? 'max-h-64 overflow-y-scroll [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-[#f7f7f7] [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-400 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-500'
          : '';
        const collapseBtn = hasMore && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="flex items-center gap-1 px-2 py-1.5 mt-0.5 text-sm font-medium text-gray-700 hover:text-[#000000]"
          >
            {showAll ? (
              <>
                <Minus className="w-4 h-4" />
                접기
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                더보기 ({options.length - maxVisible!})
              </>
            )}
          </button>
        );
        return (
          <div
            className={`absolute z-20 mt-2 bg-white border border-[#e0e0e0] rounded-lg shadow-lg p-2 ${
              isBox ? 'w-full min-w-56' : 'w-56'
            }`}
          >
            <div className={scrollCls}>
              {visible.map((opt) => (
                <label
                  key={opt}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#f7f7f7] cursor-pointer text-sm text-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(opt)}
                    onChange={() => onToggle(opt)}
                    className="accent-[#000000]"
                  />
                  <span>{opt}</span>
                  {counts && <span className="text-gray-400">({counts[opt] ?? 0})</span>}
                </label>
              ))}
              {/* 펼친 상태에서는 '접기' 버튼이 스크롤 영역 안 맨 끝에 위치 */}
              {showAll && collapseBtn}
            </div>
            {/* 접힌 상태에서는 '더보기' 버튼이 스크롤 영역 밖에 보임 */}
            {!showAll && collapseBtn}
          </div>
        );
      })()}
    </div>
  );
}

// 가격 필터 드롭다운 (Min / Max 직접 입력)
function PriceDropdown({
  min,
  max,
  onApply,
  fullWidth = false
}: {
  min: number | null;
  max: number | null;
  onApply: (min: number | null, max: number | null) => void;
  fullWidth?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [minInput, setMinInput] = useState(min != null ? String(min) : '');
  const [maxInput, setMaxInput] = useState(max != null ? String(max) : '');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    setMinInput(min != null ? String(min) : '');
    setMaxInput(max != null ? String(max) : '');
  }, [min, max]);

  const active = min != null || max != null;

  const apply = () => {
    const m = minInput.trim() === '' ? null : Number(minInput);
    const x = maxInput.trim() === '' ? null : Number(maxInput);
    onApply(Number.isFinite(m as number) ? m : null, Number.isFinite(x as number) ? x : null);
    setOpen(false);
  };

  return (
    <div className={fullWidth ? 'relative w-full' : 'relative'} ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={
          fullWidth
            ? `flex items-center justify-between gap-2 w-full px-3 py-2 rounded-lg border text-sm bg-white transition ${
                active || open
                  ? 'border-[#000000] text-[#000000]'
                  : 'border-[#e0e0e0] text-gray-700 hover:border-gray-400'
              }`
            : `flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition ${
                active
                  ? 'border-[#000000] bg-[#f7f7f7] text-[#000000]'
                  : 'border-[#e0e0e0] bg-white text-gray-700 hover:border-gray-400'
              }`
        }
      >
        <span>가격</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className={`absolute z-20 mt-2 bg-white border border-[#e0e0e0] rounded-xl shadow-lg p-4 ${fullWidth ? 'w-full min-w-72' : 'w-80'}`}>
          <h3 className="font-semibold text-[#000000] mb-3">가격</h3>
          <div className="flex items-stretch border border-[#e0e0e0] rounded-lg overflow-hidden focus-within:border-[#000000]">
            <input
              type="text"
              inputMode="numeric"
              value={minInput === '' ? '' : Number(minInput).toLocaleString('ko-KR')}
              onChange={(e) => setMinInput(e.target.value.replace(/[^\d]/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && apply()}
              placeholder="최소"
              className="flex-1 w-0 px-3 py-2.5 text-sm focus:outline-none"
            />
            <span className="w-px bg-[#e0e0e0]" />
            <input
              type="text"
              inputMode="numeric"
              value={maxInput === '' ? '' : Number(maxInput).toLocaleString('ko-KR')}
              onChange={(e) => setMaxInput(e.target.value.replace(/[^\d]/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && apply()}
              placeholder="최대"
              className="flex-1 w-0 px-3 py-2.5 text-sm focus:outline-none"
            />
            <button
              onClick={apply}
              aria-label="가격 적용"
              className="px-3 border-l border-[#e0e0e0] hover:bg-[#f7f7f7] flex items-center justify-center"
            >
              <Search className="w-4 h-4 text-gray-700" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// 케이블 길이 (m) 범위 드롭다운 — 0.5 단위
function LengthDropdown({
  min,
  max,
  onApply,
  fullWidth = false
}: {
  min: number | null;
  max: number | null;
  onApply: (min: number | null, max: number | null) => void;
  fullWidth?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [minInput, setMinInput] = useState(min != null ? String(min) : '');
  const [maxInput, setMaxInput] = useState(max != null ? String(max) : '');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    setMinInput(min != null ? String(min) : '');
    setMaxInput(max != null ? String(max) : '');
  }, [min, max]);

  const active = min != null || max != null;

  const apply = () => {
    const parse = (s: string): number | null => {
      const t = s.trim();
      if (t === '') return null;
      const n = Number(t);
      return Number.isFinite(n) ? n : null;
    };
    onApply(parse(minInput), parse(maxInput));
    setOpen(false);
  };

  return (
    <div className={fullWidth ? 'relative w-full' : 'relative'} ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={
          fullWidth
            ? `flex items-center justify-between gap-2 w-full px-3 py-2 rounded-lg border text-sm bg-white transition ${
                active || open
                  ? 'border-[#000000] text-[#000000]'
                  : 'border-[#e0e0e0] text-gray-700 hover:border-gray-400'
              }`
            : `flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition ${
                active
                  ? 'border-[#000000] bg-[#f7f7f7] text-[#000000]'
                  : 'border-[#e0e0e0] bg-white text-gray-700 hover:border-gray-400'
              }`
        }
      >
        <span>길이</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className={`absolute z-20 mt-2 bg-white border border-[#e0e0e0] rounded-xl shadow-lg p-4 ${fullWidth ? 'w-full min-w-72' : 'w-80'}`}>
          <h3 className="font-semibold text-[#000000] mb-3">길이 (m)</h3>
          <div className="flex items-stretch border border-[#e0e0e0] rounded-lg overflow-hidden focus-within:border-[#000000]">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={0.5}
              value={minInput}
              onChange={(e) => setMinInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && apply()}
              placeholder="최소"
              className="flex-1 w-0 px-3 py-2.5 text-sm focus:outline-none"
            />
            <span className="w-px bg-[#e0e0e0]" />
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={0.5}
              value={maxInput}
              onChange={(e) => setMaxInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && apply()}
              placeholder="최대"
              className="flex-1 w-0 px-3 py-2.5 text-sm focus:outline-none"
            />
            <button
              onClick={apply}
              aria-label="길이 적용"
              className="px-3 border-l border-[#e0e0e0] hover:bg-[#f7f7f7] flex items-center justify-center"
            >
              <Search className="w-4 h-4 text-gray-700" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// 모달 안 아코디언 섹션
function Section({
  title,
  defaultOpen = false,
  children
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[#f7f7f7] last:border-b-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-3.5"
      >
        <h4 className="text-base font-bold text-[#000000]">{title}</h4>
        {open ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  );
}

// 체크박스 그룹 (maxVisible 지정 시 "더보기"로 나머지 표시)
function CheckGroup({
  options,
  selected,
  onToggle,
  counts,
  maxVisible
}: {
  options: readonly string[];
  selected: Set<string>;
  onToggle: (v: string) => void;
  counts?: Record<string, number>;
  maxVisible?: number;
}) {
  const [showAll, setShowAll] = useState(false);
  const hasMore = maxVisible != null && options.length > maxVisible;
  const visible = hasMore && !showAll ? options.slice(0, maxVisible) : options;

  return (
    <div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {visible.map((opt) => (
          <label
            key={opt}
            className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-[#000000]"
          >
            <input
              type="checkbox"
              checked={selected.has(opt)}
              onChange={() => onToggle(opt)}
              className="accent-[#000000]"
            />
            <span>{opt}</span>
            {counts && <span className="text-gray-400">({counts[opt] ?? 0})</span>}
          </label>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="flex items-center gap-1 mt-2 text-sm font-medium text-gray-700 hover:text-[#000000]"
        >
          {showAll ? (
            <>
              <Minus className="w-4 h-4" />
              접기
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              더보기 ({options.length - maxVisible!})
            </>
          )}
        </button>
      )}
    </div>
  );
}

// Min / Max 입력 한 줄 (thousands=true면 천 단위 쉼표 표시, state는 숫자만 저장)
function MinMaxRow({
  minVal,
  maxVal,
  setMin,
  setMax,
  thousands = false,
  minOnly = false
}: {
  minVal: string;
  maxVal: string;
  setMin: (s: string) => void;
  setMax: (s: string) => void;
  thousands?: boolean;
  minOnly?: boolean;
}) {
  const display = (s: string) =>
    thousands && s !== '' ? Number(s).toLocaleString('ko-KR') : s;
  const handle = (setter: (s: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(thousands ? e.target.value.replace(/[^\d]/g, '') : e.target.value);
  };

  return (
    <div className="flex items-stretch border border-[#e0e0e0] rounded-lg overflow-hidden focus-within:border-[#000000] max-w-xs">
      <input
        type={thousands ? 'text' : 'number'}
        inputMode="numeric"
        min={0}
        value={display(minVal)}
        onChange={handle(setMin)}
        placeholder="최소"
        className="flex-1 w-0 px-3 py-2 text-sm focus:outline-none"
      />
      {!minOnly && (
        <>
          <span className="w-px bg-[#e0e0e0]" />
          <input
            type={thousands ? 'text' : 'number'}
            inputMode="numeric"
            min={0}
            value={display(maxVal)}
            onChange={handle(setMax)}
            placeholder="최대"
            className="flex-1 w-0 px-3 py-2 text-sm focus:outline-none"
          />
        </>
      )}
    </div>
  );
}

// "필터" 팝업 모달 — 적용하기 누를 때만 반영
function FilterModal({
  filters,
  counts,
  isAmp,
  isSpeaker,
  isSource,
  isAccessory,
  isTtAccessory,
  isCable,
  subCategories,
  categoryOptions,
  listings,
  brandOptions,
  onApply,
  onClose
}: {
  filters: Filters;
  counts: Counts;
  isAmp: boolean;
  isSpeaker: boolean;
  isSource: boolean;
  isAccessory: boolean;
  isTtAccessory: boolean;
  isCable: boolean;
  subCategories: Set<string>;
  categoryOptions: readonly string[];
  listings: Listing[];
  brandOptions: readonly string[];
  onApply: (next: Filters, subCategories: Set<string>) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Filters>(() => cloneFilters(filters));
  const [draftSubCategories, setDraftSubCategories] = useState<Set<string>>(
    () => new Set(subCategories)
  );

  const toggleDraftSubCategory = (v: string) => {
    setDraftSubCategories((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  };
  const str = (n: number | null) => (n != null ? String(n) : '');
  const [priceMinInput, setPriceMinInput] = useState(str(filters.priceMin));
  const [priceMaxInput, setPriceMaxInput] = useState(str(filters.priceMax));
  const [yearMinInput, setYearMinInput] = useState(str(filters.yearMin));
  const [yearMaxInput, setYearMaxInput] = useState(str(filters.yearMax));
  const [powerMinInput, setPowerMinInput] = useState(str(filters.powerMin));
  const [powerMaxInput, setPowerMaxInput] = useState(str(filters.powerMax));
  const [sensMinInput, setSensMinInput] = useState(str(filters.sensitivityMin));
  const [sensMaxInput, setSensMaxInput] = useState(str(filters.sensitivityMax));
  const [recMinInput, setRecMinInput] = useState(str(filters.recPowerMin));
  const [recMaxInput, setRecMaxInput] = useState(str(filters.recPowerMax));
  const [capMinInput, setCapMinInput] = useState(str(filters.ratedCapacityMin));
  const [capMaxInput, setCapMaxInput] = useState(str(filters.ratedCapacityMax));
  const [lenMinInput, setLenMinInput] = useState(str(filters.cableLengthMin));
  const [lenMaxInput, setLenMaxInput] = useState(str(filters.cableLengthMax));

  // 모달이 열린 동안 배경 스크롤 잠금
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const toggleIn = (key: keyof Filters) => (v: string) => {
    const set = new Set(draft[key] as Set<string>);
    if (set.has(v)) set.delete(v);
    else set.add(v);
    setDraft({ ...draft, [key]: set });
  };

  const num = (s: string): number | null => {
    if (s.trim() === '') return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };

  const draftIsTurntable =
    isSource && draftSubCategories.size === 1 && draftSubCategories.has('턴테이블');
  const draftIsPowerDevice =
    isAccessory && [...draftSubCategories].some((s) => POWER_DEVICE_ITEMS.includes(s));
  const draftIsCable = isCable;

  // 현재 모달에서 설정한 값으로 미리 필터링한 결과 수
  const previewCount = useMemo(() => {
    let base = listings;
    if (draftSubCategories.size > 0) base = base.filter((l) => l.categories.some((c) => draftSubCategories.has(c)));
    const effective: Filters = {
      ...draft,
      priceMin: num(priceMinInput),
      priceMax: num(priceMaxInput),
      yearMin: num(yearMinInput),
      yearMax: num(yearMaxInput),
      powerMin: num(powerMinInput),
      powerMax: num(powerMaxInput),
      sensitivityMin: num(sensMinInput),
      sensitivityMax: num(sensMaxInput),
      recPowerMin: num(recMinInput),
      recPowerMax: num(recMaxInput),
      ratedCapacityMin: num(capMinInput),
      ratedCapacityMax: num(capMaxInput),
      cableLengthMin: num(lenMinInput),
      cableLengthMax: num(lenMaxInput)
    };
    return applyFilters(base, effective, isAmp, isSpeaker, draftIsTurntable, draftIsPowerDevice, draftIsCable).length;
  }, [draft, draftSubCategories, priceMinInput, priceMaxInput, yearMinInput, yearMaxInput, powerMinInput, powerMaxInput, sensMinInput, sensMaxInput, recMinInput, recMaxInput, capMinInput, capMaxInput, lenMinInput, lenMaxInput, listings, isAmp, isSpeaker, draftIsTurntable, draftIsPowerDevice, draftIsCable]);

  const handleReset = () => {
    setDraft(emptyFilters());
    setDraftSubCategories(new Set());
    setPriceMinInput('');
    setPriceMaxInput('');
    setYearMinInput('');
    setYearMaxInput('');
    setPowerMinInput('');
    setPowerMaxInput('');
    setSensMinInput('');
    setSensMaxInput('');
    setRecMinInput('');
    setRecMaxInput('');
    setCapMinInput('');
    setCapMaxInput('');
    setLenMinInput('');
    setLenMaxInput('');
  };

  const handleApply = () => {
    onApply(
      {
        ...draft,
        priceMin: num(priceMinInput),
        priceMax: num(priceMaxInput),
        yearMin: num(yearMinInput),
        yearMax: num(yearMaxInput),
        powerMin: num(powerMinInput),
        powerMax: num(powerMaxInput),
        sensitivityMin: num(sensMinInput),
        sensitivityMax: num(sensMaxInput),
        recPowerMin: num(recMinInput),
        recPowerMax: num(recMaxInput),
        ratedCapacityMin: num(capMinInput),
        ratedCapacityMax: num(capMaxInput),
        cableLengthMin: num(lenMinInput),
        cableLengthMax: num(lenMaxInput)
      },
      draftSubCategories
    );
    onClose();
  };

  // 현재 모달에서 선택한 항목들을 칩으로 표시
  const rangeLabel = (min: string, max: string, suffix: string): string | null => {
    const useComma = suffix !== ''; // 연도(빈 suffix)는 콤마 미적용
    const fmt = (s: string) => {
      if (!useComma) return s;
      const n = Number(s);
      return Number.isFinite(n) ? n.toLocaleString('ko-KR') : s;
    };
    const a = min.trim();
    const b = max.trim();
    if (a && b) return `${fmt(a)} ~ ${fmt(b)}${suffix}`;
    if (a) return `${fmt(a)}${suffix} 이상`;
    if (b) return `${fmt(b)}${suffix} 이하`;
    return null;
  };

  const setFieldKeys: (keyof Filters)[] = [
    'brand', 'condition', 'ownership', 'country', 'region',
    'ampType', 'ampDetail', 'ampMethod', 'impedance', 'phono', 'toneControl', 'remote', 'voltage',
    'speakerDetail', 'driverConfig', 'enclosure', 'speakerImpedance', 'connection', 'wooferSize',
    'driveType', 'tonearm', 'cartridge', 'speeds', 'autoMode', 'dustCover',
    'terminalIn', 'terminalOut', 'directional', 'conductor', 'plating', 'shield', 'pair'
  ];
  const prefixFor: Partial<Record<keyof Filters, string>> = {
    phono: '포노',
    toneControl: '톤 컨트롤',
    remote: '리모컨',
    terminalIn: '입력',
    terminalOut: '출력',
    directional: '방향성',
    conductor: '도체',
    plating: '도금',
    shield: '차폐'
  };

  const draftChips: { key: string; label: string; remove: () => void }[] = [];
  for (const sc of draftSubCategories) {
    draftChips.push({
      key: `sub-${sc}`,
      label: sc,
      remove: () => toggleDraftSubCategory(sc)
    });
  }
  // 입력/출력 단자 결합 칩 (둘 다 정확히 1개 선택된 경우)
  const tInSize = draft.terminalIn.size;
  const tOutSize = draft.terminalOut.size;
  const combineTerm = tInSize === 1 && tOutSize === 1;
  if (combineTerm) {
    const tIn = [...draft.terminalIn][0];
    const tOut = [...draft.terminalOut][0];
    draftChips.push({
      key: `term-pair-${tIn}-${tOut}`,
      label: `입력: ${tIn} → 출력: ${tOut}`,
      remove: () => setDraft({ ...draft, terminalIn: new Set(), terminalOut: new Set() })
    });
  }
  for (const key of setFieldKeys) {
    if (combineTerm && (key === 'terminalIn' || key === 'terminalOut')) continue;
    for (const v of draft[key] as Set<string>) {
      const prefix = prefixFor[key];
      const useColon = key === 'terminalIn' || key === 'terminalOut';
      draftChips.push({
        key: `${key}-${v}`,
        label: prefix ? (useColon ? `${prefix}: ${v}` : `${prefix} ${v}`) : v,
        remove: () => toggleIn(key)(v)
      });
    }
  }
  const priceLabel = rangeLabel(priceMinInput, priceMaxInput, '만원');
  if (priceLabel)
    draftChips.push({
      key: 'price',
      label: `가격: ${priceLabel}`,
      remove: () => {
        setPriceMinInput('');
        setPriceMaxInput('');
      }
    });
  const yearLabel = rangeLabel(yearMinInput, yearMaxInput, '');
  if (yearLabel)
    draftChips.push({
      key: 'year',
      label: `출시년도: ${yearLabel}`,
      remove: () => {
        setYearMinInput('');
        setYearMaxInput('');
      }
    });
  const powerLabel = rangeLabel(powerMinInput, powerMaxInput, 'W');
  if (powerLabel)
    draftChips.push({
      key: 'power',
      label: `정격 출력: ${powerLabel}`,
      remove: () => {
        setPowerMinInput('');
        setPowerMaxInput('');
      }
    });
  const sensLabel = rangeLabel(sensMinInput, sensMaxInput, 'dB');
  if (sensLabel)
    draftChips.push({
      key: 'sensitivity',
      label: `감도: ${sensLabel}`,
      remove: () => {
        setSensMinInput('');
        setSensMaxInput('');
      }
    });
  const recLabel = rangeLabel(recMinInput, recMaxInput, 'W');
  if (recLabel)
    draftChips.push({
      key: 'recPower',
      label: `권장 앰프 출력: ${recLabel}`,
      remove: () => {
        setRecMinInput('');
        setRecMaxInput('');
      }
    });
  const capLabel = rangeLabel(capMinInput, capMaxInput, 'W');
  if (capLabel)
    draftChips.push({
      key: 'ratedCapacity',
      label: `정격 용량: ${capLabel}`,
      remove: () => {
        setCapMinInput('');
        setCapMaxInput('');
      }
    });
  const lenLabel = rangeLabel(lenMinInput, lenMaxInput, 'm');
  if (lenLabel)
    draftChips.push({
      key: 'cableLength',
      label: `길이: ${lenLabel}`,
      remove: () => {
        setLenMinInput('');
        setLenMaxInput('');
      }
    });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-[#e0e0e0]">
          <h3 className="text-lg font-bold text-[#000000]">필터</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-[#f7f7f7] flex items-center justify-center"
            aria-label="닫기"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* 본문 (아코디언, 스크롤) */}
        <div className="min-h-0 px-5 overflow-y-auto">
          {categoryOptions.length > 0 && !isSource && !isAccessory && !isTtAccessory && (
            <Section title="카테고리" defaultOpen>
              <CheckGroup
                options={categoryOptions}
                selected={draftSubCategories}
                onToggle={toggleDraftSubCategory}
                counts={counts.subcategory}
              />
            </Section>
          )}
          {isSource &&
            SOURCE_GROUPS.map((g) => (
              <Section key={g.title} title={g.title} defaultOpen>
                <CheckGroup
                  options={g.items}
                  selected={draftSubCategories}
                  onToggle={toggleDraftSubCategory}
                  counts={counts.subcategory}
                />
              </Section>
            ))}
          {isAccessory &&
            ACCESSORY_GROUPS.map((g) => (
              <Section key={g.title} title={g.title} defaultOpen>
                <CheckGroup
                  options={g.items}
                  selected={draftSubCategories}
                  onToggle={toggleDraftSubCategory}
                  counts={counts.subcategory}
                />
              </Section>
            ))}
          {isTtAccessory &&
            TT_ACCESSORY_GROUPS.map((g) => (
              <Section key={g.title} title={g.title} defaultOpen>
                <CheckGroup
                  options={g.items}
                  selected={draftSubCategories}
                  onToggle={toggleDraftSubCategory}
                  counts={counts.subcategory}
                />
              </Section>
            ))}
          {draftIsPowerDevice && (
            <Section title="정격 용량 (W)" defaultOpen>
              <MinMaxRow
                minVal={capMinInput}
                maxVal={capMaxInput}
                setMin={setCapMinInput}
                setMax={setCapMaxInput}
              />
            </Section>
          )}
          {draftIsCable && (
            <>
              <Section title="길이 (m)" defaultOpen>
                <MinMaxRow
                  minVal={lenMinInput}
                  maxVal={lenMaxInput}
                  setMin={setLenMinInput}
                  setMax={setLenMaxInput}
                />
              </Section>
              {(() => {
                const sortedTerms = terminalsPrioritized([...draftSubCategories]);
                return (
                  <Section title="입출력 단자" defaultOpen>
                    <div className="flex items-stretch gap-2 max-w-xs">
                      <FilterDropdown
                        label="입력 단자"
                        options={sortedTerms}
                        selected={draft.terminalIn}
                        onToggle={toggleIn('terminalIn')}
                        onClear={() => setDraft({ ...draft, terminalIn: new Set() })}
                        counts={counts.terminalIn}
                        scrollable
                        variant="box"
                      />
                      <FilterDropdown
                        label="출력 단자"
                        options={sortedTerms}
                        selected={draft.terminalOut}
                        onToggle={toggleIn('terminalOut')}
                        onClear={() => setDraft({ ...draft, terminalOut: new Set() })}
                        counts={counts.terminalOut}
                        scrollable
                        variant="box"
                      />
                    </div>
                  </Section>
                );
              })()}
              <Section title="도체 재질" defaultOpen>
                <CheckGroup
                  options={CONDUCTOR_OPTS}
                  selected={draft.conductor}
                  onToggle={toggleIn('conductor')}
                  counts={counts.conductor}
                />
              </Section>
              <Section title="커넥터 도금" defaultOpen>
                <CheckGroup
                  options={PLATING_OPTS}
                  selected={draft.plating}
                  onToggle={toggleIn('plating')}
                  counts={counts.plating}
                />
              </Section>
              {[...draftSubCategories].some((s) => SHIELD_RELEVANT.includes(s)) && (
                <Section title="차폐 방식" defaultOpen>
                  <CheckGroup
                    options={SHIELD_OPTS}
                    selected={draft.shield}
                    onToggle={toggleIn('shield')}
                    counts={counts.shield}
                  />
                </Section>
              )}
              <Section title="페어 여부" defaultOpen>
                <CheckGroup
                  options={PAIR_OPTS}
                  selected={draft.pair}
                  onToggle={toggleIn('pair')}
                  counts={counts.pair}
                />
              </Section>
              <Section title="방향성" defaultOpen>
                <CheckGroup
                  options={DIRECTIONALITY_OPTS}
                  selected={draft.directional}
                  onToggle={toggleIn('directional')}
                  counts={counts.directional}
                />
              </Section>
            </>
          )}
          {isAmp && (
            <>
              <Section title="세부 카테고리" defaultOpen>
                <CheckGroup
                  options={AMP_DETAILS}
                  selected={draft.ampDetail}
                  onToggle={toggleIn('ampDetail')}
                  counts={counts.ampDetail}
                />
              </Section>
              <Section title="증폭 방식" defaultOpen>
                <CheckGroup
                  options={AMP_METHODS}
                  selected={draft.ampMethod}
                  onToggle={toggleIn('ampMethod')}
                  counts={counts.ampMethod}
                />
              </Section>
            </>
          )}
          {isSpeaker && (
            <Section title="세부 카테고리" defaultOpen>
              <CheckGroup
                options={SPEAKER_DETAILS}
                selected={draft.speakerDetail}
                onToggle={toggleIn('speakerDetail')}
                counts={counts.speakerDetail}
              />
            </Section>
          )}

          <Section title="브랜드" defaultOpen>
            <CheckGroup
              options={brandOptions}
              selected={draft.brand}
              onToggle={toggleIn('brand')}
              counts={counts.brand}
              maxVisible={5}
            />
          </Section>
          <Section title="상태" defaultOpen>
            <CheckGroup
              options={CONDITIONS}
              selected={draft.condition}
              onToggle={toggleIn('condition')}
              counts={counts.condition}
            />
          </Section>
          <Section title="가격" defaultOpen>
            <MinMaxRow
              minVal={priceMinInput}
              maxVal={priceMaxInput}
              setMin={setPriceMinInput}
              setMax={setPriceMaxInput}
              thousands
            />
          </Section>

          {isAmp && (
            <>
              <Section title="정격 출력 (W)" defaultOpen>
                <MinMaxRow
                  minVal={powerMinInput}
                  maxVal={powerMaxInput}
                  setMin={setPowerMinInput}
                  setMax={setPowerMaxInput}
                />
              </Section>
              <Section title="지원 임피던스">
                <CheckGroup
                  options={IMPEDANCE_OPTS}
                  selected={draft.impedance}
                  onToggle={toggleIn('impedance')}
                  counts={counts.impedance}
                />
              </Section>
              <Section title="포노 입력">
                <CheckGroup
                  options={PHONO_OPTS}
                  selected={draft.phono}
                  onToggle={toggleIn('phono')}
                  counts={counts.phono}
                />
              </Section>
              <Section title="톤 컨트롤">
                <CheckGroup
                  options={TONE_OPTS}
                  selected={draft.toneControl}
                  onToggle={toggleIn('toneControl')}
                  counts={counts.toneControl}
                />
              </Section>
              <Section title="리모컨">
                <CheckGroup
                  options={REMOTE_OPTS}
                  selected={draft.remote}
                  onToggle={toggleIn('remote')}
                  counts={counts.remote}
                />
              </Section>
              <Section title="전원전압">
                <CheckGroup
                  options={VOLTAGE_OPTS}
                  selected={draft.voltage}
                  onToggle={toggleIn('voltage')}
                  counts={counts.voltage}
                />
              </Section>
            </>
          )}

          {isSpeaker && (
            <>
              <Section title="연결 방식" defaultOpen>
                <CheckGroup
                  options={CONNECTION_TYPES}
                  selected={draft.connection}
                  onToggle={toggleIn('connection')}
                  counts={counts.connection}
                />
              </Section>
              <Section title="드라이버 구성">
                <CheckGroup
                  options={DRIVER_CONFIGS}
                  selected={draft.driverConfig}
                  onToggle={toggleIn('driverConfig')}
                  counts={counts.driverConfig}
                />
              </Section>
              <Section title="우퍼 크기">
                <CheckGroup
                  options={WOOFER_SIZES}
                  selected={draft.wooferSize}
                  onToggle={toggleIn('wooferSize')}
                  counts={counts.wooferSize}
                />
              </Section>
              <Section title="인클로저 타입">
                <CheckGroup
                  options={ENCLOSURE_TYPES}
                  selected={draft.enclosure}
                  onToggle={toggleIn('enclosure')}
                  counts={counts.enclosure}
                />
              </Section>
              <Section title="임피던스">
                <CheckGroup
                  options={SPEAKER_IMPEDANCE}
                  selected={draft.speakerImpedance}
                  onToggle={toggleIn('speakerImpedance')}
                  counts={counts.speakerImpedance}
                />
              </Section>
              <Section title="감도 (dB)">
                <MinMaxRow
                  minVal={sensMinInput}
                  maxVal={sensMaxInput}
                  setMin={setSensMinInput}
                  setMax={setSensMaxInput}
                />
              </Section>
              <Section title="권장 앰프 출력 (W)">
                <MinMaxRow
                  minVal={recMinInput}
                  maxVal={recMaxInput}
                  setMin={setRecMinInput}
                  setMax={setRecMaxInput}
                />
              </Section>
            </>
          )}

          {draftIsTurntable && (
            <>
              <Section title="구동 방식" defaultOpen>
                <CheckGroup
                  options={DRIVE_TYPES}
                  selected={draft.driveType}
                  onToggle={toggleIn('driveType')}
                  counts={counts.driveType}
                />
              </Section>
              <Section title="톤암" defaultOpen>
                <CheckGroup
                  options={TONEARM_OPTS}
                  selected={draft.tonearm}
                  onToggle={toggleIn('tonearm')}
                  counts={counts.tonearm}
                />
              </Section>
              <Section title="카트리지" defaultOpen>
                <CheckGroup
                  options={CARTRIDGE_OPTS}
                  selected={draft.cartridge}
                  onToggle={toggleIn('cartridge')}
                  counts={counts.cartridge}
                />
              </Section>
              <Section title="속도" defaultOpen>
                <CheckGroup
                  options={SPEED_OPTS}
                  selected={draft.speeds}
                  onToggle={toggleIn('speeds')}
                  counts={counts.speeds}
                />
              </Section>
              <Section title="오토 기능" defaultOpen>
                <CheckGroup
                  options={AUTO_OPTS}
                  selected={draft.autoMode}
                  onToggle={toggleIn('autoMode')}
                  counts={counts.autoMode}
                />
              </Section>
              <Section title="더스트 커버" defaultOpen>
                <CheckGroup
                  options={DUSTCOVER_OPTS}
                  selected={draft.dustCover}
                  onToggle={toggleIn('dustCover')}
                  counts={counts.dustCover}
                />
              </Section>
            </>
          )}

          <Section title="출시년도">
            <MinMaxRow
              minVal={yearMinInput}
              maxVal={yearMaxInput}
              setMin={setYearMinInput}
              setMax={setYearMaxInput}
            />
          </Section>
          <Section title="소유권">
            <CheckGroup
              options={OWNERSHIP_OPTS}
              selected={draft.ownership}
              onToggle={toggleIn('ownership')}
              counts={counts.ownership}
            />
          </Section>
          <Section title="제조국">
            <CheckGroup
              options={COUNTRY_OPTS}
              selected={draft.country}
              onToggle={toggleIn('country')}
              counts={counts.country}
            />
          </Section>
          <Section title="지역">
            <CheckGroup
              options={LOCATIONS}
              selected={draft.region}
              onToggle={toggleIn('region')}
              counts={counts.region}
            />
          </Section>
        </div>

        {/* 선택한 필터 칩 */}
        {draftChips.length > 0 && (
          <div className="flex-shrink-0 border-t border-[#e0e0e0] px-5 py-3 max-h-28 overflow-y-auto">
            <div className="flex flex-wrap gap-2">
              {draftChips.map((chip) => (
                <button
                  key={chip.key}
                  onClick={chip.remove}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-[#f7f7f7] text-[#000000] border border-[#e0e0e0] rounded-full text-xs font-medium hover:bg-[#e0e0e0]"
                >
                  {chip.label}
                  <X className="w-3 h-3" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 푸터 */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-t border-[#e0e0e0]">
          <button
            onClick={handleReset}
            className="text-sm text-gray-600 hover:text-[#000000] font-medium"
          >
            필터 초기화
          </button>
          <button
            onClick={handleApply}
            className="bg-[#000000] text-white text-sm font-semibold px-6 py-2 rounded-lg hover:bg-[#000000] transition"
          >
            적용하기 ({previewCount.toLocaleString('ko-KR')}건)
          </button>
        </div>
      </div>
    </div>
  );
}

export function BrowsePage({ onSelect, category, initialSubCategory }: BrowsePageProps) {
  const allListings = useMemo(() => buildListings(), []);

  // 문서 <title>·메타 디스크립션을 카테고리 컨텍스트에 맞춰 동기화 (SEO + 공유 URL용)
  useEffect(() => {
    const meta = metaFor(category ?? null, initialSubCategory ?? null);
    if (meta) {
      document.title = meta.docTitle ?? `${meta.title} | Resonance`;
      if (meta.metaDesc) {
        let el = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
        if (!el) {
          el = document.createElement('meta');
          el.name = 'description';
          document.head.appendChild(el);
        }
        el.content = meta.metaDesc;
      }
    } else {
      document.title = 'Resonance';
    }
  }, [category, initialSubCategory]);

  // 선택된 대분류에 속하는 세부 카테고리 목록 (없으면 전체)
  const categorySubs = useMemo(
    () => (category ? subcategoriesFor(category) : []),
    [category]
  );

  const isAmp = category === '앰프';
  const isSpeaker = category === '스피커';
  const isSource = category === '소스기기';
  const isAccessory = category === '액세서리';
  const isTtAccessory = category === '턴테이블';
  const isCableCat = category === '케이블';

  // 턴테이블 단독 선택 시 턴테이블 전용 필터 활성
  // (계산은 subCategories 선언 후로 미룸 — 아래 useEffect 뒤에서)

  // 하위 카테고리 다중 선택 (프리앰프, 파워앰프 등). 비어있으면 대분류 전체
  const [subCategories, setSubCategories] = useState<Set<string>>(
    () => (initialSubCategory ? new Set([initialSubCategory]) : new Set())
  );
  useEffect(() => {
    setSubCategories(initialSubCategory ? new Set([initialSubCategory]) : new Set());
  }, [category, initialSubCategory]);

  const toggleSubCategory = (v: string) => {
    setSubCategories((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  };

  // 대분류만 적용된 풀 (카테고리 칩의 개수 집계 기준 — subCategories 미적용)
  const baseCategoryListings = useMemo(() => {
    if (categorySubs.length === 0) return allListings;
    return allListings.filter((l) => l.categories.some((c) => categorySubs.includes(c)));
  }, [allListings, categorySubs]);

  // subCategories까지 적용된 풀
  const categoryListings = useMemo(() => {
    if (subCategories.size > 0) return baseCategoryListings.filter((l) => l.categories.some((c) => subCategories.has(c)));
    return baseCategoryListings;
  }, [baseCategoryListings, subCategories]);

  // 턴테이블 단독 선택 시 턴테이블 전용 필터 활성
  const isTurntable =
    isSource && subCategories.size === 1 && subCategories.has('턴테이블');

  // 프리앰프 단독 선택 시 정격 출력 필터 숨김 (프리앰프는 출력 정격이 없음)
  const isPreampOnly =
    isAmp && subCategories.size === 1 && subCategories.has('프리앰프');

  // 헤드폰 앰프 단독 선택 시 정격 출력 대신 지원 임피던스(Ω) 범위 필터 표시
  const isHeadphoneAmp =
    isAmp && subCategories.size === 1 && subCategories.has('헤드폰 앰프');

  // 액세서리 페이지에서 전원 장치 그룹 항목이 하나라도 선택되면 전원 장치 전용 필터 활성
  const isPowerDevice =
    isAccessory && [...subCategories].some((s) => POWER_DEVICE_ITEMS.includes(s));
  const isCable = isCableCat;

  const subCatCounts = useMemo(
    () => countBy(baseCategoryListings, (l) => l.categories),
    [baseCategoryListings]
  );

  const counts = useMemo<Counts>(
    () => ({
      brand: countBy(categoryListings, (l) => l.brand),
      condition: (() => {
        const c = countBy(categoryListings, (l) => l.condition);
        // '중고 - 전체' = 모든 중고-* 매물 수 합계 (UI 단축키용)
        c[USED_ALL] = Object.entries(c)
          .filter(([k]) => k.startsWith('중고 -') && k !== USED_ALL)
          .reduce((s, [, v]) => s + v, 0);
        return c;
      })(),
      ownership: countBy(categoryListings, (l) => l.ownership),
      country: countBy(categoryListings, (l) => l.country),
      region: countBy(categoryListings, (l) => l.location),
      subcategory: subCatCounts,
      ampDetail: countBy(categoryListings, (l) => l.ampDetail),
      ampMethod: countBy(categoryListings, (l) => l.ampMethod),
      impedance: countBy(categoryListings, (l) => l.impedances),
      phono: countBy(categoryListings, (l) => l.phono),
      toneControl: countBy(categoryListings, (l) => l.toneControl),
      remote: countBy(categoryListings, (l) => l.remote),
      voltage: countBy(categoryListings, (l) => l.voltage),
      speakerDetail: countBy(categoryListings, (l) => l.speakerDetail),
      driverConfig: countBy(categoryListings, (l) => l.driverConfig),
      enclosure: countBy(categoryListings, (l) => l.enclosure),
      speakerImpedance: countBy(categoryListings, (l) => l.speakerImpedance),
      connection: countBy(categoryListings, (l) => l.connection),
      wooferSize: countBy(categoryListings, (l) => l.wooferSize),
      driveType: countBy(categoryListings, (l) => l.driveType),
      tonearm: countBy(categoryListings, (l) => l.tonearm),
      cartridge: countBy(categoryListings, (l) => l.cartridge),
      speeds: countBy(categoryListings, (l) => l.speeds),
      autoMode: countBy(categoryListings, (l) => l.autoMode),
      dustCover: countBy(categoryListings, (l) => l.dustCover),
      terminalIn: countBy(categoryListings, (l) => l.terminalIn),
      terminalOut: countBy(categoryListings, (l) => l.terminalOut),
      directional: countBy(categoryListings, (l) => l.directional),
      conductor: countBy(categoryListings, (l) => l.conductor),
      plating: countBy(categoryListings, (l) => l.plating),
      shield: countBy(categoryListings, (l) => l.shield),
      pair: countBy(categoryListings, (l) => l.pair)
    }),
    [categoryListings, subCatCounts]
  );

  // 브랜드를 매물 수 내림차순으로 정렬
  const brandsByCount = useMemo(
    () => [...BRANDS].sort((a, b) => (counts.brand[b] ?? 0) - (counts.brand[a] ?? 0)),
    [counts.brand]
  );

  // 상단 카테고리 드롭다운 옵션 — 소스기기는 매물 수 내림차순
  const topCategoryOptions = useMemo(() => {
    if (!isSource) return categorySubs;
    return [...categorySubs].sort((a, b) => (subCatCounts[b] ?? 0) - (subCatCounts[a] ?? 0));
  }, [categorySubs, isSource, subCatCounts]);

  // 각 카테고리 페이지마다 정의된 그룹을 사이드바 섹션으로 분리
  // BY TYPE → "카테고리", ETC → "기타", 그 외 그룹명은 그대로 사용
  const sidebarCategoryGroups: { title: string; items: string[] }[] = useMemo(() => {
    const renameTitle = (t: string) => (t === 'BY TYPE' ? '카테고리' : t === 'ETC' ? '기타' : t);
    let rawGroups: { title: string; items: string[] }[] | null = null;
    if (isAmp) rawGroups = AMP_GROUPS;
    else if (isSpeaker) rawGroups = SPEAKER_GROUPS;
    else if (isSource) rawGroups = SOURCE_GROUPS;
    else if (isAccessory) rawGroups = ACCESSORY_GROUPS;
    else if (isTtAccessory) rawGroups = TT_ACCESSORY_GROUPS;

    if (rawGroups) {
      const knownItems = new Set(rawGroups.flatMap((g) => g.items));
      const groups = rawGroups
        .map((g) => ({
          title: renameTitle(g.title),
          items: g.items.filter((it) => categorySubs.includes(it))
        }))
        .filter((g) => g.items.length > 0);
      // 그룹 정의에 없는 서브카테고리는 마지막에 "기타" 섹션으로 모음
      const orphan = categorySubs.filter((s) => !knownItems.has(s));
      if (orphan.length > 0) groups.push({ title: '기타', items: orphan });
      return groups;
    }

    // 그룹 미정의 카테고리(케이블 등): 단일 "카테고리" 섹션
    return categorySubs.length > 0 ? [{ title: '카테고리', items: topCategoryOptions }] : [];
  }, [isAmp, isSpeaker, isSource, isAccessory, isTtAccessory, categorySubs, topCategoryOptions]);

  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [modalOpen, setModalOpen] = useState(false);
  const [sort, setSort] = useState(SORT_OPTIONS[0]);
  const [liked, setLiked] = useState<Set<string>>(new Set());

  const toggleField = (key: keyof Filters) => (v: string) => {
    setFilters((prev) => {
      const set = new Set(prev[key] as Set<string>);
      if (set.has(v)) set.delete(v);
      else set.add(v);
      return { ...prev, [key]: set };
    });
  };

  const toggleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const list = applyFilters(categoryListings, filters, isAmp, isSpeaker, isTurntable, isPowerDevice, isCable);
    const sorted = [...list];
    if (sort === '최신순') sorted.sort((a, b) => a.daysAgo - b.daysAgo);
    else if (sort === '가격 낮은순') sorted.sort((a, b) => a.price - b.price);
    else if (sort === '가격 높은순') sorted.sort((a, b) => b.price - a.price);
    return sorted;
  }, [categoryListings, filters, isAmp, isSpeaker, isTurntable, isPowerDevice, isCable, sort]);

  // 선택한 모든 필터 값을 칩으로 표시 (연도 제외 천 단위 콤마)
  const rangeChipLabel = (min: number | null, max: number | null, suffix: string): string | null => {
    const useComma = suffix !== ''; // 연도(빈 suffix)는 콤마 미적용
    const fmt = (n: number) => (useComma ? n.toLocaleString('ko-KR') : String(n));
    if (min != null && max != null) return `${fmt(min)} ~ ${fmt(max)}${suffix}`;
    if (min != null) return `${fmt(min)}${suffix} 이상`;
    if (max != null) return `${fmt(max)}${suffix} 이하`;
    return null;
  };

  const activeChips: { key: string; label: string; remove: () => void }[] = [];
  for (const sc of subCategories) {
    activeChips.push({
      key: `sub-${sc}`,
      label: sc,
      remove: () => toggleSubCategory(sc)
    });
  }
  {
    const setFieldKeys: { key: keyof Filters; prefix?: string; ampOnly?: boolean; speakerOnly?: boolean; turntableOnly?: boolean; cableOnly?: boolean }[] = [
      { key: 'brand' },
      { key: 'condition' },
      { key: 'ownership' },
      { key: 'country' },
      { key: 'region' },
      { key: 'ampType', ampOnly: true },
      { key: 'ampDetail', ampOnly: true },
      { key: 'ampMethod', ampOnly: true },
      { key: 'impedance', ampOnly: true },
      { key: 'phono', prefix: '포노', ampOnly: true },
      { key: 'toneControl', prefix: '톤 컨트롤', ampOnly: true },
      { key: 'remote', prefix: '리모컨', ampOnly: true },
      { key: 'voltage', ampOnly: true },
      { key: 'speakerDetail', speakerOnly: true },
      { key: 'driverConfig', speakerOnly: true },
      { key: 'enclosure', speakerOnly: true },
      { key: 'speakerImpedance', speakerOnly: true },
      { key: 'connection', speakerOnly: true },
      { key: 'wooferSize', speakerOnly: true },
      { key: 'driveType', turntableOnly: true },
      { key: 'tonearm', prefix: '톤암', turntableOnly: true },
      { key: 'cartridge', prefix: '카트리지', turntableOnly: true },
      { key: 'speeds', turntableOnly: true },
      { key: 'autoMode', turntableOnly: true },
      { key: 'dustCover', prefix: '더스트 커버', turntableOnly: true },
      { key: 'terminalIn', prefix: '입력', cableOnly: true },
      { key: 'terminalOut', prefix: '출력', cableOnly: true },
      { key: 'directional', prefix: '방향성', cableOnly: true },
      { key: 'conductor', prefix: '도체', cableOnly: true },
      { key: 'plating', prefix: '도금', cableOnly: true },
      { key: 'shield', prefix: '차폐', cableOnly: true },
      { key: 'pair', cableOnly: true },
    ];
    // 케이블: 입력/출력 둘 다 정확히 1개 선택된 경우 결합 칩으로 표시
    const combineTermActive =
      isCable && filters.terminalIn.size === 1 && filters.terminalOut.size === 1;
    if (combineTermActive) {
      const tIn = [...filters.terminalIn][0];
      const tOut = [...filters.terminalOut][0];
      activeChips.push({
        key: `term-pair-${tIn}-${tOut}`,
        label: `입력: ${tIn} → 출력: ${tOut}`,
        remove: () =>
          setFilters((prev) => ({
            ...prev,
            terminalIn: new Set(),
            terminalOut: new Set()
          }))
      });
    }
    for (const { key, prefix, ampOnly, speakerOnly, turntableOnly, cableOnly } of setFieldKeys) {
      if (ampOnly && !isAmp) continue;
      if (speakerOnly && !isSpeaker) continue;
      if (turntableOnly && !isTurntable) continue;
      if (cableOnly && !isCable) continue;
      if (combineTermActive && (key === 'terminalIn' || key === 'terminalOut')) continue;
      const useColon = key === 'terminalIn' || key === 'terminalOut';
      for (const v of filters[key] as Set<string>) {
        activeChips.push({
          key: `${key}-${v}`,
          label: prefix ? (useColon ? `${prefix}: ${v}` : `${prefix} ${v}`) : v,
          remove: () => toggleField(key)(v)
        });
      }
    }
    const priceLabel = rangeChipLabel(filters.priceMin, filters.priceMax, '만원');
    if (priceLabel)
      activeChips.push({
        key: 'price',
        label: `가격: ${priceLabel}`,
        remove: () => setFilters((prev) => ({ ...prev, priceMin: null, priceMax: null }))
      });
    const yearLabel = rangeChipLabel(filters.yearMin, filters.yearMax, '');
    if (yearLabel)
      activeChips.push({
        key: 'year',
        label: `출시년도: ${yearLabel}`,
        remove: () => setFilters((prev) => ({ ...prev, yearMin: null, yearMax: null }))
      });
    if (isAmp) {
      const powerLabel = rangeChipLabel(filters.powerMin, filters.powerMax, 'W');
      if (powerLabel)
        activeChips.push({
          key: 'power',
          label: `정격 출력: ${powerLabel}`,
          remove: () => setFilters((prev) => ({ ...prev, powerMin: null, powerMax: null }))
        });
      const hpImpLabel = rangeChipLabel(filters.headphoneImpMin, filters.headphoneImpMax, 'Ω');
      if (hpImpLabel)
        activeChips.push({
          key: 'headphoneImp',
          label: `지원 임피던스: ${hpImpLabel}`,
          remove: () => setFilters((prev) => ({ ...prev, headphoneImpMin: null, headphoneImpMax: null }))
        });
    }
    if (isPowerDevice) {
      const capLabel = rangeChipLabel(filters.ratedCapacityMin, filters.ratedCapacityMax, 'W');
      if (capLabel)
        activeChips.push({
          key: 'ratedCapacity',
          label: `정격 용량: ${capLabel}`,
          remove: () => setFilters((prev) => ({ ...prev, ratedCapacityMin: null, ratedCapacityMax: null }))
        });
    }
    if (isCable) {
      const lenLabel = rangeChipLabel(filters.cableLengthMin, filters.cableLengthMax, 'm');
      if (lenLabel)
        activeChips.push({
          key: 'cableLength',
          label: `길이: ${lenLabel}`,
          remove: () => setFilters((prev) => ({ ...prev, cableLengthMin: null, cableLengthMax: null }))
        });
    }
    if (isSpeaker) {
      const sensLabel = rangeChipLabel(filters.sensitivityMin, filters.sensitivityMax, 'dB');
      if (sensLabel)
        activeChips.push({
          key: 'sensitivity',
          label: `감도: ${sensLabel}`,
          remove: () => setFilters((prev) => ({ ...prev, sensitivityMin: null, sensitivityMax: null }))
        });
      const recLabel = rangeChipLabel(filters.recPowerMin, filters.recPowerMax, 'W');
      if (recLabel)
        activeChips.push({
          key: 'recPower',
          label: `권장 앰프 출력: ${recLabel}`,
          remove: () => setFilters((prev) => ({ ...prev, recPowerMin: null, recPowerMax: null }))
        });
    }
  }

  const filterCount = countFilters(filters);

  const resetAll = () => {
    setFilters(emptyFilters());
    setSubCategories(new Set());
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      {/* 헤더 */}
      <div className="mb-5">
        <nav className="text-sm text-gray-500 mb-2">
          홈
          {category && (
            <>
              <span className="mx-1">›</span>
              {subCategories.size === 1 ? (
                <button
                  onClick={() => setSubCategories(new Set())}
                  className="text-sm hover:text-[#000000]"
                >
                  {category}
                </button>
              ) : (
                <span className="text-[#000000]">{category}</span>
              )}
            </>
          )}
          {subCategories.size === 1 && (
            <>
              <span className="mx-1">›</span>
              <span className="text-[#000000]">{[...subCategories][0]}</span>
            </>
          )}
        </nav>
        {(() => {
          const activeSub = subCategories.size === 1 ? [...subCategories][0] : null;
          const meta = metaFor(category ?? null, activeSub);
          const title = meta?.title ?? category ?? 'ALL';
          return <h1 className="text-3xl font-bold mb-1">{title}</h1>;
        })()}
      </div>

      {/* 2단 레이아웃: 좌측 필터 사이드바 + 우측 결과 */}
      <div className="flex gap-6">
        {/* 좌측 필터 사이드바 (스크롤 시 따라오지 않음) */}
        <aside className="hidden lg:block w-60 shrink-0">
          <div>
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-[#e0e0e0]">
              <SlidersHorizontal className="w-5 h-5" />
              <h2 className="text-lg font-bold">필터</h2>
            </div>

            {/* 활성 필터 섹션 */}
            {activeChips.length > 0 && (
              <div className="pb-3 mb-3 border-b border-[#e0e0e0]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-[#000000]">활성 필터</span>
                  <button
                    onClick={resetAll}
                    className="text-sm text-gray-600 hover:text-[#000000] underline"
                  >
                    전체 초기화
                  </button>
                </div>
                <div className="flex flex-col gap-1.5">
                  {activeChips.map((chip) => (
                    <button
                      key={chip.key}
                      onClick={chip.remove}
                      className="inline-flex items-center justify-between gap-1 px-2.5 py-1 bg-[#f7f7f7] text-[#000000] border border-[#e0e0e0] rounded text-xs font-medium hover:bg-[#e0e0e0] text-left"
                    >
                      <span className="truncate">{chip.label}</span>
                      <X className="w-3 h-3 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col">
              <FilterSection
                label="상태"
                options={CONDITION_DISPLAY}
                selected={filters.condition}
                onToggle={toggleField('condition')}
                counts={counts.condition}
                maxVisible={3}
              />
              {sidebarCategoryGroups.map((g) => (
                <FilterSection
                  key={g.title}
                  label={g.title}
                  options={g.items}
                  selected={subCategories}
                  onToggle={toggleSubCategory}
                  counts={subCatCounts}
                  maxVisible={g.items.length > 8 ? 8 : undefined}
                />
              ))}
              {/* 앰프: 세부 카테고리·증폭 방식·정격 출력은 브랜드 위에 표시 */}
              {isAmp && (
                <>
                  {!isHeadphoneAmp && (
                    <FilterSection label="세부 카테고리" options={AMP_DETAILS} selected={filters.ampDetail} onToggle={toggleField('ampDetail')} counts={counts.ampDetail} />
                  )}
                  <FilterSection label="증폭 방식" options={AMP_METHODS} selected={filters.ampMethod} onToggle={toggleField('ampMethod')} counts={counts.ampMethod} />
                  {/* 헤드폰 앰프: 정격 출력 대신 지원 임피던스(Ω) 범위 */}
                  {isHeadphoneAmp ? (
                    <RangeSection label="지원 임피던스" unit="Ω" min={filters.headphoneImpMin} max={filters.headphoneImpMax} onApply={(m, x) => setFilters((prev) => ({ ...prev, headphoneImpMin: m, headphoneImpMax: x }))} />
                  ) : (
                    !isPreampOnly && (
                      <RangeSection label="정격 출력 (W·8Ω)" min={filters.powerMin} max={filters.powerMax} onApply={(m, x) => setFilters((prev) => ({ ...prev, powerMin: m, powerMax: x }))} />
                    )
                  )}
                </>
              )}
              <FilterSection
                label="브랜드"
                options={brandsByCount}
                selected={filters.brand}
                onToggle={toggleField('brand')}
                counts={counts.brand}
                maxVisible={5}
                step={5}
                searchable
              />
              <RangeSection
                label="가격"
                min={filters.priceMin}
                max={filters.priceMax}
                onApply={(m, x) => setFilters((prev) => ({ ...prev, priceMin: m, priceMax: x }))}
              />

              {/* 앰프 전용 (세부 카테고리·증폭 방식·정격 출력은 브랜드 위로 이동) */}
              {isAmp && (
                <>
                  {!isPreampOnly && !isHeadphoneAmp && (
                    <FilterSection label="지원 임피던스" options={IMPEDANCE_OPTS} selected={filters.impedance} onToggle={toggleField('impedance')} counts={counts.impedance} defaultOpen={false} />
                  )}
                  <FilterSection label="포노 입력" options={PHONO_OPTS} selected={filters.phono} onToggle={toggleField('phono')} counts={counts.phono} defaultOpen={false} />
                  <FilterSection label="톤 컨트롤" options={TONE_OPTS} selected={filters.toneControl} onToggle={toggleField('toneControl')} counts={counts.toneControl} defaultOpen={false} />
                  <FilterSection label="리모컨" options={REMOTE_OPTS} selected={filters.remote} onToggle={toggleField('remote')} counts={counts.remote} defaultOpen={false} />
                  <FilterSection label="전원전압" options={VOLTAGE_OPTS} selected={filters.voltage} onToggle={toggleField('voltage')} counts={counts.voltage} defaultOpen={false} />
                </>
              )}

              {/* 스피커 전용 */}
              {isSpeaker && (
                <>
                  <FilterSection label="세부 카테고리" options={SPEAKER_DETAILS} selected={filters.speakerDetail} onToggle={toggleField('speakerDetail')} counts={counts.speakerDetail} />
                  <FilterSection label="연결 방식" options={CONNECTION_TYPES} selected={filters.connection} onToggle={toggleField('connection')} counts={counts.connection} />
                  <FilterSection label="드라이버 구성" options={DRIVER_CONFIGS} selected={filters.driverConfig} onToggle={toggleField('driverConfig')} counts={counts.driverConfig} defaultOpen={false} />
                  <FilterSection label="우퍼 크기" options={WOOFER_SIZES} selected={filters.wooferSize} onToggle={toggleField('wooferSize')} counts={counts.wooferSize} defaultOpen={false} />
                  <FilterSection label="인클로저 타입" options={ENCLOSURE_TYPES} selected={filters.enclosure} onToggle={toggleField('enclosure')} counts={counts.enclosure} defaultOpen={false} />
                  <FilterSection label="임피던스" options={SPEAKER_IMPEDANCE} selected={filters.speakerImpedance} onToggle={toggleField('speakerImpedance')} counts={counts.speakerImpedance} defaultOpen={false} />
                  <RangeSection label="감도" unit="dB" min={filters.sensitivityMin} max={filters.sensitivityMax} onApply={(m, x) => setFilters((prev) => ({ ...prev, sensitivityMin: m, sensitivityMax: x }))} defaultOpen={false} />
                  <RangeSection label="권장 앰프 출력" unit="W" min={filters.recPowerMin} max={filters.recPowerMax} onApply={(m, x) => setFilters((prev) => ({ ...prev, recPowerMin: m, recPowerMax: x }))} defaultOpen={false} />
                </>
              )}

              {/* 케이블 전용 */}
              {isCable && (
                <>
                  <RangeSection label="길이" unit="m" step={0.5} min={filters.cableLengthMin} max={filters.cableLengthMax} onApply={(m, x) => setFilters((prev) => ({ ...prev, cableLengthMin: m, cableLengthMax: x }))} />
                  {(() => {
                    const sortedTerms = terminalsPrioritized([...subCategories]);
                    return (
                      <div className="border-b border-[#e0e0e0] py-3">
                        <span className="block text-sm font-semibold text-[#000000] mb-2.5">입출력 단자</span>
                        <div className="flex flex-col gap-2">
                          <FilterDropdown label="입력 단자" options={sortedTerms} selected={filters.terminalIn} onToggle={toggleField('terminalIn')} onClear={() => setFilters((prev) => ({ ...prev, terminalIn: new Set() }))} counts={counts.terminalIn} scrollable variant="box" />
                          <FilterDropdown label="출력 단자" options={sortedTerms} selected={filters.terminalOut} onToggle={toggleField('terminalOut')} onClear={() => setFilters((prev) => ({ ...prev, terminalOut: new Set() }))} counts={counts.terminalOut} scrollable variant="box" />
                        </div>
                      </div>
                    );
                  })()}
                  <FilterSection label="도체 재질" options={CONDUCTOR_OPTS} selected={filters.conductor} onToggle={toggleField('conductor')} counts={counts.conductor} defaultOpen={false} />
                  <FilterSection label="커넥터 도금" options={PLATING_OPTS} selected={filters.plating} onToggle={toggleField('plating')} counts={counts.plating} defaultOpen={false} />
                  {[...subCategories].some((s) => SHIELD_RELEVANT.includes(s)) && (
                    <FilterSection label="차폐 방식" options={SHIELD_OPTS} selected={filters.shield} onToggle={toggleField('shield')} counts={counts.shield} defaultOpen={false} />
                  )}
                  <FilterSection label="페어 여부" options={PAIR_OPTS} selected={filters.pair} onToggle={toggleField('pair')} counts={counts.pair} defaultOpen={false} />
                  <FilterSection label="방향성" options={DIRECTIONALITY_OPTS} selected={filters.directional} onToggle={toggleField('directional')} counts={counts.directional} defaultOpen={false} />
                </>
              )}

              {/* 턴테이블 전용 */}
              {isTurntable && (
                <>
                  <FilterSection label="구동 방식" options={DRIVE_TYPES} selected={filters.driveType} onToggle={toggleField('driveType')} counts={counts.driveType} />
                  <FilterSection label="톤암" options={TONEARM_OPTS} selected={filters.tonearm} onToggle={toggleField('tonearm')} counts={counts.tonearm} />
                  <FilterSection label="카트리지" options={CARTRIDGE_OPTS} selected={filters.cartridge} onToggle={toggleField('cartridge')} counts={counts.cartridge} />
                  <FilterSection label="속도" options={SPEED_OPTS} selected={filters.speeds} onToggle={toggleField('speeds')} counts={counts.speeds} defaultOpen={false} />
                  <FilterSection label="오토 기능" options={AUTO_OPTS} selected={filters.autoMode} onToggle={toggleField('autoMode')} counts={counts.autoMode} defaultOpen={false} />
                  <FilterSection label="더스트 커버" options={DUSTCOVER_OPTS} selected={filters.dustCover} onToggle={toggleField('dustCover')} counts={counts.dustCover} defaultOpen={false} />
                </>
              )}

              {/* 전원 장치 전용 */}
              {isPowerDevice && (
                <RangeSection label="정격 용량" unit="W" min={filters.ratedCapacityMin} max={filters.ratedCapacityMax} onApply={(m, x) => setFilters((prev) => ({ ...prev, ratedCapacityMin: m, ratedCapacityMax: x }))} />
              )}

              {/* 공통 */}
              <RangeSection label="출시년도" noComma min={filters.yearMin} max={filters.yearMax} onApply={(m, x) => setFilters((prev) => ({ ...prev, yearMin: m, yearMax: x }))} defaultOpen={false} />
              <FilterSection label="소유권" options={OWNERSHIP_OPTS} selected={filters.ownership} onToggle={toggleField('ownership')} counts={counts.ownership} defaultOpen={false} />
              <FilterSection label="제조국" options={COUNTRY_OPTS} selected={filters.country} onToggle={toggleField('country')} counts={counts.country} defaultOpen={false} />
              <FilterSection label="지역" options={LOCATIONS} selected={filters.region} onToggle={toggleField('region')} counts={counts.region} defaultOpen={false} />
            </div>
          </div>
        </aside>

        {/* 우측 결과 영역 */}
        <div className="flex-1 min-w-0">
          {/* 모바일 전용 필터 버튼 */}
          <div className="lg:hidden mb-3">
            <button
              onClick={() => setModalOpen(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition ${
                filterCount > 0
                  ? 'border-[#000000] bg-[#f7f7f7] text-[#000000]'
                  : 'border-[#e0e0e0] bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>필터</span>
              {filterCount > 0 && (
                <span className="bg-[#000000] text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                  {filterCount}
                </span>
              )}
            </button>
          </div>

          {/* 결과 수 + 정렬 */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-700">
              <b className="text-[#000000]">{filtered.length.toLocaleString('ko-KR')}</b>건의 매물
            </p>
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="appearance-none border border-[#e0e0e0] rounded-lg pl-4 pr-9 py-2 text-sm focus:outline-none focus:border-[#000000] bg-white"
              >
                {SORT_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 매물 그리드 */}
          {filtered.length === 0 ? (
            <div className="bg-[#f7f7f7] border border-[#e0e0e0] rounded-lg py-16 text-center text-gray-500">
              조건에 맞는 매물이 없습니다. 필터를 조정해보세요.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((l) => (
            <button
              key={l.id}
              onClick={onSelect}
              className="group text-left bg-white border border-[#e0e0e0] rounded-lg overflow-hidden hover:border-[#000000] hover:shadow-md transition"
            >
              <div className="relative aspect-square bg-[#f7f7f7] flex items-center justify-center">
                <img
                  src="/images/no-image.png"
                  alt={`${l.brand} ${l.model}`}
                  className="w-full h-full object-cover opacity-70"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span className="absolute text-xs text-gray-400">이미지 없음</span>
                <button
                  onClick={(e) => toggleLike(l.id, e)}
                  className="absolute top-2 right-2 w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-sm"
                  aria-label="찜하기"
                >
                  <Heart
                    className={`w-4 h-4 ${liked.has(l.id) ? 'fill-[#000000] text-[#000000]' : 'text-gray-500'}`}
                  />
                </button>
              </div>
              <div className="p-3">
                <p className="text-xs text-gray-500 mb-1">{l.brand}</p>
                <h3 className="text-sm font-semibold text-[#000000] line-clamp-1 group-hover:text-[#000000] transition">
                  {l.model}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{l.year} · {l.category}</p>
                <p className="text-base font-bold text-[#000000] mt-2">{fmtPrice(l.price)}</p>
                <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                  <span>{l.condition}</span>
                  <span>{l.location}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
        </div>
      </div>

      {/* 필터 모달 */}
      {modalOpen && (
        <FilterModal
          filters={filters}
          counts={counts}
          isAmp={isAmp}
          isSpeaker={isSpeaker}
          isSource={isSource}
          isAccessory={isAccessory}
          isTtAccessory={isTtAccessory}
          isCable={isCable}
          subCategories={subCategories}
          categoryOptions={categorySubs}
          listings={baseCategoryListings}
          brandOptions={brandsByCount}
          onApply={(next, subs) => {
            setFilters(next);
            setSubCategories(subs);
          }}
          onClose={() => setModalOpen(false)}
        />
      )}
    </main>
  );
}
