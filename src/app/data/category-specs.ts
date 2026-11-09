// ============================================================================
// category-specs.ts — 카테고리별 기술 사양 입력 스키마
// ----------------------------------------------------------------------------
// 판매 폼이 카테고리에 맞는 스펙 항목을 동적으로 렌더하기 위한 정의.
// 각 필드는 입력 방식(input.kind)을 가지며, 폼이 kind별로 다른 위젯을 그림.
//
// 저장: specs.tech.{key} 에 들어감 (옛 카탈로그 평면 키와 분리된 네임스페이스).
//   - select  → 문자열 1개 (한글 라벨)
//   - text    → 문자열 1개 (단위 제외한 값만)
//   - range   → '하한~상한' 문자열 (예: '10Hz~100kHz')
//   - dimensions → '가로×깊이×높이' 문자열 (예: '445×152×483')
//   - power   → [{ w, ohm }] 배열 (정격 출력 값 + 기준 임피던스 쌍)
//   - multiOhm   → 문자열 배열 (예: ['4Ω','8Ω'])
//   - terminals  → 문자열 배열 (예: ['RCA','XLR','스피커 출력'])
// ============================================================================

// select 옵션: 문자열(저장값=표시 동일, 예 앰프 '진공관') 또는
//   { value(저장·영문키), label(표시·한글) } — 스피커는 labels.ts와 맞추려 영문키 저장+한글 표시.
export type SelectOption = string | { value: string; label: string };
// 옵션 배열 → 표시 문자열 목록 (문자열 옵션은 그대로, {value,label}은 label). 필터 옵션 상수를 폼 옵션에서 뽑을 때 사용.
export const optLabels = (opts: SelectOption[]): string[] => opts.map((o) => (typeof o === 'string' ? o : o.label));
// 옵션 배열 → 저장값 목록 (문자열 옵션은 그대로, {value,label}은 value). 필터 옵션(키) 목록을 폼 옵션에서 뽑을 때 사용.
export const optValues = (opts: SelectOption[]): string[] => opts.map((o) => (typeof o === 'string' ? o : o.value));
// 저장값 → 표시 문자열 (문자열 옵션이면 그대로, {value,label}이면 label 조회). 옵션에 없는 값은 그대로 돌려줌.
//   mapRow(필터용 Listing 값)와 상세 페이지 기술 사양 표시가 같이 씀.
export const optLabel = (opts: SelectOption[] | undefined, v: string): string => {
  const o = opts?.find((x) => (typeof x === 'string' ? x : x.value) === v);
  return o === undefined ? v : typeof o === 'string' ? o : o.label;
};

// ── 입력 방식 ──
export type SpecInput =
  | { kind: 'auto' }                                            // 타입 — 카테고리에서 자동 입력
  | { kind: 'select'; options: SelectOption[] }                 // 드롭다운 단일 선택 (native select)
  | { kind: 'searchSelect'; options: SelectOption[]; aliases?: Record<string, string>; keyboardLayout?: boolean } // 검색 드롭다운(Typeahead) — 목록에서 고르면 영문 키 저장, 목록에 없는 글은 친 그대로. aliases=한글 라벨→영어 검색어, keyboardLayout=한영 오타 매칭
  | { kind: 'text'; unit?: string; free?: boolean }             // 숫자 입력 + (선택)단위 / free=true면 자유 텍스트(숫자 필터 X)
  | { kind: 'numSelect'; unit?: string; options: string[]; glue?: boolean } // 숫자 + 우측 드롭다운(조건/단위). glue=true면 드롭다운값 공백없이 붙여 저장(단위용 "47kΩ")
  | { kind: 'range'; lowUnit: string; highUnit: string }        // 하한~상한 2칸
  | { kind: 'dimensions' }                                      // 가로×깊이×높이 3칸 (mm)
  | { kind: 'valueNote'; unit?: string }                        // [값+단위][비고] 행 빌더 (무게 — 크기처럼 비고+추가)
  | { kind: 'power'; ohmOptions?: string[] }                    // 출력값(W) + 기준 옴, 쌍 추가 가능 / ohmOptions로 옴 목록 교체(헤드폰 등)
  | { kind: 'multi'; options: SelectOption[] }                  // 다중 선택 버튼 (임피던스/입력·출력 단자). {value,label}이면 영문키 저장+한글 표시
  | { kind: 'crossover' }                                       // 크로스오버 — 주파수(Hz) 여러 개 반복 입력 + 추가 버튼
  | { kind: 'drivers' }                                         // 드라이버 구성 빌더 (종류/구조/재질/크기/개수 — 패시브·액티브 공용)
  | { kind: 'ampPower' }                                       // 앰프 출력 빌더 (액티브 — 드라이버 종류 + 출력값)
  | { kind: 'tubeBuilder' }                                     // 진공관 빌더 — 역할/종류/개수 행 배열 (UI는 2단계)
  | { kind: 'textarea'; maxLength?: number; placeholder?: string }; // 여러 줄 자유 글 (기타 사양) — 줄바꿈 그대로 저장, 필터는 안 읽음

// showWhen: 현재 입력값(specs)에서 이 필드를 보일지 판단. 없으면 항상 표시.
//   스피커 형식(speakerDetail=passive/active)에 따라 필드를 갈라 보여줄 때 사용.
export type CategorySpecField = { key: string; label: string; input: SpecInput; showWhen?: (specs: Record<string, string | string[]>) => boolean };
// 스피커 형식 게이팅 조건 (specs.speakerDetail = passive/active)
const detailSet = (s: Record<string, string | string[]>) => Boolean(s.speakerDetail);
const isPassive = (s: Record<string, string | string[]>) => s.speakerDetail === 'passive';
const isActive = (s: Record<string, string | string[]>) => s.speakerDetail === 'active';
// 서브우퍼 전용 게이팅 (specs.__sub = 하위 카테고리; 폼에서 주입). 서브우퍼는 폼 구성이 다름.
const isSub = (s: Record<string, string | string[]>) => s.__sub === '서브우퍼';
const passiveNoSub = (s: Record<string, string | string[]>) => isPassive(s) && !isSub(s);
const activeNoSub = (s: Record<string, string | string[]>) => isActive(s) && !isSub(s);
const activeSub = (s: Record<string, string | string[]>) => isActive(s) && isSub(s);
const detailSub = (s: Record<string, string | string[]>) => detailSet(s) && isSub(s);
// 사운드바 전용 게이팅 (액티브 고정 — 폼에서 speakerDetail='active' 자동 설정 + 형식 숨김)
const isSoundbar = (s: Record<string, string | string[]>) => s.__sub === '사운드바';
const activeNoBar = (s: Record<string, string | string[]>) => isActive(s) && !isSoundbar(s);
const activeFull = (s: Record<string, string | string[]>) => isActive(s) && !isSub(s) && !isSoundbar(s); // 일반 액티브 스피커 (서브우퍼·사운드바 제외)
// 사운드바 서브우퍼 포함 게이팅 — '미포함'이 아니면(무선/유선) 우퍼 크기·출력 노출
const subIncl = (s: Record<string, string | string[]>) => isSoundbar(s) && typeof s.subIncluded === 'string' && s.subIncluded !== '' && s.subIncluded !== 'none';
// 사운드바 서라운드 스피커 포함 게이팅 — 선택(유선/무선) 시 출력·크기·무게·개수 노출
const surrIncl = (s: Record<string, string | string[]>) => isSoundbar(s) && typeof s.surroundType === 'string' && s.surroundType !== '' && s.surroundType !== 'virtual';
// AV 리시버 전용 게이팅 (앰프 대분류의 하위 카테고리)
const isAvr = (s: Record<string, string | string[]>) => s.__sub === 'AV 리시버';
// 헤드폰 앰프 전용 게이팅 (앰프 대분류의 하위 카테고리)
const isHpAmp = (s: Record<string, string | string[]>) => s.__sub === '헤드폰 앰프';
// 진공관 게이팅 — 증폭 방식이 진공관/하이브리드인 모든 앰프에서 진공관 종류 노출
const isTubeAmp = (s: Record<string, string | string[]>) => s.device === 'tube' || s.device === 'hybrid';
// 프리앰프 — 파워앰프 성격 항목(동작 클래스·정격 출력·지원 임피던스·댐핑 팩터) 숨김용
const isPreamp = (s: Record<string, string | string[]>) => s.__sub === '프리앰프';
// 포노 그룹 게이팅 (포노앰프·MC 스텝업 헤드앰프·MC 스텝업 트랜스 공통 — 앰프 기본 필드 다수 숨김)
const isPhonoGroup = (s: Record<string, string | string[]>) => s.__sub === '포노앰프' || s.__sub === 'MC 스텝업 헤드앰프' || s.__sub === 'MC 스텝업 트랜스';
// 포노앰프(풀 포노 스테이지) 전용
const isPhonoAmp = (s: Record<string, string | string[]>) => s.__sub === '포노앰프';
// 포노앰프 MM 블록 게이팅 — 지원 카트리지에 MM 포함 시
const isPhonoMM = (s: Record<string, string | string[]>) => isPhonoAmp(s) && (s.cartridgeSupport === 'MM' || s.cartridgeSupport === 'MM/MC');
// 포노앰프 MC 블록 게이팅 — 지원 카트리지에 MC 포함 시
const isPhonoMC = (s: Record<string, string | string[]>) => isPhonoAmp(s) && (s.cartridgeSupport === 'MC' || s.cartridgeSupport === 'MM/MC');
// MC 스텝업 헤드앰프 (능동) 전용
const isMcHeadAmp = (s: Record<string, string | string[]>) => s.__sub === 'MC 스텝업 헤드앰프';
// MC 스텝업 트랜스 (패시브 SUT) 전용
const isMcSut = (s: Record<string, string | string[]>) => s.__sub === 'MC 스텝업 트랜스';
// 소스기기 하위 게이트 — 턴테이블 (다른 소스기기 하위는 공통 꼬리만 노출)
const isTurntable = (s: Record<string, string | string[]>) => s.__sub === '턴테이블';
// 턴테이블 하위 유형(ttType) — 스피커 isPassive/isActive 패턴. 미선택 시 유형별 블록 전부 숨김
const isTtHifi = (s: Record<string, string | string[]>) => isTurntable(s) && s.ttType === 'hifi';
const isTtAllInOne = (s: Record<string, string | string[]>) => isTurntable(s) && s.ttType === 'all_in_one';
const isTtDj = (s: Record<string, string | string[]>) => isTurntable(s) && s.ttType === 'dj';
// 기계부 스펙 공유 (올인원 숨김). FEATURE_FLAGS.turntableType 꺼짐(2026-11-10): 형식 칸이 없으니 턴테이블이면 늘 보임(톤암 등). 올인원, DJ 전용 칸은 형식 값이 없어 안 보임
const ttHifiOrDj = (s: Record<string, string | string[]>) => (FEATURE_FLAGS.turntableType ? isTtHifi(s) || isTtDj(s) : isTurntable(s));
// 형식 칸 자체 — 플래그 꺼지면 숨김 + 저장 안 함 (폼과 시드가 showWhen 으로 같이 따름)
const ttTypeShown = (s: Record<string, string | string[]>) => FEATURE_FLAGS.turntableType && isTurntable(s);
// 턴테이블 구성품 조건부 — 사운드바 subIncl 패턴 (포함/내장 값일 때만 세부 필드 노출)
const ttCartIncl = (s: Record<string, string | string[]>) => isTurntable(s) && s.cartridge === 'included';
const ttPhonoBuilt = (s: Record<string, string | string[]>) => isTurntable(s) && s.phonoBuiltIn === 'built_in';
const ttSpkIncl = (s: Record<string, string | string[]>) => isTtAllInOne(s) && (s.speakerConfig === 'built_in' || s.speakerConfig === 'detachable');
// 카세트 데크 — 소스기기 하위 게이트 (1단계: 공통 필드. 3축 분기·정비는 2·3단계)
const isCassette = (s: Record<string, string | string[]>) => s.__sub === '카세트 데크';
// 카세트 분기 (값 기반 — 턴테이블 isTtHifi 패턴). 트리거 미선택/해당없음이면 하위필드 숨김 (3헤드 분기는 오프테이프 모니터링 칸 삭제로 없어짐)
const casDouble = (s: Record<string, string | string[]>) => isCassette(s) && s.deckCount === 'double';
const casAutoRev = (s: Record<string, string | string[]>) => isCassette(s) && (s.autoReverse === 'playback' || s.autoReverse === 'rec_play');

