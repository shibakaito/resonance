'use client';
import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { ChevronRight, X, SlidersHorizontal, Search } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select } from './ui/field';
import { Container } from './ui/container'; // 페이지 겉틀 (헤더, 푸터와 좌우 끝이 같음)
import { subcategoriesFor, searchBrands, TOP_CATEGORIES, ALL_SUBCATEGORIES, CATEGORY_ALIASES, isCategoryVisible } from '../data/catalog';
import { en2ko, ko2en } from '@/lib/keyboard-layout';
import { suggest } from '@/lib/did-you-mean';
import { metaFor } from '../data/category-meta';

interface BrowsePageProps {
  category?: string | null;
  initialSubCategory?: string | null;
  searchQuery?: string; // 홈 메인 검색에서 넘어온 검색어
  onSearch?: (query: string) => void; // browse에서 검색어 수정·재검색
  // 홈 조건 검색에서 넘어온 조건(주소 ?condition, ?appearance, ?working, ?brand, ?model) — 필터에 체크된 채로 시작
  initialCondition?: string;  // ?condition=used (new / unopened / nos / used)
  initialAppearance?: string; // ?appearance=excellent
  initialWorking?: string;    // ?working=working
  initialBrand?: string;
  initialModel?: string;
  initialLocCountry?: string; // ?loc_country=kr
  initialRegion?: string;     // ?region=kr_seoul
}

// ── 분리: 필터 로직/데이터/타입은 browse-filters.ts로 이동했습니다 ──
import {
  ACCESSORY_GROUPS,
  AMP_GROUPS,
  Counts,
  Filters,
  LOCATIONS,
  Listing,
  filterVisibility,
  isFilterKeyVisible,
  SET_FILTER_KEYS,
  pruneHiddenFilters,
  SORT_OPTIONS,
  SOURCE_GROUPS,
  SPEAKER_GROUPS,
  TT_ACCESSORY_GROUPS,
  applyFilters,
  filterLabel,
  countBy,
  countFilters,
  emptyFilters,
} from './browse-filters';
// App.tsx가 browse-page에서 이 둘을 import하므로 그대로 다시 내보냄(re-export)
export { AMP_GROUPS, SPEAKER_GROUPS } from './browse-filters';

// ── 분리: 사이드바 입력 부품은 filter-controls.tsx로 이동 ──
// 필터 묶음 전체(사이드바와 필터 대화상자가 같은 순서, 같은 부품)는 filter-panel.tsx
import { FilterPanel } from './filter-panel';
// ── 분리: 전체 필터 모달은 filter-modal.tsx로 이동 ──
import { FilterModal } from './filter-modal';
// ── 분리: 매물 카드 그리드는 listing-grid.tsx로 이동 ──
import { ListingGrid } from './listing-grid';
// ── Supabase 연동: DB에서 실제 매물을 불러옴 ──
import { fetchListings } from '@/lib/listings';
import { FEATURE_FLAGS } from '../data/feature-flags'; // 숨김 플래그 (docs/hidden.md)
import { FILTER_LABELS as FL, FILTER_CHIP_PREFIX } from '@/lib/labels'; // 필터 칸 이름, 칩 접두 (labels.ts 한 곳)

// 브랜드 검색 칸의 한글 별칭은 filter-panel.tsx 로 옮김 (2026-11-10)

// 결과 카드 한 번에 보이는 장 수 (4열 × 6줄). 더 있으면 '더 보기'
const PAGE_SIZE = 24;

