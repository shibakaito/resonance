'use client';
// ============================================================================
// app/listing/[id]/page.tsx — 상품 상세(PDP) 경로 (/listing/1 등)
// ----------------------------------------------------------------------------
// ListingDetail을 next/dynamic 으로 ssr:false 로드합니다.
//   - react-slick(이미지 캐러셀)이 서버에서 렌더되지 않게 함 → SSR 문제 회피
//   - ssr:false 는 클라이언트 컴포넌트에서만 쓸 수 있어 이 페이지는 'use client'
// (지금은 id에 상관없이 같은 샘플 상세를 보여줌. 실제 데이터 연결은 백엔드 단계에서.)
// ============================================================================

import dynamic from 'next/dynamic';

const ListingDetail = dynamic(
  () => import('@/app/components/listing-detail').then((m) => m.ListingDetail),
  { ssr: false }
);

export default function ListingRoute() {
  return <ListingDetail />;
}
