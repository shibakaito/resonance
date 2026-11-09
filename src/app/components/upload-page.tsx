'use client';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  X,
  Plus,
  Info,
  Truck,
  Tag,
  Check,
  ChevronDown,
  ChevronRight,
  Bold,
  Italic,
  List,
  Youtube,
  HelpCircle
} from 'lucide-react';
import { TOP_CATEGORIES, subcategoriesFor, CATEGORY_TREE, flattenSubs, isCategoryVisible, ALL_BRAND_NAMES, searchBrands, CATALOG } from '../data/catalog';
import { insertListing, fetchListings } from '@/lib/listings';
import { FEATURE_FLAGS } from '../data/feature-flags'; // 숨김 플래그 (docs/hidden.md)
import { ChoiceField, choiceAsButtons } from './choice-field'; // 선택 부품: 선택지 수로 버튼 / 드롭다운 자동 (하나 고르기 5개 이하, 여러 개 6개 이하면 버튼)
import { NEW_CONDITION_KEYS, CONDITION_KEYS, conditionKind, label, desc, SPEC_LABELS, COMPONENT_OPTS, LOCATION_COUNTRY_OPTS, locationOptsFor, locationCountryOf, CURRENCY_OPTS, CURRENCY_SYMBOLS } from '@/lib/labels';
import { en2ko, ko2en } from '@/lib/keyboard-layout';
import { uploadListingImage } from '@/lib/upload-image';
import { SPEC_FIELDS } from '../data/spec-fields';
import { SPEC_FIELDS_BY_CATEGORY, CORE_SPEC_KEYS, ALWAYS_SPEC_KEYS, detailModeOf, hiddenByDetailMode, cleanCustomSpecs, type CustomSpecRow, type CategorySpecField, optLabel, optLabels, optValue, AMP_OHM_OPTS, AMP_DEVICE_SOLID, MAINTENANCE_OPTS, OTHER_SPECS_INPUT, TERMINAL_ALIASES, DRIVER_TYPES, DRIVER_STRUCT, DRIVER_MATERIAL, COAXIAL_BANDS, TUBE_ROLE_OPTS, TUBE_TYPE_MAP } from '../data/category-specs';
import { buildPower, buildFreq, buildDims, buildValNotes, buildTubes, buildCrossover, buildAmpPower, buildNumSelect, driverSummary, driverDerived, AMP_POWER_TYPES, type DriverRow, type AmpPowerRow } from '@/lib/spec-builders';

const CATEGORIES = TOP_CATEGORIES;

/**
 * 카테고리 풀패스 목록 (예: '앰프 > 프리앰프')
 * - subs가 있으면 각 sub마다 풀패스 1줄
 * - subs가 없으면 top만 (leaf는 빈 문자열)
 * - 사용자가 입력으로 검색·선택할 때 사용
 * - 숨김 표식(CATEGORY_TREE hidden) 붙은 대분류·잎은 빠짐
 */
const CATEGORY_PATHS: { path: string; top: string; leaf: string }[] = CATEGORY_TREE.filter((c) => !c.hidden).flatMap(
  ({ top, subs }) =>
    subs.length === 0
      ? [{ path: top, top, leaf: '' }]
      : subs.flatMap((s) =>
          typeof s !== 'string' && 'group' in s
            ? flattenSubs(s.items).filter(isCategoryVisible).map((it) => ({ path: `${top} > ${s.group} > ${it}`, top, leaf: it })) // 그룹: 3단계 경로
            : flattenSubs([s]).filter(isCategoryVisible).map((it) => ({ path: `${top} > ${it}`, top, leaf: it }))
        )
);
const CATEGORY_PATH_STRINGS = CATEGORY_PATHS.map((p) => p.path);

const COUNTRIES = ['미국', '일본', '독일', '영국', '한국', '중국', '대만', '이탈리아', '프랑스', '캐나다'];

// 소유권 — 버튼 토글 (영문 키로 저장, labels.ts의 ownership과 동일)
const OWNERSHIP_OPTIONS = [
  { value: 'single_owner', label: '1인 소유' },
  { value: 'multiple_owners', label: '2인 이상 소유' },
];

// 상태: 종류 4개(새상품, 미개봉, NOS, 중고) — DB에 저장되는 영문 키(value) + 화면 표시(label), labels.ts LABELS.condition 그대로. 정의 한 줄은 LABEL_DESC(desc)
//   중고의 등급은 아래 외관 상태, 작동 상태 칸이 맡음 (2026-11-10 상태 등급 재구성)
const CONDITIONS = CONDITION_KEYS.map((value) => ({ value, label: label('condition', value) }));
// 외관 상태 4개, 작동 상태 3개 — labels.ts SPEC_LABELS 표 그대로 (저장 = 영문 키)
const APPEARANCE_OPTIONS = Object.keys(SPEC_LABELS.appearance).map((value) => ({ value, label: label('appearance', value) }));
const WORKING_OPTIONS = Object.keys(SPEC_LABELS.working).map((value) => ({ value, label: label('working', value) }));
// 버튼 글자만 바꾸는 칸 (저장값 그대로) — 턴테이블 회전수 '33' → '33⅓'
const CHOICE_BUTTON_TEXT: Record<string, Record<string, string>> = { speeds: { '33': '33⅓', '45': '45', '78': '78' } };

const PHOTO_EXAMPLES = [
  { label: '프론트', img: '/images/Front.png' },
  { label: '레프트 사이드', img: '/images/Left Side.png' },
  { label: '라이트 사이드', img: '/images/Right Side.png' },
  { label: '탑', img: '/images/Top.png' },
  { label: '백', img: '/images/Back.png' },
  { label: '디테일', img: '/images/Detail.png' }
];

const STEPS = [
  { id: 'info', label: '제품 정보' },
  { id: 'photos', label: '사진 및 설명' },
  { id: 'price', label: '가격' },
  { id: 'shipping', label: '배송' }
];


/**
 * 매칭된 부분을 노란 배경으로 강조.
 * - 공백·하이픈·&·/ 무시 (예: 'C22' 검색 → 'C 22' 또는 'C-22' 안의 'C 22' 전체가 강조됨)
 * - 첫 번째 매칭만 강조
 */
function highlightMatch(text: string, q: string) {
  const trimmed = q.trim();
  if (!trimmed) return text;
  const isStripped = (ch: string) => /[\s&\-/]/.test(ch);

  // 원본 텍스트의 각 위치 → 정규화 후 인덱스 매핑 (정규화에서 제거되는 문자는 -1)
  const origToNorm: number[] = [];
  const normChars: string[] = [];
  for (let i = 0; i < text.length; i++) {
    if (isStripped(text[i])) {
      origToNorm.push(-1);
    } else {
      origToNorm.push(normChars.length);
      normChars.push(text[i].toLowerCase());
    }
  }
  const textNorm = normChars.join('');
  const qNorm = trimmed.replace(/[\s&\-/]+/g, '').toLowerCase();
  if (!qNorm) return text;
  const startNorm = textNorm.indexOf(qNorm);
  if (startNorm < 0) {
    // 검색어가 옵션 전체를 포함하면(예: 'rca케이블' ⊇ 'rca') 옵션 전체 강조
    if (textNorm.length >= 2 && qNorm.includes(textNorm)) {
      return <span className="font-bold">{text}</span>;
    }
    return text;
  }
  const endNorm = startNorm + qNorm.length;

  // 정규화 인덱스 → 원본 인덱스 역매핑 (양 끝)
  let startOrig = -1;
  let endOrig = -1;
  for (let i = 0; i < origToNorm.length; i++) {
    if (origToNorm[i] === startNorm) {
      startOrig = i;
      break;
    }
  }
  for (let i = origToNorm.length - 1; i >= 0; i--) {
    if (origToNorm[i] === endNorm - 1) {
      endOrig = i + 1;
      break;
    }
  }
  if (startOrig < 0 || endOrig < 0) return text;
  return (
    <>
      {text.slice(0, startOrig)}
      <span className="font-bold">{text.slice(startOrig, endOrig)}</span>
      {text.slice(endOrig)}
    </>
  );
}

/**
 * 임피던스 선택 — 포노 입력처럼 드롭다운에서 하나씩 선택(선택 시 닫힘).
 * 아래 회색 읽기전용 칸에 범위(예: 2~4Ω) 표시 + X 초기화.
 */
