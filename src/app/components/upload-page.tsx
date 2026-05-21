'use client';
import { useState } from 'react';
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
import { TOP_CATEGORIES, subcategoriesFor } from '../data/catalog';

const CATEGORIES = TOP_CATEGORIES;

const COUNTRIES = ['미국', '일본', '독일', '영국', '한국', '중국', '대만', '이탈리아', '프랑스', '캐나다'];

const CONDITIONS = [
  { value: 'mint', label: '민트', desc: '새상품에 가까운 상태로 사용 흔적이 거의 없음' },
  { value: 'excellent', label: '매우 좋음', desc: '가벼운 사용감만 있는 양호한 상태' },
  { value: 'very-good', label: '좋음', desc: '약간의 외관 흠집이 있으나 깨끗한 상태' },
  { value: 'good', label: '사용감 있음', desc: '눈에 띄는 사용감, 작동은 정상' },
  { value: 'fair', label: '하드 유즈', desc: '상당한 사용감 또는 수리 이력 있음' }
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
  const [images, setImages] = useState<string[]>([
    '/images/W8DNioOHTlZPyOR5Psp3u91wnETrB0lGMmWcB345Zyc.webp'
  ]);
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [category, setCategory] = useState(initialData?.category ?? '');
  const [subcategory, setSubcategory] = useState('');
  const [brand, setBrand] = useState(initialData?.brand ?? '');
  const [model, setModel] = useState(initialData?.model ?? '');
  const [year, setYear] = useState(initialData?.year ?? '');
  const [finish, setFinish] = useState('');
  const [country, setCountry] = useState('');
  const [handmade, setHandmade] = useState(false);
  const [condition, setCondition] = useState('excellent');
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

  const sampleImages = [
    '/images/L2GaN7JtEwGJJMDjMbVbY8W_mgW_07tpAaCsJVqtECw.webp',
    '/images/QeFrSn6TLNpreBs1OEI878geRwvhIgKTuPzZgXQZwo8.webp',
    '/images/OZCT7NCWvb7WhYYiYL72mrF3nLoe-E5pDmMg1LPA3-Q.webp',
    '/images/YydU-ggEdviNYlDbBOoJkkoeNzgL6-njfcnhlLRdHJQ.webp'
  ];

  const addImage = () => {
    const next = sampleImages[images.length % sampleImages.length];
    setImages([...images, next]);
  };
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
            <div className="bg-[#f7f7f7] border border-[#e0e0e0] rounded-lg p-3 mb-6 flex items-start gap-2">
              <Info className="w-4 h-4 text-[#000000] mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">
                판매 속도를 높이기 위해 상품의 브랜드/카테고리를 자동으로 매칭해 드립니다.{' '}
                <button className="text-[#000000] hover:text-[#000000] font-semibold underline">
                  수정 요청
                </button>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block font-semibold mb-1">
                  상표 <span className="text-[#000000]">*</span>
                </label>
                <input
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="McIntosh"
                  className="w-full border border-[#e0e0e0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#000000]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">
                  모델 <span className="text-[#000000]">*</span>
                </label>
                <input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="MC152"
                  className="w-full border border-[#e0e0e0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#000000]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">연도</label>
                <input
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="2015"
                  className="w-full border border-[#e0e0e0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#000000]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  정확한 연도를 모르는 경우 "90년대 중반" 또는 "2015년경"과 같이 대략적인 시기를 입력해도 됩니다.
                </p>
              </div>

              <div>
                <label className="block font-semibold mb-1">색상 / 마감</label>
                <input
                  value={finish}
                  onChange={(e) => setFinish(e.target.value)}
                  placeholder="블랙 글라스"
                  className="w-full border border-[#e0e0e0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#000000]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">제조국</label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full border border-[#e0e0e0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#000000] bg-white"
                >
                  <option value="">선택하세요</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">
                  카테고리 <span className="text-[#000000]">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setSubcategory('');
                  }}
                  className="w-full border border-[#e0e0e0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#000000] bg-white"
                >
                  <option value="">카테고리를 선택하세요</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">하위 카테고리</label>
                <select
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  disabled={!category}
                  className="w-full border border-[#e0e0e0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#000000] bg-white disabled:bg-[#f7f7f7] disabled:cursor-not-allowed"
                >
                  <option value="">{category ? '선택하세요' : '먼저 카테고리를 선택하세요'}</option>
                  {category &&
                    subcategoriesFor(category).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">
                  목록 제목 <span className="text-[#000000]">*</span>
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예) McIntosh MC152 2015 블랙 글라스"
                  className="w-full border border-[#e0e0e0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#000000]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  연도 · 브랜드 · 모델 · 색상을 함께 적으면 검색 노출에 유리합니다.
                </p>
              </div>

              <div className="pt-2">
                <p className="font-semibold mb-1">이거 수제품인가요?</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={handmade}
                    onChange={(e) => setHandmade(e.target.checked)}
                    className="accent-[#000000] w-4 h-4"
                  />
                  <span className="text-sm">이 제품은 제가 직접 만들었습니다.</span>
                </label>
              </div>
            </div>
          </section>

          <h2 className="text-2xl font-bold pl-2 pt-2">사진 및 설명</h2>

          <section
            id="section-photos"
            className="bg-white border border-[#e0e0e0] rounded-xl p-6"
          >
            <div className="flex items-baseline justify-between mb-1">
              <h3 className="text-xl font-bold">
                장비 사진을 업로드하세요 <span className="text-[#000000]">*</span>
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

            <div
              onClick={addImage}
              className="border-2 border-dashed border-[#e0e0e0] hover:border-gray-700 hover:bg-[#f7f7f7] rounded-lg py-12 flex flex-col items-center justify-center text-center cursor-pointer transition"
            >
              <button className="px-4 py-2 border border-gray-400 rounded-full bg-white hover:bg-[#f7f7f7] font-semibold text-sm flex items-center gap-1.5 mb-3">
                <Plus className="w-4 h-4" />
                사진 업로드
              </button>
              <Upload className="w-5 h-5 text-gray-400 mb-1" />
              <p className="text-sm text-gray-600">
                또는 대표 이미지 포함 최대 <span className="font-semibold">10장</span>까지 드래그 앤 드롭하세요.
              </p>
            </div>

            {images.length > 0 && (
              <div className="mt-6">
                <p className="font-semibold mb-3 pb-2 border-b border-[#e0e0e0]">사진</p>
                <p className="text-xs font-semibold text-gray-500 mb-2">대표</p>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-lg overflow-hidden border-2 border-[#e0e0e0] group"
                    >
                      <img src={img} alt={`등록 사진 ${idx + 1}`} className="w-full h-full object-cover" />
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
            <h3 className="text-xl font-bold mb-4">상태를 선택하고 항목을 설명하세요.</h3>

            <div className="mb-5">
              <label className="block font-semibold mb-1">
                상태 <span className="text-[#000000]">*</span>
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full border border-[#e0e0e0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#000000] bg-white"
              >
                {CONDITIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <button className="text-sm text-[#000000] hover:text-[#000000] font-semibold mt-2 inline-flex items-center gap-1">
                상태를 판단하는 방법 <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div>
              <label className="block font-semibold mb-1">
                이 상품과 그 상태에 대해 설명해 주세요 <span className="text-[#000000]">*</span>
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
                  placeholder="제품의 상태, 수리/개조 이력, 포함된 구성품, 배송 관련 안내 등을 자세히 적어주세요."
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
                    placeholder="고유 재고 번호 (선택)"
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
                  placeholder="유튜브 링크"
                  className="w-full border border-[#e0e0e0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#000000]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">유튜브 영상을 검색하세요</label>
                <input
                  placeholder="찾기"
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
                    판매 가격 <span className="text-[#000000]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      value={price}
                      onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="25,900,000"
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
                      placeholder="30,800,000"
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
                    placeholder="50,000"
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

            <div className="flex flex-col sm:flex-row gap-2">
              <button className="flex-1 bg-[#000000] text-white py-3 px-6 rounded-lg font-semibold hover:bg-[#000000] transition flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" />
                상품 등록하기
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
