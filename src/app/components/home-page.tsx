'use client';
// 상태(useState)·효과(useEffect)·DOM 이벤트를 쓰므로 클라이언트 컴포넌트.
import { useState, useEffect, useRef } from 'react';
import { Search, Star, TrendingUp, Heart, Tag, Truck, ChevronRight, ArrowRight, ChevronDown } from 'lucide-react';
import {
  POPULAR_BRANDS,
  searchCatalog,
  searchBrands,
  ALL_BRAND_NAMES,
  BRAND_DIRECTORY,
  CATALOG,
  TOP_CATEGORIES,
  CATEGORY_TREE,
  subcategoriesFor
} from '../data/catalog';

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

function getModelsForBrand(brand: string): string[] {
  return Array.from(new Set(CATALOG.filter((c) => c.brand === brand).map((c) => c.model)));
}

// Map catalog category strings to top-level CATEGORY_TREE entries (loose match).
function getCategoriesForBrand(brand: string): string[] {
  const catalogCats = new Set(CATALOG.filter((c) => c.brand === brand).map((c) => c.category));
  const tops = new Set<string>();
  for (const cat of catalogCats) {
    const nCat = norm(cat);
    for (const entry of CATEGORY_TREE) {
      const nTop = norm(entry.top);
      if (
        nCat.includes(nTop) ||
        nTop.includes(nCat) ||
        entry.subs.some((s) => {
          const ns = norm(s);
          return ns === nCat || ns.includes(nCat) || nCat.includes(ns);
        })
      ) {
        tops.add(entry.top);
        break;
      }
    }
  }
  return TOP_CATEGORIES.filter((t) => tops.has(t));
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const normQuery = query.toLowerCase().replace(/[\s&\-/]+/g, '');
  if (!normQuery) return <>{text}</>;

  const HL = 'bg-[#e0e0e0] text-[#000000] font-semibold';

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
        disabled ? 'border-[#e0e0e0] bg-[#f7f7f7]' : 'border-[#e0e0e0]'
      }`}
    >
      <p className={`text-xs ${disabled ? 'text-gray-400' : 'text-gray-600'}`}>{label}</p>
      <ChevronDown
        className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 transition-transform pointer-events-none ${
          disabled ? 'text-[#e0e0e0]' : 'text-gray-500'
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
          className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-[#e0e0e0] rounded-lg shadow-lg z-30"
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
                    isActive ? 'bg-[#f7f7f7]' : ''
                  } ${value === item ? 'text-[#000000] font-semibold' : 'text-[#000000]'}`}
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

const CATEGORY_TABS = ['앰프', '스피커', '소스기기', '케이블'];

const FEATURED = [
  { title: 'McIntosh MC275', price: '32,500,000원', img: '/images/2c6f7c1fc6fb6.jpg', condition: '중고 - 매우 좋음' },
  { title: 'McIntosh MC312', price: '45,000,000원', img: '/images/4d097765a9285.jpg', condition: '새상품' },
  { title: 'McIntosh MA252', price: '38,200,000원', img: '/images/618155823824e.jpg', condition: '중고 - 민트' },
  { title: 'McIntosh MC462', price: '60,500,000원', img: '/images/d4ba8a07c2a69.jpg', condition: '새상품' },
  { title: 'McIntosh C2700', price: '42,800,000원', img: '/images/f4362b6cdce17.jpg', condition: '중고 - 좋음' }
];

const SAVED = [
  { title: 'McIntosh MA8950', price: '55,700,000원', img: '/images/fd5b7a6adbead.jpg' },
  { title: 'Marantz PM-15S2', price: '15,500,000원', img: '/images/f4362b6cdce17.jpg' },
  { title: 'Yamaha A-S2200', price: '12,800,000원', img: '/images/618155823824e.jpg' },
  { title: 'Luxman L-507uXII', price: '18,900,000원', img: '/images/4d097765a9285.jpg' }
];

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
  onViewItem: () => void;
  onBrowse: (category: string | null) => void;
  onSell: (data?: SellData) => void;
};

