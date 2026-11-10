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
import { emptyFilters } from '@/app/components/browse-filters';
import { browseHref } from '@/app/components/browse-url';

export default function Page() {
  const router = useRouter();

  return (
    <HomePage
      // 매물 카드는 링크(/listing/id)라 여기서 이동을 넘기지 않음 (2026-11-10 홈 시안, ui/card.tsx)
      // 카테고리 탐색 → /browse/{영문 슬러그}. 조건 검색이면 상태, 외관, 작동, 브랜드, 모델(과 지역)을 필터에 넣어
      //   둘러보기와 같은 쓰기 함수(browse-url.ts browseHref)로 주소를 만듦 (?condition=used&brand=… — 예전 주소와 같은 키)
      onBrowse={(cat, conds) => {
        const f = emptyFilters();
        if (conds?.condition) f.condition.add(conds.condition);
        if (conds?.appearance) f.appearance.add(conds.appearance);
        if (conds?.working) f.working.add(conds.working);
        if (conds?.brand) f.brand.add(conds.brand);
        if (conds?.model) f.model.add(conds.model);
        if (conds?.locCountry) f.locationCountry.add(conds.locCountry);
        if (conds?.region) f.region.add(conds.region);
        router.push(browseHref(cat, { filters: f }));
      }}
      // 판매하기 → /sell (판매 페이지는 다음 단계에서 추가됨)
      onSell={() => router.push('/sell')}
      // 메인 검색 → /browse?q=검색어 (browse가 ?q를 읽어 매물 검색)
      onSearch={(q) => router.push(`/browse?q=${encodeURIComponent(q)}`)}
    />
  );
}
