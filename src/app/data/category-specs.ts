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

// select 옵션: 문자열(저장값=표시 동일, 예 앰프 '트랜지스터') 또는
//   { value(저장·영문키), label(표시·한글) } — 스피커는 labels.ts와 맞추려 영문키 저장+한글 표시.
export type SelectOption = string | { value: string; label: string };

// ── 입력 방식 ──
export type SpecInput =
  | { kind: 'auto' }                                            // 타입 — 카테고리에서 자동 입력
  | { kind: 'select'; options: SelectOption[] }                 // 드롭다운 단일 선택 (native select)
  | { kind: 'searchSelect'; options: string[]; aliases?: Record<string, string>; keyboardLayout?: boolean } // 검색 드롭다운(Typeahead) — 한글 저장. aliases=한글→영어 검색어, keyboardLayout=한영 오타 매칭
  | { kind: 'text'; unit?: string; free?: boolean }             // 숫자 입력 + (선택)단위 / free=true면 자유 텍스트(숫자 필터 X)
  | { kind: 'numSelect'; unit?: string; options: string[] }     // 숫자 입력 + 오른쪽 드롭다운 (예: 출력값 + RMS/Peak)
  | { kind: 'range'; lowUnit: string; highUnit: string }        // 하한~상한 2칸
  | { kind: 'dimensions' }                                      // 가로×깊이×높이 3칸 (mm)
  | { kind: 'power' }                                           // 출력값(W) + 기준 옴, 쌍 추가 가능
  | { kind: 'multi'; options: string[] }                        // 다중 선택 버튼 (임피던스/입력·출력 단자)
  | { kind: 'crossover' }                                       // 크로스오버 — 주파수(Hz) 여러 개 반복 입력 + 추가 버튼
  | { kind: 'drivers' }                                         // 드라이버 구성 빌더 (종류/구조/재질/크기/개수 — 패시브·액티브 공용)
  | { kind: 'ampPower' };                                       // 앰프 출력 빌더 (액티브 — 드라이버 종류 + 출력값)

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

// labels.ts의 "영문키 → 한글" 표에서 select 옵션({value:영문키, label:한글})을 만든다.
//   저장은 영문키(필터/labels.ts와 일치), 화면 표시는 한글. only를 주면 그 키만(순서는 labels.ts 정의 순).
import { SPEC_LABELS } from '@/lib/labels';
const labelOpts = (ns: string, only?: string[]): { value: string; label: string }[] =>
  Object.entries(SPEC_LABELS[ns] ?? {})
    .filter(([v]) => !only || only.includes(v))
    .map(([value, m]) => ({ value, label: m.ko ?? value }));

// ── 앰프 옵션 상수 ──
export const AMP_CHANNEL_OPTS = ['모노블럭', '스테레오', '멀티채널'];
export const AMP_DEVICE_OPTS = ['진공관', '트랜지스터', '하이브리드'];
export const AMP_CLASS_OPTS = ['Class A', 'Class AB', 'Class B', 'Class D', 'Class G', 'Class H']; // 동작 클래스
export const AMP_OHM_OPTS = ['2Ω', '4Ω', '6Ω', '8Ω', '16Ω']; // 정격 출력 기준 옴 + 지원 임피던스 공용
export const AMP_PHONO_OPTS = ['MM', 'MC', 'MM/MC', '없음'];
export const YES_NO_OPTS = ['있음', '없음'];
export const AMP_VOLTAGE_OPTS = ['100V', '120V', '220V', '프리볼트'];

