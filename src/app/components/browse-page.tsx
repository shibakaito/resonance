'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, X, SlidersHorizontal } from 'lucide-react';
import { subcategoriesFor, BRAND_DIRECTORY, searchBrands, TOP_CATEGORIES, ALL_SUBCATEGORIES } from '../data/catalog';
import { terminalsPrioritized } from '../data/cable-terminals';
import { metaFor } from '../data/category-meta';

interface BrowsePageProps {
  onSelect: (id: string) => void;
  category?: string | null;
  initialSubCategory?: string | null;
  searchQuery?: string; // 홈 메인 검색에서 넘어온 검색어 (적용은 B단계)
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
  CONDITION_DISPLAY,
  CONDUCTOR_OPTS,
  CONNECTION_TYPES,
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
  Listing,
  OWNERSHIP_OPTS,
  PAIR_OPTS,
  PHONO_OPTS,
  PLATING_OPTS,
  POWER_DEVICE_ITEMS,
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
  USED_ALL,
  USED_GRADES,
  VOLTAGE_OPTS,
  WOOFER_SIZES,
  applyFilters,
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

// 브랜드 영문명 → 한글 별칭 목록 (검색용). 홈 콤보박스와 동일하게 BRAND_DIRECTORY 재사용.
const BRAND_ALIASES: Record<string, readonly string[]> = Object.fromEntries(
  BRAND_DIRECTORY.map((b) => [b.name, b.aliases])
);

export function BrowsePage({ onSelect, category, initialSubCategory, searchQuery }: BrowsePageProps) {
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

  const toggleSubCategory = (v: string) => {
    setSubCategories((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  };

  // 검색어(?q) 1차 필터 — brand/model/title/description + 한글 별칭(브랜드) + 카테고리 한글
  const searchedListings = useMemo(() => {
    const q = (searchQuery ?? '').trim();
    if (!q) return allListings;
    const norm = (s: string) => s.replace(/[\s&\-/]+/g, '').toLowerCase();
    const nq = norm(q);
    // 검색어와 일치하는 브랜드명 집합 (예: '매킨토시' → 'McIntosh')
    const brandHits = new Set(searchBrands(q).map((b) => b.name));
    // 카테고리 한글 매칭: 대분류는 정확 매칭 → 그 하위 전체, 세부는 부분일치
    const matchedSubs = new Set<string>();
    for (const top of TOP_CATEGORIES)
      if (norm(top) === nq) subcategoriesFor(top).forEach((s) => matchedSubs.add(s));
    for (const sub of ALL_SUBCATEGORIES)
      if (norm(sub).includes(nq)) matchedSubs.add(sub);
    return allListings.filter((l) => {
      if (brandHits.has(l.brand)) return true;
      const hay = norm(`${l.brand} ${l.model} ${l.title} ${l.description}`);
      if (hay.includes(nq)) return true;
      if (matchedSubs.size > 0 && l.categories.some((c) => matchedSubs.has(c))) return true;
      return false;
    });
  }, [allListings, searchQuery]);

  // 대분류만 적용된 풀 (카테고리 칩의 개수 집계 기준 — subCategories 미적용)
  const baseCategoryListings = useMemo(() => {
    if (categorySubs.length === 0) return searchedListings;
    return searchedListings.filter((l) => l.categories.some((c) => categorySubs.includes(c)));
  }, [searchedListings, categorySubs]);

  // subCategories까지 적용된 풀
  const categoryListings = useMemo(() => {
    if (subCategories.size > 0) return baseCategoryListings.filter((l) => l.categories.some((c) => subCategories.has(c)));
    return baseCategoryListings;
  }, [baseCategoryListings, subCategories]);

  // 턴테이블 단독 선택 시 턴테이블 전용 필터 활성
  const isTurntable =
    isSource && subCategories.size === 1 && subCategories.has('턴테이블');

  // 프리앰프 단독 선택 시 정격 출력 필터 숨김 (프리앰프는 출력 정격이 없음)
  const isPreampOnly =
    isAmp && subCategories.size === 1 && subCategories.has('프리앰프');

  // 헤드폰 앰프 단독 선택 시 정격 출력 대신 지원 임피던스(Ω) 범위 필터 표시
  const isHeadphoneAmp =
    isAmp && subCategories.size === 1 && subCategories.has('헤드폰 앰프');

  // 액세서리 페이지에서 전원 장치 그룹 항목이 하나라도 선택되면 전원 장치 전용 필터 활성
  const isPowerDevice =
    isAccessory && [...subCategories].some((s) => POWER_DEVICE_ITEMS.includes(s));
  const isCable = isCableCat;

  const subCatCounts = useMemo(
    () => countBy(baseCategoryListings, (l) => l.categories),
    [baseCategoryListings]
  );

  const counts = useMemo<Counts>(
    () => ({
      brand: countBy(categoryListings, (l) => l.brand),
      condition: (() => {
        const c = countBy(categoryListings, (l) => l.condition);
        // '중고' = 모든 중고 등급 매물 수 합계 (UI 단축키용)
        c[USED_ALL] = Object.entries(c)
          .filter(([k]) => USED_GRADES.includes(k))
          .reduce((s, [, v]) => s + v, 0);
        return c;
      })(),
      ownership: countBy(categoryListings, (l) => l.ownership),
      country: countBy(categoryListings, (l) => l.country),
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
      connection: countBy(categoryListings, (l) => l.connection),
      wooferSize: countBy(categoryListings, (l) => l.wooferSize),
      driveType: countBy(categoryListings, (l) => l.driveType),
      tonearm: countBy(categoryListings, (l) => l.tonearm),
      cartridge: countBy(categoryListings, (l) => l.cartridge),
      speeds: countBy(categoryListings, (l) => l.speeds),
      autoMode: countBy(categoryListings, (l) => l.autoMode),
      dustCover: countBy(categoryListings, (l) => l.dustCover),
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

  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [modalOpen, setModalOpen] = useState(false);
  const [sort, setSort] = useState(SORT_OPTIONS[0]);
  const [liked, setLiked] = useState<Set<string>>(new Set());

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
    const list = applyFilters(categoryListings, filters, isAmp, isSpeaker, isTurntable, isPowerDevice, isCable);
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
    const setFieldKeys: { key: keyof Filters; prefix?: string; ampOnly?: boolean; speakerOnly?: boolean; turntableOnly?: boolean; cableOnly?: boolean }[] = [
      { key: 'brand' },
      { key: 'condition' },
      { key: 'ownership' },
      { key: 'country' },
      { key: 'region' },
      { key: 'ampType', ampOnly: true },
      { key: 'ampDetail', ampOnly: true },
      { key: 'ampMethod', ampOnly: true },
      { key: 'impedance', ampOnly: true },
      { key: 'phono', prefix: '포노', ampOnly: true },
      { key: 'toneControl', prefix: '톤 컨트롤', ampOnly: true },
      { key: 'remote', prefix: '리모컨', ampOnly: true },
      { key: 'voltage', ampOnly: true },
      { key: 'speakerDetail', speakerOnly: true },
      { key: 'driverConfig', speakerOnly: true },
      { key: 'enclosure', speakerOnly: true },
      { key: 'speakerImpedance', speakerOnly: true },
      { key: 'connection', speakerOnly: true },
      { key: 'wooferSize', speakerOnly: true },
      { key: 'driveType', turntableOnly: true },
      { key: 'tonearm', prefix: '톤암', turntableOnly: true },
      { key: 'cartridge', prefix: '카트리지', turntableOnly: true },
      { key: 'speeds', turntableOnly: true },
      { key: 'autoMode', turntableOnly: true },
      { key: 'dustCover', prefix: '더스트 커버', turntableOnly: true },
      { key: 'terminalIn', prefix: '입력', cableOnly: true },
      { key: 'terminalOut', prefix: '출력', cableOnly: true },
      { key: 'directional', prefix: '방향성', cableOnly: true },
      { key: 'conductor', prefix: '도체', cableOnly: true },
      { key: 'plating', prefix: '도금', cableOnly: true },
      { key: 'shield', prefix: '차폐', cableOnly: true },
      { key: 'pair', cableOnly: true },
    ];
    // 케이블: 입력/출력 둘 다 정확히 1개 선택된 경우 결합 칩으로 표시
    const combineTermActive =
      isCable && filters.terminalIn.size === 1 && filters.terminalOut.size === 1;
    if (combineTermActive) {
      const tIn = [...filters.terminalIn][0];
      const tOut = [...filters.terminalOut][0];
      activeChips.push({
        key: `term-pair-${tIn}-${tOut}`,
        label: `입력: ${tIn} → 출력: ${tOut}`,
        remove: () =>
          setFilters((prev) => ({
            ...prev,
            terminalIn: new Set(),
            terminalOut: new Set()
          }))
      });
    }
    for (const { key, prefix, ampOnly, speakerOnly, turntableOnly, cableOnly } of setFieldKeys) {
      if (ampOnly && !isAmp) continue;
      if (speakerOnly && !isSpeaker) continue;
      if (turntableOnly && !isTurntable) continue;
      if (cableOnly && !isCable) continue;
      if (combineTermActive && (key === 'terminalIn' || key === 'terminalOut')) continue;
      const useColon = key === 'terminalIn' || key === 'terminalOut';
      for (const v of filters[key] as Set<string>) {
        activeChips.push({
          key: `${key}-${v}`,
          label: prefix ? (useColon ? `${prefix}: ${v}` : `${prefix} ${v}`) : v,
          remove: () => toggleField(key)(v)
        });
      }
    }
    const priceLabel = rangeChipLabel(filters.priceMin, filters.priceMax, '만원');
    if (priceLabel)
      activeChips.push({
        key: 'price',
        label: `가격: ${priceLabel}`,
        remove: () => setFilters((prev) => ({ ...prev, priceMin: null, priceMax: null }))
      });
    const yearLabel = rangeChipLabel(filters.yearMin, filters.yearMax, '');
    if (yearLabel)
      activeChips.push({
        key: 'year',
        label: `출시년도: ${yearLabel}`,
        remove: () => setFilters((prev) => ({ ...prev, yearMin: null, yearMax: null }))
      });
    if (isAmp) {
      const powerLabel = rangeChipLabel(filters.powerMin, filters.powerMax, 'W');
      if (powerLabel)
        activeChips.push({
          key: 'power',
          label: `정격 출력: ${powerLabel}`,
          remove: () => setFilters((prev) => ({ ...prev, powerMin: null, powerMax: null }))
        });
      const hpImpLabel = rangeChipLabel(filters.headphoneImpMin, filters.headphoneImpMax, 'Ω');
      if (hpImpLabel)
        activeChips.push({
          key: 'headphoneImp',
          label: `지원 임피던스: ${hpImpLabel}`,
          remove: () => setFilters((prev) => ({ ...prev, headphoneImpMin: null, headphoneImpMax: null }))
        });
    }
    if (isPowerDevice) {
      const capLabel = rangeChipLabel(filters.ratedCapacityMin, filters.ratedCapacityMax, 'W');
      if (capLabel)
        activeChips.push({
          key: 'ratedCapacity',
          label: `정격 용량: ${capLabel}`,
          remove: () => setFilters((prev) => ({ ...prev, ratedCapacityMin: null, ratedCapacityMax: null }))
        });
    }
    if (isCable) {
      const lenLabel = rangeChipLabel(filters.cableLengthMin, filters.cableLengthMax, 'm');
      if (lenLabel)
        activeChips.push({
          key: 'cableLength',
          label: `길이: ${lenLabel}`,
          remove: () => setFilters((prev) => ({ ...prev, cableLengthMin: null, cableLengthMax: null }))
        });
    }
    if (isSpeaker) {
      const sensLabel = rangeChipLabel(filters.sensitivityMin, filters.sensitivityMax, 'dB');
      if (sensLabel)
        activeChips.push({
          key: 'sensitivity',
          label: `감도: ${sensLabel}`,
          remove: () => setFilters((prev) => ({ ...prev, sensitivityMin: null, sensitivityMax: null }))
        });
      const recLabel = rangeChipLabel(filters.recPowerMin, filters.recPowerMax, 'W');
      if (recLabel)
        activeChips.push({
          key: 'recPower',
          label: `권장 앰프 출력: ${recLabel}`,
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
        <nav className="text-sm text-gray-500 mb-2">
          홈
          {category && (
            <>
              <span className="mx-1">›</span>
              {subCategories.size === 1 ? (
                <button
                  onClick={() => setSubCategories(new Set())}
                  className="text-sm hover:text-[#000000]"
                >
                  {category}
                </button>
              ) : (
                <span className="text-[#000000]">{category}</span>
              )}
            </>
          )}
          {subCategories.size === 1 && (
            <>
              <span className="mx-1">›</span>
              <span className="text-[#000000]">{[...subCategories][0]}</span>
            </>
          )}
        </nav>
        {(() => {
          const activeSub = subCategories.size === 1 ? [...subCategories][0] : null;
          const meta = metaFor(category ?? null, activeSub);
          const title = meta?.title ?? category ?? 'ALL';
          return <h1 className="text-3xl font-bold mb-1">{title}</h1>;
        })()}
      </div>

      {/* 2단 레이아웃: 좌측 필터 사이드바 + 우측 결과 */}
      <div className="flex gap-6">
        {/* 좌측 필터 사이드바 (스크롤 시 따라오지 않음) */}
        <aside className="hidden lg:block w-60 shrink-0">
          <div>
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-[#e0e0e0]">
              <SlidersHorizontal className="w-5 h-5" />
              <h2 className="text-lg font-bold">필터</h2>
            </div>

            {/* 활성 필터 섹션 */}
            {activeChips.length > 0 && (
              <div className="pb-3 mb-3 border-b border-[#e0e0e0]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-[#000000]">활성 필터</span>
                  <button
                    onClick={resetAll}
                    className="text-sm text-gray-600 hover:text-[#000000] underline"
                  >
                    전체 초기화
                  </button>
                </div>
                <div className="flex flex-col gap-1.5">
                  {activeChips.map((chip) => (
                    <button
                      key={chip.key}
                      onClick={chip.remove}
                      className="inline-flex items-center justify-between gap-1 px-2.5 py-1 bg-[#f7f7f7] text-[#000000] border border-[#e0e0e0] rounded text-xs font-medium hover:bg-[#e0e0e0] text-left"
                    >
                      <span className="truncate">{chip.label}</span>
                      <X className="w-3 h-3 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col">
              <FilterSection
                label="상태"
                options={CONDITION_DISPLAY}
                selected={filters.condition}
                onToggle={toggleField('condition')}
                counts={counts.condition}
                maxVisible={3}
              />
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
              {/* 앰프: 세부 카테고리·증폭 방식·정격 출력은 브랜드 위에 표시 */}
              {isAmp && (
                <>
                  {!isHeadphoneAmp && (
                    <FilterSection label="세부 카테고리" options={AMP_DETAILS} selected={filters.ampDetail} onToggle={toggleField('ampDetail')} counts={counts.ampDetail} />
                  )}
                  <FilterSection label="증폭 방식" options={AMP_METHODS} selected={filters.ampMethod} onToggle={toggleField('ampMethod')} counts={counts.ampMethod} />
                  {/* 헤드폰 앰프: 정격 출력 대신 지원 임피던스(Ω) 범위 */}
                  {isHeadphoneAmp ? (
                    <RangeSection label="지원 임피던스" unit="Ω" min={filters.headphoneImpMin} max={filters.headphoneImpMax} onApply={(m, x) => setFilters((prev) => ({ ...prev, headphoneImpMin: m, headphoneImpMax: x }))} />
                  ) : (
                    !isPreampOnly && (
                      <RangeSection label="정격 출력 (W·8Ω)" min={filters.powerMin} max={filters.powerMax} onApply={(m, x) => setFilters((prev) => ({ ...prev, powerMin: m, powerMax: x }))} />
                    )
                  )}
                </>
              )}
              <FilterSection
                label="브랜드"
                options={brandsByCount}
                selected={filters.brand}
                onToggle={toggleField('brand')}
                counts={counts.brand}
                maxVisible={5}
                searchable
                getAliases={(name) => BRAND_ALIASES[name] ?? []}
              />
              <RangeSection
                label="가격"
                min={filters.priceMin}
                max={filters.priceMax}
                onApply={(m, x) => setFilters((prev) => ({ ...prev, priceMin: m, priceMax: x }))}
              />

              {/* 앰프 전용 (세부 카테고리·증폭 방식·정격 출력은 브랜드 위로 이동) */}
              {isAmp && (
                <>
                  {!isPreampOnly && !isHeadphoneAmp && (
                    <FilterSection label="지원 임피던스" options={IMPEDANCE_OPTS} selected={filters.impedance} onToggle={toggleField('impedance')} counts={counts.impedance} defaultOpen={false} />
                  )}
                  <FilterSection label="포노 입력" options={PHONO_OPTS} selected={filters.phono} onToggle={toggleField('phono')} counts={counts.phono} defaultOpen={false} />
                  <FilterSection label="톤 컨트롤" options={TONE_OPTS} selected={filters.toneControl} onToggle={toggleField('toneControl')} counts={counts.toneControl} defaultOpen={false} />
                  <FilterSection label="리모컨" options={REMOTE_OPTS} selected={filters.remote} onToggle={toggleField('remote')} counts={counts.remote} defaultOpen={false} />
                  <FilterSection label="전원전압" options={VOLTAGE_OPTS} selected={filters.voltage} onToggle={toggleField('voltage')} counts={counts.voltage} defaultOpen={false} />
                </>
              )}

              {/* 스피커 전용 */}
              {isSpeaker && (
                <>
                  <FilterSection label="세부 카테고리" options={SPEAKER_DETAILS} selected={filters.speakerDetail} onToggle={toggleField('speakerDetail')} counts={counts.speakerDetail} />
                  <FilterSection label="연결 방식" options={CONNECTION_TYPES} selected={filters.connection} onToggle={toggleField('connection')} counts={counts.connection} />
                  <FilterSection label="드라이버 구성" options={DRIVER_CONFIGS} selected={filters.driverConfig} onToggle={toggleField('driverConfig')} counts={counts.driverConfig} defaultOpen={false} />
                  <FilterSection label="우퍼 크기" options={WOOFER_SIZES} selected={filters.wooferSize} onToggle={toggleField('wooferSize')} counts={counts.wooferSize} defaultOpen={false} />
                  <FilterSection label="인클로저 타입" options={ENCLOSURE_TYPES} selected={filters.enclosure} onToggle={toggleField('enclosure')} counts={counts.enclosure} defaultOpen={false} />
                  <FilterSection label="임피던스" options={SPEAKER_IMPEDANCE} selected={filters.speakerImpedance} onToggle={toggleField('speakerImpedance')} counts={counts.speakerImpedance} defaultOpen={false} />
                  <RangeSection label="감도" unit="dB" min={filters.sensitivityMin} max={filters.sensitivityMax} onApply={(m, x) => setFilters((prev) => ({ ...prev, sensitivityMin: m, sensitivityMax: x }))} defaultOpen={false} />
                  <RangeSection label="권장 앰프 출력" unit="W" min={filters.recPowerMin} max={filters.recPowerMax} onApply={(m, x) => setFilters((prev) => ({ ...prev, recPowerMin: m, recPowerMax: x }))} defaultOpen={false} />
                </>
              )}

              {/* 케이블 전용 */}
              {isCable && (
                <>
                  <RangeSection label="길이" unit="m" step={0.5} min={filters.cableLengthMin} max={filters.cableLengthMax} onApply={(m, x) => setFilters((prev) => ({ ...prev, cableLengthMin: m, cableLengthMax: x }))} />
                  {(() => {
                    const sortedTerms = terminalsPrioritized([...subCategories]);
                    return (
                      <div className="border-b border-[#e0e0e0] py-3">
                        <span className="block text-sm font-semibold text-[#000000] mb-2.5">입출력 단자</span>
                        <div className="flex flex-col gap-2">
                          <FilterDropdown label="입력 단자" options={sortedTerms} selected={filters.terminalIn} onToggle={toggleField('terminalIn')} onClear={() => setFilters((prev) => ({ ...prev, terminalIn: new Set() }))} counts={counts.terminalIn} scrollable variant="box" />
                          <FilterDropdown label="출력 단자" options={sortedTerms} selected={filters.terminalOut} onToggle={toggleField('terminalOut')} onClear={() => setFilters((prev) => ({ ...prev, terminalOut: new Set() }))} counts={counts.terminalOut} scrollable variant="box" />
                        </div>
                      </div>
                    );
                  })()}
                  <FilterSection label="도체 재질" options={CONDUCTOR_OPTS} selected={filters.conductor} onToggle={toggleField('conductor')} counts={counts.conductor} defaultOpen={false} />
                  <FilterSection label="커넥터 도금" options={PLATING_OPTS} selected={filters.plating} onToggle={toggleField('plating')} counts={counts.plating} defaultOpen={false} />
                  {[...subCategories].some((s) => SHIELD_RELEVANT.includes(s)) && (
                    <FilterSection label="차폐 방식" options={SHIELD_OPTS} selected={filters.shield} onToggle={toggleField('shield')} counts={counts.shield} defaultOpen={false} />
                  )}
                  <FilterSection label="페어 여부" options={PAIR_OPTS} selected={filters.pair} onToggle={toggleField('pair')} counts={counts.pair} defaultOpen={false} />
                  <FilterSection label="방향성" options={DIRECTIONALITY_OPTS} selected={filters.directional} onToggle={toggleField('directional')} counts={counts.directional} defaultOpen={false} />
                </>
              )}

              {/* 턴테이블 전용 */}
              {isTurntable && (
                <>
                  <FilterSection label="구동 방식" options={DRIVE_TYPES} selected={filters.driveType} onToggle={toggleField('driveType')} counts={counts.driveType} />
                  <FilterSection label="톤암" options={TONEARM_OPTS} selected={filters.tonearm} onToggle={toggleField('tonearm')} counts={counts.tonearm} />
                  <FilterSection label="카트리지" options={CARTRIDGE_OPTS} selected={filters.cartridge} onToggle={toggleField('cartridge')} counts={counts.cartridge} />
                  <FilterSection label="속도" options={SPEED_OPTS} selected={filters.speeds} onToggle={toggleField('speeds')} counts={counts.speeds} defaultOpen={false} />
                  <FilterSection label="오토 기능" options={AUTO_OPTS} selected={filters.autoMode} onToggle={toggleField('autoMode')} counts={counts.autoMode} defaultOpen={false} />
                  <FilterSection label="더스트 커버" options={DUSTCOVER_OPTS} selected={filters.dustCover} onToggle={toggleField('dustCover')} counts={counts.dustCover} defaultOpen={false} />
                </>
              )}

              {/* 전원 장치 전용 */}
              {isPowerDevice && (
                <RangeSection label="정격 용량" unit="W" min={filters.ratedCapacityMin} max={filters.ratedCapacityMax} onApply={(m, x) => setFilters((prev) => ({ ...prev, ratedCapacityMin: m, ratedCapacityMax: x }))} />
              )}

              {/* 공통 */}
              <RangeSection label="출시년도" noComma min={filters.yearMin} max={filters.yearMax} onApply={(m, x) => setFilters((prev) => ({ ...prev, yearMin: m, yearMax: x }))} defaultOpen={false} />
              <FilterSection label="소유권" options={OWNERSHIP_OPTS} selected={filters.ownership} onToggle={toggleField('ownership')} counts={counts.ownership} defaultOpen={false} />
              <FilterSection label="제조국" options={COUNTRY_OPTS} selected={filters.country} onToggle={toggleField('country')} counts={counts.country} defaultOpen={false} />
              <FilterSection label="지역" options={LOCATIONS} selected={filters.region} onToggle={toggleField('region')} counts={counts.region} defaultOpen={false} />
            </div>
          </div>
        </aside>

        {/* 우측 결과 영역 */}
        <div className="flex-1 min-w-0">
          {/* 모바일 전용 필터 버튼 */}
          <div className="lg:hidden mb-3">
            <button
              onClick={() => setModalOpen(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition ${
                filterCount > 0
                  ? 'border-[#000000] bg-[#f7f7f7] text-[#000000]'
                  : 'border-[#e0e0e0] bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>필터</span>
              {filterCount > 0 && (
                <span className="bg-[#000000] text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                  {filterCount}
                </span>
              )}
            </button>
          </div>

          {/* 결과 수 + 정렬 */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-700">
              {listingsLoading
                ? '매물을 불러오는 중…'
                : <><b className="text-[#000000]">{filtered.length.toLocaleString('ko-KR')}</b>건의 매물</>}
            </p>
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="appearance-none border border-[#e0e0e0] rounded-lg pl-4 pr-9 py-2 text-sm focus:outline-none focus:border-[#000000] bg-white"
              >
                {SORT_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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
            setFilters(next);
            setSubCategories(subs);
          }}
          onClose={() => setModalOpen(false)}
        />
      )}
    </main>
  );
}
