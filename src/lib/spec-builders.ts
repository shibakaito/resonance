// ============================================================================
// spec-builders.ts — 기술 사양 "조립 문자열" 빌더 (판매 폼 + 시드 스크립트 공용 — 단일 출처)
// ----------------------------------------------------------------------------
// 판매 폼(upload-page.tsx)의 실시간 표시·저장과 scripts/seed-listings.ts 의 시드 행 생성이
// 같은 함수를 쓰므로, DB(specs.tech)에 들어가는 문자열 포맷은 이 파일에서만 정의됩니다.
// 원래 upload-page.tsx 안에 있던 함수들을 로직 변경 없이 그대로 옮긴 것입니다.
// ⚠️ 포맷을 바꾸면 그 문자열을 "파싱"하는 쪽도 같이: 정격 출력 → src/lib/listings.ts parsePowerW
// ============================================================================
import { DRIVER_TYPES } from '@/app/data/category-specs';

export type PowerPair = { w: string; ohm: string; note?: string };
export type DimRow = { w: string; d: string; h: string; note: string };
export type ValNoteRow = { value: string; note: string };
export type TubeRow = { role: string; type: string; qty: string };
export type CrossoverRow = { value: string; unit: string };
export type AmpPowerRow = { type: string; power: string };
export type DriverRow = { type: string; structure: string; material: string; band: string; size: string; sizeUnit: string; count: string };

// ⚠️ 이 조립 포맷("100W @ 8Ω, 150W @ 4Ω (비고)")을 바꾸면 src/lib/listings.ts 의 parsePowerW 도 같이 고칠 것
//    (정격 출력 범위 필터가 저장된 문자열을 그 파서로 숫자화합니다).
export const buildPower = (pairs: { w: string; ohm: string; note?: string }[]) =>
  pairs.filter((p) => p.w.trim()).map((p) => `${p.w.trim()}W${p.ohm ? ` @ ${p.ohm}` : ''}${p.note && p.note.trim() ? ` (${p.note.trim()})` : ''}`).join(', ');
export const buildFreq = (lo: string, hi: string, loUnit = 'Hz', hiUnit = 'kHz') => {
  const l = lo.trim(), h = hi.trim();
  if (!l && !h) return '';
  return `${l ? l + loUnit : ''}~${h ? h + hiUnit : ''}`;
};
export const buildDim = (w: string, d: string, h: string) => {
  if (!w.trim() && !d.trim() && !h.trim()) return '';
  return `${w.trim()}×${d.trim()}×${h.trim()}`;
};
// 크기 행 배열 → 문자열. 각 행 "W×D×H (비고)", 여러 행은 ' / '로. (W·D·H 모두 빈 행 제외)
export const buildDims = (rows: { w: string; d: string; h: string; note: string }[]) =>
  rows.map((r) => { const dim = buildDim(r.w, r.d, r.h); if (!dim) return ''; return r.note.trim() ? `${dim} (${r.note.trim()})` : dim; }).filter(Boolean).join(' / ');
// 무게 빌더: 값+단위+비고 행 → "12kg (비고) / ..." (크기 buildDims와 동일 방식)
export const buildValNotes = (rows: { value: string; note: string }[], unit?: string) =>
  rows.map((r) => { const v = r.value.trim(); if (!v) return ''; const vu = `${v}${unit ?? ''}`; return r.note.trim() ? `${vu} (${r.note.trim()})` : vu; }).filter(Boolean).join(' / ');
// 진공관 빌더: 행 → "역할 종류 ×개수". role·type 둘 다 빈 행 제외, 개수 없으면 ×생략, ' / '로 연결
export const buildTubes = (rows: { role: string; type: string; qty: string }[]) =>
  rows
    .filter((r) => r.role.trim() || r.type.trim())
    .map((r) => {
      const head = [r.role.trim(), r.type.trim()].filter(Boolean).join(' ');
      return r.qty.trim() ? `${head} ×${r.qty.trim()}` : head;
    })
    .join(' / ');

