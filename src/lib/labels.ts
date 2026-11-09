// ============================================================================
// labels.ts — 선택지 필드의 "영문 키 → 언어별 표시 라벨" 변환표
// ----------------------------------------------------------------------------
// DB에는 영문 키만 저장하고, 화면에선 이 표로 언어별 라벨을 보여줍니다.
// 지금은 ko(한국어)만 채워져 있고, 나중에 en/ja만 추가하면 그대로 다국어가 됩니다.
//   예) label('condition','used_excellent','en') 에 영어를 넣으면 영어가 나옴
// ※ 카테고리(앰프/파워앰프 등)는 여기 말고 category-slugs.ts의 categoryFromSlug 사용.
// ============================================================================
import { FEATURE_FLAGS } from '@/app/data/feature-flags'; // 숨김 플래그 (docs/hidden.md)
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
  // 상태 = 종류만 (2026-11-10 상태 등급 재구성). 중고의 등급은 외관 상태(SPEC_LABELS.appearance)와 작동 상태(SPEC_LABELS.working)가 맡음
  //   옛 중고 등급 키(used_mint, used_excellent, used_good, used_fair, used_needs_service, used_not_working)는 선택지에서 뺌. 옛 행은 conditionKind 가 'used'로 읽음
  condition: {
    new: { ko: '새상품' },
    unopened: { ko: '미개봉' },
    nos: { ko: 'NOS' },
    used: { ko: '중고' },
  },
  // 매물 위치의 국가 (지역 키 접두와 같음). 제조국(country)과 다른 칸
  locationCountry: { kr: { ko: '한국' }, jp: { ko: '일본' } },
  locationCountryFull: { kr: { ko: '대한민국' }, jp: { ko: '일본' } }, // 상세 페이지 판매자 위치 줄 ('대한민국 서울')
  // 지역 = 국가 접두 + 시/도 (한국 17개 시/도, 일본 47개 도도부현). 이 순서가 폼 선택지, 둘러보기 지역 필터 순서. DB location 컬럼에 이 키 저장
  location: {
    kr_seoul: { ko: '서울' }, kr_busan: { ko: '부산' }, kr_daegu: { ko: '대구' }, kr_incheon: { ko: '인천' }, kr_gwangju: { ko: '광주' }, kr_daejeon: { ko: '대전' },
    kr_ulsan: { ko: '울산' }, kr_sejong: { ko: '세종' }, kr_gyeonggi: { ko: '경기' }, kr_gangwon: { ko: '강원' }, kr_chungbuk: { ko: '충북' }, kr_chungnam: { ko: '충남' },
    kr_jeonbuk: { ko: '전북' }, kr_jeonnam: { ko: '전남' }, kr_gyeongbuk: { ko: '경북' }, kr_gyeongnam: { ko: '경남' }, kr_jeju: { ko: '제주' },
    jp_hokkaido: { ko: '홋카이도' }, jp_aomori: { ko: '아오모리현' }, jp_iwate: { ko: '이와테현' }, jp_miyagi: { ko: '미야기현' }, jp_akita: { ko: '아키타현' },
    jp_yamagata: { ko: '야마가타현' }, jp_fukushima: { ko: '후쿠시마현' }, jp_ibaraki: { ko: '이바라키현' }, jp_tochigi: { ko: '도치기현' }, jp_gunma: { ko: '군마현' },
    jp_saitama: { ko: '사이타마현' }, jp_chiba: { ko: '지바현' }, jp_tokyo: { ko: '도쿄도' }, jp_kanagawa: { ko: '가나가와현' }, jp_niigata: { ko: '니가타현' },
    jp_toyama: { ko: '도야마현' }, jp_ishikawa: { ko: '이시카와현' }, jp_fukui: { ko: '후쿠이현' }, jp_yamanashi: { ko: '야마나시현' }, jp_nagano: { ko: '나가노현' },
    jp_gifu: { ko: '기후현' }, jp_shizuoka: { ko: '시즈오카현' }, jp_aichi: { ko: '아이치현' }, jp_mie: { ko: '미에현' }, jp_shiga: { ko: '시가현' },
    jp_kyoto: { ko: '교토부' }, jp_osaka: { ko: '오사카부' }, jp_hyogo: { ko: '효고현' }, jp_nara: { ko: '나라현' }, jp_wakayama: { ko: '와카야마현' },
    jp_tottori: { ko: '돗토리현' }, jp_shimane: { ko: '시마네현' }, jp_okayama: { ko: '오카야마현' }, jp_hiroshima: { ko: '히로시마현' }, jp_yamaguchi: { ko: '야마구치현' },
    jp_tokushima: { ko: '도쿠시마현' }, jp_kagawa: { ko: '가가와현' }, jp_ehime: { ko: '에히메현' }, jp_kochi: { ko: '고치현' }, jp_fukuoka: { ko: '후쿠오카현' },
    jp_saga: { ko: '사가현' }, jp_nagasaki: { ko: '나가사키현' }, jp_kumamoto: { ko: '구마모토현' }, jp_oita: { ko: '오이타현' }, jp_miyazaki: { ko: '미야자키현' },
    jp_kagoshima: { ko: '가고시마현' }, jp_okinawa: { ko: '오키나와현' },
  },
  country: {
    us: { ko: '미국' }, jp: { ko: '일본' }, uk: { ko: '영국' }, de: { ko: '독일' },
    fr: { ko: '프랑스' }, dk: { ko: '덴마크' }, ca: { ko: '캐나다' }, cn: { ko: '중국' },
    kr: { ko: '한국' }, tw: { ko: '대만' }, it: { ko: '이탈리아' },
  },
  ownership: {
    single_owner: { ko: '1인 소유' },
    multiple_owners: { ko: '2인 이상 소유' },
    unknown: { ko: '알 수 없음' },
  },
  // 통화 (DB listings.currency, 기본 krw). 기호는 아래 CURRENCY_SYMBOLS
  currency: { krw: { ko: '원' }, jpy: { ko: '엔' } },
  shipping_type: {
    free: { ko: '무료배송' },
    flat: { ko: '고정 배송비' },
    calculated: { ko: '배송비 별도' },
  },
};

