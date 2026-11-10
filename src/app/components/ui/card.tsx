'use client';
// ============================================================================
// ui/card.tsx — 매물 카드 (2026-11-10 3a에서 만들고 홈 시안으로 모양 확정. 토큰 6개만)
// ----------------------------------------------------------------------------
// 사진: 1:1, line 1px 선, 바탕 surface, 사진은 cover, img 에 width/height(불러오는 동안 화면 밀림 없음), 화면 밖이면 나중에 불러옴
//   사진이 없거나 깨지면 그림 파일 대신 가운데 '사진 없음'(14 muted)
// 찜: 사진 오른쪽 위 8에 32 아이콘 버튼(흰 바탕, line 선, 하트 선 16, 찜하면 채움, aria-pressed)
//   링크 바깥에 두어 링크 안 버튼(중첩) 경고가 없고, 눌러도 상세로 넘어가지 않음
// 사진 아래 16 띄우고 세로 간격 8: badge(예: ConditionBadge) / 제목(16/700, 최대 2줄, 상세 링크) / 가격(16/500)
//   제목 링크가 카드 전체를 덮어(after:inset-0) 카드 어디를 눌러도 상세로 감. 링크는 하나라 새 탭 열기, 화면 읽기 모두 한 번
// 카드 전체 테두리, 그림자, 둥근 모서리, 애니메이션 없음
// compact: 좁은 줄용(사진 width/height 240, 제목과 가격 14). 아직 쓰는 곳 없음
// ============================================================================
import * as React from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { Button } from './button';

export function Card({
  href,
  image,
  imageAlt,
  badge,
  title,
  price,
  liked,
  onToggleLike,
  compact = false,
  className = '',
}: {
  href: string;              // 상세 주소 (예: /listing/{id})
  image?: string;            // 없거나 깨지면 '사진 없음' 글자
  imageAlt: string;          // 예: 'Accuphase E-380'
  badge?: React.ReactNode;   // 제목 위 (예: <ConditionBadge … />)
  title: React.ReactNode;    // 예: 브랜드 + 모델
  price: React.ReactNode;    // 예: fmtPrice(...) → '₩4,200,000'
  liked?: boolean;           // 찜 상태
  onToggleLike?: () => void; // 있으면 찜 버튼
  compact?: boolean;
  className?: string;
}) {
  const [broken, setBroken] = React.useState(false);
  const px = compact ? 240 : 480; // width/height 속성 (1:1)
  const showImage = !!image && !broken;
  return (
    <article className={`relative ${className}`}>
      <div className="aspect-square overflow-hidden border border-line bg-surface">
        {showImage ? (
          <img
            src={image}
            alt={imageAlt}
            width={px}
            height={px}
            loading="lazy"
            onError={() => setBroken(true)}
            className="block h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-14 text-muted">사진 없음</div>
        )}
      </div>
      <div className="mt-4 flex flex-col gap-2">
        {badge && <div>{badge}</div>}
        <h3 className={`line-clamp-2 font-bold text-fg ${compact ? 'text-14' : 'text-16'}`}>
          <Link href={href} className="after:absolute after:inset-0">
            {title}
          </Link>
        </h3>
        <p className={`font-medium text-fg ${compact ? 'text-14' : 'text-16'}`}>{price}</p>
      </div>
      {onToggleLike && (
        <Button
          iconOnly
          size="sm"
          variant="line"
          aria-label="찜하기"
          aria-pressed={!!liked}
          onClick={onToggleLike}
          className="absolute right-2 top-2 z-10"
        >
          <Heart aria-hidden className={`h-4 w-4 ${liked ? 'fill-fg' : ''}`} />
        </Button>
      )}
    </article>
  );
}
