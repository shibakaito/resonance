// ============================================================================
// scripts/form-status.ts — 업로드 폼 현황표 생성 → docs/form-status.md
// ----------------------------------------------------------------------------
// 실행:  npx --yes tsx scripts/form-status.ts   (DB·네트워크 안 씀. 실행할 때마다 md 를 통째로 다시 씀)
// 원천 (손으로 적은 목록 없이 코드에서 계산):
//   · 기술 사양 — category-specs.ts(SPEC_FIELDS_BY_CATEGORY) × catalog.ts(CATEGORY_TREE) 하위 카테고리.
//     하위마다 showWhen 을 실제로 돌려 폼에 보이는 칸을 고르고, "보이는 조건" 문구는 트리거 칸
//     (형식·증폭 방식 같은 select)의 값을 바꿔 보며 자동으로 만든다. 스키마 없는 대분류는 spec-fields.ts 폴백.
//   · 공통 항목·필수 표시 — upload-page.tsx 마크업(라벨·aria-label="필수")과 handleSubmit 검사에서 추출
//   · 미완·보류 — 소스 주석, 정의 대비 사용처, mapRow 의 원천 없는 flat 키 등을 코드에서 계산
// ⚠️ 폼이 스키마 밖에서 하는 처리(사운드바 형식 자동 액티브 등)는 FORM_OVERRIDES — upload-page.tsx 를 바꾸면 같이
// ============================================================================
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { SPEC_FIELDS_BY_CATEGORY, optLabels, optLabel, AMP_OHM_OPTS, DRIVER_TYPES, TUBE_ROLE_OPTS, YES_NO_OPTS, type CategorySpecField, type SelectOption } from '@/app/data/category-specs';
import { CATEGORY_TREE } from '@/app/data/catalog';
import { SPEC_FIELDS } from '@/app/data/spec-fields';
import { AMP_POWER_TYPES } from '@/lib/spec-builders';
import { LABELS, SPEC_LABELS } from '@/lib/labels';

const OUT = 'docs/form-status.md';
const SELF = 'scripts/form-status.ts';
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const esc = (s: string) => s.replace(/\|/g, '\\|');
const MAX_OPTS = 6; // 선택지가 이보다 많으면 앞 6개 + "외 n개"
const list = (xs: readonly string[]) => (xs.length <= MAX_OPTS ? xs.join(' · ') : `${xs.slice(0, MAX_OPTS).join(' · ')} 외 ${xs.length - MAX_OPTS}개`);
const optValues = (opts: SelectOption[]) => opts.map((o) => (typeof o === 'string' ? o : o.value));

// 폼(upload-page.tsx)이 스키마 밖에서 하는 처리 — 현황표가 실제 화면과 같도록 반영
const FORM_OVERRIDES: Record<string, { fixed?: Record<string, string>; hide?: string[]; note?: string; rowNotes?: Record<string, string> }> = {
  사운드바: { fixed: { speakerDetail: 'active' }, hide: ['speakerDetail'], note: '형식은 액티브로 자동 설정되고 형식 칸은 숨김' },
  서브우퍼: { rowNotes: { driverComposition: '서브우퍼는 종류가 우퍼·패시브 라디에이터만' } },
};