// 크로스오버: 주파수 여러 개 → "250Hz / 2500Hz" (값 있는 행만)
export const buildCrossover = (rows: CrossoverRow[]) =>
  rows.filter((x) => x.value.trim()).map((x) => `${x.value.trim()}${x.unit}`).join(' / ');
// 앰프 출력(액티브 스피커): 종류별 출력값 → "우퍼 200W / 트위터 100W" (종류 있는 행만, 출력값은 자유 입력이라 그대로)
export const buildAmpPower = (rows: AmpPowerRow[]) =>
  rows.filter((r) => r.type).map((r) => (r.power.trim() ? `${r.type} ${r.power.trim()}` : r.type)).join(' / ');
// numSelect: 숫자 + 단위 + 조건 → "150W RMS" / glue 면 공백 없이 "47kΩ". 숫자 없으면 ''.
export const buildNumSelect = (num: string | undefined, type: string | undefined, unit?: string, glue?: boolean) => {
  const n = (num ?? '').trim();
  const t = (type ?? '').trim();
  if (!n) return '';
  return `${n}${unit ?? ''}${t ? (glue ? t : ` ${t}`) : ''}`;
};
// 앰프 출력 종류 목록 — '전체'(단일 앰프가 전 대역 구동, 예: 싱글앰프) 맨 앞 + 동축·패시브 라디에이터 제외
// (동축=복합 유닛이라 매칭 모호 / 패시브 라디에이터=앰프 없는 수동 유닛)
export const AMP_POWER_TYPES = ['전체', ...DRIVER_TYPES.filter((t) => t !== '동축' && t !== '패시브 라디에이터')];

// 종류 → 담당 영역(대역). way 계산용. 동축은 담당대역 문자열을 '+'/'/'로 쪼개 각 역할명을 대역으로.
const ROLE_BAND: Record<string, string> = { '우퍼': '저역', '미드우퍼': '중저역', '미드레인지': '중역', '트위터': '고역', '슈퍼 트위터': '초고역', '풀레인지': '전대역' };
// 드라이버 행들 → 칩 배열(속성별). [N-way] [N-driver?] [크기] [재질] [구조] [종류 (개수)] ...
//   동축은 재질 없이 종류(담당대역). N-driver 칩은 활성 행 전부 개수 입력됐을 때만.
export function driverSummary(rows: DriverRow[]): string[] {
  const active = rows.filter((r) => r.type);
  if (active.length === 0) return [];
  const bands = new Set<string>();
  let drivers = 0;
  let allCounted = true; // 활성 행 전부 개수 입력됐을 때만 'N-driver' 칩 표시
  const chips: string[] = [];
  for (const r of active) {
    const n = parseInt(r.count, 10);
    if (Number.isFinite(n) && n > 0) drivers += n;
    else allCounted = false;
    const cnt = r.count ? ` (${r.count})` : '';
    if (r.type === '동축') {
      (r.band || '').split(/[+/]/).map((s) => s.trim()).filter(Boolean).forEach((seg) => bands.add(ROLE_BAND[seg] ?? seg));
      if (r.size) chips.push(`${r.size}${r.sizeUnit}`);
      if (r.structure) chips.push(r.structure);
      chips.push(`${r.type}(${r.band})${cnt}`);
    } else {
      bands.add(ROLE_BAND[r.type] ?? r.type);
      const mat = (r.material || '').replace(/\s*콘$/, ''); // 페이퍼 콘 → 페이퍼
      if (r.size) chips.push(`${r.size}${r.sizeUnit}`);
      if (mat) chips.push(mat);
      if (r.structure) chips.push(r.structure);
      chips.push(`${r.type}${cnt}`);
    }
  }
  const head = [`${bands.size}-way`];
  if (allCounted) head.push(`${drivers}-driver`);
  return [...head, ...chips];
}
