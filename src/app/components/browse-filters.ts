// ============================================================================
// browse-filters.ts — 매물 필터의 "두뇌"(데이터·타입·로직). 화면(JSX) 없음.
// ----------------------------------------------------------------------------
// browse-page.tsx(거대 파일)에서 분리해 온 부분입니다. 여기에는:
//   - 각종 옵션 상수 (CONDITIONS, AMP_TYPES, 그룹 정의 등)
//   - 타입 (Listing=매물 1건, Filters=필터 상태, Counts=개수 집계)
//   - applyFilters(): 매물 목록에 필터 적용
//   - emptyFilters/cloneFilters/countFilters 등 헬퍼
// 화면 컴포넌트들은 이 파일에서 필요한 것을 import 해서 사용합니다.
// ============================================================================
// 필터 값은 언어 중립 키 — 저장값과 같은 영문 키(또는 MM, 8Ω 같은 중립 글자). 화면 글자는 filterLabel(필드, 값)로만.
//   앰프·스피커·턴테이블 옵션은 판매 폼 상수(category-specs.ts)의 저장값(optValues) — 단일 출처, 정규화 없음. mapRow 는 저장값을 그대로 넘김
//   상태, 지역, 소유권, 제조국은 labels.ts 키 (DB 컬럼 값 그대로)
import { LOCATION_OPTS, LOCATION_COUNTRY_OPTS, CURRENCY_SYMBOLS, CONDITION_KEYS, SPEC_LABELS, label, locationCountryOf, locationOptsFor } from '@/lib/labels';
import { AMP_CHANNEL_OPTS, PREAMP_CHANNEL_OPTS, AMP_DEVICE_OPTS, AMP_OHM_OPTS, AMP_PHONO_OPTS, YES_NO_OPTS, AMP_VOLTAGE_OPTS, optLabel, optValues, SPEAKER_DETAIL_OPTS, SPEAKER_DRIVER_OPTS, SPEAKER_ENCLOSURE_OPTS, SPEAKER_IMPEDANCE_BUCKETS, SPEAKER_WOOFER_BUCKETS, TT_DRIVE_OPTS, TT_TONEARM_OPTS, TT_CARTRIDGE_OPTS, TT_SPEED_OPTS, TT_AUTO_OPTS, TT_DUSTCOVER_OPTS } from '@/app/data/category-specs';
import { FEATURE_FLAGS } from '@/app/data/feature-flags'; // 숨김 플래그 (docs/hidden.md)

// 상태 = 종류 4개 (labels.ts CONDITION_KEYS: new / unopened / nos / used, 주소 ?condition=used). 중고의 등급은 외관, 작동 필터가 맡음 (2026-11-10 상태 등급 재구성)
export const CONDITIONS = CONDITION_KEYS;
export const APPEARANCE_OPTS = Object.keys(SPEC_LABELS.appearance); // 외관 상태: mint / excellent / good / fair (주소 ?appearance=)
export const WORKING_OPTS = Object.keys(SPEC_LABELS.working);       // 작동 상태: working / needs_inspection / needs_repair (주소 ?working=)
export const LOCATION_COUNTRIES = LOCATION_COUNTRY_OPTS.map((o) => o.value); // 국가 = 폼 '국가' 선택지: kr / jp
export const LOCATIONS = LOCATION_OPTS.map((o) => o.value); // 지역 = 폼 '지역' 선택지 키 전부 (kr_seoul … jp_okinawa, labels.ts LOCATION_OPTS)
// 지역 필터 선택지 — 국가를 고르면 그 나라 지역만, 안 고르면 전 국가(한국 먼저, 한국 시/도 개수만큼 펼쳐 보임)
export const regionOptionsFor = (countries: Set<string>) => (countries.size ? LOCATIONS.filter((k) => countries.has(locationCountryOf(k))) : LOCATIONS);
export const REGION_VISIBLE_ALL = locationOptsFor('kr').length;
// 국가 선택을 바꾼 뒤, 고른 나라에 속하지 않는 지역 선택은 뺌 (일본만 고르면 서울 선택이 남지 않게)
export const pruneRegions = (f: Filters): Filters =>
  f.locationCountry.size === 0 ? f : { ...f, region: new Set([...f.region].filter((k) => f.locationCountry.has(locationCountryOf(k)))) };
