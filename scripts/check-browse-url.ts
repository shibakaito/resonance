// ============================================================================
// check-browse-url.ts — 둘러보기 주소 읽기, 쓰기 왕복 검사 (DB, 네트워크 안 씀)
// ----------------------------------------------------------------------------
// 실행:  npx --yes tsx scripts/check-browse-url.ts
//   ① 대분류, 하위 카테고리 조합마다 보이는 칸에 아무 값이나 넣고 쓰기 → 읽기 → 쓰기가 같은지
//   ② 홈에서 넘어오던 주소, 모르는 값, 꺼진 플래그, 안 보이는 칸, utm 같은 남의 키 처리
// 실패가 하나라도 있으면 끝 코드 1
// ============================================================================
import { browseHref, readBrowseState, parseBrowsePath, type BrowseState } from '@/app/components/browse-url';
import { FILTER_DEFS, SORT_OPTIONS, emptyFilters, filterVisibility, type FilterDef, type Filters } from '@/app/components/browse-filters';
import { TOP_CATEGORIES, subcategoriesFor } from '@/app/data/catalog';

let pass = 0;
const fails: string[] = [];
const ok = (cond: boolean, name: string) => (cond ? pass++ : fails.push(name));

// 상태 비교용 글자 (Set 은 정렬해서)
const norm = (s: BrowseState) =>
  JSON.stringify({
    subs: [...s.subs].sort(),
    sort: s.sort,
    f: Object.fromEntries(Object.entries(s.filters).map(([k, v]) => [k, v instanceof Set ? [...v].sort() : v])),
  });
const read = (href: string): BrowseState => {
  const u = new URL(href, 'http://x');
  const { category, pathSub } = parseBrowsePath(u.pathname);
  return readBrowseState(category, pathSub, u.searchParams);
};

// 작은 난수 (매번 같은 결과)
let seed = 7;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];
const FREE_VALUES = ['Accuphase', 'Bang & Olufsen', 'Grace Audio', 'E-380', '맥킨토시, 2', 'A/B=C'];

// ① 왕복: 대분류(없음 포함) × 하위 카테고리(없음, 하나씩, 둘)
const DEFS = FILTER_DEFS as readonly FilterDef[];
const combos: [string | null, string[]][] = [[null, []]];
for (const top of TOP_CATEGORIES) {
  const subs = subcategoriesFor(top);
  combos.push([top, []]);
  for (const s of subs) combos.push([top, [s]]);
  if (subs.length >= 2) combos.push([top, [subs[0], subs[1]]]);
}
for (const [cat, subList] of combos) {
  for (let round = 0; round < 5; round++) {
    const subs = new Set(subList);
    const vis = filterVisibility(cat, subs);
    const f = emptyFilters() as Record<string, Set<string> | number | null>;
    for (const d of DEFS) {
      if (d.enabled === false || (d.show && !d.show(vis)) || rnd() < 0.5) continue;
      if (d.kind === 'set') {
        const opts = d.options ?? FREE_VALUES;
        const n = 1 + Math.floor(rnd() * 3);
        for (let i = 0; i < n; i++) (f[d.key] as Set<string>).add(pick(opts));
      } else if (d.kind === 'range') {
        if (rnd() < 0.7) f[d.min] = Math.round(rnd() * 1000) / (d.scale ? 1 : 2);
        if (rnd() < 0.7) f[d.max] = 1000 + Math.round(rnd() * 1000);
      } else {
        f[d.key] = Math.round(rnd() * 600);
      }
    }
    const state: BrowseState = { filters: f as Filters, subs, sort: pick(SORT_OPTIONS) };
    const href1 = browseHref(cat, state);
    const back = read(href1);
    const href2 = browseHref(cat, back);
    ok(norm(back) === norm(state), `왕복 상태 같음: ${cat ?? '전체'} / ${subList.join('+') || '하위 없음'} #${round} → ${href1}`);
    ok(href1 === href2, `쓰기 두 번 같음: ${href1} vs ${href2}`);
  }
}

