'use client';
// ============================================================================
// listing-grid.tsx — 매물 카드 그리드 (검색 결과 카드 목록)
// ----------------------------------------------------------------------------
// browse-page.tsx에서 분리. 필터링된 매물 목록을 카드 격자로 그려줌.
//   - 매물이 없으면 "조건에 맞는 매물이 없습니다" 안내 표시
//   - 각 카드: 이미지(+찜 하트) / 브랜드 / 모델 / 연도·카테고리 / 가격 / 상태·지역
// 부모(browse-page)가 데이터와 동작(클릭/찜)을 props로 내려줌 → 이 컴포넌트는
// "받은 걸 보여주기"만 하는 순수 표시용 컴포넌트.
// ============================================================================

import type { MouseEvent } from 'react';
import { Heart } from 'lucide-react';
import { Listing, fmtPrice } from './browse-filters';

export function ListingGrid({
  listings,      // 화면에 보여줄 매물 목록 (이미 필터·정렬 끝난 상태)
  liked,         // 찜한 매물 id 집합
  onToggleLike,  // 하트 클릭 시 호출 (찜 토글)
  onSelect       // 카드 클릭 시 호출 (상세 페이지로 이동)
}: {
  listings: Listing[];
  liked: Set<string>;
  onToggleLike: (id: string, e: MouseEvent) => void;
  onSelect: (id: string) => void;
}) {
  // 결과가 하나도 없을 때
  if (listings.length === 0) {
    return (
      <div className="bg-[#f7f7f7] border border-[#e0e0e0] rounded-lg py-16 text-center text-gray-500">
        조건에 맞는 매물이 없습니다. 필터를 조정해보세요.
      </div>
    );
  }

  // 결과가 있을 때: 반응형 격자(모바일 2열 → 데스크톱 4열)로 카드 나열
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {listings.map((l) => (
        <button
          key={l.id}
          onClick={() => onSelect(l.id)}
          className="group text-left bg-white border border-[#e0e0e0] rounded-lg overflow-hidden hover:border-[#000000] hover:shadow-md transition"
        >
          <div className="relative aspect-square bg-[#f7f7f7] flex items-center justify-center">
            <img
              src="/images/no-image.png"
              alt={`${l.brand} ${l.model}`}
              className="w-full h-full object-contain opacity-70"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
            <span className="absolute text-xs text-gray-400">이미지 없음</span>
            <button
              onClick={(e) => onToggleLike(l.id, e)}
              className="absolute top-2 right-2 w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-sm"
              aria-label="찜하기"
            >
              <Heart
                className={`w-4 h-4 ${liked.has(l.id) ? 'fill-[#000000] text-[#000000]' : 'text-gray-500'}`}
              />
            </button>
          </div>
          <div className="p-3">
            <p className="text-xs text-gray-500 mb-1">{l.brand}</p>
            <h3 className="text-sm font-semibold text-[#000000] line-clamp-1 group-hover:text-[#000000] transition">
              {l.model}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{l.year} · {l.category}</p>
            <p className="text-base font-bold text-[#000000] mt-2">{fmtPrice(l.price)}</p>
            <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
              <span>{l.condition}</span>
              <span>{l.location}</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
