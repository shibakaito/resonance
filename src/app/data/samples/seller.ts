// ============================================================================
// samples/seller.ts — 판매자 표본 (FEATURE_FLAGS.seller 를 켰을 때만 보임)
// ----------------------------------------------------------------------------
// 상세의 판매자 칸과 판매자 페이지(/seller/sample) 모양을 보려고 넣은 값. 실제 판매자가 아님
// 가짜 값은 이 파일에만 둠 (페이지 코드에는 없음)
// 베타 2에서 실제 데이터로 바꿀 때 이 파일을 지우고, src/lib/sellers.ts 의 import 한 줄과 함수 속을 Supabase 읽기로 바꿈
// ============================================================================
import type { Listing } from '@/app/components/browse-filters';
import type { Review, Seller } from '@/lib/sellers';

// 리뷰 7건 (최신순) — 판매자 페이지가 5건씩 보여 주니 '리뷰 더 보기 (2)'까지 보임
export const SAMPLE_REVIEWS: Review[] = [
  { id: 'sample-r1', rating: 5, createdAt: '2026-11-03T10:00:00+09:00', text: '사진과 설명 그대로였고 포장이 아주 꼼꼼했어요. 질문에도 빨리 답해 주셨어요.', buyerName: '김민준', listingTitle: 'Luxman L-509X 인티앰프' },
  { id: 'sample-r2', rating: 5, createdAt: '2026-10-27T14:20:00+09:00', text: '직거래로 받았는데 작동 확인까지 같이 해 주셔서 믿고 샀어요.', buyerName: '이서연', listingTitle: 'Rega Planar 3 턴테이블' },
  { id: 'sample-r3', rating: 4, createdAt: '2026-10-15T09:10:00+09:00', text: '상태는 좋았어요. 배송이 하루 늦었지만 미리 알려 주셔서 괜찮았어요.', buyerName: '박지훈', listingTitle: 'KEF LS50 Meta 북쉘프 스피커' },
  { id: 'sample-r4', rating: 5, createdAt: '2026-09-30T19:45:00+09:00', text: '정품 박스와 설명서까지 다 챙겨 주셨어요. 또 거래하고 싶어요.', buyerName: '최유진', listingTitle: 'Accuphase C-2850 프리앰프' },
  { id: 'sample-r5', rating: 5, createdAt: '2026-09-12T11:00:00+09:00', text: '헤드 상태를 자세히 알려 주셔서 고르기 쉬웠어요.', buyerName: '정하늘', listingTitle: 'Nakamichi CR-2 카세트 데크' },
  { id: 'sample-r6', rating: 4, createdAt: '2026-08-28T16:30:00+09:00', text: '설명에 적힌 잔기스 말고는 깨끗했어요.', buyerName: '강도윤', listingTitle: 'Technics SL-1200GR 턴테이블' },
  { id: 'sample-r7', rating: 5, createdAt: '2026-08-02T13:15:00+09:00', text: '답장이 빠르고 친절했어요. 소리도 기대 이상이에요.', buyerName: '윤서아', listingTitle: 'McIntosh MC275 파워앰프' },
];

// 표본 판매자 — 평점과 리뷰 수는 위 리뷰에서 계산
export const SAMPLE_SELLER: Seller = {
  id: 'sample',
  name: '표본 판매자',
  region: 'kr_seoul',
  joinedYear: 2024,
  intro: '판매자 칸과 판매자 페이지 모양을 보려고 넣은 표본이에요. 베타 2에서 실제 판매자 정보로 바뀌어요.',
  rating: Math.round((SAMPLE_REVIEWS.reduce((sum, r) => sum + r.rating, 0) / SAMPLE_REVIEWS.length) * 10) / 10,
  reviewCount: SAMPLE_REVIEWS.length,
  replyHours: 2,
};

// 판매 중, 거래 완료 탭 — 표본 판매자에게는 DB 매물이 없어 지금 판매중 매물에서 골라 보여 줌
//   (앞 8개 = 판매 중 자리, 그다음 4개 = 거래 완료 자리. 카드를 누르면 실제 매물 상세로 감)
export const pickSampleListings = (all: Listing[]): { active: Listing[]; sold: Listing[] } => ({
  active: all.slice(0, 8),
  sold: all.slice(8, 12),
});
