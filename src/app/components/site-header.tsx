'use client';
// ============================================================================
// site-header.tsx — 사이트 공통 헤더 + 메가 메뉴 (모든 페이지 상단)
// ----------------------------------------------------------------------------
// 예전 App.tsx 안에 있던 <header>를 떼어내 Next.js 레이아웃에서 재사용.
// 상태(메뉴 열림/닫힘)와 클릭 동작이 있으므로 'use client' (클라이언트 컴포넌트).
// 페이지 이동은 react-router 대신 Next의 useRouter/usePathname 사용.
// ============================================================================

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { subcategoriesFor } from '../data/catalog';
import { categorySlug } from '../data/category-slugs';

// 메가 메뉴 대분류 + 우측 이미지/설명 (예전 App.tsx와 동일)
const MEGA_CATS = ['앰프', '스피커', '소스기기', '케이블'] as const;
const MEGA_IMAGES: Record<string, string> = {
  '앰프': '/images/2c6f7c1fc6fb6.jpg',
  '스피커': '/images/bw-speakers-hero-new.jpg',
  '소스기기': '/images/f4362b6cdce17.jpg',
  '케이블': '/images/d4ba8a07c2a69.jpg',
};
const MEGA_DESC: Record<string, string> = {
  '앰프': '프리·파워·인티앰프부터 포노 스테이지, 헤드폰 앰프, 리시버까지 신호 증폭 기기 매물.',
  '스피커': '북쉘프, 플로어 스탠딩, 톨보이, 센터, 사운드바, 서브우퍼 등 다양한 스피커 매물.',
  '소스기기': '턴테이블, CD·SACD 플레이어, DAC, 네트워크 플레이어, 튜너 등 소스 컴포넌트.',
  '케이블': 'RCA·XLR 인터커넥트, 스피커·파워 케이블, 디지털·USB·HDMI 케이블 등.',
};

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();

  // 카테고리/서브 → URL 슬러그로 변환해 이동
  const goBrowse = (cat: string | null, sub: string | null = null) => {
    const top = categorySlug(cat);
    const subSlug = categorySlug(sub);
    if (top && subSlug) router.push(`/browse/${top}/${subSlug}`);
    else if (top) router.push(`/browse/${top}`);
    else router.push('/browse');
  };

  // 메가 메뉴 열림/닫힘 상태 + 마우스 오버 카테고리
  const [megaOpen, setMegaOpen] = useState(false);
  const [megaClosing, setMegaClosing] = useState(false); // 접히는 애니메이션 재생 중
  const [hoverCat, setHoverCat] = useState<string | null>(MEGA_CATS[0]);

  // 메가 메뉴 닫기: 접히는 모션 재생 후 언마운트 (CSS .mega-roll-up 360ms와 동기화)
  const closeMega = () => {
    setMegaClosing(true);
    window.setTimeout(() => {
      setMegaOpen(false);
      setMegaClosing(false);
    }, 360);
  };

  // 현재 경로 기준 네비게이션 활성 표시
  const isHome = pathname === '/';
  const isSell = pathname.startsWith('/sell');

  return (
    <header className="border-b border-[#e0e0e0] bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={() => router.push('/')} className="text-2xl font-bold text-[#000000]">Resonance</button>

            {/* Shop by Category 버튼 + 드롭다운 패널 (클릭으로 열림) */}
            <div>
              <button
                onClick={() => (megaOpen && !megaClosing ? closeMega() : setMegaOpen(true))}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-medium transition ${
                  megaOpen && !megaClosing
                    ? 'border-[#000000] bg-[#000000] text-white'
                    : 'border-[#e0e0e0] bg-white text-gray-800 hover:border-gray-400'
                }`}
              >
                <span>Shop by Category</span>
                <ChevronDown className={`w-4 h-4 transition ${megaOpen && !megaClosing ? 'rotate-180' : ''}`} />
              </button>

              {/* 드롭다운 패널 + 백드롭 (Apple 스타일 슬라이드 + 블러) */}
              {(megaOpen || megaClosing) && (
                <>
                  <div className="absolute left-0 right-0 top-full z-40">
                    <div className={`${megaClosing ? 'mega-roll-up' : 'mega-unroll'} bg-white border-t border-[#e0e0e0] shadow-xl`}>
                      <div className="max-w-7xl mx-auto px-4 flex h-[560px] overflow-hidden">
                        {/* 좌측: 대분류 리스트 */}
                        <div className="w-64 flex-shrink-0 border-r border-[#e0e0e0] py-4">
                          {MEGA_CATS.map((cat) => {
                            const isActive = hoverCat === cat;
                            return (
                              <button
                                key={cat}
                                onMouseEnter={() => setHoverCat(cat)}
                                onClick={() => {
                                  goBrowse(cat);
                                  setMegaOpen(false);
                                }}
                                className={`flex items-center justify-between w-full text-left px-6 py-3 text-sm transition ${
                                  isActive
                                    ? 'font-bold text-[#000000]'
                                    : 'font-medium text-[#000000] hover:bg-[#f7f7f7]'
                                }`}
                              >
                                <span>{cat}</span>
                                <ChevronRight
                                  className={`w-4 h-4 text-[#000000] transition-opacity ${
                                    isActive ? 'opacity-100' : 'opacity-0'
                                  }`}
                                />
                              </button>
                            );
                          })}
                        </div>

                        {/* 중앙: 선택된 대분류의 하위 카테고리 (BY TYPE) */}
                        <div className="flex-1 px-8 py-6 overflow-y-auto">
                          {hoverCat && (
                            <>
                              <div className="flex items-center gap-3 mb-5 pb-3 border-b border-[#e0e0e0]">
                                <h3 className="text-xl font-bold text-[#000000]">{hoverCat}</h3>
                                <button
                                  onClick={() => {
                                    goBrowse(hoverCat);
                                    setMegaOpen(false);
                                  }}
                                  className="flex items-center gap-1 px-3 py-1 rounded bg-[#f7f7f7] hover:bg-[#e0e0e0] text-xs font-medium text-gray-700"
                                >
                                  Shop All <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-[#000000] uppercase tracking-wider mb-2">BY TYPE</h4>
                                <ul className="grid grid-cols-3 gap-x-6 gap-y-1.5">
                                  {subcategoriesFor(hoverCat).map((sub) => (
                                    <li key={sub}>
                                      <button
                                        onClick={() => {
                                          goBrowse(hoverCat, sub);
                                          setMegaOpen(false);
                                        }}
                                        className="text-xs text-[#000000] hover:opacity-60 transition text-left"
                                      >
                                        {sub}
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </>
                          )}
                        </div>

                        {/* 우측: 대표 이미지 + 설명 (KEF 스타일) */}
                        {hoverCat && (
                          <div className="hidden lg:block w-[340px] flex-shrink-0 p-6">
                            <button
                              key={hoverCat}
                              onClick={() => {
                                goBrowse(hoverCat);
                                setMegaOpen(false);
                              }}
                              className="group block w-full text-left animate-in fade-in duration-300"
                            >
                              <div className="w-full aspect-square overflow-hidden bg-[#f7f7f7]">
                                <img
                                  src={MEGA_IMAGES[hoverCat] ?? '/images/no-image.png'}
                                  alt={hoverCat}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src = '/images/no-image.png';
                                  }}
                                />
                              </div>
                              <div className="mt-3">
                                <p className="text-xs text-gray-500 leading-relaxed group-hover:text-[#000000] transition-colors">
                                  {MEGA_DESC[hoverCat] ?? ''}
                                </p>
                              </div>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* 백드롭: 패널 아래에 붙어 슬라이드에 맞춰 함께 내려감/올라감 */}
                    <div
                      className={`h-screen bg-black/20 backdrop-blur-sm ${
                        megaClosing
                          ? 'animate-out fade-out-0 fill-mode-forwards duration-300'
                          : 'animate-in fade-in-0 duration-500'
                      }`}
                      onClick={closeMega}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <nav className="flex gap-6 items-center">
            <button onClick={() => router.push('/')} className={`hover:text-[#000000] transition ${isHome ? 'text-[#000000] font-semibold' : 'text-gray-700'}`}>홈</button>
            <button
              onClick={() => router.push('/sell')}
              className={`hover:text-[#000000] transition ${isSell ? 'text-[#000000] font-semibold' : 'text-gray-700'}`}
            >
              판매
            </button>
            <a href="#" className="text-gray-700 hover:text-[#000000]">장바구니</a>
          </nav>
        </div>
      </div>
    </header>
  );
}