export const OWNERSHIP_OPTS = ['single_owner', 'multiple_owners'];
export const COUNTRY_OPTS = ['us', 'jp', 'uk', 'de', 'fr', 'dk', 'ca', 'cn'];
export const SORT_OPTIONS = ['추천순', '최신순', '가격 낮은순', '가격 높은순'];

// 앰프 전용 필터 옵션
export const AMP_TYPES = ['프리앰프', '파워앰프', '인티앰프', '포노 스테이지', '리시버', 'AV 리시버', '헤드폰 앰프'];
// 채널 = 폼 채널 옵션 2종의 합집합 (파워 등: mono_block/stereo/multi_channel + 프리앰프: mono/stereo/multi_channel), 중복 제거·순서 유지
const CHANNEL_OPTS = [...AMP_CHANNEL_OPTS, ...PREAMP_CHANNEL_OPTS];
export const AMP_DETAILS = Array.from(new Set(optValues(CHANNEL_OPTS)));
export const AMP_METHODS = optValues(AMP_DEVICE_OPTS);    // 증폭 방식: tube / solid_state / hybrid
export const IMPEDANCE_OPTS = AMP_OHM_OPTS;               // 지원 임피던스 = 폼 옴 옵션: 2Ω / 4Ω / 6Ω / 8Ω / 16Ω (중립 글자)
export const PHONO_OPTS = optValues(AMP_PHONO_OPTS);      // 포노 입력: MM / MC / MM/MC / none
export const TONE_OPTS = optValues(YES_NO_OPTS);          // 톤 컨트롤: yes / no
export const REMOTE_OPTS = optValues(YES_NO_OPTS);        // 리모컨: yes / no
export const VOLTAGE_OPTS = optValues(AMP_VOLTAGE_OPTS);  // 전원 전압: 100V / 120V / 220V / free_volt

// 스피커 전용 필터 옵션 — 폼 옵션 그대로. 드라이버 구성·우퍼 크기는 드라이버 빌더 파생 키(driverWays·wooferMaxInch)의 어휘·구간
export const SPEAKER_DETAILS = optValues(SPEAKER_DETAIL_OPTS); // 폼 '형식': passive / active
export const DRIVER_CONFIGS = optValues(SPEAKER_DRIVER_OPTS);  // full_range / coaxial / 2way / 3way / 4way_plus (매물당 여러 개 — 예: coaxial + 2way)
export const ENCLOSURE_TYPES = optValues(SPEAKER_ENCLOSURE_OPTS); // 폼 인클로저 검색 드롭다운 12종 키
export const SPEAKER_IMPEDANCE = SPEAKER_IMPEDANCE_BUCKETS.map((b) => b.key); // 임피던스 구간: ohm_4_down / ohm_6 / ohm_8 / ohm_16_up (폼 숫자 칸 → mapRow 가 구간 키로)
export const WOOFER_SIZES = SPEAKER_WOOFER_BUCKETS.map((b) => b.key); // in_5_down / in_6_8 / in_10 / in_12 / in_15_up
// 턴테이블 전용 필터 옵션 = 폼 옵션의 저장값(영문 키)
export const DRIVE_TYPES = optValues(TT_DRIVE_OPTS);        // belt_drive / direct_drive / idler_drive
export const TONEARM_OPTS = optValues(TT_TONEARM_OPTS);     // included / not_included / replaced
export const CARTRIDGE_OPTS = optValues(TT_CARTRIDGE_OPTS); // included / not_included
export const SPEED_OPTS = optValues(TT_SPEED_OPTS);         // 33 / 45 / 78
export const AUTO_OPTS = optValues(TT_AUTO_OPTS);           // full_auto / semi_auto / manual
export const DUSTCOVER_OPTS = optValues(TT_DUSTCOVER_OPTS); // yes / no / damaged