// 입력 단자 — 평면 나열. 포노는 별도 '포노 입력' 칸에서만 받으므로 제외 (중복 방지)
export const AMP_INPUT_TERMINALS = ['RCA', 'XLR', 'Main In', 'HT Bypass', 'Optical', 'Coaxial', 'USB-A', 'USB-B', 'USB-C', 'LAN', 'HDMI In', 'DIN', 'AES/EBU', 'BNC'];
// 출력 단자 — 평면 나열
export const AMP_OUTPUT_TERMINALS = ['스피커 터미널', 'Pre Out', 'Tape/Rec Out', 'Subwoofer Out', 'Headphone Out', 'RCA Out', 'XLR Out', 'Optical Out', 'Coaxial Out', 'AES/EBU Out', 'BNC Out', 'USB-A', 'USB-B', 'USB-C', 'HDMI Out', '70V / 100V 라인 출력'];

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
  '스피커 터미널': ['스피커 출력', '스피커 단자', 'Speaker Out', 'Speaker Terminal', '스피커아웃'],
  'Pre Out': ['프리아웃', '프리 아웃', 'Pre-Out', 'Preout', '프리출력'],
  'Tape/Rec Out': ['테이프아웃', '테이프 아웃', 'Tape-Out', 'Tapeout', '테이프출력', '레코드아웃', '레코드 아웃', 'Rec Out', 'Record-Out', '녹음출력'],
  'Subwoofer Out': ['서브아웃', '서브 아웃', 'Sub Out', 'Sub Pre Out', '서브우퍼 출력'],
  'Headphone Out': ['헤드폰아웃', '헤드폰 아웃', 'Headphone Output', 'Phones Out', '헤드폰 출력'],
  'RCA Out': ['알씨에이아웃', 'RCA 아웃', 'RCA 출력', '언밸런스 출력', 'RCA Output'],
  'XLR Out': ['엑스엘알아웃', 'XLR 아웃', 'XLR 출력', '밸런스 출력', 'XLR Output'],
  'Optical Out': ['옵티컬아웃', '옵티컬 아웃', 'Optical 출력', '광출력', 'Toslink Out', '토스링크 출력'],
  'Coaxial Out': ['코액셜아웃', '코액시얼아웃', '동축 출력', 'Coax Out', 'Coaxial Output'],
  'AES/EBU Out': ['에이에스이비유아웃', 'AES EBU 아웃', 'AES/EBU 출력', 'AES 출력', '디지털 XLR 출력'],
  'BNC Out': ['비엔씨아웃', 'BNC 아웃', 'BNC 출력', 'BNC Output'],
  '70V / 100V 라인 출력': ['70볼트 라인 출력', '100볼트 라인 출력', '하이임피던스 출력', 'PA 라인 출력', '정전압 출력'],
  // 무선 / 네트워크
  'Bluetooth': ['블루투스', 'BT', '블투'],
  'Wi-Fi': ['와이파이', 'WiFi', 'Wifi', '무선', '무선랜'],
  'AirPlay': ['에어플레이', '에어플레이2', 'AirPlay 2'],
  'Spotify Connect': ['스포티파이', '스포티파이 커넥트', 'Spotify'],
  'TIDAL Connect': ['타이달', '타이달 커넥트', 'Tidal'],
  'Roon Ready': ['룬', '룬 레디', 'Roon'],
  'DLNA / UPnP': ['디엘엔에이', 'DLNA', 'UPnP', '유피엔피', '디엘엔에이/유피엔피'],
};

// 무선 / 네트워크 옵션
export const AMP_WIRELESS = ['Bluetooth', 'Wi-Fi', 'AirPlay', 'Spotify Connect', 'TIDAL Connect', 'Roon Ready', 'DLNA / UPnP'];

// ── 앰프 스펙 필드 (사양서 순서대로 17개) ──
export const AMP_SPEC_FIELDS: CategorySpecField[] = [
  { key: 'type', label: '타입', input: { kind: 'auto' } },
  { key: 'channel', label: '채널', input: { kind: 'select', options: AMP_CHANNEL_OPTS } },
  { key: 'device', label: '증폭 방식', input: { kind: 'select', options: AMP_DEVICE_OPTS } },
  { key: 'opClass', label: '동작 클래스', input: { kind: 'select', options: AMP_CLASS_OPTS } },
  { key: 'powerRated', label: '정격 출력', input: { kind: 'power' } },
  { key: 'freqResponse', label: '주파수 응답', input: { kind: 'range', lowUnit: 'Hz', highUnit: 'kHz' } },
  { key: 'impedance', label: '지원 임피던스', input: { kind: 'multi', options: AMP_OHM_OPTS } },
  { key: 'thd', label: 'THD', input: { kind: 'text', unit: '%' } },
  { key: 'snr', label: 'S/N', input: { kind: 'text', unit: 'dB' } },
  { key: 'damping', label: '댐핑 팩터', input: { kind: 'text' } },
  { key: 'inputs', label: '입력 단자', input: { kind: 'multi', options: AMP_INPUT_TERMINALS } },
  { key: 'outputs', label: '출력 단자', input: { kind: 'multi', options: AMP_OUTPUT_TERMINALS } },
  { key: 'phono', label: '포노 입력', input: { kind: 'select', options: AMP_PHONO_OPTS } },
  { key: 'wireless', label: '무선 / 네트워크', input: { kind: 'multi', options: AMP_WIRELESS } },
  { key: 'toneControl', label: '톤 컨트롤', input: { kind: 'select', options: YES_NO_OPTS } },
  { key: 'remote', label: '리모컨', input: { kind: 'select', options: YES_NO_OPTS } },
  { key: 'voltage', label: '전원', input: { kind: 'select', options: AMP_VOLTAGE_OPTS } },
  { key: 'dimensions', label: '크기', input: { kind: 'dimensions' } },
  { key: 'weight', label: '무게', input: { kind: 'text', unit: 'kg' } },
];

