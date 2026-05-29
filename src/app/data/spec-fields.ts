// ============================================================================
// spec-fields.ts — 기술 사양 입력 필드 정의 (단일 출처)
// ----------------------------------------------------------------------------
// 판매 폼(입력)과 상세 페이지(표시)가 같은 배열을 공유해 항목·순서·라벨이 일치.
// specs(jsonb)에 이 key 그대로 자유 텍스트로 저장됨.
// ============================================================================
export const SPEC_FIELDS = [
  { key: 'type', label: '타입' },
  { key: 'channel', label: '채널' },
  { key: 'device', label: '소자' },
  { key: 'powerRated', label: '정격 출력' },
  { key: 'freqResponse', label: '주파수 응답' },
  { key: 'impedance', label: '지원 임피던스' },
  { key: 'thd', label: 'THD' },
  { key: 'snr', label: 'S/N' },
  { key: 'damping', label: '댐핑 팩터' },
  { key: 'inputs', label: '입력 단자' },
  { key: 'outputs', label: '출력 단자' },
  { key: 'phono', label: '포노 입력' },
  { key: 'toneControl', label: '톤 컨트롤' },
  { key: 'power', label: '전원' },
  { key: 'dimensions', label: '크기' },
  { key: 'weight', label: '무게' },
] as const;

export type SpecFieldKey = (typeof SPEC_FIELDS)[number]['key'];
