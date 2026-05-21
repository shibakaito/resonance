// ============================================================================
// site-footer.tsx — 사이트 공통 푸터 (모든 페이지 하단)
// ----------------------------------------------------------------------------
// 예전 App.tsx 안에 있던 <footer>를 떼어냄. 클릭 상태가 없는 정적 화면이라
// 'use client' 없이 서버 컴포넌트로 둠 (더 가볍고 빠름).
// ============================================================================

export function SiteFooter() {
  return (
    <footer className="bg-[#000000] text-white mt-16 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h4 className="font-bold mb-4">구매</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white">기타</a></li>
              <li><a href="#" className="hover:text-white">베이스</a></li>
              <li><a href="#" className="hover:text-white">드럼</a></li>
              <li><a href="#" className="hover:text-white">키보드</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">판매</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white">판매 시작하기</a></li>
              <li><a href="#" className="hover:text-white">판매자 허브</a></li>
              <li><a href="#" className="hover:text-white">가격 가이드</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">고객 지원</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white">도움말 센터</a></li>
              <li><a href="#" className="hover:text-white">구매자 보호</a></li>
              <li><a href="#" className="hover:text-white">배송 안내</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">회사</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white">회사 소개</a></li>
              <li><a href="#" className="hover:text-white">채용</a></li>
              <li><a href="#" className="hover:text-white">보도자료</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2026 Resonance. 모든 권리 보유.</p>
        </div>
      </div>
    </footer>
  );
}