// ── 스피커 옵션 상수 ──
// select 6종: labels.ts에서 파생(저장=영문키, 표시=한글). 필터 키(speakerDetail 등)와 이름 일치.
export const SPEAKER_DETAIL_OPTS = labelOpts('speakerDetail');                                  // passive/active
export const SPEAKER_DRIVER_OPTS = labelOpts('driverConfig');                                   // full_range/coaxial/2way/3way/4way_plus
export const SPEAKER_ENCLOSURE_OPTS = labelOpts('enclosure').map((o) => o.label);                // 검색 드롭다운용 한글 문자열 목록 (labels.ts에서 추출)
// 인클로저 한글 라벨 → 영어 검색어 (labels.ts 영문키 기반: _ → 공백). 영어로도 검색되게.
export const SPEAKER_ENCLOSURE_ALIASES: Record<string, string> = Object.fromEntries(
  labelOpts('enclosure').map((o) => [o.label, o.value.replace(/_/g, ' ')]),
);
export const SPEAKER_CONNECTION_OPTS = labelOpts('connection');                                 // wired/bluetooth/network
export const SPEAKER_WOOFER_OPTS = labelOpts('wooferSize');                                      // under_4in/5in/6_5in/7_8in/10in/12in/15in_plus
export const SPEAKER_IMPEDANCE_OPTS = labelOpts('impedance', ['4ohm', '6ohm', '8ohm', '16ohm']); // 2Ω 제외, 단일 문자열
// 액티브 스피커 전용 select 옵션 (labels.ts에 없어 한글 그대로 저장)
export const SPK_AMP_CONFIG_OPTS = ['싱글앰프', '바이앰프', '트라이앰프', '멀티앰프'];
export const SPK_CROSSOVER_TYPE_OPTS = ['패시브 크로스오버', '액티브 크로스오버', 'DSP 크로스오버'];
export const SPK_PHASE_OPTS = ['0° / 180° 전환', '0°~180° 연속 조절', '0°~360° 연속 조절']; // 서브우퍼 위상 조절
export const SUB_FIRING_OPTS = ['전면 발사', '하향 발사', '측면 발사']; // 서브우퍼 드라이버 방사 방향
// 사운드바 채널 구성 (단일 드롭다운). X.Y.Z = 메인.우퍼.높이 채널
export const SOUNDBAR_CHANNEL_OPTS = ['2.0', '2.1', '3.1', '2.1.2', '3.1.2', '5.1', '5.1.2', '5.1.4', '7.1.2', '7.1.4', '9.1.2', '9.1.4', '11.1.4'];
// 사운드바 지원 오디오 포맷 (다중 선택)
export const SOUNDBAR_AUDIO_FORMATS = ['Dolby Atmos', 'Dolby Digital', 'Dolby Digital Plus', 'Dolby TrueHD', 'DTS', 'DTS:X', 'DTS Virtual:X', 'DTS-HD MA', 'PCM'];