// labels.ts의 "영문키 → 한글" 표에서 select 옵션({value:영문키, label:한글})을 만든다.
//   저장은 영문키(필터/labels.ts와 일치), 화면 표시는 한글. only를 주면 그 키만(순서는 labels.ts 정의 순).
import { SPEC_LABELS } from '@/lib/labels';
import { FEATURE_FLAGS } from '@/app/data/feature-flags'; // 숨김 플래그 (docs/hidden.md) — 턴테이블 형식
const labelOpts = (ns: string, only?: string[]): { value: string; label: string }[] =>
  Object.entries(SPEC_LABELS[ns] ?? {})
    .filter(([v]) => !only || only.includes(v))
    .map(([value, m]) => ({ value, label: m.ko ?? value }));
// 한 항목만 {value: 영문키, label: 한글} — 중립 값(MM, 220V, ARC 등)과 한글 값이 섞인 목록에서 한글 값 자리에 씀
const labelOpt = (ns: string, key: string): { value: string; label: string } => ({ value: key, label: SPEC_LABELS[ns]?.[key]?.ko ?? key });
// 표시 글자 → 저장값 (검색 드롭다운: 목록 라벨과 같으면 그 키, 아니면 판매자가 친 글 그대로)
export const optValue = (opts: SelectOption[] | undefined, text: string): string => {
  const o = opts?.find((x) => (typeof x === 'string' ? x : x.label) === text);
  return o === undefined ? text : typeof o === 'string' ? o : o.value;
};

// ── 앰프 옵션 상수 ──
export const AMP_CHANNEL_OPTS = labelOpts('channel', ['mono_block', 'stereo', 'multi_channel']);
// 프리앰프 전용 채널 (모노블록은 파워앰프 용어 → 프리앰프는 '모노')
export const PREAMP_CHANNEL_OPTS = labelOpts('channel', ['mono', 'stereo', 'multi_channel']);
// AV 리시버 채널 수 (X.Y = 메인.서브우퍼 출력)
export const AVR_CHANNEL_OPTS = ['5.1', '5.2', '7.1', '7.2', '9.2', '11.2', '13.2'];
// AV 리시버 영상 패스스루 (다중 선택)
export const AVR_VIDEO_OPTS = ['8K', '4K/120Hz', 'HDR10', 'HDR10+', 'Dolby Vision', 'HLG'];
// AV 리시버 ARC/eARC 등급 (값은 사운드바와 같지만, 정의 순서상 여기 따로 둠)
export const AVR_ARC_OPTS: SelectOption[] = [labelOpt('arcSupport', 'not_supported'), 'ARC', 'eARC'];
// AV 리시버 지원 오디오 포맷 (다중) / 룸 보정 방식
export const AVR_AUDIO_FORMATS = ['Dolby Atmos', 'Dolby TrueHD', 'Dolby Digital Plus', 'DTS:X', 'DTS-HD MA', 'DTS Neural:X', 'Auro-3D', 'IMAX Enhanced'];
export const AVR_ROOMCAL_OPTS: SelectOption[] = [labelOpt('roomCal', 'none'), 'Audyssey', 'YPAO', 'Dirac Live', 'MCACC', 'AccuEQ'];
// 증폭 방식 — 솔리드 스테이트 값은 AV 리시버 자동 저장(폼에서 칸 숨김)에도 같이 씀
export const AMP_DEVICE_SOLID = 'solid_state';
export const AMP_DEVICE_OPTS = labelOpts('device'); // tube / solid_state / hybrid
// 진공관 빌더 — 역할별 대표관(이름만, 등가/브랜드/음색 제외). 직접입력은 렌더 컴포넌트가 제공
export const TUBE_ROLE_OPTS = ['출력관', '프리관', '드라이브관', '정류관'];
export const TUBE_POWER_OPTS = ['KT88','KT90','KT120','KT150','KT170','6550','EL34','6CA7','KT77','KT66','6L6GC','5881','EL84','6V6','7591','300B','845','211','2A3','PX25','45'];
export const TUBE_PRE_OPTS = ['12AX7','12AU7','12AT7','12AY7','6DJ8','6922','E88CC','6SN7','6SL7','5751','6N1P'];
export const TUBE_DRIVER_OPTS = ['12BH7','5687','E182CC','7119','6N6P','6H30','EF86','6CG7','ECC99'];
export const TUBE_RECT_OPTS = ['GZ34','5U4G','5Y3','5R4','274B','5V4G'];
export const TUBE_TYPE_MAP: Record<string, string[]> = { '출력관': TUBE_POWER_OPTS, '프리관': TUBE_PRE_OPTS, '드라이브관': TUBE_DRIVER_OPTS, '정류관': TUBE_RECT_OPTS };
export const AMP_CLASS_OPTS = ['Class A', 'Class AB', 'Class B', 'Class D', 'Class G', 'Class H']; // 동작 클래스
export const AMP_OHM_OPTS = ['2Ω', '4Ω', '6Ω', '8Ω', '16Ω']; // 정격 출력 기준 옴 + 지원 임피던스 공용
export const AMP_PHONO_OPTS: SelectOption[] = ['MM', 'MC', 'MM/MC', labelOpt('phono', 'none')];
// 포노앰프 지원 카트리지
export const PHONO_CARTRIDGE_OPTS = ['MM', 'MC', 'MM/MC'];
// 포노앰프 MC 승압 방식
export const PHONO_MCBOOST_OPTS = labelOpts('mcBoostMode');
// 포노앰프 EQ 커브 (다중)
export const EQ_CURVE_OPTS = ['RIAA', 'eRIAA', 'Decca', 'Columbia', 'NAB', 'Teldec'];
export const PHONO_IMP_UNITS = ['Ω', 'kΩ'];   // 포노 입력 임피던스 numSelect 단위(공백없이 붙임)
export const PHONO_LEVEL_UNITS = ['mV', 'V']; // 포노 출력 레벨 numSelect 단위
// MC 스텝업 헤드앰프 사용 소자
export const MC_DEVICE_OPTS = ['JFET', 'BJT', 'IC/Op-amp'];
// MC 스텝업 트랜스 코어 재질
export const SUT_CORE_OPTS = labelOpts('sutCore');
export const YES_NO_OPTS = labelOpts('yes_no'); // yes / no
export const AMP_VOLTAGE_OPTS: SelectOption[] = ['100V', '120V', '220V', labelOpt('voltage', 'free_volt')];

// 입력 단자 — 평면 나열. 포노는 별도 '포노 입력' 칸에서만 받으므로 제외 (중복 방지)
export const AMP_INPUT_TERMINALS = ['RCA', 'XLR', 'Main In', 'HT Bypass', 'Optical', 'Coaxial', 'USB-A', 'USB-B', 'USB-C', 'LAN', 'HDMI In', 'DIN', 'AES/EBU', 'BNC'];
// 출력 단자 — 평면 나열
export const AMP_OUTPUT_TERMINALS: SelectOption[] = [labelOpt('terminal', 'speaker_terminal'), 'Pre Out', 'Tape/Rec Out', 'Subwoofer Out', 'Headphone Out', 'RCA Out', 'XLR Out', 'Optical Out', 'Coaxial Out', 'AES/EBU Out', 'BNC Out', 'USB-A', 'USB-B', 'USB-C', 'HDMI Out', labelOpt('terminal', 'line_out_70v_100v')];

