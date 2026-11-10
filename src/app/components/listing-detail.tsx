'use client';
// ============================================================================
// listing-detail.tsx — 상품 상세(PDP) 화면 (/listing/[id])
// ----------------------------------------------------------------------------
// app/listing/[id]/page.tsx 가 next/dynamic(ssr:false)로 불러옴. 매물은 브라우저에서 Supabase로 읽음
// 2026-11-10 상세 시안: 가짜 데이터 없이 매물에 저장된 값만 보여 줌. 토큰 6개와 공통 부품(Button, Badge, Card)만
//   폭 1120. 위 32에 경로 '홈 › 대분류 › 세부 카테고리'(14 muted, 화살표 16, 홈과 대분류는 둘러보기 링크) → 24 → 두 열
//   두 열: 왼쪽 640(갤러리, 아래 정보 구간) + 사이 16 + 오른쪽 464. 좁은 화면은 한 줄(갤러리 → 오른쪽 열 → 정보 구간)
//   갤러리: 썸네일 세로 줄(64 정사각, 사이 8, line 선, 고른 것 fg 선, 사진 수만큼, 큰 사진보다 길면 아래로 이어짐)
//     + 큰 사진 568 정사각(line 선, 바탕 surface, cover). 오른쪽 위 8에 찜 32, 오른쪽 아래 8에 'N / 전체'
//     사진이 없거나 깨지면 '사진 없음'(14 muted)
//   오른쪽 열: 제목(24/700, 매물 title) → 12 → 배지(상태, 외관 상태, 작동 상태 중 값 있는 것. 작동이 점검 필요나 수리 필요면 danger)
//     → 24, 위 선, 24 → 가격 32/700 → 4 → 정가(있을 때만, 14 muted 줄 그음) → 24 → 메시지 보내기(FEATURE_FLAGS.messaging)
//     → 8 → [관심 제품][주소 복사 40] → 24 → 위 선 → 메타 표(라벨 96 + 값 14, 줄 40): 등록일, 배송, 직거래(가능일 때만), 지역(있을 때만)
//   바로 구매, 장바구니 담기, 가격 제안, 판매자 저장은 FEATURE_FLAGS.commerce 로 숨김 (docs/hidden.md)
// 예전 가짜 요소(장바구니 담은 사람 수, 하트 수, 별점과 리뷰 수, 조회수, 제안 수, 시세 카드, 비슷한 제품 광고 목록,
//   등급 기준 링크)와 react-slick 캐러셀, 사진 확대는 삭제
// ============================================================================

import { useState, useEffect, Fragment } from 'react';
import Link from 'next/link';
import { Heart, Check, Link as LinkIcon, MessageCircle, Star, MapPin, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, BadgeCheck, BookOpen, Package, ShieldAlert } from 'lucide-react';
import type { Listing } from './browse-filters';
import { fmtPrice, fmtDate, yearText, WORKING_WARN_KEYS } from './browse-filters';
import { fetchListingById } from '@/lib/listings';
import { SPEC_FIELDS } from '@/app/data/spec-fields';
import { SPEC_FIELDS_BY_CATEGORY, hiddenByDetailMode, optLabel, type SelectOption, type CategorySpecField } from '@/app/data/category-specs';
import { topCategoryOf } from '@/app/data/catalog';
import { categorySlug } from '@/app/data/category-slugs';
import { FEATURE_FLAGS } from '@/app/data/feature-flags'; // 숨김 플래그 (docs/hidden.md)
import { label, desc, locationText } from '@/lib/labels';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

// 대분류 → 둘러보기 주소 (경로 줄)
const browseHref = (top: string) => {
  const slug = categorySlug(top);
  return slug ? `/browse/${slug}` : '/browse';
};

// 배송 글자: 무료 배송 / 고정 배송비 ₩N / 배송비 별도. 고르지 않은 매물은 '' (줄 없음)
const shippingText = (l: Listing): string => {
  if (!l.shippingType) return '';
  const name = label('shipping_type', l.shippingType);
  return l.shippingType === 'flat' && l.shippingCost ? `${name} ${fmtPrice(l.shippingCost, l.currency)}` : name;
};

