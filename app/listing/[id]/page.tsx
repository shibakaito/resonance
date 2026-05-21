'use client';
// ============================================================================
// app/listing/[id]/page.tsx — 상품 상세(PDP) 경로 (/listing/<id>)
// ----------------------------------------------------------------------------
// ListingDetail을 next/dynamic 으로 ssr:false 로드합니다.
//   - react-slick(이미지 캐러셀)이 서버에서 렌더되지 않게 함 → SSR 문제 회피
//   - ssr:false 는 클라이언트 컴포넌트에서만 쓸 수 있어 이 페이지는 'use client'
// URL의 [id]를 읽어 ListingDetail로 넘기면, 그 id로 Supabase에서 매물을 불러옴.
// ============================================================================

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

const ListingDetail = dynamic(
  () => import('@/app/components/listing-detail').then((m) => m.ListingDetail),
  { ssr: false }
);

export default function ListingRoute() {
  const params = useParams();
  const id = params.id as string;
  return <ListingDetail id={id} />;
}
