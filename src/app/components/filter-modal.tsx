'use client';
// ============================================================================
// filter-modal.tsx — 좁은 화면 필터 대화상자 (사이드바가 숨는 폭에서 '필터' 단추로 엶)
// ----------------------------------------------------------------------------
// 2026-11-10 시안: 공통 Dialog(ui/dialog.tsx, Radix) — role=dialog, Esc 로 닫기, 포커스 가두기, 배경 누르면 닫기
//   안의 묶음은 사이드바와 같은 FilterPanel(같은 부품, 같은 순서, 기본 펼침 5개)
//   고르는 동안은 초안(draft)에만 반영하고, 아래 '적용하기 (N건)' primary 폭 100% 를 눌러야 둘러보기에 반영
//   걸린 초안 필터가 있으면 맨 위 줄에 '전체 해제'(사이드바 제목 줄과 같은 모양)
// 보이는 칸 규칙(filterVisibility), 사라진 칸 값 비우기(pruneHiddenFilters), 결과 수(applyFilters)는 browse-filters.ts 그대로
// ============================================================================

import { useMemo, useState } from 'react';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { FilterPanel } from './filter-panel';
import {
  applyFilters,
  cloneFilters,
  countFilters,
  emptyFilters,
  filterVisibility,
  pruneHiddenFilters,
  type Counts,
  type Filters,
  type Listing,
} from './browse-filters';

// 열 때마다 새로 만들어짐(부르는 쪽이 열린 동안만 그림) → 초안은 늘 지금 둘러보기 필터에서 시작
export function FilterModal({
  filters,
  subCategories,
  category,
  counts,
  categoryOptions,
  brandOptions,
  listings,
  onApply,
  onClose,
}: {
  filters: Filters;                    // 지금 둘러보기에 걸린 필터
  subCategories: Set<string>;          // 지금 고른 하위 카테고리
  category: string | null;             // 대분류 한글 — filterVisibility 에 넣음
  counts: Counts;                      // 선택지 옆 개수 (둘러보기와 같은 값)
  categoryOptions: readonly string[];  // 카테고리 묶음 선택지 (사이드바와 같음)
  brandOptions: readonly string[];
  listings: Listing[];                 // 대분류까지 거른 매물 (하위 카테고리, 필터 적용 전) — '적용하기 (N건)' 계산용
  onApply: (next: Filters, subCategories: Set<string>) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Filters>(() => cloneFilters(filters));
  const [draftSubs, setDraftSubs] = useState<Set<string>>(() => new Set(subCategories));
  const draftVis = useMemo(() => filterVisibility(category, draftSubs), [category, draftSubs]);

  // 하위 카테고리를 바꾸면 사라지는 칸의 값도 같이 비움 — 사이드바와 같은 규칙
  const toggleSub = (v: string) => {
    const next = new Set(draftSubs);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    setDraftSubs(next);
    setDraft((d) => pruneHiddenFilters(d, filterVisibility(category, next)));
  };

  // 지금 초안으로 거른 결과 수
  const previewCount = useMemo(() => {
    const base = draftSubs.size > 0 ? listings.filter((l) => l.categories.some((c) => draftSubs.has(c))) : listings;
    return applyFilters(base, draft, draftVis).length;
  }, [listings, draft, draftSubs, draftVis]);

  const hasAny = countFilters(draft) > 0 || draftSubs.size > 0;
  const reset = () => {
    setDraft(emptyFilters());
    setDraftSubs(new Set());
  };
  const apply = () => {
    onApply(draft, draftSubs);
    onClose();
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      title="필터"
      footer={
        <Button variant="primary" onClick={apply} className="w-full">
          적용하기 ({previewCount.toLocaleString('ko-KR')}건)
        </Button>
      }
    >
      {hasAny && (
        <div className="flex h-10 items-center justify-end border-b border-line">
          <button type="button" onClick={reset} className="text-14 font-medium text-fg underline">
            전체 해제
          </button>
        </div>
      )}
      <FilterPanel
        vis={draftVis}
        filters={draft}
        setFilters={setDraft}
        subCategories={draftSubs}
        onToggleSub={toggleSub}
        categoryOptions={categoryOptions}
        counts={counts}
        brandOptions={brandOptions}
      />
    </Dialog>
  );
}