// 단자 검색 별칭 — 별칭으로 검색해도 원래 단자가 매칭되도록 (단자명 → 별칭 목록)
export const TERMINAL_ALIASES: Record<string, string[]> = {
  // 입력
  'RCA': ['알씨에이', 'RCA 입력', 'RCA 단자', '언밸런스 입력', '라인 입력', 'Line In'],
  'XLR': ['엑스엘알', 'XLR 입력', 'XLR 단자', '밸런스 입력', 'Balanced In'],
  'Main In': ['메인인', '메인 인', 'Main-In', 'Main Input', '파워앰프 입력', '파워 인'],
  'HT Bypass': ['에이치티 바이패스', '홈시어터 바이패스', 'Home Theater Bypass', 'Theater Bypass', 'AV Bypass'],
  'Optical': ['옵티컬', 'Optical 입력', '광입력', 'Toslink', '토스링크'],
  'Coaxial': ['코액셜', '코액시얼', 'Coaxial 입력', 'Coax 입력', '동축 입력'],
  'USB': ['유에스비', 'USB 입력', 'USB Audio', 'USB DAC 입력'],
  'LAN': ['네트워크', '네트워크 입력', '랜', 'Ethernet', '이더넷', '유선랜', 'Network'],
  'HDMI ARC': ['에이치디엠아이 ARC', 'HDMI 아크', 'ARC', 'TV ARC', 'HDMI 입력'],
  'DIN': ['딘', 'DIN 입력', 'DIN 단자', '5핀 DIN', '5 Pin DIN'],
  'AES/EBU': ['에이에스이비유', 'AES EBU', 'AES/EBU 입력', 'AES 입력', '디지털 XLR'],
  'BNC': ['비엔씨', 'BNC 입력', 'BNC 단자', 'BNC 디지털 입력'],
  // 출력
  speaker_terminal: ['스피커 출력', '스피커 단자', 'Speaker Out', 'Speaker Terminal', '스피커아웃'],
  'Pre Out': ['프리아웃', '프리 아웃', 'Pre-Out', 'Preout', '프리출력'],
  'Tape/Rec Out': ['테이프아웃', '테이프 아웃', 'Tape-Out', 'Tapeout', '테이프출력', '레코드아웃', '레코드 아웃', 'Rec Out', 'Record-Out', '녹음출력'],
  'Subwoofer Out': ['서브아웃', '서브 아웃', 'Sub Out', 'Sub Pre Out', '서브우퍼 출력'],
  'Headphone Out': ['헤드폰아웃', '헤드폰 아웃', 'Headphone Output', 'Phones Out', '헤드폰 출력'],
  'RCA Out': ['알씨에이아웃', 'RCA 아웃', 'RCA 출력', '언밸런스 출력', 'RCA Output'],
  'Mic In': ['마이크인', '마이크 인', '마이크', '마이크 입력', 'Mic', 'Microphone In'],
  'XLR Out': ['엑스엘알아웃', 'XLR 아웃', 'XLR 출력', '밸런스 출력', 'XLR Output'],
  'Optical Out': ['옵티컬아웃', '옵티컬 아웃', 'Optical 출력', '광출력', 'Toslink Out', '토스링크 출력'],
  'Coaxial Out': ['코액셜아웃', '코액시얼아웃', '동축 출력', 'Coax Out', 'Coaxial Output'],
  'AES/EBU Out': ['에이에스이비유아웃', 'AES EBU 아웃', 'AES/EBU 출력', 'AES 출력', '디지털 XLR 출력'],
  'BNC Out': ['비엔씨아웃', 'BNC 아웃', 'BNC 출력', 'BNC Output'],
  line_out_70v_100v: ['70볼트 라인 출력', '100볼트 라인 출력', '하이임피던스 출력', 'PA 라인 출력', '정전압 출력'],
  // 무선/네트워크
  'Bluetooth': ['블루투스', 'BT', '블투'],
  'Wi-Fi': ['와이파이', 'WiFi', 'Wifi', '무선', '무선랜'],
  'AirPlay': ['에어플레이', '에어플레이2', 'AirPlay 2'],
  'Spotify Connect': ['스포티파이', '스포티파이 커넥트', 'Spotify'],
  'TIDAL Connect': ['타이달', '타이달 커넥트', 'Tidal'],
  'Roon Ready': ['룬', '룬 레디', 'Roon'],
  'DLNA/UPnP': ['디엘엔에이', 'DLNA', 'UPnP', '유피엔피', '디엘엔에이/유피엔피'],
};

// 무선/네트워크 옵션
export const AMP_WIRELESS = ['Bluetooth', 'Wi-Fi', 'AirPlay', 'Spotify Connect', 'TIDAL Connect', 'Roon Ready', 'DLNA/UPnP'];
// 헤드폰 앰프 헤드폰 출력 단자
export const HP_OUTPUT_TERMINALS: SelectOption[] = ['6.35mm', '3.5mm', '4.4mm (Pentaconn)', '4-pin XLR', labelOpt('terminal', 'dual_3pin_xlr')];
// 헤드폰 앰프 부하 임피던스 (출력 매트릭스용)
export const HP_OHM_OPTS = ['16Ω', '32Ω', '50Ω', '80Ω', '150Ω', '250Ω', '300Ω', '600Ω'];
// 헤드폰 앰프 사용 형태
export const HP_FORM_OPTS = labelOpts('hpForm');

// ── 기타 사양 — 모든 카테고리 기술 사양 맨 끝 자유 글 한 칸 (접기가 켜진 하위에선 '상세 사양' 맨 끝). 상세 페이지엔 글 그대로, 필터는 안 읽음 ──
export const OTHER_SPECS_INPUT = { kind: 'textarea', maxLength: 500, placeholder: '위 칸에 없는 사양을 적어 주세요. 예: 소비 전력 120W, 개조나 특주 내역' } as const; // 폴백(케이블 등) 칸도 같이 씀
export const OTHER_SPECS_FIELD: CategorySpecField = { key: 'otherSpecs', label: '기타 사양', input: OTHER_SPECS_INPUT };

