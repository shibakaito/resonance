// ============================================================================
// browse-url.ts — 둘러보기 상태(필터, 하위 카테고리, 정렬) ↔ 주소 (2026-11-10)
// ----------------------------------------------------------------------------
// 필터 상태의 원본은 주소. 새로고침하거나 링크를 공유해도 같은 필터 화면이 열림
// 규칙 (칸마다 따로 쓰지 않고 browse-filters.ts FILTER_DEFS 표에서 만듦)
//   체크 여러 개 = 같은 키 반복 (brand=A&brand=B) / 범위 = 키_min, 키_max / 한 칸 = 키 / 빈 값은 주소에서 뺌
//   가격은 주소에 원 단위 (화면 칸은 만원, FILTER_DEFS 의 scale)
//   하위 카테고리 1개 = 경로 /browse/amps/preamp, 2개 이상 = /browse/amps?sub=preamp&sub=power-amp (슬러그)
//   정렬 = sort=latest | price_asc | price_desc (추천순은 주소에서 뺌)
// 읽을 때 버리는 것: 받는 값(options)에 없는 값, 기능 플래그가 꺼진 칸, 그 카테고리에서 안 보이는 칸(filterVisibility), 숫자가 아닌 범위 값
// 쓸 때: 이 파일이 맡은 키만 지우고 다시 씀. 그 밖의 키(q, utm_* 등)는 그대로 둠
// ============================================================================
import { FILTER_DEFS, SORT_OPTIONS, emptyFilters, filterVisibility, type FilterDef, type Filters } from './browse-filters';
import { categoryFromSlug, categorySlug } from '@/app/data/category-slugs';
import { subcategoriesFor, topCategoryOf } from '@/app/data/catalog';

const DEFS = FILTER_DEFS as readonly FilterDef[];

// 정렬 화면 글자 ↔ 주소 값. 추천순(기본)은 주소에 안 씀
export const DEFAULT_SORT = SORT_OPTIONS[0];
export const SORT_PARAMS: Record<string, string> = { 최신순: 'latest', '가격 낮은순': 'price_asc', '가격 높은순': 'price_desc' };
const SORT_FROM_PARAM: Record<string, string> = Object.fromEntries(Object.entries(SORT_PARAMS).map(([label, p]) => [p, label]));

// 이 파일이 맡은 주소 키 — 쓸 때 지우고 다시 씀
export const MANAGED_PARAMS = new Set<string>([
  'sub',
  'sort',
  ...DEFS.flatMap((d) => (d.kind === 'range' ? [`${d.param}_min`, `${d.param}_max`] : [d.param])),
]);

export type BrowseState = {
  filters: Filters;
  subs: Set<string>; // 고른 하위 카테고리 (한글 이름)
  sort: string;      // 정렬 화면 글자 (SORT_OPTIONS)
};

// 이 대분류의 하위 카테고리인가 (숨긴 하위 카테고리도 주소로는 열림 — 예전 경로 규칙과 같음)
const isSubOf = (category: string | null, name: string | null): name is string =>
  !!category && !!name && name !== category && topCategoryOf(name) === category;

// 하위 카테고리를 메뉴 순서로 (주소가 늘 같은 순서로 써지게)
const orderedSubs = (category: string | null, subs: Set<string>): string[] => {
  const visible = category ? subcategoriesFor(category) : [];
  return [...visible.filter((s) => subs.has(s)), ...[...subs].filter((s) => !visible.includes(s))];
};

// 주소 글자 → 숫자. 비었거나 숫자가 아니면 null. 주소 값 ÷ scale = 화면 값
const readNum = (raw: string | null, scale = 1): number | null => {
  if (raw == null || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n / scale : null;
};
// 화면 값 × scale → 주소 글자 (소수 오차 정리)
const writeNum = (n: number, scale = 1): string => String(Number((n * scale).toFixed(6)));

// 주소 → 상태. category = 경로 첫 슬러그의 대분류, pathSub = 경로 둘째 슬러그의 하위 카테고리 (없으면 null)
export function readBrowseState(category: string | null, pathSub: string | null, sp: URLSearchParams): BrowseState {
  const subs = new Set<string>();
  if (isSubOf(category, pathSub)) subs.add(pathSub);
  for (const slug of sp.getAll('sub')) {
    const name = categoryFromSlug(slug);
    if (isSubOf(category, name)) subs.add(name);
  }
  const vis = filterVisibility(category, subs);
  const f = emptyFilters() as Record<string, Set<string> | number | null>;
  for (const d of DEFS) {
    if (d.enabled === false) continue;
    if (d.show && !d.show(vis)) continue;
    if (d.kind === 'set') {
      const set = f[d.key] as Set<string>;
      for (const v of sp.getAll(d.param)) if (v !== '' && (!d.options || d.options.includes(v))) set.add(v);
    } else if (d.kind === 'range') {
      f[d.min] = readNum(sp.get(`${d.param}_min`), d.scale);
      f[d.max] = readNum(sp.get(`${d.param}_max`), d.scale);
    } else {
      f[d.key] = readNum(sp.get(d.param));
    }
  }
  return { filters: f as Filters, subs, sort: SORT_FROM_PARAM[sp.get('sort') ?? ''] ?? DEFAULT_SORT };
}

// 상태 → 주소(경로 + 물음표 뒤). keep = 지금 주소의 물음표 뒤(맡지 않은 키를 그대로 두려고). 안 보이는 칸과 빈 값은 안 씀
export function browseHref(category: string | null, state: Partial<BrowseState>, keep?: URLSearchParams): string {
  const sp = new URLSearchParams();
  keep?.forEach((v, k) => {
    if (!MANAGED_PARAMS.has(k)) sp.append(k, v);
  });
  const top = category ? categorySlug(category) : null;
  let path = top ? `/browse/${top}` : '/browse';
  const subs = top ? orderedSubs(category, state.subs ?? new Set()) : [];
  if (subs.length === 1) path += `/${categorySlug(subs[0]) ?? subs[0]}`;
  else for (const s of subs) sp.append('sub', categorySlug(s) ?? s);

  if (state.filters) {
    const vis = filterVisibility(category, new Set(subs));
    const f = state.filters;
    for (const d of DEFS) {
      if (d.enabled === false) continue;
      if (d.show && !d.show(vis)) continue;
      if (d.kind === 'set') {
        for (const v of f[d.key]) sp.append(d.param, v);
      } else if (d.kind === 'range') {
        const lo = f[d.min];
        const hi = f[d.max];
        if (lo != null) sp.set(`${d.param}_min`, writeNum(lo, d.scale));
        if (hi != null) sp.set(`${d.param}_max`, writeNum(hi, d.scale));
      } else {
        const n = f[d.key];
        if (n != null) sp.set(d.param, writeNum(n));
      }
    }
  }
  if (state.sort && SORT_PARAMS[state.sort]) sp.set('sort', SORT_PARAMS[state.sort]);
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}

// 경로 → 대분류, 경로의 하위 카테고리 (/browse, /browse/amps, /browse/amps/preamp)
export function parseBrowsePath(pathname: string): { category: string | null; pathSub: string | null } {
  const parts = pathname.split('/').filter(Boolean); // ['browse', 'amps', 'preamp']
  return { category: categoryFromSlug(parts[1]) ?? null, pathSub: categoryFromSlug(parts[2]) ?? null };
}