// 통화 선택지와 기호 — 가격 표시는 browse-filters fmtPrice(값, 통화)
export const CURRENCY_OPTS = Object.entries(LABELS.currency).map(([value, m]) => ({ value, label: m.ko ?? value })); // krw / jpy
export const CURRENCY_SYMBOLS: Record<string, string> = { krw: '₩', jpy: '¥' };

// 지역 선택지 (단일 출처) — 업로드 폼 배송 섹션 '국가', '지역' 칸과 둘러보기, 홈 필터가 같이 씀
export const LOCATION_COUNTRY_OPTS = Object.entries(LABELS.locationCountry).map(([value, m]) => ({ value, label: m.ko ?? value })); // kr / jp
export const LOCATION_OPTS = Object.entries(LABELS.location).map(([value, m]) => ({ value, label: m.ko ?? value })); // 전 국가 지역 (한국 먼저)
// 지역 키 → 국가 키 (kr_seoul → kr). 접두가 없는 옛 키는 ''
export const locationCountryOf = (key: string | null | undefined): string => { const m = /^([a-z]{2})_/.exec(key ?? ''); return m ? m[1] : ''; };
// 한 국가의 지역 선택지
export const locationOptsFor = (country: string) => LOCATION_OPTS.filter((o) => locationCountryOf(o.value) === country);
// 지역 키 → 위치 글자 ('대한민국 서울', '일본 도쿄도'). 접두 없는 옛 키는 지역 이름만
export const locationText = (key: string | null | undefined): string => (key ? `${label('locationCountryFull', locationCountryOf(key))} ${label('location', key)}`.trim() : '');

