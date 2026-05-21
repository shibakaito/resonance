'use client';
// ============================================================================
// app/sell/page.tsx — 판매 검색 경로 ("/sell")
// ----------------------------------------------------------------------------
// ListingSearchPage(판매할 모델 검색)를 렌더. 사용자가 모델을 고르면
// 그 정보를 URL 쿼리로 담아 /sell/upload 로 이동합니다.
// (예전 App.tsx는 sellInitial 상태로 넘겼지만, Next에선 쿼리 파라미터가 깔끔)
// ============================================================================

import { useRouter } from 'next/navigation';
import { ListingSearchPage } from '@/app/components/listing-search-page';

export default function SellRoute() {
  const router = useRouter();
  return (
    <ListingSearchPage
      onSelect={(data) => {
        const params = new URLSearchParams();
        Object.entries(data).forEach(([key, value]) => {
          if (value) params.set(key, String(value));
        });
        const qs = params.toString();
        router.push(qs ? `/sell/upload?${qs}` : '/sell/upload');
      }}
    />
  );
}
