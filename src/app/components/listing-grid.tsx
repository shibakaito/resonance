'use client';
// ============================================================================
// listing-grid.tsx — 둘러보기 결과 카드 격자
// ----------------------------------------------------------------------------
// 2026-11-10 시안: 홈과 같은 공통 Card(ui/card.tsx) — 사진 1:1, 사진 없으면 '사진 없음', 찜 32, 상태 배지, 제목 2줄, 가격
//   카드 전체가 상세 링크(제목 링크가 카드를 덮음)라 링크 안 버튼(중첩) 없음. 찜은 링크 밖 버튼이라 눌러도 상세로 안 넘어감
//   격자: 좁은 화면 2열 → 3열 → 넓은 화면 4열(결과 폭 4등분, 사이 16)
// 빈 결과, 불러오는 중, '더 보기'는 browse-page.tsx 가 그림 (이 컴포넌트는 받은 매물만 그림)
// ============================================================================

import { Listing, fmtPrice } from './browse-filters';
import { ConditionBadge } from './condition-badge';
import { Card } from './ui/card';

export function ListingGrid({
  listings,      // 화면에 보여줄 매물 목록 (이미 필터, 정렬, 장 수 자르기 끝난 상태)
  liked,         // 찜한 매물 id 집합
  onToggleLike,  // 하트 누르면 (찜 토글)
}: {
  listings: Listing[];
  liked: Set<string>;
  onToggleLike: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {listings.map((l) => (
        <Card
          key={l.id}
          href={`/listing/${l.id}`}
          image={l.images?.[0]}
          imageAlt={`${l.brand} ${l.model}`}
          badge={<ConditionBadge listing={l} className="" />}
          title={`${l.brand} ${l.model}`}
          price={fmtPrice(l.price, l.currency)}
          liked={liked.has(l.id)}
          onToggleLike={() => onToggleLike(l.id)}
        />
      ))}
    </div>
  );
}