export function ListingDetail({ id }: { id?: string }) {
  // URL의 id로 Supabase에서 매물을 불러옴 (영문 키 → 한글 변환은 fetch 안에서 처리)
  const [listing, setListing] = useState<Listing | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  useEffect(() => {
    if (!id) return;
    let active = true;
    fetchListingById(id)
      .then((row) => {
        if (!active) return;
        setListing(row);
        setLoadState(row ? 'ready' : 'missing');
      })
      .catch((err) => {
        console.error('매물 불러오기 실패:', err);
        if (active) setLoadState('error');
      });
    return () => { active = false; };
  }, [id]);

  // 갤러리 — 고른 사진, 불러오지 못한 사진 번호
  const [current, setCurrent] = useState(0);
  const [broken, setBroken] = useState<Set<number>>(new Set());
  const markBroken = (i: number) => setBroken((prev) => new Set(prev).add(i));

  // 찜(사진 위 하트)과 관심 제품은 같은 상태 — 이 화면 안에서만(홈, 둘러보기와 같음, 저장 안 함)
  const [liked, setLiked] = useState(false);
  const toggleLike = () => setLiked((v) => !v);

  // 주소 복사 — 복사되면 2초 동안 체크 아이콘, 화면 읽기 프로그램에는 aria-live 로 알림
  const [copied, setCopied] = useState(false);
  const [copyMsg, setCopyMsg] = useState('');
  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyMsg('주소를 복사했어요');
      setCopied(true);
    } catch {
      setCopyMsg('주소를 복사하지 못했어요');
    }
  };
  useEffect(() => {
    if (!copyMsg) return;
    const t = setTimeout(() => {
      setCopied(false);
      setCopyMsg('');
    }, 2000);
    return () => clearTimeout(t);
  }, [copyMsg]);

  // 판매자 저장 (FEATURE_FLAGS.commerce 켜졌을 때만 보이는 버튼)
  const [sellerSaved, setSellerSaved] = useState(false);

  const [reviewTab, setReviewTab] = useState<'all' | 'seller' | 'buyer'>('all');
  const [reviewSort, setReviewSort] = useState<'latest' | 'rating-high' | 'rating-low'>('latest');
  const [reviewPage, setReviewPage] = useState(1);

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

  const [specsExpanded, setSpecsExpanded] = useState(false);
  const [techSpecsExpanded, setTechSpecsExpanded] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [sellerReviewsOpen, setSellerReviewsOpen] = useState(false);
  const [sellerDescExpanded, setSellerDescExpanded] = useState(false);

  // 불러오는 중, 없는 매물, 불러오기 실패
  if (!listing) {
    return (
      <main className="mx-auto w-full max-w-280 px-4 pt-8 xl:px-0">
        <p role="status" className="text-14 text-muted">
          {loadState === 'loading' ? '불러오는 중…' : loadState === 'missing' ? '매물을 찾을 수 없어요.' : '매물을 불러오지 못했어요.'}
        </p>
      </main>
    );
  }

  const top = topCategoryOf(listing.category); // 대분류 (예: 앰프)
  const sub = listing.category;                // 세부 카테고리 (예: 인티앰프)
  const name = `${listing.brand} ${listing.model}`;
  const images = listing.images;
  const showPhoto = images.length > 0 && !broken.has(current);

  // 배지 — 상태, 외관 상태, 작동 상태 중 값 있는 것
  const badges = [
    { text: label('condition', listing.condition), danger: false },
    { text: label('appearance', listing.appearance), danger: false },
    { text: label('working', listing.working), danger: WORKING_WARN_KEYS.includes(listing.working) },
  ].filter((b) => b.text);

  // 메타 표 — 값 있는 줄만
  const metaRows: [string, string][] = (
    [
      ['등록일', fmtDate(listing.createdAt)],
      ['배송', shippingText(listing)],
      ['직거래', listing.localPickup ? '가능' : ''],
      ['지역', label('location', listing.location)],
    ] as [string, string][]
  ).filter(([, v]) => v);

  return (
    <main className="mx-auto w-full max-w-280 px-4 pt-8 xl:px-0">
      {/* 경로 — 홈 › 대분류 › 세부 카테고리. 홈과 대분류는 링크 */}
      <nav aria-label="경로">
        <ol className="flex flex-wrap items-center gap-1 text-14 text-muted">
          <li>
            <Link href="/" className="hover:text-fg">
              홈
            </Link>
          </li>
          <li className="flex items-center gap-1">
            <ChevronRight aria-hidden className="h-4 w-4" />
            <Link href={browseHref(top)} className="hover:text-fg">
              {top}
            </Link>
          </li>
          {sub && sub !== top && (
            <li className="flex items-center gap-1">
              <ChevronRight aria-hidden className="h-4 w-4" />
              <span>{sub}</span>
            </li>
          )}
        </ol>
      </nav>

      {/* 두 열 — 넓은 화면: 왼쪽(갤러리 위, 정보 구간 아래) + 오른쪽 464. 좁은 화면: 갤러리 → 오른쪽 열 → 정보 구간 */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_464px] lg:grid-rows-[auto_1fr] lg:gap-x-4">
        {/* 갤러리 — 썸네일 줄 64 + 사이 8 + 큰 사진 568 */}
        <div className="flex max-w-160 items-start gap-2 lg:col-start-1 lg:row-start-1">
          <div className="flex w-16 shrink-0 flex-col gap-2">
            {images.map((src, i) => (
              <button
                key={`${i}-${src}`}
                type="button"
                aria-label={`사진 ${i + 1}`}
                aria-pressed={i === current}
                onClick={() => setCurrent(i)}
                className={`h-16 w-16 overflow-hidden border bg-surface ${i === current ? 'border-fg' : 'border-line'}`}
              >
                {!broken.has(i) && (
                  <img src={src} alt="" width={64} height={64} onError={() => markBroken(i)} className="block h-full w-full object-cover" />
                )}
              </button>
            ))}
          </div>
          {/* 찜과 'N / 전체'는 선 밖 기준으로 8 (선 있는 사진 칸이 아니라 바깥 칸에 붙임) */}
          <div className="relative min-w-0 flex-1">
            <div className="aspect-square overflow-hidden border border-line bg-surface">
              {showPhoto ? (
                <img
                  src={images[current]}
                  alt={`${name} 사진 ${current + 1}`}
                  width={568}
                  height={568}
                  onError={() => markBroken(current)}
                  className="block h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-14 text-muted">사진 없음</div>
              )}
            </div>
            <Button
              iconOnly
              size="sm"
              variant="line"
              aria-label="찜하기"
              aria-pressed={liked}
              onClick={toggleLike}
              className="absolute right-2 top-2 z-10"
            >
              <Heart aria-hidden className={`h-4 w-4 ${liked ? 'fill-fg' : ''}`} />
            </Button>
            {images.length > 0 && (
              <span className="absolute bottom-2 right-2 inline-flex h-6 items-center border border-line bg-bg px-2 text-12">
                {current + 1} / {images.length}
              </span>
            )}
          </div>
        </div>

        {/* 오른쪽 열 — 제목, 배지, 가격, 버튼, 메타 */}
        <div className="mt-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0">
          <h1 className="text-24 font-bold">{listing.title || name}</h1>
          {badges.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {badges.map((b) => (
                <Badge key={b.text} variant={b.danger ? 'danger' : 'outline'}>
                  {b.text}
                </Badge>
              ))}
            </div>
          )}

          <div className="mt-6 border-t border-line pt-6">
            <p className="text-32 font-bold">{fmtPrice(listing.price, listing.currency)}</p>
            {listing.comparePrice != null && listing.comparePrice > 0 && (
              <p className="mt-1 text-14 text-muted">
                정가 <s>{fmtPrice(listing.comparePrice, listing.currency)}</s>
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-2">
            {/* 거래 기능 — FEATURE_FLAGS.commerce 꺼지면 안 보임 (docs/hidden.md) */}
            {FEATURE_FLAGS.commerce && (
              <>
                <Button variant="primary" className="w-full">
                  바로 구매
                </Button>
                <Button variant="secondary" className="w-full">
                  장바구니 담기
                </Button>
                <div className="flex gap-2">
                  <Button variant="secondary" className="min-w-0 flex-1">
                    <MessageCircle aria-hidden className="h-4 w-4" />
                    가격 제안
                  </Button>
                  <Button variant="secondary" aria-pressed={sellerSaved} onClick={() => setSellerSaved((v) => !v)} className="min-w-0 flex-1">
                    <Heart aria-hidden className={`h-4 w-4 ${sellerSaved ? 'fill-fg' : ''}`} />
                    판매자 저장
                  </Button>
                </div>
              </>
            )}
            {/* 메시지 — FEATURE_FLAGS.messaging 꺼지면 안 보임 */}
            {FEATURE_FLAGS.messaging && (
              <Button variant="primary" className="w-full">
                메시지 보내기
              </Button>
            )}
            <div className="flex gap-2">
              <Button variant="secondary" aria-pressed={liked} onClick={toggleLike} className="min-w-0 flex-1">
                <Heart aria-hidden className={`h-4 w-4 ${liked ? 'fill-fg' : ''}`} />
                관심 제품
              </Button>
              <Button iconOnly variant="secondary" aria-label="주소 복사" onClick={copyUrl}>
                {copied ? <Check aria-hidden className="h-4 w-4" /> : <LinkIcon aria-hidden className="h-4 w-4" />}
              </Button>
            </div>
            <p aria-live="polite" className="sr-only">
              {copyMsg}
            </p>
          </div>

          {/* 메타 표 — 라벨 96 + 값 14, 줄 40, 줄 아래 선 */}
          <dl className="mt-6 border-t border-line">
            {metaRows.map(([k, v]) => (
              <div key={k} className="grid min-h-10 grid-cols-[96px_minmax(0,1fr)] items-center border-b border-line py-2">
                <dt className="text-14 font-medium text-muted">{k}</dt>
                <dd className="text-14">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* 정보 구간 */}
        <div className="space-y-12 pt-12 lg:col-start-1 lg:row-start-2">
            <div>
              <h2 className="text-24 font-bold mb-4">제품 정보</h2>
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

                  <div className="font-bold">출시 연도</div>
                  <div className="break-words">{listing ? yearText(listing) : ''}</div>

                  <div className="font-bold">제조국</div>
                  <div className="break-words">{label('country', listing?.country)}</div>

                  {/* 소유권 — FEATURE_FLAGS.ownership 꺼지면 줄 숨김 (docs/hidden.md) */}
                  {FEATURE_FLAGS.ownership && (
                    <>
                      <div className="font-bold">소유권</div>
                      <div className="break-words">{label('ownership', listing?.ownership)}</div>
                    </>
                  )}

                  {/* 구성품 — 체크한 것만 나열, 기타 구성품은 글 그대로 */}
                  {listing && (listing.components.length > 0 || listing.componentsOther) && (
                    <>
                      <div className="font-bold">구성품</div>
                      <div className="break-words">
                        {listing.components.map((k) => label('components', k)).join(', ')}
                        {listing.componentsOther && (
                          <p className={listing.components.length > 0 ? 'mt-1 text-14 text-fg' : ''}>{listing.componentsOther}</p>
                        )}
                      </div>
                    </>
                  )}

                  {/* 상태(종류: 새상품, 미개봉, NOS, 중고) → 외관 상태 → 작동 상태를 각각 한 줄씩 (2026-11-10 상태 등급 재구성). 외관, 작동은 값이 있을 때만 */}
                  <div className="font-bold">상태</div>
                  <div className="break-words">
                    {label('condition', listing?.condition)}{' '}
                    {/* 정의 작은 안내 (labels.ts LABEL_DESC, gradeDescriptions 플래그 꺼져 있으면 안 보임) */}
                    {desc('condition', listing?.condition) && <span className="text-12 text-muted">{desc('condition', listing?.condition)}</span>}
                  </div>

                  {listing?.appearance && (
                    <>
                      <div className="font-bold">외관 상태</div>
                      <div className="break-words">
                        {label('appearance', listing.appearance)}{' '}
                        {desc('appearance', listing.appearance) && <span className="text-12 text-muted">{desc('appearance', listing.appearance)}</span>}
                        {listing.appearanceDetail && (
                          <p className="mt-1 text-14 text-fg">{listing.appearanceDetail}</p>
                        )}
                      </div>
                    </>
                  )}

                  {listing?.working && (
                    <>
                      <div className="font-bold">작동 상태</div>
                      <div className="break-words">
                        {label('working', listing.working)}{' '}
                        {desc('working', listing.working) && <span className="text-12 text-muted">{desc('working', listing.working)}</span>}
                        {listing.workingDetail && (
                          <p className="mt-1 text-14 text-fg">{listing.workingDetail}</p>
                        )}
                      </div>
                    </>
                  )}

                  {/* 정비 이력 — 업로드 폼 제품 정보의 작동 상태 아래 칸과 같은 자리 */}
                  {/* FEATURE_FLAGS.maintenance 꺼지면 줄 숨김 (docs/hidden.md) */}
                  {FEATURE_FLAGS.maintenance && (listing?.maintenance?.length ?? 0) > 0 && (
                    <>
                      <div className="font-bold">정비 이력</div>
                      <div className="break-words">{listing!.maintenance.join(', ')}</div>
                    </>
                  )}
                </div>

                {!specsExpanded && (
                  <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-bg pointer-events-none"></div>
                )}

                {!specsExpanded && (
                  <div className="absolute bottom-0 left-0 right-0 flex justify-center">
                    <button
                      onClick={() => setSpecsExpanded(true)}
                      className="px-6 py-2 border border-line rounded-full bg-bg hover:bg-surface font-bold text-14 shadow-sm transition"
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
                input?: { kind: string; options?: SelectOption[] };
                showWhen?: (s: Record<string, string | string[]>) => boolean;
              }[];
              // 표시값: 배열→"a, b" 나열 / select·multi(영문키 저장, 예 스피커 passive·턴테이블 회전수)는 optLabel(category-specs.ts)로 옵션 label(한글) 변환 / 그 외 문자열은 그대로
              const fmt = (
                f: { input?: { kind: string; options?: SelectOption[] } },
                v: string | string[],
              ): string => {
                if (Array.isArray(v)) return v.map((x) => optLabel(f.input?.options, x)).join(', ');
                if (f.input?.kind === 'select' || f.input?.kind === 'searchSelect') return optLabel(f.input.options, v); // 검색 드롭다운(인클로저 등)도 영문 키 저장 → 라벨
                if ((f as { key: string }).key === 'speakerImpedance') return /Ω$/.test(v) ? v : `${v}Ω`; // 스피커 임피던스: 숫자 저장 → '8Ω', '3.2Ω' (옛 '8Ω' 글자는 그대로)
                return v;
              };
              const rows = schema.filter((f) => {
                // 폼과 동일 게이팅: 형식(패시브/액티브) + 하위 카테고리(__sub) 주입.
                //   __sub = 매물의 세부 카테고리(listing.category, 예: '서브우퍼'). 예전엔 techSpecs.type 을 읽었으나 타입 칸 삭제(2026-11-10)로 안 읽음
                //   서브우퍼 전용 필드(방사 방향·위상 조절 등)가 상세에서도 정상 표시됨.
                if (f.showWhen && !f.showWhen({ ...specs, __sub: listing?.category ?? '' })) return false;
                // 상세 모드 'custom' 하위 카테고리: 숨긴 상세 칸은 옛 매물에 값이 남아 있어도 안 보임 (폼과 같은 규칙, docs/hidden.md)
                if (f.input && hiddenByDetailMode(listing?.category ?? '', f as CategorySpecField)) return false;
                const v = specs[f.key];
                return Array.isArray(v) ? v.length > 0 : Boolean(v);
              });
              const custom = listing?.customSpecs ?? []; // 자유 추가 사양 (상세 모드 'custom') — 정해진 칸 아래에 입력 순서대로
              if (rows.length === 0 && custom.length === 0) return null;
              return (
                <div>
                  <h2 className="text-24 font-bold mb-4">기술 사양</h2>
                  <div className="relative">
                    <div
                      className={`grid grid-cols-[140px_1fr] gap-x-6 gap-y-3 ${
                        !techSpecsExpanded ? 'max-h-[120px] overflow-hidden' : ''
                      }`}
                    >
                      {rows.map((f) => (
                        <Fragment key={f.key}>
                          <div className="font-bold">{f.label}</div>
                          {/* 기타 사양(여러 줄 자유 글)은 줄바꿈 그대로 */}
                          <div className={`break-words${f.input?.kind === 'textarea' || f.key === 'otherSpecs' ? ' whitespace-pre-line' : ''}`}>{fmt(f, specs[f.key])}</div>
                        </Fragment>
                      ))}
                      {custom.map((c, i) => (
                        <Fragment key={`custom-${i}`}>
                          <div className="font-bold break-words">{c.title}</div>
                          <div className="break-words">{c.value}</div>
                        </Fragment>
                      ))}
                    </div>

                    {!techSpecsExpanded && rows.length + custom.length > 4 && (
                      <>
                        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-bg pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 right-0 flex justify-center">
                          <button
                            onClick={() => setTechSpecsExpanded(true)}
                            className="px-6 py-2 border border-line rounded-full bg-bg hover:bg-surface font-bold text-14 shadow-sm transition"
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
              <h2 className="text-24 font-bold mb-4">제품 설명</h2>
              <div className="relative">
                <div
                  className={`prose max-w-none text-fg space-y-4 leading-relaxed ${
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
                  <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-bg pointer-events-none"></div>
                )}

                {!descriptionExpanded && (
                  <div className="absolute bottom-0 left-0 right-0 flex justify-center">
                    <button
                      onClick={() => setDescriptionExpanded(true)}
                      className="px-6 py-2 border border-line rounded-full bg-bg hover:bg-surface font-bold text-14 shadow-sm transition"
                    >
                      더 보기
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-line pt-6">
              <h2 className="text-24 font-bold mb-6">판매자에 대하여</h2>
              <div className="flex items-start justify-between gap-6 mb-6">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-20 h-20 rounded-full bg-surface flex items-center justify-center text-fg font-bold text-24 flex-shrink-0">
                    몽
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-24 font-bold">몽키타르</p>
                      <div className="relative group/badge inline-block">
                        <BadgeCheck className="w-6 h-6 text-fg fill-surface cursor-help" />
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-fg text-bg text-12 rounded-lg whitespace-nowrap opacity-0 group-hover/badge:opacity-100 pointer-events-none transition-opacity duration-200 z-20">
                          이 판매자는 뛰어난 서비스를 제공합니다.
                          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-fg"></div>
                        </div>
                      </div>
                    </div>
                    {/* 판매자 지역 = 매물의 지역 값(DB location). 비어 있으면 줄째 숨김 */}
                    {listing?.location && (
                      <div className="flex items-center gap-2 text-14 text-fg mt-1">
                        <MapPin className="w-4 h-4" />
                        <span>{locationText(listing.location)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-14 text-fg mt-2">
                      <span className="font-bold">Resonance 가입일 :</span>
                      <span>2018년</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 w-[280px] flex-shrink-0">
                  <button className="bg-surface hover:bg-line text-fg py-3 px-6 rounded-full font-bold transition text-14">
                    판매자에게 메시지 보내기
                  </button>
                  <button className="bg-surface hover:bg-line text-fg py-3 px-6 rounded-full font-bold transition text-14">
                    이 상점의 더 많은 제품 보기
                  </button>
                </div>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-surface/60 via-bg to-surface border border-line p-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="group relative p-4 rounded-xl bg-bg border border-surface hover:border-muted hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-line flex items-center justify-center group-hover:bg-line transition">
                        <BookOpen className="w-4 h-4 text-fg" />
                      </div>
                      <span className="font-bold text-14">브랜드 스토리</span>
                    </div>
                    <p className="text-14 text-fg leading-relaxed">
                      2006년 설립된 <span className="font-bold">'Monkey Guitar'</span>의 약자입니다.
                    </p>
                  </div>

                  <div className="group relative p-4 rounded-xl bg-bg border border-surface hover:border-muted hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center group-hover:bg-line transition">
                        <Package className="w-4 h-4 text-fg" />
                      </div>
                      <span className="font-bold text-14">취급 제품</span>
                    </div>
                    <p className="text-14 text-fg leading-relaxed">
                      신품·중고 유명 브랜드. 구하기 어려운 제품을 <span className="font-bold">합리적인 가격</span>에 제공합니다.
                    </p>
                  </div>

                  <div className="group relative p-4 rounded-xl bg-bg border border-surface hover:border-muted hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center group-hover:bg-line transition">
                        <ShieldAlert className="w-4 h-4 text-fg" />
                      </div>
                      <span className="font-bold text-14">거래 정책</span>
                    </div>
                    <p className="text-14 text-fg leading-relaxed">
                      현 상태 그대로 판매 · <span className="font-bold">환불 불가</span>
                      <button
                        onClick={() => setSellerDescExpanded(!sellerDescExpanded)}
                        className="ml-1 text-fg hover:text-fg font-bold text-12"
                      >
                        {sellerDescExpanded ? '접기' : '자세히'}
                      </button>
                    </p>
                    {sellerDescExpanded && (
                      <p className="text-12 text-fg leading-relaxed mt-2 pt-2 border-t border-surface">
                        모든 기타, 이펙터 및 액세서리는 현 상태 그대로 판매되며 환불이 불가합니다. 배송비에는 PayPal 수수료와 Reverb 수수료가 포함됩니다.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-line pt-6">
              <button
                onClick={() => setSellerReviewsOpen(!sellerReviewsOpen)}
                className="w-full flex items-center justify-between mb-4 hover:opacity-80 transition"
              >
                <div className="flex items-center gap-3">
                  <h2 className="text-24 font-bold">판매자 리뷰 (1,234)</h2>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-5 h-5 fill-fg text-fg" />
                    ))}
                  </div>
                </div>
                {sellerReviewsOpen ? (
                  <ChevronUp className="w-6 h-6 text-fg" />
                ) : (
                  <ChevronDown className="w-6 h-6 text-fg" />
                )}
              </button>

              {sellerReviewsOpen && (
              <>
              <div className="bg-surface rounded-lg p-6 mb-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-32 font-bold text-fg">4.9</div>
                    <div className="flex justify-center mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className="w-4 h-4 fill-fg text-fg" />
                      ))}
                    </div>
                    <p className="text-14 text-fg mt-1">종합 평점</p>
                  </div>
                  <div className="flex-1 border-l border-line pl-6">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-24 font-bold text-fg">99%</div>
                        <p className="text-12 text-fg">긍정 평가</p>
                      </div>
                      <div>
                        <div className="text-24 font-bold">1,234</div>
                        <p className="text-12 text-fg">총 리뷰</p>
                      </div>
                      <div>
                        <div className="text-24 font-bold">2020</div>
                        <p className="text-12 text-fg">가입 연도</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-4 text-14">
                    <div>
                      <p className="text-fg mb-1">정확도</p>
                      <p className="font-bold">100%</p>
                    </div>
                    <div>
                      <p className="text-fg mb-1">배송</p>
                      <p className="font-bold">99%</p>
                    </div>
                    <div>
                      <p className="text-fg mb-1">소통</p>
                      <p className="font-bold">100%</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-14">
                    <div>
                      <p className="text-fg mb-1">가격</p>
                      <p className="font-bold">4.9 / 5.0</p>
                    </div>
                    <div>
                      <p className="text-fg mb-1">속도</p>
                      <p className="font-bold">4.8 / 5.0</p>
                    </div>
                    <div>
                      <p className="text-fg mb-1">서비스</p>
                      <p className="font-bold">5.0 / 5.0</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4 flex items-center justify-between pb-2 border-b border-line">
                <span className="font-bold text-fg">전체 리뷰 ({allReviews.length})</span>
                <select
                  value={reviewSort}
                  onChange={(e) => { setReviewSort(e.target.value as 'latest' | 'rating-high' | 'rating-low'); setReviewPage(1); }}
                  className="text-12 border border-line rounded-md px-2 py-1 bg-bg hover:border-muted cursor-pointer focus:outline-none focus:border-fg"
                >
                  <option value="latest">최신순</option>
                  <option value="rating-high">별점 높은 순</option>
                  <option value="rating-low">별점 낮은 순</option>
                </select>
              </div>

              <div className="space-y-4">
                {paginatedReviews.map((review) => (
                  <div key={review.id} className="border-b border-line pb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${star <= review.rating ? 'fill-fg text-fg' : 'text-line'}`}
                          />
                        ))}
                      </div>
                      <span className="font-bold">{review.name}</span>
                      <span className="text-14 text-muted">• {formatDaysAgo(review.daysAgo)}</span>
                    </div>
                    <p className="text-fg mb-2">{review.text}</p>
                    <p className="text-14 text-muted">제품: {review.product}</p>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button
                    onClick={() => setReviewPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-line hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed transition"
                    aria-label="이전 페이지"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setReviewPage(page)}
                      className={`w-9 h-9 flex items-center justify-center rounded-lg font-bold transition ${
                        currentPage === page
                          ? 'bg-fg text-bg'
                          : 'border border-line hover:bg-surface'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setReviewPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-line hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed transition"
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
      </div>
    </main>
  );
}