// ── 칸 종류·단위·선택지 (input.kind → 사람 말) ──
function describeInput(f: CategorySpecField): { kind: string; unit: string; opts: string } {
  const inp = f.input;
  switch (inp.kind) {
    case 'auto': return { kind: '자동', unit: '', opts: '하위 카테고리명이 자동으로 들어감' };
    case 'select': {
      const labels = optLabels(inp.options);
      const yesNo = labels.length === YES_NO_OPTS.length && labels.every((l, i) => l === YES_NO_OPTS[i]);
      return { kind: yesNo ? 'yes/no' : '선택', unit: '', opts: list(labels) };
    }
    case 'searchSelect': return { kind: '선택(검색·직접 입력)', unit: '', opts: list(inp.options) };
    case 'multi': return { kind: '다중', unit: '', opts: list(optLabels(inp.options)) };
    case 'text': return { kind: inp.free ? '텍스트' : '숫자', unit: inp.unit ?? '', opts: '' };
    case 'numSelect': return inp.glue
      ? { kind: '숫자+단위 선택', unit: inp.options.join('/'), opts: '' }
      : { kind: '숫자+선택', unit: inp.unit ?? '', opts: list(inp.options) };
    case 'range': return { kind: '숫자 범위', unit: `${inp.lowUnit}~${inp.highUnit}`, opts: '하한~상한' };
    case 'dimensions': return { kind: '빌더', unit: 'mm', opts: '가로×깊이×높이 + 비고, 행 추가' };
    case 'valueNote': return { kind: '빌더', unit: inp.unit ?? '', opts: '값 + 비고, 행 추가' };
    case 'power': return { kind: '빌더', unit: 'W', opts: `출력 + 기준 옴(${list(inp.ohmOptions ?? AMP_OHM_OPTS)}) + 비고, 행 추가` };
    case 'crossover': return { kind: '빌더', unit: 'Hz/kHz', opts: '주파수 여러 개' };
    case 'drivers': return { kind: '빌더', unit: 'inch/mm', opts: `행마다 종류(${list(DRIVER_TYPES)})·구조·재질(동축은 담당 대역)·크기·개수` };
    case 'ampPower': return { kind: '빌더', unit: 'W', opts: `종류(${list(AMP_POWER_TYPES)})별 출력` };
    case 'tubeBuilder': return { kind: '빌더', unit: '', opts: `행마다 역할(${list(TUBE_ROLE_OPTS)})·종류·개수` };
    default: return { kind: (inp as { kind: string }).kind, unit: '', opts: '' };
  }
}

// ── 보이는 칸·조건 계산 ──────────────────────────────────────────────────────
type Assign = Record<string, string>;
type Row = { idx: number; f: CategorySpecField; cond: string; always: boolean; note?: string };
const isVisible = (f: CategorySpecField, ctx: Record<string, string | string[]>) => !f.showWhen || f.showWhen(ctx);
const combos = (keys: string[], valuesOf: (k: string) => string[], base: Assign): Assign[] =>
  keys.reduce<Assign[]>((acc, k) => acc.flatMap((a) => valuesOf(k).map((v) => ({ ...a, [k]: v }))), [{ ...base }]);

function analyze(fields: CategorySpecField[], sub: string): Row[] {
  const ov = FORM_OVERRIDES[sub] ?? {};
  const fixed = ov.fixed ?? {};
  // 트리거 후보 = select 칸 (값이 정해진 것만 조건에 쓰임). 같은 key 가 여러 번이면 첫 칸의 옵션 사용
  const selects = new Map<string, CategorySpecField>();
  for (const f of fields) if (f.input.kind === 'select' && !selects.has(f.key) && !(f.key in fixed)) selects.set(f.key, f);
  const valuesOf = (k: string) => ['', ...optValues((selects.get(k)!.input as { options: SelectOption[] }).options)];
  const sig = (ctx: Assign) => fields.map((f) => (isVisible(f, { ...ctx, __sub: sub }) ? '1' : '0')).join('');
  // 트리거 찾기 — 값을 바꾸면 다른 칸의 보임/숨김이 달라지는 select. 다른 트리거 조합 안에서만 드러나는 것까지 반복
  const triggers: string[] = [];
  for (let grew = true; grew; ) {
    grew = false;
    const bases = combos(triggers, valuesOf, fixed);
    for (const k of selects.keys()) {
      if (triggers.includes(k)) continue;
      if (bases.some((b) => new Set(valuesOf(k).map((v) => sig({ ...b, [k]: v }))).size > 1)) { triggers.push(k); grew = true; }
    }
  }
  const all = combos(triggers, valuesOf, fixed);
  const rows: Row[] = [];
  fields.forEach((f, idx) => {
    if (ov.hide?.includes(f.key)) return;
    const vis = all.map((a) => isVisible(f, { ...a, __sub: sub }));
    if (!vis.some(Boolean)) return; // 이 하위 카테고리에선 안 나오는 칸
    const always = vis.every(Boolean);
    rows.push({ idx, f, always, cond: always ? '항상' : condText(triggers, all, vis, selects, valuesOf), note: ov.rowNotes?.[f.key] });
  });
  return rows;
}