// ── 앰프 스펙 필드 (사양서 순서대로 17개) ──
export const AMP_SPEC_FIELDS: CategorySpecField[] = [
  { key: 'type', label: '타입', input: { kind: 'auto' } },
  { key: 'channel', label: '채널', input: { kind: 'select', options: AMP_CHANNEL_OPTS }, showWhen: (s) => !isAvr(s) && !isHpAmp(s) && !isPhonoGroup(s) && !isPreamp(s) }, // AVR=채널 수 / 헤드폰·포노 그룹·프리앰프 숨김
  { key: 'channel', label: '채널', input: { kind: 'select', options: PREAMP_CHANNEL_OPTS }, showWhen: isPreamp }, // 프리앰프 전용: 모노블록 대신 모노
  { key: 'avrChannels', label: '채널 수', input: { kind: 'select', options: AVR_CHANNEL_OPTS }, showWhen: isAvr },
  { key: 'device', label: '증폭 방식', input: { kind: 'select', options: AMP_DEVICE_OPTS }, showWhen: (s) => !isMcSut(s) }, // MC 스텝업 트랜스(패시브)는 증폭 방식 없음
  { key: 'tubes', label: '진공관 종류', input: { kind: 'tubeBuilder' }, showWhen: (s) => isTubeAmp(s) && !isMcSut(s) && !isAvr(s) }, // MC 스텝업 트랜스(증폭 방식 없음), AV 리시버(솔리드 스테이트 고정)는 도달 불가라 제외
  // ── 포노앰프 전용: 지원 카트리지 + MM 블록 ──
  { key: 'cartridgeSupport', label: '지원 카트리지', input: { kind: 'select', options: PHONO_CARTRIDGE_OPTS }, showWhen: isPhonoAmp },
  { key: 'mmGain', label: 'MM 게인', input: { kind: 'text', unit: 'dB' }, showWhen: isPhonoMM },
  { key: 'mmLoad', label: 'MM 입력 임피던스', input: { kind: 'numSelect', options: PHONO_IMP_UNITS, glue: true }, showWhen: isPhonoMM },
  { key: 'mmCap', label: 'MM 입력 정전용량', input: { kind: 'text', unit: 'pF' }, showWhen: isPhonoMM },
  // ── 포노앰프 전용: MC 블록 (지원 카트리지에 MC 포함 시) ──
  { key: 'mcBoostMode', label: 'MC 승압 방식', input: { kind: 'select', options: PHONO_MCBOOST_OPTS }, showWhen: isPhonoMC },
  { key: 'mcGain', label: 'MC 게인', input: { kind: 'text', unit: 'dB' }, showWhen: isPhonoMC },
  { key: 'mcLoad', label: 'MC 입력 임피던스', input: { kind: 'numSelect', options: PHONO_IMP_UNITS, glue: true }, showWhen: isPhonoMC },
  // ── 포노앰프 전용: EQ·필터 (포노앰프 공통) ──
  { key: 'eqCurves', label: 'EQ 커브', input: { kind: 'multi', options: EQ_CURVE_OPTS }, showWhen: isPhonoAmp },
  { key: 'subsonic', label: '서브소닉 필터', input: { kind: 'select', options: YES_NO_OPTS }, showWhen: isPhonoAmp },
  { key: 'monoSwitch', label: '모노 스위치', input: { kind: 'select', options: YES_NO_OPTS }, showWhen: isPhonoAmp },
  // ── 포노앰프 전용: 입력 레벨 (감도·최대입력) ──
  { key: 'inputSensitivity', label: '입력 감도', input: { kind: 'text', unit: 'mV' }, showWhen: isPhonoAmp },
  { key: 'maxInput', label: '최대 입력', input: { kind: 'text', unit: 'mV' }, showWhen: isPhonoAmp },
  // ── 포노앰프 전용: 출력 / 포노 공통: 접지 ──
  { key: 'outputLevel', label: '출력 레벨', input: { kind: 'numSelect', options: PHONO_LEVEL_UNITS, glue: true }, showWhen: isPhonoAmp },
  { key: 'outputImpedance', label: '출력 임피던스', input: { kind: 'text', unit: 'Ω' }, showWhen: isPhonoAmp },
  { key: 'groundTerminal', label: '접지 단자', input: { kind: 'select', options: YES_NO_OPTS }, showWhen: isPhonoGroup },
  // ── MC 스텝업 헤드앰프(능동) 전용 ──
  { key: 'mcHeadGain', label: '게인', input: { kind: 'text', unit: 'dB' }, showWhen: isMcHeadAmp },
  { key: 'mcHeadLoad', label: '입력 임피던스', input: { kind: 'numSelect', options: PHONO_IMP_UNITS, glue: true }, showWhen: isMcHeadAmp },
  { key: 'mcHeadOutImp', label: '출력 임피던스', input: { kind: 'text', unit: 'Ω' }, showWhen: isMcHeadAmp },
  { key: 'mcHeadDevice', label: '사용 소자', input: { kind: 'select', options: MC_DEVICE_OPTS }, showWhen: isMcHeadAmp },
  // ── MC 스텝업 트랜스(패시브 SUT) 전용 ──
  { key: 'sutRatio', label: '승압비', input: { kind: 'text', free: true }, showWhen: isMcSut },
  { key: 'sutTransModel', label: '트랜스 모델', input: { kind: 'text', free: true }, showWhen: isMcSut },
  { key: 'sutCore', label: '코어 재질', input: { kind: 'select', options: SUT_CORE_OPTS }, showWhen: isMcSut },
  { key: 'opClass', label: '동작 클래스', input: { kind: 'select', options: AMP_CLASS_OPTS }, showWhen: (s) => !isPhonoGroup(s) && !isPreamp(s) },
  { key: 'powerRated', label: '정격 출력', input: { kind: 'power' }, showWhen: (s) => !isHpAmp(s) && !isPhonoGroup(s) && !isPreamp(s) },
  { key: 'hpOutput', label: '부하별 출력', input: { kind: 'power', ohmOptions: HP_OHM_OPTS }, showWhen: isHpAmp }, // 헤드폰 앰프 전용 키 — powerRated(정격 출력·8Ω 기준 필터)와 분리해 parsePowerW 에 안 들어가게 (헤드폰 앰프는 power=0)
  // 권장 카트리지 임피던스 — MC 헤드앰프·SUT 공용(재활용), 주파수 응답 바로 위
  { key: 'mcHeadCartImp', label: '권장 카트리지 임피던스', input: { kind: 'range', lowUnit: 'Ω', highUnit: 'Ω' }, showWhen: (s) => isMcHeadAmp(s) || isMcSut(s) },
  { key: 'freqResponse', label: '주파수 응답', input: { kind: 'range', lowUnit: 'Hz', highUnit: 'kHz' } },
  { key: 'impedance', label: '지원 임피던스', input: { kind: 'multi', options: AMP_OHM_OPTS }, showWhen: (s) => !isHpAmp(s) && !isPhonoGroup(s) && !isPreamp(s) }, // 헤드폰 앰프·포노 그룹·프리앰프 숨김
  { key: 'thd', label: 'THD', input: { kind: 'text', unit: '%' }, showWhen: (s) => !isMcSut(s) }, // 패시브 SUT는 THD 무의미
  { key: 'snr', label: 'S/N', input: { kind: 'text', unit: 'dB' }, showWhen: (s) => !isMcSut(s) }, // 패시브 SUT는 S/N 무의미
  { key: 'damping', label: '댐핑 팩터', input: { kind: 'text' }, showWhen: (s) => !isPhonoGroup(s) && !isPreamp(s) },
  { key: 'inputs', label: '입력 단자', input: { kind: 'multi', options: AMP_INPUT_TERMINALS } },
  { key: 'outputs', label: '출력 단자', input: { kind: 'multi', options: AMP_OUTPUT_TERMINALS } },
  // ── AV 리시버 전용: HDMI 개수 · 영상 패스스루 · ARC/eARC ──
  { key: 'hdmiIn', label: 'HDMI 입력 개수', input: { kind: 'text', unit: '개' }, showWhen: isAvr },
  { key: 'hdmiOut', label: 'HDMI 출력 개수', input: { kind: 'text', unit: '개' }, showWhen: isAvr },
  { key: 'videoPassthrough', label: '영상 패스스루', input: { kind: 'multi', options: AVR_VIDEO_OPTS }, showWhen: isAvr },
  { key: 'arcSupport', label: 'ARC/eARC', input: { kind: 'select', options: AVR_ARC_OPTS }, showWhen: isAvr },
  { key: 'audioFormats', label: '지원 포맷', input: { kind: 'multi', options: AVR_AUDIO_FORMATS }, showWhen: isAvr },
  { key: 'roomCal', label: '룸 보정', input: { kind: 'select', options: AVR_ROOMCAL_OPTS }, showWhen: isAvr },
  // ── 헤드폰 앰프 전용: 헤드폰 출력 단자 · 게인 · 출력 임피던스 ──
  { key: 'hpOutputs', label: '헤드폰 출력 단자', input: { kind: 'multi', options: HP_OUTPUT_TERMINALS }, showWhen: isHpAmp },
  { key: 'hpGain', label: '게인', input: { kind: 'text', unit: 'dB' }, showWhen: isHpAmp },
  { key: 'hpOutputImpedance', label: '출력 임피던스', input: { kind: 'text', unit: 'Ω' }, showWhen: isHpAmp },
  { key: 'hpImpedanceRange', label: '권장 헤드폰 임피던스', input: { kind: 'range', lowUnit: 'Ω', highUnit: 'Ω' }, showWhen: isHpAmp },
  { key: 'hpDacChip', label: 'DAC 칩셋', input: { kind: 'text', free: true }, showWhen: isHpAmp }, // 상시 표기(구성형태 게이팅 제거)
  { key: 'hpForm', label: '사용 형태', input: { kind: 'select', options: HP_FORM_OPTS }, showWhen: isHpAmp },
  { key: 'phono', label: '포노 입력', input: { kind: 'select', options: AMP_PHONO_OPTS }, showWhen: (s) => !isHpAmp(s) && !isPhonoGroup(s) }, // 헤드폰 앰프·포노 그룹엔 해당 없음
  { key: 'wireless', label: '무선/네트워크', input: { kind: 'multi', options: AMP_WIRELESS }, showWhen: (s) => !isPhonoGroup(s) },
  { key: 'toneControl', label: '톤 컨트롤', input: { kind: 'select', options: YES_NO_OPTS }, showWhen: (s) => !isHpAmp(s) && !isPhonoGroup(s) }, // 헤드폰 앰프·포노 그룹엔 드묾
  { key: 'remote', label: '리모컨 포함', input: { kind: 'select', options: YES_NO_OPTS }, showWhen: (s) => !isHpAmp(s) && !isPhonoGroup(s) }, // 헤드폰 앰프·포노 그룹엔 드묾
  { key: 'voltage', label: '전원 전압', input: { kind: 'select', options: AMP_VOLTAGE_OPTS }, showWhen: (s) => !isMcSut(s) }, // 패시브 SUT는 무전원
  { key: 'dimensions', label: '크기', input: { kind: 'dimensions' } },
  { key: 'weight', label: '무게', input: { kind: 'valueNote', unit: 'kg' } }, // 1단계: 무게 빌더(값+비고+추가) — 앰프만 먼저
  OTHER_SPECS_FIELD, // 기타 사양 (맨 끝)
];

// ── 스피커 옵션 상수 ──
// labels.ts에서 파생(저장=영문키, 표시=한글). 필터 키(speakerDetail 등)와 이름 일치.
export const SPEAKER_DETAIL_OPTS = labelOpts('speakerDetail');                                  // passive/active
// 폼 칸이 아니라 드라이버 빌더 파생 키 driverWays 의 어휘 (spec-builders.ts driverDerived → 필터 '드라이버 구성' 옵션)
export const SPEAKER_DRIVER_OPTS = labelOpts('driverConfig');                                   // full_range/coaxial/2way/3way/4way_plus
// 우퍼 크기 필터 구간 — 드라이버 빌더 파생 키 wooferMaxInch(우퍼·미드우퍼 최대 크기, inch)를 묶음. max = 구간 상한(이하).
//   경계는 흔한 규격 사이 중간값: 5.25" → 5인치 이하, 200mm(7.9") → 6~8인치, 250mm(9.8") → 10인치, 300mm(11.8") → 12인치
//   key = 필터 값(언어 중립), label = labels.ts wooferSize 표
export const SPEAKER_WOOFER_BUCKETS: { key: string; label: string; max: number }[] = [
  { key: 'in_5_down', max: 5.5 },
  { key: 'in_6_8', max: 9 },
  { key: 'in_10', max: 11 },
  { key: 'in_12', max: 13.5 },
  { key: 'in_15_up', max: Infinity },
].map((b) => ({ ...b, label: labelOpt('wooferSize', b.key).label }));
// inch 값 → 구간 키. 미입력(null) = '' (우퍼 크기 필터에서 제외)
export const wooferBucket = (inch: number | null): string =>
  inch == null ? '' : SPEAKER_WOOFER_BUCKETS.find((b) => inch <= b.max)?.key ?? '';
