'use client';
// ============================================================================
// site-header.tsx — 사이트 공통 헤더 + 카테고리 메뉴 (모든 페이지 상단)
// ----------------------------------------------------------------------------
// 예전 App.tsx 안에 있던 <header>를 떼어내 Next.js 레이아웃에서 재사용.
// 상태(메뉴 열림/닫힘)와 클릭 동작이 있으므로 'use client' (클라이언트 컴포넌트).
// 2026-11-10 시안: 카테고리 메뉴
//   단추 '카테고리' + 화살표 16(공통 Button). 닫힘 = line 선, 열림 = fg 채움 흰 글자에 화살표 위로
//   패널: 헤더 바로 아래 폭 100% 흰 바탕, 아래 선 1, 안 여백 32 80, 안쪽 1280에 4열(앰프, 스피커, 소스기기, 빈 칸)
//     칸마다 제목 16/700 → 8 → 보이는 하위 카테고리만 14, 줄 간격 32(각 둘러보기 링크) → 8 → '앰프 전체 보기 →'(14/500)
//   Esc(단추로 포커스 돌아감)와 바깥 클릭으로 닫힘, 링크를 누르거나 다른 쪽으로 가면 닫힘. 링크는 단추 다음 Tab 순서라 키보드로 이동
//   예전 사진, 'BY TYPE', 'Shop All', 설명 문구, 펼침 애니메이션과 흐린 배경은 삭제
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { subcategoriesFor, TOP_CATEGORIES } from '../data/catalog';
import { categorySlug } from '../data/category-slugs';
import { Button } from './ui/button';
import { Container } from './ui/container';

// 메뉴 대분류 = 보이는 대분류만 (CATEGORY_TREE 숨김 표식). 하위 카테고리도 subcategoriesFor 가 보이는 것만 줌
const MENU_CATS = TOP_CATEGORIES;

// 대분류(+ 하위 카테고리) → 둘러보기 주소
const browseHref = (cat: string, sub?: string) => {
  const top = categorySlug(cat);
  const subSlug = sub ? categorySlug(sub) : null;
  if (top && subSlug) return `/browse/${top}/${subSlug}`;
  if (top) return `/browse/${top}`;
  return '/browse';
};

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();

  // 카테고리 메뉴 열림/닫힘
  const [menuOpen, setMenuOpen] = useState(false);
  const menuAreaRef = useRef<HTMLDivElement>(null); // 단추 + 패널 (이 밖을 누르면 닫힘)
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    const onDown = (e: MouseEvent) => {
      if (!menuAreaRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [menuOpen]);

  // 다른 쪽으로 이동하면 닫음
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // 현재 경로 기준 네비게이션 활성 표시
  const isHome = pathname === '/';
  const isSell = pathname.startsWith('/sell');

  return (
    <header className="border-b border-line bg-bg sticky top-0 z-50">
      {/* 겉틀 — 공통 Container (최대 1440, 좌우 80, 내용 1280). 페이지 본문, 푸터와 좌우 끝이 같음 */}
      <Container className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={() => router.push('/')} className="text-24 font-bold text-fg">Resonance</button>

            {/* 카테고리 단추 + 패널 */}
            <div ref={menuAreaRef}>
              <Button
                ref={menuButtonRef}
                variant={menuOpen ? 'primary' : 'line'}
                noHover={menuOpen}
                aria-expanded={menuOpen}
                aria-controls={menuOpen ? 'category-menu' : undefined}
                onClick={() => setMenuOpen((v) => !v)}
              >
                카테고리
                {menuOpen ? <ChevronUp aria-hidden className="h-4 w-4" /> : <ChevronDown aria-hidden className="h-4 w-4" />}
              </Button>

              {/* 패널 — 헤더 바로 아래 폭 100%. 위 선은 헤더 아래 선과 같은 자리 */}
              {menuOpen && (
                <div id="category-menu" className="absolute left-0 right-0 top-full z-40 border-y border-line bg-bg">
                  <Container className="py-8">
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                      {MENU_CATS.map((cat) => {
                        const headId = `category-menu-${categorySlug(cat) ?? cat}`;
                        return (
                          <div key={cat}>
                            <p id={headId} className="text-16 font-bold text-fg">
                              {cat}
                            </p>
                            <ul aria-labelledby={headId} className="mt-2">
                              {subcategoriesFor(cat).map((sub) => (
                                <li key={sub}>
                                  <Link href={browseHref(cat, sub)} onClick={closeMenu} className="flex h-8 items-center text-14 text-fg hover:underline">
                                    {sub}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                            <Link href={browseHref(cat)} onClick={closeMenu} className="mt-2 flex h-8 items-center text-14 font-medium text-fg hover:underline">
                              {cat} 전체 보기 →
                            </Link>
                          </div>
                        );
                      })}
                      {/* 4번째 칸은 비워 둠 (대분류가 늘면 채워짐) */}
                    </div>
                  </Container>
                </div>
              )}
            </div>
          </div>

          <nav className="flex gap-6 items-center">
            <button onClick={() => router.push('/')} className={`hover:text-fg transition ${isHome ? 'text-fg font-bold' : 'text-fg'}`}>홈</button>
            <button
              onClick={() => router.push('/sell')}
              className={`hover:text-fg transition ${isSell ? 'text-fg font-bold' : 'text-fg'}`}
            >
              판매
            </button>
            <a href="#" className="text-fg hover:text-fg">장바구니</a>
          </nav>
        </div>
      </Container>
    </header>
  );
}
