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

// 필터에 노출할 브랜드
export const BRANDS = [
  'McIntosh', 'Marantz', 'Accuphase', 'Luxman', 'Yamaha',
  'Sansui', 'Pioneer', 'Denon', 'NAD', 'Cambridge Audio'
] as const;
export const CONDITIONS = ['새상품', 'NOS', '중고 - 민트', '중고 - 매우 좋음', '중고 - 좋음', '중고 - 보통', '중고 - 점검 필요', '중고 - 작동 불가'];
// 사이드바용 표시 옵션 — '중고 - 전체'는 UI 단축키 (선택 시 모든 중고-* 매물 매칭)
export const USED_ALL = '중고 - 전체';
export const CONDITION_DISPLAY = ['새상품', 'NOS', USED_ALL, '중고 - 민트', '중고 - 매우 좋음', '중고 - 좋음', '중고 - 보통', '중고 - 점검 필요', '중고 - 작동 불가'];
export const LOCATIONS = ['서울', '경기', '부산', '대구', '인천', '광주', '대전', '울산', '강원', '제주'];
export const OWNERSHIP_OPTS = ['1인 소유', '다중 소유'];
export const COUNTRY_OPTS = ['미국', '일본', '영국', '독일', '프랑스', '덴마크', '캐나다', '중국'];
export const SORT_OPTIONS = ['추천순', '최신순', '가격 낮은순', '가격 높은순'];

// 앰프 전용 필터 옵션
export const AMP_TYPES = ['프리앰프', '파워앰프', '인티앰프', '포노 스테이지', '리시버', 'AV 리시버', '헤드폰 앰프'];
export const AMP_DETAILS = ['모노블록', '스테레오', '멀티채널'];
export const AMP_METHODS = ['트랜지스터', '진공관', '하이브리드'];
export const IMPEDANCE_OPTS = ['2Ω', '4Ω', '8Ω', '16Ω'];
export const PHONO_OPTS = ['없음', 'MM', 'MC', 'MM/MC'];
export const TONE_OPTS = ['있음', '없음'];
export const REMOTE_OPTS = ['있음', '없음'];
export const VOLTAGE_OPTS = ['100V', '120V', '220V', '프리볼트'];

// 스피커 전용 필터 옵션
export const SPEAKER_DETAILS = ['패시브', '액티브'];
export const DRIVER_CONFIGS = ['풀레인지', '동축', '2-way', '3-way', '4-way 이상'];
export const ENCLOSURE_TYPES = ['밀폐형', '베이스 리플렉스', '혼 로딩', '패시브 라디에이터'];
export const SPEAKER_IMPEDANCE = ['4Ω', '6Ω', '8Ω', '16Ω'];
export const CONNECTION_TYPES = ['유선', '블루투스', '네트워크'];
export const WOOFER_SIZES = ['4인치 이하', '5인치', '6.5인치', '7~8인치', '10인치', '12인치', '15인치 이상'];
// 턴테이블 전용 필터 옵션
export const DRIVE_TYPES = ['벨트 드라이브', '다이렉트 드라이브', '아이들러 드라이브'];
export const TONEARM_OPTS = ['포함', '미포함', '교체됨'];
export const CARTRIDGE_OPTS = ['포함', '미포함'];
export const SPEED_OPTS = ['33⅓ RPM', '45 RPM', '78 RPM'];
export const AUTO_OPTS = ['풀 오토', '세미 오토', '매뉴얼'];
export const DUSTCOVER_OPTS = ['있음', '없음', '손상 있음'];

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
export const POWER_DEVICE_ITEMS = ACCESSORY_GROUPS[0].items;

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
export const DIRECTIONALITY_OPTS = ['있음', '없음'];
export const CONDUCTOR_OPTS = [
  '일반 구리',
  'OFC',
  'OCC / PC-OCC',
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

export function fmtPrice(v: number): string {
  return '₩' + v.toLocaleString('ko-KR');
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

export const emptyFilters = (): Filters => ({
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

export function cloneFilters(f: Filters): Filters {
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

export function countFilters(f: Filters): number {
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
export function applyFilters(list: Listing[], f: Filters, isAmp: boolean, isSpeaker: boolean, isTurntable: boolean, isPowerDevice: boolean, isCable: boolean): Listing[] {
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

export type Counts = Record<string, Record<string, number>>;
