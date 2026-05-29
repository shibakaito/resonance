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
      : subs.map((s) => ({ path: `${top} > ${s}`, top, leaf: s }))
);
const CATEGORY_PATH_STRINGS = CATEGORY_PATHS.map((p) => p.path);

const COUNTRIES = ['미국', '일본', '독일', '영국', '한국', '중국', '대만', '이탈리아', '프랑스', '캐나다'];

// 상태: DB에 저장되는 영문 키(value) + 화면 표시(label). labels.ts의 condition과 동일.
const CONDITIONS = [
  { value: 'new', label: '새상품', desc: '미개봉 또는 사용하지 않은 새 제품' },
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

// 기술 사양 입력 필드 — specs 객체의 key/label 매핑
const SPEC_FIELDS = [
  { key: 'type', label: '타입' },
  { key: 'channel', label: '채널' },
  { key: 'device', label: '소자' },
  { key: 'powerRated', label: '정격 출력' },
  { key: 'freqResponse', label: '주파수 응답' },
  { key: 'impedance', label: '지원 임피던스' },
  { key: 'thd', label: 'THD' },
  { key: 'snr', label: 'S/N' },
  { key: 'damping', label: '댐핑 팩터' },
  { key: 'inputs', label: '입력 단자' },
  { key: 'outputs', label: '출력 단자' },
  { key: 'phono', label: '포노 입력' },
  { key: 'toneControl', label: '톤 컨트롤' },
  { key: 'power', label: '전원' },
  { key: 'dimensions', label: '크기' },
  { key: 'weight', label: '무게' },
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
  if (startNorm < 0) return text;
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
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  filter?: (q: string, opts: string[]) => string[];
  /** true면 매칭 없는 사용자 입력도 그대로 저장 가능 (드롭다운에 "직접 입력: …" 옵션 표시) */
  freeText?: boolean;
  /** true면 한영 자판 오타 매칭(lazy fallback): 1차 0개 → en2ko/ko2en 변환 후 재매칭 */
  enableKeyboardLayout?: boolean;
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
        placeholder=""
        className="w-full border border-[#e0e0e0] rounded-lg pl-3 pr-9 py-2 focus:outline-none focus:border-[#000000]"
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
      {open && (
        <div
          ref={listRef}
          className="absolute z-30 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-[#e0e0e0] rounded-lg shadow-lg"
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
  const [shippingType, setShippingType] = useState<'free' | 'flat' | 'calculated'>('free');
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
  // 기술 사양 (16개 필드를 객체 하나로 관리)
  const [specs, setSpecs] = useState<Record<string, string>>({
    type: '', channel: '', device: '', powerRated: '',
    freqResponse: '', impedance: '', thd: '', snr: '',
    damping: '', inputs: '', outputs: '', phono: '',
    toneControl: '', power: '', dimensions: '', weight: '',
  });

  // 폼 제출 → Supabase에 매물 INSERT → 성공 시 상세 페이지로 이동
  const handleSubmit = async () => {
    setSubmitError(null);
    if (!brand || !model) { setSubmitError('브랜드와 모델명을 입력해주세요.'); return; }
    if (!category) { setSubmitError('카테고리를 선택해주세요.'); return; }
    if (!condition) { setSubmitError('상태를 선택해주세요.'); return; }
    if (!price) { setSubmitError('가격을 입력해주세요.'); return; }
    setSubmitting(true);
    try {
      // specs(jsonb)에 저장할 외관/작동 상태 — 비어있는 키는 제외 (DB 깔끔하게)
      const specsToSave: Record<string, string> = {};
      if (conditionAppearance) specsToSave.appearance = conditionAppearance;
      if (conditionAppearanceDetail) specsToSave.appearanceDetail = conditionAppearanceDetail;
      if (conditionWorking) specsToSave.working = conditionWorking;
      if (conditionWorkingDetail) specsToSave.workingDetail = conditionWorkingDetail;

      const id = await insertListing({
        images, title, category, subcategory, brand, model, year, finish, country,
        handmade, condition, description, sku, youtubeLink, price, comparePrice,
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
    if (id === 'shipping') return true;
    return false;
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 bg-[#f7f7f7] min-h-screen">
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
                        className={`absolute left-3 top-7 w-0.5 h-full -ml-px ${
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
            className="bg-white border border-[#e0e0e0] rounded-xl p-6"
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
                  className="w-full border border-[#e0e0e0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#000000]"
                />
              </div>

              {/* 4. 제조국 */}
              <div>
                <label className="block font-semibold mb-1">제조국</label>
                <Typeahead value={country} onChange={setCountry} options={COUNTRIES} />
              </div>

              {/* 5. 소유권 */}
              <div>
                <label className="block font-semibold mb-1">소유권</label>
                <input
                  value={ownership}
                  onChange={(e) => setOwnership(e.target.value)}
                  placeholder=""
                  className="w-full h-[42px] border border-[#e0e0e0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#000000]"
                />
              </div>

              {/* 6. 구성품 */}
              <div>
                <label className="block font-semibold mb-1">구성품</label>
                <input
                  value={components}
                  onChange={(e) => setComponents(e.target.value)}
                  placeholder=""
                  className="w-full h-[42px] border border-[#e0e0e0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#000000]"
                />
              </div>

              {/* 7. 상태 — 중고 등급(used_*)일 때만 아래 외관·작동 활성화 */}
              <div>
                <label className="block font-semibold mb-1">상태</label>
                <select
                  value={condition}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCondition(v);
                    // 새상품/NOS 등 비-중고로 바뀌면 외관·작동 값 자동 초기화
                    if (!v.startsWith('used_')) {
                      setConditionAppearance('');
                      setConditionAppearanceDetail('');
                      setConditionWorking('');
                      setConditionWorkingDetail('');
                    }
                  }}
                  className={`w-full border border-[#e0e0e0] rounded-lg pl-2 pr-3 py-2 h-[42px] focus:outline-none focus:border-[#000000] bg-white ${
                    condition ? '' : 'text-gray-400'
                  }`}
                >
                  <option value="" disabled>선택하세요</option>
                  {CONDITIONS.map((c) => (
                    <option key={c.value} value={c.value} className="text-[#000000]">{c.label}</option>
                  ))}
                </select>
              </div>

              {/* 8. 외관 상태 — 중고 등급(used_*)일 때만 활성화 */}
              <div>
                <label className={`block font-semibold mb-1 ${condition.startsWith('used_') ? '' : 'text-gray-400'}`}>외관 상태</label>
                <div className="flex gap-2">
                  <select
                    value={conditionAppearance}
                    onChange={(e) => setConditionAppearance(e.target.value)}
                    disabled={!condition.startsWith('used_')}
                    className={`w-36 border border-[#e0e0e0] rounded-lg pl-2 pr-3 py-2 h-[42px] focus:outline-none focus:border-[#000000] bg-white disabled:bg-[#f7f7f7] disabled:text-gray-400 disabled:cursor-not-allowed ${
                      conditionAppearance ? '' : 'text-gray-400'
                    }`}
                  >
                    <option value="" disabled>선택</option>
                    <option value="mint" className="text-[#000000]">민트급</option>
                    <option value="excellent" className="text-[#000000]">매우 좋음</option>
                    <option value="good" className="text-[#000000]">좋음</option>
                    <option value="fair" className="text-[#000000]">보통</option>
                  </select>
                  <input
                    value={conditionAppearanceDetail}
                    onChange={(e) => setConditionAppearanceDetail(e.target.value)}
                    disabled={!condition.startsWith('used_')}
                    placeholder=""
                    className="flex-1 min-w-0 h-[42px] border border-[#e0e0e0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#000000] disabled:bg-[#f7f7f7] disabled:text-gray-400 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* 9. 작동 상태 — 중고 등급(used_*)일 때만 활성화 */}
              <div>
                <label className={`block font-semibold mb-1 ${condition.startsWith('used_') ? '' : 'text-gray-400'}`}>작동 상태</label>
                <div className="flex gap-2">
                  <select
                    value={conditionWorking}
                    onChange={(e) => setConditionWorking(e.target.value)}
                    disabled={!condition.startsWith('used_')}
                    className={`w-36 border border-[#e0e0e0] rounded-lg pl-2 pr-3 py-2 h-[42px] focus:outline-none focus:border-[#000000] bg-white disabled:bg-[#f7f7f7] disabled:text-gray-400 disabled:cursor-not-allowed ${
                      conditionWorking ? '' : 'text-gray-400'
                    }`}
                  >
                    <option value="" disabled>선택</option>
                    <option value="working" className="text-[#000000]">정상 작동</option>
                    <option value="needs_inspection" className="text-[#000000]">점검 필요</option>
                    <option value="needs_repair" className="text-[#000000]">수리 필요</option>
                  </select>
                  <input
                    value={conditionWorkingDetail}
                    onChange={(e) => setConditionWorkingDetail(e.target.value)}
                    disabled={!condition.startsWith('used_')}
                    placeholder=""
                    className="flex-1 min-w-0 h-[42px] border border-[#e0e0e0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#000000] disabled:bg-[#f7f7f7] disabled:text-gray-400 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 기술 사양 (16개 필드를 SPEC_FIELDS 배열로 자동 렌더) */}
          <section className="bg-white border border-[#e0e0e0] rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4">기술 사양</h2>
            <div className="space-y-4">
              {SPEC_FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="block font-semibold mb-1">{f.label}</label>
                  <input
                    value={specs[f.key] || ''}
                    onChange={(e) => setSpecs({ ...specs, [f.key]: e.target.value })}
                    placeholder=""
                    className="w-full border border-[#e0e0e0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#000000]"
                  />
                </div>
              ))}
            </div>
          </section>

          <h2 className="text-2xl font-bold pl-2 pt-2">사진 및 설명</h2>

          <section
            id="section-photos"
            className="bg-white border border-[#e0e0e0] rounded-xl p-6"
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
                    <div className="aspect-square rounded-lg overflow-hidden bg-white border border-[#e0e0e0] mb-1">
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
              className="border-2 border-dashed border-[#e0e0e0] hover:border-gray-700 hover:bg-[#f7f7f7] rounded-lg py-12 flex flex-col items-center justify-center text-center cursor-pointer transition"
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
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
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
                      className="relative aspect-square rounded-lg overflow-hidden border-2 border-[#e0e0e0] bg-[#f7f7f7] group"
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

          <section className="bg-white border border-[#e0e0e0] rounded-xl p-6">
            <h3 className="text-xl font-bold mb-4">항목을 설명하세요.</h3>

            <div>
              <label className="block font-semibold mb-1">
                이 상품과 그 상태에 대해 설명해 주세요 <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#ff555d] align-middle ml-1" aria-label="필수" />
              </label>
              <div className="border border-[#e0e0e0] rounded-lg overflow-hidden focus-within:border-[#000000]">
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
                    className="w-full border border-[#e0e0e0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#000000]"
                  />
                </div>
              )}
            </div>
          </section>

          <section className="bg-white border border-[#e0e0e0] rounded-xl p-6">
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
                  className="w-full border border-[#e0e0e0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#000000]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">유튜브 영상을 검색하세요</label>
                <input
                  placeholder=""
                  className="w-full border border-[#e0e0e0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#000000]"
                />
              </div>
            </div>
          </section>

          <h2 id="section-price" className="text-2xl font-bold pl-2 pt-2">
            가격
          </h2>
          <section className="bg-white border border-[#e0e0e0] rounded-xl p-6">
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
                      className="w-full border border-[#e0e0e0] rounded-lg pl-3 pr-12 py-2 focus:outline-none focus:border-[#000000]"
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
                      className="w-full border border-[#e0e0e0] rounded-lg pl-3 pr-12 py-2 focus:outline-none focus:border-[#000000]"
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
                <section className="bg-white border border-[#e0e0e0] rounded-xl p-6">
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
              <section className="bg-white border border-[#e0e0e0] rounded-xl p-6">
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
          <section className="bg-white border border-[#e0e0e0] rounded-xl p-6">
            <div className="space-y-2 mb-4">
              {[
                { value: 'free', label: '무료 배송', desc: '판매자가 배송비를 부담' },
                { value: 'flat', label: '고정 배송비', desc: '정해진 금액으로 부과' },
                { value: 'calculated', label: '계산 배송비', desc: '구매자 위치 기준으로 계산' }
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${
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
                    className="w-full border border-[#e0e0e0] rounded-lg pl-3 pr-12 py-2 focus:outline-none focus:border-[#000000]"
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

          <div className="bg-white border border-[#e0e0e0] rounded-xl p-6">
            <div className="rounded-lg bg-gradient-to-br from-[#f7f7f7]/60 via-white to-[#f7f7f7] border border-[#e0e0e0] p-4 space-y-3 mb-5">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#e0e0e0] flex items-center justify-center flex-shrink-0">
                  <Tag className="w-4 h-4 text-[#000000]" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Resonance 판매 수수료</p>
                  <p className="text-xs text-gray-600">거래당 5% + 결제 수수료 2.7%</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Truck className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">배송 라벨</p>
                  <p className="text-xs text-gray-600">결제 시 할인된 배송비 이용 가능</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <HelpCircle className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">등록 팁</p>
                  <p className="text-xs text-gray-600">자세한 사진과 정확한 설명일수록 빠르게 판매됩니다.</p>
                </div>
              </div>
            </div>

            {submitError && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {submitError}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-[#000000] text-white py-3 px-6 rounded-lg font-semibold hover:bg-[#000000] transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Plus className="w-5 h-5" />
                {submitting ? '등록 중…' : '상품 등록하기'}
              </button>
              <button className="flex-1 border-2 border-[#e0e0e0] text-gray-700 py-3 px-6 rounded-lg font-semibold hover:border-gray-400 transition">
                임시 저장
              </button>
              <button className="text-gray-600 py-3 px-6 rounded-lg font-semibold hover:text-[#000000] transition">
                취소
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