export function BrowsePage({ category, initialSubCategory, searchQuery, onSearch, initialCondition, initialAppearance, initialWorking, initialBrand, initialModel, initialLocCountry, initialRegion }: BrowsePageProps) {
  // DB에서 매물을 비동기로 불러옴 (영문 키 → 한글 변환은 fetchListings 안에서 처리)
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  useEffect(() => {
    let active = true;
    fetchListings()
      .then((rows) => { if (active) setAllListings(rows); })
      .catch((err) => console.error('매물 불러오기 실패:', err))
      .finally(() => { if (active) setListingsLoading(false); });
    return () => { active = false; };
  }, []);

  // 편집 검색창 입력값 (URL의 ?q와 동기화). 제출 시 onSearch로 재검색.
  const [searchInput, setSearchInput] = useState(searchQuery ?? '');
  useEffect(() => { setSearchInput(searchQuery ?? ''); }, [searchQuery]);

  // 문서 <title>·메타 디스크립션을 카테고리 컨텍스트에 맞춰 동기화 (SEO + 공유 URL용)
  useEffect(() => {
    const meta = metaFor(category ?? null, initialSubCategory ?? null);
    if (meta) {
      document.title = meta.docTitle ?? `${meta.title} | Resonance`;
      if (meta.metaDesc) {
        let el = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
        if (!el) {
          el = document.createElement('meta');
          el.name = 'description';
          document.head.appendChild(el);
        }
        el.content = meta.metaDesc;
      }
    } else {
      document.title = 'Resonance';
    }
  }, [category, initialSubCategory]);

  // 선택된 대분류에 속하는 세부 카테고리 목록 (없으면 전체)
  const categorySubs = useMemo(
    () => (category ? subcategoriesFor(category) : []),
    [category]
  );

  const isAmp = category === '앰프';
  const isSpeaker = category === '스피커';
  const isSource = category === '소스기기';
  const isAccessory = category === '액세서리';
  const isTtAccessory = category === '턴테이블';
  const isCableCat = category === '케이블';

  // 턴테이블 단독 선택 시 턴테이블 전용 필터 활성
  // (계산은 subCategories 선언 후로 미룸 — 아래 useEffect 뒤에서)

  // 하위 카테고리 다중 선택 (프리앰프, 파워앰프 등). 비어있으면 대분류 전체
  const [subCategories, setSubCategories] = useState<Set<string>>(
    () => (initialSubCategory ? new Set([initialSubCategory]) : new Set())
  );
  useEffect(() => {
    setSubCategories(initialSubCategory ? new Set([initialSubCategory]) : new Set());
  }, [category, initialSubCategory]);

  // 하위 카테고리 선택 바꾸기 — 바뀐 선택에서 화면에서 사라지는 필터 칸의 값도 같이 비움(pruneHiddenFilters, 칩 안 남음, 2026-11-10)
  //   대분류를 바꿀 때(위 effect)는 예전처럼 하위 카테고리만 비움
  const changeSubCategories = (next: Set<string>) => {
    setSubCategories(next);
    setFilters((prev) => pruneHiddenFilters(prev, filterVisibility(category, next)));
  };
  const toggleSubCategory = (v: string) => {
    const next = new Set(subCategories);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    changeSubCategories(next);
  };

  // 검색어(?q) 1차 필터 — brand/model/title/description + 한글 별칭(브랜드) + 카테고리 한글
  // + 한영 자판 오타 매칭 (lazy fallback): 원본으로 결과 적을 때만 변환 후보 추가
  const searchedListings = useMemo(() => {
    const q = (searchQuery ?? '').trim();
    if (!q) return allListings;
    const norm = (s: string) => s.replace(/[\s&\-/]+/g, '').toLowerCase();

    // 단일 검색어 → 매칭 listing 배열 (기존 매칭 로직 캡슐화)
    const matchByQuery = (query: string) => {
      const nq = norm(query);
      if (!nq) return [];
      // 영문 부분일치 노이즈 가드: 한글 음절 없는 짧은 영문(<3자)은 카테고리 부분일치 X
      // (예: 'ap' 같은 2자 영문이 'amp'에 우연 매칭되는 거 방지)
      const hasHangul = /[가-힣]/.test(query);
      const allowShortPartial = hasHangul || query.length >= 3;

      const brandHits = new Set(searchBrands(query).map((b) => b.name));
      const matchedSubs = new Set<string>();
      // 대분류 매칭: 한글은 부분일치(includes), 영어 별칭은 부분일치
      // 짧은 영문(<3자)은 가드로 차단
      for (const top of TOP_CATEGORIES) {
        const aliases = CATEGORY_ALIASES[top] ?? [];
        const topHit =
          allowShortPartial &&
          (norm(top).includes(nq) || aliases.some((a) => norm(a).includes(nq)));
        if (topHit) subcategoriesFor(top).forEach((s) => matchedSubs.add(s));
      }
      // 하위 카테고리 매칭: 부분일치 (영문 가드 동일 적용)
      if (allowShortPartial) {
        for (const sub of ALL_SUBCATEGORIES)
          if (norm(sub).includes(nq)) matchedSubs.add(sub);
      }
      return allListings.filter((l) => {
        if (brandHits.has(l.brand)) return true;
        const hay = norm(`${l.brand} ${l.model} ${l.title} ${l.description}`);
        if (hay.includes(nq)) return true;
        if (matchedSubs.size > 0 && l.categories.some((c) => matchedSubs.has(c))) return true;
        return false;
      });
    };

    // 1차: 원본 query 그대로 검색
    const primary = matchByQuery(q);

    // 결과 충분하면 그대로 반환 (lazy fallback 발동 안 함)
    const SMALL_RESULT = 3;
    if (primary.length >= SMALL_RESULT) return primary;

    // 2차 fallback: 한영 자판 변환 후보 추가
    // 노이즈 가드 — 변환 결과가 의미 있는 글자(한글 음절 ≥2 또는 영문 ≥2)일 때만 채택
    const hasKoreanSyllables = (s: string) => (s.match(/[가-힣]/g)?.length ?? 0) >= 2;
    const hasEnglishLetters = (s: string) => (s.match(/[a-zA-Z]/g)?.length ?? 0) >= 2;
    const variants: string[] = [];
    const ko = en2ko(q);
    if (ko !== q && hasKoreanSyllables(ko)) variants.push(ko);
    const en = ko2en(q);
    if (en !== q && hasEnglishLetters(en)) variants.push(en);
    if (variants.length === 0) return primary;

    // 원본 결과 + 변환 후보 결과 합치고 id로 중복 제거
    const seen = new Set(primary.map((l) => l.id));
    const merged = [...primary];
    for (const v of variants) {
      for (const l of matchByQuery(v)) {
        if (!seen.has(l.id)) {
          seen.add(l.id);
          merged.push(l);
        }
      }
    }
    return merged;
  }, [allListings, searchQuery]);

  // "Did you mean?" 추천 — 검색 결과 0건일 때만 계산 (한영 매칭 후에도 0건이면)
  // 추천 후보 = 판매중 매물 브랜드만(사전 브랜드 X). 숨긴 카테고리 매물은 fetchListings 에서 이미 빠짐
  const listingBrands = useMemo(() => Array.from(new Set(allListings.map((l) => l.brand))), [allListings]);
  const suggestion = useMemo(() => {
    const q = (searchQuery ?? '').trim();
    if (!q) return null;
    if (searchedListings.length > 0) return null;
    return suggest(q, listingBrands);
  }, [searchQuery, searchedListings.length, listingBrands]);

  // 대분류만 적용된 풀 (카테고리 칩의 개수 집계 기준 — subCategories 미적용)
  const baseCategoryListings = useMemo(() => {
    if (categorySubs.length === 0) return category && !isCategoryVisible(category) ? [] : searchedListings; // 숨긴 대분류 주소로 직접 오면 0건
    return searchedListings.filter((l) => l.categories.some((c) => categorySubs.includes(c)));
  }, [searchedListings, categorySubs]);

  // subCategories까지 적용된 풀
  const categoryListings = useMemo(() => {
    if (subCategories.size > 0) return baseCategoryListings.filter((l) => l.categories.some((c) => subCategories.has(c)));
    return baseCategoryListings;
  }, [baseCategoryListings, subCategories]);

  // 어떤 필터 칸이 보이나 — browse-filters.ts filterVisibility 한 곳에서 (사이드바, 모달, 칩, 자동 해제, applyFilters 공용, 2026-11-10)
  //   턴테이블, 카세트, CD, 튜너, 헤드폰 앰프 전용 필터는 그 하위 카테고리 하나만 골랐을 때. 프리앰프만, 헤드폰 앰프만이면 정격 출력, 지원 임피던스 숨김
  const vis = useMemo(() => filterVisibility(category, subCategories), [category, subCategories]);
  const isTurntable = vis.turntable;
  const isCd = vis.cd;
  const isTuner = vis.tuner;
  const isPowerDevice = vis.powerDevice;
  const isCable = vis.cable;

  const subCatCounts = useMemo(
    () => countBy(baseCategoryListings, (l) => l.categories),
    [baseCategoryListings]
  );

  const counts = useMemo<Counts>(
    () => ({
      brand: countBy(categoryListings, (l) => l.brand),
      condition: countBy(categoryListings, (l) => l.condition),
      appearance: countBy(categoryListings, (l) => l.appearance), // 비운 매물은 '' 키로 세어져 선택지에 안 보임
      working: countBy(categoryListings, (l) => l.working),
      ownership: countBy(categoryListings, (l) => l.ownership),
      country: countBy(categoryListings, (l) => l.country),
      locationCountry: countBy(categoryListings, (l) => l.locationCountry),
      region: countBy(categoryListings, (l) => l.location),
      subcategory: subCatCounts,
      ampDetail: countBy(categoryListings, (l) => l.ampDetail),
      ampMethod: countBy(categoryListings, (l) => l.ampMethod),
      impedance: countBy(categoryListings, (l) => l.impedances),
      phono: countBy(categoryListings, (l) => l.phono),
      toneControl: countBy(categoryListings, (l) => l.toneControl),
      remote: countBy(categoryListings, (l) => l.remote),
      voltage: countBy(categoryListings, (l) => l.voltage),
      speakerDetail: countBy(categoryListings, (l) => l.speakerDetail),
      driverConfig: countBy(categoryListings, (l) => l.driverConfig),
      enclosure: countBy(categoryListings, (l) => l.enclosure),
      speakerImpedance: countBy(categoryListings, (l) => l.speakerImpedance),
      wooferSize: countBy(categoryListings, (l) => l.wooferSize),
      driveType: countBy(categoryListings, (l) => l.driveType),
      tonearm: countBy(categoryListings, (l) => l.tonearm),
      cartridge: countBy(categoryListings, (l) => l.cartridge),
      speeds: countBy(categoryListings, (l) => l.speeds),
      autoMode: countBy(categoryListings, (l) => l.autoMode),
      dustCover: countBy(categoryListings, (l) => l.dustCover),
      phonoBuiltIn: countBy(categoryListings, (l) => l.phonoBuiltIn),
      cdDigitalOut: countBy(categoryListings, (l) => l.cdDigitalOut),
      cdAnalogOut: countBy(categoryListings, (l) => l.cdAnalogOut),
      tunerBand: countBy(categoryListings, (l) => l.tunerBand),
      headCount: countBy(categoryListings, (l) => l.headCount),
      autoReverse: countBy(categoryListings, (l) => l.autoReverse),
      capstan: countBy(categoryListings, (l) => l.capstan),
      noiseReduction: countBy(categoryListings, (l) => l.noiseReduction),
      tapeTypeRec: countBy(categoryListings, (l) => l.tapeTypeRec),
      headWear: countBy(categoryListings, (l) => l.headWear),
      terminalIn: countBy(categoryListings, (l) => l.terminalIn),
      terminalOut: countBy(categoryListings, (l) => l.terminalOut),
      directional: countBy(categoryListings, (l) => l.directional),
      conductor: countBy(categoryListings, (l) => l.conductor),
      plating: countBy(categoryListings, (l) => l.plating),
      shield: countBy(categoryListings, (l) => l.shield),
      pair: countBy(categoryListings, (l) => l.pair)
    }),
    [categoryListings, subCatCounts]
  );

  // 실제 매물이 있는 브랜드만(=DB 집계 키) 매물 수 내림차순으로 정렬
  const brandsByCount = useMemo(
    () => Object.keys(counts.brand).sort((a, b) => (counts.brand[b] ?? 0) - (counts.brand[a] ?? 0)),
    [counts.brand]
  );

  // 상단 카테고리 드롭다운 옵션 — 소스기기는 매물 수 내림차순
  const topCategoryOptions = useMemo(() => {
    if (!isSource) return categorySubs;
    return [...categorySubs].sort((a, b) => (subCatCounts[b] ?? 0) - (subCatCounts[a] ?? 0));
  }, [categorySubs, isSource, subCatCounts]);

  // 각 카테고리 페이지마다 정의된 그룹을 사이드바 섹션으로 분리
  // BY TYPE → "카테고리", ETC → "기타", 그 외 그룹명은 그대로 사용
  const sidebarCategoryGroups: { title: string; items: string[] }[] = useMemo(() => {
    const renameTitle = (t: string) => (t === 'BY TYPE' ? '카테고리' : t === 'ETC' ? '기타' : t);
    let rawGroups: { title: string; items: string[] }[] | null = null;
    if (isAmp) rawGroups = AMP_GROUPS;
    else if (isSpeaker) rawGroups = SPEAKER_GROUPS;
    else if (isSource) rawGroups = SOURCE_GROUPS;
    else if (isAccessory) rawGroups = ACCESSORY_GROUPS;
    else if (isTtAccessory) rawGroups = TT_ACCESSORY_GROUPS;

    if (rawGroups) {
      const knownItems = new Set(rawGroups.flatMap((g) => g.items));
      const groups = rawGroups
        .map((g) => ({
          title: renameTitle(g.title),
          items: g.items.filter((it) => categorySubs.includes(it))
        }))
        .filter((g) => g.items.length > 0);
      // 그룹 정의에 없는 서브카테고리는 마지막에 "기타" 섹션으로 모음
      const orphan = categorySubs.filter((s) => !knownItems.has(s));
      if (orphan.length > 0) groups.push({ title: '기타', items: orphan });
      return groups;
    }

    // 그룹 미정의 카테고리(케이블 등): 단일 "카테고리" 섹션
    return categorySubs.length > 0 ? [{ title: '카테고리', items: topCategoryOptions }] : [];
  }, [isAmp, isSpeaker, isSource, isAccessory, isTtAccessory, categorySubs, topCategoryOptions]);

  // 카테고리 묶음 선택지 — 예전 사이드바 그룹(소스기기의 아날로그, 디지털, 튜너 등)을 그 순서대로 한 묶음으로 (2026-11-10 시안)
  const categoryOptions = useMemo(() => sidebarCategoryGroups.flatMap((g) => g.items), [sidebarCategoryGroups]);

  // 홈 조건 검색에서 넘어온 조건을 넣은 필터 (없으면 빈 필터)
  const filtersFromHome = (): Filters => {
    const f = emptyFilters();
    if (initialCondition) f.condition.add(initialCondition);    // 주소의 키(new / unopened / nos / used) = 필터 값 그대로
    if (initialAppearance) f.appearance.add(initialAppearance); // 외관 키 (mint 등)
    if (initialWorking) f.working.add(initialWorking);          // 작동 키 (working 등)
    if (initialBrand) f.brand.add(initialBrand);
    if (initialModel) f.model.add(initialModel);
    // 국가(?loc_country)는 FEATURE_FLAGS.japan 켜졌을 때만, 지역은 지금 선택지에 있는 키만 (일본 확장 꺼지면 일본 지역 무시)
    if (initialLocCountry && FEATURE_FLAGS.japan) f.locationCountry.add(initialLocCountry);
    if (initialRegion && LOCATIONS.includes(initialRegion)) f.region.add(initialRegion);
    return f;
  };
  const [filters, setFilters] = useState<Filters>(filtersFromHome);
  // 주소의 조건이 바뀌면(홈에서 다시 넘어오는 등) 그 조건으로 새로 시작
  useEffect(() => { setFilters(filtersFromHome()); }, [initialCondition, initialAppearance, initialWorking, initialBrand, initialModel, initialLocCountry, initialRegion]);
  const [modalOpen, setModalOpen] = useState(false);
  const [sort, setSort] = useState(SORT_OPTIONS[0]);
  const [liked, setLiked] = useState<Set<string>>(new Set());

  // 필터 값(키) → 화면 글자 (사이드바 칸, 칩 공용)
  const lab = (k: keyof Filters) => (v: string) => filterLabel(k, v);
  const toggleField = (key: keyof Filters) => (v: string) => {
    setFilters((prev) => {
      const set = new Set(prev[key] as Set<string>);
      if (set.has(v)) set.delete(v);
      else set.add(v);
      return { ...prev, [key]: set };
    });
  };

  const toggleLike = (id: string) => {
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const list = applyFilters(categoryListings, filters, vis);
    const sorted = [...list];
    if (sort === '최신순') sorted.sort((a, b) => a.daysAgo - b.daysAgo);
    else if (sort === '가격 낮은순') sorted.sort((a, b) => a.price - b.price);
    else if (sort === '가격 높은순') sorted.sort((a, b) => b.price - a.price);
    return sorted;
  }, [categoryListings, filters, isAmp, isSpeaker, isTurntable, isPowerDevice, isCable, sort]);

  // 결과 카드는 한 번에 PAGE_SIZE 장(4열 × 6줄). 더 있으면 아래 '더 보기'로 PAGE_SIZE 장씩. 조건, 정렬, 카테고리가 바뀌면 처음 장 수로
  const [shown, setShown] = useState(PAGE_SIZE);
  useEffect(() => { setShown(PAGE_SIZE); }, [filters, subCategories, sort, category, searchQuery]);

  // 선택한 모든 필터 값을 칩으로 표시 (연도 제외 천 단위 콤마)
  const rangeChipLabel = (min: number | null, max: number | null, suffix: string): string | null => {
    const useComma = suffix !== ''; // 연도(빈 suffix)는 콤마 미적용
    const fmt = (n: number) => (useComma ? n.toLocaleString('ko-KR') : String(n));
    if (min != null && max != null) return `${fmt(min)} ~ ${fmt(max)}${suffix}`;
    if (min != null) return `${fmt(min)}${suffix} 이상`;
    if (max != null) return `${fmt(max)}${suffix} 이하`;
    return null;
  };

  const activeChips: { key: string; label: string; remove: () => void }[] = [];
  for (const sc of subCategories) {
    activeChips.push({
      key: `sub-${sc}`,
      label: sc,
      remove: () => toggleSubCategory(sc)
    });
  }
  {
    // 칩은 지금 보이는 칸(isFilterKeyVisible — filterVisibility 와 같은 규칙)의 값만
    // 체크 칸 키 = browse-filters.ts FILTER_DEFS 순서 (칩 순서)
    const setFieldKeys = SET_FILTER_KEYS.map((key) => ({ key }));
    // 케이블: 입력/출력 둘 다 정확히 1개 선택된 경우 결합 칩으로 표시
    const combineTermActive =
      isCable && filters.terminalIn.size === 1 && filters.terminalOut.size === 1;
    if (combineTermActive) {
      const tIn = [...filters.terminalIn][0];
      const tOut = [...filters.terminalOut][0];
      activeChips.push({
        key: `term-pair-${tIn}-${tOut}`,
        label: `${FILTER_CHIP_PREFIX.terminalIn}: ${tIn} → ${FILTER_CHIP_PREFIX.terminalOut}: ${tOut}`,
        remove: () =>
          setFilters((prev) => ({
            ...prev,
            terminalIn: new Set(),
            terminalOut: new Set()
          }))
      });
    }
    for (const { key } of setFieldKeys) {
      const prefix = FILTER_CHIP_PREFIX[key]; // 칩 접두 (labels.ts, 모달과 같은 표)
      if (!isFilterKeyVisible(key, vis)) continue;
      if (combineTermActive && (key === 'terminalIn' || key === 'terminalOut')) continue;
      const useColon = key === 'terminalIn' || key === 'terminalOut';
      for (const v of filters[key] as Set<string>) {
        const t = filterLabel(key, v); // 칩 글자 = 값(키)의 화면 글자
        activeChips.push({
          key: `${key}-${v}`,
          label: prefix ? (useColon ? `${prefix}: ${t}` : `${prefix} ${t}`) : t,
          remove: () => toggleField(key)(v)
        });
      }
    }
    const priceLabel = rangeChipLabel(filters.priceMin, filters.priceMax, '만원');
    if (priceLabel)
      activeChips.push({
        key: 'price',
        label: `${FL.price}: ${priceLabel}`,
        remove: () => setFilters((prev) => ({ ...prev, priceMin: null, priceMax: null }))
      });
    const yearLabel = rangeChipLabel(filters.yearMin, filters.yearMax, '');
    if (yearLabel)
      activeChips.push({
        key: 'year',
        label: `${FL.year}: ${yearLabel}`,
        remove: () => setFilters((prev) => ({ ...prev, yearMin: null, yearMax: null }))
      });
    {
      const powerLabel = vis.power ? rangeChipLabel(filters.powerMin, filters.powerMax, 'W') : null;
      if (powerLabel)
        activeChips.push({
          key: 'power',
          label: `${FL.power}: ${powerLabel}`,
          remove: () => setFilters((prev) => ({ ...prev, powerMin: null, powerMax: null }))
        });
      if (vis.headphoneImp && filters.headphoneImp != null)
        activeChips.push({
          key: 'headphoneImp',
          label: `${FL.headphoneImp}: ${filters.headphoneImp}Ω`,
          remove: () => setFilters((prev) => ({ ...prev, headphoneImp: null }))
        });
    }
    if (isPowerDevice) {
      const capLabel = rangeChipLabel(filters.ratedCapacityMin, filters.ratedCapacityMax, 'W');
      if (capLabel)
        activeChips.push({
          key: 'ratedCapacity',
          label: `${FL.ratedCapacity}: ${capLabel}`,
          remove: () => setFilters((prev) => ({ ...prev, ratedCapacityMin: null, ratedCapacityMax: null }))
        });
    }
    if (isCable) {
      const lenLabel = rangeChipLabel(filters.cableLengthMin, filters.cableLengthMax, 'm');
      if (lenLabel)
        activeChips.push({
          key: 'cableLength',
          label: `${FL.cableLength}: ${lenLabel}`,
          remove: () => setFilters((prev) => ({ ...prev, cableLengthMin: null, cableLengthMax: null }))
        });
    }
    if (isSpeaker) {
      const sensLabel = rangeChipLabel(filters.sensitivityMin, filters.sensitivityMax, 'dB');
      if (sensLabel)
        activeChips.push({
          key: 'sensitivity',
          label: `${FL.sensitivity}: ${sensLabel}`,
          remove: () => setFilters((prev) => ({ ...prev, sensitivityMin: null, sensitivityMax: null }))
        });
      const recLabel = rangeChipLabel(filters.recPowerMin, filters.recPowerMax, 'W');
      if (recLabel)
        activeChips.push({
          key: 'recPower',
          label: `${FL.recPower}: ${recLabel}`,
          remove: () => setFilters((prev) => ({ ...prev, recPowerMin: null, recPowerMax: null }))
        });
    }
  }

  const filterCount = countFilters(filters);

  const resetAll = () => {
    setFilters(emptyFilters());
    setSubCategories(new Set());
  };

  // 경로와 제목 — 하위 카테고리를 하나만 고르면 경로에 그 이름까지, 제목도 그 이름 (category-meta)
  const activeSub = subCategories.size === 1 ? [...subCategories][0] : null;
  const pageTitle = searchQuery ? `‘${searchQuery}’ 검색 결과` : metaFor(category ?? null, activeSub)?.title ?? category ?? 'ALL';

  return (
    <Container as="main" className="pt-8">
      {/* 경로 — '홈 › 앰프'(14 muted, 화살표 16). 하위 카테고리를 하나 골랐으면 대분류를 눌러 그 선택만 풂 */}
      <nav aria-label="경로">
        <ol className="flex flex-wrap items-center gap-1 text-14 text-muted">
          <li>
            <Link href="/" className="hover:text-fg">
              홈
            </Link>
          </li>
          {category && (
            <li className="flex items-center gap-1">
              <ChevronRight aria-hidden className="h-4 w-4" />
              {activeSub ? (
                <button type="button" onClick={() => changeSubCategories(new Set())} className="hover:text-fg">
                  {category}
                </button>
              ) : (
                <span aria-current="page">{category}</span>
              )}
            </li>
          )}
          {category && activeSub && (
            <li className="flex items-center gap-1">
              <ChevronRight aria-hidden className="h-4 w-4" />
              <span aria-current="page">{activeSub}</span>
            </li>
          )}
        </ol>
      </nav>

      {/* 제목 줄 40 — 왼쪽 제목(24/700)과 건수(16 muted, 사이 12), 오른쪽 정렬(168, 칸 모양 select) */}
      <div className="mt-2 flex min-h-10 flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-baseline gap-3">
          <h1 className="text-24 font-bold">{pageTitle}</h1>
          {!listingsLoading && <span className="shrink-0 text-16 text-muted">{filtered.length.toLocaleString('ko-KR')}건</span>}
        </div>
        <Select aria-label="정렬" value={sort} onChange={(e) => setSort(e.target.value)} wrapClassName="w-42 shrink-0">
          {SORT_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      {/* 검색어로 왔을 때 — 비슷한 브랜드 추천, 검색어 고치기(공통 Input + 칸 속 돋보기 단추) */}
      {searchQuery && (
        <div className="mt-4">
          {/* "Did you mean?" — 결과 0건 + 비슷한 후보가 있을 때만 표시 */}
          {suggestion && (
            <p className="mb-4 text-16 text-fg">
              혹시{' '}
              <button type="button" onClick={() => onSearch?.(suggestion.label)} className="font-bold text-fg underline">
                ‘{suggestion.label}’
              </button>
              를 찾으세요?
            </p>
          )}
          {/* 0건인데 비슷한 판매중 브랜드도 없으면 추천 없이 안내만 */}
          {!suggestion && !listingsLoading && searchedListings.length === 0 && (
            <p className="mb-4 text-16 text-fg">판매중인 매물에서 비슷한 브랜드를 찾지 못했어요. 다른 검색어로 찾아보세요.</p>
          )}
          <form
            onSubmit={(e) => { e.preventDefault(); if (searchInput.trim()) onSearch?.(searchInput.trim()); }}
            className="relative w-full max-w-100"
          >
            <Input aria-label="검색어 수정" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="검색어 수정" className="pl-3 pr-12" />
            <button type="submit" aria-label="검색" className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center hover:bg-surface">
              <Search aria-hidden className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* 2단 레이아웃: 왼쪽 필터 208 + 사이 16 + 오른쪽 결과 (2026-11-10 시안) */}
      <div className="mt-6 flex gap-4">
        {/* 왼쪽 필터 사이드바 — 제목 줄 40 '필터'(16/700) + 걸린 필터가 있을 때만 '전체 해제', 아래 선 1. 묶음은 filter-panel.tsx */}
        <aside className="hidden lg:block w-52 shrink-0">
          <div className="flex h-10 items-center justify-between border-b border-line">
            <h2 className="text-16 font-bold">필터</h2>
            {activeChips.length > 0 && (
              <button type="button" onClick={resetAll} className="text-14 font-medium text-fg underline">
                전체 해제
              </button>
            )}
          </div>
          <FilterPanel
            vis={vis}
            filters={filters}
            setFilters={setFilters}
            subCategories={subCategories}
            onToggleSub={toggleSubCategory}
            categoryOptions={categoryOptions}
            counts={counts}
            brandOptions={brandsByCount}
          />
        </aside>

        {/* 오른쪽 결과 — 칩 줄(최소 40) → 16 → 카드 4열(남는 폭 4등분, 사이 16) → 더 있으면 24 아래 '더 보기' */}
        <div className="min-w-0 flex-1">
          {/* 칩: 높이 32, 14/500, line 선, 왼쪽 12 오른쪽 8, 글자 뒤 8에 × 16(이름 '… 해제'), 칩 사이 8. 좁은 화면은 맨 앞에 '필터'(대화상자) */}
          <div className="flex min-h-10 flex-wrap items-center gap-2">
            <Button onClick={() => setModalOpen(true)} aria-haspopup="dialog" className="lg:hidden">
              <SlidersHorizontal aria-hidden className="h-4 w-4" />
              필터{filterCount > 0 ? ` ${filterCount}` : ''}
            </Button>
            {activeChips.map((chip) => (
              <Button key={chip.key} variant="line" size="sm" onClick={chip.remove} aria-label={`${chip.label} 해제`} className="pl-3 pr-2">
                <span>{chip.label}</span>
                <X aria-hidden className="h-4 w-4" />
              </Button>
            ))}
          </div>

          <div className="mt-4">
            {listingsLoading ? (
              <p className="py-16 text-center text-16 text-muted">매물을 불러오는 중…</p>
            ) : filtered.length === 0 ? (
              // 빈 결과 — 가운데 안내(16) 아래 16에 '필터 전체 해제' secondary 168, 위아래 64. 풀 필터가 없으면 단추 없음
              <div className="py-16 text-center">
                <p className="text-16 text-fg">조건에 맞는 매물이 없어요</p>
                {activeChips.length > 0 && (
                  <Button onClick={resetAll} className="mt-4 w-42">
                    필터 전체 해제
                  </Button>
                )}
              </div>
            ) : (
              <>
                <ListingGrid listings={filtered.slice(0, shown)} liked={liked} onToggleLike={toggleLike} />
                {filtered.length > shown && (
                  <div className="mt-6 flex justify-center">
                    <Button onClick={() => setShown((n) => n + PAGE_SIZE)} className="w-42">
                      더 보기
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* 좁은 화면 필터 대화상자 — 사이드바와 같은 묶음. 열린 동안만 그려서 열 때마다 지금 필터로 초안 시작 */}
      {modalOpen && (
        <FilterModal
          filters={filters}
          subCategories={subCategories}
          category={category ?? null}
          counts={counts}
          categoryOptions={categoryOptions}
          brandOptions={brandsByCount}
          listings={baseCategoryListings}
          onApply={(next, subs) => {
            setFilters(pruneHiddenFilters(next, filterVisibility(category, subs))); // 대화상자에서도 사라진 칸 값은 비워서 넘어오지만 한 번 더
            setSubCategories(subs);
          }}
          onClose={() => setModalOpen(false)}
        />
      )}
    </Container>
  );
}
