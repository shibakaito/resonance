'use client';
// ============================================================================
// seller-page.tsx — 판매자 페이지 (/seller/[id], FEATURE_FLAGS.seller 꺼지면 app/seller/[id]/page.tsx 가 404)
// ----------------------------------------------------------------------------
// 2026-11-10 상세 시안, 형식만. 값은 전부 src/lib/sellers.ts 함수에서 (지금은 표본). 페이지 코드에 가짜 값 없음
//   폭 1280. 위 32에 경로 '홈 › 판매자' → 24 → 프로필: 아바타 96, 이름 24/700, 별과 평점, '지역, 가입 연도', 소개 글(최대 560)
//     오른쪽: 메시지 보내기 primary 168(FEATURE_FLAGS.messaging) + 관심 판매자 secondary 168
//   → 32 → 숫자 네 칸(판매 중, 거래 완료, 리뷰, 평균 답장: 20/700 + 14 muted, 위아래 선, 안 16)
//   → 32 → 탭 셋(판매 중, 거래 완료, 리뷰: 홈 카테고리 탭과 같은 모양) → 16 →
//     판매 중, 거래 완료 = 공통 Card 4열 / 리뷰 = 폭 720 목록(별 5개와 오른쪽 날짜, 글 16, '김**'과 '구매 매물: 제목')
//     리뷰는 5건씩, 남으면 '리뷰 더 보기 (남은 수)'
// ============================================================================

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Heart } from 'lucide-react';
import { fmtDate, fmtPrice, type Listing } from './browse-filters';
import { fetchSeller, fetchSellerListings, fetchSellerReviews, maskName, replyText, sellerMetaText, type Review, type Seller } from '@/lib/sellers';
import { FEATURE_FLAGS } from '@/app/data/feature-flags'; // 숨김 플래그 (docs/hidden.md)
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Container } from './ui/container'; // 페이지 겉틀 (헤더, 푸터와 좌우 끝이 같음)
import { ConditionBadge } from './condition-badge';
import { SellerAvatar, Stars } from './seller-box';

const REVIEW_STEP = 5; // 리뷰를 한 번에 보여 주는 수
type Tab = 'active' | 'sold' | 'reviews';
const TABS: [Tab, string][] = [
  ['active', '판매 중'],
  ['sold', '거래 완료'],
  ['reviews', '리뷰'],
];

