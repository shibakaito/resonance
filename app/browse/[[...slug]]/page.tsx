'use client';
// ============================================================================
// app/browse/[[...slug]]/page.tsx — 매물 탐색 경로
// ----------------------------------------------------------------------------
// "옵셔널 캐치올" 라우트라 아래 URL을 모두 이 한 파일이 처리합니다:
//   /browse                  → slug = undefined        (전체)
//   /browse/amps             → slug = ['amps']         (대분류=앰프)
//   /browse/amps/preamp      → slug = ['amps','preamp'](앰프 > 프리앰프)
// 영문 슬러그 → 한글 카테고리 변환은 category-slugs.ts의 categoryFromSlug 사용.
// (예전 App.tsx의 정규식 파싱 [1]=대분류, [2]=하위 와 동일한 규칙)
// ============================================================================

import { Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { BrowsePage } from '@/app/components/browse-page';
import { categoryFromSlug } from '@/app/data/category-slugs';

function BrowseInner() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string[] | undefined;

  // 첫 번째 슬러그 = 대분류, 두 번째 = 하위 카테고리
  const category = categoryFromSlug(slug?.[0]);
  const initialSubCategory = categoryFromSlug(slug?.[1]);
  // 검색어(?q) — 홈 메인 검색에서 넘어옴
  const searchQuery = searchParams.get('q') ?? undefined;
  // 홈 조건 검색(검색 결과 N건 보기)에서 넘어온 조건 — 필터에 체크된 채로 시작
  const initialCondition = searchParams.get('condition') ?? undefined;   // 상태 키 (new / unopened / nos / used)
  const initialAppearance = searchParams.get('appearance') ?? undefined; // 외관 키 (mint 등)
  const initialWorking = searchParams.get('working') ?? undefined;       // 작동 키 (working 등)
  const initialBrand = searchParams.get('brand') ?? undefined;
  const initialModel = searchParams.get('model') ?? undefined;
  const initialLocCountry = searchParams.get('loc_country') ?? undefined; // 위치 국가 키 (kr / jp)
  const initialRegion = searchParams.get('region') ?? undefined;          // 지역 키 (kr_seoul 등)

  return (
    <BrowsePage
      // 매물 카드 클릭 → 그 매물의 실제 id로 상세 페이지 이동
      onSelect={(id) => router.push(`/listing/${id}`)}
      category={category}
      initialSubCategory={initialSubCategory}
      searchQuery={searchQuery}
      initialCondition={initialCondition}
      initialAppearance={initialAppearance}
      initialWorking={initialWorking}
      initialBrand={initialBrand}
      initialModel={initialModel}
      initialLocCountry={initialLocCountry}
      initialRegion={initialRegion}
      onSearch={(q) => router.push(`/browse?q=${encodeURIComponent(q)}`)}
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