export const SPEAKER_ENCLOSURE_OPTS = labelOpts('enclosure');                                 // 검색 드롭다운: 고르면 영문 키(bass_reflex 등) 저장, 표시는 한글
// 인클로저 한글 라벨 → 영어 검색어 (labels.ts 영문키 기반: _ → 공백). 영어로도 검색되게.
export const SPEAKER_ENCLOSURE_ALIASES: Record<string, string> = Object.fromEntries(
  labelOpts('enclosure').map((o) => [o.label, o.value.replace(/_/g, ' ')]),
);
// 스피커 임피던스 필터 구간 — 폼은 숫자 칸(Ω 고정, 소수 허용, 숫자 저장 '8', '3.2'), 필터는 이 구간으로 묶음(우퍼 크기 버킷과 같은 방식). below = 구간 상한(미만)
//   4Ω 이하(~4.9) / 6Ω(5~7.9) / 8Ω(8~12.9) / 16Ω 이상(13~). key = 필터 값(언어 중립), label = labels.ts speakerImpedanceRange 표 (2026-11-10)
export const SPEAKER_IMPEDANCE_BUCKETS: { key: string; label: string; below: number }[] = [
  { key: 'ohm_4_down', below: 5 },
  { key: 'ohm_6', below: 8 },
  { key: 'ohm_8', below: 13 },
  { key: 'ohm_16_up', below: Infinity },
].map((b) => ({ ...b, label: labelOpt('speakerImpedanceRange', b.key).label }));
// Ω 값 → 구간 키. 미입력(null) = '' (임피던스 필터 어디에도 안 들어감)
export const speakerImpedanceBucket = (ohm: number | null): string =>
  ohm == null ? '' : SPEAKER_IMPEDANCE_BUCKETS.find((b) => ohm < b.below)?.key ?? '';
// 액티브 스피커 전용 select 옵션 (labels.ts에 없어 한글 그대로 저장)
export const SPK_AMP_CONFIG_OPTS = labelOpts('ampConfig');
export const SPK_CROSSOVER_TYPE_OPTS = labelOpts('crossoverType');
export const SPK_PHASE_OPTS = labelOpts('phaseControl'); // 서브우퍼 위상 조절
export const SUB_FIRING_OPTS = labelOpts('firingDirection'); // 서브우퍼 드라이버 방사 방향
// 사운드바 채널 구성 (단일 드롭다운). X.Y.Z = 메인.우퍼.높이 채널
export const SOUNDBAR_CHANNEL_OPTS = ['2.0', '2.1', '3.1', '2.1.2', '3.1.2', '5.1', '5.1.2', '5.1.4', '7.1.2', '7.1.4', '9.1.2', '9.1.4', '11.1.4'];
// 사운드바 지원 오디오 포맷 (다중 선택)
export const SOUNDBAR_AUDIO_FORMATS = ['Dolby Atmos', 'Dolby Digital', 'Dolby Digital Plus', 'Dolby TrueHD', 'DTS', 'DTS:X', 'DTS Virtual:X', 'DTS-HD MA', 'PCM'];
// 사운드바 서라운드 스피커 포함 여부 / ARC·eARC 등급
export const SOUNDBAR_SURROUND_OPTS = labelOpts('surroundType'); // virtual(없음(가상))은 추가 필드 없음
export const SOUNDBAR_ARC_OPTS: SelectOption[] = [labelOpt('arcSupport', 'not_supported'), 'ARC', 'eARC'];
// 사운드바 서브우퍼 포함 여부
export const SOUNDBAR_SUB_OPTS = labelOpts('subIncluded'); // none(미포함)을 옵션으로 명시(안 적은 것과 구분)
// 사운드바 룸 보정 / 음성 비서
export const SOUNDBAR_ROOMCAL_OPTS = labelOpts('roomCal');
export const SOUNDBAR_VOICE_OPTS = ['Alexa', 'Google Assistant', 'Bixby'];

// ── 드라이버 구성 빌더 데이터 (스피커) ──
// 종류 선택에 따라 구조/재질 옵션이 바뀜(cascading). 동축은 재질 대신 담당대역 사용.
export const DRIVER_TYPES = ['우퍼', '미드우퍼', '미드레인지', '트위터', '슈퍼 트위터', '동축', '풀레인지', '패시브 라디에이터'];
export const COAXIAL_BANDS = ['우퍼 + 트위터', '미드레인지 + 트위터', '우퍼 + 미드레인지 + 트위터'];
// 콘 계열 재질 (우퍼·미드우퍼 공용)
const SPK_CONE_MATS = ['페이퍼', '코팅 페이퍼', '폴리프로필렌', '케블라', '알루미늄', '마그네슘', '카본 파이버', '글래스 파이버', '세라믹', '복합 소재'];
export const DRIVER_STRUCT: Record<string, string[]> = {
  '우퍼': ['콘 타입'],
  '미드우퍼': ['콘 타입'],
  '미드레인지': ['콘 타입', '돔 타입', '혼 타입', '플래너 타입', '정전형'],
  '트위터': ['돔 타입', '콘 타입', '혼 타입', '리본 타입', 'AMT 타입', '플래너 타입', '정전형', '링 라디에이터'],
  '슈퍼 트위터': ['혼 타입', '돔 타입', '리본 타입', 'AMT 타입', '플래너 타입'],
  '동축': ['일반 동축', 'Dual Concentric', 'Uni-Q'],
  '풀레인지': ['콘 타입', '플래너 타입', '정전형'],
};
export const DRIVER_MATERIAL: Record<string, string[]> = {
  '우퍼': SPK_CONE_MATS,
  '미드우퍼': SPK_CONE_MATS,
  '미드레인지': ['페이퍼', '코팅 페이퍼', '폴리프로필렌', '케블라', '알루미늄', '마그네슘', '카본 파이버', '글래스 파이버', '세라믹', '실크', '복합 소재'],
  '트위터': ['실크', '알루미늄', '티타늄', '베릴륨', '다이아몬드', '세라믹', 'AMT 필름', '복합소재'],
  '슈퍼 트위터': ['실크', '알루미늄', '티타늄', '베릴륨', '다이아몬드', '세라믹', '마그네슘', '복합 소재'],
  '풀레인지': ['페이퍼', '코팅 페이퍼', '폴리프로필렌', '알루미늄', '마그네슘', '카본 파이버', '글래스 파이버', '복합 소재'],
};

