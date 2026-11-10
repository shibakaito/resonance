'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, X, SlidersHorizontal, Search } from 'lucide-react';
import { subcategoriesFor, BRAND_DIRECTORY, searchBrands, TOP_CATEGORIES, ALL_SUBCATEGORIES, CATEGORY_ALIASES, isCategoryVisible } from '../data/catalog';
import { en2ko, ko2en } from '@/lib/keyboard-layout';
import { suggest } from '@/lib/did-you-mean';
import { terminalsPrioritized } from '../data/cable-terminals';
import { metaFor } from '../data/category-meta';

interface BrowsePageProps {
  onSelect: (id: string) => void;
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
  AMP_DETAILS,
  AMP_GROUPS,
  AMP_METHODS,
  AMP_TYPES,
  AUTO_OPTS,
  CARTRIDGE_OPTS,
  CONDITIONS,
  APPEARANCE_OPTS,
  WORKING_OPTS,
  CONDUCTOR_OPTS,
  COUNTRY_OPTS,
  CROSS_LISTING,
  Counts,
  DIRECTIONALITY_OPTS,
  DRIVER_CONFIGS,
  DRIVE_TYPES,
  DUSTCOVER_OPTS,
  ENCLOSURE_TYPES,
  Filters,
  IMPEDANCE_OPTS,
  LOCATIONS,
  LOCATION_COUNTRIES,
  regionOptionsFor,
  REGION_VISIBLE_ALL,
  pruneRegions,
  Listing,
  OWNERSHIP_OPTS,
  PAIR_OPTS,
  PHONO_OPTS,
  PLATING_OPTS,
  filterVisibility,
  isFilterKeyVisible,
  pruneHiddenFilters,
  REMOTE_OPTS,
  SHIELD_OPTS,
  SHIELD_RELEVANT,
  SORT_OPTIONS,
  SOURCE_GROUPS,
  SPEAKER_DETAILS,
  SPEAKER_GROUPS,
  SPEAKER_IMPEDANCE,
  SPEED_OPTS,
  TONEARM_OPTS,
  TONE_OPTS,
  TT_ACCESSORY_GROUPS,
  VOLTAGE_OPTS,
  PHONO_BUILTIN_OPTS,
  CD_DIGITAL_OUTS,
  CD_ANALOG_OUTS,
  TUNER_BANDS,
  CAS_HEAD_COUNTS,
  CAS_AUTOREVERSES,
  CAS_CAPSTANS,
  CAS_NRS,
  CAS_TAPE_TYPES,
  CAS_HEAD_WEARS,
  WOOFER_SIZES,
  applyFilters,
  filterLabel,
  cloneFilters,
  computeCategories,
  countBy,
  countFilters,
  emptyFilters,
  fmtPrice,
  parseYear,
} from './browse-filters';
// App.tsx가 browse-page에서 이 둘을 import하므로 그대로 다시 내보냄(re-export)
export { AMP_GROUPS, SPEAKER_GROUPS } from './browse-filters';

// ── 분리: 사이드바 입력 부품은 filter-controls.tsx로 이동 ──
import { FilterSection, RangeSection, FilterDropdown } from './filter-controls';
// ── 분리: 전체 필터 모달은 filter-modal.tsx로 이동 ──
import { FilterModal } from './filter-modal';
// ── 분리: 매물 카드 그리드는 listing-grid.tsx로 이동 ──
import { ListingGrid } from './listing-grid';
// ── Supabase 연동: DB에서 실제 매물을 불러옴 ──
import { fetchListings } from '@/lib/listings';
import { FEATURE_FLAGS } from '../data/feature-flags'; // 숨김 플래그 (docs/hidden.md)
import { FILTER_LABELS as FL, FILTER_CHIP_PREFIX } from '@/lib/labels'; // 필터 칸 이름, 칩 접두 (labels.ts 한 곳)

// 브랜드 영문명 → 한글 별칭 목록 (검색용). 홈 콤보박스와 동일하게 BRAND_DIRECTORY 재사용.
const BRAND_ALIASES: Record<string, readonly string[]> = Object.fromEntries(
  BRAND_DIRECTORY.map((b) => [b.name, b.aliases])
);

