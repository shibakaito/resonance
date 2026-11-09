// ============================================================================
// condition-badge.tsx — 매물 상태 배지 (홈 카드, 둘러보기 카드, 상세 머리가 같이 씀)
// ----------------------------------------------------------------------------
// 글자는 browse-filters.ts conditionBadge 한 함수가 정함:
//   새상품, 미개봉, NOS = 그 이름 / 중고 = 외관 등급 라벨(비어 있으면 '중고')
//   작동 상태가 점검 필요나 수리 필요면 배지 옆에 작은 경고 글자(각진 테두리)
// className = 배지 글자 모양(카드마다 다름). 경고 모양은 여기 하나
// ============================================================================
import { conditionBadge, type Listing } from './browse-filters';

export function ConditionBadge({ listing, className = '' }: { listing: Pick<Listing, 'condition' | 'appearance' | 'working'>; className?: string }) {
  const { text, warn } = conditionBadge(listing);
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      <span className={className}>{text}</span>
      {warn && (
        <span className="px-1 py-px border border-danger text-danger text-12 leading-tight font-bold rounded-none whitespace-nowrap">
          {warn}
        </span>
      )}
    </span>
  );
}
