// ============================================================================
// seller-box.tsx — 판매자 칸(상세 오른쪽 메타 아래)과 판매자 공용 조각 (2026-11-10 상세 시안, FEATURE_FLAGS.seller)
// ----------------------------------------------------------------------------
// Stars: 별 5개(평점 반올림만큼 fg 채움, 나머지 line 선). 화면 읽기는 '별점 5점 만점에 N점'
// SellerAvatar: 정사각 surface 칸에 이름 첫 글자 (48 = 상세 판매자 칸, 96 = 판매자 페이지)
// SellerBox: 아바타 48 + 이름 16/700(판매자 페이지 링크) + 별 14와 평점 14/500과 '리뷰 N' muted + '지역, 가입 연도' muted
//   아래 12에 '판매자 페이지 →'(14/500). 값은 전부 Seller 에서 (src/lib/sellers.ts). 가짜 값 없음
// ============================================================================
import Link from 'next/link';
import { Star } from 'lucide-react';
import { sellerMetaText, type Seller } from '@/lib/sellers';

export function Stars({ value, className = 'h-3.5 w-3.5' }: { value: number; className?: string }) {
  const filled = Math.round(value);
  return (
    <span role="img" aria-label={`별점 5점 만점에 ${value}점`} className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} aria-hidden className={`${className} ${n <= filled ? 'fill-fg text-fg' : 'text-line'}`} />
      ))}
    </span>
  );
}

export function SellerAvatar({ name, size }: { name: string; size: 48 | 96 }) {
  return (
    <div aria-hidden className={`flex shrink-0 items-center justify-center bg-surface font-bold text-fg ${size === 96 ? 'h-24 w-24 text-32' : 'h-12 w-12 text-20'}`}>
      {name.slice(0, 1)}
    </div>
  );
}

export function SellerBox({ seller }: { seller: Seller }) {
  const href = `/seller/${seller.id}`;
  return (
    <section aria-label="판매자" className="mt-6">
      <div className="flex gap-4">
        <SellerAvatar name={seller.name} size={48} />
        <div className="min-w-0">
          <Link href={href} className="text-16 font-bold text-fg hover:underline">
            {seller.name}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-x-2">
            <Stars value={seller.rating} />
            <span className="text-14 font-medium">{seller.rating.toFixed(1)}</span>
            <span className="text-14 text-muted">리뷰 {seller.reviewCount.toLocaleString('ko-KR')}</span>
          </div>
          <p className="mt-1 text-14 text-muted">{sellerMetaText(seller)}</p>
        </div>
      </div>
      <Link href={href} className="mt-3 inline-flex text-14 font-medium text-fg hover:underline">
        판매자 페이지 →
      </Link>
    </section>
  );
}