export function BrowsePage({ onSelect, category, initialSubCategory, searchQuery, onSearch, initialCondition, initialAppearance, initialWorking, initialBrand, initialModel, initialLocCountry, initialRegion }: BrowsePageProps) {
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

  const toggleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
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
    const setFieldKeys: { key: keyof Filters }[] = [
      { key: 'brand' },
      { key: 'model' },
      { key: 'condition' },
      { key: 'appearance' },
      { key: 'working' },
      { key: 'ownership' },
      { key: 'country' },
      { key: 'locationCountry' },
      { key: 'region' },
      { key: 'ampType' },
      { key: 'ampDetail' },
      { key: 'ampMethod' },
      { key: 'impedance' },
      { key: 'phono' },
      { key: 'toneControl' },
      { key: 'remote' },
      { key: 'voltage' }, // 앰프와 턴테이블 (아래에서 거름)
      { key: 'speakerDetail' },
      { key: 'driverConfig' },
      { key: 'enclosure' },
      { key: 'speakerImpedance' },
      { key: 'wooferSize' },
      { key: 'driveType' },
      { key: 'tonearm' },
      { key: 'cartridge' },
      { key: 'speeds' },
      { key: 'autoMode' },
      { key: 'dustCover' },
      { key: 'phonoBuiltIn' },
      { key: 'cdDigitalOut' },  // CD 플레이어 (아래에서 거름)
      { key: 'cdAnalogOut' },
      { key: 'tunerBand' },                            // 튜너
      { key: 'headCount' },                            // 카세트 데크 (2026-11-10)
      { key: 'autoReverse' },
      { key: 'capstan' },
      { key: 'noiseReduction' },
      { key: 'tapeTypeRec' },
      { key: 'headWear' },
      { key: 'terminalIn' },
      { key: 'terminalOut' },
      { key: 'directional' },
      { key: 'conductor' },
      { key: 'plating' },
      { key: 'shield' },
      { key: 'pair' },
    ];
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

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      {/* 헤더 */}
      <div className="mb-5">
        <nav className="text-14 text-muted mb-2">
          홈
          {category && (
            <>
              <span className="mx-1">›</span>
              {subCategories.size === 1 ? (
                <button
                  onClick={() => changeSubCategories(new Set())}
                  className="text-14 hover:text-fg"
                >
                  {category}
                </button>
              ) : (
                <span className="text-fg">{category}</span>
              )}
            </>
          )}
          {subCategories.size === 1 && (
            <>
              <span className="mx-1">›</span>
              <span className="text-fg">{[...subCategories][0]}</span>
            </>
          )}
        </nav>
        {searchQuery ? (
          <div>
            <h1 className="text-32 font-bold mb-3">
              ‘{searchQuery}’ 검색 결과{' '}
              <span className="text-24 font-bold text-muted">{filtered.length.toLocaleString('ko-KR')}건</span>
            </h1>
            {/* "Did you mean?" — 결과 0건 + 비슷한 후보가 있을 때만 표시 */}
            {suggestion && (
              <p className="text-16 text-fg mb-3">
                혹시{' '}
                <button
                  type="button"
                  onClick={() => onSearch?.(suggestion.label)}
                  className="text-fg underline font-bold"
                >
                  ‘{suggestion.label}’
                </button>
                를 찾으세요?
              </p>
            )}
            {/* 0건인데 비슷한 판매중 브랜드도 없으면 추천 없이 안내만 */}
            {!suggestion && !listingsLoading && searchedListings.length === 0 && (
              <p className="text-16 text-fg mb-3">판매중인 매물에서 비슷한 브랜드를 찾지 못했어요. 다른 검색어로 찾아보세요.</p>
            )}
            {/* 편집 검색창 — 홈 안 거치고 바로 수정·재검색 */}
            <form
              onSubmit={(e) => { e.preventDefault(); if (searchInput.trim()) onSearch?.(searchInput.trim()); }}
              className="relative max-w-md"
            >
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="검색어 수정"
                className="w-full border border-line rounded-full pl-5 pr-10 py-3 focus:outline-none focus:border-fg"
              />
              <button
                type="submit"
                aria-label="검색"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full hover:bg-surface flex items-center justify-center"
              >
                <Search className="w-4 h-4 text-fg" />
              </button>
            </form>
          </div>
        ) : (() => {
          const activeSub = subCategories.size === 1 ? [...subCategories][0] : null;
          const meta = metaFor(category ?? null, activeSub);
          const title = meta?.title ?? category ?? 'ALL';
          return <h1 className="text-32 font-bold mb-1">{title}</h1>;
        })()}
      </div>

      {/* 2단 레이아웃: 좌측 필터 사이드바 + 우측 결과 */}
      <div className="flex gap-6">
        {/* 좌측 필터 사이드바 (스크롤 시 따라오지 않음) */}
        <aside className="hidden lg:block w-60 shrink-0">
          <div>
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-line">
              <SlidersHorizontal className="w-5 h-5" />
              <h2 className="text-20 font-bold">필터</h2>
            </div>

            {/* 활성 필터 섹션 */}
            {activeChips.length > 0 && (
              <div className="pb-3 mb-3 border-b border-line">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-14 font-bold text-fg">활성 필터</span>
                  <button
                    onClick={resetAll}
                    className="text-14 text-fg hover:text-fg underline"
                  >
                    전체 초기화
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {activeChips.map((chip) => (
                    <button
                      key={chip.key}
                      onClick={chip.remove}
                      className="inline-flex items-center justify-between gap-1 px-3 py-1 bg-surface text-fg border border-line rounded text-12 font-medium hover:bg-line text-left"
                    >
                      <span className="truncate">{chip.label}</span>
                      <X className="w-3 h-3 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col">
              {/* 상태(종류 4개) → 외관 상태 → 작동 상태 (2026-11-10 상태 등급 재구성). 외관, 작동은 중고 매물만 값이 있음 */}
              <FilterSection
                label={FL.condition}
                options={CONDITIONS}
                selected={filters.condition} getLabel={lab('condition')}
                onToggle={toggleField('condition')}
                counts={counts.condition}
              />
              <FilterSection label={FL.appearance} options={APPEARANCE_OPTS} selected={filters.appearance} getLabel={lab('appearance')} onToggle={toggleField('appearance')} counts={counts.appearance} />
              <FilterSection label={FL.working} options={WORKING_OPTS} selected={filters.working} getLabel={lab('working')} onToggle={toggleField('working')} counts={counts.working} />
              {sidebarCategoryGroups.map((g) => (
                <FilterSection
                  key={g.title}
                  label={g.title}
                  options={g.items}
                  selected={subCategories}
                  onToggle={toggleSubCategory}
                  counts={subCatCounts}
                  maxVisible={g.items.length > 8 ? 8 : undefined}
                />
              ))}
              {/* 앰프: 채널·증폭 방식·정격 출력은 브랜드 위에 표시 */}
              {isAmp && (
                <>
                  {vis.channel && (
                    <FilterSection label={FL.ampDetail} options={AMP_DETAILS} selected={filters.ampDetail} getLabel={lab('ampDetail')} onToggle={toggleField('ampDetail')} counts={counts.ampDetail} />
                  )}
                  <FilterSection label={FL.ampMethod} options={AMP_METHODS} selected={filters.ampMethod} getLabel={lab('ampMethod')} onToggle={toggleField('ampMethod')} counts={counts.ampMethod} />
                  {/* 헤드폰 앰프: 정격 출력 대신 "내 헤드폰 임피던스" 한 칸 — 매물 권장 범위(하한 ≤ N ≤ 상한)에 들면 표시 */}
                  {vis.headphoneImp ? (
                    <RangeSection label={FL.headphoneImp} unit="Ω" single singlePlaceholder="예: 32" min={filters.headphoneImp} max={null} onApply={(n) => setFilters((prev) => ({ ...prev, headphoneImp: n }))} />
                  ) : (
                    vis.power && (
                      <RangeSection label={`${FL.power} (W·8Ω)`} min={filters.powerMin} max={filters.powerMax} onApply={(m, x) => setFilters((prev) => ({ ...prev, powerMin: m, powerMax: x }))} />
                    )
                  )}
                </>
              )}
              <FilterSection
                label={FL.brand}
                options={brandsByCount}
                selected={filters.brand}
                onToggle={toggleField('brand')}
                counts={counts.brand}
                maxVisible={5}
                searchable
                getAliases={(name) => BRAND_ALIASES[name] ?? []}
              />
              <RangeSection
                label={FL.price}
                min={filters.priceMin}
                max={filters.priceMax}
                onApply={(m, x) => setFilters((prev) => ({ ...prev, priceMin: m, priceMax: x }))}
              />

              {/* 앰프 전용 (채널·증폭 방식·정격 출력은 브랜드 위로 이동) */}
              {isAmp && (
                <>
                  {vis.impedance && (
                    <FilterSection label={FL.impedance} options={IMPEDANCE_OPTS} selected={filters.impedance} onToggle={toggleField('impedance')} counts={counts.impedance} defaultOpen={false} />
                  )}
                  <FilterSection label={FL.phono} options={PHONO_OPTS} selected={filters.phono} getLabel={lab('phono')} onToggle={toggleField('phono')} counts={counts.phono} defaultOpen={false} />
                  {FEATURE_FLAGS.toneControlFilter && <FilterSection label={FL.toneControl} options={TONE_OPTS} selected={filters.toneControl} getLabel={lab('toneControl')} onToggle={toggleField('toneControl')} counts={counts.toneControl} defaultOpen={false} />}
                  {FEATURE_FLAGS.remoteFilter && <FilterSection label={FL.remote} options={REMOTE_OPTS} selected={filters.remote} getLabel={lab('remote')} onToggle={toggleField('remote')} counts={counts.remote} defaultOpen={false} />}
                  <FilterSection label={FL.voltage} options={VOLTAGE_OPTS} selected={filters.voltage} getLabel={lab('voltage')} onToggle={toggleField('voltage')} counts={counts.voltage} defaultOpen={false} />
                </>
              )}

              {/* 스피커 전용 */}
              {isSpeaker && (
                <>
                  <FilterSection label={FL.speakerDetail} options={SPEAKER_DETAILS} selected={filters.speakerDetail} getLabel={lab('speakerDetail')} onToggle={toggleField('speakerDetail')} counts={counts.speakerDetail} />
                  <FilterSection label={FL.driverConfig} options={DRIVER_CONFIGS} selected={filters.driverConfig} getLabel={lab('driverConfig')} onToggle={toggleField('driverConfig')} counts={counts.driverConfig} defaultOpen={false} />
                  <FilterSection label={FL.wooferSize} options={WOOFER_SIZES} selected={filters.wooferSize} getLabel={lab('wooferSize')} onToggle={toggleField('wooferSize')} counts={counts.wooferSize} defaultOpen={false} />
                  <FilterSection label={FL.enclosure} options={ENCLOSURE_TYPES} selected={filters.enclosure} getLabel={lab('enclosure')} onToggle={toggleField('enclosure')} counts={counts.enclosure} defaultOpen={false} />
                  <FilterSection label={FL.speakerImpedance} options={SPEAKER_IMPEDANCE} selected={filters.speakerImpedance} getLabel={lab('speakerImpedance')} onToggle={toggleField('speakerImpedance')} counts={counts.speakerImpedance} defaultOpen={false} />
                  <RangeSection label={FL.sensitivity} unit="dB" min={filters.sensitivityMin} max={filters.sensitivityMax} onApply={(m, x) => setFilters((prev) => ({ ...prev, sensitivityMin: m, sensitivityMax: x }))} defaultOpen={false} />
                  {/* 전원 전압 — 액티브 스피커만 값이 있어 패시브는 집계, 결과에서 빠짐 (2026-11-10) */}
                  <FilterSection label={FL.voltage} options={VOLTAGE_OPTS} selected={filters.voltage} getLabel={lab('voltage')} onToggle={toggleField('voltage')} counts={counts.voltage} defaultOpen={false} />
                  {FEATURE_FLAGS.recPowerFilter && <RangeSection label={FL.recPower} unit="W" min={filters.recPowerMin} max={filters.recPowerMax} onApply={(m, x) => setFilters((prev) => ({ ...prev, recPowerMin: m, recPowerMax: x }))} defaultOpen={false} />}
                </>
              )}

              {/* 케이블 전용 */}
              {isCable && (
                <>
                  <RangeSection label={FL.cableLength} unit="m" step={0.5} min={filters.cableLengthMin} max={filters.cableLengthMax} onApply={(m, x) => setFilters((prev) => ({ ...prev, cableLengthMin: m, cableLengthMax: x }))} />
                  {(() => {
                    const sortedTerms = terminalsPrioritized([...subCategories]);
                    return (
                      <div className="border-b border-line py-3">
                        <span className="block text-14 font-bold text-fg mb-3">입출력 단자</span>
                        <div className="flex flex-col gap-2">
                          <FilterDropdown label={FL.terminalIn} options={sortedTerms} selected={filters.terminalIn} onToggle={toggleField('terminalIn')} onClear={() => setFilters((prev) => ({ ...prev, terminalIn: new Set() }))} counts={counts.terminalIn} scrollable variant="box" />
                          <FilterDropdown label={FL.terminalOut} options={sortedTerms} selected={filters.terminalOut} onToggle={toggleField('terminalOut')} onClear={() => setFilters((prev) => ({ ...prev, terminalOut: new Set() }))} counts={counts.terminalOut} scrollable variant="box" />
                        </div>
                      </div>
                    );
                  })()}
                  <FilterSection label={FL.conductor} options={CONDUCTOR_OPTS} selected={filters.conductor} onToggle={toggleField('conductor')} counts={counts.conductor} defaultOpen={false} />
                  <FilterSection label={FL.plating} options={PLATING_OPTS} selected={filters.plating} onToggle={toggleField('plating')} counts={counts.plating} defaultOpen={false} />
                  {[...subCategories].some((s) => SHIELD_RELEVANT.includes(s)) && (
                    <FilterSection label={FL.shield} options={SHIELD_OPTS} selected={filters.shield} onToggle={toggleField('shield')} counts={counts.shield} defaultOpen={false} />
                  )}
                  <FilterSection label={FL.pair} options={PAIR_OPTS} selected={filters.pair} onToggle={toggleField('pair')} counts={counts.pair} defaultOpen={false} />
                  <FilterSection label={FL.directional} options={DIRECTIONALITY_OPTS} selected={filters.directional} onToggle={toggleField('directional')} counts={counts.directional} defaultOpen={false} />
                </>
              )}

              {/* 턴테이블 전용 */}
              {isTurntable && (
                <>
                  {/* 순서: 구동 방식, 회전수, 조작 방식, 톤암, 카트리지, 포노앰프 내장, 전원 전압 (2026-11-10, 형식 필터는 없음) */}
                  <FilterSection label={FL.driveType} options={DRIVE_TYPES} selected={filters.driveType} getLabel={lab('driveType')} onToggle={toggleField('driveType')} counts={counts.driveType} />
                  <FilterSection label={FL.speeds} options={SPEED_OPTS} selected={filters.speeds} getLabel={lab('speeds')} onToggle={toggleField('speeds')} counts={counts.speeds} />
                  <FilterSection label={FL.autoMode} options={AUTO_OPTS} selected={filters.autoMode} getLabel={lab('autoMode')} onToggle={toggleField('autoMode')} counts={counts.autoMode} />
                  <FilterSection label={FL.tonearm} options={TONEARM_OPTS} selected={filters.tonearm} getLabel={lab('tonearm')} onToggle={toggleField('tonearm')} counts={counts.tonearm} defaultOpen={false} />
                  <FilterSection label={FL.cartridge} options={CARTRIDGE_OPTS} selected={filters.cartridge} getLabel={lab('cartridge')} onToggle={toggleField('cartridge')} counts={counts.cartridge} defaultOpen={false} />
                  <FilterSection label={FL.phonoBuiltIn} options={PHONO_BUILTIN_OPTS} selected={filters.phonoBuiltIn} getLabel={lab('phonoBuiltIn')} onToggle={toggleField('phonoBuiltIn')} counts={counts.phonoBuiltIn} defaultOpen={false} />
                  <FilterSection label={FL.voltage} options={VOLTAGE_OPTS} selected={filters.voltage} getLabel={lab('voltage')} onToggle={toggleField('voltage')} counts={counts.voltage} defaultOpen={false} />
                  {FEATURE_FLAGS.dustCoverFilter && <FilterSection label={FL.dustCover} options={DUSTCOVER_OPTS} selected={filters.dustCover} getLabel={lab('dustCover')} onToggle={toggleField('dustCover')} counts={counts.dustCover} defaultOpen={false} />}
                </>
              )}

              {/* CD 플레이어 전용 (2026-11-10) */}
              {isCd && (
                <>
                  <FilterSection label={FL.cdDigitalOut} options={CD_DIGITAL_OUTS} selected={filters.cdDigitalOut} getLabel={lab('cdDigitalOut')} onToggle={toggleField('cdDigitalOut')} counts={counts.cdDigitalOut} />
                  <FilterSection label={FL.cdAnalogOut} options={CD_ANALOG_OUTS} selected={filters.cdAnalogOut} getLabel={lab('cdAnalogOut')} onToggle={toggleField('cdAnalogOut')} counts={counts.cdAnalogOut} />
                  <FilterSection label={FL.voltage} options={VOLTAGE_OPTS} selected={filters.voltage} getLabel={lab('voltage')} onToggle={toggleField('voltage')} counts={counts.voltage} defaultOpen={false} />
                </>
              )}
              {/* 카세트 데크 전용 (2026-11-10) — 핵심 칸 6개 + 전원 전압 */}
              {vis.cassette && (
                <>
                  <FilterSection label={FL.headCount} options={CAS_HEAD_COUNTS} selected={filters.headCount} getLabel={lab('headCount')} onToggle={toggleField('headCount')} counts={counts.headCount} />
                  <FilterSection label={FL.autoReverse} options={CAS_AUTOREVERSES} selected={filters.autoReverse} getLabel={lab('autoReverse')} onToggle={toggleField('autoReverse')} counts={counts.autoReverse} />
                  <FilterSection label={FL.capstan} options={CAS_CAPSTANS} selected={filters.capstan} getLabel={lab('capstan')} onToggle={toggleField('capstan')} counts={counts.capstan} />
                  <FilterSection label={FL.noiseReduction} options={CAS_NRS} selected={filters.noiseReduction} getLabel={lab('noiseReduction')} onToggle={toggleField('noiseReduction')} counts={counts.noiseReduction} defaultOpen={false} />
                  <FilterSection label={FL.tapeTypeRec} options={CAS_TAPE_TYPES} selected={filters.tapeTypeRec} getLabel={lab('tapeTypeRec')} onToggle={toggleField('tapeTypeRec')} counts={counts.tapeTypeRec} defaultOpen={false} />
                  <FilterSection label={FL.headWear} options={CAS_HEAD_WEARS} selected={filters.headWear} getLabel={lab('headWear')} onToggle={toggleField('headWear')} counts={counts.headWear} defaultOpen={false} />
                  <FilterSection label={FL.voltage} options={VOLTAGE_OPTS} selected={filters.voltage} getLabel={lab('voltage')} onToggle={toggleField('voltage')} counts={counts.voltage} defaultOpen={false} />
                </>
              )}
              {/* 튜너 전용 (2026-11-10) */}
              {isTuner && (
                <>
                  <FilterSection label={FL.tunerBand} options={TUNER_BANDS} selected={filters.tunerBand} getLabel={lab('tunerBand')} onToggle={toggleField('tunerBand')} counts={counts.tunerBand} />
                  <FilterSection label={FL.voltage} options={VOLTAGE_OPTS} selected={filters.voltage} getLabel={lab('voltage')} onToggle={toggleField('voltage')} counts={counts.voltage} defaultOpen={false} />
                </>
              )}

              {/* 전원 장치 전용 */}
              {isPowerDevice && (
                <RangeSection label={FL.ratedCapacity} unit="W" min={filters.ratedCapacityMin} max={filters.ratedCapacityMax} onApply={(m, x) => setFilters((prev) => ({ ...prev, ratedCapacityMin: m, ratedCapacityMax: x }))} />
              )}

              {/* 공통 */}
              <RangeSection label={FL.year} noComma min={filters.yearMin} max={filters.yearMax} onApply={(m, x) => setFilters((prev) => ({ ...prev, yearMin: m, yearMax: x }))} defaultOpen={false} />
              {FEATURE_FLAGS.ownership && <FilterSection label={FL.ownership} options={OWNERSHIP_OPTS} selected={filters.ownership} getLabel={lab('ownership')} onToggle={toggleField('ownership')} counts={counts.ownership} defaultOpen={false} />}
              <FilterSection label={FL.country} options={COUNTRY_OPTS} selected={filters.country} getLabel={lab('country')} onToggle={toggleField('country')} counts={counts.country} defaultOpen={false} />
              {/* 국가 → 지역: 국가를 고르면 지역은 그 나라 것만 (안 고르면 전 국가, 한국 먼저 펼침) */}
              {vis.locationCountry && <FilterSection label={FL.locationCountry} options={LOCATION_COUNTRIES} selected={filters.locationCountry} getLabel={lab('locationCountry')} onToggle={(v) => setFilters((prev) => { const set = new Set(prev.locationCountry); if (set.has(v)) set.delete(v); else set.add(v); return pruneRegions({ ...prev, locationCountry: set }); })} counts={counts.locationCountry} defaultOpen={false}  />}
              <FilterSection label={FL.region} options={regionOptionsFor(filters.locationCountry)} selected={filters.region} getLabel={lab('region')} onToggle={toggleField('region')} counts={counts.region} defaultOpen={false} maxVisible={filters.locationCountry.size ? undefined : REGION_VISIBLE_ALL} />
            </div>
          </div>
        </aside>

        {/* 우측 결과 영역 */}
        <div className="flex-1 min-w-0">
          {/* 모바일 전용 필터 버튼 */}
          <div className="lg:hidden mb-3">
            <button
              onClick={() => setModalOpen(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-14 font-medium transition ${
                filterCount > 0
                  ? 'border-fg bg-surface text-fg'
                  : 'border-line bg-bg text-fg hover:border-muted'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>필터</span>
              {filterCount > 0 && (
                <span className="bg-fg text-bg text-12 rounded-full px-2 py-1 leading-none">
                  {filterCount}
                </span>
              )}
            </button>
          </div>

          {/* 결과 수 + 정렬 */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-14 text-fg">
              {listingsLoading
                ? '매물을 불러오는 중…'
                : <><b className="text-fg">{filtered.length.toLocaleString('ko-KR')}</b>건의 매물</>}
            </p>
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="appearance-none border border-line rounded-lg pl-4 pr-9 py-2 text-14 focus:outline-none focus:border-fg bg-bg"
              >
                {SORT_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 매물 그리드 (listing-grid.tsx로 분리) */}
          <ListingGrid
            listings={filtered}
            liked={liked}
            onToggleLike={toggleLike}
            onSelect={onSelect}
          />
        </div>
      </div>

      {/* 필터 모달 */}
      {modalOpen && (
        <FilterModal
          filters={filters}
          counts={counts}
          category={category ?? null}
          isAmp={isAmp}
          isSpeaker={isSpeaker}
          isSource={isSource}
          isAccessory={isAccessory}
          isTtAccessory={isTtAccessory}
          isCable={isCable}
          subCategories={subCategories}
          categoryOptions={categorySubs}
          listings={baseCategoryListings}
          brandOptions={brandsByCount}
          onApply={(next, subs) => {
            setFilters(pruneHiddenFilters(next, filterVisibility(category, subs))); // 모달에서도 사라진 칸 값은 비워서 넘어오지만 한 번 더
            setSubCategories(subs);
          }}
          onClose={() => setModalOpen(false)}
        />
      )}
    </main>
  );
}
