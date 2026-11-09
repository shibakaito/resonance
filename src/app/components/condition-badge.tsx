// ============================================================================
// condition-badge.tsx — 매물 상태 배지 (홈 카드, 둘러보기 카드, 상세 머리가 같이 씀)
// ----------------------------------------------------------------------------
// 글자는 browse-filters.ts conditionBadge 한 함수가 정함:
//   새상품, 미개봉, NOS = 그 이름 / 중고 = 외관 등급 라벨(비어 있으면 '중고')
//   작동 상태가 점검 필요나 수리 필요면 옆에 경고 배지
// 모양은 공통 부품 ui/badge.tsx (2026-11-10 디자인 3a): className 을 주면 상태 글자도 outline 배지로(홈, 상세),
//   안 주면 글자만(둘러보기 카드). 경고는 늘 danger 배지
// ============================================================================
import { conditionBadge, type Listing } from './browse-filters';
import { Badge } from './ui/badge';

export function ConditionBadge({ listing, className }: { listing: Pick<Listing, 'condition' | 'appearance' | 'working'>; className?: string }) {
  const { text, warn } = conditionBadge(listing);
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      {className !== undefined ? <Badge className={className}>{text}</Badge> : <span>{text}</span>}
      {warn && <Badge variant="danger">{warn}</Badge>}
    </span>
  );
}