// 필터 값(키) → 화면 글자. 사이드바, 필터 팝업, 활성 필터 칩이 같이 씀. 표에 없는 값(브랜드, 모델, 8Ω 같은 중립 글자, 카테고리 이름)은 그대로
//   케이블 필터(숨긴 카테고리, 저장 데이터 없음)는 아직 글자 그대로라 여기 없음
export function filterLabel(field: keyof Filters, v: string): string {
  switch (field) {
    case 'condition': return label('condition', v);
    case 'appearance': return label('appearance', v);
    case 'working': return label('working', v);
    case 'locationCountry': return label('locationCountry', v);
    case 'region': return label('location', v);
    case 'ownership': return label('ownership', v);
    case 'country': return label('country', v);
    case 'ampDetail': return optLabel(CHANNEL_OPTS, v);
    case 'ampMethod': return optLabel(AMP_DEVICE_OPTS, v);
    case 'phono': return optLabel(AMP_PHONO_OPTS, v);
    case 'toneControl':
    case 'remote': return optLabel(YES_NO_OPTS, v);
    case 'voltage': return optLabel(AMP_VOLTAGE_OPTS, v);
    case 'speakerDetail': return optLabel(SPEAKER_DETAIL_OPTS, v);
    case 'driverConfig': return optLabel(SPEAKER_DRIVER_OPTS, v);
    case 'enclosure': return optLabel(SPEAKER_ENCLOSURE_OPTS, v);
    case 'wooferSize': return SPEAKER_WOOFER_BUCKETS.find((b) => b.key === v)?.label ?? v;
    case 'speakerImpedance': return SPEAKER_IMPEDANCE_BUCKETS.find((b) => b.key === v)?.label ?? v;
    case 'driveType': return optLabel(TT_DRIVE_OPTS, v);
    case 'tonearm': return optLabel(TT_TONEARM_OPTS, v);
    case 'cartridge': return optLabel(TT_CARTRIDGE_OPTS, v);
    case 'speeds': return optLabel(TT_SPEED_OPTS, v);
    case 'autoMode': return optLabel(TT_AUTO_OPTS, v);
    case 'dustCover': return optLabel(TT_DUSTCOVER_OPTS, v);
    default: return v;
  }
}

// 소스기기 카테고리: 모달에서만 그룹별로 표시
export const SOURCE_GROUPS: { title: string; items: string[] }[] = [
  { title: '아날로그', items: ['턴테이블', '카세트 데크', '오픈릴 데크'] },
  { title: '디지털', items: ['CD 플레이어', 'CD 트랜스포트', 'SACD 플레이어', 'DAC', '네트워크 플레이어', '블루투스 리시버'] },
  { title: '튜너', items: ['FM 튜너', '튜너'] },
  { title: 'AV', items: ['LD 플레이어', 'DVD 플레이어', '블루레이 플레이어'] }
];