// ── 드라이버 구성 빌더 데이터 (스피커) ──
// 종류 선택에 따라 구조/재질 옵션이 바뀜(cascading). 동축은 재질 대신 담당대역 사용.
export const DRIVER_TYPES = ['우퍼', '미드우퍼', '미드레인지', '트위터', '슈퍼 트위터', '동축', '풀레인지', '패시브 라디에이터'];
export const COAXIAL_BANDS = ['우퍼 + 트위터', '미드레인지 + 트위터', '우퍼 + 미드레인지 + 트위터'];
// 콘 계열 재질 (우퍼·미드우퍼 공용)
const SPK_CONE_MATS = ['페이퍼 콘', '코팅 페이퍼 콘', '폴리프로필렌', '케블라', '알루미늄', '마그네슘', '카본 파이버', '글래스 파이버', '세라믹', '복합 소재'];
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
  '미드레인지': ['페이퍼 콘', '코팅 페이퍼 콘', '폴리프로필렌', '케블라', '알루미늄', '마그네슘', '카본 파이버', '글래스 파이버', '세라믹', '소프트 돔', '복합 소재'],
  '트위터': ['소프트 돔', '알루미늄', '티타늄', '베릴륨', '다이아몬드', '세라믹', '실크', 'AMT 필름', '복합소재'],
  '슈퍼 트위터': ['소프트 돔', '실크', '알루미늄', '티타늄', '베릴륨', '다이아몬드', '세라믹', '마그네슘', '복합 소재'],
  '풀레인지': ['페이퍼 콘', '코팅 페이퍼 콘', '폴리프로필렌', '알루미늄', '마그네슘', '카본 파이버', '글래스 파이버', '복합 소재'],
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
  // ── 드라이버 구성 (패시브·액티브 공용: 종류/구조/재질/크기/개수 빌더) ──
  { key: 'driverComposition', label: '드라이버 구성', input: { kind: 'drivers' }, showWhen: detailSet },

  // ── 패시브 블록 (기존 순서 유지) ──
  { key: 'enclosure', label: '인클로저', input: { kind: 'searchSelect', options: SPEAKER_ENCLOSURE_OPTS, aliases: SPEAKER_ENCLOSURE_ALIASES, keyboardLayout: true }, showWhen: isPassive },
  { key: 'speakerImpedance', label: '임피던스', input: { kind: 'text', unit: 'Ω' }, showWhen: isPassive },
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
  { key: 'crossoverType', label: '크로스오버 방식', input: { kind: 'select', options: SPK_CROSSOVER_TYPE_OPTS }, showWhen: activeNoBar }, // 사운드바 제외
  { key: 'freqResponse', label: '주파수 응답', input: { kind: 'range', lowUnit: 'Hz', highUnit: 'kHz' }, showWhen: activeNoSub }, // 크로스오버 방식 아래 (서브우퍼 제외)
  { key: 'inputs', label: '입력 단자', input: { kind: 'multi', options: AMP_INPUT_TERMINALS }, showWhen: isActive }, // 앰프 재사용
  { key: 'outputs', label: '출력 단자', input: { kind: 'multi', options: AMP_OUTPUT_TERMINALS }, showWhen: isActive }, // 앰프 재사용 (입력 단자 아래)
  { key: 'wireless', label: '무선 / 네트워크', input: { kind: 'multi', options: AMP_WIRELESS }, showWhen: isActive }, // 앰프 재사용
  { key: 'enclosure', label: '인클로저', input: { kind: 'searchSelect', options: SPEAKER_ENCLOSURE_OPTS, aliases: SPEAKER_ENCLOSURE_ALIASES, keyboardLayout: true }, showWhen: activeNoBar }, // 마감 바로 위 (사운드바 제외)

  // ── 서브우퍼 전용: 방사 방향 · 주파수 응답(Hz~Hz) · 위상 조절 (패시브·액티브 공통) ──
  { key: 'firingDirection', label: '방사 방향', input: { kind: 'select', options: SUB_FIRING_OPTS }, showWhen: detailSub },
  { key: 'freqResponse', label: '주파수 응답', input: { kind: 'range', lowUnit: 'Hz', highUnit: 'Hz' }, showWhen: detailSub },
  { key: 'phaseControl', label: '위상 조절', input: { kind: 'select', options: SPK_PHASE_OPTS }, showWhen: detailSub },
  // ── 꼬리: 마감(공통) · 전원(액티브만) · 크기 · 무게(공통) ──
  { key: 'finish', label: '마감', input: { kind: 'text', free: true }, showWhen: detailSet },
  { key: 'voltage', label: '전원', input: { kind: 'select', options: AMP_VOLTAGE_OPTS }, showWhen: isActive }, // 앰프 재사용(한글 저장) — 액티브만(패시브는 전원부 없음)
  { key: 'dimensions', label: '크기', input: { kind: 'dimensions' }, showWhen: detailSet },
  { key: 'weight', label: '무게', input: { kind: 'text', unit: 'kg' }, showWhen: detailSet },
];

// 대분류(한글) → 스펙 필드 세트. 정의 없는 카테고리는 폼이 기존 SPEC_FIELDS로 폴백.
export const SPEC_FIELDS_BY_CATEGORY: Record<string, CategorySpecField[]> = {
  앰프: AMP_SPEC_FIELDS,
  스피커: SPEAKER_SPEC_FIELDS,
};
