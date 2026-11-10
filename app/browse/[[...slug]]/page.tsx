'use client';
// ============================================================================
// app/browse/[[...slug]]/page.tsx — 매물 탐색 경로
// ----------------------------------------------------------------------------
// "옵셔널 캐치올" 라우트라 아래 URL을 모두 이 한 파일이 처리합니다:
//   /browse                  → 전체
//   /browse/amps             → 대분류=앰프
//   /browse/amps/preamp      → 앰프 > 프리앰프 (하위 카테고리 1개. 2개 이상은 ?sub=a&sub=b)
// 필터, 정렬, 하위 카테고리는 주소에 저장(browse-url.ts). 둘러보기 안에서 바꾸면 history.replaceState 로 주소만 바꿈
//   Next 14 에서 replaceState 뒤 useParams 는 예전 값 그대로라(2026-11-10 확인) 경로는 usePathname 으로 읽음
// 홈 조건 검색, 홈 '모두 보기'도 같은 쓰기 함수(browseHref)로 만든 주소로 들어옴
// ============================================================================

import { Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { BrowsePage } from '@/app/components/browse-page';
import { browseHref, parseBrowsePath } from '@/app/components/browse-url';

function BrowseInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { category, pathSub } = parseBrowsePath(pathname);
  const search = searchParams.toString();
  // 검색어(?q) — 홈 메인 검색이나 둘러보기 검색 칸에서
  const searchQuery = searchParams.get('q') ?? undefined;

  return (
    <BrowsePage
      category={category}
      pathSub={pathSub}
      search={search}
      urlKey={search ? `${pathname}?${search}` : pathname}
      searchQuery={searchQuery}
      // 둘러보기 안에서 다시 검색 — 대분류는 유지, 필터와 하위 카테고리는 풂, 기록 쌓음(push)
      onSearch={(q) => router.push(browseHref(category, {}, new URLSearchParams([['q', q]])))}
    />
  );
}

// useSearchParams는 Suspense 경계가 필요 (sell/upload 라우트와 동일 패턴)
export default function BrowseRoute() {
  return (
    <Suspense fallback={null}>
      <BrowseInner />
    </Suspense>
  );
}
