// ============================================================================
// 한영 자판 변환 유틸 (browse 검색의 한영 오타 매칭용)
// ----------------------------------------------------------------------------
// - 두벌식 표준 매핑(QWERTY ↔ 한글 자모)
// - 한글 자모 조합은 es-hangul의 assemble/disassemble에 위임
// - 양방향:
//    · en2ko('doavm')      → '앰프'
//    · en2ko('aozlsxhtl')  → '맥킨토시'
//    · ko2en('앰프')        → 'doavm'
// - 자모가 아닌 글자(영문/숫자/특수문자)는 그대로 보존되어 깨지지 않음
// ============================================================================

import { assemble, disassemble } from 'es-hangul';

// 영문 키 → 한글 자모 (두벌식 표준)
const EN_TO_KO_JAMO: Record<string, string> = {
  q: 'ㅂ', w: 'ㅈ', e: 'ㄷ', r: 'ㄱ', t: 'ㅅ',
  y: 'ㅛ', u: 'ㅕ', i: 'ㅑ', o: 'ㅐ', p: 'ㅔ',
  a: 'ㅁ', s: 'ㄴ', d: 'ㅇ', f: 'ㄹ', g: 'ㅎ',
  h: 'ㅗ', j: 'ㅓ', k: 'ㅏ', l: 'ㅣ',
  z: 'ㅋ', x: 'ㅌ', c: 'ㅊ', v: 'ㅍ', b: 'ㅠ', n: 'ㅜ', m: 'ㅡ',
  // Shift 키 (쌍자음 / 이중모음)
  Q: 'ㅃ', W: 'ㅉ', E: 'ㄸ', R: 'ㄲ', T: 'ㅆ',
  O: 'ㅒ', P: 'ㅖ',
};

// 한글 자모 → 영문 키 (위의 역매핑)
const KO_TO_EN_JAMO: Record<string, string> = Object.fromEntries(
  Object.entries(EN_TO_KO_JAMO).map(([k, v]) => [v, k])
);

const isJamo = (s: string) => /^[ㄱ-ㅣ]$/.test(s);

/**
 * 자모 배열에서 한글 자모 구간만 assemble로 음절 조합,
 * 비자모(영문/숫자/특수)는 그대로 보존.
 * 영문이 섞여 있어도 assemble이 깨지지 않음.
 */
function assembleSafely(arr: string[]): string {
  let out = '';
  let buf: string[] = [];
  const flush = () => {
    if (buf.length === 0) return;
    try {
      out += assemble(buf);
    } catch {
      out += buf.join('');
    }
    buf = [];
  };
  for (const c of arr) {
    if (isJamo(c)) buf.push(c);
    else {
      flush();
      out += c;
    }
  }
  flush();
  return out;
}

/**
 * 영문 키보드로 친 한글 의도 → 한글로 변환.
 * 예: 'doavm' → '앰프', 'aozlsxhtl' → '맥킨토시'
 */
export function en2ko(input: string): string {
  if (!input) return '';
  const jamoArr = input.split('').map((c) => EN_TO_KO_JAMO[c] ?? c);
  return assembleSafely(jamoArr);
}

/**
 * 한글로 친 영문 의도 → 영문 키 시퀀스로 변환.
 * 예: '앰프' → 'doavm', '맥킨토시' → 'aozlsxhtl'
 */
export function ko2en(input: string): string {
  if (!input) return '';
  const decomposed = disassemble(input);
  return decomposed
    .split('')
    .map((c) => KO_TO_EN_JAMO[c] ?? c)
    .join('');
}
