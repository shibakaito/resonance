'use client';
// ============================================================================
// ui/autocomplete.tsx — 검색해서 고르는 칸 하나 (2026-11-10 디자인 3a)
// ----------------------------------------------------------------------------
// 예전 두 벌을 합침: 등록 폼의 Typeahead + 홈 조건 검색의 Combobox. Field 안에 넣어 씀(Field 가 id 를 넣음)
// 동작 차이는 prop 으로:
//   allowCustom = true  → 사전 목록에서 고르거나, 목록에 없는 글도 그대로 저장("직접 입력: …") — 등록 폼(브랜드, 모델 등)
//   allowCustom = false → 목록(지금 있는 매물)에서만 고름 — 홈 조건 검색
//   allOption           → 목록 맨 위 '전체' 항목 (홈)
//   searchable = false  → 타이핑 없이 목록만 (홈 상태 칸)
//   keyboardLayout      → 결과가 0건이면 한영 자판 오타로 다시 찾기 (예: 'akfksc' → '마란츠')
//   hideUntilTyping     → 검색어가 있어야 목록을 보임 (브랜드처럼 목록이 큰 칸)
//   matchInitials       → 여러 단어 머리글자로도 찾기 (예: 'bo' → Bang & Olufsen) — 홈. 등록 폼은 끔(예전 Typeahead 그대로)
// 찾기: 공백, -, &, / 를 무시하고 포함(또는 앞부분) + 별칭(getAliases) + 머리글자(matchInitials). filter 를 주면 그걸 씀
// 화면 읽기: input role="combobox" + 목록 role="listbox" / 항목 role="option" (aria-activedescendant 로 ↑↓ 위치 알림)
// 높이 40px, border-line, 각진 모서리, 그림자, 애니메이션 없음. 맞은 글자는 굵게
// ============================================================================
import * as React from 'react';
import { ChevronDown, X } from 'lucide-react';
import { en2ko, ko2en } from '@/lib/keyboard-layout';
import { fieldClass } from './input';

const norm = (s: string) => s.replace(/[\s&\-/]+/g, '').toLowerCase();
// 여러 단어 이름의 머리글자 (예: "Allen & Heath" → "ah"). 한 단어면 ''
const initials = (s: string) => {
  const t = s.replace(/[&\-/]/g, ' ').split(/\s+/).filter(Boolean);
  return t.length < 2 ? '' : t.map((w) => w[0]).join('').toLowerCase();
};

// 맞은 부분 굵게 — 공백 등을 무시한 부분 일치, 없으면 머리글자 일치
function Highlight({ text, query }: { text: string; query: string }) {
  const q = norm(query);
  if (!q) return <>{text}</>;
  let normText = '';
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (/[\s&\-/]/.test(text[i])) continue;
    normText += text[i].toLowerCase();
    map.push(i);
  }
  const at = normText.indexOf(q);
  if (at !== -1) {
    const s = map[at];
    const e = map[at + q.length - 1] + 1;
    return (
      <>
        {text.slice(0, s)}
        <span className="font-bold">{text.slice(s, e)}</span>
        {text.slice(e)}
      </>
    );
  }
  if (normText.length >= 2 && q.includes(normText)) return <span className="font-bold">{text}</span>; // 검색어가 항목 전체를 포함
  const starts: number[] = [];
  let inWord = false;
  for (let i = 0; i < text.length; i++) {
    const sep = /[\s&\-/]/.test(text[i]);
    if (!sep && !inWord) {
      starts.push(i);
      inWord = true;
    } else if (sep) inWord = false;
  }
  if (starts.length >= 2 && starts.map((s) => text[s]).join('').toLowerCase().startsWith(q)) {
    const hit = new Set(starts.slice(0, q.length));
    return <>{[...text].map((ch, i) => (hit.has(i) ? <span key={i} className="font-bold">{ch}</span> : <React.Fragment key={i}>{ch}</React.Fragment>))}</>;
  }
  return <>{text}</>;
}

export type AutocompleteProps = {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  allowCustom?: boolean;
  allOption?: string;
  filter?: (q: string, opts: string[]) => string[];
  getAliases?: (option: string) => string[];
  matchMode?: 'includes' | 'prefix';
  matchInitials?: boolean;
  keyboardLayout?: boolean;
  hideUntilTyping?: boolean;
  searchable?: boolean;
  placeholder?: string;
  disabled?: boolean;
  disabledHint?: string;
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-required'?: boolean;
  'aria-invalid'?: boolean;
};

