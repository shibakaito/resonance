'use client';
import { useState, useRef, useEffect } from 'react';
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
import { TOP_CATEGORIES, subcategoriesFor, CATEGORY_TREE, ALL_BRAND_NAMES, searchBrands, CATALOG } from '../data/catalog';
import { insertListing } from '@/lib/listings';
import { en2ko, ko2en } from '@/lib/keyboard-layout';
import { uploadListingImage } from '@/lib/upload-image';
import { SPEC_FIELDS } from '../data/spec-fields';
import { SPEC_FIELDS_BY_CATEGORY, AMP_OHM_OPTS, TERMINAL_ALIASES, DRIVER_TYPES, DRIVER_STRUCT, DRIVER_MATERIAL, COAXIAL_BANDS } from '../data/category-specs';

const CATEGORIES = TOP_CATEGORIES;

/**
 * 카테고리 풀패스 목록 (예: '앰프 > 프리앰프')
 * - subs가 있으면 각 sub마다 풀패스 1줄
 * - subs가 없으면 top만 (leaf는 빈 문자열)
 * - 사용자가 입력으로 검색·선택할 때 사용
 */
const CATEGORY_PATHS: { path: string; top: string; leaf: string }[] = CATEGORY_TREE.flatMap(
  ({ top, subs }) =>
    subs.length === 0
      ? [{ path: top, top, leaf: '' }]
      : subs.flatMap((s) =>
          typeof s === 'string'
            ? [{ path: `${top} > ${s}`, top, leaf: s }]
            : s.items.map((it) => ({ path: `${top} > ${s.group} > ${it}`, top, leaf: it })) // 그룹: 3단계 경로
        )
);
const CATEGORY_PATH_STRINGS = CATEGORY_PATHS.map((p) => p.path);

const COUNTRIES = ['미국', '일본', '독일', '영국', '한국', '중국', '대만', '이탈리아', '프랑스', '캐나다'];

// 소유권 — 버튼 토글 (영문 키로 저장, labels.ts의 ownership과 동일)
const OWNERSHIP_OPTIONS = [
  { value: 'single_owner', label: '1인 소유' },
  { value: 'multiple_owners', label: '다중 소유' },
];

