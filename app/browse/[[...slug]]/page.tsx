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

import { useParams, useRouter } from 'next/navigation';
import { BrowsePage } from '@/app/components/browse-page';
import { categoryFromSlug } from '@/app/data/category-slugs';

export default function BrowseRoute() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string[] | undefined;

  // 첫 번째 슬러그 = 대분류, 두 번째 = 하위 카테고리
  const category = categoryFromSlug(slug?.[0]);
  const initialSubCategory = categoryFromSlug(slug?.[1]);

  return (
    <BrowsePage
      // 매물 카드 클릭 → 상세 페이지 (PDP는 다음 단계에서 추가됨)
      onSelect={() => router.push('/listing/1')}
      category={category}
      initialSubCategory={initialSubCategory}
    />
  );
}
