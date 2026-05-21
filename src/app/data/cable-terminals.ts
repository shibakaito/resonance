// ============================================================================
// cable-terminals.ts — 케이블 종류별 "단자(커넥터)" 데이터 + 단자 선택 로직
// ----------------------------------------------------------------------------
// '단자(terminal)' = 케이블 양 끝에 달린 커넥터 (예: RCA, XLR, 바나나, USB-C...).
// 케이블은 입력측(terminalIn)과 출력측(terminalOut) 단자가 있는데, 그 값은
// 반드시 아래 정의된 '단자 풀(pool)' 안의 값이어야 함.
//
// 담고 있는 것:
//   - CABLE_TERMINALS      : 케이블 종류 → 가능한 단자 목록
//   - terminalsForCategories / terminalsPrioritized : 필터 드롭다운 옵션 만들기
//   - pickTerminalPair     : 더미 매물 생성 시 그럴듯한 입/출력 단자 한 쌍 뽑기
// ============================================================================

// 이어폰 케이블 — 신호 흐름: 플레이어 → IEM
export const EARPHONE_PLAYER_SIDE = ['3.5mm', '6.3mm', '4.4mm 5극', '2.5mm 4극', 'XLR 4-pin'];
export const EARPHONE_IEM_SIDE    = ['MMCX', '2-pin 0.78mm', '2-pin 0.75mm', 'A2DC', 'T2', 'IPX'];

// 헤드폰 케이블 — 신호 흐름: 플레이어 → 헤드폰 cup
export const HEADPHONE_PLAYER_SIDE = ['3.5mm', '6.3mm', '4.4mm 5극', '2.5mm 4극', 'XLR 4-pin'];
export const HEADPHONE_CUP_SIDE    = ['2-pin', '듀얼 3-pin mini-XLR', '듀얼 2.5mm TS', '4-pin mini-XLR', 'Hirose'];

// USB 케이블 — 신호 흐름: 호스트 → 디바이스 (USB-C는 양방향이라 양쪽 풀에 포함)
export const USB_HOST_SIDE   = ['USB-A', 'USB-C'];
export const USB_DEVICE_SIDE = ['USB-B', 'Micro-B', 'Mini-B', 'USB-C'];

// 파워 케이블 — 신호 흐름: 벽 콘센트 → 기기
export const POWER_INPUT_SIDE  = ['Schuko', 'NEMA 5-15', 'JIS'];
export const POWER_OUTPUT_SIDE = ['IEC C7', 'IEC C13', 'IEC C15', 'IEC C19'];

export const CABLE_TERMINALS: Record<string, string[]> = {
  'RCA 케이블':       ['RCA'],
  'XLR 케이블':       ['XLR'],
  '포노 케이블':       ['RCA', 'DIN 5-pin'],
  '스피커 케이블':     ['베어와이어', '바나나', '스페이드', 'Y플러그', '핀'],
  '파워 케이블':       [...POWER_INPUT_SIDE, ...POWER_OUTPUT_SIDE],
  '디지털 동축 케이블': ['RCA', 'BNC'],
  '광 케이블':         ['TOSLINK', 'Mini-TOSLINK'],
  'USB 케이블':        [...USB_HOST_SIDE, ...USB_DEVICE_SIDE.filter((t) => !USB_HOST_SIDE.includes(t))],
  'AES/EBU 케이블':    ['XLR'],
  'BNC 케이블':        ['BNC'],
  'HDMI 케이블':       ['HDMI', 'Mini-HDMI', 'Micro-HDMI'],
  '점퍼 케이블':       ['바나나', '스페이드', 'Y플러그', '핀'],
  '헤드폰 케이블':     [...HEADPHONE_PLAYER_SIDE, ...HEADPHONE_CUP_SIDE],
  '이어폰 케이블':   [...EARPHONE_PLAYER_SIDE, ...EARPHONE_IEM_SIDE]
};

// 전체 단자 풀 (입출력 드롭다운에 노출)
export const ALL_TERMINALS: string[] = Array.from(
  new Set(Object.values(CABLE_TERMINALS).flat())
);

// 카테고리에 대해 가용한 단자 옵션을 반환.
// 선택한 카테고리가 없으면 전체 풀.
export function terminalsForCategories(categories: string[]): string[] {
  if (categories.length === 0) return ALL_TERMINALS;
  const set = new Set<string>();
  for (const c of categories) {
    const opts = CABLE_TERMINALS[c];
    if (opts) for (const t of opts) set.add(t);
  }
  return Array.from(set);
}