// 상태 선택지 키 (폼, 둘러보기 필터, 홈 검색이 같이 씀): new / unopened / nos / used
export const CONDITION_KEYS = Object.keys(LABELS.condition);
// 새 제품 상태 키 — 이 상태면 업로드 폼이 중고 칸(외관 상태, 작동 상태)을 숨기고 저장하지 않음 (시드도 같은 규칙). 나머지 하나 'used'(중고)만 외관, 작동을 고름
export const NEW_CONDITION_KEYS = ['new', 'unopened', 'nos'];
// 옛 중고 등급 키(used_* — 2026-11-10 전 저장분) → 'used'. 그 밖의 키는 그대로. DB 옛 행(mapRow)과 폼 임시 저장 복원이 씀
export const conditionKind = (key: string | null | undefined): string => (key && key.startsWith('used_') ? 'used' : key ?? '');

// ── specs(jsonb) 안의 선택지용 (key=코드 필드명) ──
export const SPEC_LABELS: Record<string, LabelMap> = {
  // ── 기술 사양 선택지 (저장=영문 키, 표시=한글. category-specs.ts 의 옵션이 이 표를 씀) ──
  //    섞인 목록(포노 입력, 전원 전압, ARC 등)은 한글 값만 이 표에 있고 MM, 220V, ARC 같은 중립 값은 그 글자 그대로 저장
  // 앰프
  channel: { mono_block: { ko: '모노블록' }, mono: { ko: '모노' }, stereo: { ko: '스테레오' }, multi_channel: { ko: '멀티채널' } }, // 파워 등은 mono_block, 프리앰프는 mono
  device: { tube: { ko: '진공관' }, solid_state: { ko: '솔리드 스테이트(TR)' }, hybrid: { ko: '하이브리드' } },
  phono: { none: { ko: '없음' } }, // + MM, MC, MM/MC
  voltage: { free_volt: { ko: '프리볼트' } }, // + 100V, 120V, 220V
  mcBoostMode: { active_head_amp: { ko: '능동 헤드앰프' }, built_in_sut: { ko: '내장 SUT' }, current_input: { ko: '전류입력' } },
  sutCore: { permalloy: { ko: '퍼멀로이' }, mu_metal: { ko: '뮤메탈' }, amorphous_cobalt: { ko: '아몰퍼스 코발트' }, silicon_steel: { ko: '실리콘강' } },
  terminal: { speaker_terminal: { ko: '스피커 터미널' }, line_out_70v_100v: { ko: '70V/100V 라인 출력' }, dual_3pin_xlr: { ko: '듀얼 3-pin XLR' } }, // 단자 목록 중 한글 이름만
  arcSupport: { not_supported: { ko: '미지원' } }, // + ARC, eARC (AV 리시버, 사운드바 공용)
  roomCal: { none: { ko: '없음' }, auto_mic: { ko: '자동(내장 마이크)' }, app_measure: { ko: '앱 측정(스마트폰)' } }, // AV 리시버는 none + 브랜드 이름, 사운드바는 셋 다
  hpForm: { desktop: { ko: '데스크톱' }, portable_battery: { ko: '포터블(배터리)' }, usb_dongle: { ko: 'USB 동글' } },
  // 스피커
  ampConfig: { single_amp: { ko: '싱글앰프' }, bi_amp: { ko: '바이앰프' }, tri_amp: { ko: '트라이앰프' }, multi_amp: { ko: '멀티앰프' } },
  crossoverType: { passive: { ko: '패시브 크로스오버' }, active: { ko: '액티브 크로스오버' }, dsp: { ko: 'DSP 크로스오버' } },
  firingDirection: { front: { ko: '전면 방사' }, down: { ko: '하향 방사' }, side: { ko: '측면 방사' } },
  phaseControl: { switch_0_180: { ko: '0°/180° 전환' }, variable_0_180: { ko: '0°~180° 연속 조절' }, variable_0_360: { ko: '0°~360° 연속 조절' } },
  surroundType: { virtual: { ko: '없음(가상)' }, wired: { ko: '유선 포함' }, wireless: { ko: '무선 포함' } },
  subIncluded: { none: { ko: '미포함' }, wireless: { ko: '무선 서브우퍼' }, wired: { ko: '유선 서브우퍼' } },
  // 소스기기
  cartType: { ceramic: { ko: '세라믹' } }, // + MM, MC
  extraFeatures: { fm_am_radio: { ko: 'FM/AM 라디오' }, cassette: { ko: '카세트' }, usb_playback: { ko: 'USB 재생' }, recording: { ko: '녹음' } }, // + CD
  // 우퍼 크기 필터 구간 (드라이버 빌더 파생 키 wooferMaxInch 를 묶은 값, 저장값 아님)
  speakerImpedanceRange: { ohm_4_down: { ko: '4Ω 이하' }, ohm_6: { ko: '6Ω' }, ohm_8: { ko: '8Ω' }, ohm_16_up: { ko: '16Ω 이상' } }, // 스피커 임피던스 필터 구간 (category-specs SPEAKER_IMPEDANCE_BUCKETS)
  wooferSize: { in_5_down: { ko: '5인치 이하' }, in_6_8: { ko: '6~8인치' }, in_10: { ko: '10인치' }, in_12: { ko: '12인치' }, in_15_up: { ko: '15인치 이상' } },
  headMaterial: { permalloy: { ko: '퍼멀로이' }, sendust: { ko: '센더스트' }, ferrite: { ko: '페라이트' }, amorphous: { ko: '아몰퍼스' }, crystalloy: { ko: '크리스탈로이' } },
  // 임피던스: 앰프 지원 임피던스 + 스피커 임피던스 공용
  impedance: { '2ohm': { ko: '2Ω' }, '4ohm': { ko: '4Ω' }, '6ohm': { ko: '6Ω' }, '8ohm': { ko: '8Ω' }, '16ohm': { ko: '16Ω' } },
  // 있음/없음 공용 (톤 컨트롤, 리모컨 등 기술 사양 16칸 + 케이블 directional)
  yes_no: { yes: { ko: '있음' }, no: { ko: '없음' } },
  speakerDetail: { passive: { ko: '패시브' }, active: { ko: '액티브' } },
  driverConfig: { full_range: { ko: '풀레인지' }, coaxial: { ko: '동축' }, '2way': { ko: '2-way' }, '3way': { ko: '3-way' }, '4way_plus': { ko: '4-way 이상' } },
  enclosure: { sealed: { ko: '밀폐형' }, bass_reflex: { ko: '베이스 리플렉스' }, horn_loaded: { ko: '혼 로딩' }, passive_radiator: { ko: '패시브 라디에이터' }, open_baffle: { ko: '오픈 배플' }, transmission_line: { ko: '트랜스미션 라인' }, acoustic_labyrinth: { ko: '어쿠스틱 래버린스' }, tqwt: { ko: 'TQWT/쿼터웨이브' }, back_loaded_horn: { ko: '백로드 혼' }, bandpass: { ko: '밴드패스' }, aperiodic: { ko: '어페리오딕' }, isobaric: { ko: '아이소배릭' } },
  driveType: { belt_drive: { ko: '벨트 드라이브' }, direct_drive: { ko: '다이렉트 드라이브' }, idler_drive: { ko: '아이들러 드라이브' } },
  tonearm: { included: { ko: '포함' }, not_included: { ko: '미포함' }, replaced: { ko: '교체됨' } },
  cartridge: { included: { ko: '포함' }, not_included: { ko: '미포함' } },
  autoMode: { full_auto: { ko: '풀 오토' }, semi_auto: { ko: '세미 오토' }, manual: { ko: '매뉴얼' } },
  dustCover: { yes: { ko: '있음' }, no: { ko: '없음' }, damaged: { ko: '손상 있음' } },
  phonoBuiltIn: { built_in: { ko: '내장' }, none: { ko: '미내장' } },
  bluetooth: { none: { ko: '없음' }, rx: { ko: '수신' }, tx: { ko: '송신' }, rx_tx: { ko: '송수신' } },
  ttType: { hifi: { ko: '하이파이' }, all_in_one: { ko: '올인원·포터블' }, dj: { ko: 'DJ' } },
  speakerConfig: { built_in: { ko: '내장 스피커' }, detachable: { ko: '분리형 스피커 동봉' }, none: { ko: '없음' } },
  platterMaterial: { aluminum_diecast: { ko: '알루미늄 다이캐스트' }, acrylic: { ko: '아크릴' }, glass: { ko: '유리' }, steel: { ko: '스틸' }, mdf: { ko: 'MDF' }, plastic: { ko: '플라스틱' } },
  tonearmShape: { straight: { ko: '스트레이트' }, s_shape: { ko: 'S자형' }, j_shape: { ko: 'J자형' } },
  // ── 카세트 데크 (소스기기) ──
  headCount: { two_head: { ko: '2헤드' }, three_head: { ko: '3헤드' } },
  deckCount: { single: { ko: '싱글 데크' }, double: { ko: '더블 데크' } },
  autoReverse: { none: { ko: '없음(단방향)' }, playback: { ko: '재생만' }, rec_play: { ko: '녹음+재생' } },
  capstan: { single: { ko: '싱글 캡스턴' }, dual: { ko: '듀얼(클로즈드 루프)' } },
  transportDrive: { direct: { ko: '다이렉트 드라이브' }, dc_servo: { ko: 'DC 서보' }, belt: { ko: '벨트' } },
  bias: { fixed: { ko: '고정' }, fine: { ko: '미세 조정' }, manual_cal: { ko: '수동 캘리브레이션' } },
  tapeType: { type_1: { ko: 'Type I (Normal)' }, type_2: { ko: 'Type II (CrO2)' }, type_4: { ko: 'Type IV (Metal)' }, fecr: { ko: 'FeCr (Type III)' } },
  noiseReduction: { dolby_b: { ko: 'Dolby B' }, dolby_c: { ko: 'Dolby C' }, dolby_s: { ko: 'Dolby S' }, dbx: { ko: 'dbx' } },
  levelMeter: { analog_vu: { ko: '아날로그 VU' }, fluorescent: { ko: '형광(FL)' }, led_peak: { ko: 'LED 피크' } },
  dubbingSpeed: { realtime: { ko: '등속' }, high_speed: { ko: '고속(2배)' }, both: { ko: '등속+고속' } },
  reverseMethod: { head_rotate: { ko: '헤드 회전' }, tape_flip: { ko: '테이프 물리 반전(UDAR)' }, naac: { ko: '자동 아지머스(NAAC)' } },
  // ── 카세트 3단계: 정비/상태 ──
  headWear: { good: { ko: '양호' }, light_wear: { ko: '미세 마모' }, relapped: { ko: '연마됨(리랩)' }, replaced: { ko: '교체됨' }, heavy_wear: { ko: '마모 심함' } },
  // 구성품 공통 7개 (specs.components 키 배열) + 목록 밖은 specs.componentsOther 자유 글
  components: { original_box: { ko: '원래 박스' }, manual: { ko: '설명서' }, power_cable: { ko: '전원 케이블' }, remote: { ko: '리모컨' }, warranty_receipt: { ko: '보증서나 영수증' }, service_record: { ko: '정비 명세서' }, cover: { ko: '덮개' } },
  maintenance: { recap: { ko: '리캡(콘덴서 교체)' }, belt: { ko: '벨트 교체' }, tube: { ko: '진공관 교체' }, edge: { ko: '엣지 교체' }, overhaul: { ko: '오버홀' }, none: { ko: '없음' } }, // 정비 이력 공통 목록 (직접 입력도 가능)
  recFunction: { normal: { ko: '정상' }, playback_only: { ko: '재생 전용' }, broken: { ko: '불가' } },
  conductor: { copper: { ko: '일반 구리' }, ofc: { ko: 'OFC' }, occ: { ko: 'OCC/PC-OCC' }, up_occ: { ko: 'UP-OCC' }, silver_plated_copper: { ko: '은도금 구리' }, pure_silver: { ko: '순은' }, hybrid: { ko: '하이브리드' }, other: { ko: '기타' } },
  plating: { gold: { ko: '금도금' }, rhodium: { ko: '로듐 도금' }, silver: { ko: '은도금' }, nickel: { ko: '니켈 도금' }, none: { ko: '무도금' } },
  shield: { shielded: { ko: '실드' }, unshielded: { ko: '무실드' }, double_shielded: { ko: '이중 실드' } },
  pair: { single: { ko: '단선' }, pair: { ko: '페어' }, set: { ko: '세트' } },
  speeds: { '33': { ko: '33 1/3 RPM' }, '45': { ko: '45 RPM' }, '78': { ko: '78 RPM' } },
  // 외관 상태 등급 (참고용, condition과 별개)
  appearance: { mint: { ko: '민트급' }, excellent: { ko: '매우 좋음' }, good: { ko: '좋음' }, fair: { ko: '보통' } },
  // 작동 상태 등급 (참고용, condition과 별개)
  working: { working: { ko: '정상 작동' }, needs_inspection: { ko: '점검 필요' }, needs_repair: { ko: '수리 필요' } },
};