// 보이는 조합 집합 → "형식=패시브일 때만" / "카트리지 선택 후" 같은 문장
function condText(triggers: string[], all: Assign[], vis: boolean[], selects: Map<string, CategorySpecField>, valuesOf: (k: string) => string[]): string {
  const rel = triggers.filter((t) => {
    const groups = new Map<string, Set<boolean>>();
    all.forEach((a, i) => {
      const key = triggers.filter((x) => x !== t).map((x) => a[x]).join('\u0001');
      if (!groups.has(key)) groups.set(key, new Set());
      groups.get(key)!.add(vis[i]);
    });
    return [...groups.values()].some((s) => s.size > 1);
  });
  const allowed = new Map(rel.map((t) => [t, valuesOf(t).filter((v) => all.some((a, i) => vis[i] && a[t] === v))]));
  const labelOf = (t: string, v: string) => (v === '' ? '미선택' : optLabel((selects.get(t)!.input as { options: SelectOption[] }).options, v));
  const isProduct = all.every((a, i) => vis[i] === rel.every((t) => allowed.get(t)!.includes(a[t])));
  if (!isProduct) {
    const shown = [...new Set(all.filter((_, i) => vis[i]).map((a) => rel.map((t) => `${selects.get(t)!.label}=${labelOf(t, a[t])}`).join(', ')))];
    return `조건 복합: ${shown.join(' / ')}`;
  }
  const parts = rel.map((t) => {
    const A = allowed.get(t)!;
    const nonEmpty = valuesOf(t).filter(Boolean);
    const anyValue = !A.includes('') && nonEmpty.every((v) => A.includes(v));
    return { anyValue, text: anyValue ? `${selects.get(t)!.label} 선택` : `${selects.get(t)!.label}=${A.map((v) => labelOf(t, v)).join('·')}` };
  });
  return parts.map((p) => p.text).join(', ') + (parts[parts.length - 1].anyValue ? ' 후' : '일 때만');
}

// ── 하위 카테고리 목록·상태 ──────────────────────────────────────────────────
type SubInfo = { top: string; leaf: string; path: string; status: string; rows: Row[]; note?: string; fallback: boolean };
const subs: SubInfo[] = [];
for (const { top, subs: nodes } of CATEGORY_TREE) {
  const leaves = nodes.flatMap((n) => (typeof n === 'string' ? [{ leaf: n, path: n }] : n.items.map((it) => ({ leaf: it, path: `${n.group} > ${it}` }))));
  const fields = SPEC_FIELDS_BY_CATEGORY[top];
  if (!fields) {
    for (const l of leaves) subs.push({ top, ...l, status: '폴백', rows: [], fallback: true });
    continue;
  }
  const base = analyze(fields, '__기본__');
  const baseIdx = new Set(base.map((r) => r.idx));
  const baseTailOnly = base.every((r) => !r.f.showWhen); // 조건 없는 칸만 = 타입 + 공통 꼬리
  for (const l of leaves) {
    const rows = analyze(fields, l.leaf);
    const extra = rows.some((r) => !baseIdx.has(r.idx));
    const same = !extra && rows.length === baseIdx.size;
    const status = extra ? '전용 블록 있음' : same ? (baseTailOnly ? '공통 꼬리만' : '기본 블록') : '기본 블록(일부 숨김)';
    subs.push({ top, ...l, status, rows, note: FORM_OVERRIDES[l.leaf]?.note, fallback: false });
  }
}