// ALL_TERMINALS 전체를 반환하되, 선택된 카테고리에 맞는 단자를 앞에 정렬.
// 예: 스피커 케이블 선택 시 [바나나, 베어와이어, 스페이드, Y플러그, 핀, ...나머지]
export function terminalsPrioritized(categories: string[]): string[] {
  if (categories.length === 0) return ALL_TERMINALS;
  const priority = new Set<string>();
  for (const c of categories) {
    const opts = CABLE_TERMINALS[c];
    if (opts) for (const t of opts) priority.add(t);
  }
  if (priority.size === 0) return ALL_TERMINALS;
  const top = ALL_TERMINALS.filter((t) => priority.has(t));
  const rest = ALL_TERMINALS.filter((t) => !priority.has(t));
  return [...top, ...rest];
}

// 시드 기반 단자 쌍 선택. 카테고리별로 분기.
export function pickTerminalPair(category: string, seed: number): { in: string; out: string } {
  // 이어폰 케이블 — 신호 흐름: 플레이어 → IEM
  if (category === '이어폰 케이블') {
    return {
      in:  EARPHONE_PLAYER_SIDE[(seed >> 1) % EARPHONE_PLAYER_SIDE.length],
      out: EARPHONE_IEM_SIDE[(seed >> 4) % EARPHONE_IEM_SIDE.length]
    };
  }

  // 헤드폰 케이블 — 신호 흐름: 플레이어 → cup
  if (category === '헤드폰 케이블') {
    return {
      in:  HEADPHONE_PLAYER_SIDE[(seed >> 1) % HEADPHONE_PLAYER_SIDE.length],
      out: HEADPHONE_CUP_SIDE[(seed >> 4) % HEADPHONE_CUP_SIDE.length]
    };
  }

  // USB 케이블 — 신호 흐름: 호스트 → 디바이스
  if (category === 'USB 케이블') {
    return {
      in:  USB_HOST_SIDE[(seed >> 1) % USB_HOST_SIDE.length],
      out: USB_DEVICE_SIDE[(seed >> 4) % USB_DEVICE_SIDE.length]
    };
  }

  // 파워 케이블 — 신호 흐름: 벽 콘센트 → IEC
  if (category === '파워 케이블') {
    return {
      in:  POWER_INPUT_SIDE[(seed >> 1) % POWER_INPUT_SIDE.length],
      out: POWER_OUTPUT_SIDE[(seed >> 4) % POWER_OUTPUT_SIDE.length]
    };
  }

  // 포노 케이블 — DIN→RCA 60%, RCA→RCA 40%, 나머지 조합 0%
  if (category === '포노 케이블') {
    const dinToRca = (seed % 5) < 3;
    if (dinToRca) return { in: 'DIN 5-pin', out: 'RCA' };
    return { in: 'RCA', out: 'RCA' };
  }

  // 점퍼 케이블 — 100% 양쪽 동일 (바나나-바나나 등)
  if (category === '점퍼 케이블') {
    const pool = CABLE_TERMINALS['점퍼 케이블'];
    const t = pool[(seed >> 1) % pool.length];
    return { in: t, out: t };
  }

  // HDMI 케이블 — HDMI↔HDMI ~94%, 변환 ~6%
  if (category === 'HDMI 케이블') {
    const useMini = (seed % 16) === 0; // ~6.25%
    if (!useMini) return { in: 'HDMI', out: 'HDMI' };
    if (((seed >> 3) & 1) === 0) return { in: 'HDMI', out: 'Mini-HDMI' };
    return { in: 'HDMI', out: 'Micro-HDMI' };
  }

  // 광 케이블 — Mini↔Mini 금지. TOSLINK↔TOSLINK 75%, 혼합 25%
  if (category === '광 케이블') {
    const useMini = ((seed >> 1) & 0b11) === 0; // 25%
    if (!useMini) return { in: 'TOSLINK', out: 'TOSLINK' };
    if (((seed >> 3) & 1) === 0) return { in: 'Mini-TOSLINK', out: 'TOSLINK' };
    return { in: 'TOSLINK', out: 'Mini-TOSLINK' };
  }

  // 일반 카테고리 (RCA, XLR, AES/EBU, BNC, 디지털 동축, 스피커):
  // 같은 풀에서 in/out 결정. 풀이 단일이면 항상 양쪽 동일.
  // 풀이 다수면 ~75% 양쪽 동일, ~25% 풀 내 다른 단자.
  const pool = CABLE_TERMINALS[category] ?? ['RCA'];
  const inTerm = pool[(seed >> 1) % pool.length];
  if (pool.length === 1) return { in: inTerm, out: inTerm };
  const sameBoth = ((seed >> 7) & 0b11) !== 0; // 4개 중 3 → 양쪽 동일
  if (sameBoth) return { in: inTerm, out: inTerm };
  let outIdx = (seed >> 4) % pool.length;
  if (pool[outIdx] === inTerm) outIdx = (outIdx + 1) % pool.length;
  return { in: inTerm, out: pool[outIdx] };
}
