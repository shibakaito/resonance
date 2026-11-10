// ============================================================================
// site-footer.tsx — 사이트 공통 푸터 (모든 페이지 하단)
// ----------------------------------------------------------------------------
// 예전 App.tsx 안에 있던 <footer>를 떼어냄. 클릭 상태가 없는 정적 화면이라
// 'use client' 없이 서버 컴포넌트로 둠 (더 가볍고 빠름).
// 2026-11-10 홈 시안: bg fg, 안 여백 위 64 아래 48, 폭 1120, 4칸 격자(268 × 4 + 16)
//   Resonance / 구매(대분류 둘러보기) / 판매(매물 등록하기) / 고객 지원(문의하기 — NEXT_PUBLIC_KAKAO_CHANNEL_URL, 새 탭)
//   문의 주소 변수가 비어 있으면 고객 지원 칸을 통째로 숨김. 칸 제목 14/700 흰, 아래 16, 링크 14 line 색(마우스 올리면 흰), 줄 간격 32
//   예전 악기 링크(기타, 베이스 등)와 갈 곳 없는 # 링크는 전부 삭제
// ============================================================================
import Link from 'next/link';
import { TOP_CATEGORIES } from '../data/catalog';
import { categorySlug } from '../data/category-slugs';
import { Container } from './ui/container';

// 고객 지원 문의 주소 (카카오톡 채널). 빌드할 때 읽힘 — .env.local, Vercel 환경변수
const KAKAO_CHANNEL_URL = process.env.NEXT_PUBLIC_KAKAO_CHANNEL_URL ?? '';

const LINK = 'flex h-8 items-center text-14 text-line hover:text-bg';

export function SiteFooter() {
  return (
    <footer className="bg-fg text-bg mt-16">
      {/* 겉틀 — 공통 Container (헤더, 본문과 좌우 끝이 같음) */}
      <Container className="pt-16 pb-12">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div>
            <p className="text-20 font-bold">Resonance</p>
          </div>
          <nav aria-label="구매">
            <h2 className="text-14 font-bold text-bg">구매</h2>
            <ul className="mt-4">
              {TOP_CATEGORIES.map((cat) => (
                <li key={cat}>
                  <Link href={categorySlug(cat) ? `/browse/${categorySlug(cat)}` : '/browse'} className={LINK}>
                    {cat}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="판매">
            <h2 className="text-14 font-bold text-bg">판매</h2>
            <ul className="mt-4">
              <li>
                <Link href="/sell/upload" className={LINK}>
                  매물 등록하기
                </Link>
              </li>
            </ul>
          </nav>
          {KAKAO_CHANNEL_URL && (
            <nav aria-label="고객 지원">
              <h2 className="text-14 font-bold text-bg">고객 지원</h2>
              <ul className="mt-4">
                <li>
                  <a href={KAKAO_CHANNEL_URL} target="_blank" rel="noopener noreferrer" className={LINK}>
                    문의하기
                  </a>
                </li>
              </ul>
            </nav>
          )}
        </div>
        <p className="mt-12 text-14 text-line">&copy; 2026 Resonance. 모든 권리 보유.</p>
      </Container>
    </footer>
  );
}