// ── 스피커 스펙 필드 (형식=패시브/액티브에 따라 showWhen으로 분기) ──
// 타입·형식만 먼저 보이고, 형식 선택 시 패시브/액티브 블록이 갈려 노출됨.
// ⚠️ 인클로저·주파수 응답은 패시브/액티브에서 위치가 달라(같은 key로) 블록마다 따로 배치.
//    showWhen이 배타적(isPassive XOR isActive)이라 동시에 렌더되지 않아 key 충돌 없음.
export const SPEAKER_SPEC_FIELDS: CategorySpecField[] = [
  { key: 'type', label: '타입', input: { kind: 'auto' } },
  { key: 'speakerDetail', label: '형식', input: { kind: 'select', options: SPEAKER_DETAIL_OPTS } },
  // ── 사운드바 전용: 채널 구성 (단일 드롭다운) ──
  { key: 'channelConfig', label: '채널 구성', input: { kind: 'select', options: SOUNDBAR_CHANNEL_OPTS }, showWhen: isSoundbar },
  { key: 'audioFormats', label: '지원 포맷', input: { kind: 'multi', options: SOUNDBAR_AUDIO_FORMATS }, showWhen: isSoundbar },
  { key: 'surroundType', label: '서라운드 스피커', input: { kind: 'select', options: SOUNDBAR_SURROUND_OPTS }, showWhen: isSoundbar },
  { key: 'surroundPower', label: '서라운드 스피커 출력', input: { kind: 'numSelect', unit: 'W', options: ['RMS', 'Peak'] }, showWhen: surrIncl },
  { key: 'surroundDimensions', label: '서라운드 스피커 크기', input: { kind: 'dimensions' }, showWhen: surrIncl },
  { key: 'surroundWeight', label: '서라운드 스피커 무게', input: { kind: 'text', unit: 'kg' }, showWhen: surrIncl },
  { key: 'surroundCount', label: '서라운드 스피커 개수', input: { kind: 'text', unit: '개' }, showWhen: surrIncl },
  { key: 'arcSupport', label: 'ARC/eARC', input: { kind: 'select', options: SOUNDBAR_ARC_OPTS }, showWhen: isSoundbar },
  { key: 'roomCal', label: '룸 보정', input: { kind: 'select', options: SOUNDBAR_ROOMCAL_OPTS }, showWhen: isSoundbar },
  { key: 'voiceAssistant', label: '음성 비서', input: { kind: 'multi', options: SOUNDBAR_VOICE_OPTS }, showWhen: isSoundbar },
  { key: 'subIncluded', label: '서브우퍼 포함', input: { kind: 'select', options: SOUNDBAR_SUB_OPTS }, showWhen: isSoundbar },
  { key: 'subSize', label: '서브우퍼 유닛 크기', input: { kind: 'text', unit: 'inch' }, showWhen: subIncl },
  { key: 'subPower', label: '서브우퍼 출력', input: { kind: 'numSelect', unit: 'W', options: ['RMS', 'Peak'] }, showWhen: subIncl },
  { key: 'subDimensions', label: '서브우퍼 크기', input: { kind: 'dimensions' }, showWhen: subIncl },
  { key: 'subWeight', label: '서브우퍼 무게', input: { kind: 'text', unit: 'kg' }, showWhen: subIncl },
  // ── 드라이버 구성 (패시브·액티브 공용: 종류/구조/재질/크기/개수 빌더) — 사운드바 제외(파생 키가 스피커 필터에 섞임) ──
  { key: 'driverComposition', label: '드라이버 구성', input: { kind: 'drivers' }, showWhen: (s) => detailSet(s) && !isSoundbar(s) },

  // ── 패시브 블록 (기존 순서 유지) ──
  { key: 'enclosure', label: '인클로저', input: { kind: 'searchSelect', options: SPEAKER_ENCLOSURE_OPTS, aliases: SPEAKER_ENCLOSURE_ALIASES, keyboardLayout: true }, showWhen: isPassive },
  { key: 'speakerImpedance', label: '임피던스', input: { kind: 'text', unit: 'Ω' }, showWhen: isPassive }, // 숫자 칸(소수 허용), 숫자 저장('8', '3.2'). 필터는 구간(SPEAKER_IMPEDANCE_BUCKETS), 상세는 숫자 + Ω. 앰프 지원 임피던스(impedance)와 다른 칸
  { key: 'sensitivity', label: '감도', input: { kind: 'text', unit: 'dB' }, showWhen: isPassive },
  { key: 'freqResponse', label: '주파수 응답', input: { kind: 'range', lowUnit: 'Hz', highUnit: 'kHz' }, showWhen: passiveNoSub }, // 서브우퍼는 Hz 한 칸(꼬리)으로 대체
  { key: 'recPower', label: '권장 앰프 출력', input: { kind: 'text', unit: 'W' }, showWhen: isPassive },
  { key: 'crossover', label: '크로스오버', input: { kind: 'crossover' }, showWhen: passiveNoSub }, // 서브우퍼 제외

  // ── 액티브 블록 (앰프구성→앰프출력→앰프클래스→크로스오버방식→주파수응답→입력단자→출력단자→무선→인클로저) ──
  { key: 'ampConfig', label: '앰프 구성', input: { kind: 'select', options: SPK_AMP_CONFIG_OPTS }, showWhen: activeFull }, // 서브우퍼·사운드바 제외
  { key: 'ampPower', label: '앰프 출력', input: { kind: 'ampPower' }, showWhen: activeFull }, // 드라이버 종류 + 출력값 빌더 (서브우퍼·사운드바 제외)
  { key: 'ampPower', label: '앰프 출력', input: { kind: 'numSelect', unit: 'W', options: ['RMS', 'Peak'] }, showWhen: activeSub }, // 서브우퍼: 출력값(W) + RMS/Peak
  { key: 'totalPower', label: '총 출력', input: { kind: 'numSelect', unit: 'W', options: ['RMS', 'Peak'] }, showWhen: isSoundbar }, // 사운드바: 총 출력(W) + RMS/Peak
  { key: 'opClass', label: '동작 클래스', input: { kind: 'select', options: AMP_CLASS_OPTS }, showWhen: activeNoBar }, // 앰프 재사용 (사운드바 제외)
  { key: 'crossoverType', label: '크로스오버 방식', input: { kind: 'select', options: SPK_CROSSOVER_TYPE_OPTS }, showWhen: activeFull }, // 서브우퍼(크로스오버 조절 범위로 대체), 사운드바 제외
  { key: 'freqResponse', label: '주파수 응답', input: { kind: 'range', lowUnit: 'Hz', highUnit: 'kHz' }, showWhen: activeNoSub }, // 크로스오버 방식 아래 (서브우퍼 제외)
  { key: 'inputs', label: '입력 단자', input: { kind: 'multi', options: AMP_INPUT_TERMINALS }, showWhen: isActive }, // 앰프 재사용
  { key: 'outputs', label: '출력 단자', input: { kind: 'multi', options: AMP_OUTPUT_TERMINALS }, showWhen: isActive }, // 앰프 재사용 (입력 단자 아래)
  { key: 'wireless', label: '무선/네트워크', input: { kind: 'multi', options: AMP_WIRELESS }, showWhen: isActive }, // 앰프 재사용
  { key: 'enclosure', label: '인클로저', input: { kind: 'searchSelect', options: SPEAKER_ENCLOSURE_OPTS, aliases: SPEAKER_ENCLOSURE_ALIASES, keyboardLayout: true }, showWhen: activeNoBar }, // 마감 바로 위 (사운드바 제외)

  // ── 서브우퍼 전용: 방사 방향, 주파수 응답(Hz~Hz), 크로스오버 조절 범위(액티브만), 위상 조절 (패시브, 액티브 공통) ──
  { key: 'firingDirection', label: '방사 방향', input: { kind: 'select', options: SUB_FIRING_OPTS }, showWhen: detailSub },
  { key: 'freqResponse', label: '주파수 응답', input: { kind: 'range', lowUnit: 'Hz', highUnit: 'Hz' }, showWhen: detailSub },
  { key: 'crossoverRange', label: '크로스오버 조절 범위', input: { kind: 'range', lowUnit: 'Hz', highUnit: 'Hz' }, showWhen: activeSub }, // 예 40Hz~120Hz (크로스오버 방식 대신, 주파수 응답과 같은 범위 표기)
  { key: 'phaseControl', label: '위상 조절', input: { kind: 'select', options: SPK_PHASE_OPTS }, showWhen: detailSub },
  // ── 꼬리: 마감(공통) · 전원(액티브만) · 크기 · 무게(공통) ──
  { key: 'finish', label: '마감(색상)', input: { kind: 'text', free: true }, showWhen: detailSet },
  { key: 'voltage', label: '전원 전압', input: { kind: 'select', options: AMP_VOLTAGE_OPTS }, showWhen: isActive }, // 앰프 재사용(한글 저장) — 액티브만(패시브는 전원부 없음)
  { key: 'dimensions', label: '크기', input: { kind: 'dimensions' }, showWhen: detailSet },
  { key: 'weight', label: '무게', input: { kind: 'valueNote', unit: 'kg' }, showWhen: detailSet }, // 3단계: 무게 빌더 — 스피커
  { ...OTHER_SPECS_FIELD, showWhen: detailSet }, // 기타 사양 (맨 끝, 스피커 꼬리처럼 형식 선택 후)
];

// ── 소스기기(턴테이블) 옵션 상수 ──
// select·speeds: labels.ts(SPEC_LABELS) 파생 — 영문키 저장, browse 필터 키(driveType/cartridge/speeds 등)와 일치
export const TT_DRIVE_OPTS = labelOpts('driveType');            // belt_drive / direct_drive / idler_drive
export const TT_SPEED_OPTS = labelOpts('speeds');               // 33 / 45 / 78 (다중 선택, 영문키 저장)
export const TT_AUTO_OPTS = labelOpts('autoMode');              // full_auto / semi_auto / manual
export const TT_CARTRIDGE_OPTS = labelOpts('cartridge');        // included / not_included
export const TT_PHONO_BUILTIN_OPTS = labelOpts('phonoBuiltIn'); // built_in / none
export const TT_BLUETOOTH_OPTS = labelOpts('bluetooth');        // none / rx / tx / rx_tx
export const TT_DUSTCOVER_OPTS = labelOpts('dustCover');        // yes / no / damaged (중고라 '손상 있음' 포함)
// 출력 단자 — 턴테이블 전용 짧은 목록 (턴테이블은 입력 없는 출력 기기. RCA/XLR/USB 검색 별칭은 TERMINAL_ALIASES 재사용)
export const TT_OUTPUT_TERMINALS = ['RCA Out', 'XLR Out', '3.5mm', 'Headphone Out', 'USB'];
// ── 2단계: 하위 유형(ttType) 분기 옵션 ──
export const TT_TYPE_OPTS = labelOpts('ttType');                  // hifi / all_in_one / dj
export const TT_PLATTER_OPTS = labelOpts('platterMaterial');      // aluminum_diecast / acrylic / glass / steel / mdf / plastic
export const TT_TONEARM_SHAPE_OPTS = labelOpts('tonearmShape');   // straight / s_shape / j_shape
export const TT_TONEARM_OPTS = labelOpts('tonearm');              // included / not_included / replaced — 빈티지 톤암 교체 대응
export const TT_EXTRA_FEATURES: SelectOption[] = [labelOpt('extraFeatures', 'fm_am_radio'), labelOpt('extraFeatures', 'cassette'), 'CD', labelOpt('extraFeatures', 'usb_playback'), labelOpt('extraFeatures', 'recording')]; // 올인원, 빈티지 콘솔 부가 기능
export const TT_PITCH_RANGE_OPTS = ['±8%', '±10%', '±16%', '±24%', '±50%'];           // DJ 피치 조절 폭 (다중)
// ── 3단계: 구성품 조건부 옵션 ──
// 카트리지 방식 — 포노앰프 PHONO_CARTRIDGE_OPTS와 'MM'/'MC' 문자열 동일(교차 검색). 세라믹은 올인원용 추가
export const TT_CART_TYPE_OPTS: SelectOption[] = ['MM', 'MC', labelOpt('cartType', 'ceramic')];
export const TT_SPEAKER_CONFIG_OPTS = labelOpts('speakerConfig'); // built_in / detachable / none

// ── 카세트 데크 옵션 (1단계 공통) — select·multi는 labelOpts(영문키 저장), 단자·헤드재질은 문자열 ──
export const CAS_HEAD_COUNT_OPTS = labelOpts('headCount');        // two_head / three_head
export const CAS_DECK_COUNT_OPTS = labelOpts('deckCount');        // single / double (★축D 트리거)
export const CAS_AUTOREVERSE_OPTS = labelOpts('autoReverse');     // none / playback / rec_play (★축C 트리거)
export const CAS_CAPSTAN_OPTS = labelOpts('capstan');             // single / dual
export const CAS_DRIVE_OPTS = labelOpts('transportDrive');        // direct / dc_servo / belt
export const CAS_BIAS_OPTS = labelOpts('bias');                   // fixed / fine / manual_cal
export const CAS_METER_OPTS = labelOpts('levelMeter');            // analog_vu / fluorescent / led_peak
export const CAS_TAPE_TYPE_OPTS = labelOpts('tapeType');          // 녹음 가능 테이프 I/II/IV/FeCr (예전 '지원 테이프(재생)' 칸을 흡수해 FeCr 포함)
export const CAS_NR_OPTS = labelOpts('noiseReduction');           // Dolby B/C/S/dbx (HX Pro는 NR 아님 → 별도 YES_NO)
export const CAS_HEAD_MATERIALS = labelOpts('headMaterial'); // searchSelect — 고르면 영문 키, 목록에 없는 글(Laser Amorphous 등)은 친 그대로
export const CAS_INPUT_TERMINALS = ['RCA', 'Mic In'];             // 녹음 입력 (TERMINAL_ALIASES 재사용)
export const CAS_OUTPUT_TERMINALS = ['RCA Out', 'Headphone Out', 'USB'];     // 재생 출력 + USB 디지털
export const CAS_SNR_NR_OPTS = ['NR Off', 'Dolby B', 'Dolby C', 'Dolby S', 'dbx']; // S/N numSelect 조건(선택)
export const CAS_WF_STD_OPTS = ['WRMS', 'DIN', 'NAB', 'IEC', 'JIS'];               // W&F numSelect 측정규격(선택)
// ── 카세트 2단계: 3축 분기 하위필드 옵션 ──
export const CAS_DUBBING_SPEED_OPTS = labelOpts('dubbingSpeed');   // realtime / high_speed / both
export const CAS_REVERSE_METHOD_OPTS = labelOpts('reverseMethod'); // head_rotate / tape_flip(UDAR) / naac
// ── 카세트 3단계: 정비/상태 옵션 (외관/작동 상태와 별개 — 카세트 고유 소모품 상태) ──
export const CAS_HEAD_WEAR_OPTS = labelOpts('headWear');          // good / light_wear / relapped / replaced / heavy_wear
// 정비 이력 — 모든 카테고리 공통, 업로드 폼 제품 정보(작동 상태 아래) 칸. 저장 자리는 그대로 specs.tech.maintenance (영문키 배열, 직접 입력 글도 가능)
export const MAINTENANCE_OPTS = labelOpts('maintenance');         // recap / belt / tube / edge / overhaul / none (multi, 공통 목록)
export const CAS_REC_FUNCTION_OPTS = labelOpts('recFunction');    // normal / playback_only / broken (결함 고지)

