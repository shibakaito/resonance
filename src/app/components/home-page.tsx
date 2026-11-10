'use client';
// 상태(useState)·효과(useEffect)·DOM 이벤트를 쓰므로 클라이언트 컴포넌트.
import { useState, useEffect, useMemo } from 'react';
import { Search, ArrowRight } from 'lucide-react';
// 사전(searchCatalog, searchBrands, POPULAR_BRANDS)은 '내 매물 등록하기' 탭(판매자 쪽)만 씀. 손님 쪽 조건 검색은 매물에서 뽑음
import {
  POPULAR_BRANDS,
  searchCatalog,
  searchBrands,
  BRAND_DIRECTORY,
  TOP_CATEGORIES,
  subcategoriesFor
} from '../data/catalog';
import type { Listing } from './browse-filters';
import { CONDITIONS, APPEARANCE_OPTS, fmtPrice } from './browse-filters';
import { ConditionBadge } from './condition-badge';
import { keyFor, label, FILTER_LABELS as FL, HOME_LABELS } from '@/lib/labels'; // FL = 칸 이름 (둘러보기 필터와 같은 표), HOME_LABELS = 홈에서만 다른 이름(등급)
import { fetchListings } from '@/lib/listings';
import Link from 'next/link';
import { Card } from './ui/card'; // 매물 카드 (2026-11-10 홈 시안)
import { Button, buttonClass } from './ui/button';
import { Field, Select } from './ui/field'; // 조건 검색 칸 — 등록 폼과 같은 부품
import { Input } from './ui/input';
import { Container } from './ui/container'; // 페이지 겉틀 (헤더, 푸터와 좌우 끝이 같음)
import { Autocomplete } from './ui/autocomplete';
import { categorySlug } from '../data/category-slugs';

// 조건 검색 칸은 공통 Field + Select / Autocomplete (2026-11-10 홈 시안) — 예전 이 파일의 Combobox, Highlight, getInitials(머리글자), norm 은
//   공통 Autocomplete 로 합쳐 삭제. 찾는 규칙(공백 등 무시, 별칭, 머리글자 matchInitials)은 같음
const BRAND_ALIASES_MAP: Record<string, string[]> = Object.fromEntries(
  BRAND_DIRECTORY.map((b) => [b.name, b.aliases])
);

const CATEGORY_TABS = TOP_CATEGORIES; // 보이는 대분류만 (CATEGORY_TREE 숨김 표식)

type SellData = {
  title?: string;
  brand?: string;
  model?: string;
  year?: string;
  category?: string;
};

type HomePageProps = {
  // conds = 홈 조건 검색에서 고른 상태, 외관, 작동, 브랜드, 모델 (둘러보기 필터로 넘김, 값은 키)
  onBrowse: (category: string | null, conds?: { condition?: string; appearance?: string; working?: string; brand?: string; model?: string; locCountry?: string; region?: string }) => void;
  onSell: (data?: SellData) => void;
  onSearch: (query: string) => void;
};

