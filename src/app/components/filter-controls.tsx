'use client';
// ============================================================================
// filter-controls.tsx — 둘러보기 필터 입력 부품 모음 (재사용 컴포넌트)
// ----------------------------------------------------------------------------
// browse-page.tsx에서 분리. 각 부품은 데이터에 의존하지 않는 순수 UI 컴포넌트라
// 어떤 카테고리에서도 재사용됩니다. 묶음을 늘어놓는 순서는 filter-panel.tsx 가 정함
//   - FilterSection : 체크 묶음 (접기 펼치기, 5개 넘으면 '더 보기', 브랜드는 검색 칸)
//   - RangeSection  : 최소, 최대 숫자 범위 + 적용 (가격, 출력, 연도 등)
//   - FilterDropdown: 드롭다운형 다중 선택 (케이블 단자에서 사용, 케이블은 숨긴 카테고리)
//   - PriceDropdown / LengthDropdown: (현재 미사용) 예전 드롭다운형 범위 입력
// 2026-11-10 시안: 묶음마다 아래 선 1, 위아래 16, 제목 버튼 40(폭 100%, 14/700, 오른쪽 끝 화살표 16).
//   펼치면 아래 8에 선택지 줄 32(체크 20 + 8 + 글자 14 + 오른쪽 끝 개수 14 muted). 체크박스는 등록 폼과 같은 ui/checkbox
//   범위: 최소, 최대 칸 2열(사이 8) 위 8, '적용' secondary 폭 100% 위 8. 브랜드: 검색 칸 40(돋보기 16) 위 8, 그 아래 목록
//   펼침 상태는 묶음의 화면 상태라 저장 안 함(그 페이지 안에서만)
// ============================================================================

import { useState, useMemo, useRef, useEffect, useId } from 'react';
import { ChevronDown, ChevronUp, X, Search, Plus, Minus } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';

// 검색어 정규화: 공백·&·-·/ 제거 + 소문자 (catalog.ts의 normalize와 동일 규칙)
// 예: "바워스 앤 윌킨스" / "B&W" → 비교 가능한 형태로
const normalizeSearch = (s: string) => s.replace(/[\s&\-/]+/g, '').toLowerCase();

// 한 번에 보이는 선택지 수 — 넘으면 '더 보기' (2026-11-10 시안)
const VISIBLE_OPTIONS = 5;

// 묶음 제목 버튼 — 폭 100%, 높이 40, 14/700, 오른쪽 끝 화살표 16. 목록 머리 모양이라 공통 Button 이 아니라 기본 button
function SectionHead({ label, open, onToggle, controls }: { label: string; open: boolean; onToggle: () => void; controls: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controls}
      className="flex h-10 w-full items-center justify-between gap-2 text-left text-14 font-bold text-fg"
    >
      <span className="min-w-0">{label}</span>
      {open ? <ChevronUp aria-hidden className="h-4 w-4 shrink-0" /> : <ChevronDown aria-hidden className="h-4 w-4 shrink-0" />}
    </button>
  );
}