// ── 소스기기 스펙 필드 (2단계: 하위유형 분기까지 — 구성품 세부는 3단계) ──
// 턴테이블 외 하위(CD 플레이어 등)는 타입 + 공통 꼬리(마감/전원/크기/무게)만 노출. 추후 하위별 블록 추가.
// 하위 유형(ttType) 미선택 시: 공통 필드만. 하이파이·DJ=기계부(모터~접지) / 올인원=편의(부가기능·포터블) / DJ=+퍼포먼스(토크·피치·역재생)
export const SOURCE_SPEC_FIELDS: CategorySpecField[] = [
  { key: 'type', label: '타입', input: { kind: 'auto' } },
  { key: 'ttType', label: '형식', input: { kind: 'select', options: TT_TYPE_OPTS }, showWhen: ttTypeShown }, // ★ 분기 키 (스피커 '형식'과 동일 패턴). FEATURE_FLAGS.turntableType 꺼짐: 숨김
  // ── 턴테이블: 구동·회전 (전 유형) ──
  { key: 'driveType', label: '구동 방식', input: { kind: 'select', options: TT_DRIVE_OPTS }, showWhen: isTurntable },
  { key: 'motorType', label: '모터', input: { kind: 'text', free: true }, showWhen: ttHifiOrDj }, // 예: AC 싱크로너스, DC 서보
  { key: 'speeds', label: '회전수', input: { kind: 'multi', options: TT_SPEED_OPTS }, showWhen: isTurntable },
  { key: 'autoMode', label: '조작 방식', input: { kind: 'select', options: TT_AUTO_OPTS }, showWhen: isTurntable },
  { key: 'wowFlutter', label: '와우 앤 플러터', input: { kind: 'text', free: true }, showWhen: ttHifiOrDj }, // 측정 기준 혼재(WRMS/JIS)라 자유 입력
  { key: 'snr', label: 'S/N', input: { kind: 'text', unit: 'dB' }, showWhen: ttHifiOrDj }, // 앰프와 동일 키 재사용
  // ── 턴테이블: 플래터·톤암 (하이파이·DJ — 올인원은 무의미라 숨김) ──
  { key: 'platterMaterial', label: '플래터 재질', input: { kind: 'select', options: TT_PLATTER_OPTS }, showWhen: ttHifiOrDj },
  { key: 'tonearmShape', label: '톤암 형태', input: { kind: 'select', options: TT_TONEARM_SHAPE_OPTS }, showWhen: ttHifiOrDj },
  { key: 'tonearm', label: '톤암', input: { kind: 'select', options: TT_TONEARM_OPTS }, showWhen: ttHifiOrDj }, // 포함/미포함/교체됨 — 빈티지 톤암 교체 대응
  { key: 'headshellRemovable', label: '헤드셸 교체', input: { kind: 'select', options: YES_NO_OPTS }, showWhen: ttHifiOrDj },
  { key: 'trackingForceAdj', label: '침압 조절', input: { kind: 'select', options: YES_NO_OPTS }, showWhen: ttHifiOrDj },
  { key: 'antiSkating', label: '안티스케이팅', input: { kind: 'select', options: YES_NO_OPTS }, showWhen: ttHifiOrDj },
  // ── 턴테이블: 구성품 조건부 (포함/내장 선택 시 세부 노출 — 사운드바 subIncluded 패턴) ──
  { key: 'cartridge', label: '카트리지', input: { kind: 'select', options: TT_CARTRIDGE_OPTS }, showWhen: isTurntable },
  { key: 'cartType', label: '카트리지 방식', input: { kind: 'select', options: TT_CART_TYPE_OPTS }, showWhen: ttCartIncl },
  { key: 'cartModel', label: '카트리지 모델', input: { kind: 'text', free: true }, showWhen: ttCartIncl }, // 예: Ortofon 2M Red
  { key: 'phonoBuiltIn', label: '포노앰프 내장', input: { kind: 'select', options: TT_PHONO_BUILTIN_OPTS }, showWhen: isTurntable },
  { key: 'phonoBypass', label: '포노/라인 전환', input: { kind: 'select', options: YES_NO_OPTS }, showWhen: ttPhonoBuilt },
  // ── 턴테이블: 올인원·포터블 전용 (스피커 출력은 사운드바 totalPower 패턴) ──
  { key: 'speakerConfig', label: '스피커 구성', input: { kind: 'select', options: TT_SPEAKER_CONFIG_OPTS }, showWhen: isTtAllInOne },
  { key: 'speakerPower', label: '스피커 출력', input: { kind: 'numSelect', unit: 'W', options: ['RMS', 'Peak'] }, showWhen: ttSpkIncl },
  { key: 'extraFeatures', label: '부가 기능', input: { kind: 'multi', options: TT_EXTRA_FEATURES }, showWhen: isTtAllInOne },
  { key: 'portable', label: '포터블(배터리)', input: { kind: 'select', options: YES_NO_OPTS }, showWhen: isTtAllInOne },
  // ── 턴테이블: DJ 전용 퍼포먼스 ──
  { key: 'startingTorque', label: '시작 토크', input: { kind: 'text', unit: 'kg·cm' }, showWhen: isTtDj },
  { key: 'pitchRange', label: '피치 조절 폭', input: { kind: 'multi', options: TT_PITCH_RANGE_OPTS }, showWhen: isTtDj },
  { key: 'reversePlay', label: '역재생', input: { kind: 'select', options: YES_NO_OPTS }, showWhen: isTtDj },
  // ── 턴테이블: 연결 ──
  { key: 'bluetooth', label: '블루투스', input: { kind: 'select', options: TT_BLUETOOTH_OPTS }, showWhen: isTurntable },
  { key: 'outputs', label: '출력 단자', input: { kind: 'multi', options: TT_OUTPUT_TERMINALS }, showWhen: isTurntable },
  { key: 'groundTerminal', label: '접지 단자', input: { kind: 'select', options: YES_NO_OPTS }, showWhen: ttHifiOrDj }, // 앰프 포노 그룹과 동일 키 재사용
  { key: 'dustCover', label: '더스트 커버', input: { kind: 'select', options: TT_DUSTCOVER_OPTS }, showWhen: isTurntable },

  // ── 카세트 데크 (1단계: 공통 필드 — 3축 트리거 포함, 축 하위필드는 2단계 / 정비는 3단계) ──
  { key: 'headCount', label: '헤드 수', input: { kind: 'select', options: CAS_HEAD_COUNT_OPTS }, showWhen: isCassette },
  { key: 'deckCount', label: '데크 수', input: { kind: 'select', options: CAS_DECK_COUNT_OPTS }, showWhen: isCassette },        // ★ 축D 트리거
  { key: 'dubbingSpeed', label: '더빙 속도', input: { kind: 'select', options: CAS_DUBBING_SPEED_OPTS }, showWhen: casDouble },  // 더블만
  { key: 'parallelRec', label: '병렬 동시 녹음', input: { kind: 'select', options: YES_NO_OPTS }, showWhen: casDouble },         // 더블만
  { key: 'continuousPlay', label: '연속 재생(릴레이)', input: { kind: 'select', options: YES_NO_OPTS }, showWhen: casDouble },   // 더블만
  { key: 'autoReverse', label: '오토리버스', input: { kind: 'select', options: CAS_AUTOREVERSE_OPTS }, showWhen: isCassette },  // ★ 축C 트리거
  { key: 'reverseMethod', label: '리버스 방식', input: { kind: 'select', options: CAS_REVERSE_METHOD_OPTS }, showWhen: casAutoRev }, // 리버스≠없음만
  { key: 'headMaterial', label: '헤드 재질', input: { kind: 'searchSelect', options: CAS_HEAD_MATERIALS }, showWhen: isCassette },
  { key: 'capstan', label: '캡스턴', input: { kind: 'select', options: CAS_CAPSTAN_OPTS }, showWhen: isCassette },
  { key: 'transportDrive', label: '구동 방식', input: { kind: 'select', options: CAS_DRIVE_OPTS }, showWhen: isCassette },
  { key: 'tapeTypeRec', label: '녹음 가능 테이프', input: { kind: 'multi', options: CAS_TAPE_TYPE_OPTS }, showWhen: isCassette }, // '지원 테이프(재생)' 칸을 흡수
  { key: 'noiseReduction', label: '노이즈 리덕션', input: { kind: 'multi', options: CAS_NR_OPTS }, showWhen: isCassette },
  { key: 'hxPro', label: 'Dolby HX Pro', input: { kind: 'select', options: YES_NO_OPTS }, showWhen: isCassette },              // NR 아님(녹음 바이어스)이라 별도
  { key: 'bias', label: '바이어스 조정', input: { kind: 'select', options: CAS_BIAS_OPTS }, showWhen: isCassette },
  { key: 'freqResponse', label: '주파수 응답', input: { kind: 'range', lowUnit: 'Hz', highUnit: 'kHz' }, showWhen: isCassette }, // 대표값(보통 Metal)
  { key: 'snr', label: 'S/N', input: { kind: 'numSelect', unit: 'dB', options: CAS_SNR_NR_OPTS }, showWhen: isCassette },        // 값 + NR 조건(선택)
  { key: 'wowFlutter', label: '와우 앤 플러터', input: { kind: 'numSelect', unit: '%', options: CAS_WF_STD_OPTS }, showWhen: isCassette }, // 값 + 측정규격(선택)
  { key: 'thd', label: 'THD', input: { kind: 'text', unit: '%' }, showWhen: isCassette },
  { key: 'inputs', label: '입력 단자', input: { kind: 'multi', options: CAS_INPUT_TERMINALS }, showWhen: isCassette },          // 녹음 입력
  { key: 'outputs', label: '출력 단자', input: { kind: 'multi', options: CAS_OUTPUT_TERMINALS }, showWhen: isCassette },        // 재생 출력 + USB
  { key: 'levelMeter', label: '레벨 미터', input: { kind: 'select', options: CAS_METER_OPTS }, showWhen: isCassette },
  { key: 'pitchControl', label: '피치 컨트롤', input: { kind: 'select', options: YES_NO_OPTS }, showWhen: isCassette },
  // ── 카세트 정비/상태 (3단계 — isCassette 게이트, 외관/작동 상태와 별개 축. 정비 이력은 제품 정보 공통 칸으로 옮김) ──
  { key: 'headWear', label: '헤드 상태', input: { kind: 'select', options: CAS_HEAD_WEAR_OPTS }, showWhen: isCassette },
  { key: 'recFunction', label: '녹음 기능', input: { kind: 'select', options: CAS_REC_FUNCTION_OPTS }, showWhen: isCassette }, // 결함 고지 핵심(재생전용/불가)
  // ── 공통 꼬리 (소스기기 전체 — 게이트 없음, 앰프/스피커와 동일 키 재사용) ──
  { key: 'finish', label: '마감(색상)', input: { kind: 'text', free: true } },
  { key: 'voltage', label: '전원 전압', input: { kind: 'select', options: AMP_VOLTAGE_OPTS } },
  { key: 'dimensions', label: '크기', input: { kind: 'dimensions' } },
  { key: 'weight', label: '무게', input: { kind: 'valueNote', unit: 'kg' } }, // 3단계: 무게 빌더 — 소스기기
  OTHER_SPECS_FIELD, // 기타 사양 (맨 끝)
];