export function Autocomplete({
  id,
  value,
  onChange,
  options,
  allowCustom = false,
  allOption,
  filter,
  getAliases,
  matchMode = 'includes',
  matchInitials = false,
  keyboardLayout = false,
  hideUntilTyping = false,
  searchable = true,
  placeholder = '',
  disabled = false,
  disabledHint,
  className = '',
  ...aria
}: AutocompleteProps) {
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(-1);
  const listRef = React.useRef<HTMLDivElement>(null);
  const auto = React.useId();
  const listId = `${id ?? 'ac' + auto.replace(/[^a-zA-Z0-9]/g, '')}-list`;
  const q = norm(query);

  const compute = (raw: string): string[] => {
    const nq = norm(raw);
    if (!nq) return options;
    if (filter) return filter(raw.trim().toLowerCase(), options);
    return options.filter((o) =>
      [o, ...(getAliases?.(o) ?? [])].some((h) => {
        const nh = norm(h);
        const ini = matchInitials ? initials(h) : '';
        return matchMode === 'prefix' ? nh.startsWith(nq) || (!!ini && ini.startsWith(nq)) : nh.includes(nq) || (!!ini && ini.includes(nq));
      }),
    );
  };
  let matched = !q ? options : compute(query);
  // 결과 0건이면 한영 자판 오타로 다시 (한글 음절 2개 이상 또는 영문 2자 이상일 때만)
  if (keyboardLayout && q && matched.length === 0) {
    const ko = en2ko(query);
    if (ko !== query && (ko.match(/[가-힣]/g)?.length ?? 0) >= 2) matched = compute(ko);
    if (matched.length === 0) {
      const en = ko2en(query);
      if (en !== query && (en.match(/[a-zA-Z]/g)?.length ?? 0) >= 2) matched = compute(en);
    }
  }
  const showCustom = allowCustom && !!q && matched.length === 0; // 목록에 없으면 '직접 입력' 줄
  const items: { kind: 'all' | 'match' | 'custom'; text: string }[] = [
    ...(allOption && !q ? [{ kind: 'all' as const, text: allOption }] : []),
    ...matched.map((m) => ({ kind: 'match' as const, text: m })),
    ...(showCustom ? [{ kind: 'custom' as const, text: query }] : []),
  ];
  const listVisible = open && !disabled && (!hideUntilTyping || !!q);

  React.useEffect(() => {
    if (active < 0 || !listRef.current) return;
    (listRef.current.querySelector(`[data-idx="${active}"]`) as HTMLElement | null)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const commit = (text: string) => {
    onChange(text);
    setQuery('');
    setOpen(false);
    setActive(-1);
  };
  const openList = () => {
    if (disabled) return;
    setQuery(allowCustom ? value : ''); // 자유 입력 칸은 지금 값에서 고쳐 쓰기, 고르는 칸은 빈 검색으로
    setOpen(true);
    setActive(-1);
  };

  return (
    <div className={`relative ${className}`}>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={listVisible}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={listVisible && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        value={searchable && open ? query : value}
        readOnly={!searchable}
        disabled={disabled}
        placeholder={disabled ? disabledHint ?? placeholder : placeholder}
        onFocus={openList}
        onClick={() => !searchable && !open && openList()}
        onChange={(e) => {
          if (!searchable) return;
          setQuery(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onBlur={() =>
          setTimeout(() => {
            // 자유 입력 칸: 목록에 없는 글을 치고 나가면 그대로 저장
            if (allowCustom && query.trim() && matched.length === 0) onChange(query);
            setOpen(false);
            setActive(-1);
          }, 150)
        }
        onKeyDown={(e) => {
          if ((e.nativeEvent as { isComposing?: boolean }).isComposing) return; // 한글 조합 중 Enter 무시(글자 중복 방지)
          if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
            e.preventDefault();
            openList();
            return;
          }
          const n = Math.max(items.length, 1);
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => (i + 1) % n);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => (i - 1 + n) % n);
          } else if (e.key === 'Enter') {
            e.preventDefault();
            const pick = items[active >= 0 ? active : 0];
            if (pick) commit(pick.text);
            else if (allowCustom && query.trim()) commit(query);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setOpen(false);
            setActive(-1);
          }
        }}
        className={fieldClass(
          { w: 'w-full', h: 'h-10', px: 'pl-3 pr-16', text: 'text-16', color: 'text-fg', bg: 'bg-bg' },
          'min-w-0 border border-line rounded-none placeholder:text-muted disabled:bg-surface disabled:text-muted disabled:cursor-not-allowed',
          !searchable && !disabled ? 'cursor-pointer' : '',
        )}
        {...aria}
      />
      {value && !disabled && (
        <button
          type="button"
          aria-label="지우기"
          tabIndex={-1}
          onMouseDown={(e) => {
            e.preventDefault(); // 입력칸의 blur 보다 먼저
            commit('');
          }}
          className="absolute right-8 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-muted hover:text-fg"
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      )}
      <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      {listVisible && (
        <div ref={listRef} id={listId} role="listbox" className="absolute left-0 right-0 z-30 mt-1 max-h-60 overflow-y-auto border border-line bg-bg">
          {items.length === 0 && <div className="px-3 py-2 text-14 text-muted">검색 결과 없음</div>}
          {items.map((it, i) => (
            <div
              key={`${it.kind}-${i}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={value === it.text}
              data-idx={i}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                commit(it.text);
              }}
              className={`cursor-pointer px-3 py-2 text-14 text-fg ${i === active ? 'bg-surface' : ''} ${
                it.kind === 'custom' ? 'border-t border-line underline' : value === it.text ? 'font-bold' : ''
              }`}
            >
              {it.kind === 'custom' ? (
                <>
                  직접 입력: <span className="font-bold">{it.text}</span>
                </>
              ) : (
                <Highlight text={it.text} query={query} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