export function SellerPage({ id }: { id: string }) {
  const [seller, setSeller] = useState<Seller | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [lists, setLists] = useState<{ active: Listing[]; sold: Listing[] }>({ active: [], sold: [] });
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const s = await fetchSeller(id);
        if (!active) return;
        if (!s) {
          setLoadState('missing');
          return;
        }
        setSeller(s);
        setLoadState('ready');
        const [r, l] = await Promise.all([fetchSellerReviews(s.id), fetchSellerListings(s.id)]);
        if (!active) return;
        setReviews(r);
        setLists(l);
      } catch (err) {
        console.error('판매자 불러오기 실패:', err);
        if (active) setLoadState('error');
      }
    })();
    return () => { active = false; };
  }, [id]);

  const [tab, setTab] = useState<Tab>('active');
  const [reviewShown, setReviewShown] = useState(REVIEW_STEP);
  const [saved, setSaved] = useState(false); // 관심 판매자 — 이 화면 안에서만 (저장 안 함)
  const [liked, setLiked] = useState<Set<string>>(new Set()); // 카드 찜 — 이 화면 안에서만
  const toggleLike = (lid: string) =>
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(lid)) next.delete(lid);
      else next.add(lid);
      return next;
    });

  if (!seller) {
    return (
      <Container as="main" className="pt-8">
        <p role="status" className="text-14 text-muted">
          {loadState === 'loading' ? '불러오는 중…' : loadState === 'missing' ? '판매자를 찾을 수 없어요.' : '판매자를 불러오지 못했어요.'}
        </p>
      </Container>
    );
  }

  const stats: [string, string][] = [
    ['판매 중', lists.active.length.toLocaleString('ko-KR')],
    ['거래 완료', lists.sold.length.toLocaleString('ko-KR')],
    ['리뷰', seller.reviewCount.toLocaleString('ko-KR')],
    ['평균 답장', replyText(seller.replyHours)],
  ];
  const tabList = tab === 'active' ? lists.active : lists.sold;
  const remainingReviews = Math.max(0, reviews.length - reviewShown);

  return (
    <Container as="main" className="pt-8">
      {/* 경로 — 홈 › 판매자 */}
      <nav aria-label="경로">
        <ol className="flex flex-wrap items-center gap-1 text-14 text-muted">
          <li>
            <Link href="/" className="hover:text-fg">
              홈
            </Link>
          </li>
          <li className="flex items-center gap-1">
            <ChevronRight aria-hidden className="h-4 w-4" />
            <span aria-current="page">판매자</span>
          </li>
        </ol>
      </nav>

      {/* 프로필 + 오른쪽 버튼 */}
      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-6">
          <SellerAvatar name={seller.name} size={96} />
          <div className="min-w-0">
            <h1 className="text-24 font-bold">{seller.name}</h1>
            <div className="mt-2 flex items-center gap-2">
              <Stars value={seller.rating} className="h-4 w-4" />
              <span className="text-14 font-medium">{seller.rating.toFixed(1)}</span>
            </div>
            <p className="mt-1 text-14 text-muted">{sellerMetaText(seller)}</p>
            {seller.intro && <p className="mt-3 max-w-140 break-words text-16">{seller.intro}</p>}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {/* 메시지 — FEATURE_FLAGS.messaging 꺼지면 안 보임 */}
          {FEATURE_FLAGS.messaging && (
            <Button variant="primary" className="w-42">
              메시지 보내기
            </Button>
          )}
          <Button variant="secondary" aria-pressed={saved} onClick={() => setSaved((v) => !v)} className="w-42">
            <Heart aria-hidden className={`h-4 w-4 ${saved ? 'fill-fg' : ''}`} />
            관심 판매자
          </Button>
        </div>
      </div>

      {/* 숫자 네 칸 — 값 20/700 위, 이름 14 muted 아래 */}
      <dl className="mt-8 grid grid-cols-2 gap-y-4 border-y border-line py-4 sm:grid-cols-4">
        {stats.map(([k, v]) => (
          <div key={k} className="flex flex-col-reverse">
            <dt className="text-14 text-muted">{k}</dt>
            <dd className="text-20 font-bold">{v}</dd>
          </div>
        ))}
      </dl>

      {/* 탭 — 홈 인기 카테고리 탭과 같은 모양(고른 것 fg 채움, 나머지 line 선) */}
      <div className="mt-8 flex flex-wrap gap-2">
        {TABS.map(([k, name]) => (
          <Button key={k} aria-pressed={tab === k} variant={tab === k ? 'primary' : 'line'} noHover onClick={() => setTab(k)} className="min-w-30 px-6">
            {name}
          </Button>
        ))}
      </div>

      <div className="mt-4">
        {tab === 'reviews' ? (
          reviews.length === 0 ? (
            <p className="border border-line bg-surface py-12 text-center text-14 text-muted">아직 리뷰가 없어요.</p>
          ) : (
            <>
              <ul className="max-w-180">
                {reviews.slice(0, reviewShown).map((r) => (
                  <li key={r.id} className="border-b border-line py-4">
                    <div className="flex items-center justify-between gap-4">
                      <Stars value={r.rating} />
                      <span className="text-14 text-muted">{fmtDate(r.createdAt)}</span>
                    </div>
                    <p className="mt-2 break-words text-16">{r.text}</p>
                    <p className="mt-2 text-14 text-muted">
                      {maskName(r.buyerName)}
                      <span className="ml-3">구매 매물: {r.listingTitle}</span>
                    </p>
                  </li>
                ))}
              </ul>
              {remainingReviews > 0 && (
                <button
                  type="button"
                  onClick={() => setReviewShown((n) => n + REVIEW_STEP)}
                  className="mt-2 inline-flex h-10 items-center gap-1 text-14 font-medium text-fg hover:underline"
                >
                  리뷰 더 보기 ({remainingReviews})
                  <ChevronDown aria-hidden className="h-4 w-4" />
                </button>
              )}
            </>
          )
        ) : tabList.length === 0 ? (
          <p className="border border-line bg-surface py-12 text-center text-14 text-muted">
            {tab === 'active' ? '판매 중인 매물이 없어요.' : '거래 완료한 매물이 없어요.'}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {tabList.map((l) => (
              <Card
                key={l.id}
                href={`/listing/${l.id}`}
                image={l.images?.[0]}
                imageAlt={`${l.brand} ${l.model}`}
                badge={<ConditionBadge listing={l} className="" />}
                title={`${l.brand} ${l.model}`}
                price={fmtPrice(l.price, l.currency)}
                liked={liked.has(l.id)}
                onToggleLike={() => toggleLike(l.id)}
              />
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}
