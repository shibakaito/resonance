'use client';
// 상태(useState)·효과(useEffect)·DOM 이벤트를 쓰므로 클라이언트 컴포넌트.
import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, TrendingUp, Heart, Tag, Truck, ChevronRight, ArrowRight, ChevronDown } from 'lucide-react';
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
import { CONDITIONS, APPEARANCE_OPTS, WORKING_OPTS, fmtPrice } from './browse-filters';
import { ConditionBadge } from './condition-badge';
import { keyFor, label, LOCATION_COUNTRY_OPTS, locationOptsFor, FILTER_LABELS as FL } from '@/lib/labels'; // FL = 칸 이름 (둘러보기 필터와 같은 표)
import { fetchListings } from '@/lib/listings';

const norm = (s: string) => s.replace(/[\s&\-/]+/g, '').toLowerCase();

// Initials from multi-word names (e.g. "Allen & Heath" → "ah", "Bang & Olufsen" → "bo").
// Returns empty string for single-word names.
function getInitials(s: string): string {
  const tokens = s.replace(/[&\-/]/g, ' ').split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return '';
  return tokens.map((t) => t[0]).join('').toLowerCase();
}

const BRAND_ALIASES_MAP: Record<string, string[]> = Object.fromEntries(
  BRAND_DIRECTORY.map((b) => [b.name, b.aliases])
);

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const normQuery = query.toLowerCase().replace(/[\s&\-/]+/g, '');
  if (!normQuery) return <>{text}</>;

  const HL = 'bg-line text-fg font-semibold';

  // 1) Direct (normalized) substring match in the displayed text
  let normText = '';
  const indexMap: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (/[\s&\-/]/.test(ch)) continue;
    normText += ch.toLowerCase();
    indexMap.push(i);
  }

  const idx = normText.indexOf(normQuery);
  if (idx !== -1) {
    const origStart = indexMap[idx];
    const origEnd = indexMap[idx + normQuery.length - 1] + 1;
    return (
      <>
        {text.slice(0, origStart)}
        <span className={HL}>{text.slice(origStart, origEnd)}</span>
        {text.slice(origEnd)}
      </>
    );
  }

  // 2) Initials match (e.g., "bo" matches Bang & Olufsen → highlight B and O)
  const tokenStarts: number[] = [];
  let inWord = false;
  for (let i = 0; i < text.length; i++) {
    const isSep = /[\s&\-/]/.test(text[i]);
    if (!isSep && !inWord) {
      tokenStarts.push(i);
      inWord = true;
    } else if (isSep) {
      inWord = false;
    }
  }
  if (tokenStarts.length >= 2) {
    const initials = tokenStarts.map((s) => text[s]).join('').toLowerCase();
    if (initials.startsWith(normQuery)) {
      const highlightedStarts = new Set(tokenStarts.slice(0, normQuery.length));
      const parts: React.ReactNode[] = [];
      let buf = '';
      const flush = (key: string) => {
        if (buf) {
          parts.push(<span key={`t-${key}`}>{buf}</span>);
          buf = '';
        }
      };
      for (let i = 0; i < text.length; i++) {
        if (highlightedStarts.has(i)) {
          flush(`b${i}`);
          parts.push(
            <span key={`h-${i}`} className={HL}>
              {text[i]}
            </span>
          );
        } else {
          buf += text[i];
        }
      }
      flush('end');
      return <>{parts}</>;
    }
  }

  return <>{text}</>;
}