// 앰프 카테고리 그룹 (둘러보기 사이드바용). 항목은 트리 잎 이름 — 포노 스테이지 묶음은 잎(포노앰프·MC 2종)으로 풀어 같은 줄에 둠
//   숨김 표식 칸은 사이드바에서 빠지고, 보이는 항목이 0개인 묶음은 제목째 빠짐(browse-page sidebarCategoryGroups)
export const AMP_GROUPS: { title: string; items: string[] }[] = [
  { title: 'BY TYPE', items: ['프리앰프', '파워앰프', '인티앰프', '포노앰프', 'MC 스텝업 헤드앰프', 'MC 스텝업 트랜스', '헤드폰 앰프', '네트워크 앰프', '리시버', 'AV 리시버'] }
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
export const POWER_DEVICE_ITEMS = ACCESSORY_GROUPS[0].items;

// 턴테이블 카테고리: 모달에서만 그룹별로 표시
// 포노 케이블·포노앰프·MC 스텝업 등은 다른 최상위 카테고리(케이블/앰프)의 동일 항목과
// 같은 문자열을 공유 → 어느 페이지에서 선택하든 같은 매물이 필터링됨 (연동)
export const TT_ACCESSORY_GROUPS: { title: string; items: string[] }[] = [
  { title: 'BY TYPE', items: ['턴테이블'] },
  { title: '카트리지 + 액세서리', items: ['MM 카트리지', 'MC 카트리지', '헤드셸', '헤드셸 와이어', '오버행 게이지', '침압계', '카트리지 정렬 게이지'] },
  { title: '포노 스테이지', items: ['MM/MC 포노앰프', 'MC 스텝업 헤드앰프', 'MC 스텝업 트랜스'] },
  { title: '톤암 + 액세서리', items: ['톤암', '톤암 리프터'] },
  { title: '턴테이블 액세서리', items: ['포노 케이블', '턴테이블 벨트', '모터 풀리', '서브 플래터', '인슐레이터', '33/45 어댑터', '턴테이블 매트', '레코드 스테빌라이저', '레코드 클리너', '스타일러스 클리너', '턴테이블 플린스', '더스트 커버'] }
];

// 케이블 전용 필터 옵션
export const DIRECTIONALITY_OPTS = ['있음', '없음'];
export const CONDUCTOR_OPTS = [
  '일반 구리',
  'OFC',
  'OCC/PC-OCC',
  'UP-OCC',
  '은도금 구리',
  '순은',
  '하이브리드',
  '기타'
];
export const PLATING_OPTS = ['금도금', '로듐 도금', '은도금', '니켈 도금', '무도금'];
export const SHIELD_OPTS = ['실드', '무실드', '이중 실드'];
export const PAIR_OPTS = ['단선', '페어', '세트'];
// 차폐 필터가 의미 있는 케이블 종류 (RCA/XLR/디지털 동축/포노/파워)
export const SHIELD_RELEVANT = ['RCA 케이블', 'XLR 케이블', '디지털 동축 케이블', '포노 케이블', '파워 케이블'];

// 가격 글자 — 통화 기호 + 천 단위 쉼표 (₩4,200,000 / ¥420,000). 환산 표시는 아직 없음(베타 3)
// 출시 연도 글자 — '대략'이면 '약 1975년', 아니면 적힌 그대로
export const yearText = (l: { year: string; yearApprox?: boolean }): string =>
  FEATURE_FLAGS.yearApprox && l.yearApprox && l.year ? `약 ${l.year}${/년$/.test(l.year) ? '' : '년'}` : l.year;

// 카드 상태 배지 글자 (condition-badge.tsx 가 그림 — 홈 카드, 둘러보기 카드, 상세 머리 공용)
//   text = 새상품, 미개봉, NOS는 그 이름 / 중고는 외관 등급 라벨, 외관이 비어 있으면 '중고'
//   warn = 작동 상태가 점검 필요나 수리 필요면 그 라벨(배지 옆 작은 경고), 아니면 ''
export const WORKING_WARN_KEYS = ['needs_inspection', 'needs_repair'];
export function conditionBadge(l: Pick<Listing, 'condition' | 'appearance' | 'working'>): { text: string; warn: string } {
  const used = l.condition === 'used';
  return {
    text: used && l.appearance ? label('appearance', l.appearance) : label('condition', l.condition),
    warn: used && WORKING_WARN_KEYS.includes(l.working) ? label('working', l.working) : '',
  };
}

export function fmtPrice(v: number, currency: string = 'krw'): string {
  return (CURRENCY_SYMBOLS[currency] ?? '₩') + v.toLocaleString('ko-KR');
}

// "1963 - 1972년" 같은 문자열에서 시작 연도 추출
export function parseYear(s: string): number {
  const m = s.match(/\d{4}/);
  return m ? Number(m[0]) : 0;
}

// 항목별 개수 집계 (key가 배열이면 각 값마다 카운트)
export function countBy<T>(items: T[], key: (t: T) => string | string[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const item of items) {
    const k = key(item);
    const keys = Array.isArray(k) ? k : [k];
    for (const kk of keys) map[kk] = (map[kk] ?? 0) + 1;
  }
  return map;
}

export type Listing = {
  id: string;
  brand: string;
  model: string;
  title: string;             // 판매글 제목 (검색 대상)
  year: string;
  yearApprox: boolean;        // 출시 연도 '대략' (specs.yearApprox) — 표시는 yearText, 필터는 releaseYear 그대로
  releaseYear: number;
  category: string;          // 표시용 메인 카테고리 (브래드크럼, 카드 라벨 등)
  categories: string[];       // 필터링용 — 다중 카테고리 등록 시 두 곳 모두에 노출
  description: string;
  images: string[];           // Supabase Storage 공개 URL 목록 (대표=인덱스 0). 없으면 []
  price: number;
  currency: string;           // 통화 키 (krw / jpy) — 가격 표시 기호. 필터는 통화 구분 없이 숫자 비교
  condition: string;         // 상태 키 (new / unopened / nos / used, 화면은 label('condition'))
  appearance: string;        // 외관 등급 키 (mint 등, 없으면 '')
  appearanceDetail: string;  // 외관 자유 입력 (없으면 '')
  working: string;           // 작동 등급 키 (working 등, 없으면 '')
  workingDetail: string;     // 작동 자유 입력 (없으면 '')
  maintenance: string[];     // 정비 이력 (한글 라벨, 직접 입력 글은 그대로, 없으면 []) — specs.tech.maintenance
  location: string;          // 지역 키 (kr_seoul, jp_tokyo 등) — 필터 값과 같음. 화면 글자는 label('location'), 위치 줄은 locationText
  locationCountry: string;   // 위치 국가 키 (kr / jp) — 지역 키 접두에서 뽑음
  ownership: string;         // 소유권 키 (single_owner 등)
  country: string;           // 제조국 키 (us 등)
  handmade: boolean;                   // 자작품(DIY) 태그
  components: string[];                // 구성품 키 배열 (labels.ts components, 없으면 [])
  componentsOther: string;             // 기타 구성품 자유 글 (없으면 '')
  techSpecs: Record<string, string | string[]>; // 기술 사양 (specs.tech key→값; 다중 선택은 배열)
  customSpecs: { title: string; value: string }[]; // 자유 추가 사양 (specs.tech.customSpecs, 입력 순서). 필터는 안 읽음
  daysAgo: number;
  // 앰프 전용 속성 (앰프 카테고리에서만 사용)
  ampType: string;
  ampDetail: string;
  ampMethod: string;
  power: number | null; // 정격 출력 (W, 8Ω 기준). 미입력·해당없음 = null
  hpImpedance: { min: number | null; max: number | null } | null; // 헤드폰 앰프 권장 헤드폰 임피던스 범위(Ω). 빈 쪽 = 제한 없음, 둘 다 없으면 null
  impedances: string[]; // 지원 임피던스
  phono: string;
  toneControl: string;
  remote: string;
  voltage: string;
  // 스피커 전용 속성 (스피커 카테고리에서만 사용)
  speakerDetail: string;
  driverConfig: string[]; // 드라이버 구성 키 (여러 개 가능 — 예: ['coaxial', '2way'])
  enclosure: string;
  speakerImpedance: string;
  wooferSize: string; // 우퍼 크기 구간 키 (예: 'in_6_8'). 미입력 = ''
  sensitivity: number | null; // 감도 (dB). 미입력 = null
  recPower: number | null; // 권장 앰프 출력 (W). 미입력 = null
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
export const CROSS_LISTING: Record<string, string[]> = {
  // 앰프 카테고리의 '포노 스테이지'와 턴테이블 카테고리의 'MM/MC 포노앰프'는 동일 매물
  '포노 스테이지': ['MM/MC 포노앰프'],
  'MM/MC 포노앰프': ['포노 스테이지']
};
export function computeCategories(primary: string): string[] {
  const extras = CROSS_LISTING[primary] ?? [];
  return [primary, ...extras.filter((e) => e !== primary)];
}

// 통합 필터 상태
export type Filters = {
  brand: Set<string>;
  model: Set<string>; // 모델 — 사이드바 칸은 없고 홈 조건 검색에서 넘어올 때만 씀(활성 필터 칩으로 보임)
  condition: Set<string>;
  appearance: Set<string>; // 외관 상태 키 — 비운 매물은 어느 값에도 안 걸림
  working: Set<string>;    // 작동 상태 키 — 비운 매물은 '정상 작동'에도 안 걸림
  priceMin: number | null;
  priceMax: number | null;
  yearMin: number | null;
  yearMax: number | null;
  ownership: Set<string>;
  country: Set<string>;
  locationCountry: Set<string>; // 위치 국가 (kr / jp)
  region: Set<string>;
  ampType: Set<string>;
  ampDetail: Set<string>;
  ampMethod: Set<string>;
  powerMin: number | null;
  powerMax: number | null;
  // 헤드폰 앰프 전용: 내 헤드폰 임피던스 N (Ω) — 매물 권장 범위 하한 ≤ N ≤ 상한이면 통과
  headphoneImp: number | null;
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

export const emptyFilters = (): Filters => ({
  brand: new Set(),
  model: new Set(),
  condition: new Set(),
  appearance: new Set(),
  working: new Set(),
  priceMin: null,
  priceMax: null,
  yearMin: null,
  yearMax: null,
  ownership: new Set(),
  country: new Set(),
  locationCountry: new Set(),
  region: new Set(),
  ampType: new Set(),
  ampDetail: new Set(),
  ampMethod: new Set(),
  powerMin: null,
  powerMax: null,
  headphoneImp: null,
  impedance: new Set(),
  phono: new Set(),
  toneControl: new Set(),
  remote: new Set(),
  voltage: new Set(),
  speakerDetail: new Set(),
  driverConfig: new Set(),
  enclosure: new Set(),
  speakerImpedance: new Set(),
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

export function cloneFilters(f: Filters): Filters {
  return {
    brand: new Set(f.brand),
    model: new Set(f.model),
    condition: new Set(f.condition),
    appearance: new Set(f.appearance),
    working: new Set(f.working),
    priceMin: f.priceMin,
    priceMax: f.priceMax,
    yearMin: f.yearMin,
    yearMax: f.yearMax,
    ownership: new Set(f.ownership),
    country: new Set(f.country),
    locationCountry: new Set(f.locationCountry),
    region: new Set(f.region),
    ampType: new Set(f.ampType),
    ampDetail: new Set(f.ampDetail),
    ampMethod: new Set(f.ampMethod),
    powerMin: f.powerMin,
    powerMax: f.powerMax,
    headphoneImp: f.headphoneImp,
    impedance: new Set(f.impedance),
    phono: new Set(f.phono),
    toneControl: new Set(f.toneControl),
    remote: new Set(f.remote),
    voltage: new Set(f.voltage),
    speakerDetail: new Set(f.speakerDetail),
    driverConfig: new Set(f.driverConfig),
    enclosure: new Set(f.enclosure),
    speakerImpedance: new Set(f.speakerImpedance),
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

export function countFilters(f: Filters): number {
  const setKeys: (keyof Filters)[] = [
    'brand', 'model', 'condition', 'appearance', 'working', 'ownership', 'country', 'locationCountry', 'region',
    'ampType', 'ampDetail', 'ampMethod', 'impedance', 'phono', 'toneControl', 'remote', 'voltage',
    'speakerDetail', 'driverConfig', 'enclosure', 'speakerImpedance', 'wooferSize',
    'driveType', 'tonearm', 'cartridge', 'speeds', 'autoMode', 'dustCover',
    'terminalIn', 'terminalOut', 'directional', 'conductor', 'plating', 'shield', 'pair'
  ];
  let n = 0;
  for (const k of setKeys) n += (f[k] as Set<string>).size;
  if (f.priceMin != null || f.priceMax != null) n += 1;
  if (f.yearMin != null || f.yearMax != null) n += 1;
  if (f.powerMin != null || f.powerMax != null) n += 1;
  if (f.headphoneImp != null) n += 1;
  if (f.sensitivityMin != null || f.sensitivityMax != null) n += 1;
  if (f.recPowerMin != null || f.recPowerMax != null) n += 1;
  if (f.ratedCapacityMin != null || f.ratedCapacityMax != null) n += 1;
  if (f.cableLengthMin != null || f.cableLengthMax != null) n += 1;
  return n;
}

// 숫자 범위 필터 공통 규칙 — "미입력 = null" 은 범위가 걸렸을 때 제외, 범위가 없으면 통과.
//   0 은 실제 값(예: 0W)이 아니라 미입력이었기 때문에 null 로 구분. 감도·권장 출력 등 다른 숫자 필드도 같은 규칙으로 이 헬퍼 사용.
export function inRange(v: number | null | undefined, min: number | null, max: number | null): boolean {
  if (min == null && max == null) return true;
  if (v == null) return false;
  if (min != null && v < min) return false;
  if (max != null && v > max) return false;
  return true;
}

// 매물 목록에 필터 적용 (정렬 제외)
export function applyFilters(list: Listing[], f: Filters, isAmp: boolean, isSpeaker: boolean, isTurntable: boolean, isPowerDevice: boolean, isCable: boolean): Listing[] {
  let r = list;
  if (f.brand.size > 0) r = r.filter((l) => f.brand.has(l.brand));
  if (f.model.size > 0) r = r.filter((l) => f.model.has(l.model));
  if (f.condition.size > 0) r = r.filter((l) => f.condition.has(l.condition));
  // 외관, 작동 — 값을 비운 매물('')은 어떤 선택에도 안 걸림 (null 규칙: 작동을 안 고른 매물은 '정상 작동'에도 안 나옴)
  if (f.appearance.size > 0) r = r.filter((l) => f.appearance.has(l.appearance));
  if (f.working.size > 0) r = r.filter((l) => f.working.has(l.working));
  // ⚠️ 가격 필터는 통화를 가리지 않고 숫자만 비교함(베타 1은 전부 원화). 엔화 매물이 섞이면 같은 숫자라도 값어치가 달라 환산이 필요(베타 3)
  if (f.priceMin != null) r = r.filter((l) => l.price >= f.priceMin! * 10000);
  if (f.priceMax != null) r = r.filter((l) => l.price <= f.priceMax! * 10000);
  if (f.yearMin != null) r = r.filter((l) => l.releaseYear >= f.yearMin!);
  if (f.yearMax != null) r = r.filter((l) => l.releaseYear <= f.yearMax!);
  if (FEATURE_FLAGS.ownership && f.ownership.size > 0) r = r.filter((l) => f.ownership.has(l.ownership)); // 플래그 꺼짐: 소유권 필터 없음
  if (f.country.size > 0) r = r.filter((l) => f.country.has(l.country));
  if (f.locationCountry.size > 0) r = r.filter((l) => f.locationCountry.has(l.locationCountry));
  if (f.region.size > 0) r = r.filter((l) => f.region.has(l.location));
  if (isAmp) {
    if (f.ampType.size > 0) r = r.filter((l) => f.ampType.has(l.ampType));
    if (f.ampDetail.size > 0) r = r.filter((l) => f.ampDetail.has(l.ampDetail));
    if (f.ampMethod.size > 0) r = r.filter((l) => f.ampMethod.has(l.ampMethod));
    if (f.powerMin != null || f.powerMax != null) r = r.filter((l) => inRange(l.power, f.powerMin, f.powerMax)); // 미입력(null) 제외
    // 내 헤드폰 임피던스 N: 매물 범위가 N을 포함하면 통과 (빈 쪽 = 제한 없음, 범위 미입력 매물은 제외 — inRange 의 값·경계 역할만 바뀜)
    if (f.headphoneImp != null) r = r.filter((l) => l.hpImpedance != null && inRange(f.headphoneImp, l.hpImpedance.min, l.hpImpedance.max));
    if (f.impedance.size > 0) r = r.filter((l) => l.impedances.some((i) => f.impedance.has(i)));
    if (f.phono.size > 0) r = r.filter((l) => f.phono.has(l.phono));
    if (FEATURE_FLAGS.toneControlFilter && f.toneControl.size > 0) r = r.filter((l) => f.toneControl.has(l.toneControl)); // 플래그 꺼짐: 톤 컨트롤 필터 없음
    if (FEATURE_FLAGS.remoteFilter && f.remote.size > 0) r = r.filter((l) => f.remote.has(l.remote)); // 플래그 꺼짐: 리모컨 필터 없음
    if (f.voltage.size > 0) r = r.filter((l) => f.voltage.has(l.voltage));
  }
  if (isSpeaker) {
    if (f.speakerDetail.size > 0) r = r.filter((l) => f.speakerDetail.has(l.speakerDetail));
    if (f.driverConfig.size > 0) r = r.filter((l) => l.driverConfig.some((d) => f.driverConfig.has(d))); // 하나라도 맞으면 (지원 임피던스와 같음)
    if (f.enclosure.size > 0) r = r.filter((l) => f.enclosure.has(l.enclosure));
    if (f.speakerImpedance.size > 0) r = r.filter((l) => f.speakerImpedance.has(l.speakerImpedance));
    if (f.wooferSize.size > 0) r = r.filter((l) => f.wooferSize.has(l.wooferSize));
    if (f.sensitivityMin != null || f.sensitivityMax != null) r = r.filter((l) => inRange(l.sensitivity, f.sensitivityMin, f.sensitivityMax)); // 미입력(null — 액티브 등) 제외
    if (f.recPowerMin != null || f.recPowerMax != null) r = r.filter((l) => inRange(l.recPower, f.recPowerMin, f.recPowerMax));
  }
  if (isTurntable) {
    if (f.driveType.size > 0) r = r.filter((l) => f.driveType.has(l.driveType));
    if (f.tonearm.size > 0) r = r.filter((l) => f.tonearm.has(l.tonearm));
    if (f.cartridge.size > 0) r = r.filter((l) => f.cartridge.has(l.cartridge));
    if (f.speeds.size > 0) r = r.filter((l) => l.speeds.some((s) => f.speeds.has(s)));
    if (f.autoMode.size > 0) r = r.filter((l) => f.autoMode.has(l.autoMode));
    if (FEATURE_FLAGS.dustCoverFilter && f.dustCover.size > 0) r = r.filter((l) => f.dustCover.has(l.dustCover)); // 플래그 꺼짐: 더스트 커버 필터 없음
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

export type Counts = Record<string, Record<string, number>>;
