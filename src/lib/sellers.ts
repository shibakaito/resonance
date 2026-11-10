// ============================================================================
// sellers.ts — 판매자 데이터 모양과 읽기 (2026-11-10 상세 시안, 형식만)
// ----------------------------------------------------------------------------
// FEATURE_FLAGS.seller 가 꺼져 있으면 아무도 안 부름 (상세 판매자 칸 없음, /seller/[id] 는 404)
// DB 판매자 테이블은 아직 없음. 지금 함수들은 표본(src/app/data/samples/seller.ts)을 돌려줌
// 베타 2: 아래 함수 속만 Supabase 읽기로 바꾸고, 표본 파일과 그 import 한 줄을 지움 (페이지 코드는 그대로)
// ============================================================================
import type { Listing } from '@/app/components/browse-filters';
import { label } from './labels';
import { fetchListings } from './listings';
import { SAMPLE_SELLER, SAMPLE_REVIEWS, pickSampleListings } from '@/app/data/samples/seller'; // 표본 — 베타 2에서 지움

// 판매자 한 명
export type Seller = {
  id: string;
  name: string;              // 표시 이름 (아바타는 첫 글자)
  region: string;            // 지역 키 (kr_seoul 등, labels.ts location). 없으면 ''
  joinedYear: number;        // 가입 연도
  intro: string;             // 소개 글 (없으면 '')
  rating: number;            // 평균 평점 (0~5)
  reviewCount: number;       // 리뷰 수
  replyHours: number | null; // 평균 답장 시간(시간 단위). 기록 없으면 null
};

// 판매자가 받은 리뷰 한 건
export type Review = {
  id: string;
  rating: number;       // 1~5
  createdAt: string;    // 작성 시각 (ISO)
  text: string;
  buyerName: string;    // 구매자 이름. 화면은 maskName 으로 가림 ('김**')
  listingTitle: string; // 구매 매물 제목
};

// 이름 가리기: 첫 글자 + 나머지는 * ('김민준' → '김**')
export const maskName = (n: string): string => (n ? n[0] + '*'.repeat(Math.max(1, n.length - 1)) : '');
// '서울, 2024년 가입' (지역이 없으면 '2024년 가입')
export const sellerMetaText = (s: Seller): string =>
  [label('location', s.region), s.joinedYear ? `${s.joinedYear}년 가입` : ''].filter(Boolean).join(', ');
// 평균 답장 글자: '2시간', 1시간 안이면 '1시간 이내', 기록 없으면 '-'
export const replyText = (h: number | null): string => (h == null ? '-' : h < 1 ? '1시간 이내' : `${Math.round(h)}시간`);

// id 로 판매자 한 명. 없으면 null
export async function fetchSeller(id: string): Promise<Seller | null> {
  return id === SAMPLE_SELLER.id ? SAMPLE_SELLER : null;
}

// 매물의 판매자 (베타 2: listings.seller_id 로 찾음. 지금은 매물에 판매자가 없어 표본)
export async function fetchSellerOfListing(_listing: Listing): Promise<Seller | null> {
  return SAMPLE_SELLER;
}

// 판매자가 받은 리뷰 (최신순)
export async function fetchSellerReviews(sellerId: string): Promise<Review[]> {
  return sellerId === SAMPLE_SELLER.id ? SAMPLE_REVIEWS : [];
}

// 판매자의 판매 중, 거래 완료 매물 (베타 2: seller_id + status active / sold)
export async function fetchSellerListings(sellerId: string): Promise<{ active: Listing[]; sold: Listing[] }> {
  if (sellerId !== SAMPLE_SELLER.id) return { active: [], sold: [] };
  return pickSampleListings(await fetchListings());
}
