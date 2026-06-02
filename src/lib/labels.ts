// ============================================================================
// labels.ts — 선택지 필드의 "영문 키 → 언어별 표시 라벨" 변환표
// ----------------------------------------------------------------------------
// DB에는 영문 키만 저장하고, 화면에선 이 표로 언어별 라벨을 보여줍니다.
// 지금은 ko(한국어)만 채워져 있고, 나중에 en/ja만 추가하면 그대로 다국어가 됩니다.
//   예) label('condition','used_excellent','en') 에 영어를 넣으면 영어가 나옴
// ※ 카테고리(앰프/파워앰프 등)는 여기 말고 category-slugs.ts의 categoryFromSlug 사용.
// ============================================================================
export type Locale = 'ko' | 'en' | 'ja';
type LabelMap = Record<string, Partial<Record<Locale, string>>>;

// ── 최상위 컬럼용 ──
export const LABELS: Record<string, LabelMap> = {
  status: {
    active: { ko: '판매중' },
    reserved: { ko: '예약중' },
    sold: { ko: '판매완료' },
    draft: { ko: '임시저장' },
  },
  condition: {
    new: { ko: '새상품' },
    unopened: { ko: '미개봉' },
    nos: { ko: 'NOS' },
    used_mint: { ko: '민트급' },
    used_excellent: { ko: '매우 좋음' },
    used_good: { ko: '좋음' },
    used_fair: { ko: '보통' },
    used_needs_service: { ko: '점검 필요' },
    used_not_working: { ko: '작동 불가' },
  },
  location: {
    seoul: { ko: '서울' }, gyeonggi: { ko: '경기' }, busan: { ko: '부산' }, daegu: { ko: '대구' },
    incheon: { ko: '인천' }, gwangju: { ko: '광주' }, daejeon: { ko: '대전' }, ulsan: { ko: '울산' },
    gangwon: { ko: '강원' }, jeju: { ko: '제주' },
  },
  country: {
    us: { ko: '미국' }, jp: { ko: '일본' }, uk: { ko: '영국' }, de: { ko: '독일' },
    fr: { ko: '프랑스' }, dk: { ko: '덴마크' }, ca: { ko: '캐나다' }, cn: { ko: '중국' },
    kr: { ko: '한국' }, tw: { ko: '대만' }, it: { ko: '이탈리아' },
  },
  ownership: {
    single_owner: { ko: '1인 소유' },
    multiple_owners: { ko: '다중 소유' },
    unknown: { ko: '알 수 없음' },
  },
  shipping_type: {
    free: { ko: '무료배송' },
    flat: { ko: '고정 배송비' },
    calculated: { ko: '배송비 별도' },
  },
};

