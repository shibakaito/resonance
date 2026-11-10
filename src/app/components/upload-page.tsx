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
  Youtube,
  HelpCircle
} from 'lucide-react';
import { TOP_CATEGORIES, subcategoriesFor, CATEGORY_TREE, flattenSubs, isCategoryVisible, ALL_BRAND_NAMES, searchBrands, CATALOG } from '../data/catalog';
import { insertListing, fetchListings } from '@/lib/listings';
import { FEATURE_FLAGS } from '../data/feature-flags'; // 숨김 플래그 (docs/hidden.md)
import { ChoiceField, choiceAsButtons } from './choice-field'; // 선택 부품: 선택지 수로 버튼 / 드롭다운 자동 (하나 고르기 5개 이하, 여러 개 6개 이하면 버튼)
import { Button } from './ui/button'; // 공통 부품 (2026-11-10 디자인 3a): 버튼, 칸(라벨 연결), 입력칸, 드롭다운, 자동완성
import { Field, Select, RequiredMark } from './ui/field';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Autocomplete } from './ui/autocomplete';
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

// 배송 방식 — 저장값(shippingType) + 버튼 글자 + 고른 뒤 칸 아래 설명 한 줄 (예전 라디오 카드의 글 그대로)
const SHIPPING_OPTS = [
  { value: 'free', label: '무료 배송', desc: '판매자가 배송비를 부담' },
  { value: 'flat', label: '고정 배송비', desc: '정해진 금액으로 부과' },
  { value: 'calculated', label: '배송비 별도', desc: '구매자 위치 기준으로 계산' },
];

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
  id,
  labelId,
  options,
  selected,
  onChange,
  displayText,
}: {
  id?: string; // Field 라벨과 연결 (열기 버튼)
  labelId?: string; // Field 라벨 id — 버튼 이름 = 라벨 + 지금 값(예: '지원 임피던스 4~8Ω')
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
      {/* 드롭다운 1칸으로 통합 — 버튼 라벨에 선택값(범위) 표시, 우측에 X 초기화. 칸 모양은 공통 입력칸과 같게(높이 40px, border-line, 흰 바탕) */}
      <div className="relative">
        <button
          id={id}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-labelledby={labelId && id ? `${labelId} ${id}` : undefined}
          onClick={() => setOpen((v) => !v)}
          className="w-full h-10 border border-line rounded-none pl-3 pr-16 flex items-center bg-bg text-16 text-left"
        >
          {selected.length > 0 ? (
            <span className="text-fg">{displayText}</span>
          ) : (
            <span className="text-muted">선택하세요</span>
          )}
          <ChevronDown aria-hidden className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
        </button>
        {/* X 초기화 — ChevronDown 왼쪽, 선택 있을 때만. 버블링 막아 드롭다운 토글 방지 (칸 속 부품이라 공통 Button 아님) */}
        {selected.length > 0 && (
          <button
            type="button"
            aria-label="초기화"
            onClick={(e) => { e.stopPropagation(); onChange([]); }}
            className="absolute right-8 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-muted hover:text-fg"
          >
            <X aria-hidden className="w-4 h-4" />
          </button>
        )}
        {open && (
          <div className="absolute z-30 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-bg border border-line rounded-none py-1">
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
                  {active && <Check aria-hidden className="w-4 h-4 text-fg" />}
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
  id,
  options,
  selected,
  onChange,
  aliases,
  disabled = false,
}: {
  id?: string; // Field 라벨과 연결 (검색 칸)
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
        <Input
          id={id}
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
          autoComplete="off"
          className="pl-3 pr-9"
        />
        <ChevronDown aria-hidden className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        {open && (
          <div ref={listRef} className="absolute z-30 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-bg border border-line rounded-none">
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
                  {active && <Check aria-hidden className="w-4 h-4 text-fg flex-shrink-0" />}
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
                <X aria-hidden className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// 여러 줄 자유 글 + 글자 수 (기타 사양) — 스키마 textarea 칸과 폴백 칸이 같이 씀
// id = Field 라벨과 연결, 글자 수 줄은 aria-describedby 로 칸에 이어 읽힘
function SpecTextarea({ id, value, onChange, maxLength = 500, placeholder = '' }: { id?: string; value: string; onChange: (v: string) => void; maxLength?: number; placeholder?: string }) {
  const countId = id ? `${id}-count` : undefined;
  return (
    <>
      <Textarea
        id={id}
        aria-describedby={countId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        rows={4}
        placeholder={placeholder}
      />
      <p id={countId} className="text-12 text-muted mt-1">{value.length}/{maxLength}자</p>
    </>
  );
}

// 검색형 입력(예전 Typeahead)은 공통 부품 ui/autocomplete.tsx 의 Autocomplete 로 합침 (2026-11-10 디자인 3a)

// 드라이버 구성 빌더 — 행 1개 = 드라이버 1개. 종류에 따라 구조/재질(또는 담당대역) 옵션·칼럼이 바뀜(cascading).
// 검색+드롭다운(단일)은 공통 Autocomplete(단자 위젯은 다중이라 MultiSelectDropdown). A단계: 렌더만(요약·저장 없음).
// DriverRow 타입 · ROLE_BAND · driverSummary(요약 칩 조립)는 src/lib/spec-builders.ts 로 이동 (폼·시드 스크립트 공용)
const BLANK_DRIVER_ROW: DriverRow = { type: '', structure: '', material: '', band: '', size: '', sizeUnit: 'inch', count: '', note: '' };

function DriverConfigBuilder({ rows, onChange, subwoofer = false }: { rows: DriverRow[]; onChange: (rows: DriverRow[]) => void; subwoofer?: boolean }) {
  const update = (i: number, patch: Partial<DriverRow>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const summary = driverSummary(rows);
  // 서브우퍼: 종류는 우퍼·패시브 라디에이터만, 셀(구조/재질/크기/개수)은 처음부터 펼침
  const typeOpts = subwoofer ? ['우퍼', '패시브 라디에이터'] : DRIVER_TYPES;
  // 칸 모양은 공통 부품(Select, Input, Autocomplete, Button — 2026-11-10 디자인 3a). 좁은 줄이라 글자는 text-14
  return (
    <div className="space-y-2">
      {rows.map((row, i) => {
        const isCoax = row.type === '동축';
        const n = i + 1; // 화면 읽기용 줄 번호 (칸 이름 = '드라이버 n 유닛' 등)
        return (
          <div key={i} className="relative flex items-center gap-2">
            {/* 종류 (항상 표시) — 빈 상태: 1줄 꽉(flex-1), 선택/서브우퍼: w-44로 줄고 나머지 칸 분할 */}
            <div className={`relative ${(subwoofer || row.type) ? 'w-44 flex-shrink-0' : 'flex-1 min-w-0'}`}>
              <Select
                aria-label={`드라이버 ${n} 유닛`}
                value={row.type}
                onChange={(e) => update(i, { type: e.target.value, structure: '', material: '', band: '', size: '', sizeUnit: 'inch', count: '', note: '' })}
                className={`pl-2 ${row.type ? 'pr-12' : 'pr-9'} text-14 ${row.type ? '' : 'text-muted'}`}
              >
                <option value="" disabled>종류</option>
                {typeOpts.map((t) => (
                  <option key={t} value={t} className="text-fg">{t}</option>
                ))}
              </Select>
              {/* 종류 초기화 X — 칸 속 부품이라 공통 Button 아님(화살표 왼쪽) */}
              {row.type && (
                <button
                  type="button"
                  aria-label="종류 초기화"
                  onClick={() => update(i, { type: '', structure: '', material: '', band: '', size: '', sizeUnit: 'inch', count: '', note: '' })}
                  className="absolute right-7 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-muted hover:text-fg"
                >
                  <X aria-hidden className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {/* 구조, 재질(또는 담당 대역), 크기, 개수, 비고 — 종류 선택 시 표시(서브우퍼는 처음부터 항상 표시)
                FEATURE_FLAGS.driverMaterialStructure 꺼짐(2026-11-10): 구조, 재질 칸 숨김 → [유닛][크기 + inch/mm][개수][비고]. 동축의 담당 대역은 way 계산(driverWays)에 쓰여 남김 */}
            {(subwoofer || row.type) && (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {FEATURE_FLAGS.driverMaterialStructure && (
              <div className="flex-1 min-w-0">
                <Autocomplete aria-label={`드라이버 ${n} 구조`} value={row.structure} onChange={(v) => update(i, { structure: v })} options={DRIVER_STRUCT[row.type] ?? []} allowCustom placeholder="구조" />
              </div>
              )}
              {(isCoax || FEATURE_FLAGS.driverMaterialStructure) && (
              <div className="flex-1 min-w-0">
                {isCoax ? (
                  <Autocomplete aria-label={`드라이버 ${n} 담당 대역`} value={row.band} onChange={(v) => update(i, { band: v })} options={COAXIAL_BANDS} allowCustom placeholder="담당 대역" />
                ) : (
                  <Autocomplete aria-label={`드라이버 ${n} 재질`} value={row.material} onChange={(v) => update(i, { material: v })} options={DRIVER_MATERIAL[row.type] ?? []} allowCustom placeholder="재질" />
                )}
              </div>
              )}
              <Input
                aria-label={`드라이버 ${n} 크기`}
                value={row.size}
                onChange={(e) => update(i, { size: e.target.value })}
                placeholder="크기"
                className="w-16 flex-shrink-0 px-2 text-14"
              />
              <Select
                aria-label={`드라이버 ${n} 크기 단위`}
                wrapClassName="w-20 flex-shrink-0"
                value={row.sizeUnit}
                onChange={(e) => update(i, { sizeUnit: e.target.value })}
                className="pl-2 pr-7 text-14"
              >
                <option value="inch">inch</option>
                <option value="mm">mm</option>
              </Select>
              <Input
                aria-label={`드라이버 ${n} 개수`}
                value={row.count}
                onChange={(e) => update(i, { count: e.target.value.replace(/[^0-9]/g, '') })}
                inputMode="numeric"
                placeholder="개수"
                className="w-14 flex-shrink-0 text-center px-1 text-14"
              />
              {/* 비고 — 자유 글 (예: 실크 돔). 요약 줄 끝에 괄호로 */}
              <Input
                aria-label={`드라이버 ${n} 비고`}
                value={row.note ?? ''}
                onChange={(e) => update(i, { note: e.target.value })}
                placeholder="비고"
                className="flex-1 px-2 text-14"
              />
            </div>
            )}
            {/* 삭제 — 필드 끝 오른쪽 거터에 절대배치 (행 2개 이상일 때만). 32px 정사각 아이콘 버튼 */}
            {rows.length > 1 && (
              <Button
                iconOnly
                size="sm"
                aria-label={`드라이버 ${n} 삭제`}
                onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
                className="absolute left-full ml-2 top-1/2 -translate-y-1/2"
              >
                <X aria-hidden className="w-4 h-4" />
              </Button>
            )}
          </div>
        );
      })}
      <Button size="sm" onClick={() => onChange([...rows, { ...BLANK_DRIVER_ROW }])}>
        <Plus aria-hidden className="w-4 h-4" /> 드라이버 추가
      </Button>
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
  // 줄 끝 삭제 버튼(32px) + 간격 8px = 40px 를 카드 오른쪽 여백으로 내보냄(-mr-10) → 칸 끝이 위아래 칸과 맞음
  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2 -mr-10">
          {/* 앞칸: 드라이버 종류 (항상 표시) */}
          <div className="relative w-28 flex-shrink-0">
            <Select
              aria-label={`앰프 출력 ${i + 1} 종류`}
              value={row.type}
              onChange={(e) => update(i, { type: e.target.value })}
              className={`pl-2 ${row.type ? 'pr-12' : 'pr-9'} text-14 ${row.type ? '' : 'text-muted'}`}
            >
              <option value="" disabled>종류</option>
              {AMP_POWER_TYPES.map((t) => (
                <option key={t} value={t} className="text-fg">{t}</option>
              ))}
            </Select>
            {row.type && (
              <button
                type="button"
                aria-label="종류 초기화"
                onClick={() => update(i, { type: '', power: '' })}
                className="absolute right-7 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-muted hover:text-fg"
              >
                <X aria-hidden className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {/* 뒤칸: 앰프 출력값 (자유 입력) — 항상 표시(2칸 상시 유지) */}
          <Input
            aria-label={`앰프 출력 ${i + 1} 출력값`}
            value={row.power}
            onChange={(e) => update(i, { power: e.target.value })}
            placeholder="출력값 (예: 200W)"
            className="flex-1 px-2 text-14"
          />
          {/* 삭제 (행 2개 이상일 때만) */}
          {rows.length > 1 ? (
            <Button iconOnly size="sm" aria-label={`앰프 출력 ${i + 1} 삭제`} onClick={() => onChange(rows.filter((_, idx) => idx !== i))}>
              <X aria-hidden className="w-4 h-4" />
            </Button>
          ) : (
            <div className="w-8 flex-shrink-0" />
          )}
        </div>
      ))}
      <Button size="sm" onClick={() => onChange([...rows, { ...BLANK_AMP_POWER_ROW }])}>
        <Plus aria-hidden className="w-4 h-4" /> 앰프 출력 추가
      </Button>
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
    if (!asDescribed) { setSubmitError('실제 상태와 같음을 확인해 주세요.'); return; } // 필수 확인 체크 — 매물 저장(insertListing)에는 안 넣음, 임시 저장에만
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
            <Button variant="primary" onClick={restoreDraft}>
              이어서 작성
            </Button>
            <Button onClick={discardDraft}>
              버리기
            </Button>
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
                    {/* 단계 이동 목록 — 글자 목록 모양이라 공통 Button 아님(2026-11-10 디자인 3a: transition 뺌) */}
                    <button
                      type="button"
                      onClick={() => scrollToStep(step.id)}
                      aria-current={isActive ? 'step' : undefined}
                      className="flex items-center gap-3 w-full text-left group"
                    >
                      <span
                        className={`absolute left-0 top-0 w-6 h-6 flex items-center justify-center border-2 ${
                          isDone
                            ? 'bg-fg border-fg text-bg'
                            : isActive
                            ? 'bg-bg border-fg text-fg'
                            : 'bg-bg border-line text-muted'
                        }`}
                      >
                        {isDone ? (
                          <Check aria-hidden className="w-3.5 h-3.5" />
                        ) : (
                          <span className="text-12 font-bold">{idx + 1}</span>
                        )}
                      </span>
                      <span
                        className={`font-bold ${
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
              {/* 카테고리 — 풀패스("앰프 > 프리앰프")로 검색·표시. 선택 시 상위/하위 분리 저장 (공통 부품 Field + Autocomplete, 2026-11-10 디자인 3a) */}
              <Field label="카테고리" required>
                <Autocomplete
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
                  keyboardLayout
                />
              </Field>

              {/* 1. 브랜드 — 사전 브랜드(한글 별칭, 예: '맥킨토시' → McIntosh) + 사전에 없는 매물 브랜드, 목록에 없는 글도 저장(allowCustom) */}
              <Field label="브랜드" required>
                <Autocomplete
                  value={brand}
                  onChange={(v) => {
                    setBrand(v);
                    setModel(''); // 브랜드 바꾸면 모델 초기화
                  }}
                  options={brandOptions}
                  allowCustom
                  keyboardLayout
                  hideUntilTyping
                  filter={(q, opts) => {
                    const ranked = searchBrands(q, 50).map((b) => b.name); // 사전 브랜드(한글 별칭 포함) 순위
                    const set = new Set(opts);
                    const nq = q.replace(/[\s&\-/]+/g, '').toLowerCase();
                    const extra = listingOnlyBrands.filter((n) => nq && n.replace(/[\s&\-/]+/g, '').toLowerCase().includes(nq)); // 사전에 없는 매물 브랜드
                    return [...ranked.filter((n) => set.has(n)), ...extra];
                  }}
                />
              </Field>

              {/* 2. 모델 — 브랜드 + 카테고리(subcategory)가 둘 다 일치하는 모델만 후보로 (사전 CATALOG 모델 + 기존 매물 모델 합집합)
                  - 브랜드 미선택 → 후보 없음 (직접 입력만 가능)
                  - 카테고리 미선택 → 해당 브랜드의 전체 모델
                  - 카테고리 선택됨 → 해당 브랜드 + 그 카테고리(예: '프리앰프')만 */}
              <Field label="모델" required>
                <Autocomplete
                  value={model}
                  onChange={setModel}
                  allowCustom
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
              </Field>

              {/* 3. 출시 연도 — 플래그 켜짐: '대략'이면 specs.yearApprox = true(표시 '약 1975년', 필터는 그 연도로 비교), '모름'이면 칸 비활성 + 비워 저장
                  플래그 꺼짐(FEATURE_FLAGS.yearApprox): 숫자 칸만 */}
              <Field label="출시 연도">
                {({ id, describedBy }) =>
                  FEATURE_FLAGS.yearApprox ? (
                    <div className="flex items-center gap-4">
                      <Input
                        id={id}
                        aria-describedby={describedBy}
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        disabled={yearUnknown}
                        className="flex-1"
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
                    <Input id={id} aria-describedby={describedBy} value={year} onChange={(e) => setYear(e.target.value)} />
                  )
                }
              </Field>

              {/* 4. 제조국 */}
              <Field label="제조국">
                <Autocomplete value={country} onChange={setCountry} options={COUNTRIES} />
              </Field>

              {/* 6. 구성품 — 플래그 켜짐: 공통 7개 체크 카드 + 기타 구성품 글(specs.components 키 배열, specs.componentsOther 글)
                  플래그 꺼짐(FEATURE_FLAGS.componentChecks): 전처럼 자유 글 한 칸(specs.components 글) */}
              <Field label="구성품">
                {({ id, describedBy }) => (
                  <>
                    {FEATURE_FLAGS.componentChecks && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {COMPONENT_OPTS.map((o) => {
                        const on = components.includes(o.value);
                        return (
                          <label
                            key={o.value}
                            className={`flex items-center gap-2 border rounded-none px-3 h-10 text-14 cursor-pointer ${on ? 'border-fg bg-surface' : 'border-line hover:border-muted'}`}
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
                    <Input
                      id={id}
                      aria-describedby={describedBy}
                      value={componentsOther}
                      onChange={(e) => setComponentsOther(e.target.value)}
                      placeholder={FEATURE_FLAGS.componentChecks ? '기타 구성품 (예: 예비 진공관, 스파이크)' : ''}
                      className={FEATURE_FLAGS.componentChecks ? 'mt-2' : ''}
                    />
                  </>
                )}
              </Field>

              {/* 7. 상태 — 종류 4개(CONDITIONS). 중고(used)일 때만 아래의 외관 상태, 작동 상태 활성화(둘 다 선택 사항)
                  선택 부품(ChoiceField): 상태는 예외 목록(CHOICE_DROPDOWN_ONLY)에 있어 늘 드롭다운. 버튼이 되더라도 필수라 다시 눌러도 해제 안 됨 */}
              <Field label="상태" required group={choiceAsButtons(CONDITIONS.length, false, 'condition')}>
                {({ id, labelId }) => (
                  <ChoiceField
                    fieldKey="condition"
                    labelledBy={labelId}
                    options={CONDITIONS}
                    value={condition}
                    onChange={onConditionChange}
                    allowClear={false}
                    dropdown={
                      <Select id={id} aria-required value={condition} onChange={(e) => onConditionChange(e.target.value)} className={condition ? '' : 'text-muted'}>
                        <option value="" disabled>선택하세요</option>
                        {CONDITIONS.map((c) => (
                          <option key={c.value} value={c.value} className="text-fg">{c.label}</option>
                        ))}
                      </Select>
                    }
                  />
                )}
              </Field>
              {/* 고른 상태의 정의 한 줄 */}
              {desc('condition', condition) && <p className="-mt-3 text-12 text-muted">{desc('condition', condition)}</p>}

              {/* 소유권 — 중고(used)일 때만 활성화. 필수 아님. FEATURE_FLAGS.ownership 꺼지면 칸만 숨김(저장 로직 그대로) */}
              {FEATURE_FLAGS.ownership && (
              <Field label="소유권" disabled={condition !== 'used'} group={choiceAsButtons(OWNERSHIP_OPTIONS.length, false, 'ownership')}>
                {({ id, labelId }) => (
                  <ChoiceField
                    fieldKey="ownership"
                    labelledBy={labelId}
                    options={OWNERSHIP_OPTIONS}
                    value={ownership}
                    onChange={setOwnership}
                    disabled={condition !== 'used'}
                    dropdown={
                      <Select id={id} value={ownership} onChange={(e) => setOwnership(e.target.value)} disabled={condition !== 'used'} className={ownership ? '' : 'text-muted'}>
                        <option value="" disabled>선택하세요</option>
                        {OWNERSHIP_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value} className="text-fg">{opt.label}</option>
                        ))}
                      </Select>
                    }
                  />
                )}
              </Field>
              )}

              {/* 8. 외관 상태 — 중고(used)일 때만 활성화, 새 제품 상태(새상품, 미개봉, NOS)면 숨김. 선택 사항
                  예외 목록(CHOICE_DROPDOWN_ONLY)에 있어 늘 드롭다운 — [드롭다운][자세히 칸] 한 줄. 목록에서 빼면 버튼이 되고 자세히 칸은 아래 줄로 */}
              {!usedFieldsHidden && (
              <Field label="외관 상태" disabled={condition !== 'used'} group={choiceAsButtons(APPEARANCE_OPTIONS.length, false, 'appearance')}>
                {({ id, labelId }) => {
                  const asButtons = choiceAsButtons(APPEARANCE_OPTIONS.length, false, 'appearance');
                  const detailInput = (
                    <Input
                      value={conditionAppearanceDetail}
                      onChange={(e) => setConditionAppearanceDetail(e.target.value)}
                      disabled={condition !== 'used'}
                      aria-label="외관 상태 자세히"
                      className={asButtons ? 'mt-2' : 'flex-1'}
                    />
                  );
                  return (
                    <>
                      <ChoiceField
                        fieldKey="appearance"
                        labelledBy={labelId}
                        options={APPEARANCE_OPTIONS}
                        value={conditionAppearance}
                        onChange={setConditionAppearance}
                        disabled={condition !== 'used'}
                        dropdown={
                          <div className="flex gap-2">
                            <Select
                              id={id}
                              wrapClassName="w-36 flex-shrink-0"
                              value={conditionAppearance}
                              onChange={(e) => setConditionAppearance(e.target.value)}
                              disabled={condition !== 'used'}
                              className={conditionAppearance ? '' : 'text-muted'}
                            >
                              <option value="" disabled>선택</option>
                              {APPEARANCE_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value} className="text-fg">{o.label}</option>
                              ))}
                            </Select>
                            {detailInput}
                          </div>
                        }
                      />
                      {asButtons && detailInput}
                    </>
                  );
                }}
              </Field>
              )}
              {!usedFieldsHidden && desc('appearance', conditionAppearance) && <p className="-mt-3 text-12 text-muted">{desc('appearance', conditionAppearance)}</p>}

              {/* 9. 작동 상태 — 중고(used)일 때만 활성화, 새 제품 상태면 숨김. 선택 사항. 외관 상태와 같은 모양 */}
              {!usedFieldsHidden && (
              <Field label="작동 상태" disabled={condition !== 'used'} group={choiceAsButtons(WORKING_OPTIONS.length, false, 'working')}>
                {({ id, labelId }) => {
                  const asButtons = choiceAsButtons(WORKING_OPTIONS.length, false, 'working');
                  const detailInput = (
                    <Input
                      value={conditionWorkingDetail}
                      onChange={(e) => setConditionWorkingDetail(e.target.value)}
                      disabled={condition !== 'used'}
                      aria-label="작동 상태 자세히"
                      className={asButtons ? 'mt-2' : 'flex-1'}
                    />
                  );
                  return (
                    <>
                      <ChoiceField
                        fieldKey="working"
                        labelledBy={labelId}
                        options={WORKING_OPTIONS}
                        value={conditionWorking}
                        onChange={setConditionWorking}
                        disabled={condition !== 'used'}
                        dropdown={
                          <div className="flex gap-2">
                            <Select
                              id={id}
                              wrapClassName="w-36 flex-shrink-0"
                              value={conditionWorking}
                              onChange={(e) => setConditionWorking(e.target.value)}
                              disabled={condition !== 'used'}
                              className={conditionWorking ? '' : 'text-muted'}
                            >
                              <option value="" disabled>선택</option>
                              {WORKING_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value} className="text-fg">{o.label}</option>
                              ))}
                            </Select>
                            {detailInput}
                          </div>
                        }
                      />
                      {asButtons && detailInput}
                    </>
                  );
                }}
              </Field>
              )}
              {!usedFieldsHidden && desc('working', conditionWorking) && <p className="-mt-3 text-12 text-muted">{desc('working', conditionWorking)}</p>}

              {/* 10. 정비 이력 — 모든 카테고리 공통(예전엔 카세트 기술 사양 칸). 저장 자리는 그대로 specs.tech.maintenance.
                  중고(used)일 때만 활성화. 보이기는 FEATURE_FLAGS.maintenance 만 정함(상태 분기 없음). 6개라 버튼 토글(직접 입력은 드롭다운일 때만) */}
              {FEATURE_FLAGS.maintenance && (
              <Field label="정비 이력" disabled={condition !== 'used'} group={choiceAsButtons(MAINTENANCE_OPTS.length, true, 'maintenance')}>
                {({ id, labelId }) => (
                  <ChoiceField
                    multiple
                    fieldKey="maintenance"
                    labelledBy={labelId}
                    options={MAINTENANCE_OPTS}
                    values={maintenance}
                    onChange={setMaintenance}
                    disabled={condition !== 'used'}
                    dropdown={<MultiSelectDropdown id={id} options={MAINTENANCE_OPTS} selected={maintenance} onChange={setMaintenance} disabled={condition !== 'used'} />}
                  />
                )}
              </Field>
              )}

              {/* 상품명 — 브랜드+모델+하위카테고리 자동 반영, 수정·자유입력 가능 (필수) */}
              <Field label="상품명" required>
                <Input value={title} onChange={(e) => { setTitle(e.target.value); setTitleEdited(true); }} />
              </Field>

              {/* 핸드메이드(자작품) 여부 — 브랜드와 별개 차원의 태그. 브랜드/모델은 직접 입력 활용
                  FEATURE_FLAGS.handmadeField 가 꺼져 있으면 칸만 숨김(저장 로직 그대로, 기본 false) */}
              {FEATURE_FLAGS.handmadeField && (
              <Field label="핸드메이드 제품인가요?">
                {({ id }) => (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input id={id} type="checkbox" checked={handmade} onChange={(e) => setHandmade(e.target.checked)} className="accent-fg w-4 h-4" />
                    <span className="text-14 text-muted">직접 만든 수제품입니다.</span>
                  </label>
                )}
              </Field>
              )}
            </div>
          </section>

          {/* 기술 사양 — 카테고리별 스키마가 있으면 그걸로(앰프 등), 없으면 기존 SPEC_FIELDS 폴백 */}
          {/* 좌우 여백 48px(px-12): 줄 끝 삭제 버튼(32px) + 간격 8px 이 여백으로 나가고(-mr-10) 카드 테두리와 8px 띄움 */}
          <section className="bg-bg border border-line rounded-none py-6 px-12">
            {/* 접기 머리 — 제목 줄 모양이라 공통 Button 아님 */}
            <button
              type="button"
              onClick={() => setTechExpanded((v) => !v)}
              aria-expanded={techExpanded}
              className="w-full flex items-center justify-between text-left"
            >
              <h2 className="text-24 font-bold">기술 사양</h2>
              <ChevronDown aria-hidden className={`w-6 h-6 text-muted ${techExpanded ? 'rotate-180' : ''}`} />
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
                  // ── 칸 모양은 공통 부품(2026-11-10 디자인 3a): Field(라벨 연결) 안에 Input, Select, Autocomplete, ChoiceField
                  //    칸 하나 = 라벨이 그 칸을 가리킴(htmlFor). 칸 여러 개(숫자 + 단위, 행 빌더) = 이름표 + role="group", 안의 칸마다 aria-label
                  //    줄 끝 삭제 = 32px 정사각 Button(카드 오른쪽 여백으로 -mr-10), 줄 추가 = 작은 Button ──
                  // ── 타입: 카테고리에서 자동 입력 (읽기 전용) ──
                  if (f.input.kind === 'auto') {
                    return (
                      <Field key={f.key} className="spec-field" label={f.label}>
                        <Input value={subcategory || category} readOnly />
                      </Field>
                    );
                  }
                  // ── 하나 고르기 — 선택 부품(ChoiceField): 선택지 5개 이하면 각진 버튼 한 줄(다시 누르면 해제), 6개 이상이면 아래 드롭다운 ──
                  if (f.input.kind === 'select') {
                    const v = specs[f.key] || '';
                    const opts = f.input.options;
                    return (
                      <Field key={f.key} className="spec-field" label={f.label} group={choiceAsButtons(opts.length, false, f.key)}>
                        {({ id, labelId }) => (
                          <ChoiceField
                            fieldKey={f.key}
                            labelledBy={labelId}
                            options={opts}
                            value={v}
                            onChange={setSpec}
                            buttonText={CHOICE_BUTTON_TEXT[f.key]}
                            dropdown={
                              <div className="relative">
                                <Select id={id} value={v} onChange={(e) => setSpec(e.target.value)} className={`pl-3 ${v ? 'pr-16' : 'pr-9'} ${v ? '' : 'text-muted'}`}>
                                  <option value="" disabled>선택하세요</option>
                                  {opts.map((o) => {
                                    // 문자열(앰프: 저장=표시) 또는 {value,label}(스피커: 저장=영문키, 표시=한글)
                                    const opt = typeof o === 'string' ? { value: o, label: o } : o;
                                    return <option key={opt.value} value={opt.value} className="text-fg">{opt.label}</option>;
                                  })}
                                </Select>
                                {/* 선택값 있으면 화살표 왼쪽에 X (초기화) — 칸 속 부품이라 공통 Button 아님 */}
                                {v && (
                                  <button
                                    type="button"
                                    aria-label="초기화"
                                    onClick={() => setSpec('')}
                                    className="absolute right-8 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-muted hover:text-fg"
                                  >
                                    <X aria-hidden className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            }
                          />
                        )}
                      </Field>
                    );
                  }
                  // ── 검색 드롭다운(Autocomplete) 단일 선택 — 옵션 많은 칸(인클로저) ──
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
                      <Field key={f.key} className="spec-field" label={f.label}>
                        <Autocomplete
                          value={optLabel(opts, specs[f.key] || '')}
                          onChange={(text) => setSpec(optValue(opts, text))}
                          options={optLabels(opts)}
                          filter={filterFn}
                          keyboardLayout={f.input.keyboardLayout}
                          allowCustom
                          placeholder="검색 또는 선택"
                        />
                      </Field>
                    );
                  }
                  // ── 자유 입력 (+ 단위) ──
                  if (f.input.kind === 'text') {
                    const unit = f.input.unit;
                    const free = f.input.free; // 자유 텍스트면 숫자 필터 X
                    return (
                      <Field key={f.key} className="spec-field" label={f.label}>
                        {({ id }) => (
                          <div className="relative">
                            <Input
                              id={id}
                              value={specs[f.key] || ''}
                              onChange={(e) => setSpec(free ? e.target.value : numOnly(e.target.value))}
                              inputMode={free ? 'text' : 'decimal'}
                              className={unit ? 'pl-3 pr-10' : ''}
                            />
                            {unit && (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-14 pointer-events-none">
                                {unit}
                              </span>
                            )}
                          </div>
                        )}
                      </Field>
                    );
                  }
                  // ── 여러 줄 자유 글 (기타 사양) — 줄바꿈 그대로 저장 ──
                  if (f.input.kind === 'textarea') {
                    const { maxLength, placeholder } = f.input;
                    return (
                      <Field key={f.key} className="spec-field" label={f.label}>
                        {({ id }) => <SpecTextarea id={id} value={specs[f.key] || ''} onChange={setSpec} maxLength={maxLength} placeholder={placeholder} />}
                      </Field>
                    );
                  }
                  // ── 숫자 + 오른쪽 드롭다운 (예: 앰프 출력값 + RMS/Peak) — 숫자 칸이 라벨과 연결, 드롭다운은 aria-label ──
                  if (f.input.kind === 'numSelect') {
                    const unit = f.input.unit;
                    const typeOpts = f.input.options;
                    const typeName = f.input.glue ? '단위' : '기준';
                    const typeKey = `${f.key}Type`;
                    const typeVal = specs[typeKey] || '';
                    return (
                      <Field key={f.key} className="spec-field" label={f.label}>
                        {({ id }) => (
                          <div className="flex gap-2 items-center">
                            <div className="relative flex-[3_1_44px] min-w-0">
                              <Input
                                id={id}
                                value={specs[f.key] || ''}
                                onChange={(e) => setSpec(numOnly(e.target.value))}
                                inputMode="decimal"
                                className={`pl-3 ${unit ? 'pr-10' : 'pr-3'}`}
                              />
                              {unit && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-14 pointer-events-none">{unit}</span>
                              )}
                            </div>
                            <span aria-hidden className="text-muted">×</span>
                            <div className="relative flex-1 min-w-0">
                              <Select
                                aria-label={`${f.label} ${typeName}`}
                                value={typeVal}
                                onChange={(e) => setSpecs({ ...specs, [typeKey]: e.target.value })}
                                className={`pl-3 ${typeVal ? 'pr-16' : 'pr-9'} ${typeVal ? '' : 'text-muted'}`}
                              >
                                <option value="" disabled>선택</option>
                                {typeOpts.map((o) => (
                                  <option key={o} value={o} className="text-fg">{o}</option>
                                ))}
                              </Select>
                              {typeVal && (
                                <button
                                  type="button"
                                  aria-label="초기화"
                                  onClick={() => setSpecs({ ...specs, [typeKey]: '' })}
                                  className="absolute right-8 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-muted hover:text-fg"
                                >
                                  <X aria-hidden className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </Field>
                    );
                  }
                  // ── 정격 출력: 출력값(W) + 기준 옴 쌍, +추가 가능 ──
                  if (f.input.kind === 'power') {
                    const ohmOpts = f.input.ohmOptions ?? AMP_OHM_OPTS;
                    return (
                      <Field key={f.key} className="spec-field" label={f.label} group>
                        <div className="space-y-2">
                          {powerPairs.map((p, idx) => (
                            <div key={idx} className="flex gap-2 items-center -mr-10">
                              {/* 출력값: 남는 공간 전부 (flex-1) */}
                              <div className="relative flex-1 min-w-0">
                                <Input
                                  aria-label={`출력값 ${idx + 1}`}
                                  value={p.w}
                                  onChange={(e) => {
                                    const pairs = powerPairs.map((x, i) => (i === idx ? { ...x, w: numOnly(e.target.value) } : x));
                                    setPowerPairs(pairs);
                                    setSpecs({ ...specs, [f.key]: buildPower(pairs) });
                                  }}
                                  inputMode="decimal"
                                  placeholder="출력값"
                                  className="pl-3 pr-9"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-14 pointer-events-none">W</span>
                              </div>
                              <span aria-hidden className="text-muted">@</span>
                              {/* 기준 옴: w-28 고정 */}
                              <div className="relative w-28 flex-shrink-0">
                                <Select
                                  aria-label={`기준 임피던스 ${idx + 1}`}
                                  value={p.ohm}
                                  onChange={(e) => {
                                    const pairs = powerPairs.map((x, i) => (i === idx ? { ...x, ohm: e.target.value } : x));
                                    setPowerPairs(pairs);
                                    setSpecs({ ...specs, [f.key]: buildPower(pairs) });
                                  }}
                                  className={`pl-3 ${p.ohm ? 'pr-12' : 'pr-9'} ${p.ohm ? '' : 'text-muted'}`}
                                >
                                  <option value="" disabled>기준</option>
                                  {ohmOpts.map((o) => (
                                    <option key={o} value={o} className="text-fg">{o}</option>
                                  ))}
                                </Select>
                                {p.ohm && (
                                  <button
                                    type="button"
                                    aria-label="초기화"
                                    onClick={() => {
                                      const pairs = powerPairs.map((x, i) => (i === idx ? { ...x, ohm: '' } : x));
                                      setPowerPairs(pairs);
                                      setSpecs({ ...specs, [f.key]: buildPower(pairs) });
                                    }}
                                    className="absolute right-7 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-muted hover:text-fg"
                                  >
                                    <X aria-hidden className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                              <span aria-hidden className="text-muted">×</span>
                              {/* 비고: 114px 고정 (기준 112보다 2px 넓게) */}
                              <Input
                                aria-label={`비고 ${idx + 1}`}
                                value={p.note ?? ''}
                                onChange={(e) => {
                                  const pairs = powerPairs.map((x, i) => (i === idx ? { ...x, note: e.target.value } : x));
                                  setPowerPairs(pairs);
                                  setSpecs({ ...specs, [f.key]: buildPower(pairs) });
                                }}
                                placeholder="비고"
                                className="w-[114px] flex-shrink-0"
                              />
                              {powerPairs.length > 1 ? (
                                <Button
                                  iconOnly
                                  size="sm"
                                  aria-label={`${f.label} ${idx + 1}번째 줄 삭제`}
                                  onClick={() => {
                                    const pairs = powerPairs.filter((_, i) => i !== idx);
                                    setPowerPairs(pairs);
                                    setSpecs({ ...specs, [f.key]: buildPower(pairs) });
                                  }}
                                >
                                  <X aria-hidden className="w-4 h-4" />
                                </Button>
                              ) : (
                                <div className="w-8 flex-shrink-0" />
                              )}
                            </div>
                          ))}
                          <Button size="sm" onClick={() => setPowerPairs((prev) => [...prev, { w: '', ohm: '', note: '' }])}>
                            <Plus aria-hidden className="w-4 h-4" /> 임피던스별 출력 추가
                          </Button>
                        </div>
                      </Field>
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
                      <Field key={f.key} className="spec-field" label={f.label} group>
                        <div className="flex gap-2 items-center">
                          <div className="relative flex-1 min-w-0">
                            <Input
                              aria-label="하한"
                              value={r.low}
                              onChange={(e) => setRange({ low: numOnly(e.target.value) })}
                              inputMode="decimal"
                              placeholder="하한"
                              className="pl-3 pr-10"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-14 pointer-events-none">{lowUnit}</span>
                          </div>
                          <span aria-hidden className="text-muted">~</span>
                          <div className="relative flex-1 min-w-0">
                            <Input
                              aria-label="상한"
                              value={r.high}
                              onChange={(e) => setRange({ high: numOnly(e.target.value) })}
                              inputMode="decimal"
                              placeholder="상한"
                              className="pl-3 pr-10"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-14 pointer-events-none">{highUnit}</span>
                          </div>
                        </div>
                      </Field>
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
                    const AXIS_NAME = { w: '가로', d: '깊이', h: '높이' } as const; // 화면 읽기용 칸 이름
                    const dimInput = (val: string, axis: 'w' | 'd' | 'h', ph: string, i: number) => (
                      <div className="relative flex-1 min-w-0">
                        <Input
                          aria-label={`${AXIS_NAME[axis]} ${i + 1}`}
                          value={val}
                          onChange={(e) => update(i, { [axis]: numOnly(e.target.value) })}
                          inputMode="decimal"
                          placeholder={ph}
                          className="pl-3 pr-9"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted text-12 pointer-events-none">mm</span>
                      </div>
                    );
                    return (
                      <Field key={f.key} className="spec-field" label={f.label} group>
                        <div className="space-y-2">
                          {rows.map((r, i) => (
                            <div key={i} className="flex gap-2 items-center -mr-10">
                              {dimInput(r.w, 'w', 'W', i)}
                              <span aria-hidden className="text-muted">×</span>
                              {dimInput(r.d, 'd', 'D', i)}
                              <span aria-hidden className="text-muted">×</span>
                              {dimInput(r.h, 'h', 'H', i)}
                              <span aria-hidden className="text-muted">×</span>
                              <div className="relative flex-1 min-w-0">
                                <Input
                                  aria-label={`비고 ${i + 1}`}
                                  value={r.note}
                                  onChange={(e) => update(i, { note: e.target.value })}
                                  placeholder="비고"
                                />
                              </div>
                              {rows.length > 1 ? (
                                <Button iconOnly size="sm" aria-label={`${f.label} ${i + 1}번째 줄 삭제`} onClick={() => commit(rows.filter((_, idx) => idx !== i))}>
                                  <X aria-hidden className="w-4 h-4" />
                                </Button>
                              ) : (
                                <div className="w-8 flex-shrink-0" />
                              )}
                            </div>
                          ))}
                          <Button size="sm" onClick={() => commit([...rows, { w: '', d: '', h: '', note: '' }])}>
                            <Plus aria-hidden className="w-4 h-4" /> 크기 추가
                          </Button>
                        </div>
                      </Field>
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
                      <Field key={f.key} className="spec-field" label={f.label} group>
                        <div className="space-y-2">
                          {rows.map((r, i) => (
                            <div key={i} className="flex gap-2 items-center -mr-10">
                              {/* 값(kg) — 크기 W+D+H 3칸 + 그 사이 ×2개 폭(basis 44px=×2개분). 크기 행과 동일 컬럼 정렬 */}
                              <div className="relative flex-[3_1_44px] min-w-0">
                                <Input
                                  aria-label={`${f.label} ${i + 1}`}
                                  value={r.value}
                                  onChange={(e) => update(i, { value: numOnly(e.target.value) })}
                                  inputMode="decimal"
                                  className={`pl-3 ${unit ? 'pr-9' : 'pr-3'}`}
                                />
                                {unit && (
                                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted text-12 pointer-events-none">{unit}</span>
                                )}
                              </div>
                              <span aria-hidden className="text-muted">×</span>
                              <div className="relative flex-1 min-w-0">
                                <Input
                                  aria-label={`비고 ${i + 1}`}
                                  value={r.note}
                                  onChange={(e) => update(i, { note: e.target.value })}
                                  placeholder="비고"
                                />
                              </div>
                              {rows.length > 1 ? (
                                <Button iconOnly size="sm" aria-label={`${f.label} ${i + 1}번째 줄 삭제`} onClick={() => commit(rows.filter((_, idx) => idx !== i))}>
                                  <X aria-hidden className="w-4 h-4" />
                                </Button>
                              ) : (
                                <div className="w-8 flex-shrink-0" />
                              )}
                            </div>
                          ))}
                          <Button size="sm" onClick={() => commit([...rows, { value: '', note: '' }])}>
                            <Plus aria-hidden className="w-4 h-4" /> {f.label} 추가
                          </Button>
                        </div>
                      </Field>
                    );
                  }
                  // ── 다중 선택 (지원 임피던스 / 입력·출력 단자) ──
                  if (f.input.kind === 'multi') {
                    const sel = f.key === 'impedance' ? impedances : (multiSel[f.key] ?? []);
                    const setSel = f.key === 'impedance' ? setImpedances : (next: string[] | ((p: string[]) => string[])) => setMultiSel((m) => ({ ...m, [f.key]: typeof next === 'function' ? next(m[f.key] ?? []) : next }));
                    const opts = f.input.options;
                    // 선택 부품(ChoiceField): 선택지 6개 이하면 각진 버튼 토글(누른 순서대로 쌓임, 다시 누르면 해제), 7개 이상이면 기존 드롭다운
                    //   드롭다운 쪽: 임피던스 = 드롭다운 + 범위 표시(ImpedanceSelect) / 단자 등 = 검색 + 칩 + 직접 입력(MultiSelectDropdown)
                    //   회전수도 여기서 같이 (버튼 글자만 CHOICE_BUTTON_TEXT 로 '33⅓')
                    return (
                      <Field key={f.key} className="spec-field" label={f.label} group={choiceAsButtons(opts.length, true, f.key)}>
                        {({ id, labelId }) => (
                          <ChoiceField
                            multiple
                            fieldKey={f.key}
                            labelledBy={labelId}
                            options={opts}
                            values={sel}
                            onChange={setSel}
                            buttonText={CHOICE_BUTTON_TEXT[f.key]}
                            dropdown={
                              f.key === 'impedance' ? (
                                <ImpedanceSelect id={id} labelId={labelId} options={opts as string[]} selected={sel} onChange={setSel} displayText={impedanceRange(sel)} />
                              ) : (
                                <MultiSelectDropdown id={id} options={opts} selected={sel} onChange={setSel} aliases={TERMINAL_ALIASES} />
                              )
                            }
                          />
                        )}
                      </Field>
                    );
                  }
                  // ── 드라이버 구성 빌더 (스피커) — 안의 칸마다 '드라이버 n 유닛' 등 이름 ──
                  if (f.input.kind === 'drivers') {
                    return (
                      <Field key={f.key} className="spec-field" label={f.label} group>
                        <DriverConfigBuilder rows={driverRows} onChange={setDriverRows} subwoofer={subcategory === '서브우퍼'} />
                      </Field>
                    );
                  }
                  // ── 앰프 출력(액티브): 드라이버 종류 + 출력값(자유 입력) ──
                  if (f.input.kind === 'ampPower') {
                    return (
                      <Field key={f.key} className="spec-field" label={f.label} group>
                        <AmpPowerBuilder rows={ampPowerRows} onChange={setAmpPowerRows} />
                      </Field>
                    );
                  }
                  // ── 크로스오버: 주파수(Hz) 여러 개 + "크로스오버 추가" ──
                  if (f.input.kind === 'crossover') {
                    return (
                      <Field key={f.key} className="spec-field" label={f.label} group>
                        <div className="space-y-2">
                          {crossoverValues.map((row, idx) => (
                            <div key={idx} className="flex gap-2 items-center -mr-10">
                              <Input
                                aria-label={`주파수 ${idx + 1}`}
                                value={row.value}
                                onChange={(e) => { const nv = numOnly(e.target.value); setCrossoverValues((prev) => prev.map((x, i) => (i === idx ? { ...x, value: nv } : x))); }}
                                inputMode="decimal"
                                className="flex-1"
                              />
                              <Select
                                aria-label={`주파수 단위 ${idx + 1}`}
                                wrapClassName="w-24 flex-shrink-0"
                                value={row.unit}
                                onChange={(e) => { const u = e.target.value; setCrossoverValues((prev) => prev.map((x, i) => (i === idx ? { ...x, unit: u } : x))); }}
                              >
                                <option value="Hz">Hz</option>
                                <option value="kHz">kHz</option>
                              </Select>
                              {crossoverValues.length > 1 ? (
                                <Button iconOnly size="sm" aria-label={`${f.label} ${idx + 1}번째 줄 삭제`} onClick={() => setCrossoverValues((prev) => prev.filter((_, i) => i !== idx))}>
                                  <X aria-hidden className="w-4 h-4" />
                                </Button>
                              ) : (
                                <div className="w-8 flex-shrink-0" />
                              )}
                            </div>
                          ))}
                          <Button size="sm" onClick={() => setCrossoverValues((prev) => [...prev, { value: '', unit: 'Hz' }])}>
                            <Plus aria-hidden className="w-4 h-4" /> 크로스오버 추가
                          </Button>
                        </div>
                      </Field>
                    );
                  }
                  // ── 진공관 빌더: 역할 + 종류(역할별 동적) + 개수 행 배열 + "진공관 추가" ──
                  if (f.input.kind === 'tubeBuilder') {
                    return (
                      <Field key={f.key} className="spec-field" label={f.label} group>
                        <div className="space-y-2">
                          {tubeRows.map((row, idx) => {
                            const typeOpts = TUBE_TYPE_MAP[row.role] ?? [];
                            const update = (patch: Partial<{ role: string; type: string; qty: string }>) => {
                              const next = tubeRows.map((x, i) => (i === idx ? { ...x, ...patch } : x));
                              setTubeRows(next);
                              setSpecs({ ...specs, tubes: buildTubes(next) });
                            };
                            return (
                              <div key={idx} className="flex gap-2 items-center -mr-10">
                                {/* 역할 — 변경 시 종류 리셋. 선택 시 우측 X(역할+종류 둘 다 초기화), ▼ 왼쪽 */}
                                <div className="relative flex-1 min-w-0">
                                  <Select
                                    aria-label={`진공관 ${idx + 1} 역할`}
                                    value={row.role}
                                    onChange={(e) => update({ role: e.target.value, type: '' })}
                                    className={`pl-3 ${row.role ? 'pr-12' : 'pr-9'} ${row.role ? '' : 'text-muted'}`}
                                  >
                                    <option value="" disabled>역할</option>
                                    {TUBE_ROLE_OPTS.map((o) => (
                                      <option key={o} value={o} className="text-fg">{o}</option>
                                    ))}
                                  </Select>
                                  {row.role && (
                                    <button
                                      type="button"
                                      aria-label="초기화"
                                      onClick={() => update({ role: '', type: '' })}
                                      className="absolute right-7 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-muted hover:text-fg"
                                    >
                                      <X aria-hidden className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                                {/* 종류 — Autocomplete(검색+직접입력). 역할별 동적 옵션, 역할 미선택 시 옵션 없음+직접입력 차단 */}
                                <div className="flex-1 min-w-0">
                                  <Autocomplete
                                    aria-label={`진공관 ${idx + 1} 종류`}
                                    value={row.type}
                                    onChange={(v) => update({ type: v })}
                                    options={typeOpts}
                                    allowCustom={!!row.role}
                                    placeholder="종류"
                                  />
                                </div>
                                {/* 개수 */}
                                <Input
                                  aria-label={`진공관 ${idx + 1} 개수`}
                                  value={row.qty}
                                  onChange={(e) => update({ qty: numOnly(e.target.value) })}
                                  inputMode="numeric"
                                  placeholder="개수"
                                  className="w-20 flex-shrink-0"
                                />
                                {/* 행삭제 (2행 이상일 때만) */}
                                {tubeRows.length > 1 ? (
                                  <Button
                                    iconOnly
                                    size="sm"
                                    aria-label={`진공관 ${idx + 1} 삭제`}
                                    onClick={() => { const next = tubeRows.filter((_, i) => i !== idx); setTubeRows(next); setSpecs({ ...specs, tubes: buildTubes(next) }); }}
                                  >
                                    <X aria-hidden className="w-4 h-4" />
                                  </Button>
                                ) : (
                                  <div className="w-8 flex-shrink-0" />
                                )}
                              </div>
                            );
                          })}
                          <Button size="sm" onClick={() => setTubeRows((prev) => [...prev, { role: '', type: '', qty: '' }])}>
                            <Plus aria-hidden className="w-4 h-4" /> 진공관 추가
                          </Button>
                        </div>
                      </Field>
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
                      {/* 사양 추가 줄 — [제목][내용][삭제], 칸 테두리 border-line(공통 Input) */}
                      <div className="spec-field">
                        <div className="space-y-2">
                          {customSpecs.map((r, i) => (
                            <div key={i} className="flex gap-2 items-center -mr-10">
                              <Input
                                value={r.title}
                                onChange={(e) => updateRow(i, { title: e.target.value })}
                                placeholder="제목"
                                aria-label={`사양 ${i + 1} 제목`}
                                className="flex-[2_1_0]"
                              />
                              <Input
                                value={r.value}
                                onChange={(e) => updateRow(i, { value: e.target.value })}
                                placeholder="내용"
                                aria-label={`사양 ${i + 1} 내용`}
                                className="flex-[3_1_0]"
                              />
                              <Button iconOnly size="sm" aria-label={`사양 ${i + 1} 삭제`} onClick={() => setCustomSpecs((rows) => rows.filter((_, idx) => idx !== i))}>
                                <X aria-hidden className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                          <Button size="sm" onClick={() => setCustomSpecs((rows) => [...rows, { title: '', value: '' }])}>
                            <Plus aria-hidden className="w-4 h-4" /> 사양 추가
                          </Button>
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
                        <Button onClick={() => setDetailExpanded((v) => !v)} aria-expanded={detailExpanded} className="w-full">
                          <span className="flex-1 text-left">상세 사양 ({detailCount})</span>
                          <ChevronDown aria-hidden className={`w-4 h-4 text-muted ${detailExpanded ? 'rotate-180' : ''}`} />
                        </Button>
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
                  <Field key={f.key} className="spec-field" label={f.label}>
                    {({ id }) =>
                      f.key === 'otherSpecs' ? (
                        // 기타 사양 — 스키마 칸(OTHER_SPECS_FIELD)과 같은 여러 줄 자유 글
                        <SpecTextarea id={id} value={specs[f.key] || ''} onChange={(v) => setSpecs({ ...specs, [f.key]: v })} maxLength={OTHER_SPECS_INPUT.maxLength} placeholder={OTHER_SPECS_INPUT.placeholder} />
                      ) : (
                        <Input id={id} value={specs[f.key] || ''} onChange={(e) => setSpecs({ ...specs, [f.key]: e.target.value })} />
                      )
                    }
                  </Field>
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
                사진<RequiredMark />
              </h3>
            </div>
            {/* 안내 문구 3곳(이 설명, 예시 이름, 5장 권장)은 FEATURE_FLAGS.photoSectionHints 꺼지면 숨김 (2026-11-10) */}
            {FEATURE_FLAGS.photoSectionHints && (
              <p className="text-14 text-fg mb-5">
                다른 사이트나 제조업체에서 가져온 스크린샷이나 사진은 허용되지 않습니다. 620×620px 이상의 정사각형 사진이 가장 좋습니다.
              </p>
            )}

            <div className="mb-5">
              <p className="text-14 font-bold text-fg mb-2">예시</p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {PHOTO_EXAMPLES.map((ex) => (
                  <div key={ex.label} className="text-center">
                    <div className="aspect-square rounded-none overflow-hidden bg-bg border border-line mb-1">
                      <img src={ex.img} alt={ex.label} className="w-full h-full object-cover" />
                    </div>
                    {FEATURE_FLAGS.photoSectionHints && <p className="text-12 text-fg">{ex.label}</p>}
                  </div>
                ))}
              </div>
              {FEATURE_FLAGS.photoSectionHints && <p className="text-12 text-muted mt-2">5장 이상 권장해요. 꼭 필요한 건 1장이에요.</p>}
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
            {/* 사진 슬롯(올리는 칸) — 1px 점선 border-line. 버튼을 눌러도 바깥 칸의 onClick 으로 파일 선택이 열림 */}
            <div
              onClick={openFilePicker}
              onDrop={onDrop}
              onDragOver={onDragOver}
              className="border border-dashed border-line hover:border-fg hover:bg-surface rounded-none py-12 flex flex-col items-center justify-center text-center cursor-pointer"
            >
              <Button className="mb-3">
                <Plus aria-hidden className="w-4 h-4" />
                사진 업로드
              </Button>
              <Upload aria-hidden className="w-5 h-5 text-muted mb-1" />
              <p className="text-14 text-fg">
                또는 대표 이미지 포함 최대 <span className="font-bold">{MAX_IMAGES}장</span>까지 드래그 앤 드롭하세요.
              </p>
            </div>
            {/* 업로드 중 / 에러 표시 */}
            {uploadingCount > 0 && (
              <div className="mt-3 text-14 text-fg" role="status">
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
                      className="relative aspect-square rounded-none overflow-hidden border border-line bg-surface"
                    >
                      <img src={img} alt={`등록 사진 ${idx + 1}`} className="w-full h-full object-contain" />
                      {idx === 0 && (
                        <span className="absolute top-1 left-1 px-2 py-1 bg-fg text-bg text-12">
                          대표
                        </span>
                      )}
                      {/* 삭제 — 늘 보임(예전엔 마우스 올릴 때만 보여 손가락, 키보드로는 못 찾음) */}
                      <Button iconOnly size="sm" aria-label={`사진 ${idx + 1} 삭제`} onClick={() => removeImage(idx)} className="absolute top-1 right-1">
                        <X aria-hidden className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="bg-bg border border-line rounded-none p-6">
            <h3 className="text-20 font-bold mb-4">설명</h3>

            {/* 설명 — 서식 버튼(굵게, 기울임, 목록)은 누르는 동작이 없어 삭제(2026-11-10 디자인 3a). 글은 줄바꿈 그대로 저장 */}
            <Field label="이 상품과 그 상태에 대해 설명해 주세요" hint={`${description.length}자 입력됨`}>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} placeholder="사용 기간, 보관 상태, 흠집이나 작동 이상이 있으면 적어 주세요" />
            </Field>

            <div className="mt-4 pt-4 border-t border-line">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={asDescribed}
                  onChange={(e) => setAsDescribed(e.target.checked)}
                  className="mt-1 accent-fg w-4 h-4"
                />
                <div>
                  <p className="font-bold text-14">사진과 설명이 실제 상태와 같음을 확인합니다<RequiredMark /></p>
                  <p className="text-12 text-muted mt-1">
                    실제와 다른 점이 있으면 거래 취소나 분쟁의 원인이 돼요. 흠집, 수리 이력, 소리 이상은 미리 적어 두는 게 안전해요
                  </p>
                </div>
              </label>
            </div>

            <div className="mt-4 pt-4 border-t border-line">
              {/* 접기 머리 — 제목 줄 모양이라 공통 Button 아님 */}
              <button
                type="button"
                onClick={() => setSkuOpen(!skuOpen)}
                aria-expanded={skuOpen}
                className="w-full flex items-center justify-between font-bold"
              >
                SKU
                <ChevronDown
                  aria-hidden
                  className={`w-5 h-5 ${skuOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {skuOpen && (
                <div className="mt-3">
                  <Input aria-label="SKU" value={sku} onChange={(e) => setSku(e.target.value)} />
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
              <Field label="유튜브 영상 링크를 붙여넣으세요">
                <Input value={youtubeLink} onChange={(e) => setYoutubeLink(e.target.value)} />
              </Field>
            </div>
          </section>

          <h2 id="section-price" className="text-24 font-bold pl-2 pt-2">
            가격
          </h2>
          <section className="bg-bg border border-line rounded-none p-6">
            <div className="space-y-4">
              {/* 통화 — 판매 가격과 정가에 같이 적용. 환산 표시는 아직 없음(베타 3) */}
              {/* 선택 부품: 2개라 버튼(늘 하나는 골라져 있어 해제 없음) */}
              <Field className="max-w-[12rem]" label="통화" group={choiceAsButtons(CURRENCY_OPTS.length, false, 'currency')}>
                {({ id, labelId }) => (
                  <ChoiceField
                    fieldKey="currency"
                    labelledBy={labelId}
                    options={CURRENCY_OPTS.map((o) => ({ value: o.value, label: `${o.label} (${CURRENCY_SYMBOLS[o.value]})` }))}
                    value={currency}
                    onChange={setCurrency}
                    allowClear={false}
                    dropdown={
                      <Select id={id} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                        {CURRENCY_OPTS.map((o) => (
                          <option key={o.value} value={o.value} className="text-fg">{o.label} ({CURRENCY_SYMBOLS[o.value]})</option>
                        ))}
                      </Select>
                    }
                  />
                )}
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="판매 가격" required>
                  {({ id }) => (
                    <div className="relative">
                      <Input
                        id={id}
                        aria-required
                        value={price}
                        onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ''))}
                        className="pl-3 pr-12"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">{CURRENCY_SYMBOLS[currency]}</span>
                    </div>
                  )}
                </Field>
                <Field label={<>정가 <span className="text-muted font-regular">(선택)</span></>}>
                  {({ id }) => (
                    <div className="relative">
                      <Input
                        id={id}
                        value={comparePrice}
                        onChange={(e) => setComparePrice(e.target.value.replace(/[^0-9]/g, ''))}
                        className="pl-3 pr-12"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">{CURRENCY_SYMBOLS[currency]}</span>
                    </div>
                  )}
                </Field>
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
            {/* 배송 방식 — 예전 라디오 카드 3개 → 선택 부품(ChoiceField, 3개라 버튼). 저장값 그대로(free, flat, calculated, 안 고르면 '')
                라디오처럼 한 번 고르면 해제 없음(allowClear false). 고른 방식의 설명 한 줄은 칸 아래 안내(hint)로 */}
            <Field
              className="mb-4"
              label="배송 방식"
              group={choiceAsButtons(SHIPPING_OPTS.length, false, 'shippingType')}
              hint={SHIPPING_OPTS.find((o) => o.value === shippingType)?.desc}
            >
              {({ id, labelId }) => (
                <ChoiceField
                  fieldKey="shippingType"
                  labelledBy={labelId}
                  options={SHIPPING_OPTS}
                  value={shippingType}
                  onChange={(v) => setShippingType(v as 'free' | 'flat' | 'calculated')}
                  allowClear={false}
                  dropdown={
                    <Select id={id} value={shippingType} onChange={(e) => setShippingType(e.target.value as 'free' | 'flat' | 'calculated')} className={shippingType ? '' : 'text-muted'}>
                      <option value="" disabled>선택하세요</option>
                      {SHIPPING_OPTS.map((o) => (
                        <option key={o.value} value={o.value} className="text-fg">{o.label}</option>
                      ))}
                    </Select>
                  }
                />
              )}
            </Field>
            {shippingType === 'flat' && (
              <Field label="고정 배송비">
                {({ id }) => (
                  <div className="relative max-w-xs">
                    <Input
                      id={id}
                      value={shippingCost}
                      onChange={(e) => setShippingCost(e.target.value.replace(/[^0-9]/g, ''))}
                      className="pl-3 pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">원</span>
                  </div>
                )}
              </Field>
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
              {/* 선택 부품: 2개라 버튼(늘 하나는 골라져 있어 해제 없음). 지역은 17개, 47개라 드롭다운 그대로 */}
              <Field label="국가" group={choiceAsButtons(LOCATION_COUNTRY_OPTS.length, false, 'locationCountry')}>
                {({ id, labelId }) => (
                  <ChoiceField
                    fieldKey="locationCountry"
                    labelledBy={labelId}
                    options={LOCATION_COUNTRY_OPTS}
                    value={locationCountry}
                    onChange={onLocationCountryChange}
                    allowClear={false}
                    dropdown={
                      <Select id={id} value={locationCountry} onChange={(e) => onLocationCountryChange(e.target.value)}>
                        {LOCATION_COUNTRY_OPTS.map((o) => (
                          <option key={o.value} value={o.value} className="text-fg">{o.label}</option>
                        ))}
                      </Select>
                    }
                  />
                )}
              </Field>
              <Field label="지역">
                <Select value={location} onChange={(e) => setLocation(e.target.value)} className={location ? '' : 'text-muted'}>
                  <option value="">선택하세요</option>
                  {locationOptsFor(locationCountry).map((o) => (
                    <option key={o.value} value={o.value} className="text-fg">{o.label}</option>
                  ))}
                </Select>
              </Field>
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
              <Button variant="primary" onClick={handleSubmit} disabled={submitting} className="flex-1">
                <Plus aria-hidden className="w-5 h-5" />
                {submitting ? '등록 중…' : '상품 등록하기'}
              </Button>
              {/* 임시 저장 — 자동 저장(1초 뒤)과 같은 저장본에 바로 저장 */}
              <Button
                onClick={() => {
                  if (draftPrompt && draftJson === initialDraftJson.current) return; // 안내가 떠 있고 아무것도 안 쳤으면 예전 저장본을 지우지 않음
                  setDraftPrompt(null); setDraftReady(true); saveDraftNow(draftJson);
                }}
                className="flex-1"
              >
                임시 저장
              </Button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </main>
  );
}
