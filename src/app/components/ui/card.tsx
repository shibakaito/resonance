'use client';
// ============================================================================
// ui/card.tsx — 매물 카드 (2026-11-10 디자인 3a, 토큰 6개만 — 페이지에는 3b 에서 붙임)
// ----------------------------------------------------------------------------
// 이미지는 1:1 비율 고정 + width/height 지정(불러오는 동안 화면 밀림 없음), 화면 밖이면 나중에 불러옴(loading="lazy")
// 제목, 보조 줄(연도, 카테고리 등), 가격, 배지(예: ConditionBadge), 찜 하트(아이콘 버튼, aria-label, aria-pressed)
// size: md = 둘러보기, 홈 / sm = 상세의 비슷한 매물. border-line 1px, 각진 모서리, 그림자 없음
// 카드 전체가 링크(<a>) — 새 탭 열기(Cmd+클릭)가 됨. 찜 버튼은 링크 밖(겹쳐 놓음)이라 눌러도 이동 안 함
// ============================================================================
import * as React from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { Button } from './button';

const NO_IMAGE = '/images/no-image.png';
const IMG_PX = { md: 480, sm: 240 } as const; // width/height 속성 (1:1)

export function Card({
  href,
  image,
  imageAlt,
  title,
  meta,
  price,
  badge,
  liked,
  onToggleLike,
  size = 'md',
  className = '',
}: {
  href: string;
  image?: string;            // 없으면 '이미지 없음' 그림
  imageAlt: string;          // 예: 'Accuphase E-380'
  title: React.ReactNode;    // 예: 브랜드 + 모델
  meta?: React.ReactNode;    // 예: '2019 · 인티앰프'
  price: React.ReactNode;    // 예: fmtPrice(...)
  badge?: React.ReactNode;   // 예: <ConditionBadge … />
  liked?: boolean;           // 찜 상태 (있으면 하트 버튼 표시)
  onToggleLike?: () => void;
  size?: 'md' | 'sm';
  className?: string;
}) {
  const px = IMG_PX[size];
  return (
    <article className={`relative border border-line bg-bg rounded-none ${className}`}>
      <Link href={href} className="block">
        <img
          src={image || NO_IMAGE}
          alt={imageAlt}
          width={px}
          height={px}
          loading="lazy"
          onError={(e) => {
            const img = e.currentTarget;
            img.onerror = null;
            img.src = NO_IMAGE;
          }}
          className="block aspect-square h-auto w-full bg-surface object-contain"
        />
        <div className={size === 'sm' ? 'p-2' : 'p-3'}>
          {badge && <div className="mb-1">{badge}</div>}
          <h3 className={`line-clamp-1 font-bold text-fg ${size === 'sm' ? 'text-12' : 'text-14'}`}>{title}</h3>
          {meta && <p className="line-clamp-1 text-12 text-muted">{meta}</p>}
          <p className={`mt-1 font-bold text-fg ${size === 'sm' ? 'text-14' : 'text-16'}`}>{price}</p>
        </div>
      </Link>
      {onToggleLike && (
        <Button
          iconOnly
          size="sm"
          aria-label={liked ? '찜 해제' : '찜하기'}
          aria-pressed={!!liked}
          onClick={onToggleLike}
          className="absolute right-2 top-2"
        >
          <Heart aria-hidden className={`h-4 w-4 ${liked ? 'fill-fg' : ''}`} />
        </Button>
      )}
    </article>
  );
}
