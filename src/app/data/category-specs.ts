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
  | { kind: 'multiOhm' }                                        // 임피던스 다중 버튼 + 직접 입력
  | { kind: 'terminals'; groups: { title: string; items: string[] }[] }; // 단자 그룹 다중 버튼

export type CategorySpecField = { key: string; label: string; input: SpecInput };

// ── 앰프 옵션 상수 ──
export const AMP_CHANNEL_OPTS = ['모노블럭', '스테레오', '멀티채널'];
export const AMP_DEVICE_OPTS = ['진공관', '트랜지스터', '하이브리드'];
export const AMP_OHM_OPTS = ['2Ω', '4Ω', '6Ω', '8Ω', '16Ω']; // 정격 출력 기준 옴 + 지원 임피던스 공용
export const AMP_PHONO_OPTS = ['MM', 'MC', 'MM·MC', '없음'];
export const YES_NO_OPTS = ['있음', '없음'];
export const AMP_VOLTAGE_OPTS = ['100V', '120V', '220V', '프리볼트'];

// 입력 단자 — 포노는 별도 '포노 입력' 칸에서만 받으므로 제외 (중복 방지)
export const AMP_INPUT_TERMINAL_GROUPS = [
  { title: '아날로그', items: ['RCA', 'XLR', 'Main In'] },
  { title: '디지털', items: ['Optical', 'Coaxial', 'USB', 'Bluetooth'] },
  { title: '기타', items: ['HT Bypass', '기타/직접입력'] },
];
// 출력 단자 — Record Out = Tape Out 으로 통합
export const AMP_OUTPUT_TERMINAL_GROUPS = [
  { title: '스피커', items: ['스피커 출력'] },
  { title: '라인', items: ['Pre Out', 'RCA Out', 'XLR Out', 'Tape Out'] },
  { title: '부가', items: ['Sub Out', 'Headphone Out', '기타/직접입력'] },
];

// ── 앰프 스펙 필드 (사양서 순서대로 17개) ──
export const AMP_SPEC_FIELDS: CategorySpecField[] = [
  { key: 'type', label: '타입', input: { kind: 'auto' } },
  { key: 'channel', label: '채널', input: { kind: 'select', options: AMP_CHANNEL_OPTS } },
  { key: 'device', label: '소자', input: { kind: 'select', options: AMP_DEVICE_OPTS } },
  { key: 'powerRated', label: '정격 출력', input: { kind: 'power' } },
  { key: 'freqResponse', label: '주파수 응답', input: { kind: 'range', lowUnit: 'Hz', highUnit: 'kHz' } },
  { key: 'impedance', label: '지원 임피던스', input: { kind: 'multiOhm' } },
  { key: 'thd', label: 'THD', input: { kind: 'text', unit: '%' } },
  { key: 'snr', label: 'S/N', input: { kind: 'text', unit: 'dB' } },
  { key: 'damping', label: '댐핑 팩터', input: { kind: 'text' } },
  { key: 'inputs', label: '입력 단자', input: { kind: 'terminals', groups: AMP_INPUT_TERMINAL_GROUPS } },
  { key: 'outputs', label: '출력 단자', input: { kind: 'terminals', groups: AMP_OUTPUT_TERMINAL_GROUPS } },
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