// ── specs(jsonb) 안의 선택지용 (key=코드 필드명) ──
export const SPEC_LABELS: Record<string, LabelMap> = {
  ampDetail: { monoblock: { ko: '모노블록' }, stereo: { ko: '스테레오' }, multichannel: { ko: '멀티채널' } },
  ampMethod: { solid_state: { ko: '트랜지스터' }, tube: { ko: '진공관' }, hybrid: { ko: '하이브리드' } },
  phono: { none: { ko: '없음' }, mm: { ko: 'MM' }, mc: { ko: 'MC' }, mm_mc: { ko: 'MM/MC' } },
  voltage: { '100v': { ko: '100V' }, '120v': { ko: '120V' }, '220v': { ko: '220V' }, free_voltage: { ko: '프리볼트' } },
  // 임피던스: 앰프 지원 임피던스 + 스피커 임피던스 공용
  impedance: { '2ohm': { ko: '2Ω' }, '4ohm': { ko: '4Ω' }, '6ohm': { ko: '6Ω' }, '8ohm': { ko: '8Ω' }, '16ohm': { ko: '16Ω' } },
  // 있음/없음 공용 (toneControl, remote, directional)
  yes_no: { yes: { ko: '있음' }, no: { ko: '없음' } },
  speakerDetail: { passive: { ko: '패시브' }, active: { ko: '액티브' } },
  driverConfig: { full_range: { ko: '풀레인지' }, coaxial: { ko: '동축' }, '2way': { ko: '2-way' }, '3way': { ko: '3-way' }, '4way_plus': { ko: '4-way 이상' } },
  enclosure: { sealed: { ko: '밀폐형' }, bass_reflex: { ko: '베이스 리플렉스' }, horn_loaded: { ko: '혼 로딩' }, passive_radiator: { ko: '패시브 라디에이터' }, open_baffle: { ko: '오픈 배플' }, transmission_line: { ko: '트랜스미션 라인' }, acoustic_labyrinth: { ko: '어쿠스틱 래버린스' }, tqwt: { ko: 'TQWT/쿼터웨이브' }, back_loaded_horn: { ko: '백로드 혼' }, bandpass: { ko: '밴드패스' }, aperiodic: { ko: '어페리오딕' }, isobaric: { ko: '아이소배릭' } },
  connection: { wired: { ko: '유선' }, bluetooth: { ko: '블루투스' }, network: { ko: '네트워크' } },
  wooferSize: { under_4in: { ko: '4인치 이하' }, '5in': { ko: '5인치' }, '6_5in': { ko: '6.5인치' }, '7_8in': { ko: '7~8인치' }, '10in': { ko: '10인치' }, '12in': { ko: '12인치' }, '15in_plus': { ko: '15인치 이상' } },
  driveType: { belt_drive: { ko: '벨트 드라이브' }, direct_drive: { ko: '다이렉트 드라이브' }, idler_drive: { ko: '아이들러 드라이브' } },
  tonearm: { included: { ko: '포함' }, not_included: { ko: '미포함' }, replaced: { ko: '교체됨' } },
  cartridge: { included: { ko: '포함' }, not_included: { ko: '미포함' } },
  autoMode: { full_auto: { ko: '풀 오토' }, semi_auto: { ko: '세미 오토' }, manual: { ko: '매뉴얼' } },
  dustCover: { yes: { ko: '있음' }, no: { ko: '없음' }, damaged: { ko: '손상 있음' } },
  conductor: { copper: { ko: '일반 구리' }, ofc: { ko: 'OFC' }, occ: { ko: 'OCC / PC-OCC' }, up_occ: { ko: 'UP-OCC' }, silver_plated_copper: { ko: '은도금 구리' }, pure_silver: { ko: '순은' }, hybrid: { ko: '하이브리드' }, other: { ko: '기타' } },
  plating: { gold: { ko: '금도금' }, rhodium: { ko: '로듐 도금' }, silver: { ko: '은도금' }, nickel: { ko: '니켈 도금' }, none: { ko: '무도금' } },
  shield: { shielded: { ko: '실드' }, unshielded: { ko: '무실드' }, double_shielded: { ko: '이중 실드' } },
  pair: { single: { ko: '단선' }, pair: { ko: '페어' }, set: { ko: '세트' } },
  speeds: { '33': { ko: '33⅓ RPM' }, '45': { ko: '45 RPM' }, '78': { ko: '78 RPM' } },
  // 외관 상태 등급 (참고용, condition과 별개)
  appearance: { mint: { ko: '민트급' }, excellent: { ko: '매우 좋음' }, good: { ko: '좋음' }, fair: { ko: '보통' } },
  // 작동 상태 등급 (참고용, condition과 별개)
  working: { working: { ko: '정상 작동' }, needs_inspection: { ko: '점검 필요' }, needs_repair: { ko: '수리 필요' } },
};

// 키 → 라벨 (기본 ko, 표에 없으면 키를 그대로 폴백). 빈 키는 빈 문자열.
export function label(field: string, key: string | null | undefined, locale: Locale = 'ko'): string {
  if (!key) return '';
  const m = LABELS[field] ?? SPEC_LABELS[field];
  return m?.[key]?.[locale] ?? m?.[key]?.ko ?? key;
}

// 역방향: 한국어 라벨 → 영문 키 (폼 입력값을 DB에 저장할 때 사용). 못 찾으면 undefined.
export function keyFor(field: string, koLabel: string | null | undefined): string | undefined {
  if (!koLabel) return undefined;
  const m = LABELS[field] ?? SPEC_LABELS[field];
  if (!m) return undefined;
  for (const [key, val] of Object.entries(m)) {
    if (val.ko === koLabel) return key;
  }
  return undefined;
}