function ImpedanceSelect({
  options,
  selected,
  onChange,
  displayText,
}: {
  options: string[];
  selected: string[];
  onChange: React.Dispatch<React.SetStateAction<string[]>>;
  displayText: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  // 하나 선택 → 토글 후 닫힘 (하나씩 선택하는 방식)
  const toggle = (o: string) => {
    onChange((prev) => (prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]));
    setOpen(false);
  };
  return (
    <div ref={ref}>
      {/* 드롭다운 1칸으로 통합 — 버튼 라벨에 선택값(범위) 표시, 우측에 X 초기화 */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full h-[42px] border border-transparent rounded-none pl-3 pr-16 flex items-center bg-surface focus:bg-bg"
        >
          {selected.length > 0 ? (
            <span className="text-fg">{displayText}</span>
          ) : (
            <span className="text-muted">선택하세요</span>
          )}
          <ChevronDown className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {/* X 초기화 — ChevronDown 왼쪽, 선택 있을 때만. 버블링 막아 드롭다운 토글 방지 */}
        {selected.length > 0 && (
          <button
            type="button"
            aria-label="초기화"
            onClick={(e) => { e.stopPropagation(); onChange([]); }}
            className="absolute right-8 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-muted hover:text-fg rounded-full hover:bg-line"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {open && (
          <div className="absolute z-30 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-bg border border-line rounded-none shadow-lg py-1">
            {options.map((o) => {
              const active = selected.includes(o);
              return (
                <button
                  key={o}
                  type="button"
                  onClick={() => toggle(o)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-14 text-left hover:bg-surface ${active ? 'bg-surface font-bold text-fg' : 'text-fg'}`}
                >
                  {o}
                  {active && <Check className="w-4 h-4 text-fg" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 다중 선택 드롭다운 (단자용) — 검색 + 선택 칩(개별 X).
 */
function MultiSelectDropdown({
  options,
  selected,
  onChange,
  aliases,
  disabled = false,
}: {
  options: (string | { value: string; label: string })[]; // {value,label}=영문키 저장+한글 표시, 문자열=저장·표시 동일
  selected: string[];
  onChange: React.Dispatch<React.SetStateAction<string[]>>;
  aliases?: Record<string, string[]>; // 단자명 → 검색 별칭 목록
  disabled?: boolean; // 흐리게(입력 불가) — 정비 이력: 상태를 아직 안 골랐을 때
}) {
  // 옵션 정규화 — selected/저장은 항상 value, 화면 표시는 label
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const labelOf = (v: string) => opts.find((x) => x.value === v)?.label ?? v;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery(''); setActiveIdx(-1); }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  // ↑/↓ 로 활성 항목 바뀔 때 그 항목이 보이도록 스크롤
  useEffect(() => {
    if (activeIdx < 0 || !listRef.current) return;
    (listRef.current.querySelector(`[data-idx="${activeIdx}"]`) as HTMLElement | null)?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);
  // 함수형 업데이트 — 연속 클릭 시 stale 클로저 방지.
  // 항목 하나 선택하면 드롭다운 닫고 검색어 비움 (하나씩 선택하는 방식)
  const toggle = (o: string) => {
    onChange((prev) => (prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]));
    setOpen(false);
    setQuery('');
    setActiveIdx(-1);
  };
  const remove = (o: string) => onChange((prev) => prev.filter((x) => x !== o));
  // 공백·슬래시·하이픈·· 제거 + 소문자 (예: 'aesebu' → 'AES/EBU' 매칭)
  const norm = (s: string) => s.replace(/[\s/·\-]+/g, '').toLowerCase();
  const nq = norm(query);
  // 단일 검색어 → 매칭 옵션 value 목록 (라벨/키/별칭 양방향 부분일치)
  const compute = (qStr: string): string[] => {
    const nqq = norm(qStr);
    if (!nqq) return opts.map((o) => o.value);
    return opts
      .filter((o) =>
        [o.label, o.value, ...(aliases?.[o.value] ?? [])].some((c) => {
          const nc = norm(c);
          return nc.includes(nqq) || (nc.length >= 2 && nqq.includes(nc));
        })
      )
      .map((o) => o.value);
  };
  // 1차: 원본 검색어. 0건이면 한영 자판 변환 fallback (browse 검색과 동일 패턴)
  let matched = !nq ? opts.map((o) => o.value) : compute(query);
  if (nq && matched.length === 0) {
    // 한글 자모로 영문 단자를 친 경우 (예: 'ㄱㅊㅁ' → 'rca')
    const en = ko2en(query);
    if (en !== query && (en.match(/[a-zA-Z]/g)?.length ?? 0) >= 2) matched = compute(en);
    // 그래도 없으면 반대 방향 (영문으로 한글 별칭을 친 경우)
    if (matched.length === 0) {
      const ko = en2ko(query);
      if (ko !== query && (ko.match(/[가-힣]/g)?.length ?? 0) >= 2) matched = compute(ko);
    }
  }
  // 직접 입력 항목을 함께 노출하는 조건 (검색어가 옵션 라벨/키와 정확히 같으면 제외)
  const showDirect = !!query.trim() && !opts.some((o) => norm(o.label) === nq || norm(o.value) === nq);
  // 키보드 네비게이션 대상: 매칭 항목들 + (있으면) 직접 입력
  const navList: { kind: 'opt' | 'direct'; value: string }[] = [
    ...matched.map((o) => ({ kind: 'opt' as const, value: o })),
    ...(showDirect ? [{ kind: 'direct' as const, value: query.trim() }] : []),
  ];
  const commitNav = (idx: number) => {
    const item = navList[idx];
    if (item) toggle(item.value);
  };
  return (
    <div ref={ref}>
      {/* 검색 + 드롭다운 (브랜드 입력 패턴) */}
      <div className="relative">
        <input
          value={query}
          onFocus={() => { setOpen(true); setActiveIdx(-1); }}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setActiveIdx(-1); }}
          onKeyDown={(e) => {
            if ((e.nativeEvent as { isComposing?: boolean }).isComposing) return; // 한글 IME 조합 중 무시
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              if (!open) { setOpen(true); setActiveIdx(0); return; }
              if (navList.length) setActiveIdx((i) => (i + 1) % navList.length);
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              if (!open) { setOpen(true); setActiveIdx(navList.length - 1); return; }
              if (navList.length) setActiveIdx((i) => (i <= 0 ? navList.length - 1 : i - 1));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              if (activeIdx >= 0) commitNav(activeIdx);            // 방향키로 고른 항목
              else if (navList.length) commitNav(0);               // 없으면 첫 항목(매칭/직접입력)
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
          placeholder="검색 또는 선택"
          disabled={disabled}
          className="w-full h-[42px] border border-line rounded-none pl-3 pr-9 py-2 bg-bg focus:outline-none focus:border-fg disabled:bg-surface disabled:text-muted disabled:cursor-not-allowed"
        />
        <ChevronDown className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted transition-transform pointer-events-none ${open ? 'rotate-180' : ''}`} />
        {open && (
          <div ref={listRef} className="absolute z-30 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-bg border border-line rounded-none shadow-lg">
            {/* 매칭 추천 항목 */}
            {matched.map((o, idx) => {
              const active = selected.includes(o);
              const nav = idx === activeIdx;
              return (
                <button
                  key={o}
                  type="button"
                  data-idx={idx}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => toggle(o)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-14 text-left ${nav ? 'bg-surface' : ''} ${active ? 'bg-surface font-bold text-fg' : 'text-fg'}`}
                >
                  <span>{highlightMatch(labelOf(o), query)}</span>
                  {active && <Check className="w-4 h-4 text-fg flex-shrink-0" />}
                </button>
              );
            })}
            {/* 검색어 있으면 직접 입력도 함께 (옵션명과 정확히 같으면 제외) */}
            {showDirect && (
              <button
                type="button"
                data-idx={matched.length}
                onMouseEnter={() => setActiveIdx(matched.length)}
                onClick={() => toggle(query.trim())}
                className={`w-full text-left px-3 py-2 text-14 text-fg underline ${activeIdx === matched.length ? 'bg-surface' : ''} ${matched.length > 0 ? 'border-t border-line' : ''}`}
              >
                직접 입력: <span className="font-bold">{query.trim()}</span>
              </button>
            )}
            {/* 매칭도 없고 검색어도 없을 때만 안내 */}
            {matched.length === 0 && !query.trim() && (
              <div className="px-3 py-2 text-14 text-muted">검색 결과 없음</div>
            )}
          </div>
        )}
      </div>
      {/* 선택된 항목 칩 — 선택됐을 때만 표시, 박스/테두리 없이 */}
      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2 items-center">
          {selected.map((o) => (
            <span key={o} className="inline-flex items-center gap-1 pl-3 pr-2 py-1 bg-surface rounded-none text-14 text-fg">
              {labelOf(o)}
              <button
                type="button"
                aria-label={`${labelOf(o)} 삭제`}
                onClick={() => remove(o)}
                className="w-4 h-4 flex items-center justify-center text-muted hover:text-fg"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// 여러 줄 자유 글 + 글자 수 (기타 사양) — 스키마 textarea 칸과 폴백 칸이 같이 씀
function SpecTextarea({ value, onChange, maxLength = 500, placeholder = '' }: { value: string; onChange: (v: string) => void; maxLength?: number; placeholder?: string }) {
  return (
    <>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        rows={4}
        placeholder={placeholder}
        className="w-full border border-line rounded-none px-3 py-2 focus:outline-none focus:border-fg resize-y"
      />
      <p className="text-12 text-muted mt-1">{value.length}/{maxLength}자</p>
    </>
  );
}

/**
 * 검색형 입력 (메인홈 검색 패턴)
 * - input에 키 입력 → 매칭되는 옵션을 드롭다운에 표시
 * - 항목 클릭하면 선택되고 드롭다운 닫힘
 * - filter prop으로 커스텀 매칭 로직 주입 가능 (예: 브랜드 한글 별칭)
 * - 옵션 텍스트는 입력어와 매칭되는 글자가 노란 배경으로 강조됨
 */
function Typeahead({
  value,
  onChange,
  options,
  filter,
  freeText = false,
  enableKeyboardLayout = false,
  hideUntilTyping = false,
  placeholder = '',
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  filter?: (q: string, opts: string[]) => string[];
  /** true면 매칭 없는 사용자 입력도 그대로 저장 가능 (드롭다운에 "직접 입력: …" 옵션 표시) */
  freeText?: boolean;
  /** true면 한영 자판 오타 매칭(lazy fallback): 1차 0개 → en2ko/ko2en 변환 후 재매칭 */
  enableKeyboardLayout?: boolean;
  /** true면 검색어가 비었을 때 드롭다운을 숨김(타이핑해야 표시). 브랜드처럼 목록이 큰 칸용 */
  hideUntilTyping?: boolean;
  /** 빈 칸 안내 문구 (드라이버 빌더의 재질/담당대역처럼 칸별 라벨용) */
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);

  // 공백·하이픈·&·/ 제거 + 소문자 (예: 'C 22'·'C-22'·'C22' 모두 같은 키로 비교)
  const normalize = (s: string) => s.replace(/[\s&\-/]+/g, '').toLowerCase();
  const qNorm = normalize(query);

  // 단일 쿼리 → 후보 배열로 매칭 (1차 + 한영 변환 시도 모두 같은 로직 재사용)
  const compute = (q: string): string[] => {
    const nq = normalize(q);
    if (!nq) return options;
    return filter
      ? filter(q.trim().toLowerCase(), options)
      : options.filter((o) => normalize(o).includes(nq));
  };

  // 1차: 원본 query 그대로 매칭
  let matched = !qNorm ? options : compute(query);

  // 2차 lazy fallback: 1차가 0건이고 enableKeyboardLayout 켜져 있을 때만
  // browse 검색의 한영 매칭과 동일한 패턴 (노이즈 가드: 한글 음절 ≥2 또는 영문 ≥2)
  if (enableKeyboardLayout && qNorm && matched.length === 0) {
    const ko = en2ko(query);
    if (ko !== query && (ko.match(/[가-힣]/g)?.length ?? 0) >= 2) {
      matched = compute(ko);
    }
    if (matched.length === 0) {
      const en = ko2en(query);
      if (en !== query && (en.match(/[a-zA-Z]/g)?.length ?? 0) >= 2) {
        matched = compute(en);
      }
    }
  }

  // ↑/↓ 로 activeIdx 바뀔 때마다 그 항목이 보이도록 스크롤
  useEffect(() => {
    if (activeIdx < 0 || !listRef.current) return;
    const el = listRef.current.querySelector(
      `[data-idx="${activeIdx}"]`
    ) as HTMLElement | null;
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  // '직접 입력' 옵션은 매칭이 0개일 때만 표시 (즉 데이터가 없을 때만)
  const showFreeText = freeText && !!qNorm && matched.length === 0;
  // 키보드 네비게이션용 통합 리스트 (매칭 + 직접 입력)
  const navList: { kind: 'match' | 'free'; text: string }[] = [
    ...matched.map((m) => ({ kind: 'match' as const, text: m })),
    ...(showFreeText ? [{ kind: 'free' as const, text: query }] : []),
  ];

  const commit = (item: { kind: 'match' | 'free'; text: string }) => {
    onChange(item.text);
    setQuery('');
    setOpen(false);
    setActiveIdx(-1);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={open ? query : value}
        onFocus={() => {
          // 자유 입력 모드: 기존 값에서 편집 시작 / 옵션 선택 모드: 빈 칸에서 검색 시작
          setQuery(freeText ? value : '');
          setOpen(true);
          setActiveIdx(-1);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActiveIdx(-1);
        }}
        onBlur={() =>
          setTimeout(() => {
            // 자유 입력 모드 + 매칭 0개 + 입력값 있음 → 자동 저장 (직접 입력 옵션 안 눌렀어도)
            if (freeText && query.trim() && matched.length === 0) {
              onChange(query);
            }
            setOpen(false);
            setActiveIdx(-1);
          }, 150)
        }
        onKeyDown={(e) => {
          // 한글 IME 조합 중인 키 이벤트는 무시 — '프리앰프' + Enter 시 끝에 '프'가
          // 한 번 더 붙는 현상(IME 확정용 Enter가 따로 발생) 방지.
          if ((e.nativeEvent as { isComposing?: boolean }).isComposing) return;
          // 닫혀 있을 때 ↓ 또는 Enter → 펼치기
          if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
            e.preventDefault();
            setOpen(true);
            return;
          }
          const n = Math.max(navList.length, 1);
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIdx((i) => (i + 1) % n);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIdx((i) => (i - 1 + n) % n);
          } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIdx >= 0 && navList[activeIdx]) {
              // ↓ 키로 선택해 둔 항목이 있으면 그것
              commit(navList[activeIdx]);
            } else if (navList.length > 0) {
              // 활성 항목이 없으면 첫 번째 매칭(또는 직접 입력) 자동 선택
              commit(navList[0]);
            } else if (freeText && query.trim()) {
              commit({ kind: 'free', text: query });
            }
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setOpen(false);
            setActiveIdx(-1);
          }
        }}
        placeholder={placeholder}
        className="w-full border border-line rounded-none pl-3 pr-9 py-2 focus:outline-none focus:border-fg"
      />
      {/* 값이 있으면 오른쪽 끝에 X 버튼 — 클릭 시 선택값/검색어 초기화 */}
      {value && (
        <button
          type="button"
          aria-label="지우기"
          onMouseDown={(e) => {
            // mousedown 단계에서 처리 → input의 onBlur보다 먼저 동작
            e.preventDefault();
            onChange('');
            setQuery('');
            setOpen(false);
            setActiveIdx(-1);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-muted hover:text-fg rounded-full hover:bg-surface"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      {open && (!hideUntilTyping || qNorm) && (
        <div
          ref={listRef}
          className="absolute z-30 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-bg border border-line rounded-none shadow-lg"
        >
          {matched.length === 0 && (
            <div className="px-3 py-2 text-14 text-muted">검색 결과 없음</div>
          )}
          {navList.length > 0 &&
            navList.map((item, idx) => {
              const isActive = idx === activeIdx;
              const isFree = item.kind === 'free';
              return (
                <button
                  key={`${item.kind}-${idx}`}
                  type="button"
                  data-idx={idx}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onMouseDown={(e) => {
                    // mousedown 단계에서 처리 → input의 onBlur보다 먼저 동작
                    e.preventDefault();
                    commit(item);
                  }}
                  className={`w-full text-left px-3 py-2 text-14 ${
                    isActive ? 'bg-surface' : ''
                  } ${
                    isFree
                      ? 'text-fg underline border-t border-line'
                      : value === item.text
                      ? 'font-bold text-fg'
                      : 'text-fg'
                  }`}
                >
                  {isFree ? (
                    <>
                      직접 입력: <span className="font-bold">{item.text}</span>
                    </>
                  ) : (
                    highlightMatch(item.text, query)
                  )}
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}

// 드라이버 구성 빌더 — 행 1개 = 드라이버 1개. 종류에 따라 구조/재질(또는 담당대역) 옵션·칼럼이 바뀜(cascading).
// 검색+드롭다운(단일)은 Typeahead 재사용(단자 위젯은 다중이라, 단일판 Typeahead 사용). A단계: 렌더만(요약·저장 없음).
// DriverRow 타입 · ROLE_BAND · driverSummary(요약 칩 조립)는 src/lib/spec-builders.ts 로 이동 (폼·시드 스크립트 공용)
const BLANK_DRIVER_ROW: DriverRow = { type: '', structure: '', material: '', band: '', size: '', sizeUnit: 'inch', count: '', note: '' };

function DriverConfigBuilder({ rows, onChange, subwoofer = false }: { rows: DriverRow[]; onChange: (rows: DriverRow[]) => void; subwoofer?: boolean }) {
  const update = (i: number, patch: Partial<DriverRow>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const inputCls = 'h-[42px] border border-line rounded-none px-2 bg-bg text-14 focus:outline-none focus:border-fg';
  const summary = driverSummary(rows);
  // 서브우퍼: 종류는 우퍼·패시브 라디에이터만, 셀(구조/재질/크기/개수)은 처음부터 펼침
  const typeOpts = subwoofer ? ['우퍼', '패시브 라디에이터'] : DRIVER_TYPES;
  return (
    <div className="space-y-2">
      {rows.map((row, i) => {
        const isCoax = row.type === '동축';
        return (
          <div key={i} className="relative flex items-center gap-2">
            {/* 종류 (항상 표시) — 빈 상태: 1줄 꽉(flex-1), 선택/서브우퍼: w-44로 줄고 나머지 칸 분할 */}
            <div className={`relative ${(subwoofer || row.type) ? 'w-44 flex-shrink-0' : 'flex-1 min-w-0'}`}>
              <select
                value={row.type}
                onChange={(e) => update(i, { type: e.target.value, structure: '', material: '', band: '', size: '', sizeUnit: 'inch', count: '', note: '' })}
                className={`w-full appearance-none border border-line rounded-none pl-2 ${row.type ? 'pr-11' : 'pr-6'} h-[42px] text-14 bg-bg focus:outline-none focus:border-fg ${row.type ? '' : 'text-muted'}`}
              >
                <option value="" disabled>종류</option>
                {typeOpts.map((t) => (
                  <option key={t} value={t} className="text-fg">{t}</option>
                ))}
              </select>
              {row.type && (
                <button
                  type="button"
                  aria-label="종류 초기화"
                  onClick={() => update(i, { type: '', structure: '', material: '', band: '', size: '', sizeUnit: 'inch', count: '', note: '' })}
                  className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-muted hover:text-fg rounded-full hover:bg-surface"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <ChevronDown className="w-4 h-4 absolute right-1.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            </div>
            {/* 구조, 재질(또는 담당 대역), 크기, 개수, 비고 — 종류 선택 시 표시(서브우퍼는 처음부터 항상 표시)
                FEATURE_FLAGS.driverMaterialStructure 꺼짐(2026-11-10): 구조, 재질 칸 숨김 → [유닛][크기 + inch/mm][개수][비고]. 동축의 담당 대역은 way 계산(driverWays)에 쓰여 남김 */}
            {(subwoofer || row.type) && (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {FEATURE_FLAGS.driverMaterialStructure && (
              <div className="flex-1 min-w-0">
                <Typeahead value={row.structure} onChange={(v) => update(i, { structure: v })} options={DRIVER_STRUCT[row.type] ?? []} freeText placeholder="구조" />
              </div>
              )}
              {(isCoax || FEATURE_FLAGS.driverMaterialStructure) && (
              <div className="flex-1 min-w-0">
                {isCoax ? (
                  <Typeahead value={row.band} onChange={(v) => update(i, { band: v })} options={COAXIAL_BANDS} freeText placeholder="담당 대역" />
                ) : (
                  <Typeahead value={row.material} onChange={(v) => update(i, { material: v })} options={DRIVER_MATERIAL[row.type] ?? []} freeText placeholder="재질" />
                )}
              </div>
              )}
              <input
                value={row.size}
                onChange={(e) => update(i, { size: e.target.value })}
                placeholder="크기"
                className={`${inputCls} w-16 flex-shrink-0`}
              />
              <div className="relative w-20 flex-shrink-0">
                <select
                  value={row.sizeUnit}
                  onChange={(e) => update(i, { sizeUnit: e.target.value })}
                  className="w-full appearance-none border border-line rounded-none pl-2 pr-7 h-[42px] text-14 bg-bg focus:outline-none focus:border-fg"
                >
                  <option value="inch">inch</option>
                  <option value="mm">mm</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-1.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              </div>
              <input
                value={row.count}
                onChange={(e) => update(i, { count: e.target.value.replace(/[^0-9]/g, '') })}
                inputMode="numeric"
                placeholder="개수"
                className={`${inputCls} w-14 flex-shrink-0 text-center px-1`}
              />
              {/* 비고 — 자유 글 (예: 실크 돔). 요약 줄 끝에 괄호로 */}
              <input
                value={row.note ?? ''}
                onChange={(e) => update(i, { note: e.target.value })}
                placeholder="비고"
                aria-label="비고"
                className={`${inputCls} flex-1 min-w-0`}
              />
            </div>
            )}
            {/* 삭제 — 필드 끝~카드 오른쪽 끝 거터 중앙에 절대배치 (행 2개 이상일 때만) */}
            {rows.length > 1 && (
              <button
                type="button"
                aria-label="행 삭제"
                onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
                className="absolute left-full ml-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-muted hover:text-fg rounded-full hover:bg-surface"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => onChange([...rows, { ...BLANK_DRIVER_ROW }])}
        className="text-14 text-fg font-bold inline-flex items-center gap-1 hover:underline"
      >
        <Plus className="w-3.5 h-3.5" /> 드라이버 추가
      </button>
      {/* 자동 요약 (읽기 전용) — 속성별 칩 [2-way][2-driver][12inch][우퍼 (1)][1inch][트위터 (1) (실크 돔)], X 없음. 재질, 구조 칩은 플래그 켜졌을 때만 */}
      {summary.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {summary.map((chip, idx) => (
            <span key={idx} className="inline-flex items-center px-3 py-1 bg-surface rounded-none text-14 text-fg">{chip}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// 앰프 출력 빌더(액티브 전용) — 행 1개 = 드라이버 종류(앞칸) + 그 드라이버를 구동하는 앰프 출력값(뒤칸, 자유 입력).
// "앰프 구성" 바로 아래에 표시. 요약(보기) 박스는 두지 않음 — way/driver 요약은 드라이버 구성에만.
// AmpPowerRow 타입은 src/lib/spec-builders.ts (폼·시드 공용)
const BLANK_AMP_POWER_ROW: AmpPowerRow = { type: '', power: '' };
// AMP_POWER_TYPES(앰프 출력 종류 목록)는 src/lib/spec-builders.ts 로 이동 (폼·시드 공용)

function AmpPowerBuilder({ rows, onChange }: { rows: AmpPowerRow[]; onChange: (rows: AmpPowerRow[]) => void }) {
  const update = (i: number, patch: Partial<AmpPowerRow>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const inputCls = 'h-[42px] border border-line rounded-none px-2 bg-bg text-14 focus:outline-none focus:border-fg';
  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2 -mr-6">
          {/* 앞칸: 드라이버 종류 (항상 표시) */}
          <div className="relative w-28 flex-shrink-0">
            <select
              value={row.type}
              onChange={(e) => update(i, { type: e.target.value })}
              className={`w-full appearance-none border border-line rounded-none pl-2 ${row.type ? 'pr-11' : 'pr-6'} h-[42px] text-14 bg-bg focus:outline-none focus:border-fg ${row.type ? '' : 'text-muted'}`}
            >
              <option value="" disabled>종류</option>
              {AMP_POWER_TYPES.map((t) => (
                <option key={t} value={t} className="text-fg">{t}</option>
              ))}
            </select>
            {row.type && (
              <button
                type="button"
                aria-label="종류 초기화"
                onClick={() => update(i, { type: '', power: '' })}
                className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-muted hover:text-fg rounded-full hover:bg-surface"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <ChevronDown className="w-4 h-4 absolute right-1.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>
          {/* 뒤칸: 앰프 출력값 (자유 입력) — 항상 표시(2칸 상시 유지) */}
          <input
            value={row.power}
            onChange={(e) => update(i, { power: e.target.value })}
            placeholder="출력값 (예: 200W)"
            className={`${inputCls} flex-1 min-w-0`}
          />
          {/* 삭제 (행 2개 이상일 때만) */}
          {rows.length > 1 ? (
            <button
              type="button"
              aria-label="행 삭제"
              onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
              className="w-5 h-5 flex-shrink-0 flex items-center justify-center text-muted hover:text-fg rounded-full hover:bg-surface"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-5 flex-shrink-0" />
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...rows, { ...BLANK_AMP_POWER_ROW }])}
        className="text-14 text-fg font-bold inline-flex items-center gap-1 hover:underline"
      >
        <Plus className="w-3.5 h-3.5" /> 앰프 출력 추가
      </button>
    </div>
  );
}

interface UploadPageProps {
  initialData?: {
    title?: string;
    brand?: string;
    model?: string;
    year?: string;
    category?: string;
  };
}

export function UploadPage({ initialData }: UploadPageProps = {}) {
  const router = useRouter();
  const [images, setImages] = useState<string[]>([]);
  // 이미지 업로드 상태
  const [uploadingCount, setUploadingCount] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [category, setCategory] = useState(initialData?.category ?? '');
  const [subcategory, setSubcategory] = useState('');
  const [brand, setBrand] = useState(initialData?.brand ?? '');
  const [model, setModel] = useState(initialData?.model ?? '');
  // 등록 폼 자동완성 = 사전(브랜드 사전, CATALOG 모델) + 기존 매물 값. 둘 다 자유 입력 허용(Typeahead freeText)
  const [listingBrandModels, setListingBrandModels] = useState<{ brand: string; model: string; categories: string[] }[]>([]);
  useEffect(() => {
    let active = true;
    fetchListings()
      .then((rows) => { if (active) setListingBrandModels(rows.map((l) => ({ brand: l.brand, model: l.model, categories: l.categories }))); })
      .catch((err) => console.error('매물 브랜드/모델 불러오기 실패:', err)); // 실패해도 사전 후보만으로 동작
    return () => { active = false; };
  }, []);
  // 사전에 없는 매물 브랜드 (사전 브랜드 뒤에 붙임)
  const listingOnlyBrands = useMemo(() => {
    const dict = new Set(ALL_BRAND_NAMES);
    return Array.from(new Set(listingBrandModels.map((x) => x.brand.trim()).filter((b) => b && !dict.has(b))));
  }, [listingBrandModels]);
  const brandOptions = useMemo(() => [...ALL_BRAND_NAMES, ...listingOnlyBrands], [listingOnlyBrands]);
  // 상품명 자동 반영 — 브랜드+모델+하위카테고리로 자동 채움. 사용자가 직접 수정하면(titleEdited) 중단.
  const [titleEdited, setTitleEdited] = useState(Boolean(initialData?.title));
  useEffect(() => {
    if (titleEdited) return;
    setTitle([brand, model, subcategory].filter(Boolean).join(' '));
  }, [brand, model, subcategory, titleEdited]);
  const [year, setYear] = useState(initialData?.year ?? '');
  const [yearApprox, setYearApprox] = useState(false);   // 출시 연도 '대략' → specs.yearApprox = true (표시 '약 1975년')
  const [yearUnknown, setYearUnknown] = useState(false); // 출시 연도 '모름' → 칸 비활성, 연도는 비워 저장
  const [finish, setFinish] = useState('');
  const [country, setCountry] = useState('');
  const [handmade, setHandmade] = useState(false);
  const [condition, setCondition] = useState('');
  const [description, setDescription] = useState('');
  const [asDescribed, setAsDescribed] = useState(false);
  const [skuOpen, setSkuOpen] = useState(false);
  const [sku, setSku] = useState('');
  const [youtubeLink, setYoutubeLink] = useState('');
  const [price, setPrice] = useState('');
  const [comparePrice, setComparePrice] = useState('');
  const [currency, setCurrency] = useState('krw'); // 통화 키 (krw / jpy, 기본 원) → DB listings.currency
  const [acceptOffers, setAcceptOffers] = useState(true);
  const [shippingType, setShippingType] = useState<'free' | 'flat' | 'calculated' | ''>('');
  const [shippingCost, setShippingCost] = useState('');
  const [localPickup, setLocalPickup] = useState(false);
  const [locationCountry, setLocationCountry] = useState('kr'); // 위치 국가 (kr / jp, 기본 한국) — 지역 선택지를 고름. 저장은 지역 키 접두로
  const [location, setLocation] = useState(''); // 지역 키 (kr_seoul, jp_tokyo 등, 선택 사항, 빈 값 = 미선택) → DB location
  const [activeStep, setActiveStep] = useState('info');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // 제품 정보 추가 필드
  const [ownership, setOwnership] = useState('');
  const [components, setComponents] = useState<string[]>([]); // 구성품 체크 (키 배열) → specs.components
  const [componentsOther, setComponentsOther] = useState('');   // 기타 구성품 자유 글 → specs.componentsOther
  const [conditionAppearance, setConditionAppearance] = useState('');         // 드롭다운(등급)
  const [conditionAppearanceDetail, setConditionAppearanceDetail] = useState(''); // 자유 입력칸
  const [conditionWorking, setConditionWorking] = useState('');               // 드롭다운(등급)
  const [conditionWorkingDetail, setConditionWorkingDetail] = useState('');   // 자유 입력칸
  const [maintenance, setMaintenance] = useState<string[]>([]);              // 정비 이력 (다중 — 영문키 + 직접 입력 글) → specs.tech.maintenance
  // 새 제품 상태(새상품, 미개봉, NOS)면 중고 칸(외관 상태, 작동 상태)을 숨기고 저장도 안 함. 정비 이력은 화면은 FEATURE_FLAGS.maintenance 가 정하고, 저장은 예전처럼 새 제품 상태면 안 함
  const usedFieldsHidden = NEW_CONDITION_KEYS.includes(condition);
  // 배송 국가 바꾸기 (버튼, 드롭다운 공용) — 다른 나라 지역이 남지 않게 지역 비움
  const onLocationCountryChange = (c: string) => {
    setLocationCountry(c);
    if (locationCountryOf(location) !== c) setLocation('');
  };
  // 상태 바꾸기 (버튼, 드롭다운 공용) — 새상품, 미개봉, NOS 로 바뀌면 소유권, 외관, 작동, 정비 이력 값 자동 초기화
  const onConditionChange = (v: string) => {
    setCondition(v);
    if (v !== 'used') {
      setOwnership('');
      setConditionAppearance('');
      setConditionAppearanceDetail('');
      setConditionWorking('');
      setConditionWorkingDetail('');
      setMaintenance([]);
    }
  };
  // 복합 입력(정격출력/주파수/크기)의 부분 입력칸 — 변경 시 조립해서 specs에 반영
  const [powerPairs, setPowerPairs] = useState<{ w: string; ohm: string; note?: string }[]>([{ w: '', ohm: '', note: '' }]);
  // range(하한~상한) — key별 보관 (주파수 응답·권장 임피던스 등 range 칸이 여러 개 동시에 떠도 독립)
  const [ranges, setRanges] = useState<Record<string, { low: string; high: string }>>({});
  // 크기(W×D×H mm + 비고) — key별 '행 배열'로 보관 (크기 칸 여러 개·+버튼 추가 지원)
  const [dims, setDims] = useState<Record<string, { w: string; d: string; h: string; note: string }[]>>({});
  const [valNotes, setValNotes] = useState<Record<string, { value: string; note: string }[]>>({}); // 무게 빌더 — [값][비고] 행 배열
  // 다중 선택 버튼 (지원 임피던스 / 입력·출력 단자) — 저장 시 배열로 specs.tech에
  const [impedances, setImpedances] = useState<string[]>([]);
  // 다중 선택(단자·무선·포맷 등) 공통 상태 — key별 배열로 보관. (impedance는 전용 위젯이라 별도)
  const [multiSel, setMultiSel] = useState<Record<string, string[]>>({});
  // 드라이버 구성 빌더 행들 (스피커). A단계: 입력만, 요약·저장은 다음 단계.
  const [driverRows, setDriverRows] = useState<DriverRow[]>([{ ...BLANK_DRIVER_ROW }]);
  // 드라이버 행 → 필터용 파생 키 { driverWays, wooferMaxInch } (행이 바뀔 때마다 계산, 저장 시 tech 에 같이 씀)
  const driverKeys = useMemo(() => driverDerived(driverRows), [driverRows]);
  const [ampPowerRows, setAmpPowerRows] = useState<AmpPowerRow[]>([{ ...BLANK_AMP_POWER_ROW }]);
  // 크로스오버 주파수(Hz) 여러 개 — 추가 버튼으로 행 늘림. 저장 시 'A / B / C'로 조립.
  const [crossoverValues, setCrossoverValues] = useState<{ value: string; unit: string }[]>([{ value: '', unit: 'Hz' }]);
  // 진공관 빌더 — 역할/종류/개수 행 배열 (1단계: 상태·조립만, UI는 2단계)
  const [tubeRows, setTubeRows] = useState<{ role: string; type: string; qty: string }[]>([{ role: '', type: '', qty: '' }]);
  // 자유 추가 사양 [제목][내용] 줄들 — 상세 모드 'custom' 하위 카테고리(DETAIL_MODE_BY_SUB)에서만 보임 → specs.tech.customSpecs (빈 줄 제외, 입력 순서)
  const [customSpecs, setCustomSpecs] = useState<CustomSpecRow[]>([]);
  const toggleArr = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  // 숫자(+소수점 1개)만 남김 — 정격출력/주파수/THD/S/N/댐핑/무게 등 수치 입력용
  const numOnly = (s: string) => {
    const c = s.replace(/[^0-9.]/g, '');
    const parts = c.split('.');
    return parts.length <= 1 ? c : parts[0] + '.' + parts.slice(1).join('');
  };
  // 선택된 임피던스 → 범위 표기 (예: ['4Ω','8Ω'] → '4~8Ω', ['4Ω'] → '4Ω')
  const impedanceRange = (arr: string[]) => {
    if (arr.length === 0) return '';
    const nums = arr.map((o) => parseInt(o, 10)).sort((a, b) => a - b);
    return nums.length === 1 ? `${nums[0]}Ω` : `${nums[0]}~${nums[nums.length - 1]}Ω`;
  };
  // 조립 함수(buildPower/buildFreq/buildDims/buildValNotes/buildTubes/buildCrossover/buildAmpPower/buildNumSelect)는
  // src/lib/spec-builders.ts 에서 import (폼·시드 스크립트 공용 — 포맷의 단일 출처)
  const [techExpanded, setTechExpanded] = useState(true); // 기술 사양 섹션 접기/펼치기
  const [detailExpanded, setDetailExpanded] = useState(false); // 상세 사양(핵심 외 칸) 접기/펼치기 — CORE_SPEC_KEYS에 있는 하위 카테고리만
  useEffect(() => { setDetailExpanded(false); }, [subcategory]); // 하위 카테고리를 바꾸면 상세 사양은 다시 접힘
  // 기술 사양 (16개 필드를 객체 하나로 관리)
  const [specs, setSpecs] = useState<Record<string, string>>({
    type: '', channel: '', device: '', powerRated: '',
    freqResponse: '', impedance: '', thd: '', snr: '',
    damping: '', inputs: '', outputs: '', phono: '',
    toneControl: '', power: '', dimensions: '', weight: '',
  });
  // 사운드바는 액티브 고정 — 선택 시 형식(speakerDetail)을 자동 'active'로 (형식 칸은 렌더에서 숨김)
  // AV 리시버는 솔리드 스테이트 고정 — 선택 시 증폭 방식(device)을 자동 AMP_DEVICE_SOLID로 (증폭 방식 칸은 렌더에서 숨김)
  useEffect(() => {
    if (subcategory === '사운드바') {
      setSpecs((s) => (s.speakerDetail === 'active' ? s : { ...s, speakerDetail: 'active' }));
    }
    if (subcategory === 'AV 리시버') {
      setSpecs((s) => (s.device === AMP_DEVICE_SOLID ? s : { ...s, device: AMP_DEVICE_SOLID }));
    }
  }, [subcategory]);
  // 위 자동 설정 칸 — 값은 저장되지만 칸은 그리지 않음 (renderSpecField 와 상세 사양 개수가 같이 씀)
  const isAutoFixedField = (key: string) =>
    (key === 'speakerDetail' && subcategory === '사운드바') || (key === 'device' && subcategory === 'AV 리시버');

  // ── 임시 저장 (이 브라우저 localStorage) — 입력이 멈추고 1초 뒤 자동 저장, 다시 들어오면 "이어서 작성할까요?" 안내. 사진은 저장 안 함 ──
  const DRAFT_KEY = 'resonance.uploadDraft.v1';
  const draftData = {
    category, subcategory, brand, model, title, titleEdited, year, yearApprox, yearUnknown, finish, country, handmade,
    condition, ownership, components, componentsOther, conditionAppearance, conditionAppearanceDetail, conditionWorking,
    conditionWorkingDetail, maintenance, specs, powerPairs, ranges, dims, valNotes, impedances, multiSel, driverRows,
    ampPowerRows, crossoverValues, tubeRows, customSpecs, description, asDescribed, sku, youtubeLink, price, comparePrice, currency,
    acceptOffers, shippingType, shippingCost, localPickup, locationCountry, location,
  };
  type DraftData = Partial<typeof draftData>;
  const draftJson = JSON.stringify(draftData);
  const initialDraftJson = useRef(draftJson); // 처음 화면 그대로면(아무것도 안 쳤으면) 저장하지 않음
  const [draftPrompt, setDraftPrompt] = useState<{ savedAt: number; data: DraftData } | null>(null);
  const [draftReady, setDraftReady] = useState(false); // 이어서 작성/버리기를 고르기 전엔 자동 저장을 멈춤(저장본 덮어쓰기 방지)
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      const d = raw ? JSON.parse(raw) : null;
      if (d && d.data) { setDraftPrompt(d); return; }
    } catch { /* 저장소를 못 쓰면 임시 저장 없이 진행 */ }
    setDraftReady(true);
  }, []);
  const saveDraftNow = (json: string) => {
    try {
      if (json === initialDraftJson.current) { localStorage.removeItem(DRAFT_KEY); return; }
      const savedAt = Date.now();
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt, data: JSON.parse(json) }));
      setDraftSavedAt(savedAt);
    } catch { /* 저장소가 꽉 찼거나 막혀 있으면 조용히 넘어감 */ }
  };
  useEffect(() => {
    if (!draftReady) return;
    const t = setTimeout(() => saveDraftNow(draftJson), 1000);
    return () => clearTimeout(t);
  }, [draftJson, draftReady]); // eslint-disable-line react-hooks/exhaustive-deps
  const restoreDraft = () => {
    const d = draftPrompt?.data ?? {};
    setCategory(d.category ?? ''); setSubcategory(d.subcategory ?? ''); setBrand(d.brand ?? ''); setModel(d.model ?? '');
    setTitle(d.title ?? ''); setTitleEdited(!!d.titleEdited); setYear(d.year ?? ''); setYearApprox(!!d.yearApprox); setYearUnknown(!!d.yearUnknown);
    setFinish(d.finish ?? ''); setCountry(d.country ?? ''); setHandmade(!!d.handmade); setCondition(conditionKind(d.condition)); /* 옛 임시 저장의 used_* 는 중고로 */ setOwnership(d.ownership ?? '');
    setComponents(d.components ?? []); setComponentsOther(d.componentsOther ?? '');
    setConditionAppearance(d.conditionAppearance ?? ''); setConditionAppearanceDetail(d.conditionAppearanceDetail ?? '');
    setConditionWorking(d.conditionWorking ?? ''); setConditionWorkingDetail(d.conditionWorkingDetail ?? ''); setMaintenance(d.maintenance ?? []);
    if (d.specs) setSpecs(d.specs);
    if (d.powerPairs) setPowerPairs(d.powerPairs);
    if (d.ranges) setRanges(d.ranges);
    if (d.dims) setDims(d.dims);
    if (d.valNotes) setValNotes(d.valNotes);
    if (d.impedances) setImpedances(d.impedances);
    if (d.multiSel) setMultiSel(d.multiSel);
    if (d.driverRows) setDriverRows(d.driverRows);
    if (d.ampPowerRows) setAmpPowerRows(d.ampPowerRows);
    if (d.crossoverValues) setCrossoverValues(d.crossoverValues);
    if (d.tubeRows) setTubeRows(d.tubeRows);
    setCustomSpecs(d.customSpecs ?? []);
    setDescription(d.description ?? ''); setAsDescribed(!!d.asDescribed); setSku(d.sku ?? ''); setYoutubeLink(d.youtubeLink ?? '');
    setPrice(d.price ?? ''); setComparePrice(d.comparePrice ?? ''); setCurrency(d.currency ?? 'krw'); setAcceptOffers(d.acceptOffers ?? true);
    setShippingType(d.shippingType ?? ''); setShippingCost(d.shippingCost ?? ''); setLocalPickup(!!d.localPickup);
    setLocationCountry(d.locationCountry ?? 'kr'); setLocation(d.location ?? '');
    setDraftPrompt(null);
    setDraftReady(true);
  };
  const discardDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* 무시 */ }
    setDraftPrompt(null);
    setDraftReady(true);
  };

  // 폼 제출 → Supabase에 매물 INSERT → 성공 시 상세 페이지로 이동
  const handleSubmit = async () => {
    setSubmitError(null);
    if (!brand || !model) { setSubmitError('브랜드와 모델명을 입력해주세요.'); return; }
    if (!category) { setSubmitError('카테고리를 선택해주세요.'); return; }
    if (!title.trim()) { setSubmitError('상품명을 입력해주세요.'); return; }
    if (!condition) { setSubmitError('상태를 선택해주세요.'); return; }
    if (!price) { setSubmitError('가격을 입력해주세요.'); return; }
    if (images.length === 0) { setSubmitError('사진을 1장 이상 올려 주세요.'); return; } // 필수: 브랜드, 모델, 카테고리, 상태, 가격, 사진 1장
    setSubmitting(true);
    try {
      // specs(jsonb)에 저장할 값들 — 비어있는 키는 제외 (DB 깔끔하게)
      const specsToSave: Record<string, string> = {};
      // 외관/작동 상태 — 새 제품 상태(새상품, 미개봉, NOS)면 칸이 숨겨지므로 저장 안 함
      if (!usedFieldsHidden) {
        if (conditionAppearance) specsToSave.appearance = conditionAppearance;
        if (conditionAppearanceDetail) specsToSave.appearanceDetail = conditionAppearanceDetail;
        if (conditionWorking) specsToSave.working = conditionWorking;
        if (conditionWorkingDetail) specsToSave.workingDetail = conditionWorkingDetail;
      }
      // 출시 연도 '대략' (모름이면 연도 자체를 비워 저장)
      if (FEATURE_FLAGS.yearApprox && yearApprox && !yearUnknown && year.trim()) (specsToSave as Record<string, unknown>).yearApprox = true;
      // 구성품
      if (FEATURE_FLAGS.componentChecks) {
        if (components.length > 0) (specsToSave as Record<string, unknown>).components = COMPONENT_OPTS.map((o) => o.value).filter((k) => components.includes(k)); // 목록 순서대로
        if (componentsOther.trim()) specsToSave.componentsOther = componentsOther.trim();
      } else if (componentsOther.trim()) specsToSave.components = componentsOther.trim(); // 플래그 꺼짐: 전 방식(자유 글 한 칸 → specs.components 글)
      // 기술 사양 → specs.tech 중첩 객체에 저장 (값/배열 있는 것만, 빈 값·빈 배열 제외).
      // ⚠️ 옛 카탈로그 평면 키(phono/power/toneControl 등)와 충돌 방지 위해 tech 네임스페이스 분리.
      // ⚠️ 카테고리별 스키마(앰프 등)가 있으면 그 필드를 kind별로 조립, 없으면 기존 SPEC_FIELDS 폴백(분기).
      // ⚠️ 아래 kind별 분기는 scripts/seed-listings.ts 의 buildTechLikeForm 과 거울 관계 — 분기를 바꾸면 거기도 같이.
      const tech: Record<string, string | string[] | number> = {}; // number = 드라이버 파생 키 wooferMaxInch
      const catFields = SPEC_FIELDS_BY_CATEGORY[category];
      if (catFields) {
        for (const f of catFields) {
          // 조건부 필드(형식·서브우퍼별): 화면에 안 보이는 필드는 저장하지 않음(전환 시 잔여값 방지)
          if (f.showWhen && !f.showWhen({ ...specs, __sub: subcategory })) continue;
          if (hiddenByDetailMode(subcategory, f)) continue; // 상세 모드 'custom'(DETAIL_MODE_BY_SUB): 정해진 상세 칸은 숨김 + 저장 안 함
          if (f.input.kind === 'auto') {
            // 타입: 카테고리에서 자동 입력된 값
            const v = (subcategory || category).trim();
            if (v) tech[f.key] = v;
          } else if (f.input.kind === 'power') {
            // 정격 출력: 출력값(W) + 기준 옴 쌍 조립 문자열
            const v = buildPower(powerPairs);
            if (v) tech[f.key] = v;
          } else if (f.input.kind === 'range') {
            // range: key별 하한~상한 조립 문자열 (필드 단위 사용 — 서브우퍼는 Hz~Hz)
            const r = ranges[f.key] ?? { low: '', high: '' };
            const v = buildFreq(r.low, r.high, f.input.lowUnit, f.input.highUnit);
            if (v) tech[f.key] = v;
          } else if (f.input.kind === 'dimensions') {
            // 크기: key별 행 배열 → "W×D×H (비고) / ..." 조립
            const v = buildDims(dims[f.key] ?? []);
            if (v) tech[f.key] = v;
          } else if (f.input.kind === 'valueNote') {
            // 무게: 값+단위+비고 행 배열 → "12kg (비고) / ..." 조립
            const v = buildValNotes(valNotes[f.key] ?? [], f.input.unit);
            if (v) tech[f.key] = v;
          } else if (f.input.kind === 'crossover') {
            // 크로스오버: 주파수(Hz) 여러 개 → "250Hz / 2500Hz"
            const v = buildCrossover(crossoverValues);
            if (v) tech[f.key] = v;
          } else if (f.input.kind === 'multi') {
            // 다중 선택: 배열 그대로 (임피던스/입력·출력 단자/무선)
            const arr = f.key === 'impedance' ? impedances : (multiSel[f.key] ?? []);
            if (arr.length > 0) tech[f.key] = arr;
          } else if (f.input.kind === 'drivers') {
            // 드라이버 구성(빌더): 행들 → 요약 문자열 (UI 요약과 동일) + 필터용 파생 키 driverWays·wooferMaxInch (스키마 필드 아님)
            const v = driverSummary(driverRows);
            if (v.length) tech[f.key] = v.join(' ');
            Object.assign(tech, driverKeys);
          } else if (f.input.kind === 'ampPower') {
            // 앰프 출력(빌더): 종류별 출력값 → "우퍼 200W / 트위터 100W" (종류 있는 행만)
            const v = buildAmpPower(ampPowerRows);
            if (v) tech[f.key] = v;
          } else if (f.input.kind === 'numSelect') {
            // 숫자 + 타입(RMS/Peak) → "150W RMS" (숫자 있을 때만 저장)
            const v = buildNumSelect(specs[f.key], specs[`${f.key}Type`], f.input.unit, f.input.glue);
            if (v) tech[f.key] = v;
          } else if (f.input.kind === 'tubeBuilder') {
            // 진공관(빌더): 역할/종류/개수 행 → "출력관 KT88 ×4 / 프리관 12AX7 ×2"
            const v = buildTubes(tubeRows);
            if (v) tech[f.key] = v;
          } else {
            // select / text: specs 레코드의 단순 문자열
            const v = specs[f.key]?.trim();
            if (v) tech[f.key] = v;
          }
        }
      } else {
        // 폴백: 카테고리별 스키마 없는 경우 기존 SPEC_FIELDS(단순 문자열)
        for (const f of SPEC_FIELDS) {
          const v = specs[f.key]?.trim();
          if (v) tech[f.key] = v;
        }
      }
      // 정비 이력 — 제품 정보 공통 칸. 저장 자리는 예전 카세트 칸 그대로 specs.tech.maintenance (새 제품 상태면 저장 안 함)
      if (!usedFieldsHidden && maintenance.length > 0) tech.maintenance = maintenance;
      // 자유 추가 사양 — 상세 모드 'custom'일 때만, 제목과 내용이 다 있는 줄만 입력 순서대로. 필터는 안 읽음
      if (catFields && CORE_SPEC_KEYS[subcategory] && detailModeOf(subcategory) === 'custom') {
        const cs = cleanCustomSpecs(customSpecs);
        if (cs.length > 0) (tech as Record<string, unknown>).customSpecs = cs;
      }
      if (Object.keys(tech).length > 0) (specsToSave as Record<string, unknown>).tech = tech;

      const id = await insertListing({
        images, title, category, subcategory, brand, model, year: FEATURE_FLAGS.yearApprox && yearUnknown ? '' : year, finish, country,
        handmade, condition, ownership, description, sku, youtubeLink, price, comparePrice, currency,
        acceptOffers, shippingType, shippingCost, localPickup, location,
        specs: specsToSave,
      });
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* 무시 */ } // 등록 성공 → 임시 저장본 삭제
      router.push(`/listing/${id}`); // 저장된 매물 상세로 이동
    } catch (e: any) {
      console.error('매물 저장 실패:', e);
      setSubmitError('저장에 실패했습니다: ' + (e?.message ?? '알 수 없는 오류'));
      setSubmitting(false);
    }
  };

  // 파일 선택/드롭 → Supabase Storage 업로드 → 받은 공개 URL을 images state에 추가
  const MAX_IMAGES = 10;
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      setUploadError(`이미지는 최대 ${MAX_IMAGES}장까지 업로드할 수 있어요.`);
      return;
    }
    const arr = Array.from(files).slice(0, remaining);
    setUploadingCount(arr.length);
    const uploaded: string[] = [];
    let firstErr: string | null = null;
    for (const f of arr) {
      try {
        const url = await uploadListingImage(f);
        uploaded.push(url);
      } catch (e: unknown) {
        if (!firstErr) firstErr = e instanceof Error ? e.message : '업로드 중 오류가 발생했습니다.';
      }
    }
    if (uploaded.length > 0) setImages((cur) => [...cur, ...uploaded]);
    if (firstErr) setUploadError(firstErr);
    setUploadingCount(0);
  };

  const openFilePicker = () => fileInputRef.current?.click();
  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = ''; // 같은 파일을 다시 선택할 수 있게 비움
  };
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();

  const removeImage = (idx: number) => setImages(images.filter((_, i) => i !== idx));

  const scrollToStep = (id: string) => {
    setActiveStep(id);
    document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const stepCompleted = (id: string) => {
    if (id === 'info') return Boolean(brand && model && category);
    if (id === 'photos') return images.length > 0; // 설명은 필수 아님
    if (id === 'price') return Boolean(price);
    if (id === 'shipping') return Boolean(shippingType);
    return false;
  };

  return (
    <main className="bg-surface min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-6">
      <nav className="flex items-center gap-1 text-14 text-fg mb-4">
        <button className="hover:text-fg">내 상품 목록</button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-fg font-medium truncate max-w-md">
          {title || '새 상품 등록'}
        </span>
      </nav>
      {/* 임시 저장본 이어서 작성 안내 */}
      {draftPrompt && (
        <div className="mb-4 border border-fg bg-bg px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <p className="font-bold">작성하던 내용이 있어요. 이어서 작성할까요?</p>
            <p className="text-12 text-muted mt-1">
              {new Date(draftPrompt.savedAt).toLocaleString('ko-KR')}에 저장됨. 사진은 저장되지 않아 다시 올려야 해요.
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={restoreDraft} className="bg-fg text-bg px-4 h-10 text-14 font-bold rounded-none">
              이어서 작성
            </button>
            <button type="button" onClick={discardDraft} className="border border-line px-4 h-10 text-14 font-bold rounded-none hover:border-muted">
              버리기
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <aside className="lg:col-span-3">
          <div className="sticky top-24 space-y-1">
            <ol className="relative">
              {STEPS.map((step, idx) => {
                const isActive = activeStep === step.id;
                const isDone = stepCompleted(step.id);
                return (
                  <li key={step.id} className="relative pl-10 pb-6 last:pb-0">
                    {idx < STEPS.length - 1 && (
                      <span
                        className={`absolute left-3 top-6 bottom-0 w-0.5 -ml-px ${
                          isDone ? 'bg-fg' : 'bg-line'
                        }`}
                      />
                    )}
                    <button
                      onClick={() => scrollToStep(step.id)}
                      className="flex items-center gap-3 w-full text-left group"
                    >
                      <span
                        className={`absolute left-0 top-0 w-6 h-6 rounded-full flex items-center justify-center border-2 transition ${
                          isDone
                            ? 'bg-fg border-fg text-bg'
                            : isActive
                            ? 'bg-bg border-fg text-fg'
                            : 'bg-bg border-line text-muted'
                        }`}
                      >
                        {isDone ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <span className="text-12 font-bold">{idx + 1}</span>
                        )}
                      </span>
                      <span
                        className={`font-bold transition ${
                          isActive ? 'text-fg' : 'text-muted group-hover:text-fg'
                        }`}
                      >
                        {step.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>

        <div className="lg:col-span-9 space-y-6">
          <section
            id="section-info"
            className="bg-bg border border-line rounded-none py-6 px-10"
          >
            <h2 className="text-24 font-bold mb-2">제품 정보</h2>
            <div className="space-y-4">
              {/* 카테고리 — 풀패스("앰프 > 프리앰프")로 검색·표시. 선택 시 상위/하위 분리 저장 */}
              <div>
                <label className="block font-bold mb-1">
                  카테고리 <span className="inline-block w-1.5 h-1.5 rounded-full bg-danger align-middle ml-1" aria-label="필수" />
                </label>
                <Typeahead
                  value={
                    category && subcategory
                      ? `${category} > ${subcategory}`
                      : category
                  }
                  onChange={(path) => {
                    // X 버튼 등으로 빈 값이 오면 카테고리/하위 둘 다 초기화
                    if (!path) {
                      setCategory('');
                      setSubcategory('');
                      return;
                    }
                    const found = CATEGORY_PATHS.find((p) => p.path === path);
                    if (found) {
                      setCategory(found.top);
                      setSubcategory(found.leaf);
                    }
                  }}
                  options={CATEGORY_PATH_STRINGS}
                  enableKeyboardLayout
                />
              </div>

              {/* 1. 브랜드 — 한글 별칭(예: '맥킨토시' → McIntosh) 매칭 지원 */}
              <div>
                <label className="block font-bold mb-1">
                  브랜드 <span className="inline-block w-1.5 h-1.5 rounded-full bg-danger align-middle ml-1" aria-label="필수" />
                </label>
                <Typeahead
                  value={brand}
                  onChange={(v) => {
                    setBrand(v);
                    setModel(''); // 브랜드 바꾸면 모델 초기화
                  }}
                  options={brandOptions}
                  freeText
                  enableKeyboardLayout
                  hideUntilTyping
                  filter={(q, opts) => {
                    const ranked = searchBrands(q, 50).map((b) => b.name); // 사전 브랜드(한글 별칭 포함) 순위
                    const set = new Set(opts);
                    const nq = q.replace(/[\s&\-/]+/g, '').toLowerCase();
                    const extra = listingOnlyBrands.filter((n) => nq && n.replace(/[\s&\-/]+/g, '').toLowerCase().includes(nq)); // 사전에 없는 매물 브랜드
                    return [...ranked.filter((n) => set.has(n)), ...extra];
                  }}
                />
              </div>

              {/* 2. 모델 — 브랜드 + 카테고리(subcategory)가 둘 다 일치하는 모델만 후보로 (사전 CATALOG 모델 + 기존 매물 모델 합집합)
                  - 브랜드 미선택 → 후보 없음 (직접 입력만 가능)
                  - 카테고리 미선택 → 해당 브랜드의 전체 모델
                  - 카테고리 선택됨 → 해당 브랜드 + 그 카테고리(예: '프리앰프')만 */}
              <div>
                <label className="block font-bold mb-1">
                  모델 <span className="inline-block w-1.5 h-1.5 rounded-full bg-danger align-middle ml-1" aria-label="필수" />
                </label>
                <Typeahead
                  value={model}
                  onChange={setModel}
                  freeText
                  options={
                    brand
                      ? Array.from(
                          new Set([
                            ...CATALOG.filter((c) => c.brand === brand && (!subcategory || c.category === subcategory)).map((c) => c.model),
                            ...listingBrandModels.filter((x) => x.brand === brand && (!subcategory || x.categories.includes(subcategory))).map((x) => x.model),
                          ])
                        )
                      : []
                  }
                />
              </div>

              {/* 3. 출시 연도 — 플래그 켜짐: '대략'이면 specs.yearApprox = true(표시 '약 1975년', 필터는 그 연도로 비교), '모름'이면 칸 비활성 + 비워 저장
                  플래그 꺼짐(FEATURE_FLAGS.yearApprox): 숫자 칸만 */}
              <div>
                <label className="block font-bold mb-1">출시 연도</label>
                {FEATURE_FLAGS.yearApprox ? (
                <div className="flex items-center gap-4">
                  <input
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    disabled={yearUnknown}
                    placeholder=""
                    className="flex-1 min-w-0 border border-line rounded-none px-3 py-2 focus:outline-none focus:border-fg disabled:bg-surface disabled:text-muted disabled:cursor-not-allowed"
                  />
                  <label className="flex items-center gap-2 cursor-pointer text-14 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={yearApprox}
                      disabled={yearUnknown}
                      onChange={(e) => setYearApprox(e.target.checked)}
                      className="accent-fg w-4 h-4"
                    />
                    대략
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-14 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={yearUnknown}
                      onChange={(e) => {
                        setYearUnknown(e.target.checked);
                        if (e.target.checked) { setYear(''); setYearApprox(false); } // 모름이면 연도와 대략을 비움
                      }}
                      className="accent-fg w-4 h-4"
                    />
                    모름
                  </label>
                </div>
                ) : (
                <input
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder=""
                  className="w-full border border-line rounded-none px-3 py-2 focus:outline-none focus:border-fg"
                />
                )}
              </div>

              {/* 4. 제조국 */}
              <div>
                <label className="block font-bold mb-1">제조국</label>
                <Typeahead value={country} onChange={setCountry} options={COUNTRIES} />
              </div>

              {/* 6. 구성품 — 플래그 켜짐: 공통 7개 체크 카드 + 기타 구성품 글(specs.components 키 배열, specs.componentsOther 글)
                  플래그 꺼짐(FEATURE_FLAGS.componentChecks): 전처럼 자유 글 한 칸(specs.components 글) */}
              <div>
                <label className="block font-bold mb-1">구성품</label>
                {FEATURE_FLAGS.componentChecks && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {COMPONENT_OPTS.map((o) => {
                    const on = components.includes(o.value);
                    return (
                      <label
                        key={o.value}
                        className={`flex items-center gap-2 border rounded-none px-3 h-[42px] text-14 cursor-pointer ${on ? 'border-fg bg-surface' : 'border-line hover:border-muted'}`}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => setComponents((p) => (on ? p.filter((x) => x !== o.value) : [...p, o.value]))}
                          className="accent-fg w-4 h-4"
                        />
                        {o.label}
                      </label>
                    );
                  })}
                </div>
                )}
                <input
                  value={componentsOther}
                  onChange={(e) => setComponentsOther(e.target.value)}
                  placeholder={FEATURE_FLAGS.componentChecks ? '기타 구성품 (예: 예비 진공관, 스파이크)' : ''}
                  className={`${FEATURE_FLAGS.componentChecks ? 'mt-2 ' : ''}w-full h-[42px] border border-line rounded-none px-3 py-2 focus:outline-none focus:border-fg`}
                />
              </div>

              {/* 7. 상태 — 종류 4개(CONDITIONS). 중고(used)일 때만 아래의 외관 상태, 작동 상태 활성화(둘 다 선택 사항) */}
              <div>
                <label className="block font-bold mb-1">
                  상태 <span className="inline-block w-1.5 h-1.5 rounded-full bg-danger align-middle ml-1" aria-label="필수" />
                </label>
                {/* 선택 부품(ChoiceField): 상태는 예외 목록(CHOICE_DROPDOWN_ONLY)에 있어 늘 드롭다운. 버튼이 되더라도 필수라 다시 눌러도 해제 안 됨 */}
                <ChoiceField
                  fieldKey="condition"
                  ariaLabel="상태"
                  options={CONDITIONS}
                  value={condition}
                  onChange={onConditionChange}
                  allowClear={false}
                  dropdown={
                    <div className="relative">
                      <select
                        value={condition}
                        onChange={(e) => onConditionChange(e.target.value)}
                        className={`w-full appearance-none border border-line rounded-none pl-3 pr-9 py-2 h-[42px] focus:outline-none focus:border-fg bg-bg ${
                          condition ? '' : 'text-muted'
                        }`}
                      >
                        <option value="" disabled>선택하세요</option>
                        {CONDITIONS.map((c) => (
                          <option key={c.value} value={c.value} className="text-fg">{c.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                    </div>
                  }
                />
                {/* 고른 상태의 정의 한 줄 */}
                {desc('condition', condition) && <p className="mt-1 text-12 text-muted">{desc('condition', condition)}</p>}
              </div>

              {/* 소유권 — 드롭다운(1인/다중). 중고(used)일 때만 활성화. 필수 아님. FEATURE_FLAGS.ownership 꺼지면 칸만 숨김(저장 로직 그대로) */}
              {FEATURE_FLAGS.ownership && (
              <div>
                <label className={`block font-bold mb-1 ${condition === 'used' ? '' : 'text-muted'}`}>소유권</label>
                <ChoiceField
                  fieldKey="ownership"
                  ariaLabel="소유권"
                  options={OWNERSHIP_OPTIONS}
                  value={ownership}
                  onChange={setOwnership}
                  disabled={condition !== 'used'}
                  dropdown={
                    <div className="relative">
                      <select
                        value={ownership}
                        onChange={(e) => setOwnership(e.target.value)}
                        disabled={condition !== 'used'}
                        className={`w-full appearance-none border border-line rounded-none pl-3 pr-9 py-2 h-[42px] focus:outline-none focus:border-fg bg-bg disabled:bg-surface disabled:text-muted disabled:cursor-not-allowed ${
                          ownership ? '' : 'text-muted'
                        }`}
                      >
                        <option value="" disabled>선택하세요</option>
                        {OWNERSHIP_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value} className="text-fg">{opt.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                    </div>
                  }
                />
              </div>
              )}

              {/* 8. 외관 상태 — 중고(used)일 때만 활성화, 새 제품 상태(새상품, 미개봉, NOS)면 숨김. 선택 사항 */}
              {!usedFieldsHidden && (
              <div>
                <label className={`block font-bold mb-1 ${condition === 'used' ? '' : 'text-muted'}`}>외관 상태</label>
                {/* 선택 부품(ChoiceField): 예외 목록(CHOICE_DROPDOWN_ONLY)에 있어 늘 드롭다운 — 예전 모양 [드롭다운][자세히 칸] 한 줄.
                    목록에서 빼면 선택지 수로 버튼이 되고, 그때 자세히 칸은 버튼 아래 줄로 */}
                {(() => {
                  const asButtons = choiceAsButtons(APPEARANCE_OPTIONS.length, false, 'appearance');
                  const detailInput = (
                    <input
                      value={conditionAppearanceDetail}
                      onChange={(e) => setConditionAppearanceDetail(e.target.value)}
                      disabled={condition !== 'used'}
                      placeholder=""
                      aria-label="외관 상태 자세히"
                      className={`${asButtons ? 'mt-2 w-full' : 'flex-1 min-w-0'} h-[42px] border border-line rounded-none px-3 py-2 focus:outline-none focus:border-fg disabled:bg-surface disabled:text-muted disabled:cursor-not-allowed`}
                    />
                  );
                  return (
                    <>
                      <ChoiceField
                        fieldKey="appearance"
                        ariaLabel="외관 상태"
                        options={APPEARANCE_OPTIONS}
                        value={conditionAppearance}
                        onChange={setConditionAppearance}
                        disabled={condition !== 'used'}
                        dropdown={
                          <div className="flex gap-2">
                            <div className="relative w-36 flex-shrink-0">
                              <select
                                value={conditionAppearance}
                                onChange={(e) => setConditionAppearance(e.target.value)}
                                disabled={condition !== 'used'}
                                className={`w-full appearance-none border border-line rounded-none pl-3 pr-9 py-2 h-[42px] focus:outline-none focus:border-fg bg-bg disabled:bg-surface disabled:text-muted disabled:cursor-not-allowed ${
                                  conditionAppearance ? '' : 'text-muted'
                                }`}
                              >
                                <option value="" disabled>선택</option>
                                {APPEARANCE_OPTIONS.map((o) => (
                                  <option key={o.value} value={o.value} className="text-fg">{o.label}</option>
                                ))}
                              </select>
                              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                            </div>
                            {detailInput}
                          </div>
                        }
                      />
                      {asButtons && detailInput}
                    </>
                  );
                })()}
                {desc('appearance', conditionAppearance) && <p className="mt-1 text-12 text-muted">{desc('appearance', conditionAppearance)}</p>}
              </div>
              )}

              {/* 9. 작동 상태 — 중고(used)일 때만 활성화, 새 제품 상태면 숨김. 선택 사항 */}
              {!usedFieldsHidden && (
              <div>
                <label className={`block font-bold mb-1 ${condition === 'used' ? '' : 'text-muted'}`}>작동 상태</label>
                {/* 선택 부품(ChoiceField): 예외 목록(CHOICE_DROPDOWN_ONLY)에 있어 늘 드롭다운 — 예전 모양 [드롭다운][자세히 칸] 한 줄.
                    목록에서 빼면 선택지 수로 버튼이 되고, 그때 자세히 칸은 버튼 아래 줄로 */}
                {(() => {
                  const asButtons = choiceAsButtons(WORKING_OPTIONS.length, false, 'working');
                  const detailInput = (
                    <input
                      value={conditionWorkingDetail}
                      onChange={(e) => setConditionWorkingDetail(e.target.value)}
                      disabled={condition !== 'used'}
                      placeholder=""
                      aria-label="작동 상태 자세히"
                      className={`${asButtons ? 'mt-2 w-full' : 'flex-1 min-w-0'} h-[42px] border border-line rounded-none px-3 py-2 focus:outline-none focus:border-fg disabled:bg-surface disabled:text-muted disabled:cursor-not-allowed`}
                    />
                  );
                  return (
                    <>
                      <ChoiceField
                        fieldKey="working"
                        ariaLabel="작동 상태"
                        options={WORKING_OPTIONS}
                        value={conditionWorking}
                        onChange={setConditionWorking}
                        disabled={condition !== 'used'}
                        dropdown={
                          <div className="flex gap-2">
                            <div className="relative w-36 flex-shrink-0">
                              <select
                                value={conditionWorking}
                                onChange={(e) => setConditionWorking(e.target.value)}
                                disabled={condition !== 'used'}
                                className={`w-full appearance-none border border-line rounded-none pl-3 pr-9 py-2 h-[42px] focus:outline-none focus:border-fg bg-bg disabled:bg-surface disabled:text-muted disabled:cursor-not-allowed ${
                                  conditionWorking ? '' : 'text-muted'
                                }`}
                              >
                                <option value="" disabled>선택</option>
                                {WORKING_OPTIONS.map((o) => (
                                  <option key={o.value} value={o.value} className="text-fg">{o.label}</option>
                                ))}
                              </select>
                              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                            </div>
                            {detailInput}
                          </div>
                        }
                      />
                      {asButtons && detailInput}
                    </>
                  );
                })()}
                {desc('working', conditionWorking) && <p className="mt-1 text-12 text-muted">{desc('working', conditionWorking)}</p>}
              </div>
              )}

              {/* 10. 정비 이력 — 모든 카테고리 공통(예전엔 카세트 기술 사양 칸). 저장 자리는 그대로 specs.tech.maintenance.
                  중고(used)일 때만 활성화. 선택지에 없는 정비는 직접 입력. 보이기는 FEATURE_FLAGS.maintenance 만 정함(상태 분기 없음) */}
              {FEATURE_FLAGS.maintenance && (
              <div>
                <label className={`block font-bold mb-1 ${condition === 'used' ? '' : 'text-muted'}`}>정비 이력</label>
                {/* 선택 부품: 6개라 버튼 토글(직접 입력은 드롭다운일 때만) */}
                <ChoiceField
                  multiple
                  fieldKey="maintenance"
                  ariaLabel="정비 이력"
                  options={MAINTENANCE_OPTS}
                  values={maintenance}
                  onChange={setMaintenance}
                  disabled={condition !== 'used'}
                  dropdown={<MultiSelectDropdown options={MAINTENANCE_OPTS} selected={maintenance} onChange={setMaintenance} disabled={condition !== 'used'} />}
                />
              </div>
              )}

              {/* 상품명 — 브랜드+모델+하위카테고리 자동 반영, 수정·자유입력 가능 (필수) */}
              <div>
                <label className="block font-bold mb-1">
                  상품명 <span className="inline-block w-1.5 h-1.5 rounded-full bg-danger align-middle ml-1" aria-label="필수" />
                </label>
                <input
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); setTitleEdited(true); }}
                  placeholder=""
                  className="w-full h-[42px] border border-line rounded-none px-3 py-2 focus:outline-none focus:border-fg"
                />
              </div>

              {/* 핸드메이드(자작품) 여부 — 브랜드와 별개 차원의 태그. 브랜드/모델은 직접 입력 활용
                  FEATURE_FLAGS.handmadeField 가 꺼져 있으면 칸만 숨김(저장 로직 그대로, 기본 false) */}
              {FEATURE_FLAGS.handmadeField && (
              <div>
                <label className="block font-bold mb-1">핸드메이드 제품인가요?</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={handmade}
                    onChange={(e) => setHandmade(e.target.checked)}
                    className="accent-fg w-4 h-4"
                  />
                  <span className="text-14 text-muted">직접 만든 수제품입니다.</span>
                </label>
              </div>
              )}
            </div>
          </section>

          {/* 기술 사양 — 카테고리별 스키마가 있으면 그걸로(앰프 등), 없으면 기존 SPEC_FIELDS 폴백 */}
          <section className="bg-bg border border-line rounded-none py-6 px-10">
            <button
              type="button"
              onClick={() => setTechExpanded((v) => !v)}
              className="w-full flex items-center justify-between text-left"
            >
              <h2 className="text-24 font-bold">기술 사양</h2>
              <ChevronDown className={`w-6 h-6 text-muted transition-transform ${techExpanded ? 'rotate-180' : ''}`} />
            </button>
            {techExpanded && (
            <div className="mt-4">
            {SPEC_FIELDS_BY_CATEGORY[category] ? (
              <div className="space-y-4">
                {(() => {
                // 필드 하나 그리기 (핵심/상세 어느 쪽이든 같은 모양)
                const renderSpecField = (f: CategorySpecField) => {
                  // 형식(패시브/액티브)·서브우퍼 등 조건부 필드: 표시 조건 불충족 시 숨김
                  if (f.showWhen && !f.showWhen({ ...specs, __sub: subcategory })) return null;
                  // 사운드바 형식(액티브), AV 리시버 증폭 방식(솔리드 스테이트)은 자동 설정 — 칸은 숨김(값은 저장됨)
                  if (isAutoFixedField(f.key)) return null;
                  const setSpec = (v: string) => setSpecs({ ...specs, [f.key]: v });
                  // ── 타입: 카테고리에서 자동 입력 (읽기 전용) ──
                  if (f.input.kind === 'auto') {
                    return (
                      <div key={f.key} className="spec-field">
                        <label>{f.label}</label>
                        <input
                          value={subcategory || category}
                          readOnly
                          className="w-full h-[42px] border border-line rounded-none px-3 py-2 bg-surface text-muted cursor-default"
                        />
                      </div>
                    );
                  }
                  // ── 하나 고르기 — 선택 부품(ChoiceField): 선택지 5개 이하면 각진 버튼 한 줄(다시 누르면 해제), 6개 이상이면 아래 드롭다운 ──
                  if (f.input.kind === 'select') {
                    const v = specs[f.key] || '';
                    return (
                      <div key={f.key} className="spec-field">
                        <label>{f.label}</label>
                        <ChoiceField
                          fieldKey={f.key}
                          ariaLabel={f.label}
                          options={f.input.options}
                          value={v}
                          onChange={setSpec}
                          buttonText={CHOICE_BUTTON_TEXT[f.key]}
                          dropdown={
                        <div className="relative">
                          <select
                            value={v}
                            onChange={(e) => setSpec(e.target.value)}
                            className={`w-full appearance-none border border-line rounded-none pl-3 ${v ? 'pr-16' : 'pr-9'} py-2 h-[42px] focus:outline-none focus:border-fg bg-bg ${
                              v ? '' : 'text-muted'
                            }`}
                          >
                            <option value="" disabled>선택하세요</option>
                            {f.input.options.map((o) => {
                              // 문자열(앰프: 저장=표시) 또는 {value,label}(스피커: 저장=영문키, 표시=한글)
                              const opt = typeof o === 'string' ? { value: o, label: o } : o;
                              return <option key={opt.value} value={opt.value} className="text-fg">{opt.label}</option>;
                            })}
                          </select>
                          {/* 선택값 있으면 화살표 왼쪽에 X (초기화) */}
                          {v && (
                            <button
                              type="button"
                              aria-label="초기화"
                              onClick={() => setSpec('')}
                              className="absolute right-8 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-muted hover:text-fg rounded-full hover:bg-surface"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                          <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                        </div>
                          }
                        />
                      </div>
                    );
                  }
                  // ── 검색 드롭다운(Typeahead) 단일 선택 — 옵션 많은 칸(인클로저) ──
                  if (f.input.kind === 'searchSelect') {
                    const aliases = f.input.aliases;
                    // 영어 별칭으로도 매칭: 한글 옵션 또는 영어 검색어에 검색어 포함 (공백·하이픈 무시)
                    const filterFn = aliases
                      ? (q: string, opts: string[]) => {
                          const norm = (s: string) => s.replace(/[\s&\-/]+/g, '').toLowerCase();
                          const nq = norm(q);
                          return opts.filter((o) => norm(o).includes(nq) || norm(aliases[o] || '').includes(nq));
                        }
                      : undefined;
                    // 화면은 한글 라벨로 고르고, 저장은 목록 라벨과 같으면 영문 키(optValue) / 목록에 없는 글은 친 그대로
                    const opts = f.input.options;
                    return (
                      <div key={f.key} className="spec-field">
                        <label>{f.label}</label>
                        <Typeahead
                          value={optLabel(opts, specs[f.key] || '')}
                          onChange={(text) => setSpec(optValue(opts, text))}
                          options={optLabels(opts)}
                          filter={filterFn}
                          enableKeyboardLayout={f.input.keyboardLayout}
                          freeText
                          placeholder="검색 또는 선택"
                        />
                      </div>
                    );
                  }
                  // ── 자유 입력 (+ 단위) ──
                  if (f.input.kind === 'text') {
                    const unit = f.input.unit;
                    const free = f.input.free; // 자유 텍스트면 숫자 필터 X
                    return (
                      <div key={f.key} className="spec-field">
                        <label>{f.label}</label>
                        <div className="relative">
                          <input
                            value={specs[f.key] || ''}
                            onChange={(e) => setSpec(free ? e.target.value : numOnly(e.target.value))}
                            inputMode={free ? 'text' : 'decimal'}
                            placeholder=""
                            className={`w-full h-[42px] border border-line rounded-none pl-3 py-2 focus:outline-none focus:border-fg ${
                              unit ? 'pr-10' : 'pr-3'
                            }`}
                          />
                          {unit && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-14 pointer-events-none">
                              {unit}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }
                  // ── 여러 줄 자유 글 (기타 사양) — 줄바꿈 그대로 저장 ──
                  if (f.input.kind === 'textarea') {
                    return (
                      <div key={f.key} className="spec-field">
                        <label>{f.label}</label>
                        <SpecTextarea value={specs[f.key] || ''} onChange={setSpec} maxLength={f.input.maxLength} placeholder={f.input.placeholder} />
                      </div>
                    );
                  }
                  // ── 숫자 + 오른쪽 드롭다운 (예: 앰프 출력값 + RMS/Peak) ──
                  if (f.input.kind === 'numSelect') {
                    const unit = f.input.unit;
                    const typeKey = `${f.key}Type`;
                    const typeVal = specs[typeKey] || '';
                    return (
                      <div key={f.key} className="spec-field">
                        <label>{f.label}</label>
                        <div className="flex gap-2 items-center -mr-6">
                          <div className="relative flex-[3_1_44px] min-w-0">
                            <input
                              value={specs[f.key] || ''}
                              onChange={(e) => setSpec(numOnly(e.target.value))}
                              inputMode="decimal"
                              className={`w-full h-[42px] border border-line rounded-none pl-3 ${unit ? 'pr-10' : 'pr-3'} py-2 focus:outline-none focus:border-fg`}
                            />
                            {unit && (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-14 pointer-events-none">{unit}</span>
                            )}
                          </div>
                          <span className="text-muted">×</span>
                          <div className="relative flex-1 min-w-0">
                            <select
                              value={typeVal}
                              onChange={(e) => setSpecs({ ...specs, [typeKey]: e.target.value })}
                              className={`w-full appearance-none border border-line rounded-none pl-3 ${typeVal ? 'pr-14' : 'pr-8'} py-2 h-[42px] focus:outline-none focus:border-fg bg-bg ${typeVal ? '' : 'text-muted'}`}
                            >
                              <option value="" disabled>선택</option>
                              {f.input.options.map((o) => (
                                <option key={o} value={o} className="text-fg">{o}</option>
                              ))}
                            </select>
                            {typeVal && (
                              <button
                                type="button"
                                aria-label="초기화"
                                onClick={() => setSpecs({ ...specs, [typeKey]: '' })}
                                className="absolute right-7 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-muted hover:text-fg rounded-full hover:bg-surface"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                          </div>
                          <div className="w-5 flex-shrink-0" />
                        </div>
                      </div>
                    );
                  }
                  // ── 정격 출력: 출력값(W) + 기준 옴 쌍, +추가 가능 ──
                  if (f.input.kind === 'power') {
                    const ohmOpts = f.input.ohmOptions ?? AMP_OHM_OPTS;
                    return (
                      <div key={f.key} className="spec-field">
                        <label>{f.label}</label>
                        <div className="space-y-2">
                          {powerPairs.map((p, idx) => (
                            <div key={idx} className="flex gap-2 items-center -mr-6">
                              {/* 출력값: 남는 공간 전부 (flex-1) */}
                              <div className="relative flex-1 min-w-0">
                                <input
                                  value={p.w}
                                  onChange={(e) => {
                                    const pairs = powerPairs.map((x, i) => (i === idx ? { ...x, w: numOnly(e.target.value) } : x));
                                    setPowerPairs(pairs);
                                    setSpecs({ ...specs, [f.key]: buildPower(pairs) });
                                  }}
                                  inputMode="decimal"
                                  placeholder="출력값"
                                  className="w-full h-[42px] border border-line rounded-none pl-3 pr-9 py-2 focus:outline-none focus:border-fg"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-14 pointer-events-none">W</span>
                              </div>
                              <span className="text-muted">@</span>
                              {/* 기준 옴: w-28 고정 */}
                              <div className="relative w-28 flex-shrink-0">
                                <select
                                  value={p.ohm}
                                  onChange={(e) => {
                                    const pairs = powerPairs.map((x, i) => (i === idx ? { ...x, ohm: e.target.value } : x));
                                    setPowerPairs(pairs);
                                    setSpecs({ ...specs, [f.key]: buildPower(pairs) });
                                  }}
                                  className={`w-full appearance-none border border-line rounded-none pl-3 ${p.ohm ? 'pr-14' : 'pr-8'} py-2 h-[42px] focus:outline-none focus:border-fg bg-bg ${p.ohm ? '' : 'text-muted'}`}
                                >
                                  <option value="" disabled>기준</option>
                                  {ohmOpts.map((o) => (
                                    <option key={o} value={o} className="text-fg">{o}</option>
                                  ))}
                                </select>
                                {p.ohm && (
                                  <button
                                    type="button"
                                    aria-label="초기화"
                                    onClick={() => {
                                      const pairs = powerPairs.map((x, i) => (i === idx ? { ...x, ohm: '' } : x));
                                      setPowerPairs(pairs);
                                      setSpecs({ ...specs, [f.key]: buildPower(pairs) });
                                    }}
                                    className="absolute right-7 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-muted hover:text-fg rounded-full hover:bg-surface"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                              </div>
                              <span className="text-muted">×</span>
                              {/* 비고: 114px 고정 (기준 112보다 2px 넓게) */}
                              <input
                                value={p.note ?? ''}
                                onChange={(e) => {
                                  const pairs = powerPairs.map((x, i) => (i === idx ? { ...x, note: e.target.value } : x));
                                  setPowerPairs(pairs);
                                  setSpecs({ ...specs, [f.key]: buildPower(pairs) });
                                }}
                                placeholder="비고"
                                className="w-[114px] flex-shrink-0 h-[42px] border border-line rounded-none px-3 py-2 focus:outline-none focus:border-fg"
                              />
                              {powerPairs.length > 1 ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const pairs = powerPairs.filter((_, i) => i !== idx);
                                    setPowerPairs(pairs);
                                    setSpecs({ ...specs, [f.key]: buildPower(pairs) });
                                  }}
                                  aria-label="삭제"
                                  className="w-5 h-5 flex items-center justify-center text-muted hover:text-fg rounded-full hover:bg-surface flex-shrink-0"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              ) : (
                                <div className="w-5 flex-shrink-0" />
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => setPowerPairs((prev) => [...prev, { w: '', ohm: '', note: '' }])}
                            className="text-14 text-fg font-bold inline-flex items-center gap-1 hover:underline"
                          >
                            <Plus className="w-3.5 h-3.5" /> 임피던스별 출력 추가
                          </button>
                        </div>
                      </div>
                    );
                  }
                  // ── 주파수 응답: 하한~상한 2칸 ──
                  if (f.input.kind === 'range') {
                    const lowUnit = f.input.lowUnit, highUnit = f.input.highUnit;
                    const r = ranges[f.key] ?? { low: '', high: '' };
                    const setRange = (patch: Partial<{ low: string; high: string }>) => {
                      const nr = { ...r, ...patch };
                      setRanges((m) => ({ ...m, [f.key]: nr }));
                      setSpecs((s) => ({ ...s, [f.key]: buildFreq(nr.low, nr.high, lowUnit, highUnit) }));
                    };
                    return (
                      <div key={f.key} className="spec-field">
                        <label>{f.label}</label>
                        <div className="flex gap-2 items-center">
                          <div className="relative flex-1 min-w-0">
                            <input
                              value={r.low}
                              onChange={(e) => setRange({ low: numOnly(e.target.value) })}
                              inputMode="decimal"
                              placeholder="하한"
                              className="w-full h-[42px] border border-line rounded-none pl-3 pr-10 py-2 focus:outline-none focus:border-fg"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-14 pointer-events-none">{lowUnit}</span>
                          </div>
                          <span className="text-muted">~</span>
                          <div className="relative flex-1 min-w-0">
                            <input
                              value={r.high}
                              onChange={(e) => setRange({ high: numOnly(e.target.value) })}
                              inputMode="decimal"
                              placeholder="상한"
                              className="w-full h-[42px] border border-line rounded-none pl-3 pr-10 py-2 focus:outline-none focus:border-fg"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-14 pointer-events-none">{highUnit}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  // ── 크기: W × D × H 3칸, 각 칸 끝에 mm 단위 ──
                  if (f.input.kind === 'dimensions') {
                    const rows = dims[f.key] ?? [{ w: '', d: '', h: '', note: '' }];
                    const commit = (next: { w: string; d: string; h: string; note: string }[]) => {
                      setDims((m) => ({ ...m, [f.key]: next }));
                      setSpecs((s) => ({ ...s, [f.key]: buildDims(next) }));
                    };
                    const update = (i: number, patch: Partial<{ w: string; d: string; h: string; note: string }>) =>
                      commit(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
                    const dimInput = (val: string, axis: 'w' | 'd' | 'h', ph: string, i: number) => (
                      <div className="relative flex-1 min-w-0">
                        <input
                          value={val}
                          onChange={(e) => update(i, { [axis]: numOnly(e.target.value) })}
                          inputMode="decimal"
                          placeholder={ph}
                          className="w-full h-[42px] border border-line rounded-none pl-3 pr-9 py-2 focus:outline-none focus:border-fg"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted text-12 pointer-events-none">mm</span>
                      </div>
                    );
                    return (
                      <div key={f.key} className="spec-field">
                        <label>{f.label}</label>
                        <div className="space-y-2">
                          {rows.map((r, i) => (
                            <div key={i} className="flex gap-2 items-center -mr-6">
                              {dimInput(r.w, 'w', 'W', i)}
                              <span className="text-muted">×</span>
                              {dimInput(r.d, 'd', 'D', i)}
                              <span className="text-muted">×</span>
                              {dimInput(r.h, 'h', 'H', i)}
                              <span className="text-muted">×</span>
                              <div className="relative flex-1 min-w-0">
                                <input
                                  value={r.note}
                                  onChange={(e) => update(i, { note: e.target.value })}
                                  placeholder="비고"
                                  className="w-full h-[42px] border border-line rounded-none px-3 py-2 focus:outline-none focus:border-fg"
                                />
                              </div>
                              {rows.length > 1 ? (
                                <button
                                  type="button"
                                  aria-label="삭제"
                                  onClick={() => commit(rows.filter((_, idx) => idx !== i))}
                                  className="w-5 h-5 flex-shrink-0 flex items-center justify-center text-muted hover:text-fg rounded-full hover:bg-surface"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              ) : (
                                <div className="w-5 flex-shrink-0" />
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => commit([...rows, { w: '', d: '', h: '', note: '' }])}
                            className="text-14 text-fg font-bold inline-flex items-center gap-1 hover:underline"
                          >
                            <Plus className="w-3.5 h-3.5" /> 크기 추가
                          </button>
                        </div>
                      </div>
                    );
                  }
                  // ── 무게 빌더 (값+비고+추가 — 크기 dimensions와 통일) ──
                  if (f.input.kind === 'valueNote') {
                    const unit = f.input.unit;
                    const rows = valNotes[f.key] ?? [{ value: '', note: '' }];
                    const commit = (next: { value: string; note: string }[]) => {
                      setValNotes((m) => ({ ...m, [f.key]: next }));
                      setSpecs((s) => ({ ...s, [f.key]: buildValNotes(next, unit) }));
                    };
                    const update = (i: number, patch: Partial<{ value: string; note: string }>) =>
                      commit(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
                    return (
                      <div key={f.key} className="spec-field">
                        <label>{f.label}</label>
                        <div className="space-y-2">
                          {rows.map((r, i) => (
                            <div key={i} className="flex gap-2 items-center -mr-6">
                              {/* 값(kg) — 크기 W+D+H 3칸 + 그 사이 ×2개 폭(basis 44px=×2개분). 크기 행과 동일 컬럼 정렬 */}
                              <div className="relative flex-[3_1_44px] min-w-0">
                                <input
                                  value={r.value}
                                  onChange={(e) => update(i, { value: numOnly(e.target.value) })}
                                  inputMode="decimal"
                                  className={`w-full h-[42px] border border-line rounded-none pl-3 ${unit ? 'pr-9' : 'pr-3'} py-2 focus:outline-none focus:border-fg`}
                                />
                                {unit && (
                                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted text-12 pointer-events-none">{unit}</span>
                                )}
                              </div>
                              <span className="text-muted">×</span>
                              <div className="relative flex-1 min-w-0">
                                <input
                                  value={r.note}
                                  onChange={(e) => update(i, { note: e.target.value })}
                                  placeholder="비고"
                                  className="w-full h-[42px] border border-line rounded-none px-3 py-2 focus:outline-none focus:border-fg"
                                />
                              </div>
                              {rows.length > 1 ? (
                                <button
                                  type="button"
                                  aria-label="삭제"
                                  onClick={() => commit(rows.filter((_, idx) => idx !== i))}
                                  className="w-5 h-5 flex-shrink-0 flex items-center justify-center text-muted hover:text-fg rounded-full hover:bg-surface"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              ) : (
                                <div className="w-5 flex-shrink-0" />
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => commit([...rows, { value: '', note: '' }])}
                            className="text-14 text-fg font-bold inline-flex items-center gap-1 hover:underline"
                          >
                            <Plus className="w-3.5 h-3.5" /> {f.label} 추가
                          </button>
                        </div>
                      </div>
                    );
                  }
                  // ── 다중 선택 (지원 임피던스 / 입력·출력 단자) ──
                  if (f.input.kind === 'multi') {
                    const sel = f.key === 'impedance' ? impedances : (multiSel[f.key] ?? []);
                    const setSel = f.key === 'impedance' ? setImpedances : (next: string[] | ((p: string[]) => string[])) => setMultiSel((m) => ({ ...m, [f.key]: typeof next === 'function' ? next(m[f.key] ?? []) : next }));
                    // 선택 부품(ChoiceField): 선택지 6개 이하면 각진 버튼 토글(누른 순서대로 쌓임, 다시 누르면 해제), 7개 이상이면 기존 드롭다운
                    //   드롭다운 쪽: 임피던스 = 드롭다운 + 범위 표시(ImpedanceSelect) / 단자 등 = 검색 + 칩 + 직접 입력(MultiSelectDropdown)
                    //   회전수도 여기서 같이 (버튼 글자만 CHOICE_BUTTON_TEXT 로 '33⅓')
                    return (
                      <div key={f.key} className="spec-field">
                        <label>{f.label}</label>
                        <ChoiceField
                          multiple
                          fieldKey={f.key}
                          ariaLabel={f.label}
                          options={f.input.options}
                          values={sel}
                          onChange={setSel}
                          buttonText={CHOICE_BUTTON_TEXT[f.key]}
                          dropdown={
                            f.key === 'impedance' ? (
                              <ImpedanceSelect options={f.input.options as string[]} selected={sel} onChange={setSel} displayText={impedanceRange(sel)} />
                            ) : (
                              <MultiSelectDropdown options={f.input.options} selected={sel} onChange={setSel} aliases={TERMINAL_ALIASES} />
                            )
                          }
                        />
                      </div>
                    );
                  }
                  // ── 드라이버 구성 빌더 (스피커) ──
                  if (f.input.kind === 'drivers') {
                    return (
                      <div key={f.key} className="spec-field">
                        <label>{f.label}</label>
                        <DriverConfigBuilder rows={driverRows} onChange={setDriverRows} subwoofer={subcategory === '서브우퍼'} />
                      </div>
                    );
                  }
                  // ── 앰프 출력(액티브): 드라이버 종류 + 출력값(자유 입력) ──
                  if (f.input.kind === 'ampPower') {
                    return (
                      <div key={f.key} className="spec-field">
                        <label>{f.label}</label>
                        <AmpPowerBuilder rows={ampPowerRows} onChange={setAmpPowerRows} />
                      </div>
                    );
                  }
                  // ── 크로스오버: 주파수(Hz) 여러 개 + "크로스오버 추가" ──
                  if (f.input.kind === 'crossover') {
                    return (
                      <div key={f.key} className="spec-field">
                        <label>{f.label}</label>
                        <div className="space-y-2">
                          {crossoverValues.map((row, idx) => (
                            <div key={idx} className="flex gap-2 items-center -mr-6">
                              <input
                                value={row.value}
                                onChange={(e) => { const nv = numOnly(e.target.value); setCrossoverValues((prev) => prev.map((x, i) => (i === idx ? { ...x, value: nv } : x))); }}
                                inputMode="decimal"
                                className="flex-1 min-w-0 h-[42px] border border-line rounded-none px-3 py-2 focus:outline-none focus:border-fg"
                              />
                              <div className="relative w-24 flex-shrink-0">
                                <select
                                  value={row.unit}
                                  onChange={(e) => { const u = e.target.value; setCrossoverValues((prev) => prev.map((x, i) => (i === idx ? { ...x, unit: u } : x))); }}
                                  className="w-full appearance-none border border-line rounded-none pl-3 pr-8 h-[42px] bg-bg focus:outline-none focus:border-fg"
                                >
                                  <option value="Hz">Hz</option>
                                  <option value="kHz">kHz</option>
                                </select>
                                <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                              </div>
                              {crossoverValues.length > 1 ? (
                                <button
                                  type="button"
                                  aria-label="삭제"
                                  onClick={() => setCrossoverValues((prev) => prev.filter((_, i) => i !== idx))}
                                  className="w-5 h-5 flex items-center justify-center text-muted hover:text-fg rounded-full hover:bg-surface flex-shrink-0"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              ) : (
                                <div className="w-5 flex-shrink-0" />
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => setCrossoverValues((prev) => [...prev, { value: '', unit: 'Hz' }])}
                            className="text-14 text-fg font-bold inline-flex items-center gap-1 hover:underline"
                          >
                            <Plus className="w-3.5 h-3.5" /> 크로스오버 추가
                          </button>
                        </div>
                      </div>
                    );
                  }
                  // ── 진공관 빌더: 역할 + 종류(역할별 동적) + 개수 행 배열 + "진공관 추가" ──
                  if (f.input.kind === 'tubeBuilder') {
                    return (
                      <div key={f.key} className="spec-field">
                        <label>{f.label}</label>
                        <div className="space-y-2">
                          {tubeRows.map((row, idx) => {
                            const typeOpts = TUBE_TYPE_MAP[row.role] ?? [];
                            const update = (patch: Partial<{ role: string; type: string; qty: string }>) => {
                              const next = tubeRows.map((x, i) => (i === idx ? { ...x, ...patch } : x));
                              setTubeRows(next);
                              setSpecs({ ...specs, tubes: buildTubes(next) });
                            };
                            return (
                              <div key={idx} className="flex gap-2 items-center -mr-6">
                                {/* 역할 — 변경 시 종류 리셋. 선택 시 우측 X(역할+종류 둘 다 초기화), ▼ 왼쪽 */}
                                <div className="relative flex-1 min-w-0">
                                  <select
                                    value={row.role}
                                    onChange={(e) => update({ role: e.target.value, type: '' })}
                                    className={`w-full appearance-none border border-line rounded-none pl-3 ${row.role ? 'pr-14' : 'pr-8'} h-[42px] bg-bg focus:outline-none focus:border-fg ${row.role ? '' : 'text-muted'}`}
                                  >
                                    <option value="" disabled>역할</option>
                                    {TUBE_ROLE_OPTS.map((o) => (
                                      <option key={o} value={o} className="text-fg">{o}</option>
                                    ))}
                                  </select>
                                  {row.role && (
                                    <button
                                      type="button"
                                      aria-label="초기화"
                                      onClick={() => update({ role: '', type: '' })}
                                      className="absolute right-7 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-muted hover:text-fg rounded-full hover:bg-surface"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                                </div>
                                {/* 종류 — Typeahead(검색+직접입력). 역할별 동적 옵션, 역할 미선택 시 옵션 없음+직접입력 차단 */}
                                <div className="flex-1 min-w-0">
                                  <Typeahead
                                    value={row.type}
                                    onChange={(v) => update({ type: v })}
                                    options={typeOpts}
                                    freeText={!!row.role}
                                    placeholder="종류"
                                  />
                                </div>
                                {/* 개수 */}
                                <input
                                  value={row.qty}
                                  onChange={(e) => update({ qty: numOnly(e.target.value) })}
                                  inputMode="numeric"
                                  placeholder="개수"
                                  className="w-20 flex-shrink-0 h-[42px] border border-line rounded-none px-3 py-2 focus:outline-none focus:border-fg"
                                />
                                {/* 행삭제 (2행 이상일 때만) */}
                                {tubeRows.length > 1 ? (
                                  <button
                                    type="button"
                                    aria-label="삭제"
                                    onClick={() => { const next = tubeRows.filter((_, i) => i !== idx); setTubeRows(next); setSpecs({ ...specs, tubes: buildTubes(next) }); }}
                                    className="w-5 h-5 flex items-center justify-center text-muted hover:text-fg rounded-full hover:bg-surface flex-shrink-0"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <div className="w-5 flex-shrink-0" />
                                )}
                              </div>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => setTubeRows((prev) => [...prev, { role: '', type: '', qty: '' }])}
                            className="text-14 text-fg font-bold inline-flex items-center gap-1 hover:underline"
                          >
                            <Plus className="w-3.5 h-3.5" /> 진공관 추가
                          </button>
                        </div>
                      </div>
                    );
                  }
                  return null;
                };
                const fields = SPEC_FIELDS_BY_CATEGORY[category];
                const coreKeys = CORE_SPEC_KEYS[subcategory];
                // 분리 대상이 아니면 지금처럼 전부 한 번에
                if (!coreKeys) return fields.map(renderSpecField);
                // 분리 대상: 타입(auto)과 핵심 key는 위, 나머지는 '상세 사양' 접힘 영역. 순서는 스키마 순서 그대로
                // 화면에 실제로 그려지는 칸만 셈 (renderSpecField 의 숨김 규칙과 같게: showWhen, 자동 설정 칸)
                const visible = (f: CategorySpecField) => !(f.showWhen && !f.showWhen({ ...specs, __sub: subcategory })) && !isAutoFixedField(f.key);
                const isCore = (f: CategorySpecField) => f.input.kind === 'auto' || coreKeys.includes(f.key);
                const isAlways = (f: CategorySpecField) => ALWAYS_SPEC_KEYS.includes(f.key); // 크기, 무게: 핵심 맨 아래에 늘 표시
                const core = fields.filter((f) => isCore(f) && !isAlways(f));
                const always = fields.filter(isAlways);
                const detail = fields.filter((f) => !isCore(f) && !isAlways(f));
                const detailCount = detail.filter(visible).length;
                // 상세 모드 'custom'(DETAIL_MODE_BY_SUB): 상세 칸, 상세 버튼, 기타 사양 대신 [제목][내용] 자유 추가 (크기, 무게 빌더와 같은 칸 규칙)
                if (detailModeOf(subcategory) === 'custom') {
                  const updateRow = (i: number, patch: Partial<CustomSpecRow>) =>
                    setCustomSpecs((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
                  return (
                    <>
                      {core.map(renderSpecField)}
                      {always.map(renderSpecField)}
                      <div className="spec-field">
                        <div className="space-y-2">
                          {customSpecs.map((r, i) => (
                            <div key={i} className="flex gap-2 items-center -mr-6">
                              <input
                                value={r.title}
                                onChange={(e) => updateRow(i, { title: e.target.value })}
                                placeholder="제목"
                                aria-label={`사양 ${i + 1} 제목`}
                                className="flex-[2_1_0] min-w-0 h-[42px] border border-line rounded-none px-3 py-2 focus:outline-none focus:border-fg"
                              />
                              <input
                                value={r.value}
                                onChange={(e) => updateRow(i, { value: e.target.value })}
                                placeholder="내용"
                                aria-label={`사양 ${i + 1} 내용`}
                                className="flex-[3_1_0] min-w-0 h-[42px] border border-line rounded-none px-3 py-2 focus:outline-none focus:border-fg"
                              />
                              <button
                                type="button"
                                aria-label="삭제"
                                onClick={() => setCustomSpecs((rows) => rows.filter((_, idx) => idx !== i))}
                                className="w-5 h-5 flex-shrink-0 flex items-center justify-center text-muted hover:text-fg rounded-full hover:bg-surface"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => setCustomSpecs((rows) => [...rows, { title: '', value: '' }])}
                            className="text-14 text-fg font-bold inline-flex items-center gap-1 hover:underline"
                          >
                            <Plus className="w-3.5 h-3.5" /> 사양 추가
                          </button>
                        </div>
                      </div>
                    </>
                  );
                }
                return (
                  <>
                    {core.map(renderSpecField)}
                    {always.map(renderSpecField)}
                    {detailCount > 0 && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setDetailExpanded((v) => !v)}
                          aria-expanded={detailExpanded}
                          className="w-full flex items-center justify-between border border-line rounded-none px-4 h-[42px] text-14 font-bold text-fg bg-surface hover:border-fg"
                        >
                          <span>상세 사양 ({detailCount})</span>
                          <ChevronDown className={`w-4 h-4 text-muted ${detailExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        {detailExpanded && <div className="space-y-4 mt-4">{detail.map(renderSpecField)}</div>}
                      </div>
                    )}
                  </>
                );
                })()}
              </div>
            ) : (
              // 폴백: 카테고리별 스키마 없는 경우 기존 16개 자유 입력
              <div className="space-y-4">
                {(category ? SPEC_FIELDS : SPEC_FIELDS.filter((f) => f.key === 'type')).map((f) => (
                  <div key={f.key} className="spec-field">
                    <label>{f.label}</label>
                    {f.key === 'otherSpecs' ? (
                      // 기타 사양 — 스키마 칸(OTHER_SPECS_FIELD)과 같은 여러 줄 자유 글
                      <SpecTextarea value={specs[f.key] || ''} onChange={(v) => setSpecs({ ...specs, [f.key]: v })} maxLength={OTHER_SPECS_INPUT.maxLength} placeholder={OTHER_SPECS_INPUT.placeholder} />
                    ) : (
                    <input
                      value={specs[f.key] || ''}
                      onChange={(e) => setSpecs({ ...specs, [f.key]: e.target.value })}
                      placeholder=""
                      className="w-full border border-line rounded-none px-3 py-2 focus:outline-none focus:border-fg"
                    />
                    )}
                  </div>
                ))}
              </div>
            )}
            </div>
            )}
          </section>

          <h2 className="text-24 font-bold pl-2 pt-2">사진 및 설명</h2>

          <section
            id="section-photos"
            className="bg-bg border border-line rounded-none p-6"
          >
            <div className="flex items-baseline justify-between mb-1">
              <h3 className="text-20 font-bold">
                장비 사진을 업로드하세요 <span className="inline-block w-1.5 h-1.5 rounded-full bg-danger align-middle ml-1" aria-label="필수" />
              </h3>
            </div>
            <p className="text-14 text-fg mb-5">
              다른 사이트나 제조업체에서 가져온 스크린샷이나 사진은 허용되지 않습니다. 620×620px 이상의 정사각형 사진이 가장 좋습니다.
            </p>

            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-14 font-bold text-fg">예시</p>
                <button className="text-12 text-muted hover:text-fg">숨김</button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {PHOTO_EXAMPLES.map((ex) => (
                  <div key={ex.label} className="text-center">
                    <div className="aspect-square rounded-none overflow-hidden bg-bg border border-line mb-1">
                      <img src={ex.img} alt={ex.label} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-12 text-fg">{ex.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-12 text-muted mt-2">5장 이상 권장해요. 꼭 필요한 건 1장이에요.</p>
              <button className="text-14 text-fg hover:text-fg font-bold mt-3 inline-flex items-center gap-1">
                최고 품질의 사진을 위한 팁 <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* 실제 파일 선택용 input (숨김). 박스나 버튼을 클릭하면 이걸 트리거 */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={onFileInputChange}
              className="hidden"
            />
            <div
              onClick={openFilePicker}
              onDrop={onDrop}
              onDragOver={onDragOver}
              className="border-2 border-dashed border-line hover:border-fg hover:bg-surface rounded-none py-12 flex flex-col items-center justify-center text-center cursor-pointer transition"
            >
              <button
                type="button"
                className="px-4 py-2 border border-muted rounded-full bg-bg hover:bg-surface font-bold text-14 flex items-center gap-2 mb-3"
              >
                <Plus className="w-4 h-4" />
                사진 업로드
              </button>
              <Upload className="w-5 h-5 text-muted mb-1" />
              <p className="text-14 text-fg">
                또는 대표 이미지 포함 최대 <span className="font-bold">{MAX_IMAGES}장</span>까지 드래그 앤 드롭하세요.
              </p>
            </div>
            {/* 업로드 중 / 에러 표시 */}
            {uploadingCount > 0 && (
              <div className="mt-3 flex items-center gap-2 text-14 text-fg">
                <span className="inline-block w-4 h-4 border-2 border-line border-t-fg rounded-full animate-spin" />
                업로드 중… ({uploadingCount}장 처리 중)
              </div>
            )}
            {uploadError && (
              <div className="mt-3 rounded-none border border-line bg-bg px-4 py-2 text-14 text-danger">
                {uploadError}
              </div>
            )}

            {images.length > 0 && (
              <div className="mt-6">
                <p className="font-bold mb-3 pb-2 border-b border-line">사진</p>
                <p className="text-12 font-bold text-muted mb-2">대표</p>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-none overflow-hidden border-2 border-line bg-surface group"
                    >
                      <img src={img} alt={`등록 사진 ${idx + 1}`} className="w-full h-full object-contain" />
                      {idx === 0 && (
                        <span className="absolute top-1 left-1 px-2 py-1 bg-fg text-bg text-12 rounded">
                          대표
                        </span>
                      )}
                      <button
                        onClick={() => removeImage(idx)}
                        aria-label="사진 삭제"
                        className="absolute top-1 right-1 w-6 h-6 bg-fg/60 text-bg rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="bg-bg border border-line rounded-none p-6">
            <h3 className="text-20 font-bold mb-4">항목을 설명하세요.</h3>

            <div>
              <label className="block font-bold mb-1">
                이 상품과 그 상태에 대해 설명해 주세요
              </label>
              <div className="border border-line rounded-none overflow-hidden focus-within:border-fg">
                <div className="flex gap-1 px-2 py-2 border-b border-line bg-surface">
                  <button className="w-7 h-7 rounded hover:bg-line flex items-center justify-center text-fg">
                    <Bold className="w-4 h-4" />
                  </button>
                  <button className="w-7 h-7 rounded hover:bg-line flex items-center justify-center text-fg">
                    <Italic className="w-4 h-4" />
                  </button>
                  <button className="w-7 h-7 rounded hover:bg-line flex items-center justify-center text-fg">
                    <List className="w-4 h-4" />
                  </button>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder=""
                  rows={6}
                  className="w-full px-3 py-2 focus:outline-none resize-y"
                />
              </div>
              <p className="text-12 text-muted mt-1">{description.length}자 입력됨</p>
            </div>

            <div className="mt-4 pt-4 border-t border-line">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={asDescribed}
                  onChange={(e) => setAsDescribed(e.target.checked)}
                  className="mt-1 accent-fg w-4 h-4"
                />
                <div>
                  <p className="font-bold text-14">이 상품은 "설명한 그대로" 판매됩니다.</p>
                  <p className="text-12 text-muted mt-1">
                    "설명대로" 판매한 상품은 설명 약관 정책에 따라 제외됩니다. 따라서 판매자는 정확하고 상세한 상품 설명을 작성하고, 좋은 사진을 제공하며, 설명된 상태 그대로 상품을 구매자에게 배송할 의무가 있습니다.
                  </p>
                </div>
              </label>
            </div>

            <div className="mt-4 pt-4 border-t border-line">
              <button
                onClick={() => setSkuOpen(!skuOpen)}
                className="w-full flex items-center justify-between font-bold"
              >
                SKU
                <ChevronDown
                  className={`w-5 h-5 transition-transform ${skuOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {skuOpen && (
                <div className="mt-3">
                  <input
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder=""
                    className="w-full border border-line rounded-none px-3 py-2 focus:outline-none focus:border-fg"
                  />
                </div>
              )}
            </div>
          </section>

          <section className="bg-bg border border-line rounded-none p-6">
            <div className="flex items-center gap-2 mb-4">
              <Youtube className="w-5 h-5 text-fg" />
              <h3 className="text-20 font-bold">상품 목록에 YouTube 동영상을 삽입하세요</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block font-bold mb-1">유튜브 영상 링크를 붙여넣으세요</label>
                <input
                  value={youtubeLink}
                  onChange={(e) => setYoutubeLink(e.target.value)}
                  placeholder=""
                  className="w-full border border-line rounded-none px-3 py-2 focus:outline-none focus:border-fg"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">유튜브 영상을 검색하세요</label>
                <input
                  placeholder=""
                  className="w-full border border-line rounded-none px-3 py-2 focus:outline-none focus:border-fg"
                />
              </div>
            </div>
          </section>

          <h2 id="section-price" className="text-24 font-bold pl-2 pt-2">
            가격
          </h2>
          <section className="bg-bg border border-line rounded-none p-6">
            <div className="space-y-4">
              {/* 통화 — 판매 가격과 정가에 같이 적용. 환산 표시는 아직 없음(베타 3) */}
              <div className="max-w-[12rem]">
                <label className="block font-bold mb-1">통화</label>
                {/* 선택 부품: 2개라 버튼(늘 하나는 골라져 있어 해제 없음) */}
                <ChoiceField
                  fieldKey="currency"
                  ariaLabel="통화"
                  options={CURRENCY_OPTS.map((o) => ({ value: o.value, label: `${o.label} (${CURRENCY_SYMBOLS[o.value]})` }))}
                  value={currency}
                  onChange={setCurrency}
                  allowClear={false}
                  dropdown={
                    <div className="relative">
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full appearance-none border border-line rounded-none pl-3 pr-9 py-2 h-[42px] focus:outline-none focus:border-fg bg-bg"
                      >
                        {CURRENCY_OPTS.map((o) => (
                          <option key={o.value} value={o.value} className="text-fg">{o.label} ({CURRENCY_SYMBOLS[o.value]})</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                    </div>
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold mb-1">
                    판매 가격 <span className="inline-block w-1.5 h-1.5 rounded-full bg-danger align-middle ml-1" aria-label="필수" />
                  </label>
                  <div className="relative">
                    <input
                      value={price}
                      onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder=""
                      className="w-full border border-line rounded-none pl-3 pr-12 py-2 focus:outline-none focus:border-fg"
                    />
                    <span className="absolute right-3 top-2 text-muted">{CURRENCY_SYMBOLS[currency]}</span>
                  </div>
                </div>
                <div>
                  <label className="block font-bold mb-1">
                    정가 <span className="text-muted font-regular">(선택)</span>
                  </label>
                  <div className="relative">
                    <input
                      value={comparePrice}
                      onChange={(e) => setComparePrice(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder=""
                      className="w-full border border-line rounded-none pl-3 pr-12 py-2 focus:outline-none focus:border-fg"
                    />
                    <span className="absolute right-3 top-2 text-muted">{CURRENCY_SYMBOLS[currency]}</span>
                  </div>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptOffers}
                  onChange={(e) => setAcceptOffers(e.target.checked)}
                  className="accent-fg w-4 h-4"
                />
                <span className="font-bold">구매자의 가격 제안 받기</span>
              </label>
            </div>
          </section>

          {/* ============================================================
            * 시장 가격 비교 카드
            * - 사용자가 입력한 price 기준으로 보라(저렴) / 초록(적정) / 검정(비쌈) 영역에
            *   현재 가격 위치를 점·말풍선으로 표시.
            * - MARKET_MIN/MAX는 ⚠️ 임시 하드코딩. 추후 시장 데이터 기반 로직으로 교체 예정.
            * - FEATURE_FLAGS.marketPriceCard 가 꺼져 있으면 카드 전체를 그리지 않음(계산 코드는 그대로)
            * ============================================================ */}
          {FEATURE_FLAGS.marketPriceCard && (() => {
            const priceNum = parseInt(price || '0', 10);
            // ⚠️ 임시: 실제 시장 가격 데이터 유무 판단 로직으로 추후 교체.
            const hasMarketData = true;
            if (!hasMarketData) {
              return (
                <section className="bg-bg border border-line rounded-none p-6">
                  <h3 className="text-20 font-bold mb-2">가격 변동 내역</h3>
                  <p className="text-14 text-muted">
                    해당 제품의 시장 가격 데이터가 아직 없습니다.
                  </p>
                </section>
              );
            }
            const MARKET_MIN = 23_100_000;
            const MARKET_MAX = 28_000_000;
            const SPAN = MARKET_MAX - MARKET_MIN;
            const DISPLAY_MIN = MARKET_MIN - SPAN; // 막대 좌측 끝(0%)
            const DISPLAY_MAX = MARKET_MAX + SPAN; // 막대 우측 끝(100%)
            const positionPct = Math.max(
              0,
              Math.min(
                100,
                ((priceNum - DISPLAY_MIN) / (DISPLAY_MAX - DISPLAY_MIN)) * 100
              )
            );
            const zone =
              priceNum < MARKET_MIN
                ? 'low'
                : priceNum > MARKET_MAX
                ? 'high'
                : 'fair';
            const zoneLabel =
              zone === 'low'
                ? '저렴한 가격'
                : zone === 'high'
                ? '비싼 가격'
                : '합리적인 가격';
            const zoneColor =
              zone === 'low'
                ? 'text-muted'
                : zone === 'high'
                ? 'text-muted'
                : 'text-muted';
            const zoneMessage =
              zone === 'low'
                ? '평균 시장 가격대보다 저렴해요'
                : zone === 'high'
                ? '평균 시장 가격대보다 비싸요'
                : '현재 평균 시장 가격대 안에 있어요';

            return (
              <section className="bg-bg border border-line rounded-none p-6">
                <h3 className="text-20 font-bold mb-4">
                  이 제품은 <span className={zoneColor}>{zoneLabel}</span>이에요
                </h3>

                <div className="flex items-start gap-6">
                  <div className="flex items-start gap-2 text-14 text-fg max-w-[160px] flex-shrink-0">
                    <span>{zoneMessage}</span>
                    <Info className="w-4 h-4 mt-1 flex-shrink-0 text-muted" />
                  </div>

                  <div className="flex-1 pt-10">
                    <div className="relative">
                      {/* 현재 가격 말풍선 */}
                      {priceNum > 0 && (
                        <div
                          className="absolute -top-9 -translate-x-1/2 px-3 py-1 bg-bg border border-line rounded-full shadow-sm font-bold whitespace-nowrap text-14"
                          style={{ left: `${positionPct}%` }}
                        >
                          {priceNum.toLocaleString()}원
                          <span className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-2.5 h-2.5 bg-bg border-r border-b border-line rotate-45" />
                        </div>
                      )}

                      {/* 가격대 막대 (보라/초록/검정 3등분) */}
                      <div className="relative h-2 rounded-full overflow-visible">
                        <div className="absolute inset-0 flex rounded-full overflow-hidden">
                          <div className="flex-1 bg-muted" />
                          <div className="flex-1 bg-muted" />
                          <div className="flex-1 bg-fg" />
                        </div>
                        {/* 현재 가격 핸들(원형) */}
                        {priceNum > 0 && (
                          <div
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-bg border-[3px] border-muted shadow"
                            style={{ left: `${positionPct}%` }}
                          />
                        )}
                      </div>

                      {/* 양 경계 가격 라벨 */}
                      <div className="relative h-5 mt-3">
                        <span className="absolute left-[33.333%] -translate-x-1/2 text-14 text-muted">
                          {MARKET_MIN.toLocaleString()}원
                        </span>
                        <span className="absolute left-[66.666%] -translate-x-1/2 text-14 text-muted">
                          {MARKET_MAX.toLocaleString()}원
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              </section>
            );
          })()}

          <h2 id="section-shipping" className="text-24 font-bold pl-2 pt-2">
            배송
          </h2>
          <section className="bg-bg border border-line rounded-none p-6">
            <div className="space-y-2 mb-4">
              {[
                { value: 'free', label: '무료 배송', desc: '판매자가 배송비를 부담' },
                { value: 'flat', label: '고정 배송비', desc: '정해진 금액으로 부과' },
                { value: 'calculated', label: '배송비 별도', desc: '구매자 위치 기준으로 계산' }
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-none border-2 cursor-pointer transition ${
                    shippingType === opt.value
                      ? 'border-fg bg-surface'
                      : 'border-line hover:border-line'
                  }`}
                >
                  <input
                    type="radio"
                    name="shipping"
                    value={opt.value}
                    checked={shippingType === opt.value}
                    onChange={(e) => setShippingType(e.target.value as 'free' | 'flat' | 'calculated')}
                    className="mt-1 accent-fg"
                  />
                  <div>
                    <p className="font-bold">{opt.label}</p>
                    <p className="text-14 text-fg">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
            {shippingType === 'flat' && (
              <div>
                <label className="block font-bold mb-1">고정 배송비</label>
                <div className="relative max-w-xs">
                  <input
                    value={shippingCost}
                    onChange={(e) => setShippingCost(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder=""
                    className="w-full border border-line rounded-none pl-3 pr-12 py-2 focus:outline-none focus:border-fg"
                  />
                  <span className="absolute right-3 top-2 text-muted">원</span>
                </div>
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer mt-4 pt-4 border-t border-line">
              <input
                type="checkbox"
                checked={localPickup}
                onChange={(e) => setLocalPickup(e.target.checked)}
                className="accent-fg w-4 h-4"
              />
              <span className="font-bold">직거래 가능</span>
            </label>
            {/* 국가 + 지역 — 선택 사항. 지역 선택지는 국가에 따라(한국 17개 시/도, 일본 47개 도도부현). DB location 칸 하나에 국가 접두 키로 저장(kr_seoul, jp_tokyo) */}
            <div className="mt-4 grid grid-cols-2 gap-4 max-w-md">
              <div>
                <label className="block font-bold mb-1">국가</label>
                {/* 선택 부품: 2개라 버튼(늘 하나는 골라져 있어 해제 없음). 지역은 17개, 47개라 드롭다운 그대로 */}
                <ChoiceField
                  fieldKey="locationCountry"
                  ariaLabel="국가"
                  options={LOCATION_COUNTRY_OPTS}
                  value={locationCountry}
                  onChange={onLocationCountryChange}
                  allowClear={false}
                  dropdown={
                    <div className="relative">
                      <select
                        value={locationCountry}
                        onChange={(e) => onLocationCountryChange(e.target.value)}
                        className="w-full appearance-none border border-line rounded-none pl-3 pr-9 py-2 h-[42px] focus:outline-none focus:border-fg bg-bg"
                      >
                        {LOCATION_COUNTRY_OPTS.map((o) => (
                          <option key={o.value} value={o.value} className="text-fg">{o.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                    </div>
                  }
                />
              </div>
              <div>
                <label className="block font-bold mb-1">지역</label>
                <div className="relative">
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className={`w-full appearance-none border border-line rounded-none pl-3 pr-9 py-2 h-[42px] focus:outline-none focus:border-fg bg-bg ${
                      location ? '' : 'text-muted'
                    }`}
                  >
                    <option value="">선택하세요</option>
                    {locationOptsFor(locationCountry).map((o) => (
                      <option key={o.value} value={o.value} className="text-fg">{o.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                </div>
              </div>
            </div>
          </section>

          <div className="bg-bg border border-line rounded-none p-6">
            <div className="rounded-none bg-gradient-to-br from-surface/60 via-bg to-surface border border-line p-4 space-y-3 mb-5">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-none bg-line flex items-center justify-center flex-shrink-0">
                  <Tag className="w-4 h-4 text-fg" />
                </div>
                <div>
                  <p className="font-bold text-14">Resonance 판매 수수료</p>
                  <p className="text-12 text-fg">거래당 5% + 결제 수수료 2.7%</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-none bg-line flex items-center justify-center flex-shrink-0">
                  <Truck className="w-4 h-4 text-fg" />
                </div>
                <div>
                  <p className="font-bold text-14">배송 라벨</p>
                  <p className="text-12 text-fg">결제 시 할인된 배송비 이용 가능</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-none bg-line flex items-center justify-center flex-shrink-0">
                  <HelpCircle className="w-4 h-4 text-fg" />
                </div>
                <div>
                  <p className="font-bold text-14">등록 팁</p>
                  <p className="text-12 text-fg">자세한 사진과 정확한 설명일수록 빠르게 판매됩니다.</p>
                </div>
              </div>
            </div>

            {submitError && (
              <div className="mb-3 rounded-none border border-line bg-bg px-4 py-3 text-14 text-danger">
                {submitError}
              </div>
            )}
            <p className="text-12 text-muted mb-2">
              작성 중인 내용은 이 브라우저에 자동 저장돼요{draftSavedAt ? ` (${new Date(draftSavedAt).toLocaleTimeString('ko-KR')} 저장)` : ''}. 사진은 저장되지 않아요.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-fg text-bg py-3 px-6 rounded-none font-bold hover:bg-fg transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Plus className="w-5 h-5" />
                {submitting ? '등록 중…' : '상품 등록하기'}
              </button>
              {/* 임시 저장 — 자동 저장(1초 뒤)과 같은 저장본에 바로 저장 */}
              <button
                type="button"
                onClick={() => {
                  if (draftPrompt && draftJson === initialDraftJson.current) return; // 안내가 떠 있고 아무것도 안 쳤으면 예전 저장본을 지우지 않음
                  setDraftPrompt(null); setDraftReady(true); saveDraftNow(draftJson);
                }}
                className="flex-1 border-2 border-line text-fg py-3 px-6 rounded-none font-bold hover:border-muted transition"
              >
                임시 저장
              </button>
              <button className="text-fg py-3 px-6 rounded-none font-bold hover:text-fg transition">
                취소
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </main>
  );
}
