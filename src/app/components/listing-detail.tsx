'use client';
// ============================================================================
// listing-detail.tsx — 상품 상세(PDP) 화면
// ----------------------------------------------------------------------------
// 예전 App.tsx에 인라인돼 있던 상품 상세 영역(<main>)을 떼어낸 컴포넌트.
// react-slick(이미지 캐러셀)을 쓰므로 클라이언트 컴포넌트이며,
// app/listing/[id]/page.tsx에서 next/dynamic(ssr:false)로 로드됩니다.
// → react-slick이 서버에서 렌더되지 않아 SSR 문제를 피하고,
//   Slider는 이 파일 내부 정적 import라 sliderRef(썸네일 클릭 이동)도 정상 작동.
// ============================================================================

import { useState, useEffect, useRef, Fragment } from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { Heart, Share2, Star, MapPin, MessageCircle, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Tag, Info, TrendingUp, BadgeCheck, Truck, BookOpen, Package, ShieldAlert } from 'lucide-react';
import type { Listing } from './browse-filters';
import { fetchListingById } from '@/lib/listings';
import { SPEC_FIELDS } from '@/app/data/spec-fields';
import { SPEC_FIELDS_BY_CATEGORY } from '@/app/data/category-specs';
import { topCategoryOf } from '@/app/data/catalog';

