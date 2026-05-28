// ============================================================================
// "Did you mean?" — 브라우즈 검색 오타 교정 추천
// ----------------------------------------------------------------------------
// - string-similarity의 Sørensen-Dice 점수로 사용자 query와 후보 비교
// - 후보 풀: 브랜드(정식 이름) + 브랜드 한글 별칭 + 카테고리(TOP + 서브)
//   · 별칭이 매칭되도 사용자에겐 정식 이름을 노출 (예: '맥킨토수' → 'McIntosh')
// - 가드: rating ≥ 0.5, q.length ≥ 3, 길이차 ≤ 5, 동일성(이미 일치하면 추천 X)
// ============================================================================

import { findBestMatch } from 'string-similarity';
import {
  ALL_BRAND_NAMES,
  BRAND_DIRECTORY,
  TOP_CATEGORIES,
  ALL_SUBCATEGORIES,
  CATEGORY_ALIASES,
} from '@/app/data/catalog';

/** 비교용 텍스트(match)와 사용자에게 보여줄 텍스트(label) 쌍 */
type Candidate = { match: string; label: string };

// 후보 풀 — 모듈 로드 시 1회만 빌드해 재사용
// ⚠️ 별칭 중 ≤2자 한글은 추천 후보에서 제외.
// 짧은 한글(2자)은 한 글자만 달라도 Levenshtein 거리 1로 매칭돼 의도 외 후보가 자주 잡힘
// (예: '엠프'가 KEF 별칭 '케프'와 매칭). 정상 검색 별칭 매칭에는 영향 없음.
const isShortKoreanAlias = (s: string) => /[가-힣]/.test(s) && s.length <= 2;

const CANDIDATES: Candidate[] = [
  // 브랜드 정식 이름
  ...ALL_BRAND_NAMES.map((name) => ({ match: name, label: name })),
  // 브랜드 한글 별칭 — 매칭은 별칭으로, 추천 표시는 정식 이름으로
  ...BRAND_DIRECTORY.flatMap((b) =>
    b.aliases
      .filter((a) => !isShortKoreanAlias(a))
      .map((alias) => ({ match: alias, label: b.name }))
  ),
  // 카테고리 (대분류 + 서브) — 카테고리는 짧아도 의도 있는 매칭이 많아 포함
  ...TOP_CATEGORIES.map((c) => ({ match: c, label: c })),
  ...ALL_SUBCATEGORIES.map((c) => ({ match: c, label: c })),
  // 카테고리 영어 별칭 — 매칭은 별칭으로, 추천 표시는 정식 한글명
  // 예: 'ampliifer' 오타 → label '앰프'
  ...Object.entries(CATEGORY_ALIASES).flatMap(([top, aliases]) =>
    aliases.map((alias) => ({ match: alias, label: top }))
  ),
];

// findBestMatch에 넘길 비교 문자열 (소문자 정규화)
const MATCH_STRINGS_LOWER = CANDIDATES.map((c) => c.match.toLowerCase());

export type Suggestion = { label: string; rating: number };

/** query에 한글 음절(가-힣)이 포함되는지 */
const containsKorean = (s: string) => /[가-힣]/.test(s);

/**
 * Levenshtein 편집거리 (삽입/삭제/치환 각 비용 1).
 * 한글 짧은 단어 매칭에 사용 — Dice(bigram)는 한글 한 글자 차이를 0점으로 만들기 때문.
 * DP를 1차원 배열로 돌려 공간 O(min(m,n)).
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return dp[n];
}

/**
 * 사용자 검색어와 가장 비슷한 후보 1개를 반환.
 * 조건 만족 안 하면 null.
 *
 * 동작 분기:
 *   - 영문 query → Dice 점수 (bigram). length ≥ 3, rating ≥ 0.5
 *   - 한글 query → Levenshtein 편집거리.
 *       · length ≥ 2
 *       · 짧으면(≤4자) 거리 ≤ 1, 길면 거리 ≤ 2 까지 허용 (보수적)
 *       · 영문 후보는 자연스럽게 거리가 커서 자동으로 걸러짐
 *   - 공통: 길이차 가드, 동일성 가드 (이미 일치하면 추천 X)
 */
export function suggest(q: string): Suggestion | null {
  const query = q.trim();
  const isKorean = containsKorean(query);

  // ── 한글 분기 ── Levenshtein 편집거리로 가장 가까운 후보 찾기
  if (isKorean) {
    if (query.length < 2) return null;
    if (CANDIDATES.length === 0) return null;
    const maxDist = query.length <= 4 ? 1 : 2;
    const qLower = query.toLowerCase();
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < CANDIDATES.length; i++) {
      const matchLower = MATCH_STRINGS_LOWER[i];
      // 길이차가 maxDist보다 크면 거리도 그 이상 → 스킵 (성능)
      if (Math.abs(qLower.length - matchLower.length) > maxDist) continue;
      const d = levenshtein(qLower, matchLower);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    if (bestIdx < 0 || bestDist > maxDist) return null;
    const candidate = CANDIDATES[bestIdx];
    if (candidate.label.toLowerCase() === qLower) return null;
    if (candidate.match.toLowerCase() === qLower) return null;
    // rating은 1 - 정규화 거리 (사용자에게 노출은 안 함, 통계용)
    const rating = 1 - bestDist / Math.max(query.length, candidate.match.length);
    return { label: candidate.label, rating };
  }

  // ── 영문 분기 ── 기존 Dice 점수
  if (query.length < 3) return null;
  if (MATCH_STRINGS_LOWER.length === 0) return null;

  const result = findBestMatch(query.toLowerCase(), MATCH_STRINGS_LOWER);
  const { bestMatchIndex } = result;
  const rating = result.bestMatch.rating;
  if (rating < 0.5) return null;

  const candidate = CANDIDATES[bestMatchIndex];

  // 길이 차이가 너무 크면 헛다리일 가능성 ↑
  if (Math.abs(query.length - candidate.match.length) > 5) return null;

  // 이미 정확히 일치하면 추천 의미 없음
  const qLower = query.toLowerCase();
  if (candidate.label.toLowerCase() === qLower) return null;
  if (candidate.match.toLowerCase() === qLower) return null;

  return { label: candidate.label, rating };
}
