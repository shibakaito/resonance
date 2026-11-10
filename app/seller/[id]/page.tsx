// ============================================================================
// app/seller/[id]/page.tsx — 판매자 페이지 경로 (/seller/<id>)
// ----------------------------------------------------------------------------
// FEATURE_FLAGS.seller 가 꺼져 있으면 404 (notFound). 켜져 있으면 SellerPage(클라이언트)가 판매자, 매물, 리뷰를 불러옴
// 판매자 데이터는 아직 표본뿐 (데이터 모양 src/lib/sellers.ts, 표본 src/app/data/samples/seller.ts, 표본 주소 /seller/sample)
// ============================================================================
import { notFound } from 'next/navigation';
import { FEATURE_FLAGS } from '@/app/data/feature-flags'; // 숨김 플래그 (docs/hidden.md)
import { SellerPage } from '@/app/components/seller-page';

export default function SellerRoute({ params }: { params: { id: string } }) {
  if (!FEATURE_FLAGS.seller) notFound();
  return <SellerPage id={params.id} />;
}