// 체크 묶음 하나
export function FilterSection({
  label,
  options,
  selected,
  onToggle,
  counts,
  searchable = false,
  defaultOpen = false,
  getAliases,
  getLabel
}: {
  label: string;
  options: readonly string[];
  selected: Set<string>;
  onToggle: (v: string) => void;
  counts?: Record<string, number>;
  searchable?: boolean;  // 브랜드처럼 선택지 위에 검색 칸
  defaultOpen?: boolean;
  getAliases?: (opt: string) => readonly string[]; // 옵션의 검색용 별칭(예: 브랜드 한글명)
  getLabel?: (opt: string) => string; // 옵션 값(언어 중립 키) → 화면 글자. 없으면 값 그대로 (browse-filters filterLabel)
}) {
  const show = (o: string) => (getLabel ? getLabel(o) : o);
  const [open, setOpen] = useState(defaultOpen);
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const bodyId = useId();

  const filtered = useMemo(() => {
    if (!searchable || query.trim() === '') return options;
    const q = normalizeSearch(query);
    if (!q) return options;
    return options.filter((o) => {
      if (normalizeSearch(show(o)).includes(q)) return true; // 옵션 화면 글자 매칭
      // 별칭(예: '매킨토시') 매칭 — getAliases가 주어진 경우
      if (getAliases) return getAliases(o).some((a) => normalizeSearch(a).includes(q));
      return false;
    });
  }, [options, searchable, query, getAliases, getLabel]);

  // 검색어가 바뀌면 다시 5개부터
  useEffect(() => setShowAll(false), [query]);

  // 5개 넘으면 앞 5개 + 고른 값(뒤쪽에 있어도 보이게 — 홈 조건 검색에서 체크된 채로 넘어올 때) + '더 보기'
  const rest = filtered.slice(VISIBLE_OPTIONS);
  const visible = showAll || rest.length === 0 ? filtered : [...filtered.slice(0, VISIBLE_OPTIONS), ...rest.filter((o) => selected.has(o))];
  const canExpand = rest.some((o) => !selected.has(o));

  return (
    <div className="border-b border-line py-4">
      <SectionHead label={label} open={open} onToggle={() => setOpen((v) => !v)} controls={bodyId} />
      {open && (
        <div id={bodyId} className="mt-2">
          {searchable && (
            <div className="relative mb-2">
              <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                aria-label={`${label} 검색`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="검색"
                className="pl-9 pr-3"
              />
            </div>
          )}
          <ul>
            {visible.map((opt) => (
              <li key={opt}>
                <Checkbox
                  variant="list"
                  checked={selected.has(opt)}
                  onChange={() => onToggle(opt)}
                  trailing={counts && <span className="shrink-0 text-14 text-muted">{counts[opt] ?? 0}</span>}
                >
                  {show(opt)}
                </Checkbox>
              </li>
            ))}
          </ul>
          {/* '더 보기'(14/500 밑줄) — 펼친 뒤에는 같은 자리에서 '접기' */}
          {(canExpand || showAll) && rest.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              aria-expanded={showAll}
              className="flex h-8 items-center text-14 font-medium text-fg underline"
            >
              {showAll ? '접기' : '더 보기'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// 범위 묶음 (가격, 정격 출력, 출시 연도 등) — 최소, 최대 칸 + 적용. single 이면 칸 하나(헤드폰 임피던스)
export function RangeSection({
  label,
  unit,
  min,
  max,
  step,
  onApply,
  defaultOpen = false,
  noComma = false,
  single = false,
  singlePlaceholder = '값'
}: {
  label: string;
  unit?: string;
  min: number | null;
  max: number | null;
  step?: number;
  onApply: (min: number | null, max: number | null) => void;
  defaultOpen?: boolean;
  noComma?: boolean;
  single?: boolean;           // true면 입력 한 칸(값 하나) — onApply(값, null)
  singlePlaceholder?: string; // 한 칸일 때 입력 안내 문구
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [minInput, setMinInput] = useState(min != null ? String(min) : '');
  const [maxInput, setMaxInput] = useState(max != null ? String(max) : '');
  const bodyId = useId();
  const title = `${label}${unit ? ` (${unit})` : ''}`;

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

  // 숫자 칸 하나 (정수는 콤마 표시용 text, 소수는 number)
  const numberInput = (value: string, set: (v: string) => void, name: string, placeholder: string) => (
    <Input
      type={isInt ? 'text' : 'number'}
      inputMode={isInt ? 'numeric' : 'decimal'}
      min={0}
      step={step}
      aria-label={name}
      value={fmt(value)}
      onChange={(e) => set(isInt ? e.target.value.replace(/[^\d]/g, '') : e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && apply()}
      placeholder={placeholder}
    />
  );

  return (
    <div className="border-b border-line py-4">
      <SectionHead label={title} open={open} onToggle={() => setOpen((v) => !v)} controls={bodyId} />
      {open && (
        <div id={bodyId} className="mt-2">
          {single ? (
            numberInput(minInput, setMinInput, title, singlePlaceholder)
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {numberInput(minInput, setMinInput, `${title} 최소`, '최소')}
              {numberInput(maxInput, setMaxInput, `${title} 최대`, '최대')}
            </div>
          )}
          <Button variant="secondary" onClick={apply} className="mt-2 w-full">
            적용
          </Button>
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
    ? `flex items-center justify-between gap-2 w-full px-3 py-2 rounded-lg border text-14 bg-bg transition ${
        selected.size > 0 || open
          ? 'border-fg text-fg'
          : 'border-line text-fg hover:border-muted'
      }`
    : `flex items-center gap-2 px-4 py-2 rounded-full border text-14 font-medium transition ${
        selected.size > 0
          ? 'border-fg bg-surface text-fg'
          : 'border-line bg-bg text-fg hover:border-muted'
      }`;

  return (
    <div className={isBox ? 'relative flex-1 min-w-0' : 'relative'} ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={triggerCls}
      >
        <span>{label}</span>
        {selected.size > 0 && (
          <span className="bg-fg text-bg text-12 rounded-full px-2 py-1 leading-none">
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
            className="w-4 h-4 flex items-center justify-center rounded-full text-fg hover:bg-line"
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
          ? 'max-h-64 overflow-y-scroll [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-surface [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted'
          : '';
        const collapseBtn = hasMore && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="flex items-center gap-1 px-2 py-2 mt-1 text-14 font-medium text-fg hover:text-fg"
          >
            {showAll ? (
              <>
                <Minus className="w-4 h-4" />
                접기
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                모두 보기
              </>
            )}
          </button>
        );
        return (
          <div
            className={`absolute z-20 mt-2 bg-bg border border-line rounded-lg shadow-lg p-2 ${
              isBox ? 'w-full min-w-56' : 'w-56'
            }`}
          >
            <div className={scrollCls}>
              {visible.map((opt) => (
                <label
                  key={opt}
                  className="flex items-center gap-2 px-2 py-2 rounded hover:bg-surface cursor-pointer text-14 text-fg"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(opt)}
                    onChange={() => onToggle(opt)}
                    className="accent-fg"
                  />
                  <span>{opt}</span>
                  {counts && <span className="text-muted">({counts[opt] ?? 0})</span>}
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
            ? `flex items-center justify-between gap-2 w-full px-3 py-2 rounded-lg border text-14 bg-bg transition ${
                active || open
                  ? 'border-fg text-fg'
                  : 'border-line text-fg hover:border-muted'
              }`
            : `flex items-center gap-2 px-4 py-2 rounded-full border text-14 font-medium transition ${
                active
                  ? 'border-fg bg-surface text-fg'
                  : 'border-line bg-bg text-fg hover:border-muted'
              }`
        }
      >
        <span>가격</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className={`absolute z-20 mt-2 bg-bg border border-line rounded-xl shadow-lg p-4 ${fullWidth ? 'w-full min-w-72' : 'w-80'}`}>
          <h3 className="font-bold text-fg mb-3">가격</h3>
          <div className="flex items-stretch border border-line rounded-lg overflow-hidden focus-within:border-fg">
            <input
              type="text"
              inputMode="numeric"
              value={minInput === '' ? '' : Number(minInput).toLocaleString('ko-KR')}
              onChange={(e) => setMinInput(e.target.value.replace(/[^\d]/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && apply()}
              placeholder="최소"
              className="flex-1 w-0 px-3 py-3 text-14 focus:outline-none"
            />
            <span className="w-px bg-line" />
            <input
              type="text"
              inputMode="numeric"
              value={maxInput === '' ? '' : Number(maxInput).toLocaleString('ko-KR')}
              onChange={(e) => setMaxInput(e.target.value.replace(/[^\d]/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && apply()}
              placeholder="최대"
              className="flex-1 w-0 px-3 py-3 text-14 focus:outline-none"
            />
            <button
              onClick={apply}
              aria-label="가격 적용"
              className="px-3 border-l border-line hover:bg-surface flex items-center justify-center"
            >
              <Search className="w-4 h-4 text-fg" />
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
            ? `flex items-center justify-between gap-2 w-full px-3 py-2 rounded-lg border text-14 bg-bg transition ${
                active || open
                  ? 'border-fg text-fg'
                  : 'border-line text-fg hover:border-muted'
              }`
            : `flex items-center gap-2 px-4 py-2 rounded-full border text-14 font-medium transition ${
                active
                  ? 'border-fg bg-surface text-fg'
                  : 'border-line bg-bg text-fg hover:border-muted'
              }`
        }
      >
        <span>길이</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className={`absolute z-20 mt-2 bg-bg border border-line rounded-xl shadow-lg p-4 ${fullWidth ? 'w-full min-w-72' : 'w-80'}`}>
          <h3 className="font-bold text-fg mb-3">길이 (m)</h3>
          <div className="flex items-stretch border border-line rounded-lg overflow-hidden focus-within:border-fg">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={0.5}
              value={minInput}
              onChange={(e) => setMinInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && apply()}
              placeholder="최소"
              className="flex-1 w-0 px-3 py-3 text-14 focus:outline-none"
            />
            <span className="w-px bg-line" />
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={0.5}
              value={maxInput}
              onChange={(e) => setMaxInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && apply()}
              placeholder="최대"
              className="flex-1 w-0 px-3 py-3 text-14 focus:outline-none"
            />
            <button
              onClick={apply}
              aria-label="길이 적용"
              className="px-3 border-l border-line hover:bg-surface flex items-center justify-center"
            >
              <Search className="w-4 h-4 text-fg" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