// ── 등급 정의 한 줄 (폼은 고른 선택지 아래, 상세는 등급 옆 작은 안내) ──
//   상태(condition)는 종류만 정의, 중고의 등급은 외관(appearance)과 작동(working)이 정의 (2026-11-10 상태 등급 재구성)
//   작동 구분: 전 기능 정상 = '정상 작동' / 동작 미확인 = '점검 필요' / 일부 이상, 작동 불가, 부품용(설명 필수) = '수리 필요'
// 구성품 체크 선택지 (폼 체크 카드, 상세 나열)
export const COMPONENT_OPTS = Object.entries(SPEC_LABELS.components).map(([value, m]) => ({ value, label: m.ko ?? value }));

export const LABEL_DESC: Record<string, LabelMap> = {
  condition: {
    new: { ko: '포장을 열었지만 사용하지 않은 제품. 흠집과 사용 흔적이 없음.' },
    unopened: { ko: '제조사 포장을 한 번도 열지 않은 제품.' },
    nos: { ko: '생산 당시 재고로 보관만 한 미사용 제품(New Old Stock). 보관 중 생긴 포장 변색이나 고무 부품 경화는 설명에 적음.' },
    used: { ko: '사용한 제품. 외관과 작동 상태를 따로 표시.' },
  },
  appearance: {
    mint: { ko: '가까이 봐도 흠집이 없음. 재도장, 노브나 패널 교체 없음.' },
    excellent: { ko: '가까이 봐야 보이는 잔기스만 있음. 재도장 없음.' },
    good: { ko: '눈에 보이는 작은 흠집이나 마모가 있음. 재도장, 노브나 패널 교체가 있으면 옆 칸에 적음.' },
    fair: { ko: '흠집, 찍힘, 변색이 뚜렷함. 재도장, 노브나 패널 교체가 있으면 옆 칸에 적음.' },
  },
  working: {
    working: { ko: '모든 기능을 확인했고 정상(전 기능 정상). 리캡 같은 정비 내역은 정비 이력 칸에 적음.' },
    needs_inspection: { ko: '동작을 다 확인하지 못함(동작 미확인). 확인한 기능과 못 한 기능을 옆 칸에 적음.' },
    needs_repair: { ko: '일부 기능에 이상이 있거나 작동하지 않음(부품용 포함). 어떤 기능이 어떻게 이상한지 옆 칸에 꼭 적음.' },
  },
};
// 키 → 정의 한 줄 (없으면 ''). FEATURE_FLAGS.gradeDescriptions 가 꺼져 있으면 늘 '' (문구는 위 표에 그대로)
export function desc(field: string, key: string | null | undefined, locale: Locale = 'ko'): string {
  if (!key || !FEATURE_FLAGS.gradeDescriptions) return '';
  const m = LABEL_DESC[field]?.[key];
  return m?.[locale] ?? m?.ko ?? '';
}

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