// 핵심/상세 사양 분리 — 여기 적힌 하위 카테고리만 폼이 "핵심 사양"(항상 표시)과 "상세 사양"(접힘)으로 나눔.
//   값 = 핵심으로 둘 필드 key. 타입(auto)은 늘 맨 위 그대로. 목록에 없는 key는 상세로. 저장 키(specs.tech)는 바뀌지 않음.
//   적용 안 된 하위 카테고리(공통 꼬리 5칸뿐인 소스기기 12종 등)와 케이블(폴백)은 지금처럼 전부 한 번에 표시.
const AMP_CORE_7 = ['channel', 'device', 'powerRated', 'impedance', 'phono', 'voltage']; // 리모컨은 2026-11-09 핵심에서 빼 상세 사양으로 (앰프 하위 공통)
const SPEAKER_CORE = ['speakerDetail', 'driverComposition', 'enclosure', 'speakerImpedance', 'sensitivity', 'recPower', 'voltage'];
// 북쉘프, 플로어 스탠딩 — 권장 앰프 출력(recPower)은 2026-11-10 핵심에서 뺌 (상세 모드 'custom'이라 칸이 숨고 저장 안 함, 필요하면 사양 추가로)
const SPEAKER_CORE_NO_REC = SPEAKER_CORE.filter((k) => k !== 'recPower');
// 접기가 켜진 하위 카테고리(CORE_SPEC_KEYS)에서 늘 보이는 칸 — 핵심 칸 맨 아래(전원 다음), 그 밑에 '상세 사양' 버튼. 상세 개수에서 빠짐
export const ALWAYS_SPEC_KEYS = ['dimensions', 'weight'];
export const CORE_SPEC_KEYS: Record<string, string[]> = {
  프리앰프: ['channel', 'device', 'phono', 'voltage'],
  파워앰프: AMP_CORE_7,
  인티앰프: AMP_CORE_7,
  '네트워크 앰프': AMP_CORE_7,
  리시버: AMP_CORE_7,
  포노앰프: ['device', 'cartridgeSupport', 'mcGain', 'voltage'],
  'MC 스텝업 헤드앰프': ['device', 'mcHeadGain', 'voltage'],
  'MC 스텝업 트랜스': ['sutRatio'],
  '헤드폰 앰프': ['device', 'hpOutputs', 'hpImpedanceRange', 'hpForm', 'voltage'],
  'AV 리시버': ['avrChannels', 'powerRated', 'hdmiIn', 'videoPassthrough', 'arcSupport', 'audioFormats', 'voltage'],
  // 스피커 4종 — 감도, 권장 앰프 출력은 패시브만, 전원은 액티브만(기존 showWhen 그대로)
  '북쉘프 스피커': SPEAKER_CORE_NO_REC,
  '플로어 스탠딩 스피커': SPEAKER_CORE_NO_REC,
  '톨보이 스피커': SPEAKER_CORE,
  '센터 스피커': SPEAKER_CORE,
  사운드바: ['channelConfig', 'arcSupport', 'subIncluded', 'surroundType'],
  // 서브우퍼 — 인클로저는 패시브, 액티브 둘 다 / 앰프 출력, 전원은 액티브만(기존 showWhen)
  서브우퍼: ['speakerDetail', 'driverComposition', 'enclosure', 'ampPower', 'freqResponse', 'voltage'],
  // 턴테이블 — 톤암은 기존 규칙대로 형식이 하이파이, DJ일 때만
  턴테이블: ['ttType', 'driveType', 'speeds', 'autoMode', 'tonearm', 'cartridge', 'phonoBuiltIn', 'voltage'],
  '카세트 데크': ['headCount', 'autoReverse', 'capstan', 'noiseReduction', 'tapeTypeRec', 'headWear', 'voltage'], // 정비 이력은 제품 정보 공통 칸으로 옮김. 전원 전압은 2026-11-10 핵심으로
  // CD 플레이어, 튜너 — 원래 분리 없음(마감, 전원, 크기, 무게뿐). 2026-11-10 상세 모드 'custom'을 켜려고 전원 전압만 핵심으로
  'CD 플레이어': ['voltage'],
  튜너: ['voltage'],
};

// 하위 카테고리별 상세 모드 스위치 — 'fields'(기본) = 정해진 상세 칸 + '상세 사양 (N)' 버튼 + 기타 사양
//   'custom' = 상세 칸(핵심, 크기, 무게 밖의 칸 전부, 기타 사양 포함)을 숨기고 저장도 안 함, 대신 [제목][내용] 자유 추가(specs.tech.customSpecs)
//   칸 정의와 라벨은 그대로 남음. 다른 하위 카테고리도 여기 한 줄만 넣으면 켜짐 (CORE_SPEC_KEYS 에 있는 하위 카테고리만 의미 있음)
//   2026-11-09 프리앰프, 2026-11-10 보이는 카테고리 나머지 9개 (숨는 칸 목록: docs/hidden.md '상세 사양 숨김 목록')
//   숨긴 카테고리(헤드폰 앰프 등)는 정해진 칸 그대로. 켤 때 여기 'custom' 한 줄도 같이
export type DetailMode = 'fields' | 'custom';
export const DETAIL_MODE_BY_SUB: Record<string, DetailMode> = {
  프리앰프: 'custom',
  파워앰프: 'custom',
  인티앰프: 'custom',
  리시버: 'custom',
  '북쉘프 스피커': 'custom',
  '플로어 스탠딩 스피커': 'custom',
  턴테이블: 'custom',
  '카세트 데크': 'custom',
  'CD 플레이어': 'custom',
  튜너: 'custom',
};
export const detailModeOf = (sub: string): DetailMode => DETAIL_MODE_BY_SUB[sub] ?? 'fields';
// 이 하위 카테고리에서 상세 모드 때문에 숨는 칸인가 (폼 그리기, 폼 저장, 상세 페이지 표시, 시드 조립과 검사가 같이 씀)
export const hiddenByDetailMode = (sub: string, f: CategorySpecField): boolean => {
  const core = CORE_SPEC_KEYS[sub];
  if (!core || detailModeOf(sub) !== 'custom') return false;
  return f.input.kind !== 'auto' && !core.includes(f.key) && !ALWAYS_SPEC_KEYS.includes(f.key);
};
// 자유 추가 사양 한 줄 (specs.tech.customSpecs 원소). 제목이나 내용이 빈 줄은 저장 안 함
export type CustomSpecRow = { title: string; value: string };
export const cleanCustomSpecs = (rows: CustomSpecRow[]): CustomSpecRow[] =>
  rows.map((r) => ({ title: r.title.trim(), value: r.value.trim() })).filter((r) => r.title && r.value);

// 대분류(한글) → 스펙 필드 세트. 정의 없는 카테고리는 폼이 기존 SPEC_FIELDS로 폴백.
export const SPEC_FIELDS_BY_CATEGORY: Record<string, CategorySpecField[]> = {
  앰프: AMP_SPEC_FIELDS,
  스피커: SPEAKER_SPEC_FIELDS,
  소스기기: SOURCE_SPEC_FIELDS,
};
