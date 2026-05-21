// ============================================================================
// app/layout.tsx — Next.js App Router의 "루트 레이아웃"
// ----------------------------------------------------------------------------
// 모든 페이지를 감싸는 최상위 틀. <html>/<body>를 여기서 정의하고,
// 전역 CSS(Tailwind + 테마)를 한 번만 불러옵니다.
// (예전 Vite의 index.html + main.tsx 역할을 대신함)
// ============================================================================

import type { Metadata } from 'next';
import '@/styles/index.css';

export const metadata: Metadata = {
  title: 'Resonance',
  description: '하이파이 오디오 중고 마켓플레이스',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