export function HomePage({ onBrowse, onSell, onSearch }: HomePageProps) {
  const [activeCat, setActiveCat] = useState(CATEGORY_TABS[0]);
  // ── Supabase 연동: 가짜 매물 대신 DB에서 매물을 불러옴 ──
  const [dbListings, setDbListings] = useState<Listing[]>([]);
  useEffect(() => {
    let active = true;
    fetchListings()
      .then((rows) => { if (active) setDbListings(rows); })
      .catch((err) => console.error('매물 불러오기 실패:', err));
    return () => { active = false; };
  }, []);
  // 추천 매물: 선택된 카테고리 탭에 속하는 DB 매물만
  const featuredListings = useMemo(() => {
    const subs = subcategoriesFor(activeCat);
    return dbListings.filter((l) => l.categories.some((c) => subs.includes(c)));
  }, [dbListings, activeCat]);
  // 새로 올라온 매물: 최신 4건 (fetchListings 가 등록 최신순으로 줌)
  const latestListings = useMemo(() => dbListings.slice(0, 4), [dbListings]);
  // 찜 — 이 화면 안에서만(둘러보기와 같음, 저장 안 함)
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const toggleLike = (id: string) =>
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  // 매물 카드 하나 — 공통 Card(사진, 상태 배지, 제목 2줄, 가격, 찜). 카드 전체가 상세 링크
  const listingCard = (l: Listing) => (
    <Card
      key={l.id}
      href={`/listing/${l.id}`}
      image={l.images?.[0]}
      imageAlt={`${l.brand} ${l.model}`}
      badge={<ConditionBadge listing={l} className="" />}
      title={`${l.brand} ${l.model}`}
      price={fmtPrice(l.price, l.currency)}
      liked={liked.has(l.id)}
      onToggleLike={() => toggleLike(l.id)}
    />
  );
  const [query, setQuery] = useState('');
  const [heroTab, setHeroTab] = useState<'shop' | 'sell'>('shop');
  // 조건 검색 5칸 (2026-11-10 홈 시안): 상태, 등급(외관 상태), 브랜드, 카테고리, 모델. 작동 상태와 국가, 지역 칸은 홈에서 뺌(둘러보기 필터는 그대로)
  //   값은 화면 글자, 안 고르면 '' (칸에는 '선택'). 주소로 넘길 때는 키로 (중고 → used, 매우 좋음 → excellent)
  const [condition, setCondition] = useState('');   // 상태 (글자)
  const [appearance, setAppearance] = useState(''); // 등급 = 외관 상태 (글자)
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');

  const isReal = (v: string, allLabel: string) => !!v && v !== allLabel;
  // 칸에 보일 값 — 안 고름이나 '전체 …'면 빈 값(안내 글 '선택'만 보임, 지우기 X 없음)
  const shown = (v: string, allLabel: string) => (isReal(v, allLabel) ? v : '');

  // 메인 검색창: 검색어로 매물 검색 (browse 결과 페이지로 이동, ?q에 검색어 반영)
  const handleHeroSearch = () => {
    const q = query.trim();
    if (q) onSearch(q);
  };

  const isCategorySelected = isReal(category, '전체 카테고리');
  const isBrandSelected = isReal(brand, '전체 브랜드');
  const isModelSelected = isReal(model, '전체 모델');
  const isConditionSelected = !!condition;
  const isAppearanceSelected = !!appearance;
  const conditionKey = isConditionSelected ? keyFor('condition', condition) ?? '' : '';    // 중고 → used
  const appearanceKey = isAppearanceSelected ? keyFor('appearance', appearance) ?? '' : ''; // 매우 좋음 → excellent

  // ── 조건 검색의 목록(브랜드, 카테고리, 모델)과 "검색 결과 N건"은 지금 판매중인 매물(dbListings)에서만 뽑음. 사전(CATALOG)은 안 읽음.
  //    dbListings 는 fetchListings 결과라 숨긴 카테고리 매물이 이미 빠져 있음(둘러보기와 같은 기준). 추가 요청 없음
  const inTop = (l: Listing, top: string) => {
    const subs = subcategoriesFor(top);
    return l.categories.some((c) => subs.includes(c));
  };
  // 상태, 등급 — 둘러보기 필터와 같은 규칙 (매물 값은 키, 칸은 글자 → keyFor. 외관을 비운 매물은 등급을 고르면 안 걸림)
  const matchesCondition = (l: Listing) =>
    (!isConditionSelected || l.condition === conditionKey) &&
    (!isAppearanceSelected || l.appearance === appearanceKey);
  // 브랜드 = 매물 브랜드, 매물 많은 순(같으면 이름순)
  const brandOptions = useMemo(() => {
    const n = new Map<string, number>();
    for (const l of dbListings) n.set(l.brand, (n.get(l.brand) ?? 0) + 1);
    return [...n.keys()].sort((a, b) => n.get(b)! - n.get(a)! || a.localeCompare(b));
  }, [dbListings]);
  // 카테고리 = 매물이 있는 대분류만 (브랜드를 고르면 그 브랜드 매물이 있는 대분류만)
  const categoryOptions = TOP_CATEGORIES.filter((top) =>
    dbListings.some((l) => (!isBrandSelected || l.brand === brand) && inTop(l, top))
  );
  // 모델 = 고른 브랜드(+카테고리)의 매물 모델
  const brandModels = isBrandSelected
    ? Array.from(
        new Set(dbListings.filter((l) => l.brand === brand && (!isCategorySelected || inTop(l, category))).map((l) => l.model))
      ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    : [];
  // 검색 결과 N건 = 고른 조건(상태, 등급, 브랜드, 카테고리, 모델)에 맞는 실제 매물 수. 아무것도 안 골랐으면 전체 매물 수
  const filteredCount = dbListings.filter(
    (l) =>
      matchesCondition(l) &&
      (!isBrandSelected || l.brand === brand) &&
      (!isCategorySelected || inTop(l, category)) &&
      (!isModelSelected || l.model === model)
  ).length;
  const [sellQuery, setSellQuery] = useState('');

  const sellResults = searchCatalog(sellQuery, 20);
  const sellBrandMatches = sellResults.length === 0 ? searchBrands(sellQuery, 6) : [];

  return (
    <div>
      {/* 검색 카드 (2026-11-10 홈 시안) — 검정 띠(bg fg, 위아래 64) 왼쪽에 흰 상자 폭 400, 안 여백 32. 배경 사진과 그림자 없음, 오른쪽은 비워 둠 */}
      <section className="bg-fg py-16">
        <Container>
          <div className="w-full max-w-100 bg-bg p-8 text-fg">
            <h1 className="text-20 font-bold">당신만의 사운드를 찾아보세요</h1>
            {/* 탭 — 높이 40, 14/500. 고른 탭은 fg 에 아래 2px fg 선, 나머지 muted. 줄 아래 1px line. 동작은 그대로(아래 내용만 바뀜) */}
            <div className="mt-4 flex gap-6 border-b border-line">
              {(['shop', 'sell'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={heroTab === t}
                  onClick={() => setHeroTab(t)}
                  className={`relative h-10 text-14 font-medium ${heroTab === t ? 'text-fg' : 'text-muted hover:text-fg'}`}
                >
                  {t === 'shop' ? '매물 둘러보기' : '내 매물 등록하기'}
                  {heroTab === t && <span aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 bg-fg" />}
                </button>
              ))}
            </div>

            {heroTab === 'shop' ? (
              <>
                {/* 검색어 칸 — 공통 Input(40) + 칸 속 돋보기(16) 단추 */}
                <div className="relative mt-6">
                  <Input
                    aria-label="검색어"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleHeroSearch()}
                    placeholder="무엇이든 검색하세요"
                    className="pl-3 pr-12"
                  />
                  <button
                    type="button"
                    aria-label="검색"
                    onClick={handleHeroSearch}
                    className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center hover:bg-surface"
                  >
                    <Search aria-hidden className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <span aria-hidden className="h-px flex-1 bg-line" />
                  <span className="text-14 text-muted">또는 조건으로 검색</span>
                  <span aria-hidden className="h-px flex-1 bg-line" />
                </div>

                {/* 조건 5칸 — 라벨 위 Field(라벨 14/500, 칸 40, 사이 16). 상태, 등급은 드롭다운, 브랜드, 카테고리, 모델은 검색해서 고르는 칸
                    matchInitials = 여러 단어 이름의 머리글자로도 찾기(예: 'pl' → Pass Labs). 모델은 브랜드를 고르기 전까지 비활성 */}
                <div className="mt-4 space-y-4">
                  <Field label={FL.condition}>
                    <Select value={condition} onChange={(e) => setCondition(e.target.value)} className={condition ? '' : 'text-muted'}>
                      <option value="">선택</option>
                      {CONDITIONS.map((k) => (
                        <option key={k} value={label('condition', k)} className="text-fg">{label('condition', k)}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label={HOME_LABELS.appearance}>
                    <Select value={appearance} onChange={(e) => setAppearance(e.target.value)} className={appearance ? '' : 'text-muted'}>
                      <option value="">선택</option>
                      {APPEARANCE_OPTS.map((k) => (
                        <option key={k} value={label('appearance', k)} className="text-fg">{label('appearance', k)}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label={FL.brand}>
                    <Autocomplete
                      value={shown(brand, '전체 브랜드')}
                      onChange={(v) => {
                        setBrand(v);
                        setCategory('');
                        setModel('');
                      }}
                      options={brandOptions}
                      allOption="전체 브랜드"
                      placeholder="선택"
                      matchMode="prefix"
                      matchInitials
                      getAliases={(name) => BRAND_ALIASES_MAP[name] ?? []}
                    />
                  </Field>
                  <Field label={FL.category} disabled={isBrandSelected && categoryOptions.length === 0}>
                    <Autocomplete
                      value={shown(category, '전체 카테고리')}
                      onChange={(v) => {
                        setCategory(v);
                        setModel('');
                      }}
                      options={categoryOptions}
                      allOption="전체 카테고리"
                      placeholder="선택"
                      matchInitials
                      disabled={isBrandSelected && categoryOptions.length === 0}
                      disabledHint="이 브랜드의 카테고리 정보가 아직 없습니다"
                    />
                  </Field>
                  <Field label={FL.model} disabled={!isBrandSelected || brandModels.length === 0}>
                    <Autocomplete
                      value={shown(model, '전체 모델')}
                      onChange={setModel}
                      options={brandModels}
                      allOption="전체 모델"
                      placeholder="선택"
                      matchInitials
                      disabled={!isBrandSelected || brandModels.length === 0}
                      disabledHint={!isBrandSelected ? '먼저 브랜드를 선택하세요' : '이 브랜드의 모델 정보가 아직 없습니다'}
                    />
                  </Field>
                </div>

                <Button
                  variant="primary"
                  onClick={() =>
                    onBrowse(isCategorySelected ? category : null, {
                      // 주소엔 언어 중립 키로 (중고 → used, 매우 좋음 → excellent). 주소 이름(appearance 등)은 그대로
                      condition: conditionKey || undefined,
                      appearance: appearanceKey || undefined,
                      brand: isBrandSelected ? brand : undefined,
                      model: isModelSelected ? model : undefined,
                    })
                  }
                  className="mt-6 w-full"
                >
                  검색 결과 {filteredCount.toLocaleString('ko-KR')}건 보기
                </Button>
              </>
            ) : (
              <>
                <p className="mt-6 text-14 text-fg">판매할 매물을 검색하면 카탈로그가 자동으로 매칭돼 빠르게 등록할 수 있어요.</p>
                <div className="relative mt-4">
                  <Input
                    aria-label="판매할 매물 검색"
                    value={sellQuery}
                    onChange={(e) => setSellQuery(e.target.value)}
                    placeholder="브랜드, 모델 또는 키워드 (예: McIntosh MC152)"
                    className="pl-3 pr-10"
                  />
                  <Search aria-hidden className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {POPULAR_BRANDS.map((b) => (
                    <Button key={b} size="sm" variant="line" onClick={() => setSellQuery(b)}>
                      {b}
                    </Button>
                  ))}
                </div>

                {sellQuery && (
                  <div className="mt-4 max-h-57 overflow-y-auto border border-line">
                    {sellResults.length > 0 ? (
                      sellResults.map((r, idx) => (
                        // 결과 목록 줄 — 목록 모양이라 기본 button
                        <button
                          key={idx}
                          type="button"
                          onClick={() =>
                            onSell({
                              title: `${r.brand} ${r.model}`,
                              brand: r.brand,
                              model: r.model,
                              year: r.year,
                              category: r.category
                            })
                          }
                          className="group flex w-full items-center gap-3 border-b border-line p-3 text-left last:border-b-0 hover:bg-surface"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-14 font-bold">
                              {r.brand} {r.model}
                            </p>
                            <p className="text-12 text-muted">
                              {r.year} · {r.category}
                            </p>
                          </div>
                          <ArrowRight aria-hidden className="h-4 w-4 text-muted group-hover:text-fg" />
                        </button>
                      ))
                    ) : (
                      <div className="p-4">
                        <p className="mb-2 text-center text-14 text-fg">카탈로그에 일치하는 모델이 없어요.</p>
                        {sellBrandMatches.length > 0 && (
                          <div className="mb-3">
                            <p className="mb-2 text-12 font-bold text-muted">관련 브랜드</p>
                            <div className="flex flex-wrap gap-2">
                              {sellBrandMatches.map((b) => (
                                <Button key={b.name} size="sm" variant="line" onClick={() => onSell({ title: b.name, brand: b.name })}>
                                  {b.name}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                        <Button size="sm" className="w-full" onClick={() => onSell({ title: sellQuery })}>
                          "{sellQuery}" 으로 직접 등록하기
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                <Button variant="primary" onClick={() => onSell(sellQuery ? { title: sellQuery } : undefined)} className="mt-6 w-full">
                  {sellQuery ? '이 키워드로 등록 시작하기' : '등록 시작하기'}
                </Button>
                <Button onClick={() => onSell()} className="mt-4 w-full">
                  검색 없이 직접 등록하기
                </Button>
              </>
            )}
          </div>
        </Container>
      </section>

      {/* 새로 올라온 매물 — 최신 4건(fetchListings 가 등록 최신순), 한 줄 4장 (2026-11-10 홈 시안)
          구간: 폭 1120(4칸 × 268 + 16), 위 64, 제목 줄 40(20/700) 아래 24 */}
      <Container as="section" className="pt-16">
        <div className="mb-6 flex h-10 items-center justify-between gap-4">
          <h2 className="text-20 font-bold">새로 올라온 매물</h2>
          {/* 둘러보기는 정렬을 주소로 받지 않아 기본 정렬(추천순)로 열림 — 둘러보기는 이번에 안 건드림 */}
          <Link href="/browse" className="text-14 font-medium text-fg hover:underline">
            모두 보기 →
          </Link>
        </div>
        {latestListings.length === 0 ? (
          <p className="border border-line bg-surface py-12 text-center text-14 text-muted">아직 매물이 없습니다.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{latestListings.map(listingCard)}</div>
        )}
      </Container>

      {/* 인기 카테고리 — 제목 줄에 탭 3개(높이 40, 최소 폭 120, 좌우 24) + 오른쪽 '{카테고리} 모두 보기 →', 카드 4장
          시안대로 '인기 카테고리' 글자는 화면에서 뺌. 화면 읽기 프로그램용 제목(sr-only)으로만 남김 */}
      <Container as="section" className="pt-16">
        <div className="mb-6 flex min-h-10 flex-wrap items-center gap-4">
          <h2 className="sr-only">인기 카테고리</h2>
          {/* 탭 — 고른 것 fg 채움(마우스 올려도 그대로), 나머지 line 선(마우스 올리면 surface). 공통 Button */}
          <div className="flex gap-2">
            {CATEGORY_TABS.map((cat) => (
              <Button
                key={cat}
                aria-pressed={activeCat === cat}
                variant={activeCat === cat ? 'primary' : 'line'}
                noHover
                onClick={() => setActiveCat(cat)}
                className="min-w-30 px-6"
              >
                {cat}
              </Button>
            ))}
          </div>
          <Link href={categorySlug(activeCat) ? `/browse/${categorySlug(activeCat)}` : '/browse'} className="ml-auto text-14 font-medium text-fg hover:underline">
            {activeCat} 모두 보기 →
          </Link>
        </div>
        {featuredListings.length === 0 ? (
          <p className="border border-line bg-surface py-12 text-center text-14 text-muted">{activeCat} 카테고리에 등록된 매물이 없습니다.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{featuredListings.slice(0, 4).map(listingCard)}</div>
        )}
      </Container>

      {/* 판매 띠 (2026-11-10 홈 시안) — 1120 폭 검정 띠 하나, 안 여백 40 48, 사진 없음. 구간 위 64(아래 64는 푸터 위 여백)
          예전 '내 컬렉션' 배너, 무료 배송, 최저가 보장, 구매자 보호 세 줄, '지금 인기 검색어' 8개는 삭제 */}
      <Container as="section" className="pt-16">
        <div className="flex flex-col gap-6 bg-fg px-12 py-10 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-14 font-medium text-line">매물 판매</p>
            <h2 className="mt-2 text-24 font-bold text-bg">원하는 방식으로 판매하세요</h2>
            <p className="mt-2 text-16 text-line">직접 등록하고 가격과 조건을 정해요. 등록은 몇 분이면 끝나요.</p>
          </div>
          {/* 검정 면 위 버튼(inverse) — 링크라 새 탭 열기가 됨 */}
          <Link href="/sell/upload" className={buttonClass({ variant: 'inverse', className: 'w-42 shrink-0' })}>
            매물 등록하기
          </Link>
        </div>
      </Container>
    </div>
  );
}