// ② 정해진 경우
{
  const s = read('/browse/amps?condition=used&appearance=excellent&working=working&brand=Accuphase&model=E-380');
  ok(s.filters.condition.has('used') && s.filters.appearance.has('excellent') && s.filters.working.has('working'), '홈 링크: 상태, 외관, 작동');
  ok(s.filters.brand.has('Accuphase') && s.filters.model.has('E-380'), '홈 링크: 브랜드, 모델');
}
{
  const s = read('/browse/amps?loc_country=jp&region=kr_seoul&region=jp_tokyo');
  ok(s.filters.locationCountry.size === 0, '국가: 일본 확장 꺼져 있으면 버림');
  ok(s.filters.region.has('kr_seoul') && !s.filters.region.has('jp_tokyo'), '지역: 한국 지역만 받음');
}
{
  const s = read('/browse/amps?condition=foo&sort=bar&price_min=abc&price_max=');
  ok(s.filters.condition.size === 0 && s.sort === SORT_OPTIONS[0] && s.filters.priceMin == null && s.filters.priceMax == null, '모르는 값, 숫자 아닌 값 버림');
}
{
  ok(read('/browse/speakers?channel=stereo').filters.ampDetail.size === 0, '안 보이는 칸(스피커에서 채널) 버림');
  ok(read('/browse/sources?drive_type=belt_drive').filters.driveType.size === 0, '턴테이블 칸은 턴테이블만 골랐을 때만');
  ok(read('/browse/sources/turntable?drive_type=belt_drive').filters.driveType.has('belt_drive'), '턴테이블 경로면 받음');
  ok(read('/browse/amps?tone_control=yes&ownership=single_owner').filters.toneControl.size === 0, '플래그 꺼진 칸(톤 컨트롤) 버림');
  ok(read('/browse/amps?ownership=single_owner').filters.ownership.size === 0, '플래그 꺼진 칸(소유권) 버림');
}
{
  const s = read('/browse/amps?price_min=4200000&price_max=10500000');
  ok(s.filters.priceMin === 420 && s.filters.priceMax === 1050, '가격: 주소 원 → 화면 만원');
  ok(browseHref('앰프', s).includes('price_min=4200000') && browseHref('앰프', s).includes('price_max=10500000'), '가격: 화면 만원 → 주소 원');
}
{
  const keep = new URLSearchParams('utm_source=kakao&q=맥킨토시&brand=Old&sort=latest');
  const href = browseHref('앰프', { filters: emptyFilters(), subs: new Set(), sort: SORT_OPTIONS[0] }, keep);
  ok(href.includes('utm_source=kakao') && href.includes('q=') && !href.includes('brand=') && !href.includes('sort='), `남의 키는 두고 맡은 키만 다시 씀: ${href}`);
}
{
  const one = browseHref('앰프', { subs: new Set(['프리앰프']) });
  const two = browseHref('앰프', { subs: new Set(['파워앰프', '프리앰프']) });
  ok(one === '/browse/amps/preamp', `하위 1개는 경로: ${one}`);
  ok(two === '/browse/amps?sub=preamp&sub=power-amp', `하위 2개는 sub 반복(메뉴 순서): ${two}`);
  ok(read(two).subs.size === 2, '하위 2개 읽기');
  ok(read('/browse/amps?sub=bookshelf').subs.size === 0, '다른 대분류의 하위 카테고리 버림');
  ok(browseHref(null, { sort: '최신순' }) === '/browse?sort=latest', '정렬: 최신순 = latest');
  ok(browseHref('앰프', { filters: emptyFilters(), sort: SORT_OPTIONS[0] }) === '/browse/amps', '빈 값과 추천순은 주소에 없음');
}

console.log(`통과 ${pass}, 실패 ${fails.length}`);
for (const f of fails.slice(0, 20)) console.log('  실패: ' + f);
process.exit(fails.length ? 1 : 0);