export function HomePage({ onViewItem, onBrowse, onSell }: HomePageProps) {
  const [activeCat, setActiveCat] = useState(CATEGORY_TABS[0]);
  const [query, setQuery] = useState('');
  const [heroTab, setHeroTab] = useState<'shop' | 'sell'>('shop');
  const [condition, setCondition] = useState('----');
  const [category, setCategory] = useState('----');
  const [brand, setBrand] = useState('----');
  const [model, setModel] = useState('----');

  const isReal = (v: string, allLabel: string) => v && v !== '----' && v !== allLabel;

  // 메인 검색창: 카테고리 키워드가 있으면 해당 카테고리로, 없으면 전체 탐색으로 이동
  const handleHeroSearch = () => {
    const q = query.trim();
    const matched = TOP_CATEGORIES.find((cat) => q.includes(cat));
    onBrowse(matched ?? null);
  };

  const isCategorySelected = isReal(category, '전체 카테고리');
  const isBrandSelected = isReal(brand, '전체 브랜드');

  const categoryOptions = isBrandSelected ? getCategoriesForBrand(brand) : TOP_CATEGORIES;

  const brandModels = isBrandSelected
    ? (() => {
        let items = CATALOG.filter((c) => c.brand === brand);
        if (isCategorySelected) {
          const nTop = norm(category);
          const subs = subcategoriesFor(category);
          items = items.filter((c) => {
            const nCat = norm(c.category);
            return (
              nCat.includes(nTop) ||
              nTop.includes(nCat) ||
              subs.some((s) => {
                const ns = norm(s);
                return ns === nCat || ns.includes(nCat) || nCat.includes(ns);
              })
            );
          });
        }
        return Array.from(new Set(items.map((c) => c.model)));
      })()
    : [];

  const filteredCount = CATALOG.filter((item) => {
    if (isBrandSelected && item.brand !== brand) return false;
    if (isCategorySelected) {
      const nCat = norm(item.category);
      const nTop = norm(category);
      const subs = subcategoriesFor(category);
      const matches =
        nCat.includes(nTop) ||
        nTop.includes(nCat) ||
        subs.some((s) => {
          const ns = norm(s);
          return ns === nCat || ns.includes(nCat) || nCat.includes(ns);
        });
      if (!matches) return false;
    }
    if (isReal(model, '전체 모델') && item.model !== model) return false;
    return true;
  }).length;
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
          <div className="absolute top-4 left-4 z-40 bg-white/95 backdrop-blur rounded-xl shadow-xl p-4 text-sm space-y-3 w-72 border-2 border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 text-[10px] bg-[#000000] text-white rounded">ADMIN</span>
                이미지 편집
              </h3>
              <button
                onClick={() => setPanelOpen(false)}
                className="text-xs text-gray-500 hover:text-[#000000]"
              >
                접기
              </button>
            </div>
            <p className="text-xs text-gray-600">원본 크기 이미지 위에 컨테이너 마스크로 잘라내요. 드래그로 이동, 슬라이더로 확대/축소.</p>

            <label className="block">
              <span className="text-xs text-gray-700">확대 (scale) — 1.0 = 원본 크기</span>
              <input
                type="range"
                min="0.1"
                max="2"
                step="0.02"
                value={heroImg.scale}
                onChange={(e) =>
                  setHeroImg((p) => ({ ...p, scale: parseFloat(e.target.value) }))
                }
                className="w-full accent-[#000000]"
              />
              <span className="text-xs text-gray-500">{heroImg.scale.toFixed(2)}x</span>
            </label>

            <label className="block">
              <span className="text-xs text-gray-700">밝기 (brightness)</span>
              <input
                type="range"
                min="50"
                max="200"
                step="5"
                value={heroImg.brightness}
                onChange={(e) =>
                  setHeroImg((p) => ({ ...p, brightness: parseInt(e.target.value) }))
                }
                className="w-full accent-[#000000]"
              />
              <span className="text-xs text-gray-500">{heroImg.brightness}%</span>
            </label>

            <label className="block">
              <span className="text-xs text-gray-700">좌우 이동 (px)</span>
              <input
                type="range"
                min="-2000"
                max="2000"
                step="10"
                value={heroImg.tx}
                onChange={(e) =>
                  setHeroImg((p) => ({ ...p, tx: parseInt(e.target.value) }))
                }
                className="w-full accent-[#000000]"
              />
              <span className="text-xs text-gray-500">{heroImg.tx}px</span>
            </label>

            <label className="block">
              <span className="text-xs text-gray-700">위아래 이동 (px)</span>
              <input
                type="range"
                min="-1500"
                max="1500"
                step="10"
                value={heroImg.ty}
                onChange={(e) =>
                  setHeroImg((p) => ({ ...p, ty: parseInt(e.target.value) }))
                }
                className="w-full accent-[#000000]"
              />
              <span className="text-xs text-gray-500">{heroImg.ty}px</span>
            </label>

            <button
              onClick={() => setHeroImg((p) => ({ ...p, tx: 0, ty: 0, scale: 1 }))}
              className="w-full text-xs py-1.5 border border-[#e0e0e0] rounded hover:bg-[#f7f7f7]"
            >
              위치·확대 리셋
            </button>

            <div className="bg-[#f7f7f7] rounded p-2 font-mono text-[10px] leading-relaxed">
              <div>scale: <b>{heroImg.scale.toFixed(2)}</b></div>
              <div>brightness: <b>{heroImg.brightness}%</b></div>
              <div>tx: <b>{heroImg.tx}px</b></div>
              <div>ty: <b>{heroImg.ty}px</b></div>
            </div>

            <button
              onClick={() => {
                navigator.clipboard?.writeText(JSON.stringify(heroImg, null, 2));
              }}
              className="w-full bg-[#000000] hover:bg-[#000000] text-white py-2 rounded font-semibold"
            >
              📋 값 클립보드 복사
            </button>

            <button
              onClick={() => setAdminMode(false)}
              className="w-full text-xs py-1.5 border border-[#e0e0e0] rounded hover:bg-[#f7f7f7] text-gray-600"
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
            className="absolute top-4 left-4 z-40 bg-[#000000] hover:bg-[#000000] text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-lg"
          >
            🛠 관리자 패널
          </button>
        )}

        <div className="relative max-w-7xl mx-auto px-4 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4">
            <div className="bg-white rounded-xl p-4 lg:p-5 pt-7 lg:pt-8 shadow-xl text-[#000000] min-h-[600px] lg:min-h-[640px] flex flex-col">
              <h1 className="text-[26px] font-bold mb-6 leading-tight">
                당신만의 사운드를 찾아보세요
              </h1>
              <div className="flex gap-6 border-b border-[#e0e0e0] mb-7">
                <button
                  onClick={() => setHeroTab('shop')}
                  className={`pb-2 font-semibold transition ${
                    heroTab === 'shop'
                      ? 'text-[#000000] border-b-2 border-[#000000]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  매물 둘러보기
                </button>
                <button
                  onClick={() => setHeroTab('sell')}
                  className={`pb-2 font-semibold transition ${
                    heroTab === 'sell'
                      ? 'text-[#000000] border-b-2 border-[#000000]'
                      : 'text-gray-500 hover:text-gray-700'
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
                      className="w-full border border-[#e0e0e0] rounded-full pl-5 pr-10 py-2.5 focus:outline-none focus:border-[#000000]"
                    />
                    <button
                      onClick={handleHeroSearch}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full hover:bg-[#f7f7f7] flex items-center justify-center"
                    >
                      <Search className="w-4 h-4 text-gray-700" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex-1 h-px bg-[#e0e0e0]" />
                    <span className="text-xs text-gray-600">– 또는 조건으로 검색 –</span>
                    <div className="flex-1 h-px bg-[#e0e0e0]" />
                  </div>

                  <Combobox
                    label="상태"
                    value={condition}
                    onChange={setCondition}
                    options={[
                      '전체',
                      '새상품',
                      '중고 - 전체',
                      '중고 - 민트',
                      '중고 - 매우 좋음',
                      '중고 - 좋음',
                      '중고 - 보통',
                      '중고 - 점검 필요',
                      '중고 - 작동 불가'
                    ]}
                    allLabel="전체"
                    searchable={false}
                    showAllOption={false}
                  />

                  <Combobox
                    label="브랜드"
                    value={brand}
                    onChange={(v) => {
                      setBrand(v);
                      setCategory('----');
                      setModel('----');
                    }}
                    options={ALL_BRAND_NAMES}
                    allLabel="전체 브랜드"
                    matchMode="prefix"
                    getAliases={(name) => BRAND_ALIASES_MAP[name] ?? []}
                  />

                  <Combobox
                    label="카테고리"
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
                    label="모델"
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

                  <button
                    onClick={() =>
                      onBrowse(isCategorySelected ? category : null)
                    }
                    className="w-full bg-[#000000] text-white font-semibold py-2.5 rounded-lg hover:bg-[#000000] transition mt-4"
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
                      className="w-full border border-[#e0e0e0] rounded-full pl-5 pr-12 py-3 focus:outline-none focus:border-[#000000]"
                    />
                    <Search className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {POPULAR_BRANDS.map((b) => (
                      <button
                        key={b}
                        onClick={() => setSellQuery(b)}
                        className="text-xs px-2.5 py-1 rounded-full border border-[#e0e0e0] hover:border-gray-500 hover:text-[#000000] hover:bg-[#f7f7f7] transition"
                      >
                        {b}
                      </button>
                    ))}
                  </div>

                  {sellQuery && (
                    <div className="border border-[#e0e0e0] rounded-lg mb-4 max-h-[228px] overflow-y-auto">
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
                            className="w-full flex items-center gap-3 p-3 border-b border-[#f7f7f7] last:border-b-0 hover:bg-[#f7f7f7] transition text-left group"
                          >
                            <div className="w-12 h-12 rounded-md bg-[#f7f7f7] overflow-hidden flex-shrink-0">
                              <img src={sellImgFor(r.model)} alt={r.model} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm">
                                {r.brand} {r.model}
                              </p>
                              <p className="text-xs text-gray-600">
                                {r.year} · {r.category}
                              </p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#000000] transition" />
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
                                    className="text-xs px-2.5 py-1 rounded-full border border-[#e0e0e0] hover:border-gray-500 hover:text-[#000000] hover:bg-[#f7f7f7] font-semibold transition"
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
                              className="text-sm text-[#000000] hover:text-[#000000] font-semibold underline"
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
                    className="w-full bg-[#000000] text-white font-semibold py-2.5 rounded-lg hover:bg-[#000000] transition"
                  >
                    {sellQuery ? '이 키워드로 등록 시작하기' : '등록 시작하기'}
                  </button>

                  <div className="text-center mt-3">
                    <button
                      onClick={() => onSell()}
                      className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-4"
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
          <button className="text-[#000000] font-semibold hover:underline flex items-center gap-1">
            관심 매물 모두 보기 <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            {SAVED.map((item, idx) => (
              <button
                key={idx}
                onClick={onViewItem}
                className="text-left border border-[#e0e0e0] rounded-lg overflow-hidden hover:shadow-lg transition group"
              >
                <div className="aspect-square bg-[#f7f7f7] relative">
                  <img src={item.img} alt={item.title} className="w-full h-full object-cover" />
                  <span className="absolute top-2 right-2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center">
                    <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                  </span>
                </div>
                <div className="p-3">
                  <p className="font-semibold mb-1 line-clamp-1 group-hover:text-[#000000] transition">
                    {item.title}
                  </p>
                  <p className="font-bold text-[#000000]">{item.price}</p>
                </div>
              </button>
            ))}
          </div>
          <div className="lg:col-span-4">
            <div className="bg-gradient-to-br from-[#f7f7f7] to-amber-50 border border-[#e0e0e0] rounded-xl p-5 h-full flex flex-col">
              <p className="text-sm font-semibold text-[#000000] mb-1">내 계정</p>
              <h3 className="text-xl font-bold mb-2">가격 알림 받기</h3>
              <p className="text-gray-700 mb-4 flex-1">
                관심 매물의 가격이 변동되면 바로 알려드릴게요.
              </p>
              <button className="bg-[#000000] text-white font-semibold py-2 px-4 rounded-lg hover:bg-[#000000] transition">
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
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-gray-700 border-[#e0e0e0] hover:border-gray-400'
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
          <button className="text-[#000000] font-semibold hover:underline hidden sm:flex items-center gap-1">
            {activeCat} 모두 보기 <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {FEATURED.map((item, idx) => (
            <button
              key={idx}
              onClick={onViewItem}
              className="text-left border border-[#e0e0e0] rounded-lg overflow-hidden hover:shadow-lg transition group"
            >
              <div className="aspect-square bg-[#f7f7f7]">
                <img src={item.img} alt={item.title} className="w-full h-full object-cover" />
              </div>
              <div className="p-3">
                <span className="inline-block px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-semibold mb-1">
                  {item.condition}
                </span>
                <p className="font-semibold mb-1 line-clamp-1 group-hover:text-[#000000] transition">
                  {item.title}
                </p>
                <p className="font-bold text-[#000000] mb-1">{item.price}</p>
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <Star className="w-3 h-3 fill-gray-700 text-gray-700" />
                  <span>4.8 (89)</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-[#e0e0e0] rounded-xl p-6 flex gap-4 items-center">
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#000000] mb-1">내 컬렉션</p>
              <h3 className="text-xl font-bold mb-2">내 장비를 한 곳에서</h3>
              <p className="text-gray-600 mb-4">
                보유 · 판매 · 관심 매물을 한 번에 관리할 수 있어요.
              </p>
              <button className="border-2 border-[#e0e0e0] text-[#000000] font-semibold px-5 py-2 rounded-lg hover:border-gray-400 transition">
                컬렉션 만들기
              </button>
            </div>
            <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-lg overflow-hidden bg-[#f7f7f7] shrink-0">
              <img
                src="/images/d4ba8a07c2a69.jpg"
                alt="컬렉션"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-700 text-white rounded-xl p-6 flex gap-4 items-center">
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-500 mb-1">매물 판매</p>
              <h3 className="text-xl font-bold mb-2">원하는 방식으로 판매하세요</h3>
              <p className="text-[#e0e0e0] mb-4">
                즉시 견적을 받거나 직접 등록할 수 있어요. 가격도, 조건도 직접 정합니다.
              </p>
              <button
                onClick={() => onSell()}
                className="bg-[#000000] text-white font-semibold px-5 py-2 rounded-lg hover:bg-[#000000] transition"
              >
                매물 등록하기
              </button>
            </div>
            <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-lg overflow-hidden bg-white/10 shrink-0">
              <img
                src="/images/fd5b7a6adbead.jpg"
                alt="판매"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f7f7f7] border-y border-[#e0e0e0] py-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#e0e0e0] flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5 text-[#000000]" />
              </div>
              <div>
                <p className="font-bold mb-1">무료 배송</p>
                <p className="text-sm text-gray-600">엄선된 매물에 무료 배송을 제공해요.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#e0e0e0] flex items-center justify-center shrink-0">
                <Tag className="w-5 h-5 text-[#000000]" />
              </div>
              <div>
                <p className="font-bold mb-1">최저가 보장</p>
                <p className="text-sm text-gray-600">더 낮은 가격을 찾으셨다면 동일 가격에 맞춰드려요.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#e0e0e0] flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-[#000000]" />
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
                className="px-4 py-2 bg-white border border-[#e0e0e0] rounded-full text-sm font-semibold text-gray-700 hover:border-[#000000] hover:text-[#000000] transition"
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
