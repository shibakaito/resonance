'use client';
// ============================================================================
// app/page.tsx — 홈 경로("/")
// ----------------------------------------------------------------------------
// 기존 home-page.tsx(HomePage)를 그대로 렌더하고, HomePage가 요구하는 콜백
// (상품 보기/카테고리 탐색/판매)을 Next 라우터 이동으로 연결해 줍니다.
// HomePage가 클라이언트 컴포넌트라 콜백을 넘기는 이 페이지도 'use client'.
//
// 참고: home-page에는 react-slick 캐러셀이 없어 dynamic(ssr:false)이 불필요.
//       react-slick은 상품 상세(PDP) 화면에 있으므로 그 단계에서 처리 예정.
// ============================================================================

import { useRouter } from 'next/navigation';
import { HomePage } from '@/app/components/home-page';
import { categorySlug } from '@/app/data/category-slugs';

export default function Page() {
  const router = useRouter();

  return (
    <HomePage
      // 상품 카드 클릭 → 그 매물의 실제 id로 상세 페이지 이동
      onViewItem={(id) => router.push(`/listing/${id}`)}
      // 카테고리 탐색 → /browse/{영문 슬러그}
      onBrowse={(cat) => {
        const slug = categorySlug(cat);
        router.push(slug ? `/browse/${slug}` : '/browse');
      }}
      // 판매하기 → /sell (판매 페이지는 다음 단계에서 추가됨)
      onSell={() => router.push('/sell')}
      // 메인 검색 → /browse?q=검색어 (browse가 ?q를 읽어 매물 검색)
      onSearch={(q) => router.push(`/browse?q=${encodeURIComponent(q)}`)}
    />
  );
}
