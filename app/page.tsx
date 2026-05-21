// ============================================================================
// app/page.tsx — 홈 경로("/")의 임시 자리표시 페이지
// ----------------------------------------------------------------------------
// Phase 1(골격) 단계의 임시 화면입니다. 실제 홈/카테고리/상세 페이지는
// 라우팅 이전 단계에서 기존 컴포넌트(App.tsx, home-page 등)를 옮겨 채웁니다.
// Tailwind 스타일이 정상 적용되는지 확인하는 용도도 겸합니다.
// ============================================================================

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white text-[#000000] px-4">
      <h1 className="text-3xl font-bold">Resonance</h1>
      <p className="text-gray-600 text-sm">Next.js 이전 진행 중 — Phase 1 골격</p>
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#e0e0e0] text-xs font-medium">
        App Router · TypeScript · Tailwind v4
      </span>
    </main>
  );
}
