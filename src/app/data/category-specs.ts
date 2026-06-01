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

// ── 입력 방식 ──
export type SpecInput =
  | { kind: 'auto' }                                            // 타입 — 카테고리에서 자동 입력
  | { kind: 'select'; options: string[] }                       // 드롭다운 단일 선택
  | { kind: 'text'; unit?: string }                             // 자유 입력 + (선택)단위
  | { kind: 'range'; lowUnit: string; highUnit: string }        // 하한~상한 2칸
  | { kind: 'dimensions' }                                      // 가로×깊이×높이 3칸 (mm)
  | { kind: 'power' }                                           // 출력값(W) + 기준 옴, 쌍 추가 가능
  | { kind: 'multi'; options: string[] };                       // 다중 선택 버튼 (임피던스/입력·출력 단자)

export type CategorySpecField = { key: string; label: string; input: SpecInput };

// ── 앰프 옵션 상수 ──
export const AMP_CHANNEL_OPTS = ['모노블럭', '스테레오', '멀티채널'];
export const AMP_DEVICE_OPTS = ['진공관', '트랜지스터', '하이브리드'];
export const AMP_OHM_OPTS = ['2Ω', '4Ω', '6Ω', '8Ω', '16Ω']; // 정격 출력 기준 옴 + 지원 임피던스 공용
export const AMP_PHONO_OPTS = ['MM', 'MC', 'MM/MC', '없음'];
export const YES_NO_OPTS = ['있음', '없음'];
export const AMP_VOLTAGE_OPTS = ['100V', '120V', '220V', '프리볼트'];

// 입력 단자 — 평면 나열. 포노는 별도 '포노 입력' 칸에서만 받으므로 제외 (중복 방지)
export const AMP_INPUT_TERMINALS = ['RCA', 'XLR', 'Main In', 'HT Bypass', 'Optical', 'Coaxial', 'USB', 'LAN', 'HDMI ARC', 'DIN', 'AES/EBU', 'BNC'];
// 출력 단자 — 평면 나열
export const AMP_OUTPUT_TERMINALS = ['스피커 터미널', 'Pre Out', 'Tape/Rec Out', 'Subwoofer Out', 'Headphone Out', 'RCA Out', 'XLR Out', 'Optical Out', 'Coaxial Out', 'AES/EBU Out', 'BNC Out', '70V / 100V 라인 출력'];

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
};

// ── 앰프 스펙 필드 (사양서 순서대로 17개) ──
export const AMP_SPEC_FIELDS: CategorySpecField[] = [
  { key: 'type', label: '타입', input: { kind: 'auto' } },
  { key: 'channel', label: '채널', input: { kind: 'select', options: AMP_CHANNEL_OPTS } },
  { key: 'device', label: '증폭 방식', input: { kind: 'select', options: AMP_DEVICE_OPTS } },
  { key: 'powerRated', label: '정격 출력', input: { kind: 'power' } },
  { key: 'freqResponse', label: '주파수 응답', input: { kind: 'range', lowUnit: 'Hz', highUnit: 'kHz' } },
  { key: 'impedance', label: '지원 임피던스', input: { kind: 'multi', options: AMP_OHM_OPTS } },
  { key: 'thd', label: 'THD', input: { kind: 'text', unit: '%' } },
  { key: 'snr', label: 'S/N', input: { kind: 'text', unit: 'dB' } },
  { key: 'damping', label: '댐핑 팩터', input: { kind: 'text' } },
  { key: 'inputs', label: '입력 단자', input: { kind: 'multi', options: AMP_INPUT_TERMINALS } },
  { key: 'outputs', label: '출력 단자', input: { kind: 'multi', options: AMP_OUTPUT_TERMINALS } },
  { key: 'phono', label: '포노 입력', input: { kind: 'select', options: AMP_PHONO_OPTS } },
  { key: 'toneControl', label: '톤 컨트롤', input: { kind: 'select', options: YES_NO_OPTS } },
  { key: 'remote', label: '리모컨', input: { kind: 'select', options: YES_NO_OPTS } },
  { key: 'voltage', label: '전원', input: { kind: 'select', options: AMP_VOLTAGE_OPTS } },
  { key: 'dimensions', label: '크기', input: { kind: 'dimensions' } },
  { key: 'weight', label: '무게', input: { kind: 'text', unit: 'kg' } },
];

// 대분류(한글) → 스펙 필드 세트. 정의 없는 카테고리는 폼이 기존 SPEC_FIELDS로 폴백.
export const SPEC_FIELDS_BY_CATEGORY: Record<string, CategorySpecField[]> = {
  앰프: AMP_SPEC_FIELDS,
};
