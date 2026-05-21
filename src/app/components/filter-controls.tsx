'use client';
// ============================================================================
// filter-controls.tsx — 좌측 사이드바용 "필터 입력 부품" 모음 (재사용 컴포넌트)
// ----------------------------------------------------------------------------
// browse-page.tsx에서 분리. 각 부품은 데이터에 의존하지 않는 순수 UI 컴포넌트라
// 어떤 카테고리에서도 재사용됩니다.
//   - FilterSection : 체크박스 아코디언 섹션 (+더보기 단계 펼침 지원)
//   - RangeSection  : 최소/최대 숫자 범위 입력 (가격·출력·임피던스 등)
//   - FilterDropdown: 드롭다운형 다중 선택 (케이블 단자 등에서 사용)
//   - PriceDropdown / LengthDropdown: (현재 미사용) 예전 드롭다운형 범위 입력
// ============================================================================

import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, X, Search, Plus, Minus } from 'lucide-react';

// 좌측 사이드바용 아코디언 섹션 필터 (Perfect Circuit 스타일)
export function FilterSection({
  label,
  options,
  selected,
  onToggle,
  counts,
  maxVisible,
  step,
  searchable = false,
  defaultOpen = true
}: {
  label: string;
  options: readonly string[];
  selected: Set<string>;
  onToggle: (v: string) => void;
  counts?: Record<string, number>;
  maxVisible?: number;
  step?: number; // 지정 시 "+더보기"가 step개씩 펼침 (미지정 시 한 번에 전체)
  searchable?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(maxVisible ?? Infinity);

  const filtered = useMemo(() => {
    if (!searchable || query.trim() === '') return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, searchable, query]);

  // 옵션/검색어 변경 시 표시 개수 초기화
  useEffect(() => {
    setVisibleCount(maxVisible ?? Infinity);
  }, [maxVisible, query, options]);

  const limited = maxVisible != null;
  const visible = limited ? filtered.slice(0, visibleCount) : filtered;
  const hasMore = limited && filtered.length > visibleCount;
  const expanded = limited && visibleCount > (maxVisible ?? 0);

  const showMore = () =>
    setVisibleCount((c) => (step ? Math.min(c + step, filtered.length) : filtered.length));
  const collapse = () => setVisibleCount(maxVisible ?? Infinity);

  return (
    <div className="border-b border-[#e0e0e0] py-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full text-left"
      >
        <span className="text-sm font-semibold text-[#000000]">{label}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-600" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-600" />
        )}
      </button>
      {open && (
        <div className="mt-2.5 space-y-1">
          {searchable && (
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="검색"
                className="w-full pl-8 pr-2 py-1.5 text-sm border border-[#e0e0e0] rounded focus:outline-none focus:border-[#000000]"
              />
            </div>
          )}
          <div className={visible.length > 12 ? 'max-h-72 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full' : ''}>
            {visible.map((opt) => (
              <label
                key={opt}
                className="flex items-center gap-2 py-1 cursor-pointer text-sm text-gray-700 hover:text-[#000000]"
              >
                <input
                  type="checkbox"
                  checked={selected.has(opt)}
                  onChange={() => onToggle(opt)}
                  className="accent-[#000000] w-3.5 h-3.5"
                />
                <span className="flex-1 truncate">{opt}</span>
                {counts && (
                  <span className="text-xs text-gray-400">({counts[opt] ?? 0})</span>
                )}
              </label>
            ))}
          </div>
          {(hasMore || expanded) && (
            <div className="mt-1 flex items-center gap-3">
              {hasMore && (
                <button
                  onClick={showMore}
                  className="text-xs font-medium text-gray-600 hover:text-[#000000] underline"
                >
                  + 더보기
                </button>
              )}
              {expanded && (
                <button
                  onClick={collapse}
                  className="text-xs font-medium text-gray-600 hover:text-[#000000] underline"
                >
                  접기
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 사이드바용 범위 입력 섹션 (가격/길이)
export function RangeSection({
  label,
  unit,
  min,
  max,
  step,
  onApply,
  defaultOpen = true,
  noComma = false
}: {
  label: string;
  unit?: string;
  min: number | null;
  max: number | null;
  step?: number;
  onApply: (min: number | null, max: number | null) => void;
  defaultOpen?: boolean;
  noComma?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [minInput, setMinInput] = useState(min != null ? String(min) : '');
  const [maxInput, setMaxInput] = useState(max != null ? String(max) : '');

  useEffect(() => {
    setMinInput(min != null ? String(min) : '');
    setMaxInput(max != null ? String(max) : '');
  }, [min, max]);

  const isInt = step == null;
  const fmt = (s: string) => {
    if (!isInt || noComma) return s;
    return s === '' ? '' : Number(s).toLocaleString('ko-KR');
  };

  const apply = () => {
    const parse = (s: string): number | null => {
      const t = s.trim();
      if (t === '') return null;
      const n = Number(t);
      return Number.isFinite(n) ? n : null;
    };
    onApply(parse(minInput), parse(maxInput));
  };

  return (
    <div className="border-b border-[#e0e0e0] py-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full text-left"
      >
        <span className="text-sm font-semibold text-[#000000]">
          {label}{unit ? ` (${unit})` : ''}
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-600" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-600" />
        )}
      </button>
      {open && (
        <div className="mt-2.5">
          <div className="flex items-stretch gap-1.5">
            <input
              type={isInt ? 'text' : 'number'}
              inputMode={isInt ? 'numeric' : 'decimal'}
              min={0}
              step={step}
              value={fmt(minInput)}
              onChange={(e) =>
                setMinInput(isInt ? e.target.value.replace(/[^\d]/g, '') : e.target.value)
              }
              onKeyDown={(e) => e.key === 'Enter' && apply()}
              placeholder="최소"
              className="w-0 flex-1 px-2 py-1.5 text-sm border border-[#e0e0e0] rounded focus:outline-none focus:border-[#000000]"
            />
            <input
              type={isInt ? 'text' : 'number'}
              inputMode={isInt ? 'numeric' : 'decimal'}
              min={0}
              step={step}
              value={fmt(maxInput)}
              onChange={(e) =>
                setMaxInput(isInt ? e.target.value.replace(/[^\d]/g, '') : e.target.value)
              }
              onKeyDown={(e) => e.key === 'Enter' && apply()}
              placeholder="최대"
              className="w-0 flex-1 px-2 py-1.5 text-sm border border-[#e0e0e0] rounded focus:outline-none focus:border-[#000000]"
            />
          </div>
          <button
            onClick={apply}
            className="mt-2 w-full py-1.5 text-xs font-medium bg-[#000000] text-white rounded hover:bg-gray-800"
          >
            적용
          </button>
        </div>
      )}
    </div>
  );
}

// 드롭다운 필터 (다중 선택, maxVisible 지정 시 "더보기"로 나머지 표시)
export function FilterDropdown({
  label,
  options,
  selected,
  onToggle,
  onClear,
  counts,
  maxVisible,
  scrollable = false,
  variant = 'pill'
}: {
  label: string;
  options: readonly string[];
  selected: Set<string>;
  onToggle: (v: string) => void;
  onClear?: () => void;
  counts?: Record<string, number>;
  maxVisible?: number;
  scrollable?: boolean;
  variant?: 'pill' | 'box';
}) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // 드롭다운 닫히면 더보기 펼침 상태 초기화 → 다음 열 때 다시 5개부터
  useEffect(() => {
    if (!open) setShowAll(false);
  }, [open]);

  const hasMore = maxVisible != null && options.length > maxVisible;
  const visible = hasMore && !showAll ? options.slice(0, maxVisible) : options;

  const isBox = variant === 'box';
  const triggerCls = isBox
    ? `flex items-center justify-between gap-2 w-full px-3 py-2 rounded-lg border text-sm bg-white transition ${
        selected.size > 0 || open
          ? 'border-[#000000] text-[#000000]'
          : 'border-[#e0e0e0] text-gray-700 hover:border-gray-400'
      }`
    : `flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition ${
        selected.size > 0
          ? 'border-[#000000] bg-[#f7f7f7] text-[#000000]'
          : 'border-[#e0e0e0] bg-white text-gray-700 hover:border-gray-400'
      }`;

  return (
    <div className={isBox ? 'relative flex-1 min-w-0' : 'relative'} ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={triggerCls}
      >
        <span>{label}</span>
        {selected.size > 0 && (
          <span className="bg-[#000000] text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
            {selected.size}
          </span>
        )}
        {selected.size > 0 && onClear && (
          <span
            role="button"
            aria-label="선택 해제"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="w-4 h-4 flex items-center justify-center rounded-full text-[#000000] hover:bg-[#e0e0e0]"
          >
            <X className="w-3 h-3" />
          </span>
        )}
        <ChevronDown className={`w-4 h-4 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (() => {
        // 더보기 펼친 상태에서 8개 초과면 스크롤. scrollable=true도 기존대로 스크롤.
        const expandedScroll = showAll && hasMore && options.length > 8;
        const useScroll = scrollable || expandedScroll;
        const scrollCls = useScroll
          ? 'max-h-64 overflow-y-scroll [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-[#f7f7f7] [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-400 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-500'
          : '';
        const collapseBtn = hasMore && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="flex items-center gap-1 px-2 py-1.5 mt-0.5 text-sm font-medium text-gray-700 hover:text-[#000000]"
          >
            {showAll ? (
              <>
                <Minus className="w-4 h-4" />
                접기
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                더보기 ({options.length - maxVisible!})
              </>
            )}
          </button>
        );
        return (
          <div
            className={`absolute z-20 mt-2 bg-white border border-[#e0e0e0] rounded-lg shadow-lg p-2 ${
              isBox ? 'w-full min-w-56' : 'w-56'
            }`}
          >
            <div className={scrollCls}>
              {visible.map((opt) => (
                <label
                  key={opt}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#f7f7f7] cursor-pointer text-sm text-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(opt)}
                    onChange={() => onToggle(opt)}
                    className="accent-[#000000]"
                  />
                  <span>{opt}</span>
                  {counts && <span className="text-gray-400">({counts[opt] ?? 0})</span>}
                </label>
              ))}
              {/* 펼친 상태에서는 '접기' 버튼이 스크롤 영역 안 맨 끝에 위치 */}
              {showAll && collapseBtn}
            </div>
            {/* 접힌 상태에서는 '더보기' 버튼이 스크롤 영역 밖에 보임 */}
            {!showAll && collapseBtn}
          </div>
        );
      })()}
    </div>
  );
}

// 가격 필터 드롭다운 (Min / Max 직접 입력)
export function PriceDropdown({
  min,
  max,
  onApply,
  fullWidth = false
}: {
  min: number | null;
  max: number | null;
  onApply: (min: number | null, max: number | null) => void;
  fullWidth?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [minInput, setMinInput] = useState(min != null ? String(min) : '');
  const [maxInput, setMaxInput] = useState(max != null ? String(max) : '');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    setMinInput(min != null ? String(min) : '');
    setMaxInput(max != null ? String(max) : '');
  }, [min, max]);

  const active = min != null || max != null;

  const apply = () => {
    const m = minInput.trim() === '' ? null : Number(minInput);
    const x = maxInput.trim() === '' ? null : Number(maxInput);
    onApply(Number.isFinite(m as number) ? m : null, Number.isFinite(x as number) ? x : null);
    setOpen(false);
  };

  return (
    <div className={fullWidth ? 'relative w-full' : 'relative'} ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={
          fullWidth
            ? `flex items-center justify-between gap-2 w-full px-3 py-2 rounded-lg border text-sm bg-white transition ${
                active || open
                  ? 'border-[#000000] text-[#000000]'
                  : 'border-[#e0e0e0] text-gray-700 hover:border-gray-400'
              }`
            : `flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition ${
                active
                  ? 'border-[#000000] bg-[#f7f7f7] text-[#000000]'
                  : 'border-[#e0e0e0] bg-white text-gray-700 hover:border-gray-400'
              }`
        }
      >
        <span>가격</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className={`absolute z-20 mt-2 bg-white border border-[#e0e0e0] rounded-xl shadow-lg p-4 ${fullWidth ? 'w-full min-w-72' : 'w-80'}`}>
          <h3 className="font-semibold text-[#000000] mb-3">가격</h3>
          <div className="flex items-stretch border border-[#e0e0e0] rounded-lg overflow-hidden focus-within:border-[#000000]">
            <input
              type="text"
              inputMode="numeric"
              value={minInput === '' ? '' : Number(minInput).toLocaleString('ko-KR')}
              onChange={(e) => setMinInput(e.target.value.replace(/[^\d]/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && apply()}
              placeholder="최소"
              className="flex-1 w-0 px-3 py-2.5 text-sm focus:outline-none"
            />
            <span className="w-px bg-[#e0e0e0]" />
            <input
              type="text"
              inputMode="numeric"
              value={maxInput === '' ? '' : Number(maxInput).toLocaleString('ko-KR')}
              onChange={(e) => setMaxInput(e.target.value.replace(/[^\d]/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && apply()}
              placeholder="최대"
              className="flex-1 w-0 px-3 py-2.5 text-sm focus:outline-none"
            />
            <button
              onClick={apply}
              aria-label="가격 적용"
              className="px-3 border-l border-[#e0e0e0] hover:bg-[#f7f7f7] flex items-center justify-center"
            >
              <Search className="w-4 h-4 text-gray-700" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// 케이블 길이 (m) 범위 드롭다운 — 0.5 단위
export function LengthDropdown({
  min,
  max,
  onApply,
  fullWidth = false
}: {
  min: number | null;
  max: number | null;
  onApply: (min: number | null, max: number | null) => void;
  fullWidth?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [minInput, setMinInput] = useState(min != null ? String(min) : '');
  const [maxInput, setMaxInput] = useState(max != null ? String(max) : '');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    setMinInput(min != null ? String(min) : '');
    setMaxInput(max != null ? String(max) : '');
  }, [min, max]);

  const active = min != null || max != null;

  const apply = () => {
    const parse = (s: string): number | null => {
      const t = s.trim();
      if (t === '') return null;
      const n = Number(t);
      return Number.isFinite(n) ? n : null;
    };
    onApply(parse(minInput), parse(maxInput));
    setOpen(false);
  };

  return (
    <div className={fullWidth ? 'relative w-full' : 'relative'} ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={
          fullWidth
            ? `flex items-center justify-between gap-2 w-full px-3 py-2 rounded-lg border text-sm bg-white transition ${
                active || open
                  ? 'border-[#000000] text-[#000000]'
                  : 'border-[#e0e0e0] text-gray-700 hover:border-gray-400'
              }`
            : `flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition ${
                active
                  ? 'border-[#000000] bg-[#f7f7f7] text-[#000000]'
                  : 'border-[#e0e0e0] bg-white text-gray-700 hover:border-gray-400'
              }`
        }
      >
        <span>길이</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className={`absolute z-20 mt-2 bg-white border border-[#e0e0e0] rounded-xl shadow-lg p-4 ${fullWidth ? 'w-full min-w-72' : 'w-80'}`}>
          <h3 className="font-semibold text-[#000000] mb-3">길이 (m)</h3>
          <div className="flex items-stretch border border-[#e0e0e0] rounded-lg overflow-hidden focus-within:border-[#000000]">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={0.5}
              value={minInput}
              onChange={(e) => setMinInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && apply()}
              placeholder="최소"
              className="flex-1 w-0 px-3 py-2.5 text-sm focus:outline-none"
            />
            <span className="w-px bg-[#e0e0e0]" />
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={0.5}
              value={maxInput}
              onChange={(e) => setMaxInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && apply()}
              placeholder="최대"
              className="flex-1 w-0 px-3 py-2.5 text-sm focus:outline-none"
            />
            <button
              onClick={apply}
              aria-label="길이 적용"
              className="px-3 border-l border-[#e0e0e0] hover:bg-[#f7f7f7] flex items-center justify-center"
            >
              <Search className="w-4 h-4 text-gray-700" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

