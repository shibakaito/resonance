'use client';
// ============================================================================
// app/sell/upload/page.tsx — 매물 등록 경로 ("/sell/upload")
// ----------------------------------------------------------------------------
// /sell 에서 넘어온 URL 쿼리(title/brand/model/year/category)를 읽어
// UploadPage의 initialData(미리 채우기)로 전달합니다.
// useSearchParams는 Next 정적 생성 시 Suspense 경계가 필요해 <Suspense>로 감쌈.
// ============================================================================

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { UploadPage } from '@/app/components/upload-page';

function UploadInner() {
  const sp = useSearchParams();
  const initialData = {
    title: sp.get('title') ?? undefined,
    brand: sp.get('brand') ?? undefined,
    model: sp.get('model') ?? undefined,
    year: sp.get('year') ?? undefined,
    category: sp.get('category') ?? undefined,
  };
  return <UploadPage initialData={initialData} />;
}

export default function UploadRoute() {
  return (
    <Suspense fallback={null}>
      <UploadInner />
    </Suspense>
  );
}