// 상태: DB에 저장되는 영문 키(value) + 화면 표시(label). labels.ts의 condition과 동일.
const CONDITIONS = [
  { value: 'new', label: '새상품', desc: '사용하지 않은 새 제품' },
  { value: 'unopened', label: '미개봉', desc: '포장을 개봉하지 않은 새 제품' },
  { value: 'nos', label: 'NOS', desc: '신품이지만 오래 보관된 재고품 (New Old Stock)' },
  { value: 'used_mint', label: '민트급', desc: '새상품에 가까운 상태로 사용 흔적이 거의 없음' },
  { value: 'used_excellent', label: '매우 좋음', desc: '가벼운 사용감만 있는 양호한 상태' },
  { value: 'used_good', label: '좋음', desc: '약간의 외관 흠집이 있으나 깨끗한 상태' },
  { value: 'used_fair', label: '보통', desc: '눈에 띄는 사용감, 작동은 정상' },
  { value: 'used_needs_service', label: '점검 필요', desc: '작동 이상 또는 점검/수리가 필요' },
  { value: 'used_not_working', label: '작동 불가', desc: '부품용 또는 수리를 전제로 한 상태' }
];

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
      return <span className="bg-yellow-200">{text}</span>;
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
      <span className="bg-yellow-200">{text.slice(startOrig, endOrig)}</span>
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
      {/* 드롭다운 — 펼치면 select처럼 항목 목록, 선택 항목은 왼쪽에 체크 */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full h-[42px] border border-[#e0e0e0] rounded-none pl-3 pr-9 flex items-center bg-white focus:outline-none focus:border-[#000000]"
        >
          <span className="text-gray-400">선택하세요</span>
          <ChevronDown className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="absolute z-30 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-[#e0e0e0] rounded-none shadow-lg py-1">
            {options.map((o) => {
              const active = selected.includes(o);
              return (
                <button
                  key={o}
                  type="button"
                  onClick={() => toggle(o)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-[#f7f7f7] ${active ? 'bg-[#f7f7f7] font-semibold text-[#000000]' : 'text-gray-800'}`}
                >
                  {o}
                  {active && <Check className="w-4 h-4 text-[#000000]" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {/* 회색 읽기전용 범위칸 + X 초기화 */}
      <div className="relative mt-2">
        <input
          readOnly
          value={displayText}
          className="w-full h-[42px] border border-[#e0e0e0] rounded-none pl-3 pr-9 py-2 bg-[#f7f7f7] text-gray-600 cursor-default focus:outline-none"
        />
        {selected.length > 0 && (
          <button
            type="button"
            aria-label="초기화"
            onClick={() => onChange([])}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-full hover:bg-[#e0e0e0]"
          >
            <X className="w-4 h-4" />
          </button>
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
}: {
  options: string[];
  selected: string[];
  onChange: React.Dispatch<React.SetStateAction<string[]>>;
  aliases?: Record<string, string[]>; // 단자명 → 검색 별칭 목록
}) {
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
  // 단일 검색어 → 매칭 옵션 (옵션명/별칭 양방향 부분일치)
  const compute = (qStr: string): string[] => {
    const nqq = norm(qStr);
    if (!nqq) return options;
    return options.filter((o) =>
      [o, ...(aliases?.[o] ?? [])].some((c) => {
        const nc = norm(c);
        return nc.includes(nqq) || (nc.length >= 2 && nqq.includes(nc));
      })
    );
  };
  // 1차: 원본 검색어. 0건이면 한영 자판 변환 fallback (browse 검색과 동일 패턴)
  let matched = !nq ? options : compute(query);
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
  // 직접 입력 항목을 함께 노출하는 조건 (검색어가 옵션명과 정확히 같으면 제외)
  const showDirect = !!query.trim() && !options.some((o) => norm(o) === nq);
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
          className="w-full h-[42px] border border-[#e0e0e0] rounded-none pl-3 pr-9 py-2 bg-white focus:outline-none focus:border-[#000000]"
        />
        <ChevronDown className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-transform pointer-events-none ${open ? 'rotate-180' : ''}`} />
        {open && (
          <div ref={listRef} className="absolute z-30 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-[#e0e0e0] rounded-none shadow-lg">
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
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left ${nav ? 'bg-[#f7f7f7]' : ''} ${active ? 'bg-[#f7f7f7] font-semibold text-[#000000]' : 'text-gray-800'}`}
                >
                  <span>{highlightMatch(o, query)}</span>
                  {active && <Check className="w-4 h-4 text-[#000000] flex-shrink-0" />}
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
                className={`w-full text-left px-3 py-2 text-sm text-blue-700 ${activeIdx === matched.length ? 'bg-[#f7f7f7]' : ''} ${matched.length > 0 ? 'border-t border-[#e0e0e0]' : ''}`}
              >
                직접 입력: <span className="font-semibold">{query.trim()}</span>
              </button>
            )}
            {/* 매칭도 없고 검색어도 없을 때만 안내 */}
            {matched.length === 0 && !query.trim() && (
              <div className="px-3 py-2 text-sm text-gray-500">검색 결과 없음</div>
            )}
          </div>
        )}
      </div>
      {/* 선택된 항목 칩 — 흰색 영역, 각 칩 개별 X */}
      <div className="min-h-[42px] mt-2 border border-[#e0e0e0] rounded-none bg-white px-2 py-1.5 flex flex-wrap gap-2 items-center">
        {selected.map((o) => (
          <span key={o} className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 bg-[#f7f7f7] border border-[#e0e0e0] rounded-none text-sm text-gray-700">
            {o}
            <button
              type="button"
              aria-label={`${o} 삭제`}
              onClick={() => remove(o)}
              className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        ))}
      </div>
    </div>
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
        className="w-full border border-[#e0e0e0] rounded-none pl-3 pr-9 py-2 focus:outline-none focus:border-[#000000]"
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
          className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-full hover:bg-[#f7f7f7]"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      {open && (!hideUntilTyping || qNorm) && (
        <div
          ref={listRef}
          className="absolute z-30 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-[#e0e0e0] rounded-none shadow-lg"
        >
          {matched.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500">검색 결과 없음</div>
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
                  className={`w-full text-left px-3 py-2 text-sm ${
                    isActive ? 'bg-[#f7f7f7]' : ''
                  } ${
                    isFree
                      ? 'text-blue-700 border-t border-[#e0e0e0]'
                      : value === item.text
                      ? 'font-semibold text-[#000000]'
                      : 'text-gray-800'
                  }`}
                >
                  {isFree ? (
                    <>
                      직접 입력: <span className="font-semibold">{item.text}</span>
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
type DriverRow = { type: string; structure: string; material: string; band: string; size: string; count: string };
const BLANK_DRIVER_ROW: DriverRow = { type: '', structure: '', material: '', band: '', size: '', count: '' };

// 종류 → 담당 영역(대역). way 계산용. 동축은 담당대역 문자열을 '+'/'/'로 쪼개 각 역할명을 대역으로.
const ROLE_BAND: Record<string, string> = { '우퍼': '저역', '미드우퍼': '중저역', '미드레인지': '중역', '트위터': '고역', '슈퍼 트위터': '초고역', '풀레인지': '전대역' };
// 드라이버 행들 → 요약 문자열. way=서로 다른 담당 영역 수, driver=개수 합.
//   일반/풀레인지: "{크기} {재질(끝 '콘' 제거)} {구조} {종류} ({개수})" / 동축: "{크기} {구조} 타입({담당대역}) ({개수})"
function driverSummary(rows: DriverRow[]): string {
  const active = rows.filter((r) => r.type);
  if (active.length === 0) return '';
  const bands = new Set<string>();
  let drivers = 0;
  const parts: string[] = [];
  for (const r of active) {
    const n = parseInt(r.count, 10);
    if (Number.isFinite(n)) drivers += n;
    if (r.type === '동축') {
      (r.band || '').split(/[+/]/).map((s) => s.trim()).filter(Boolean).forEach((seg) => bands.add(ROLE_BAND[seg] ?? seg));
      parts.push(`${r.size} ${r.structure} 타입(${r.band})${r.count ? ` (${r.count})` : ''}`.replace(/\s+/g, ' ').trim());
    } else {
      bands.add(ROLE_BAND[r.type] ?? r.type);
      const mat = (r.material || '').replace(/\s*콘$/, ''); // 페이퍼 콘 → 페이퍼
      parts.push(`${r.size} ${mat} ${r.structure} ${r.type}${r.count ? ` (${r.count})` : ''}`.replace(/\s+/g, ' ').trim());
    }
  }
  return `${bands.size}-way, ${drivers} driver, ${parts.join(' / ')}`;
}

function DriverConfigBuilder({ rows, onChange, subwoofer = false }: { rows: DriverRow[]; onChange: (rows: DriverRow[]) => void; subwoofer?: boolean }) {
  const update = (i: number, patch: Partial<DriverRow>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const inputCls = 'h-[42px] border border-[#e0e0e0] rounded-none px-2 bg-white text-sm focus:outline-none focus:border-[#000000]';
  const summary = driverSummary(rows);
  // 서브우퍼: 종류는 우퍼·패시브 라디에이터만, 셀(구조/재질/크기/개수)은 처음부터 펼침
  const typeOpts = subwoofer ? ['우퍼', '패시브 라디에이터'] : DRIVER_TYPES;
  return (
    <div className="space-y-2">
      {rows.map((row, i) => {
        const isCoax = row.type === '동축';
        return (
          <div key={i} className="flex items-center gap-1.5 -mr-6">
            {/* 종류 (항상 표시) */}
            <div className="relative w-28 flex-shrink-0">
              <select
                value={row.type}
                onChange={(e) => update(i, { type: e.target.value, structure: '', material: '', band: '' })}
                className={`w-full appearance-none border border-[#e0e0e0] rounded-none pl-2 ${row.type ? 'pr-11' : 'pr-6'} h-[42px] text-sm bg-white focus:outline-none focus:border-[#000000] ${row.type ? '' : 'text-gray-400'}`}
              >
                <option value="" disabled>종류</option>
                {typeOpts.map((t) => (
                  <option key={t} value={t} className="text-[#000000]">{t}</option>
                ))}
              </select>
              {row.type && (
                <button
                  type="button"
                  aria-label="종류 초기화"
                  onClick={() => update(i, { type: '', structure: '', material: '', band: '' })}
                  className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-full hover:bg-[#f7f7f7]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <ChevronDown className="w-4 h-4 absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
            {/* 구조·재질(또는 담당대역)·크기·개수 — 종류 선택 시 표시(서브우퍼는 처음부터 항상 표시) */}
            {(subwoofer || row.type) && (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <div className="flex-1 min-w-0">
                <Typeahead value={row.structure} onChange={(v) => update(i, { structure: v })} options={DRIVER_STRUCT[row.type] ?? []} freeText placeholder="구조" />
              </div>
              <div className="flex-1 min-w-0">
                {isCoax ? (
                  <Typeahead value={row.band} onChange={(v) => update(i, { band: v })} options={COAXIAL_BANDS} freeText placeholder="담당 대역" />
                ) : (
                  <Typeahead value={row.material} onChange={(v) => update(i, { material: v })} options={DRIVER_MATERIAL[row.type] ?? []} freeText placeholder="재질" />
                )}
              </div>
              <input
                value={row.size}
                onChange={(e) => update(i, { size: e.target.value })}
                placeholder="크기"
                className={`${inputCls} w-28 flex-shrink-0`}
              />
              <input
                value={row.count}
                onChange={(e) => update(i, { count: e.target.value.replace(/[^0-9]/g, '') })}
                inputMode="numeric"
                placeholder="개수"
                className={`${inputCls} w-14 flex-shrink-0 text-center px-1`}
              />
            </div>
            )}
            {/* 삭제 (항상 표시) */}
            {rows.length > 1 ? (
              <button
                type="button"
                aria-label="행 삭제"
                onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
                className="w-5 h-5 flex-shrink-0 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-full hover:bg-[#f7f7f7]"
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
        onClick={() => onChange([...rows, { ...BLANK_DRIVER_ROW }])}
        className="text-sm text-[#000000] font-semibold inline-flex items-center gap-1 hover:underline"
      >
        <Plus className="w-3.5 h-3.5" /> 드라이버 추가
      </button>
      {/* 자동 요약 (읽기 전용) — 임피던스 회색칸처럼 선택 내역을 문자열로 */}
      {summary && (
        <div className="px-3 py-2 bg-[#f7f7f7] border border-[#e0e0e0] rounded-none text-sm text-gray-700 break-words">
          {summary}
        </div>
      )}
    </div>
  );
}

// 앰프 출력 빌더(액티브 전용) — 행 1개 = 드라이버 종류(앞칸) + 그 드라이버를 구동하는 앰프 출력값(뒤칸, 자유 입력).
// "앰프 구성" 바로 아래에 표시. 요약(보기) 박스는 두지 않음 — way/driver 요약은 드라이버 구성에만.
type AmpPowerRow = { type: string; power: string };
const BLANK_AMP_POWER_ROW: AmpPowerRow = { type: '', power: '' };
// 앰프 출력 종류 목록 — '전체'(단일 앰프가 전 대역 구동, 예: 싱글앰프) 맨 앞 + 동축·패시브 라디에이터 제외
// (동축=복합 유닛이라 매칭 모호 / 패시브 라디에이터=앰프 없는 수동 유닛)
const AMP_POWER_TYPES = ['전체', ...DRIVER_TYPES.filter((t) => t !== '동축' && t !== '패시브 라디에이터')];

function AmpPowerBuilder({ rows, onChange }: { rows: AmpPowerRow[]; onChange: (rows: AmpPowerRow[]) => void }) {
  const update = (i: number, patch: Partial<AmpPowerRow>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const inputCls = 'h-[42px] border border-[#e0e0e0] rounded-none px-2 bg-white text-sm focus:outline-none focus:border-[#000000]';
  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-1.5 -mr-6">
          {/* 앞칸: 드라이버 종류 (항상 표시) */}
          <div className="relative w-28 flex-shrink-0">
            <select
              value={row.type}
              onChange={(e) => update(i, { type: e.target.value })}
              className={`w-full appearance-none border border-[#e0e0e0] rounded-none pl-2 ${row.type ? 'pr-11' : 'pr-6'} h-[42px] text-sm bg-white focus:outline-none focus:border-[#000000] ${row.type ? '' : 'text-gray-400'}`}
            >
              <option value="" disabled>종류</option>
              {AMP_POWER_TYPES.map((t) => (
                <option key={t} value={t} className="text-[#000000]">{t}</option>
              ))}
            </select>
            {row.type && (
              <button
                type="button"
                aria-label="종류 초기화"
                onClick={() => update(i, { type: '', power: '' })}
                className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-full hover:bg-[#f7f7f7]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <ChevronDown className="w-4 h-4 absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
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
              className="w-5 h-5 flex-shrink-0 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-full hover:bg-[#f7f7f7]"
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
        className="text-sm text-[#000000] font-semibold inline-flex items-center gap-1 hover:underline"
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
  // 상품명 자동 반영 — 브랜드+모델+하위카테고리로 자동 채움. 사용자가 직접 수정하면(titleEdited) 중단.
  const [titleEdited, setTitleEdited] = useState(Boolean(initialData?.title));
  useEffect(() => {
    if (titleEdited) return;
    setTitle([brand, model, subcategory].filter(Boolean).join(' '));
  }, [brand, model, subcategory, titleEdited]);
  const [year, setYear] = useState(initialData?.year ?? '');
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
  const [acceptOffers, setAcceptOffers] = useState(true);
  const [shippingType, setShippingType] = useState<'free' | 'flat' | 'calculated' | ''>('');
  const [shippingCost, setShippingCost] = useState('');
  const [localPickup, setLocalPickup] = useState(false);
  const [activeStep, setActiveStep] = useState('info');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // 제품 정보 추가 필드
  const [ownership, setOwnership] = useState('');
  const [components, setComponents] = useState('');
  const [conditionAppearance, setConditionAppearance] = useState('');         // 드롭다운(등급)
  const [conditionAppearanceDetail, setConditionAppearanceDetail] = useState(''); // 자유 입력칸
  const [conditionWorking, setConditionWorking] = useState('');               // 드롭다운(등급)
  const [conditionWorkingDetail, setConditionWorkingDetail] = useState('');   // 자유 입력칸
  // 복합 입력(정격출력/주파수/크기)의 부분 입력칸 — 변경 시 조립해서 specs에 반영
  const [powerPairs, setPowerPairs] = useState<{ w: string; ohm: string }[]>([{ w: '', ohm: '' }]);
  // range(하한~상한) — key별 보관 (주파수 응답·권장 임피던스 등 range 칸이 여러 개 동시에 떠도 독립)
  const [ranges, setRanges] = useState<Record<string, { low: string; high: string }>>({});
  // 크기(W×D×H mm + 비고) — key별 '행 배열'로 보관 (크기 칸 여러 개·+버튼 추가 지원)
  const [dims, setDims] = useState<Record<string, { w: string; d: string; h: string; note: string }[]>>({});
  // 다중 선택 버튼 (지원 임피던스 / 입력·출력 단자) — 저장 시 배열로 specs.tech에
  const [impedances, setImpedances] = useState<string[]>([]);
  // 다중 선택(단자·무선·포맷 등) 공통 상태 — key별 배열로 보관. (impedance는 전용 위젯이라 별도)
  const [multiSel, setMultiSel] = useState<Record<string, string[]>>({});
  // 드라이버 구성 빌더 행들 (스피커). A단계: 입력만, 요약·저장은 다음 단계.
  const [driverRows, setDriverRows] = useState<DriverRow[]>([{ ...BLANK_DRIVER_ROW }]);
  const [ampPowerRows, setAmpPowerRows] = useState<AmpPowerRow[]>([{ ...BLANK_AMP_POWER_ROW }]);
  // 크로스오버 주파수(Hz) 여러 개 — 추가 버튼으로 행 늘림. 저장 시 'A / B / C'로 조립.
  const [crossoverValues, setCrossoverValues] = useState<{ value: string; unit: string }[]>([{ value: '', unit: 'Hz' }]);
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
  // 조립 함수 (저장/표시용 문자열)
  const buildPower = (pairs: { w: string; ohm: string }[]) =>
    pairs.filter((p) => p.w.trim()).map((p) => `${p.w.trim()}W${p.ohm ? ` @ ${p.ohm}` : ''}`).join(', ');
  const buildFreq = (lo: string, hi: string, loUnit = 'Hz', hiUnit = 'kHz') => {
    const l = lo.trim(), h = hi.trim();
    if (!l && !h) return '';
    return `${l ? l + loUnit : ''}~${h ? h + hiUnit : ''}`;
  };
  const buildDim = (w: string, d: string, h: string) => {
    if (!w.trim() && !d.trim() && !h.trim()) return '';
    return `${w.trim()}×${d.trim()}×${h.trim()}`;
  };
  // 크기 행 배열 → 문자열. 각 행 "W×D×H (비고)", 여러 행은 ' / '로. (W·D·H 모두 빈 행 제외)
  const buildDims = (rows: { w: string; d: string; h: string; note: string }[]) =>
    rows.map((r) => { const dim = buildDim(r.w, r.d, r.h); if (!dim) return ''; return r.note.trim() ? `${dim} (${r.note.trim()})` : dim; }).filter(Boolean).join(' / ');
  const [techExpanded, setTechExpanded] = useState(true); // 기술 사양 섹션 접기/펼치기
  // 기술 사양 (16개 필드를 객체 하나로 관리)
  const [specs, setSpecs] = useState<Record<string, string>>({
    type: '', channel: '', device: '', powerRated: '',
    freqResponse: '', impedance: '', thd: '', snr: '',
    damping: '', inputs: '', outputs: '', phono: '',
    toneControl: '', power: '', dimensions: '', weight: '',
  });
  // 사운드바는 액티브 고정 — 선택 시 형식(speakerDetail)을 자동 'active'로 (형식 칸은 렌더에서 숨김)
  useEffect(() => {
    if (subcategory === '사운드바') {
      setSpecs((s) => (s.speakerDetail === 'active' ? s : { ...s, speakerDetail: 'active' }));
    }
  }, [subcategory]);

  // 폼 제출 → Supabase에 매물 INSERT → 성공 시 상세 페이지로 이동
  const handleSubmit = async () => {
    setSubmitError(null);
    if (!brand || !model) { setSubmitError('브랜드와 모델명을 입력해주세요.'); return; }
    if (!category) { setSubmitError('카테고리를 선택해주세요.'); return; }
    if (!title.trim()) { setSubmitError('상품명을 입력해주세요.'); return; }
    if (!condition) { setSubmitError('상태를 선택해주세요.'); return; }
    if (!price) { setSubmitError('가격을 입력해주세요.'); return; }
    setSubmitting(true);
    try {
      // specs(jsonb)에 저장할 값들 — 비어있는 키는 제외 (DB 깔끔하게)
      const specsToSave: Record<string, string> = {};
      // 외관/작동 상태
      if (conditionAppearance) specsToSave.appearance = conditionAppearance;
      if (conditionAppearanceDetail) specsToSave.appearanceDetail = conditionAppearanceDetail;
      if (conditionWorking) specsToSave.working = conditionWorking;
      if (conditionWorkingDetail) specsToSave.workingDetail = conditionWorkingDetail;
      // 구성품
      if (components) specsToSave.components = components;
      // 기술 사양 → specs.tech 중첩 객체에 저장 (값/배열 있는 것만, 빈 값·빈 배열 제외).
      // ⚠️ 옛 카탈로그 평면 키(phono/power/toneControl 등)와 충돌 방지 위해 tech 네임스페이스 분리.
      // ⚠️ 카테고리별 스키마(앰프 등)가 있으면 그 필드를 kind별로 조립, 없으면 기존 SPEC_FIELDS 폴백(분기).
      const tech: Record<string, string | string[]> = {};
      const catFields = SPEC_FIELDS_BY_CATEGORY[category];
      if (catFields) {
        for (const f of catFields) {
          // 조건부 필드(형식·서브우퍼별): 화면에 안 보이는 필드는 저장하지 않음(전환 시 잔여값 방지)
          if (f.showWhen && !f.showWhen({ ...specs, __sub: subcategory })) continue;
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
          } else if (f.input.kind === 'crossover') {
            // 크로스오버: 주파수(Hz) 여러 개 → "250Hz / 2500Hz"
            const v = crossoverValues.filter((x) => x.value.trim()).map((x) => `${x.value.trim()}${x.unit}`).join(' / ');
            if (v) tech[f.key] = v;
          } else if (f.input.kind === 'multi') {
            // 다중 선택: 배열 그대로 (임피던스/입력·출력 단자/무선)
            const arr = f.key === 'impedance' ? impedances : (multiSel[f.key] ?? []);
            if (arr.length > 0) tech[f.key] = arr;
          } else if (f.input.kind === 'drivers') {
            // 드라이버 구성(빌더): 행들 → 요약 문자열 (UI 요약과 동일)
            const v = driverSummary(driverRows);
            if (v) tech[f.key] = v;
          } else if (f.input.kind === 'ampPower') {
            // 앰프 출력(빌더): 종류별 출력값 → "우퍼 200W / 트위터 100W" (종류 있는 행만)
            const v = ampPowerRows
              .filter((r) => r.type)
              .map((r) => (r.power.trim() ? `${r.type} ${r.power.trim()}` : r.type))
              .join(' / ');
            if (v) tech[f.key] = v;
          } else if (f.input.kind === 'numSelect') {
            // 숫자 + 타입(RMS/Peak) → "150W RMS" (숫자 있을 때만 저장)
            const num = specs[f.key]?.trim();
            const t = specs[`${f.key}Type`]?.trim();
            if (num) tech[f.key] = `${num}${f.input.unit ?? ''}${t ? ` ${t}` : ''}`;
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
      if (Object.keys(tech).length > 0) (specsToSave as Record<string, unknown>).tech = tech;

      const id = await insertListing({
        images, title, category, subcategory, brand, model, year, finish, country,
        handmade, condition, ownership, description, sku, youtubeLink, price, comparePrice,
        acceptOffers, shippingType, shippingCost, localPickup,
        specs: specsToSave,
      });
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
    if (id === 'photos') return images.length > 0 && description.length > 10;
    if (id === 'price') return Boolean(price);
    if (id === 'shipping') return Boolean(shippingType);
    return false;
  };

  return (
    <main className="bg-[#f7f7f7] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-6">
      <nav className="flex items-center gap-1 text-sm text-gray-600 mb-4">
        <button className="hover:text-[#000000]">내 상품 목록</button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-[#000000] font-medium truncate max-w-md">
          {title || '새 상품 등록'}
        </span>
      </nav>

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
                          isDone ? 'bg-gray-700' : 'bg-[#e0e0e0]'
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
                            ? 'bg-[#000000] border-[#000000] text-white'
                            : isActive
                            ? 'bg-white border-[#000000] text-[#000000]'
                            : 'bg-white border-[#e0e0e0] text-gray-400'
                        }`}
                      >
                        {isDone ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <span className="text-xs font-bold">{idx + 1}</span>
                        )}
                      </span>
                      <span
                        className={`font-semibold transition ${
                          isActive ? 'text-[#000000]' : 'text-gray-500 group-hover:text-gray-700'
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
            className="bg-white border border-[#e0e0e0] rounded-none py-6 px-10"
          >
            <h2 className="text-2xl font-bold mb-2">제품 정보</h2>
            <div className="space-y-4">
              {/* 카테고리 — 풀패스("앰프 > 프리앰프")로 검색·표시. 선택 시 상위/하위 분리 저장 */}
              <div>
                <label className="block font-semibold mb-1">
                  카테고리 <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#ff555d] align-middle ml-1" aria-label="필수" />
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
                <label className="block font-semibold mb-1">
                  브랜드 <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#ff555d] align-middle ml-1" aria-label="필수" />
                </label>
                <Typeahead
                  value={brand}
                  onChange={(v) => {
                    setBrand(v);
                    setModel(''); // 브랜드 바꾸면 모델 초기화
                  }}
                  options={ALL_BRAND_NAMES}
                  freeText
                  enableKeyboardLayout
                  hideUntilTyping
                  filter={(q, opts) => {
                    const ranked = searchBrands(q, 50).map((b) => b.name);
                    const set = new Set(opts);
                    return ranked.filter((n) => set.has(n));
                  }}
                />
              </div>

              {/* 2. 모델 — 브랜드 + 카테고리(subcategory)가 둘 다 일치하는 모델만 후보로
                  - 브랜드 미선택 → 후보 없음 (직접 입력만 가능)
                  - 카테고리 미선택 → 해당 브랜드의 전체 모델
                  - 카테고리 선택됨 → 해당 브랜드 + 그 카테고리(예: '프리앰프')만 */}
              <div>
                <label className="block font-semibold mb-1">
                  모델 <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#ff555d] align-middle ml-1" aria-label="필수" />
                </label>
                <Typeahead
                  value={model}
                  onChange={setModel}
                  freeText
                  options={
                    brand
                      ? Array.from(
                          new Set(
                            CATALOG.filter(
                              (c) =>
                                c.brand === brand &&
                                (!subcategory || c.category === subcategory)
                            ).map((c) => c.model)
                          )
                        )
                      : []
                  }
                />
              </div>

              {/* 3. 출시년도 */}
              <div>
                <label className="block font-semibold mb-1">출시년도</label>
                <input
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder=""
                  className="w-full border border-[#e0e0e0] rounded-none px-3 py-2 focus:outline-none focus:border-[#000000]"
                />
              </div>

              {/* 4. 제조국 */}
              <div>
                <label className="block font-semibold mb-1">제조국</label>
                <Typeahead value={country} onChange={setCountry} options={COUNTRIES} />
              </div>

              {/* 6. 구성품 */}
              <div>
                <label className="block font-semibold mb-1">구성품</label>
                <input
                  value={components}
                  onChange={(e) => setComponents(e.target.value)}
                  placeholder=""
                  className="w-full h-[42px] border border-[#e0e0e0] rounded-none px-3 py-2 focus:outline-none focus:border-[#000000]"
                />
              </div>

              {/* 7. 상태 — 아래에 있던 CONDITIONS 드롭다운을 여기로 가져옴.
                  중고 등급(used_*) 일 때만 아래의 외관·작동 상태 활성화 */}
              <div>
                <label className="block font-semibold mb-1">
                  상태 <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#ff555d] align-middle ml-1" aria-label="필수" />
                </label>
                <div className="relative">
                  <select
                    value={condition}
                    onChange={(e) => {
                      const v = e.target.value;
                      setCondition(v);
                      // 새상품/NOS 등 비-중고로 바뀌면 소유권·외관·작동 값 자동 초기화
                      if (!v.startsWith('used_')) {
                        setOwnership('');
                        setConditionAppearance('');
                        setConditionAppearanceDetail('');
                        setConditionWorking('');
                        setConditionWorkingDetail('');
                      }
                    }}
                    className={`w-full appearance-none border border-[#e0e0e0] rounded-none pl-3 pr-9 py-2 h-[42px] focus:outline-none focus:border-[#000000] bg-white ${
                      condition ? '' : 'text-gray-400'
                    }`}
                  >
                    <option value="" disabled>선택하세요</option>
                    {CONDITIONS.map((c) => (
                      <option key={c.value} value={c.value} className="text-[#000000]">{c.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
              </div>

              {/* 소유권 — 드롭다운(1인/다중). 중고 등급(used_*)일 때만 활성화. 필수 아님 */}
              <div>
                <label className={`block font-semibold mb-1 ${condition.startsWith('used_') ? '' : 'text-gray-400'}`}>소유권</label>
                <div className="relative">
                  <select
                    value={ownership}
                    onChange={(e) => setOwnership(e.target.value)}
                    disabled={!condition.startsWith('used_')}
                    className={`w-full appearance-none border border-[#e0e0e0] rounded-none pl-3 pr-9 py-2 h-[42px] focus:outline-none focus:border-[#000000] bg-white disabled:bg-[#f7f7f7] disabled:text-gray-400 disabled:cursor-not-allowed ${
                      ownership ? '' : 'text-gray-400'
                    }`}
                  >
                    <option value="" disabled>선택하세요</option>
                    {OWNERSHIP_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="text-[#000000]">{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
              </div>

              {/* 8. 외관 상태 — 중고 등급(used_*)일 때만 활성화 */}
              <div>
                <label className={`block font-semibold mb-1 ${condition.startsWith('used_') ? '' : 'text-gray-400'}`}>외관 상태</label>
                <div className="flex gap-2">
                  <div className="relative w-36 flex-shrink-0">
                    <select
                      value={conditionAppearance}
                      onChange={(e) => setConditionAppearance(e.target.value)}
                      disabled={!condition.startsWith('used_')}
                      className={`w-full appearance-none border border-[#e0e0e0] rounded-none pl-3 pr-9 py-2 h-[42px] focus:outline-none focus:border-[#000000] bg-white disabled:bg-[#f7f7f7] disabled:text-gray-400 disabled:cursor-not-allowed ${
                        conditionAppearance ? '' : 'text-gray-400'
                      }`}
                    >
                      <option value="" disabled>선택</option>
                      <option value="mint" className="text-[#000000]">민트급</option>
                      <option value="excellent" className="text-[#000000]">매우 좋음</option>
                      <option value="good" className="text-[#000000]">좋음</option>
                      <option value="fair" className="text-[#000000]">보통</option>
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  </div>
                  <input
                    value={conditionAppearanceDetail}
                    onChange={(e) => setConditionAppearanceDetail(e.target.value)}
                    disabled={!condition.startsWith('used_')}
                    placeholder=""
                    className="flex-1 min-w-0 h-[42px] border border-[#e0e0e0] rounded-none px-3 py-2 focus:outline-none focus:border-[#000000] disabled:bg-[#f7f7f7] disabled:text-gray-400 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* 9. 작동 상태 — 중고 등급(used_*)일 때만 활성화 */}
              <div>
                <label className={`block font-semibold mb-1 ${condition.startsWith('used_') ? '' : 'text-gray-400'}`}>작동 상태</label>
                <div className="flex gap-2">
                  <div className="relative w-36 flex-shrink-0">
                    <select
                      value={conditionWorking}
                      onChange={(e) => setConditionWorking(e.target.value)}
                      disabled={!condition.startsWith('used_')}
                      className={`w-full appearance-none border border-[#e0e0e0] rounded-none pl-3 pr-9 py-2 h-[42px] focus:outline-none focus:border-[#000000] bg-white disabled:bg-[#f7f7f7] disabled:text-gray-400 disabled:cursor-not-allowed ${
                        conditionWorking ? '' : 'text-gray-400'
                      }`}
                    >
                      <option value="" disabled>선택</option>
                      <option value="working" className="text-[#000000]">정상 작동</option>
                      <option value="needs_inspection" className="text-[#000000]">점검 필요</option>
                      <option value="needs_repair" className="text-[#000000]">수리 필요</option>
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  </div>
                  <input
                    value={conditionWorkingDetail}
                    onChange={(e) => setConditionWorkingDetail(e.target.value)}
                    disabled={!condition.startsWith('used_')}
                    placeholder=""
                    className="flex-1 min-w-0 h-[42px] border border-[#e0e0e0] rounded-none px-3 py-2 focus:outline-none focus:border-[#000000] disabled:bg-[#f7f7f7] disabled:text-gray-400 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* 상품명 — 브랜드+모델+하위카테고리 자동 반영, 수정·자유입력 가능 (필수) */}
              <div>
                <label className="block font-semibold mb-1">
                  상품명 <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#ff555d] align-middle ml-1" aria-label="필수" />
                </label>
                <input
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); setTitleEdited(true); }}
                  placeholder=""
                  className="w-full h-[42px] border border-[#e0e0e0] rounded-none px-3 py-2 focus:outline-none focus:border-[#000000]"
                />
              </div>

              {/* 핸드메이드(자작품) 여부 — 브랜드와 별개 차원의 태그. 브랜드/모델은 직접 입력 활용 */}
              <div>
                <label className="block font-semibold mb-1">핸드메이드 제품인가요?</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={handmade}
                    onChange={(e) => setHandmade(e.target.checked)}
                    className="accent-[#000000] w-4 h-4"
                  />
                  <span className="text-sm text-gray-500">직접 만든 수제품입니다.</span>
                </label>
              </div>
            </div>
          </section>

          {/* 기술 사양 — 카테고리별 스키마가 있으면 그걸로(앰프 등), 없으면 기존 SPEC_FIELDS 폴백 */}
          <section className="bg-white border border-[#e0e0e0] rounded-none py-6 px-10">
            <button
              type="button"
              onClick={() => setTechExpanded((v) => !v)}
              className="w-full flex items-center justify-between text-left"
            >
              <h2 className="text-2xl font-bold">기술 사양</h2>
              <ChevronDown className={`w-6 h-6 text-gray-500 transition-transform ${techExpanded ? 'rotate-180' : ''}`} />
            </button>
            {techExpanded && (
            <div className="mt-4">
            {SPEC_FIELDS_BY_CATEGORY[category] ? (
              <div className="space-y-4">
                {SPEC_FIELDS_BY_CATEGORY[category].map((f) => {
                  // 형식(패시브/액티브)·서브우퍼 등 조건부 필드: 표시 조건 불충족 시 숨김
                  if (f.showWhen && !f.showWhen({ ...specs, __sub: subcategory })) return null;
                  // 사운드바는 액티브 고정 — 형식 칸은 숨김(값은 'active'로 저장됨)
                  if (f.key === 'speakerDetail' && subcategory === '사운드바') return null;
                  const setSpec = (v: string) => setSpecs({ ...specs, [f.key]: v });
                  // ── 타입: 카테고리에서 자동 입력 (읽기 전용) ──
                  if (f.input.kind === 'auto') {
                    return (
                      <div key={f.key} className="spec-field">
                        <label>{f.label}</label>
                        <input
                          value={subcategory || category}
                          readOnly
                          className="w-full h-[42px] border border-[#e0e0e0] rounded-none px-3 py-2 bg-[#f7f7f7] text-gray-500 cursor-default"
                        />
                      </div>
                    );
                  }
                  // ── 드롭다운 ──
                  if (f.input.kind === 'select') {
                    const v = specs[f.key] || '';
                    return (
                      <div key={f.key} className="spec-field">
                        <label>{f.label}</label>
                        <div className="relative">
                          <select
                            value={v}
                            onChange={(e) => setSpec(e.target.value)}
                            className={`w-full appearance-none border border-[#e0e0e0] rounded-none pl-3 ${v ? 'pr-16' : 'pr-9'} py-2 h-[42px] focus:outline-none focus:border-[#000000] bg-white ${
                              v ? '' : 'text-gray-400'
                            }`}
                          >
                            <option value="" disabled>선택하세요</option>
                            {f.input.options.map((o) => {
                              // 문자열(앰프: 저장=표시) 또는 {value,label}(스피커: 저장=영문키, 표시=한글)
                              const opt = typeof o === 'string' ? { value: o, label: o } : o;
                              return <option key={opt.value} value={opt.value} className="text-[#000000]">{opt.label}</option>;
                            })}
                          </select>
                          {/* 선택값 있으면 화살표 왼쪽에 X (초기화) */}
                          {v && (
                            <button
                              type="button"
                              aria-label="초기화"
                              onClick={() => setSpec('')}
                              className="absolute right-8 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-full hover:bg-[#f7f7f7]"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                          <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                        </div>
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
                    return (
                      <div key={f.key} className="spec-field">
                        <label>{f.label}</label>
                        <Typeahead
                          value={specs[f.key] || ''}
                          onChange={setSpec}
                          options={f.input.options}
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
                            className={`w-full h-[42px] border border-[#e0e0e0] rounded-none pl-3 py-2 focus:outline-none focus:border-[#000000] ${
                              unit ? 'pr-10' : 'pr-3'
                            }`}
                          />
                          {unit && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
                              {unit}
                            </span>
                          )}
                        </div>
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
                        <div className="flex gap-2 items-center">
                          <div className="relative flex-1 min-w-0">
                            <input
                              value={specs[f.key] || ''}
                              onChange={(e) => setSpec(numOnly(e.target.value))}
                              inputMode="decimal"
                              className={`w-full h-[42px] border border-[#e0e0e0] rounded-none pl-3 ${unit ? 'pr-10' : 'pr-3'} py-2 focus:outline-none focus:border-[#000000]`}
                            />
                            {unit && (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">{unit}</span>
                            )}
                          </div>
                          <div className="relative w-32 flex-shrink-0">
                            <select
                              value={typeVal}
                              onChange={(e) => setSpecs({ ...specs, [typeKey]: e.target.value })}
                              className={`w-full appearance-none border border-[#e0e0e0] rounded-none pl-3 ${typeVal ? 'pr-14' : 'pr-8'} py-2 h-[42px] focus:outline-none focus:border-[#000000] bg-white ${typeVal ? '' : 'text-gray-400'}`}
                            >
                              <option value="" disabled>선택</option>
                              {f.input.options.map((o) => (
                                <option key={o} value={o} className="text-[#000000]">{o}</option>
                              ))}
                            </select>
                            {typeVal && (
                              <button
                                type="button"
                                aria-label="초기화"
                                onClick={() => setSpecs({ ...specs, [typeKey]: '' })}
                                className="absolute right-7 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-full hover:bg-[#f7f7f7]"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                          </div>
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
                            <div key={idx} className="flex gap-1.5 items-center -mr-6">
                              <div className="relative flex-1 min-w-0">
                                <input
                                  value={p.w}
                                  onChange={(e) => {
                                    const pairs = powerPairs.map((x, i) => (i === idx ? { ...x, w: numOnly(e.target.value) } : x));
                                    setPowerPairs(pairs);
                                    setSpecs({ ...specs, powerRated: buildPower(pairs) });
                                  }}
                                  inputMode="decimal"
                                  placeholder="출력값"
                                  className="w-full h-[42px] border border-[#e0e0e0] rounded-none pl-3 pr-9 py-2 focus:outline-none focus:border-[#000000]"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">W</span>
                              </div>
                              <span className="text-gray-400">@</span>
                              <div className="relative w-28 flex-shrink-0">
                                <select
                                  value={p.ohm}
                                  onChange={(e) => {
                                    const pairs = powerPairs.map((x, i) => (i === idx ? { ...x, ohm: e.target.value } : x));
                                    setPowerPairs(pairs);
                                    setSpecs({ ...specs, powerRated: buildPower(pairs) });
                                  }}
                                  className={`w-full appearance-none border border-[#e0e0e0] rounded-none pl-3 ${p.ohm ? 'pr-14' : 'pr-8'} py-2 h-[42px] focus:outline-none focus:border-[#000000] bg-white ${p.ohm ? '' : 'text-gray-400'}`}
                                >
                                  <option value="" disabled>기준</option>
                                  {ohmOpts.map((o) => (
                                    <option key={o} value={o} className="text-[#000000]">{o}</option>
                                  ))}
                                </select>
                                {p.ohm && (
                                  <button
                                    type="button"
                                    aria-label="초기화"
                                    onClick={() => {
                                      const pairs = powerPairs.map((x, i) => (i === idx ? { ...x, ohm: '' } : x));
                                      setPowerPairs(pairs);
                                      setSpecs({ ...specs, powerRated: buildPower(pairs) });
                                    }}
                                    className="absolute right-7 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-full hover:bg-[#f7f7f7]"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                              </div>
                              {powerPairs.length > 1 ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const pairs = powerPairs.filter((_, i) => i !== idx);
                                    setPowerPairs(pairs);
                                    setSpecs({ ...specs, powerRated: buildPower(pairs) });
                                  }}
                                  aria-label="삭제"
                                  className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-full hover:bg-[#f7f7f7] flex-shrink-0"
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
                            onClick={() => setPowerPairs((prev) => [...prev, { w: '', ohm: '' }])}
                            className="text-sm text-[#000000] font-semibold inline-flex items-center gap-1 hover:underline"
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
                              className="w-full h-[42px] border border-[#e0e0e0] rounded-none pl-3 pr-10 py-2 focus:outline-none focus:border-[#000000]"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">{lowUnit}</span>
                          </div>
                          <span className="text-gray-400">~</span>
                          <div className="relative flex-1 min-w-0">
                            <input
                              value={r.high}
                              onChange={(e) => setRange({ high: numOnly(e.target.value) })}
                              inputMode="decimal"
                              placeholder="상한"
                              className="w-full h-[42px] border border-[#e0e0e0] rounded-none pl-3 pr-10 py-2 focus:outline-none focus:border-[#000000]"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">{highUnit}</span>
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
                          className="w-full h-[42px] border border-[#e0e0e0] rounded-none pl-3 pr-9 py-2 focus:outline-none focus:border-[#000000]"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none">mm</span>
                      </div>
                    );
                    return (
                      <div key={f.key} className="spec-field">
                        <label>{f.label}</label>
                        <div className="space-y-2">
                          {rows.map((r, i) => (
                            <div key={i} className="flex gap-1.5 items-center -mr-6">
                              {dimInput(r.w, 'w', 'W', i)}
                              <span className="text-gray-400">×</span>
                              {dimInput(r.d, 'd', 'D', i)}
                              <span className="text-gray-400">×</span>
                              {dimInput(r.h, 'h', 'H', i)}
                              <span className="text-gray-400">×</span>
                              <div className="relative flex-1 min-w-0">
                                <input
                                  value={r.note}
                                  onChange={(e) => update(i, { note: e.target.value })}
                                  placeholder="비고"
                                  className="w-full h-[42px] border border-[#e0e0e0] rounded-none px-3 py-2 focus:outline-none focus:border-[#000000]"
                                />
                              </div>
                              {rows.length > 1 ? (
                                <button
                                  type="button"
                                  aria-label="삭제"
                                  onClick={() => commit(rows.filter((_, idx) => idx !== i))}
                                  className="w-5 h-5 flex-shrink-0 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-full hover:bg-[#f7f7f7]"
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
                            className="text-sm text-[#000000] font-semibold inline-flex items-center gap-1 hover:underline"
                          >
                            <Plus className="w-3.5 h-3.5" /> 크기 추가
                          </button>
                        </div>
                      </div>
                    );
                  }
                  // ── 다중 선택 (지원 임피던스 / 입력·출력 단자) ──
                  if (f.input.kind === 'multi') {
                    const sel = f.key === 'impedance' ? impedances : (multiSel[f.key] ?? []);
                    const setSel = f.key === 'impedance' ? setImpedances : (next: string[] | ((p: string[]) => string[])) => setMultiSel((m) => ({ ...m, [f.key]: typeof next === 'function' ? next(m[f.key] ?? []) : next }));
                    // 임피던스: 드롭다운 선택(다중) + 아래 회색 범위칸 / 단자: 검색 + 칩
                    if (f.key === 'impedance') {
                      return (
                        <div key={f.key} className="spec-field">
                          <label>{f.label}</label>
                          <ImpedanceSelect
                            options={f.input.options}
                            selected={sel}
                            onChange={setSel}
                            displayText={impedanceRange(sel)}
                          />
                        </div>
                      );
                    }
                    return (
                      <div key={f.key} className="spec-field">
                        <label>{f.label}</label>
                        <MultiSelectDropdown
                          options={f.input.options}
                          selected={sel}
                          onChange={setSel}
                          aliases={TERMINAL_ALIASES}
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
                            <div key={idx} className="flex gap-1.5 items-center -mr-6">
                              <input
                                value={row.value}
                                onChange={(e) => { const nv = numOnly(e.target.value); setCrossoverValues((prev) => prev.map((x, i) => (i === idx ? { ...x, value: nv } : x))); }}
                                inputMode="decimal"
                                className="flex-1 min-w-0 h-[42px] border border-[#e0e0e0] rounded-none px-3 py-2 focus:outline-none focus:border-[#000000]"
                              />
                              <div className="relative w-24 flex-shrink-0">
                                <select
                                  value={row.unit}
                                  onChange={(e) => { const u = e.target.value; setCrossoverValues((prev) => prev.map((x, i) => (i === idx ? { ...x, unit: u } : x))); }}
                                  className="w-full appearance-none border border-[#e0e0e0] rounded-none pl-3 pr-8 h-[42px] bg-white focus:outline-none focus:border-[#000000]"
                                >
                                  <option value="Hz">Hz</option>
                                  <option value="kHz">kHz</option>
                                </select>
                                <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                              </div>
                              {crossoverValues.length > 1 ? (
                                <button
                                  type="button"
                                  aria-label="삭제"
                                  onClick={() => setCrossoverValues((prev) => prev.filter((_, i) => i !== idx))}
                                  className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-full hover:bg-[#f7f7f7] flex-shrink-0"
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
                            className="text-sm text-[#000000] font-semibold inline-flex items-center gap-1 hover:underline"
                          >
                            <Plus className="w-3.5 h-3.5" /> 크로스오버 추가
                          </button>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            ) : (
              // 폴백: 카테고리별 스키마 없는 경우 기존 16개 자유 입력
              <div className="space-y-4">
                {(category ? SPEC_FIELDS : SPEC_FIELDS.filter((f) => f.key === 'type')).map((f) => (
                  <div key={f.key} className="spec-field">
                    <label>{f.label}</label>
                    <input
                      value={specs[f.key] || ''}
                      onChange={(e) => setSpecs({ ...specs, [f.key]: e.target.value })}
                      placeholder=""
                      className="w-full border border-[#e0e0e0] rounded-none px-3 py-2 focus:outline-none focus:border-[#000000]"
                    />
                  </div>
                ))}
              </div>
            )}
            </div>
            )}
          </section>

          <h2 className="text-2xl font-bold pl-2 pt-2">사진 및 설명</h2>

          <section
            id="section-photos"
            className="bg-white border border-[#e0e0e0] rounded-none p-6"
          >
            <div className="flex items-baseline justify-between mb-1">
              <h3 className="text-xl font-bold">
                장비 사진을 업로드하세요 <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#ff555d] align-middle ml-1" aria-label="필수" />
              </h3>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              다른 사이트나 제조업체에서 가져온 스크린샷이나 사진은 허용되지 않습니다. 620×620px 이상의 정사각형 사진이 가장 좋습니다.
            </p>

            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-700">예시</p>
                <button className="text-xs text-gray-500 hover:text-gray-700">숨김</button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {PHOTO_EXAMPLES.map((ex) => (
                  <div key={ex.label} className="text-center">
                    <div className="aspect-square rounded-none overflow-hidden bg-white border border-[#e0e0e0] mb-1">
                      <img src={ex.img} alt={ex.label} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-xs text-gray-600">{ex.label}</p>
                  </div>
                ))}
              </div>
              <button className="text-sm text-[#000000] hover:text-[#000000] font-semibold mt-3 inline-flex items-center gap-1">
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
              className="border-2 border-dashed border-[#e0e0e0] hover:border-gray-700 hover:bg-[#f7f7f7] rounded-none py-12 flex flex-col items-center justify-center text-center cursor-pointer transition"
            >
              <button
                type="button"
                className="px-4 py-2 border border-gray-400 rounded-full bg-white hover:bg-[#f7f7f7] font-semibold text-sm flex items-center gap-1.5 mb-3"
              >
                <Plus className="w-4 h-4" />
                사진 업로드
              </button>
              <Upload className="w-5 h-5 text-gray-400 mb-1" />
              <p className="text-sm text-gray-600">
                또는 대표 이미지 포함 최대 <span className="font-semibold">{MAX_IMAGES}장</span>까지 드래그 앤 드롭하세요.
              </p>
            </div>
            {/* 업로드 중 / 에러 표시 */}
            {uploadingCount > 0 && (
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-700">
                <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-[#000000] rounded-full animate-spin" />
                업로드 중… ({uploadingCount}장 처리 중)
              </div>
            )}
            {uploadError && (
              <div className="mt-3 rounded-none border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                {uploadError}
              </div>
            )}

            {images.length > 0 && (
              <div className="mt-6">
                <p className="font-semibold mb-3 pb-2 border-b border-[#e0e0e0]">사진</p>
                <p className="text-xs font-semibold text-gray-500 mb-2">대표</p>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-none overflow-hidden border-2 border-[#e0e0e0] bg-[#f7f7f7] group"
                    >
                      <img src={img} alt={`등록 사진 ${idx + 1}`} className="w-full h-full object-contain" />
                      {idx === 0 && (
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-[#000000] text-white text-[10px] rounded">
                          대표
                        </span>
                      )}
                      <button
                        onClick={() => removeImage(idx)}
                        aria-label="사진 삭제"
                        className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="bg-white border border-[#e0e0e0] rounded-none p-6">
            <h3 className="text-xl font-bold mb-4">항목을 설명하세요.</h3>

            <div>
              <label className="block font-semibold mb-1">
                이 상품과 그 상태에 대해 설명해 주세요 <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#ff555d] align-middle ml-1" aria-label="필수" />
              </label>
              <div className="border border-[#e0e0e0] rounded-none overflow-hidden focus-within:border-[#000000]">
                <div className="flex gap-1 px-2 py-1.5 border-b border-[#e0e0e0] bg-[#f7f7f7]">
                  <button className="w-7 h-7 rounded hover:bg-[#e0e0e0] flex items-center justify-center text-gray-700">
                    <Bold className="w-4 h-4" />
                  </button>
                  <button className="w-7 h-7 rounded hover:bg-[#e0e0e0] flex items-center justify-center text-gray-700">
                    <Italic className="w-4 h-4" />
                  </button>
                  <button className="w-7 h-7 rounded hover:bg-[#e0e0e0] flex items-center justify-center text-gray-700">
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
              <p className="text-xs text-gray-500 mt-1">{description.length}자 입력됨</p>
            </div>

            <div className="mt-4 pt-4 border-t border-[#e0e0e0]">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={asDescribed}
                  onChange={(e) => setAsDescribed(e.target.checked)}
                  className="mt-1 accent-[#000000] w-4 h-4"
                />
                <div>
                  <p className="font-semibold text-sm">이 상품은 "설명한 그대로" 판매됩니다.</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    "설명대로" 판매한 상품은 설명 약관 정책에 따라 제외됩니다. 따라서 판매자는 정확하고 상세한 상품 설명을 작성하고, 좋은 사진을 제공하며, 설명된 상태 그대로 상품을 구매자에게 배송할 의무가 있습니다.
                  </p>
                </div>
              </label>
            </div>

            <div className="mt-4 pt-4 border-t border-[#e0e0e0]">
              <button
                onClick={() => setSkuOpen(!skuOpen)}
                className="w-full flex items-center justify-between font-semibold"
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
                    className="w-full border border-[#e0e0e0] rounded-none px-3 py-2 focus:outline-none focus:border-[#000000]"
                  />
                </div>
              )}
            </div>
          </section>

          <section className="bg-white border border-[#e0e0e0] rounded-none p-6">
            <div className="flex items-center gap-2 mb-4">
              <Youtube className="w-5 h-5 text-red-600" />
              <h3 className="text-xl font-bold">상품 목록에 YouTube 동영상을 삽입하세요</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">유튜브 영상 링크를 붙여넣으세요</label>
                <input
                  value={youtubeLink}
                  onChange={(e) => setYoutubeLink(e.target.value)}
                  placeholder=""
                  className="w-full border border-[#e0e0e0] rounded-none px-3 py-2 focus:outline-none focus:border-[#000000]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">유튜브 영상을 검색하세요</label>
                <input
                  placeholder=""
                  className="w-full border border-[#e0e0e0] rounded-none px-3 py-2 focus:outline-none focus:border-[#000000]"
                />
              </div>
            </div>
          </section>

          <h2 id="section-price" className="text-2xl font-bold pl-2 pt-2">
            가격
          </h2>
          <section className="bg-white border border-[#e0e0e0] rounded-none p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">
                    판매 가격 <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#ff555d] align-middle ml-1" aria-label="필수" />
                  </label>
                  <div className="relative">
                    <input
                      value={price}
                      onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder=""
                      className="w-full border border-[#e0e0e0] rounded-none pl-3 pr-12 py-2 focus:outline-none focus:border-[#000000]"
                    />
                    <span className="absolute right-3 top-2 text-gray-500">원</span>
                  </div>
                </div>
                <div>
                  <label className="block font-semibold mb-1">
                    정가 <span className="text-gray-500 font-normal">(선택)</span>
                  </label>
                  <div className="relative">
                    <input
                      value={comparePrice}
                      onChange={(e) => setComparePrice(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder=""
                      className="w-full border border-[#e0e0e0] rounded-none pl-3 pr-12 py-2 focus:outline-none focus:border-[#000000]"
                    />
                    <span className="absolute right-3 top-2 text-gray-500">원</span>
                  </div>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptOffers}
                  onChange={(e) => setAcceptOffers(e.target.checked)}
                  className="accent-[#000000] w-4 h-4"
                />
                <span className="font-semibold">구매자의 가격 제안 받기</span>
              </label>
            </div>
          </section>

          {/* ============================================================
            * 시장 가격 비교 카드
            * - 사용자가 입력한 price 기준으로 보라(저렴) / 초록(적정) / 검정(비쌈) 영역에
            *   현재 가격 위치를 점·말풍선으로 표시.
            * - MARKET_MIN/MAX는 ⚠️ 임시 하드코딩. 추후 시장 데이터 기반 로직으로 교체 예정.
            * ============================================================ */}
          {(() => {
            const priceNum = parseInt(price || '0', 10);
            // ⚠️ 임시: 실제 시장 가격 데이터 유무 판단 로직으로 추후 교체.
            const hasMarketData = true;
            if (!hasMarketData) {
              return (
                <section className="bg-white border border-[#e0e0e0] rounded-none p-6">
                  <h3 className="text-xl font-bold mb-2">가격 변동 내역</h3>
                  <p className="text-sm text-gray-500">
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
                ? 'text-purple-500'
                : zone === 'high'
                ? 'text-slate-700'
                : 'text-green-600';
            const zoneMessage =
              zone === 'low'
                ? '평균 시장 가격대보다 저렴해요'
                : zone === 'high'
                ? '평균 시장 가격대보다 비싸요'
                : '현재 평균 시장 가격대 안에 있어요';

            return (
              <section className="bg-white border border-[#e0e0e0] rounded-none p-6">
                <h3 className="text-xl font-bold mb-4">
                  이 제품은 <span className={zoneColor}>{zoneLabel}</span>이에요
                </h3>

                <div className="flex items-start gap-6">
                  <div className="flex items-start gap-1.5 text-sm text-gray-600 max-w-[160px] flex-shrink-0">
                    <span>{zoneMessage}</span>
                    <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
                  </div>

                  <div className="flex-1 pt-10">
                    <div className="relative">
                      {/* 현재 가격 말풍선 */}
                      {priceNum > 0 && (
                        <div
                          className="absolute -top-9 -translate-x-1/2 px-3 py-1 bg-white border border-[#e0e0e0] rounded-full shadow-sm font-bold whitespace-nowrap text-sm"
                          style={{ left: `${positionPct}%` }}
                        >
                          {priceNum.toLocaleString()}원
                          <span className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-2.5 h-2.5 bg-white border-r border-b border-[#e0e0e0] rotate-45" />
                        </div>
                      )}

                      {/* 가격대 막대 (보라/초록/검정 3등분) */}
                      <div className="relative h-2 rounded-full overflow-visible">
                        <div className="absolute inset-0 flex rounded-full overflow-hidden">
                          <div className="flex-1 bg-purple-400" />
                          <div className="flex-1 bg-green-500" />
                          <div className="flex-1 bg-slate-700" />
                        </div>
                        {/* 현재 가격 핸들(원형) */}
                        {priceNum > 0 && (
                          <div
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border-[3px] border-green-500 shadow"
                            style={{ left: `${positionPct}%` }}
                          />
                        )}
                      </div>

                      {/* 양 경계 가격 라벨 */}
                      <div className="relative h-5 mt-3">
                        <span className="absolute left-[33.333%] -translate-x-1/2 text-sm text-gray-500">
                          {MARKET_MIN.toLocaleString()}원
                        </span>
                        <span className="absolute left-[66.666%] -translate-x-1/2 text-sm text-gray-500">
                          {MARKET_MAX.toLocaleString()}원
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              </section>
            );
          })()}

          <h2 id="section-shipping" className="text-2xl font-bold pl-2 pt-2">
            배송
          </h2>
          <section className="bg-white border border-[#e0e0e0] rounded-none p-6">
            <div className="space-y-2 mb-4">
              {[
                { value: 'free', label: '무료 배송', desc: '판매자가 배송비를 부담' },
                { value: 'flat', label: '고정 배송비', desc: '정해진 금액으로 부과' },
                { value: 'calculated', label: '계산 배송비', desc: '구매자 위치 기준으로 계산' }
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-none border-2 cursor-pointer transition ${
                    shippingType === opt.value
                      ? 'border-[#000000] bg-[#f7f7f7]'
                      : 'border-[#e0e0e0] hover:border-[#e0e0e0]'
                  }`}
                >
                  <input
                    type="radio"
                    name="shipping"
                    value={opt.value}
                    checked={shippingType === opt.value}
                    onChange={(e) => setShippingType(e.target.value as 'free' | 'flat' | 'calculated')}
                    className="mt-1 accent-[#000000]"
                  />
                  <div>
                    <p className="font-semibold">{opt.label}</p>
                    <p className="text-sm text-gray-600">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
            {shippingType === 'flat' && (
              <div>
                <label className="block font-semibold mb-1">고정 배송비</label>
                <div className="relative max-w-xs">
                  <input
                    value={shippingCost}
                    onChange={(e) => setShippingCost(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder=""
                    className="w-full border border-[#e0e0e0] rounded-none pl-3 pr-12 py-2 focus:outline-none focus:border-[#000000]"
                  />
                  <span className="absolute right-3 top-2 text-gray-500">원</span>
                </div>
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer mt-4 pt-4 border-t border-[#e0e0e0]">
              <input
                type="checkbox"
                checked={localPickup}
                onChange={(e) => setLocalPickup(e.target.checked)}
                className="accent-[#000000] w-4 h-4"
              />
              <span className="font-semibold">직거래 가능</span>
            </label>
          </section>

          <div className="bg-white border border-[#e0e0e0] rounded-none p-6">
            <div className="rounded-none bg-gradient-to-br from-[#f7f7f7]/60 via-white to-[#f7f7f7] border border-[#e0e0e0] p-4 space-y-3 mb-5">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-none bg-[#e0e0e0] flex items-center justify-center flex-shrink-0">
                  <Tag className="w-4 h-4 text-[#000000]" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Resonance 판매 수수료</p>
                  <p className="text-xs text-gray-600">거래당 5% + 결제 수수료 2.7%</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-none bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Truck className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">배송 라벨</p>
                  <p className="text-xs text-gray-600">결제 시 할인된 배송비 이용 가능</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-none bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <HelpCircle className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">등록 팁</p>
                  <p className="text-xs text-gray-600">자세한 사진과 정확한 설명일수록 빠르게 판매됩니다.</p>
                </div>
              </div>
            </div>

            {submitError && (
              <div className="mb-3 rounded-none border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {submitError}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-[#000000] text-white py-3 px-6 rounded-none font-semibold hover:bg-[#000000] transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Plus className="w-5 h-5" />
                {submitting ? '등록 중…' : '상품 등록하기'}
              </button>
              <button className="flex-1 border-2 border-[#e0e0e0] text-gray-700 py-3 px-6 rounded-none font-semibold hover:border-gray-400 transition">
                임시 저장
              </button>
              <button className="text-gray-600 py-3 px-6 rounded-none font-semibold hover:text-[#000000] transition">
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