// ── 공통 항목 (upload-page.tsx 마크업에서) ─────────────────────────────────
const UP = read('src/app/components/upload-page.tsx');
const PAGE = UP.slice(UP.indexOf('export function UploadPage'));
const cleanJsx = (s: string) => {
  let t = s;
  for (let i = 0; i < 6; i++) t = t.replace(/\{[^{}]*\}/g, ' '); // JSX 식 {…} (중첩은 바깥까지 반복 제거)
  return t.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
};
type CommonRow = { section: string; label: string; required: boolean; note: string; boundVar?: string };
const common: CommonRow[] = [];
{
  let section = '';
  const re = /<h2\b[^>]*>([\s\S]*?)<\/h2>|<label className=\{?[`"]block font-semibold mb-1([^>]*)>([\s\S]*?)<\/label>|<label className="flex items-(?:center|start) gap-2 cursor-pointer[^"]*">([\s\S]*?)<\/label>|<h3\b[^>]*>([\s\S]*?)<\/h3>|name="(shipping)"/g;
  for (const m of PAGE.matchAll(re)) {
    const [, h2, labAttr, lab, chk, h3, radio] = m;
    const before = PAGE.slice(Math.max(0, (m.index ?? 0) - 300), m.index);
    const after = PAGE.slice(m.index ?? 0, (m.index ?? 0) + 700);
    const bound = /value=\{\s*([A-Za-z_]\w*)/.exec(after)?.[1];
    if (h2 !== undefined) { section = cleanJsx(h2); continue; }
    if (radio) { // 배송 방식 라디오 — 옵션 배열 { value, label } 에서 라벨
      const opts = [...PAGE.slice(Math.max(0, (m.index ?? 0) - 1500), m.index).matchAll(/\{ value: '\w+', label: '([^']+)'/g)].map((x) => x[1]);
      common.push({ section, label: '배송 방식', required: false, note: `라디오: ${opts.join(' · ')}` });
      continue;
    }
    if (lab !== undefined) {
      const note = /condition\.startsWith\('used_'\)/.test(labAttr) ? '중고 상태일 때 활성' : /shippingType === 'flat' &&/.test(before) ? '고정 배송비 선택 시' : '';
      common.push({ section, label: cleanJsx(lab), required: /aria-label="필수"/.test(lab), note, boundVar: bound });
    } else if (chk !== undefined) {
      const t = cleanJsx(chk);
      common.push({ section, label: t.length > 40 ? t.slice(0, 40) + '…' : t, required: false, note: '체크박스' });
    } else if (h3 !== undefined && /aria-label="필수"/.test(h3)) {
      common.push({ section, label: cleanJsx(h3), required: true, note: '', boundVar: bound });
    }
  }
}
const SUBMIT = UP.slice(UP.indexOf('const handleSubmit'), UP.indexOf('setSubmitting(true)'));
const submitMsgs = [...SUBMIT.matchAll(/setSubmitError\('([^']+)'\)/g)].map((m) => m[1]);
const submitVars = new Set([...SUBMIT.matchAll(/!\s*([A-Za-z_]\w*)/g)].map((m) => m[1]));
const sections = [...PAGE.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => cleanJsx(m[1]));

// ── 미완·보류 계산 ───────────────────────────────────────────────────────────
function walk(dir: string): string[] {
  let out: string[] = [];
  for (const name of readdirSync(join(process.cwd(), dir))) {
    const p = `${dir}/${name}`;
    if (name === 'node_modules' || name.startsWith('.')) continue;
    if (statSync(join(process.cwd(), p)).isDirectory()) out = out.concat(walk(p));
    else if (/\.(tsx?|sql)$/.test(name)) out.push(p);
  }
  return out;
}
const FILES = ['src', 'app', 'scripts', 'supabase'].flatMap(walk).filter((p) => p !== SELF);
const SRC = new Map(FILES.map((p) => [p, read(p)]));

// (1) TODO·임시·보류 주석
const WORDS = /TODO|FIXME|XXX|HACK|보류|미완|미구현|미해결|임시|추후|다음 단계/; // '나중에'는 설명 주석(SQL 등)까지 잡혀서 제외
// 주석이 가리키는 일이 이미 끝났거나 결정된 경우 메모 (주석 문구 일부로 매칭 — 문구가 바뀌면 안 붙음)
const COMMENT_NOTES: [RegExp, string][] = [
  [/A단계: 입력만, 요약·저장은 다음 단계/, '요약·저장은 이미 구현됨 — 주석만 오래됨'],
  [/판매 페이지는 다음 단계에서 추가됨/, '/sell 페이지는 이미 있음 — 주석만 오래됨'],
  [/다국어 전환은 다음에/, '영문키 통일은 보류 결정(Y안) — 다국어 착수 때 다시'],
];
const todos: { at: string; text: string; note: string }[] = [];
for (const [p, src] of SRC) {
  src.split('\n').forEach((line, i) => {
    const m = /(\/\/|\/\*|\{\/\*|--\s)(.*)$/.exec(line);
    if (!m || /https?:$/.test(line.slice(0, m.index))) return;
    const text = m[2].replace(/\*\/\}?\s*$/, '').trim();
    if (!WORDS.test(text)) return;
    todos.push({ at: `${p}:${i + 1}`, text: text.length > 110 ? text.slice(0, 110) + '…' : text, note: COMMENT_NOTES.find(([re]) => re.test(text))?.[1] ?? '' });
  });
}

// (2) 사용처 0인 export (import 문·주석·자기 선언 줄 빼고 이름이 한 번도 안 나오면)
const stripForUse = (s: string) => s
  .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];?/gm, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');
const EXPORT_FILES = FILES.filter((p) => /^src\/(app\/data|lib)\/[^/]+\.ts$/.test(p) || p === 'src/app/components/browse-filters.ts');
const unusedExports: { file: string; name: string }[] = [];
for (const file of EXPORT_FILES) {
  for (const m of SRC.get(file)!.matchAll(/^export (?:const|function|let) (\w+)/gm)) {
    const name = m[1];
    const re = new RegExp(`\\b${name}\\b`, 'g');
    let uses = 0;
    for (const [p, src] of SRC) {
      const body = p === file ? src.split('\n').filter((l) => !new RegExp(`^export (?:const|function|let) ${name}\\b`).test(l)).join('\n') : src;
      uses += (stripForUse(body).match(re) ?? []).length;
    }
    if (uses === 0) unusedExports.push({ file, name });
  }
}

// (3) 라벨 표(labels.ts) 이름공간 사용처 — label('ns'… / labelOpts('ns'… / keyFor('ns'… / LABELS.ns
const nsUse = (ns: string) => {
  const re = new RegExp(`\\b(?:label|labelOpts|keyFor)\\(\\s*['"]${ns}['"]|(?:SPEC_LABELS|LABELS)(?:\\.${ns}\\b|\\[['"]${ns}['"]\\])`, 'g');
  const flatRe = new RegExp(`\\blabel\\(\\s*['"]${ns}['"]\\s*,\\s*s\\.`, 'g'); // mapRow 의 옛 flat 키 읽기
  let total = 0, flat = 0;
  for (const [p, src] of SRC) {
    if (p === 'src/lib/labels.ts') continue;
    const body = stripForUse(src);
    total += (body.match(re) ?? []).length;
    flat += (body.match(flatRe) ?? []).length;
  }
  return { total, flat };
};
const labelFindings: { table: string; ns: string; why: string }[] = [];
for (const [table, map] of [['LABELS', LABELS], ['SPEC_LABELS', SPEC_LABELS]] as const) {
  for (const ns of Object.keys(map)) {
    const { total, flat } = nsUse(ns);
    if (total === 0) labelFindings.push({ table, ns, why: '사용처 0' });
    else if (flat === total) labelFindings.push({ table, ns, why: 'mapRow 의 옛 flat 키 읽기에만 쓰임 (데이터 원천 없음)' });
  }
}

// (4) 원천 없는·죽은 필터 — mapRow 가 폼이 저장하지 않는 flat 키를 읽는 Listing 필드
const LISTINGS = read('src/lib/listings.ts');
const MAPROW = LISTINGS.slice(LISTINGS.indexOf('function mapRow'), LISTINGS.indexOf('export async function fetchListings'));
const formTopKeys = new Set(['tech', ...[...UP.matchAll(/specsToSave\.(\w+) =/g)].map((m) => m[1])]); // 폼이 specs 최상위에 쓰는 키
const BROWSE = read('src/app/components/browse-page.tsx');
const TOPS = new Set(CATEGORY_TREE.map((c) => c.top));
const gateDefs = new Map([...BROWSE.matchAll(/const (is\w+) =\s*([^;]+);/g)].map((m) => [m[1], m[2]]));
const unreachable = (gate: string, seen = new Set<string>()): boolean => {
  const def = gateDefs.get(gate);
  if (!def || seen.has(gate)) return false;
  seen.add(gate);
  const cat = /category === '([^']+)'/.exec(def)?.[1];
  if (cat && !TOPS.has(cat)) return true;
  return [...def.matchAll(/\b(is\w+)\b/g)].some((m) => m[1] !== gate && /&&/.test(def) && unreachable(m[1], seen));
};
const deadGates = [...gateDefs.keys()].filter((g) => unreachable(g));
const deadFilters: { field: string; flatKey: string; ui: string; verdict: string }[] = [];
for (const m of MAPROW.matchAll(/^\s*(\w+):[^\n]*?\bs\.(\w+)/gm)) {
  const [, field, flatKey] = m;
  if (formTopKeys.has(flatKey)) continue;
  const uiRe = new RegExp(`filters\\.${field}(?:Min|Max)?\\b`);
  const uiAt = BROWSE.split('\n').findIndex((l) => uiRe.test(l) && /(FilterSection|RangeSection|FilterDropdown)/.test(l));
  let gate = '';
  if (uiAt >= 0) for (let i = uiAt; i >= 0; i--) { const g = /\{(is\w+) && \(/.exec(BROWSE.split('\n')[i]); if (g) { gate = g[1]; break; } }
  const ui = uiAt < 0 ? '없음' : `사이드바(${gate || '항상'})`;
  const verdict = uiAt < 0 ? '죽은 필터 — 필터 UI 없음 + 데이터 원천 없음'
    : deadGates.includes(gate) ? `죽은 필터 — UI 가 도달할 수 없는 분기(${gate}) 아래`
    : '원천 없음 — 필터는 보이지만 폼 스키마가 없어 항상 0';
  deadFilters.push({ field, flatKey, ui, verdict });
}

// (5) 필수 표시 vs 제출 검사
const requiredRows = common.filter((r) => r.required);
const notChecked = requiredRows.filter((r) => !r.boundVar || !submitVars.has(r.boundVar));

// (6) 인수인계 보류 2건 — 원문은 기획 채팅에 있어 저장소엔 없음 → 지금 코드 상태만 확인
const techDefault = /useState\((true|false)\);\s*\/\/ 기술 사양 섹션 접기/.exec(UP)?.[1];
const chipCls = /선택된 항목 칩[^\n]*\n[\s\S]{0,300}?<span key=\{o\} className="([^"]+)"/.exec(UP)?.[1] ?? '';
const handover = [
  { item: '기술 사양 고급 설정 접기', state: /고급|advanced/i.test(UP)
    ? '코드에 고급/advanced 관련 구현이 있음 — 직접 확인 필요'
    : `미구현 — 고급/기본 칸 구분 없음. 기술 사양은 섹션 전체 접기만 있음 (techExpanded, 기본 ${techDefault === 'true' ? '펼침' : '접힘'})` },
  { item: 'multiSel 칩 테두리', state: chipCls
    ? `다중 선택 칩(MultiSelectDropdown): 테두리 ${/\bborder\b/.test(chipCls) ? '있음' : '없음'} · 배경 ${/bg-\[(#\w+)\]/.exec(chipCls)?.[1] ?? '-'} · 선택됐을 때만 표시 — 입력/출력 단자·무선·포맷 등 다중 선택 공통 (지원 임피던스는 별도 위젯 ImpedanceSelect)`
    : '칩 마크업을 못 찾음 — 직접 확인 필요' },
];

// ── md 조립 ──────────────────────────────────────────────────────────────────
const L: string[] = [];
const out = (s = '') => L.push(s);
out('# 업로드 폼 현황표');
out();
out('> 자동 생성 문서 — 손으로 고치지 말고 `npx --yes tsx scripts/form-status.ts` 로 다시 만드세요.');
out('> 원천: `src/app/data/category-specs.ts`(기술 사양) · `src/app/data/catalog.ts`(카테고리) · `src/app/components/upload-page.tsx`(공통 항목·폼 특수 처리)');
out();
out('## 읽는 법');
out('- **종류**: 선택(드롭다운) · 다중(여러 개 고르기) · yes/no(있음/없음) · 숫자 · 텍스트 · 빌더(행을 추가하는 묶음 입력) · 자동');
out('- **보이는 조건**: `항상` 이 아니면 다른 칸 값에 따라 나타남 (예: `형식=패시브일 때만`, `카트리지 선택 후`). 하위 카테고리별 조건은 표마다 이미 반영됨');
out('- **필수**: 기술 사양 칸은 전부 선택 입력 — 필수는 아래 "공통 항목"에만 있음');
out('- **상태**: 전용 블록 있음(이 하위에만 나오는 칸이 있음) · 기본 블록(대분류 공통 칸) · 공통 꼬리만(타입 + 마감·전원·크기·무게) · 폴백(카테고리 스키마 없음 → 옛 자유 입력 칸)');
out('- 칸 구성이 똑같은 하위 카테고리는 표 하나로 묶음');
out();
out('## 한눈에 보기');
out();
out('| 대분류 | 하위 카테고리 | 상태 | 칸 수 | 항상 | 조건부 |');
out('|---|---|---|---:|---:|---:|');
for (const s of subs) {
  const n = s.fallback ? SPEC_FIELDS.length : s.rows.length;
  const always = s.fallback ? n : s.rows.filter((r) => r.always).length;
  out(`| ${s.top} | ${esc(s.path)} | ${s.status} | ${n} | ${always} | ${n - always} |`);
}
out();
out('## 공통 항목 (모든 카테고리)');
out();
out(`섹션 순서: ${sections.join(' → ')}`);
out();
out('| 섹션 | 칸 | 필수 표시 | 비고 |');
out('|---|---|---|---|');
for (const r of common) out(`| ${r.section} | ${esc(r.label)} | ${r.required ? '●' : ''} | ${esc(r.note)} |`);
out();
out(`제출할 때 실제로 검사하는 것: ${submitMsgs.map((m) => `"${m}"`).join(' · ')}`);
out();
for (const { top } of CATEGORY_TREE) {
  const group = subs.filter((s) => s.top === top);
  const schema = SPEC_FIELDS_BY_CATEGORY[top];
  out(`## ${top} — ${schema ? `스키마 ${schema.length}칸` : '스키마 없음(폴백)'}`);
  out();
  if (!schema) {
    out(`### ${group.map((s) => s.path).join(' · ')} — 폴백`);
    out();
    out(`카테고리 스키마가 없어 옛 자유 입력 ${SPEC_FIELDS.length}칸(spec-fields.ts)이 그대로 나옴 — 앰프용 칸(채널·소자·정격 출력…)이 보임. 값은 specs.tech 에 자유 텍스트로 저장.`);
    out();
    out('| # | 라벨 | 종류 | 단위 | 선택지 | 보이는 조건 | 필수 |');
    out('|---:|---|---|---|---|---|---|');
    SPEC_FIELDS.forEach((f, i) => out(`| ${i + 1} | ${f.label} | 텍스트 |  |  | 카테고리 선택 후 | 선택 |`));
    out();
    continue;
  }
  // 칸 구성이 같은 하위는 묶음 (순서는 카탈로그 순)
  const render = (s: SubInfo) => s.rows.map((r, i) => {
    const d = describeInput(r.f);
    const opts = [d.opts, r.note].filter(Boolean).join(' — ');
    return `| ${i + 1} | ${esc(r.f.label)} | ${d.kind} | ${esc(d.unit)} | ${esc(opts)} | ${esc(r.cond)} | ${r.f.input.kind === 'auto' ? '자동' : '선택'} |`;
  });
  const buckets = new Map<string, SubInfo[]>();
  for (const s of group) {
    const key = `${s.status}\n${s.note ?? ''}\n${render(s).join('\n')}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(s);
  }
  for (const members of buckets.values()) {
    const s = members[0];
    out(`### ${members.map((m) => m.path).join(' · ')} — ${s.status} (${s.rows.length}칸)`);
    out();
    if (s.note) { out(`> ${s.note}`); out(); }
    out('| # | 라벨 | 종류 | 단위 | 선택지 | 보이는 조건 | 필수 |');
    out('|---:|---|---|---|---|---|---|');
    render(s).forEach((line) => out(line));
    out();
  }
}
const issueCount = todos.length + unusedExports.length + labelFindings.length + deadFilters.length + deadGates.length + notChecked.length + handover.length;
out(`## 코드에서 보이는 미완·보류 — 총 ${issueCount}건`);
out();
out(`### 1. TODO·임시·보류 주석 — ${todos.length}건`);
out();
out('| 위치 | 주석 | 메모 |');
out('|---|---|---|');
for (const t of todos) out(`| \`${t.at}\` | ${esc(t.text)} | ${esc(t.note)} |`);
out();
out(`### 2. 사용처 0인 export 상수·함수 — ${unusedExports.length}건`);
out();
out('import 문·주석·자기 선언 줄을 빼고 이름이 한 번도 안 나오는 것 (`src/app/data`·`src/lib`·`browse-filters.ts` 대상).');
out();
out('| 파일 | 이름 |');
out('|---|---|');
for (const u of unusedExports) out(`| \`${u.file}\` | \`${u.name}\` |`);
out();
out(`### 3. 라벨 표(labels.ts) 중 쓰이지 않는 것 — ${labelFindings.length}건`);
out();
out('| 표 | 이름 | 상태 |');
out('|---|---|---|');
for (const f of labelFindings) out(`| ${f.table} | \`${f.ns}\` | ${f.why} |`);
out();
out(`### 4. 원천 없는·죽은 필터 — ${deadFilters.length}건 (+ 도달할 수 없는 카테고리 분기 ${deadGates.length}개)`);
out();
out(`mapRow 가 폼이 저장하지 않는 옛 flat 키를 읽는 Listing 필드. 폼이 specs 최상위에 쓰는 키: ${[...formTopKeys].join(', ')}.`);
out();
out('| Listing 필드 | 읽는 flat 키 | 필터 UI | 판정 |');
out('|---|---|---|---|');
for (const d of deadFilters) out(`| \`${d.field}\` | \`s.${d.flatKey}\` | ${d.ui} | ${d.verdict} |`);
out();
if (deadGates.length) {
  out(`browse-page.tsx 의 카테고리 분기 중 CATEGORY_TREE 에 없는 대분류를 가리키는 것: ${deadGates.map((g) => `\`${g}\` (${gateDefs.get(g)!.replace(/\s+/g, ' ').trim()})`).join(' · ')} — 그 아래 그룹·필터 코드는 실행되지 않음.`);
  out();
}
out(`### 5. 필수 표시 vs 제출 검사 — 불일치 ${notChecked.length}건`);
out();
out(`필수 표시(●): ${requiredRows.map((r) => r.label).join(' · ')}`);
out();
out(`제출 시 검사 변수: ${[...submitVars].join(', ')}`);
out();
if (notChecked.length) out(`표시는 필수인데 제출 때 검사 안 함: ${notChecked.map((r) => r.label).join(' · ')}`);
out();
out(`### 6. 인수인계 보류 2건 — 현재 코드 상태`);
out();
out('원문은 기획 채팅의 인수인계에 있고 저장소엔 없어서, 지금 코드에서 확인한 상태만 적음.');
out();
out('| 항목 | 현재 상태 |');
out('|---|---|');
for (const h of handover) out(`| ${h.item} | ${esc(h.state)} |`);
out();

mkdirSync(join(process.cwd(), 'docs'), { recursive: true });
writeFileSync(join(process.cwd(), OUT), L.join('\n'));
// 채팅 보고용 요약
const perTop = CATEGORY_TREE.map(({ top }) => {
  const g = subs.filter((s) => s.top === top);
  const counts = g.map((s) => (s.fallback ? SPEC_FIELDS.length : s.rows.length));
  return `${top}: 하위 ${g.length}개 · 칸 ${Math.min(...counts)}~${Math.max(...counts)} (스키마 ${SPEC_FIELDS_BY_CATEGORY[top]?.length ?? `폴백 ${SPEC_FIELDS.length}`})`;
});
console.log(`✓ ${OUT} 생성 (${L.length}줄)`);
perTop.forEach((l) => console.log('  ' + l));
console.log(`  미완·보류 ${issueCount}건: 주석 ${todos.length} · 미사용 export ${unusedExports.length} · 라벨 ${labelFindings.length} · 필터 ${deadFilters.length}(+분기 ${deadGates.length}) · 필수 불일치 ${notChecked.length} · 인수인계 ${handover.length}`);
