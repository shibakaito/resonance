// ============================================================================
// app/layout.tsx — Next.js App Router의 "루트 레이아웃"
// ----------------------------------------------------------------------------
// 모든 페이지를 감싸는 최상위 틀. <html>/<body>를 여기서 정의하고,
// 전역 CSS(Tailwind + 테마)를 한 번만 불러옵니다.
// (예전 Vite의 index.html + main.tsx 역할을 대신함)
// ============================================================================

import type { Metadata } from 'next';
import localFont from 'next/font/local';
import '@/styles/index.css';
import { SiteHeader } from '@/app/components/site-header';
import { SiteFooter } from '@/app/components/site-footer';

// 글꼴 — Pretendard Variable 한 파일(src/fonts, woff2, 굵기 45~920 가변). html 에 --font-pretendard 변수를 붙이고 theme.css 의 --font-sans 가 씀 (2026-11-10)
const pretendard = localFont({
  src: '../src/fonts/PretendardVariable.woff2',
  variable: '--font-pretendard',
  weight: '45 920',
  display: 'swap',
});

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
    <html lang="ko" className={pretendard.variable}>
      <body>
        {/* 모든 페이지 공통: 헤더(+메가메뉴) → 페이지 내용 → 푸터 */}
        <div className="min-h-screen bg-bg">
          <SiteHeader />
          {children}
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