export function ListingDetail({ id }: { id?: string }) {
  // URL의 id로 Supabase에서 매물을 불러옴 (영문 키 → 한글 변환은 fetch 안에서 처리)
  const [listing, setListing] = useState<Listing | null>(null);
  useEffect(() => {
    if (!id) return;
    let active = true;
    fetchListingById(id)
      .then((row) => { if (active) setListing(row); })
      .catch((err) => console.error('매물 불러오기 실패:', err));
    return () => { active = false; };
  }, [id]);

  const [mainImage, setMainImage] = useState(0);
  const [reviewTab, setReviewTab] = useState<'all' | 'seller' | 'buyer'>('all');
  const [reviewSort, setReviewSort] = useState<'latest' | 'rating-high' | 'rating-low'>('latest');
  const [reviewPage, setReviewPage] = useState(1);
  const [likedSimilar, setLikedSimilar] = useState<Set<number>>(new Set());
  const [mainLiked, setMainLiked] = useState(false);
  const mainLikeCount = 15 + (mainLiked ? 1 : 0);

  const toggleSimilarLike = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedSimilar(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const allReviews = [
    { id: 1, name: '최태원', rating: 5, daysAgo: 3, type: 'seller', text: '최고의 판매자입니다! 기타가 설명 그대로 도착했고 포장도 매우 꼼꼼했습니다. 빠른 배송과 친절한 소통이 인상적이었습니다.', product: '1965 펜더 텔레캐스터' },
    { id: 2, name: '한지민', rating: 5, daysAgo: 7, type: 'buyer', text: '정말 좋은 경험이었어요! 기타 상태가 기대 이상이었습니다. 판매자가 질문에 친절하게 답변해 주셨고 배송도 매우 빨랐어요.', product: '1964 깁슨 레스폴' },
    { id: 3, name: '정승우', rating: 4, daysAgo: 14, type: 'seller', text: '전반적으로 좋은 판매자예요. 작은 마감 이슈가 있었지만 판매자가 부분 환불을 제안해주셨어요. 합리적인 대응이었습니다.', product: '1962 펜더 재즈마스터' },
    { id: 4, name: '김도윤', rating: 5, daysAgo: 21, type: 'buyer', text: '제품 상태가 사진과 동일했고, 사운드도 만족스럽습니다. 다음에도 이용하고 싶은 판매자입니다.', product: 'McIntosh MA252' },
    { id: 5, name: '이서연', rating: 5, daysAgo: 30, type: 'seller', text: '응대가 정말 빠르고 친절했습니다. 포장 상태도 완벽했어요.', product: 'Marantz PM-15' },
    { id: 6, name: '박민준', rating: 3, daysAgo: 35, type: 'buyer', text: '제품은 괜찮은데 배송이 예상보다 늦었습니다. 그래도 결과적으로 만족합니다.', product: 'Yamaha A-S2200' },
    { id: 7, name: '강수진', rating: 5, daysAgo: 45, type: 'seller', text: '믿고 거래할 수 있는 판매자입니다. 추천합니다!', product: 'Luxman L-507' },
    { id: 8, name: '오현우', rating: 5, daysAgo: 60, type: 'buyer', text: '오랜만에 만족스러운 거래였습니다. 상태 좋은 빈티지 앰프 구매했어요.', product: 'McIntosh MC275' },
    { id: 9, name: '윤지원', rating: 2, daysAgo: 75, type: 'seller', text: '응대가 다소 늦었고 일부 설명과 다른 부분이 있었습니다.', product: 'Accuphase E-280' },
    { id: 10, name: '신예린', rating: 5, daysAgo: 90, type: 'buyer', text: '아주 만족합니다. 다음에도 거래하고 싶어요.', product: 'Esoteric K-05XD' },
    { id: 11, name: '조민혁', rating: 4, daysAgo: 100, type: 'seller', text: '전체적으로 만족합니다. 약간의 흠집은 있었지만 가격 대비 좋은 거래였습니다.', product: 'Bryston 4B³' },
    { id: 12, name: '홍지수', rating: 5, daysAgo: 120, type: 'buyer', text: '신속하고 정확한 거래였습니다. 또 이용하겠습니다.', product: 'Naim Supernait 3' },
    { id: 13, name: '문가영', rating: 5, daysAgo: 150, type: 'seller', text: '판매자분이 정말 친절하셨어요. 제품 컨디션도 좋았습니다.', product: 'Pass Labs INT-25' },
    { id: 14, name: '서태민', rating: 4, daysAgo: 180, type: 'buyer', text: '좋은 거래였습니다. 약간 더 빨랐으면 하는 아쉬움은 있어요.', product: 'McIntosh C2700' }
  ];

  const reviewsToShow = (() => {
    let filtered = allReviews;
    if (reviewTab !== 'all') {
      filtered = filtered.filter(r => r.type === reviewTab);
    }
    const sorted = [...filtered].sort((a, b) => {
      if (reviewSort === 'latest') return a.daysAgo - b.daysAgo;
      if (reviewSort === 'rating-high') return b.rating - a.rating;
      return a.rating - b.rating;
    });
    return sorted;
  })();

  const reviewsPerPage = 5;
  const totalPages = Math.max(1, Math.ceil(reviewsToShow.length / reviewsPerPage));
  const currentPage = Math.min(reviewPage, totalPages);
  const paginatedReviews = reviewsToShow.slice(
    (currentPage - 1) * reviewsPerPage,
    currentPage * reviewsPerPage
  );

  const formatDaysAgo = (days: number) => {
    if (days < 7) return `${days}일 전`;
    if (days < 30) return `${Math.floor(days / 7)}주 전`;
    if (days < 365) return `${Math.floor(days / 30)}개월 전`;
    return `${Math.floor(days / 365)}년 전`;
  };

  const sellerCount = allReviews.filter(r => r.type === 'seller').length;
  const buyerCount = allReviews.filter(r => r.type === 'buyer').length;
  const [priceHistoryOpen, setPriceHistoryOpen] = useState(false);
  const [specsExpanded, setSpecsExpanded] = useState(false);
  const [techSpecsExpanded, setTechSpecsExpanded] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [sellerReviewsOpen, setSellerReviewsOpen] = useState(false);
  const [sellerDescExpanded, setSellerDescExpanded] = useState(false);
  const [sellerSaved, setSellerSaved] = useState(false);
  const [isStuck, setIsStuck] = useState(false);
  const [isZooming, setIsZooming] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const sentinelRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<Slider>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const thumbnailsRef = useRef<HTMLDivElement>(null);

  const handleZoomMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y))
    });
  };

  const scrollThumbnails = (direction: 'up' | 'down') => {
    if (!thumbnailsRef.current) return;
    const amount = direction === 'up' ? -160 : 160;
    thumbnailsRef.current.scrollBy({ top: amount, behavior: 'smooth' });
  };

  useEffect(() => {
    // 이 컴포넌트는 PDP 전용이라 항상 관찰 (예전 page !== 'pdp' 분기 제거)
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsStuck(!entry.isIntersecting),
      { rootMargin: '-80px 0px 0px 0px', threshold: [0] }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // 매물 사진 — listing.images에서 가져옴. 비어있거나 listing 로딩 전이면 NO_IMAGE 1장.
  const NO_IMAGE = '/images/no-image.png';
  const images =
    listing?.images && listing.images.length > 0 ? listing.images : [NO_IMAGE];

  // 깨진 URL이면 NO_IMAGE로 fallback (onerror 무효화로 무한 루프 방지)
  const onImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    img.onerror = null;
    img.src = NO_IMAGE;
  };

  const PrevArrow = ({ onClick }: { onClick?: () => void }) => (
    <button
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      aria-label="이전 사진"
      className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-md hover:shadow-lg active:scale-90 active:bg-[#e0e0e0] active:shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200"
    >
      <ChevronLeft className="w-5 h-5 text-gray-700" />
    </button>
  );

  const NextArrow = ({ onClick }: { onClick?: () => void }) => (
    <button
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      aria-label="다음 사진"
      className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-md hover:shadow-lg active:scale-90 active:bg-[#e0e0e0] active:shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200"
    >
      <ChevronRight className="w-5 h-5 text-gray-700" />
    </button>
  );

  const sliderSettings = {
    dots: false,
    arrows: true,
    infinite: true,
    speed: 0,
    slidesToShow: 1,
    slidesToScroll: 1,
    draggable: false,
    swipe: false,
    touchMove: false,
    beforeChange: (current: number, next: number) => setMainImage(next),
    prevArrow: <PrevArrow />,
    nextArrow: <NextArrow />
  };

  return (
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-12 pt-6">
            <div className="flex gap-3 relative">
              <div className="relative group/thumbs flex-shrink-0">
                <button
                  onClick={() => scrollThumbnails('up')}
                  aria-label="썸네일 위로"
                  className="absolute top-0 left-0 right-0 z-10 h-7 bg-white/90 hover:bg-white shadow-md rounded-lg flex items-center justify-center opacity-0 group-hover/thumbs:opacity-100 active:scale-95 transition-all duration-200"
                >
                  <ChevronUp className="w-4 h-4 text-gray-700" />
                </button>

                <div
                  ref={thumbnailsRef}
                  className="flex flex-col gap-2 max-h-[480px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onMouseEnter={() => {
                        setIsZooming(false);
                        sliderRef.current?.slickGoTo(idx, true);
                      }}
                      onClick={() => {
                        setIsZooming(false);
                        sliderRef.current?.slickGoTo(idx, true);
                      }}
                      className={`w-[72px] h-[72px] rounded-lg overflow-hidden border-2 bg-[#f7f7f7] flex-shrink-0 ${
                        mainImage === idx ? 'border-[#000000]' : 'border-[#e0e0e0]'
                      }`}
                    >
                      <img
                        src={img}
                        alt={`썸네일 ${idx + 1}`}
                        className="w-full h-full object-contain"
                        onError={onImgError}
                      />
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => scrollThumbnails('down')}
                  aria-label="썸네일 아래로"
                  className="absolute bottom-0 left-0 right-0 z-10 h-7 bg-white/90 hover:bg-white shadow-md rounded-lg flex items-center justify-center opacity-0 group-hover/thumbs:opacity-100 active:scale-95 transition-all duration-200"
                >
                  <ChevronDown className="w-4 h-4 text-gray-700" />
                </button>
              </div>

              <div
                ref={imageContainerRef}
                onClick={() => setIsZooming(prev => !prev)}
                onMouseMove={handleZoomMouseMove}
                className={`group relative bg-[#f7f7f7] rounded-lg overflow-hidden flex-1 aspect-[4/3] ${isZooming ? 'cursor-zoom-out' : 'cursor-zoom-in'} [&_.slick-slider]:h-full [&_.slick-list]:h-full [&_.slick-track]:h-full [&_.slick-slide>div]:h-full [&_.slick-slide]:!block`}
              >
                <Slider {...sliderSettings} ref={sliderRef}>
                  {images.map((img, idx) => (
                    <div key={idx} className="h-full">
                      <img
                        src={img}
                        alt={`제품 사진 ${idx + 1}`}
                        className="w-full h-full object-contain block"
                        onError={onImgError}
                        style={
                          isZooming && idx === mainImage
                            ? {
                                transform: 'scale(2.5)',
                                transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`
                              }
                            : undefined
                        }
                      />
                    </div>
                  ))}
                </Slider>

                <div className="absolute top-3 left-3 z-10 px-2.5 py-1 bg-red-500 text-white text-xs font-semibold rounded-full pointer-events-none">
                  3명의 장바구니에 담음
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMainLiked((v) => !v);
                  }}
                  aria-label="좋아요"
                  className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#e0e0e0] hover:border-gray-400 shadow-sm rounded-full active:scale-95 transition"
                >
                  <span className="text-sm font-semibold text-gray-700">{mainLikeCount}</span>
                  <Heart
                    className={`w-4 h-4 ${
                      mainLiked ? 'fill-red-500 text-red-500' : 'text-gray-700'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="relative group/carousel">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold">비슷한 제품</h3>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <span>광고</span>
                  <Info className="w-3.5 h-3.5" />
                </div>
              </div>
              <div
                id="similar-carousel"
                className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {[
                  { title: 'McIntosh MC275', price: '32,500,000원', img: '/images/2c6f7c1fc6fb6.jpg', condition: '중고 - 매우 좋음' },
                  { title: 'McIntosh MC312', price: '45,000,000원', img: '/images/4d097765a9285.jpg', condition: '새상품' },
                  { title: 'McIntosh MA252', price: '38,200,000원', img: '/images/618155823824e.jpg', condition: '중고 - 민트' },
                  { title: 'McIntosh MC462', price: '60,500,000원', img: '/images/d4ba8a07c2a69.jpg', condition: '새상품' },
                  { title: 'McIntosh C2700', price: '42,800,000원', img: '/images/f4362b6cdce17.jpg', condition: '중고 - 좋음' },
                  { title: 'McIntosh MA8950', price: '55,700,000원', img: '/images/fd5b7a6adbead.jpg', condition: '중고 - 매우 좋음' },
                  { title: 'McIntosh MC152 (블랙)', price: '24,900,000원', img: '/images/2c6f7c1fc6fb6.jpg', condition: '새상품' },
                  { title: 'McIntosh MA9000', price: '78,000,000원', img: '/images/4d097765a9285.jpg', condition: '중고 - 민트' }
                ].map((item, idx) => {
                  const isNew = item.condition === '새상품';
                  return (
                    <div
                      key={idx}
                      className="flex-shrink-0 w-[170px] snap-start cursor-pointer hover:shadow-md transition rounded-lg overflow-hidden border border-[#e0e0e0] relative"
                    >
                      <button
                        onClick={(e) => toggleSimilarLike(idx, e)}
                        aria-label="좋아요"
                        className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow-md flex items-center justify-center active:scale-90 transition"
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            likedSimilar.has(idx)
                              ? 'fill-red-500 text-red-500'
                              : 'text-gray-700'
                          }`}
                        />
                      </button>
                      <div className="aspect-square bg-[#f7f7f7]">
                        <img src={NO_IMAGE} alt={item.title} className="w-full h-full object-contain" />
                      </div>
                      <div className="p-3">
                        <h4 className="text-sm font-semibold truncate">{item.title}</h4>
                        <p className="text-xs text-gray-600 mt-1">{item.condition}</p>
                        <p className="text-base font-bold text-[#000000] mt-1">{item.price}</p>
                        {isNew && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-700">
                            <Truck className="w-3.5 h-3.5" />
                            <span>무료 배송</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => document.getElementById('similar-carousel')?.scrollBy({ left: -400, behavior: 'smooth' })}
                aria-label="이전"
                className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-md hover:shadow-lg active:scale-90 flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-all duration-200 z-10"
              >
                <ChevronLeft className="w-5 h-5 text-gray-700" />
              </button>
              <button
                onClick={() => document.getElementById('similar-carousel')?.scrollBy({ left: 400, behavior: 'smooth' })}
                aria-label="다음"
                className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-md hover:shadow-lg active:scale-90 flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-all duration-200 z-10"
              >
                <ChevronRight className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            <div className="border border-[#e0e0e0] rounded-lg p-6">
              <h3 className="text-2xl font-bold mb-6">
                이 제품은 <span className="text-green-600">합리적인 가격</span>이에요
              </h3>

              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <p className="text-gray-700 leading-relaxed">
                    현재 평균 시장 가격대<br />
                    안에 있어요
                  </p>
                  <Info className="w-5 h-5 mt-3 text-gray-500" />
                </div>

                <div className="flex-1 mt-2 relative pt-14">
                  <div
                    className="absolute top-0 -translate-x-1/2 px-4 py-1.5 bg-white border border-[#e0e0e0] rounded-full shadow-sm text-base font-bold whitespace-nowrap"
                    style={{ left: '53.5%' }}
                  >
                    25,900,000원
                    <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-white border-r border-b border-[#e0e0e0] rotate-45"></div>
                  </div>

                  <div className="relative">
                    <div className="flex h-1.5 gap-0.5">
                      <div className="flex-1 bg-purple-400 rounded-l-full"></div>
                      <div className="flex-[2] bg-green-500"></div>
                      <div className="flex-1 bg-gray-700 rounded-r-full"></div>
                    </div>
                    <div
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-white border-2 border-green-500 rounded-full shadow-md flex items-center justify-center"
                      style={{ left: '53.5%' }}
                    >
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                  </div>

                  <div className="flex justify-between text-sm text-gray-500 mt-3 px-[12.5%]">
                    <span>23,100,000원</span>
                    <span>28,000,000원</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#e0e0e0] mt-6 pt-4">
                <button
                  onClick={() => setPriceHistoryOpen(!priceHistoryOpen)}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    <h4 className="text-lg font-bold">가격 변동 내역</h4>
                  </div>
                  {priceHistoryOpen ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </button>

                {priceHistoryOpen && (
                  <div className="mt-4">
                    <div className="grid grid-cols-3 gap-4 text-sm font-bold pb-3">
                      <div>날짜</div>
                      <div>변동</div>
                      <div className="text-right">가격</div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm py-3 border-t border-[#e0e0e0] items-center">
                      <div>2026/04/15</div>
                      <div className="flex items-center gap-1.5">
                        <Tag className="w-4 h-4" />
                        가격 인하
                      </div>
                      <div className="text-right font-semibold">25,900,000원</div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm py-3 border-t border-[#e0e0e0] items-center">
                      <div>2026/03/01</div>
                      <div className="flex items-center gap-1.5">
                        <Tag className="w-4 h-4" />
                        등록
                      </div>
                      <div className="text-right font-semibold">30,800,000원</div>
                    </div>
                    <p className="text-xs text-gray-500 mt-4 pt-4 border-t border-[#e0e0e0]">
                      가격 정보는 판매자가 제공한 가격 변동 내역 기준입니다.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">제품 정보</h2>
              <div className="relative">
                <div
                  className={`grid grid-cols-[140px_1fr] gap-x-6 gap-y-3 ${
                    !specsExpanded ? 'max-h-[200px] overflow-hidden' : ''
                  }`}
                >
                  <div className="font-bold">브랜드</div>
                  <div className="break-words">{listing?.brand ?? ''}</div>

                  <div className="font-bold">모델</div>
                  <div className="break-words">{listing?.model ?? ''}</div>

                  <div className="font-bold">출시년도</div>
                  <div className="break-words">{listing?.year ?? ''}</div>

                  <div className="font-bold">제조국</div>
                  <div className="break-words">{listing?.country ?? ''}</div>

                  <div className="font-bold">소유권</div>
                  <div className="break-words">{listing?.ownership ?? ''}</div>

                  {listing?.components && (
                    <>
                      <div className="font-bold">구성품</div>
                      <div className="break-words">{listing.components}</div>
                    </>
                  )}

                  <div className="font-bold">상태</div>
                  <div className="break-words">
                    {listing?.condition ?? ''}{' '}
                    <a href="#" className="text-[#000000] underline hover:text-[#000000] text-sm">
                      등급 기준 자세히 보기
                    </a>
                  </div>

                  {listing?.appearance && (
                    <>
                      <div className="font-bold">외관 상태</div>
                      <div className="break-words">
                        {listing.appearance}
                        {listing.appearanceDetail && (
                          <p className="mt-1 text-sm text-gray-600">{listing.appearanceDetail}</p>
                        )}
                      </div>
                    </>
                  )}

                  {listing?.working && (
                    <>
                      <div className="font-bold">작동 상태</div>
                      <div className="break-words">
                        {listing.working}
                        {listing.workingDetail && (
                          <p className="mt-1 text-sm text-gray-600">{listing.workingDetail}</p>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {!specsExpanded && (
                  <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-white pointer-events-none"></div>
                )}

                {!specsExpanded && (
                  <div className="absolute bottom-0 left-0 right-0 flex justify-center">
                    <button
                      onClick={() => setSpecsExpanded(true)}
                      className="px-6 py-2 border border-[#e0e0e0] rounded-full bg-white hover:bg-[#f7f7f7] font-semibold text-sm shadow-sm transition"
                    >
                      더 보기
                    </button>
                  </div>
                )}
              </div>
            </div>

            {(() => {
              // 기술 사양 — 카테고리별 스키마(앰프 등)가 있으면 그 라벨·순서로, 없으면 기존 SPEC_FIELDS(분기).
              // listing.techSpecs에 값 있는 항목만. 다중 선택(배열)은 "RCA, XLR"처럼 나열, 조립 문자열은 그대로.
              // 값 있는 항목이 하나도 없으면 섹션 전체 숨김 (옛 매물·더미 호환).
              const specs = listing?.techSpecs ?? {};
              const schema = (SPEC_FIELDS_BY_CATEGORY[topCategoryOf(listing?.category ?? '')] ?? SPEC_FIELDS) as readonly {
                key: string; label: string;
                input?: { kind: string; options?: (string | { value: string; label: string })[] };
                showWhen?: (s: Record<string, string | string[]>) => boolean;
              }[];
              // 표시값: 배열→"a, b" 나열 / select(영문키 저장, 예 스피커 passive)는 옵션 label로 한글 변환 / 그 외 문자열은 그대로
              const fmt = (
                f: { input?: { kind: string; options?: (string | { value: string; label: string })[] } },
                v: string | string[],
              ): string => {
                if (Array.isArray(v)) return v.join(', ');
                if (f.input?.kind === 'select' && f.input.options) {
                  const opt = f.input.options.find((o) => (typeof o === 'string' ? o : o.value) === v);
                  if (opt) return typeof opt === 'string' ? opt : opt.label;
                }
                return v;
              };
              const rows = schema.filter((f) => {
                // 폼과 동일 게이팅: 형식(패시브/액티브) + 하위 카테고리(__sub) 주입.
                //   techSpecs.type = 폼 auto 필드가 저장한 하위 카테고리(예: '서브우퍼') → __sub로 사용해
                //   서브우퍼 전용 필드(방사 방향·위상 조절 등)가 상세에서도 정상 표시됨.
                if (f.showWhen && !f.showWhen({ ...specs, __sub: typeof specs.type === 'string' ? specs.type : '' })) return false;
                const v = specs[f.key];
                return Array.isArray(v) ? v.length > 0 : Boolean(v);
              });
              if (rows.length === 0) return null;
              return (
                <div>
                  <h2 className="text-2xl font-bold mb-4">기술 사양</h2>
                  <div className="relative">
                    <div
                      className={`grid grid-cols-[140px_1fr] gap-x-6 gap-y-3 ${
                        !techSpecsExpanded ? 'max-h-[120px] overflow-hidden' : ''
                      }`}
                    >
                      {rows.map((f) => (
                        <Fragment key={f.key}>
                          <div className="font-bold">{f.label}</div>
                          <div className="break-words">{fmt(f, specs[f.key])}</div>
                        </Fragment>
                      ))}
                    </div>

                    {!techSpecsExpanded && rows.length > 4 && (
                      <>
                        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-white pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 right-0 flex justify-center">
                          <button
                            onClick={() => setTechSpecsExpanded(true)}
                            className="px-6 py-2 border border-[#e0e0e0] rounded-full bg-white hover:bg-[#f7f7f7] font-semibold text-sm shadow-sm transition"
                          >
                            더 보기
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })()}

            <div>
              <h2 className="text-2xl font-bold mb-4">제품 설명</h2>
              <div className="relative">
                <div
                  className={`prose max-w-none text-gray-700 space-y-4 leading-relaxed ${
                    !descriptionExpanded ? 'max-h-[200px] overflow-hidden' : ''
                  }`}
                >
                  <p>
                    McIntosh MC152는 채널당 150W 출력을 내주는 스테레오 파워 앰프입니다.<br />
                    2옴, 4옴, 8옴 어느 스피커를 연결해도 동일하게 150W를 내주는 맥킨토시 오토포머 방식이라, 스피커 매칭에 대한 부담이 적은 편입니다.
                  </p>
                  <p>
                    맥킨토시 파워 앰프 중에서는 비교적 아담한 모델에 속하지만, 그렇다고 가볍게 볼 앰프는 아닙니다.<br />
                    오히려 일반 가정에서 사용하기에는 출력도 충분하고, 크기도 부담스럽지 않아 실사용 만족도가 좋은 모델입니다.
                  </p>
                  <p>
                    전면에는 맥킨토시 특유의 블랙 글라스 패널과 파란색 출력 미터가 들어가 있어, 딱 봐도 "맥킨토시구나" 싶은 분위기가 납니다.<br />
                    높이가 약 6인치 정도로 슬림한 편이라, 큰 파워 앰프가 부담스러운 공간에도 비교적 수월하게 설치할 수 있습니다.
                  </p>
                  <p>
                    입력은 밸런스와 언밸런스를 모두 지원해서 프리앰프 연결도 편하고, 맥킨토시의 Power Guard 회로가 들어가 있어 과도한 클리핑으로부터 스피커를 보호해주는 점도 장점입니다.
                  </p>
                  <p>
                    소리 성향은 맥킨토시답게 힘이 있으면서도 거칠지 않고, 저역을 단단하게 잡아주는 느낌이 좋습니다.<br />
                    큰 대출력 모델처럼 압도적인 체급을 내세우는 앰프는 아니지만, 음악을 편안하게 오래 듣기에는 오히려 과하지 않고 밸런스가 좋은 앰프라고 볼 수 있습니다.
                  </p>
                  <p>
                    Hi-Fi World에서도 별 5개 만점 평가를 받은 모델로, 단순히 "작은 맥킨토시"가 아니라 MC152 자체로 완성도가 좋은 파워 앰프라는 평가를 받았습니다.
                  </p>
                  <p>
                    정리하자면, MC152는 맥킨토시의 기본기와 디자인, 안정적인 구동력을 부담스럽지 않은 크기에서 즐길 수 있는 스테레오 파워 앰프입니다.<br />
                    큰 공간보다는 일반 가정의 하이파이 시스템, 또는 홈시어터 서라운드 채널용으로도 잘 어울리는 모델입니다.
                  </p>
                </div>

                {!descriptionExpanded && (
                  <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-white pointer-events-none"></div>
                )}

                {!descriptionExpanded && (
                  <div className="absolute bottom-0 left-0 right-0 flex justify-center">
                    <button
                      onClick={() => setDescriptionExpanded(true)}
                      className="px-6 py-2 border border-[#e0e0e0] rounded-full bg-white hover:bg-[#f7f7f7] font-semibold text-sm shadow-sm transition"
                    >
                      더 보기
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-[#e0e0e0] pt-6">
              <h2 className="text-2xl font-bold mb-6">판매자에 대하여</h2>
              <div className="flex items-start justify-between gap-6 mb-6">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-500 to-pink-500 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
                    몽
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold">몽키타르</p>
                      <div className="relative group/badge inline-block">
                        <BadgeCheck className="w-6 h-6 text-blue-500 fill-blue-100 cursor-help" />
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover/badge:opacity-100 pointer-events-none transition-opacity duration-200 z-20">
                          이 판매자는 뛰어난 서비스를 제공합니다.
                          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-[#000000]"></div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <MapPin className="w-4 h-4" />
                      <span>대한민국 서울</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700 mt-2">
                      <span className="font-semibold">Resonance 가입일 :</span>
                      <span>2018년</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 w-[280px] flex-shrink-0">
                  <button className="bg-[#f7f7f7] hover:bg-[#e0e0e0] text-[#000000] py-3 px-6 rounded-full font-semibold transition text-sm">
                    판매자에게 메시지 보내기
                  </button>
                  <button className="bg-[#f7f7f7] hover:bg-[#e0e0e0] text-[#000000] py-3 px-6 rounded-full font-semibold transition text-sm">
                    이 상점의 더 많은 제품 보기
                  </button>
                </div>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-[#f7f7f7]/60 via-white to-[#f7f7f7] border border-[#e0e0e0] p-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="group relative p-4 rounded-xl bg-white border border-[#f7f7f7] hover:border-gray-400 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-[#e0e0e0] flex items-center justify-center group-hover:bg-[#e0e0e0] transition">
                        <BookOpen className="w-4 h-4 text-[#000000]" />
                      </div>
                      <span className="font-bold text-sm">브랜드 스토리</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      2006년 설립된 <span className="font-semibold">'Monkey Guitar'</span>의 약자입니다.
                    </p>
                  </div>

                  <div className="group relative p-4 rounded-xl bg-white border border-[#f7f7f7] hover:border-gray-400 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition">
                        <Package className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="font-bold text-sm">취급 제품</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      신품·중고 유명 브랜드. 구하기 어려운 제품을 <span className="font-semibold">합리적인 가격</span>에 제공합니다.
                    </p>
                  </div>

                  <div className="group relative p-4 rounded-xl bg-white border border-[#f7f7f7] hover:border-gray-400 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition">
                        <ShieldAlert className="w-4 h-4 text-amber-600" />
                      </div>
                      <span className="font-bold text-sm">거래 정책</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      현 상태 그대로 판매 · <span className="font-semibold">환불 불가</span>
                      <button
                        onClick={() => setSellerDescExpanded(!sellerDescExpanded)}
                        className="ml-1 text-[#000000] hover:text-[#000000] font-semibold text-xs"
                      >
                        {sellerDescExpanded ? '접기' : '자세히'}
                      </button>
                    </p>
                    {sellerDescExpanded && (
                      <p className="text-xs text-gray-600 leading-relaxed mt-2 pt-2 border-t border-[#f7f7f7]">
                        모든 기타, 이펙터 및 액세서리는 현 상태 그대로 판매되며 환불이 불가합니다. 배송비에는 PayPal 수수료와 Reverb 수수료가 포함됩니다.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-[#e0e0e0] pt-6">
              <button
                onClick={() => setSellerReviewsOpen(!sellerReviewsOpen)}
                className="w-full flex items-center justify-between mb-4 hover:opacity-80 transition"
              >
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold">판매자 리뷰 (1,234)</h2>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-5 h-5 fill-gray-700 text-gray-700" />
                    ))}
                  </div>
                </div>
                {sellerReviewsOpen ? (
                  <ChevronUp className="w-6 h-6 text-gray-700" />
                ) : (
                  <ChevronDown className="w-6 h-6 text-gray-700" />
                )}
              </button>

              {sellerReviewsOpen && (
              <>
              <div className="bg-[#f7f7f7] rounded-lg p-6 mb-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-[#000000]">4.9</div>
                    <div className="flex justify-center mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className="w-4 h-4 fill-gray-700 text-gray-700" />
                      ))}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">종합 평점</p>
                  </div>
                  <div className="flex-1 border-l border-[#e0e0e0] pl-6">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-green-600">99%</div>
                        <p className="text-xs text-gray-600">긍정 평가</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">1,234</div>
                        <p className="text-xs text-gray-600">총 리뷰</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">2020</div>
                        <p className="text-xs text-gray-600">가입 연도</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 mb-1">정확도</p>
                      <p className="font-semibold">100%</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">배송</p>
                      <p className="font-semibold">99%</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">소통</p>
                      <p className="font-semibold">100%</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 mb-1">가격</p>
                      <p className="font-semibold">4.9 / 5.0</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">속도</p>
                      <p className="font-semibold">4.8 / 5.0</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">서비스</p>
                      <p className="font-semibold">5.0 / 5.0</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4 flex items-center justify-between pb-2 border-b border-[#e0e0e0]">
                <span className="font-semibold text-gray-700">전체 리뷰 ({allReviews.length})</span>
                <select
                  value={reviewSort}
                  onChange={(e) => { setReviewSort(e.target.value as 'latest' | 'rating-high' | 'rating-low'); setReviewPage(1); }}
                  className="text-xs border border-[#e0e0e0] rounded-md px-2 py-1 bg-white hover:border-gray-400 cursor-pointer focus:outline-none focus:border-[#000000]"
                >
                  <option value="latest">최신순</option>
                  <option value="rating-high">별점 높은 순</option>
                  <option value="rating-low">별점 낮은 순</option>
                </select>
              </div>

              <div className="space-y-4">
                {paginatedReviews.map((review) => (
                  <div key={review.id} className="border-b border-[#e0e0e0] pb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${star <= review.rating ? 'fill-gray-700 text-gray-700' : 'text-[#e0e0e0]'}`}
                          />
                        ))}
                      </div>
                      <span className="font-semibold">{review.name}</span>
                      <span className="text-sm text-gray-500">• {formatDaysAgo(review.daysAgo)}</span>
                    </div>
                    <p className="text-gray-700 mb-2">{review.text}</p>
                    <p className="text-sm text-gray-500">제품: {review.product}</p>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button
                    onClick={() => setReviewPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#e0e0e0] hover:bg-[#f7f7f7] disabled:opacity-40 disabled:cursor-not-allowed transition"
                    aria-label="이전 페이지"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setReviewPage(page)}
                      className={`w-9 h-9 flex items-center justify-center rounded-lg font-semibold transition ${
                        currentPage === page
                          ? 'bg-[#000000] text-white'
                          : 'border border-[#e0e0e0] hover:bg-[#f7f7f7]'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setReviewPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#e0e0e0] hover:bg-[#f7f7f7] disabled:opacity-40 disabled:cursor-not-allowed transition"
                    aria-label="다음 페이지"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
              </>
              )}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div ref={sentinelRef} className="h-0"></div>
            <div className="sticky top-20">
              <div className={`bg-white rounded-lg pt-6 px-6 pb-2 space-y-4 transition-shadow duration-300 ${isStuck ? 'shadow-[0_-6px_20px_-6px_rgba(0,0,0,0.12),0_10px_20px_-6px_rgba(0,0,0,0.15)]' : 'shadow-none'}`}>
                <div>
                  <h1 className="text-3xl font-bold mb-2">{listing ? `${listing.brand} ${listing.model}` : '불러오는 중…'}</h1>
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    {listing?.handmade && (
                      <span className="px-1.5 py-0.5 bg-[#000000] text-white rounded text-xs font-medium">수제품</span>
                    )}
                    <span className="px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-xs">{listing?.condition ?? ''}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className="w-4 h-4 fill-gray-700 text-gray-700" />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">(리뷰 124개)</span>
                  </div>
                </div>

                <div className={`border-t border-t-[#e0e0e0] border-b py-4 transition-colors duration-300 ${isStuck ? 'border-b-transparent' : 'border-b-[#e0e0e0]'}`}>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">{listing ? `${listing.price.toLocaleString('ko-KR')}원` : ''}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button className="w-full bg-[#000000] text-white py-3 px-6 rounded-lg font-semibold hover:bg-[#000000] transition">
                    장바구니 담기
                  </button>
                  <button className="w-full bg-slate-900 text-white py-3 px-6 rounded-lg font-semibold hover:bg-slate-800 transition">
                    바로 구매
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setMainLiked((v) => !v)}
                    className="flex-1 border-2 border-[#e0e0e0] text-gray-700 hover:border-gray-400 py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition text-sm"
                  >
                    <Heart className={`w-4 h-4 ${mainLiked ? 'fill-red-500 text-red-500' : ''}`} />
                    관심 제품
                  </button>
                  <button className="flex-1 border-2 border-[#e0e0e0] text-gray-700 py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 hover:border-gray-400 transition text-sm">
                    <MessageCircle className="w-4 h-4" />
                    가격 제안
                  </button>
                  <button className="border-2 border-[#e0e0e0] text-gray-700 py-2 px-3 rounded-lg hover:border-gray-400 transition">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 py-2">
                  <div className="text-center">
                    <span className="font-bold text-gray-700">등록일:</span> 13일 전
                  </div>
                  <div className="text-center">
                    <span className="font-bold text-gray-700">조회수:</span> 197
                  </div>
                  <div className="text-center">
                    <span className="font-bold text-gray-700">제안:</span> 3
                  </div>
                </div>

                <div className="border-t border-t-[#e0e0e0] py-8 flex items-center gap-3 relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    몽
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold">몽키타르</span>
                      <div className="relative group/badge2 inline-block">
                        <BadgeCheck className="w-4 h-4 text-blue-500 fill-blue-100 cursor-help" />
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover/badge2:opacity-100 pointer-events-none transition-opacity duration-200 z-20">
                          이 판매자는 뛰어난 서비스를 제공합니다.
                          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-[#000000]"></div>
                        </div>
                      </div>
                      <div className="flex ml-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className="w-3.5 h-3.5 fill-gray-700 text-gray-700" />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">(245)</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-600 mt-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{listing?.location ? `대한민국 ${listing.location}` : ''}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSellerSaved((v) => !v)}
                    aria-label="판매자 저장"
                    className="flex items-center gap-1.5 px-3 py-2 border border-[#e0e0e0] hover:border-gray-400 rounded-full text-sm font-semibold text-gray-700 active:scale-95 transition flex-shrink-0"
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        sellerSaved ? 'fill-red-500 text-red-500' : 'text-gray-700'
                      }`}
                    />
                    판매자 저장
                  </button>
                  <div
                    className={`absolute left-0 right-0 bottom-0 h-px bg-[#e0e0e0] transition-all duration-500 ease-in-out ${
                      isStuck ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {[
          {
            sectionTitle: '비슷한 제품',
            scrollId: 'similar-carousel-bottom',
            items: [
              { title: 'McIntosh MC275', price: '32,500,000원', img: '/images/2c6f7c1fc6fb6.jpg', condition: '중고 - 매우 좋음' },
              { title: 'McIntosh MC312', price: '45,000,000원', img: '/images/4d097765a9285.jpg', condition: '새상품' },
              { title: 'McIntosh MA252', price: '38,200,000원', img: '/images/618155823824e.jpg', condition: '중고 - 민트' },
              { title: 'McIntosh MC462', price: '60,500,000원', img: '/images/d4ba8a07c2a69.jpg', condition: '새상품' },
              { title: 'McIntosh C2700', price: '42,800,000원', img: '/images/f4362b6cdce17.jpg', condition: '중고 - 좋음' },
              { title: 'McIntosh MA8950', price: '55,700,000원', img: '/images/fd5b7a6adbead.jpg', condition: '중고 - 매우 좋음' },
              { title: 'McIntosh MC152 (블랙)', price: '24,900,000원', img: '/images/2c6f7c1fc6fb6.jpg', condition: '새상품' },
              { title: 'McIntosh MA9000', price: '78,000,000원', img: '/images/4d097765a9285.jpg', condition: '중고 - 민트' },
              { title: 'McIntosh MC611', price: '85,000,000원', img: '/images/618155823824e.jpg', condition: '새상품' },
              { title: 'McIntosh MA12000', price: '95,000,000원', img: '/images/d4ba8a07c2a69.jpg', condition: '중고 - 매우 좋음' },
              { title: 'McIntosh C12000', price: '98,000,000원', img: '/images/f4362b6cdce17.jpg', condition: '새상품' },
              { title: 'McIntosh MC1.25KW', price: '120,000,000원', img: '/images/fd5b7a6adbead.jpg', condition: '중고 - 좋음' }
            ]
          },
          {
            sectionTitle: '최근 조회에 기반한 추천 제품',
            scrollId: 'recent-carousel',
            items: [
              { title: 'McIntosh MA352', price: '42,000,000원', img: '/images/d4ba8a07c2a69.jpg', condition: '새상품' },
              { title: 'Marantz PM-15S2', price: '15,500,000원', img: '/images/f4362b6cdce17.jpg', condition: '중고 - 매우 좋음' },
              { title: 'Yamaha A-S2200', price: '12,800,000원', img: '/images/618155823824e.jpg', condition: '중고 - 민트' },
              { title: 'Luxman L-507uXII', price: '18,900,000원', img: '/images/fd5b7a6adbead.jpg', condition: '중고 - 좋음' },
              { title: 'Accuphase E-280', price: '21,500,000원', img: '/images/2c6f7c1fc6fb6.jpg', condition: '새상품' },
              { title: 'Bryston 4B³', price: '28,700,000원', img: '/images/4d097765a9285.jpg', condition: '중고 - 매우 좋음' },
              { title: 'Naim Supernait 3', price: '16,200,000원', img: '/images/618155823824e.jpg', condition: '새상품' },
              { title: 'Pass Labs INT-25', price: '32,000,000원', img: '/images/d4ba8a07c2a69.jpg', condition: '중고 - 민트' },
              { title: 'Hegel H190', price: '11,500,000원', img: '/images/f4362b6cdce17.jpg', condition: '중고 - 좋음' },
              { title: 'Esoteric F-03A', price: '27,800,000원', img: '/images/fd5b7a6adbead.jpg', condition: '새상품' },
              { title: 'Mark Levinson No.5805', price: '52,000,000원', img: '/images/2c6f7c1fc6fb6.jpg', condition: '중고 - 매우 좋음' },
              { title: 'Krell K-300i', price: '24,500,000원', img: '/images/4d097765a9285.jpg', condition: '중고 - 민트' }
            ]
          }
        ].map((section, sectionIdx) => (
          <div key={sectionIdx} className="mt-16 relative group/sec">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">{section.sectionTitle}</h2>
              {section.sectionTitle.includes('최근 조회') && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <span>광고</span>
                  <Info className="w-3.5 h-3.5" />
                </div>
              )}
            </div>

            <div
              id={section.scrollId}
              className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {section.items.map((item, idx) => {
                const isNew = item.condition === '새상품';
                const likedKey = sectionIdx * 1000 + idx;
                return (
                  <div
                    key={idx}
                    className="flex-shrink-0 w-[240px] snap-start cursor-pointer hover:shadow-md transition rounded-lg overflow-hidden border border-[#e0e0e0] relative"
                  >
                    <button
                      onClick={(e) => toggleSimilarLike(likedKey, e)}
                      aria-label="좋아요"
                      className="absolute top-1.5 right-1.5 z-10 w-7 h-7 rounded-full bg-white/90 hover:bg-white shadow-md flex items-center justify-center active:scale-90 transition"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          likedSimilar.has(likedKey)
                            ? 'fill-red-500 text-red-500'
                            : 'text-gray-700'
                        }`}
                      />
                    </button>
                    <div className="aspect-square bg-[#f7f7f7]">
                      <img src={NO_IMAGE} alt={item.title} className="w-full h-full object-contain" />
                    </div>
                    <div className="p-3">
                      <h4 className="text-sm font-semibold truncate">{item.title}</h4>
                      <p className="text-xs text-gray-600 mt-1">{item.condition}</p>
                      <p className="text-base font-bold text-[#000000] mt-1">{item.price}</p>
                      {isNew && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-gray-700">
                          <Truck className="w-3 h-3" />
                          <span>무료 배송</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => document.getElementById(section.scrollId)?.scrollBy({ left: -400, behavior: 'smooth' })}
              aria-label="이전"
              className="absolute left-0 top-1/2 mt-4 w-10 h-10 rounded-full bg-white shadow-md hover:shadow-lg active:scale-90 flex items-center justify-center opacity-0 group-hover/sec:opacity-100 transition-all duration-200 z-10"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={() => document.getElementById(section.scrollId)?.scrollBy({ left: 400, behavior: 'smooth' })}
              aria-label="다음"
              className="absolute right-0 top-1/2 mt-4 w-10 h-10 rounded-full bg-white shadow-md hover:shadow-lg active:scale-90 flex items-center justify-center opacity-0 group-hover/sec:opacity-100 transition-all duration-200 z-10"
            >
              <ChevronRight className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        ))}
      </main>
  );
}