function Combobox({
  value,
  onChange,
  options,
  allLabel,
  label,
  matchMode = 'includes',
  getAliases,
  disabled,
  disabledHint,
  searchable = true,
  showAllOption = true
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  allLabel: string;
  label: string;
  matchMode?: 'includes' | 'prefix';
  getAliases?: (option: string) => string[];
  disabled?: boolean;
  disabledHint?: string;
  searchable?: boolean;
  showAllOption?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = (() => {
    if (!query) return options;
    const q = norm(query);
    return options.filter((o) => {
      const haystacks = [o, ...(getAliases?.(o) ?? [])];
      return haystacks.some((h) => {
        const nh = norm(h);
        const ini = getInitials(h);
        if (matchMode === 'prefix') {
          return nh.startsWith(q) || (!!ini && ini.startsWith(q));
        }
        return nh.includes(q) || (!!ini && ini.includes(q));
      });
    });
  })();
  const items = query ? filtered : showAllOption ? [allLabel, ...filtered] : filtered;

  // Reset active index when filter results change
  useEffect(() => {
    setActiveIdx(items.length > 0 ? 0 : -1);
  }, [query, open, items.length]);

  // Scroll the active item into view
  useEffect(() => {
    if (!open || activeIdx < 0 || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx, open]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (items.length === 0) return;
      setActiveIdx((i) => (i + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (items.length === 0) return;
      setActiveIdx((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      if (open && activeIdx >= 0 && activeIdx < items.length) {
        e.preventDefault();
        onChange(items[activeIdx]);
        setQuery('');
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div
      className={`rounded-lg border px-3 py-1.5 mb-1.5 relative ${
        disabled ? 'border-line bg-surface' : 'border-line'
      }`}
    >
      <p className={`text-xs ${disabled ? 'text-gray-400' : 'text-gray-600'}`}>{label}</p>
      <ChevronDown
        className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 transition-transform pointer-events-none ${
          disabled ? 'text-line' : 'text-gray-500'
        } ${open ? 'rotate-180' : ''}`}
      />
      <input
        type="text"
        value={searchable && open ? query : value}
        readOnly={!searchable}
        onChange={(e) => {
          if (disabled || !searchable) return;
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (disabled) return;
          if (searchable) setQuery('');
          setOpen(true);
        }}
        onClick={() => {
          if (disabled) return;
          if (!searchable) setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? disabledHint ?? allLabel : allLabel}
        disabled={disabled}
        className={`w-full bg-transparent focus:outline-none pr-6 ${
          disabled ? 'text-gray-400 cursor-not-allowed' : !searchable ? 'cursor-pointer' : ''
        }`}
      />
      {open && !disabled && (
        <div
          ref={listRef}
          className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-bg border border-line rounded-lg shadow-lg z-30"
        >
          {items.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">검색 결과 없음</div>
          ) : (
            items.map((item, idx) => {
              const isActive = idx === activeIdx;
              return (
                <button
                  key={`${item}-${idx}`}
                  data-idx={idx}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(item);
                    setQuery('');
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm ${
                    isActive ? 'bg-surface' : ''
                  } ${value === item ? 'text-fg font-semibold' : 'text-fg'}`}
                >
                  <Highlight text={item} query={query} />
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

const NO_IMAGE = '/images/no-image.png';
// Catalog items don't yet carry their own images, so we fall back to the placeholder.
const sellImgFor = (_model: string) => NO_IMAGE;

// 매물 이미지 로딩 실패 시 NO_IMAGE로 fallback (onerror 무효화로 무한 루프 방지)
const onListingImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  const img = e.currentTarget;
  img.onerror = null;
  img.src = NO_IMAGE;
};

const CATEGORY_TABS = TOP_CATEGORIES; // 보이는 대분류만 (CATEGORY_TREE 숨김 표식)

const TRENDING = [
  '빈티지 맥킨토시 파워 앰프',
  '1000만원 이하 인티앰프',
  '마란츠 빈티지',
  '야마하 하이파이',
  '럭스만 인티앰프',
  '액큐페이즈 프리앰프',
  '네임 오디오',
  '중고 턴테이블'
];

type SellData = {
  title?: string;
  brand?: string;
  model?: string;
  year?: string;
  category?: string;
};

type HomePageProps = {
  onViewItem: (id: string) => void;
  // conds = 홈 조건 검색에서 고른 상태, 외관, 작동, 브랜드, 모델 (둘러보기 필터로 넘김, 값은 키)
  onBrowse: (category: string | null, conds?: { condition?: string; appearance?: string; working?: string; brand?: string; model?: string; locCountry?: string; region?: string }) => void;
  onSell: (data?: SellData) => void;
  onSearch: (query: string) => void;
};

export function HomePage({ onViewItem, onBrowse, onSell, onSearch }: HomePageProps) {
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
  // 관심 있게 본 매물: (로그인 기능 전이라) 임시로 최신 DB 매물 표시
  const savedListings = useMemo(() => dbListings.slice(0, 4), [dbListings]);
  const [query, setQuery] = useState('');
  const [heroTab, setHeroTab] = useState<'shop' | 'sell'>('shop');
  const [condition, setCondition] = useState('----');   // 상태 (글자)
  const [appearance, setAppearance] = useState('----'); // 외관 상태 (글자)
  const [working, setWorking] = useState('----');       // 작동 상태 (글자)
  const [category, setCategory] = useState('----');
  const [brand, setBrand] = useState('----');
  const [model, setModel] = useState('----');
  const [locCountry, setLocCountry] = useState('----'); // 위치 국가 (글자)
  const [region, setRegion] = useState('----');         // 지역 (글자)

  const isReal = (v: string, allLabel: string) => v && v !== '----' && v !== allLabel;

  // 메인 검색창: 검색어로 매물 검색 (browse 결과 페이지로 이동, ?q에 검색어 반영)
  const handleHeroSearch = () => {
    const q = query.trim();
    if (q) onSearch(q);
  };

  const isCategorySelected = isReal(category, '전체 카테고리');
  const isBrandSelected = isReal(brand, '전체 브랜드');
  const isModelSelected = isReal(model, '전체 모델');
  const isConditionSelected = isReal(condition, '전체');
  const isAppearanceSelected = isReal(appearance, '전체');
  const isWorkingSelected = isReal(working, '전체');
  const conditionKey = isConditionSelected ? keyFor('condition', condition) ?? '' : '';    // 중고 → used
  const appearanceKey = isAppearanceSelected ? keyFor('appearance', appearance) ?? '' : ''; // 매우 좋음 → excellent
  const workingKey = isWorkingSelected ? keyFor('working', working) ?? '' : '';             // 정상 작동 → working
  const isLocCountrySelected = isReal(locCountry, '전체 국가');
  const isRegionSelected = isReal(region, '전체 지역');
  const locCountryKey = isLocCountrySelected ? keyFor('locationCountry', locCountry) ?? '' : ''; // 한국 → kr
  const regionKey = isRegionSelected ? keyFor('location', region) ?? '' : '';                       // 서울 → kr_seoul

  // ── 조건 검색의 목록(브랜드, 카테고리, 모델)과 "검색 결과 N건"은 지금 판매중인 매물(dbListings)에서만 뽑음. 사전(CATALOG)은 안 읽음.
  //    dbListings 는 fetchListings 결과라 숨긴 카테고리 매물이 이미 빠져 있음(둘러보기와 같은 기준). 추가 요청 없음
  const inTop = (l: Listing, top: string) => {
    const subs = subcategoriesFor(top);
    return l.categories.some((c) => subs.includes(c));
  };
  // 상태, 외관, 작동 — 둘러보기 필터와 같은 규칙 (매물 값은 키, 칸은 글자 → keyFor. 외관이나 작동을 비운 매물은 그 칸을 고르면 안 걸림)
  const matchesCondition = (l: Listing) =>
    (!isConditionSelected || l.condition === conditionKey) &&
    (!isAppearanceSelected || l.appearance === appearanceKey) &&
    (!isWorkingSelected || l.working === workingKey);
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
  // 국가 = 매물이 있는 나라, 지역 = 고른 나라에서 매물이 있는 지역 (둘러보기 국가 → 지역과 같은 구조)
  const locCountryOptions = LOCATION_COUNTRY_OPTS.filter((o) => dbListings.some((l) => l.locationCountry === o.value)).map((o) => o.label);
  const regionOptions = isLocCountrySelected
    ? locationOptsFor(locCountryKey).filter((o) => dbListings.some((l) => l.location === o.value)).map((o) => o.label)
    : [];
  // 검색 결과 N건 = 고른 조건(상태, 브랜드, 카테고리, 모델, 국가, 지역)에 맞는 실제 매물 수. 아무것도 안 골랐으면 전체 매물 수
  const filteredCount = dbListings.filter(
    (l) =>
      matchesCondition(l) &&
      (!isBrandSelected || l.brand === brand) &&
      (!isCategorySelected || inTop(l, category)) &&
      (!isModelSelected || l.model === model) &&
      (!isLocCountrySelected || l.locationCountry === locCountryKey) &&
      (!isRegionSelected || l.location === regionKey)
  ).length;
  const [sellQuery, setSellQuery] = useState('');

  // === Admin mode — only activated via Ctrl+Shift+A (never on by default) ===
  const HERO_KEY = 'grace.heroImg';
  const [adminMode, setAdminMode] = useState<boolean>(false);
  const [panelOpen, setPanelOpen] = useState(true);
  useEffect(() => {
    // Clean up legacy persisted admin flag (we no longer persist it)
    localStorage.removeItem('grace.adminMode');
  }, []);

  // Mask-style image: stays at natural resolution, container is a viewport.
  const [heroImg, setHeroImg] = useState<{
    tx: number;
    ty: number;
    scale: number;
    brightness: number;
  }>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(HERO_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return { tx: 0, ty: 0, scale: 1.0, brightness: 110 };
  });
  useEffect(() => {
    localStorage.setItem(HERO_KEY, JSON.stringify(heroImg));
  }, [heroImg]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setAdminMode((m) => !m);
        setPanelOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const dragRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  const handleHeroMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!adminMode) return;
    dragRef.current = {
      x: e.clientX,
      y: e.clientY,
      tx: heroImg.tx,
      ty: heroImg.ty
    };
    e.preventDefault();
  };
  useEffect(() => {
    if (!adminMode) return;
    const move = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.x;
      const dy = e.clientY - dragRef.current.y;
      setHeroImg((prev) => ({
        ...prev,
        tx: dragRef.current!.tx + dx,
        ty: dragRef.current!.ty + dy
      }));
    };
    const up = () => {
      dragRef.current = null;
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [adminMode]);

  const sellResults = searchCatalog(sellQuery, 20);
  const sellBrandMatches = sellResults.length === 0 ? searchBrands(sellQuery, 6) : [];

  return (
    <div>
      <section className="relative">
        <div className="absolute inset-0 overflow-hidden bg-[#070a14]">
          <img
            id="hero-img"
            src="/images/bw-speakers-hero-new.jpg"
            alt="히어로"
            onMouseDown={handleHeroMouseDown}
            draggable={false}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: `translate(calc(-50% + ${heroImg.tx}px), calc(-50% + ${heroImg.ty}px)) scale(${heroImg.scale})`,
              transformOrigin: 'center center',
              filter: `brightness(${heroImg.brightness}%)`,
              cursor: adminMode ? 'grab' : 'default',
              maxWidth: 'none',
              maxHeight: 'none'
            }}
            className="select-none"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent pointer-events-none" />
        </div>

        {adminMode && panelOpen && (
          <div className="absolute top-4 left-4 z-40 bg-bg/95 backdrop-blur rounded-xl shadow-xl p-4 text-sm space-y-3 w-72 border-2 border-muted">
            <div className="flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 text-[10px] bg-fg text-bg rounded">ADMIN</span>
                이미지 편집
              </h3>
              <button
                onClick={() => setPanelOpen(false)}
                className="text-xs text-gray-500 hover:text-fg"
              >
                접기
              </button>
            </div>
            <p className="text-xs text-gray-600">원본 크기 이미지 위에 컨테이너 마스크로 잘라내요. 드래그로 이동, 슬라이더로 확대/축소.</p>

            <label className="block">
              <span className="text-xs text-muted">확대 (scale) — 1.0 = 원본 크기</span>
              <input
                type="range"
                min="0.1"
                max="2"
                step="0.02"
                value={heroImg.scale}
                onChange={(e) =>
                  setHeroImg((p) => ({ ...p, scale: parseFloat(e.target.value) }))
                }
                className="w-full accent-fg"
              />
              <span className="text-xs text-gray-500">{heroImg.scale.toFixed(2)}x</span>
            </label>

            <label className="block">
              <span className="text-xs text-muted">밝기 (brightness)</span>
              <input
                type="range"
                min="50"
                max="200"
                step="5"
                value={heroImg.brightness}
                onChange={(e) =>
                  setHeroImg((p) => ({ ...p, brightness: parseInt(e.target.value) }))
                }
                className="w-full accent-fg"
              />
              <span className="text-xs text-gray-500">{heroImg.brightness}%</span>
            </label>

            <label className="block">
              <span className="text-xs text-muted">좌우 이동 (px)</span>
              <input
                type="range"
                min="-2000"
                max="2000"
                step="10"
                value={heroImg.tx}
                onChange={(e) =>
                  setHeroImg((p) => ({ ...p, tx: parseInt(e.target.value) }))
                }
                className="w-full accent-fg"
              />
              <span className="text-xs text-gray-500">{heroImg.tx}px</span>
            </label>

            <label className="block">
              <span className="text-xs text-muted">위아래 이동 (px)</span>
              <input
                type="range"
                min="-1500"
                max="1500"
                step="10"
                value={heroImg.ty}
                onChange={(e) =>
                  setHeroImg((p) => ({ ...p, ty: parseInt(e.target.value) }))
                }
                className="w-full accent-fg"
              />
              <span className="text-xs text-gray-500">{heroImg.ty}px</span>
            </label>

            <button
              onClick={() => setHeroImg((p) => ({ ...p, tx: 0, ty: 0, scale: 1 }))}
              className="w-full text-xs py-1.5 border border-line rounded hover:bg-surface"
            >
              위치·확대 리셋
            </button>

            <div className="bg-surface rounded p-2 font-mono text-[10px] leading-relaxed">
              <div>scale: <b>{heroImg.scale.toFixed(2)}</b></div>
              <div>brightness: <b>{heroImg.brightness}%</b></div>
              <div>tx: <b>{heroImg.tx}px</b></div>
              <div>ty: <b>{heroImg.ty}px</b></div>
            </div>

            <button
              onClick={() => {
                navigator.clipboard?.writeText(JSON.stringify(heroImg, null, 2));
              }}
              className="w-full bg-fg hover:bg-fg text-bg py-2 rounded font-semibold"
            >
              📋 값 클립보드 복사
            </button>

            <button
              onClick={() => setAdminMode(false)}
              className="w-full text-xs py-1.5 border border-line rounded hover:bg-surface text-gray-600"
            >
              관리자 모드 종료
            </button>

            <p className="text-[10px] text-gray-400 text-center pt-1 border-t">
              단축키: Ctrl + Shift + A로 토글
            </p>
          </div>
        )}

        {adminMode && !panelOpen && (
          <button
            onClick={() => setPanelOpen(true)}
            className="absolute top-4 left-4 z-40 bg-fg hover:bg-fg text-bg text-xs font-semibold px-3 py-2 rounded-lg shadow-lg"
          >
            🛠 관리자 패널
          </button>
        )}

        <div className="relative max-w-7xl mx-auto px-4 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4">
            <div className="bg-bg rounded-xl p-4 lg:p-5 pt-7 lg:pt-8 shadow-xl text-fg min-h-[600px] lg:min-h-[640px] flex flex-col">
              <h1 className="text-[26px] font-bold mb-6 leading-tight">
                당신만의 사운드를 찾아보세요
              </h1>
              <div className="flex gap-6 border-b border-line mb-7">
                <button
                  onClick={() => setHeroTab('shop')}
                  className={`pb-2 font-semibold transition ${
                    heroTab === 'shop'
                      ? 'text-fg border-b-2 border-fg'
                      : 'text-gray-500 hover:text-muted'
                  }`}
                >
                  매물 둘러보기
                </button>
                <button
                  onClick={() => setHeroTab('sell')}
                  className={`pb-2 font-semibold transition ${
                    heroTab === 'sell'
                      ? 'text-fg border-b-2 border-fg'
                      : 'text-gray-500 hover:text-muted'
                  }`}
                >
                  내 매물 등록하기
                </button>
              </div>

              {heroTab === 'shop' ? (
                <>
                  <div className="relative mb-5">
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleHeroSearch()}
                      placeholder="무엇이든 검색하세요"
                      className="w-full border border-line rounded-full pl-5 pr-10 py-2.5 focus:outline-none focus:border-fg"
                    />
                    <button
                      onClick={handleHeroSearch}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full hover:bg-surface flex items-center justify-center"
                    >
                      <Search className="w-4 h-4 text-muted" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex-1 h-px bg-line" />
                    <span className="text-xs text-gray-600">– 또는 조건으로 검색 –</span>
                    <div className="flex-1 h-px bg-line" />
                  </div>

                  <Combobox
                    label={FL.condition}
                    value={condition}
                    onChange={setCondition}
                    options={['전체', ...CONDITIONS.map((k) => label('condition', k))]}
                    allLabel="전체"
                    searchable={false}
                    showAllOption={false}
                  />
                  {/* 외관 상태, 작동 상태 — 둘러보기 사이드바와 같은 세 묶음 (2026-11-10 상태 등급 재구성) */}
                  <Combobox
                    label={FL.appearance}
                    value={appearance}
                    onChange={setAppearance}
                    options={['전체', ...APPEARANCE_OPTS.map((k) => label('appearance', k))]}
                    allLabel="전체"
                    searchable={false}
                    showAllOption={false}
                  />
                  <Combobox
                    label={FL.working}
                    value={working}
                    onChange={setWorking}
                    options={['전체', ...WORKING_OPTS.map((k) => label('working', k))]}
                    allLabel="전체"
                    searchable={false}
                    showAllOption={false}
                  />

                  <Combobox
                    label={FL.brand}
                    value={brand}
                    onChange={(v) => {
                      setBrand(v);
                      setCategory('----');
                      setModel('----');
                    }}
                    options={brandOptions}
                    allLabel="전체 브랜드"
                    matchMode="prefix"
                    getAliases={(name) => BRAND_ALIASES_MAP[name] ?? []}
                  />

                  <Combobox
                    label={FL.category}
                    value={category}
                    onChange={(v) => {
                      setCategory(v);
                      setModel('----');
                    }}
                    options={categoryOptions}
                    allLabel="전체 카테고리"
                    disabled={isBrandSelected && categoryOptions.length === 0}
                    disabledHint="이 브랜드의 카테고리 정보가 아직 없습니다"
                  />

                  <Combobox
                    label={FL.model}
                    value={model}
                    onChange={setModel}
                    options={brandModels}
                    allLabel="전체 모델"
                    disabled={!isBrandSelected || brandModels.length === 0}
                    disabledHint={
                      !isBrandSelected
                        ? '먼저 브랜드를 선택하세요'
                        : '이 브랜드의 모델 정보가 아직 없습니다'
                    }
                  />

                  <Combobox
                    label={FL.locationCountry}
                    value={locCountry}
                    onChange={(v) => {
                      setLocCountry(v);
                      setRegion('----');
                    }}
                    options={locCountryOptions}
                    allLabel="전체 국가"
                    searchable={false}
                  />

                  <Combobox
                    label={FL.region}
                    value={region}
                    onChange={setRegion}
                    options={regionOptions}
                    allLabel="전체 지역"
                    disabled={!isLocCountrySelected || regionOptions.length === 0}
                    disabledHint={!isLocCountrySelected ? '먼저 국가를 선택하세요' : '이 국가에 등록된 매물이 없습니다'}
                  />

                  <button
                    onClick={() =>
                      onBrowse(isCategorySelected ? category : null, {
                        // 주소엔 언어 중립 키로 (중고 → used, 매우 좋음 → excellent, 정상 작동 → working)
                        condition: conditionKey || undefined,
                        appearance: appearanceKey || undefined,
                        working: workingKey || undefined,
                        brand: isBrandSelected ? brand : undefined,
                        model: isModelSelected ? model : undefined,
                        locCountry: locCountryKey || undefined,
                        region: regionKey || undefined,
                      })
                    }
                    className="w-full bg-fg text-bg font-semibold py-2.5 rounded-lg hover:bg-fg transition mt-4"
                  >
                    검색 결과 {filteredCount.toLocaleString('ko-KR')}건 보기
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-3">
                    판매할 매물을 검색하면 카탈로그가 자동으로 매칭돼 빠르게 등록할 수 있어요.
                  </p>
                  <div className="relative mb-3">
                    <input
                      value={sellQuery}
                      onChange={(e) => setSellQuery(e.target.value)}
                      placeholder="브랜드, 모델 또는 키워드 (예: McIntosh MC152)"
                      className="w-full border border-line rounded-full pl-5 pr-12 py-3 focus:outline-none focus:border-fg"
                    />
                    <Search className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {POPULAR_BRANDS.map((b) => (
                      <button
                        key={b}
                        onClick={() => setSellQuery(b)}
                        className="text-xs px-2.5 py-1 rounded-full border border-line hover:border-gray-500 hover:text-fg hover:bg-surface transition"
                      >
                        {b}
                      </button>
                    ))}
                  </div>

                  {sellQuery && (
                    <div className="border border-line rounded-lg mb-4 max-h-[228px] overflow-y-auto">
                      {sellResults.length > 0 ? (
                        sellResults.map((r, idx) => (
                          <button
                            key={idx}
                            onClick={() =>
                              onSell({
                                title: `${r.brand} ${r.model}`,
                                brand: r.brand,
                                model: r.model,
                                year: r.year,
                                category: r.category
                              })
                            }
                            className="w-full flex items-center gap-3 p-3 border-b border-surface last:border-b-0 hover:bg-surface transition text-left group"
                          >
                            <div className="w-12 h-12 rounded-md bg-surface overflow-hidden flex-shrink-0">
                              <img src={sellImgFor(r.model)} alt={r.model} className="w-full h-full object-contain" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm">
                                {r.brand} {r.model}
                              </p>
                              <p className="text-xs text-gray-600">
                                {r.year} · {r.category}
                              </p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-fg transition" />
                          </button>
                        ))
                      ) : (
                        <div className="p-4">
                          <p className="text-sm text-gray-600 mb-2 text-center">
                            카탈로그에 일치하는 모델이 없어요.
                          </p>
                          {sellBrandMatches.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-semibold text-gray-500 mb-1.5">관련 브랜드</p>
                              <div className="flex flex-wrap gap-1.5">
                                {sellBrandMatches.map((b) => (
                                  <button
                                    key={b.name}
                                    onClick={() => onSell({ title: b.name, brand: b.name })}
                                    className="text-xs px-2.5 py-1 rounded-full border border-line hover:border-gray-500 hover:text-fg hover:bg-surface font-semibold transition"
                                  >
                                    {b.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="text-center">
                            <button
                              onClick={() => onSell({ title: sellQuery })}
                              className="text-sm text-fg hover:text-fg font-semibold underline"
                            >
                              "{sellQuery}" 으로 직접 등록하기
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => onSell(sellQuery ? { title: sellQuery } : undefined)}
                    className="w-full bg-fg text-bg font-semibold py-2.5 rounded-lg hover:bg-fg transition"
                  >
                    {sellQuery ? '이 키워드로 등록 시작하기' : '등록 시작하기'}
                  </button>

                  <div className="text-center mt-3">
                    <button
                      onClick={() => onSell()}
                      className="text-sm text-gray-500 hover:text-muted underline underline-offset-4"
                    >
                      검색 없이 직접 등록하기
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">관심 있게 본 매물</h2>
          <button className="text-fg font-semibold hover:underline flex items-center gap-1">
            관심 매물 모두 보기 <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            {savedListings.length === 0 ? (
              <div className="bg-surface border border-line rounded-lg py-12 text-center text-gray-500">
                아직 매물이 없습니다.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {savedListings.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => onViewItem(l.id)}
                    className="text-left border border-line rounded-lg overflow-hidden hover:shadow-lg transition group"
                  >
                    <div className="aspect-square bg-surface relative">
                      <img
                        src={l.images?.[0] ?? NO_IMAGE}
                        alt={`${l.brand} ${l.model}`}
                        className="w-full h-full object-contain"
                        onError={onListingImgError}
                      />
                      <span className="absolute top-2 right-2 w-8 h-8 bg-bg/90 rounded-full flex items-center justify-center">
                        <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="font-semibold mb-1 line-clamp-1 group-hover:text-fg transition">
                        {l.brand} {l.model}
                      </p>
                      <p className="font-bold text-fg">{fmtPrice(l.price, l.currency)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="lg:col-span-4">
            <div className="bg-gradient-to-br from-surface to-amber-50 border border-line rounded-xl p-5 h-full flex flex-col">
              <p className="text-sm font-semibold text-fg mb-1">내 계정</p>
              <h3 className="text-xl font-bold mb-2">가격 알림 받기</h3>
              <p className="text-muted mb-4 flex-1">
                관심 매물의 가격이 변동되면 바로 알려드릴게요.
              </p>
              <button className="bg-fg text-bg font-semibold py-2 px-4 rounded-lg hover:bg-fg transition">
                관심 매물 관리
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold text-center mb-6">인기 카테고리</h2>
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {CATEGORY_TABS.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCat(cat)}
              className={`px-4 py-2 rounded-full font-semibold border-2 transition ${
                activeCat === cat
                  ? 'bg-slate-900 text-bg border-slate-900'
                  : 'bg-bg text-muted border-line hover:border-gray-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="mb-4 flex items-end justify-between">
          <div>
            <h3 className="text-xl font-bold">{activeCat} 추천 매물</h3>
            <p className="text-gray-600">인기 판매자가 엄선한 매물</p>
          </div>
          <button className="text-fg font-semibold hover:underline hidden sm:flex items-center gap-1">
            {activeCat} 모두 보기 <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {featuredListings.length === 0 ? (
          <div className="bg-surface border border-line rounded-lg py-16 text-center text-gray-500">
            {activeCat} 카테고리에 등록된 매물이 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {featuredListings.map((l) => (
              <button
                key={l.id}
                onClick={() => onViewItem(l.id)}
                className="text-left border border-line rounded-lg overflow-hidden hover:shadow-lg transition group"
              >
                <div className="aspect-square bg-surface">
                  <img
                    src={l.images?.[0] ?? NO_IMAGE}
                    alt={`${l.brand} ${l.model}`}
                    className="w-full h-full object-contain"
                    onError={onListingImgError}
                  />
                </div>
                <div className="p-3">
                  {/* 상태 배지 (외관 등급, 작동 경고 — 둘러보기 카드와 같은 conditionBadge) */}
                  <div className="mb-1">
                    <ConditionBadge listing={l} className="inline-block px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-semibold" />
                  </div>
                  <p className="font-semibold mb-1 line-clamp-1 group-hover:text-fg transition">
                    {l.brand} {l.model}
                  </p>
                  <p className="font-bold text-fg mb-1">{fmtPrice(l.price, l.currency)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-bg border border-line rounded-xl p-6 flex gap-4 items-center">
            <div className="flex-1">
              <p className="text-sm font-semibold text-fg mb-1">내 컬렉션</p>
              <h3 className="text-xl font-bold mb-2">내 장비를 한 곳에서</h3>
              <p className="text-gray-600 mb-4">
                보유 · 판매 · 관심 매물을 한 번에 관리할 수 있어요.
              </p>
              <button className="border-2 border-line text-fg font-semibold px-5 py-2 rounded-lg hover:border-gray-400 transition">
                컬렉션 만들기
              </button>
            </div>
            <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-lg overflow-hidden bg-surface shrink-0">
              <img
                src="/images/d4ba8a07c2a69.jpg"
                alt="컬렉션"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-700 text-bg rounded-xl p-6 flex gap-4 items-center">
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-500 mb-1">매물 판매</p>
              <h3 className="text-xl font-bold mb-2">원하는 방식으로 판매하세요</h3>
              <p className="text-line mb-4">
                즉시 견적을 받거나 직접 등록할 수 있어요. 가격도, 조건도 직접 정합니다.
              </p>
              <button
                onClick={() => onSell()}
                className="bg-fg text-bg font-semibold px-5 py-2 rounded-lg hover:bg-fg transition"
              >
                매물 등록하기
              </button>
            </div>
            <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-lg overflow-hidden bg-bg/10 shrink-0">
              <img
                src="/images/fd5b7a6adbead.jpg"
                alt="판매"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-surface border-y border-line py-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-line flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5 text-fg" />
              </div>
              <div>
                <p className="font-bold mb-1">무료 배송</p>
                <p className="text-sm text-gray-600">엄선된 매물에 무료 배송을 제공해요.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-line flex items-center justify-center shrink-0">
                <Tag className="w-5 h-5 text-fg" />
              </div>
              <div>
                <p className="font-bold mb-1">최저가 보장</p>
                <p className="text-sm text-gray-600">더 낮은 가격을 찾으셨다면 동일 가격에 맞춰드려요.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-line flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-fg" />
              </div>
              <div>
                <p className="font-bold mb-1">구매자 보호</p>
                <p className="text-sm text-gray-600">모든 거래를 안심 보장으로 지켜드려요.</p>
              </div>
            </div>
          </div>

          <h2 className="text-xl font-bold mb-4">지금 인기 검색어</h2>
          <div className="flex flex-wrap gap-2">
            {TRENDING.map((t) => (
              <button
                key={t}
                className="px-4 py-2 bg-bg border border-line rounded-full text-sm font-semibold text-muted hover:border-fg hover:text-fg transition"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
