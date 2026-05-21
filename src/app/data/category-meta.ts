// ============================================================================
// category-meta.ts — 카테고리별 "표시 정보(메타데이터)" 모음
// ----------------------------------------------------------------------------
// 카테고리 페이지를 열었을 때 보여줄 글자들을 한곳에 모아둔 파일.
//   - title    : 페이지 큰 제목 (h1)
//   - description : 제목 아래 설명 (지금은 화면에 안 띄우지만 데이터는 유지)
//   - docTitle : 브라우저 탭에 뜨는 제목 (<title>)
//   - metaDesc : 검색엔진/공유용 설명 (<meta name="description">, 화면엔 안 보임)
// 같은 하위 이름이 여러 대분류에 있을 때(예: '포노 케이블') 대분류별로 다른 설명을
// 주고 싶어서 (top|sub) 조합 키도 따로 둠 → 아래 CONTEXT_META.
// ============================================================================

// CategoryMeta 타입: 카테고리 1개가 가질 수 있는 표시 정보의 모양.
//   '?' 가 붙은 항목(docTitle?, metaDesc?)은 "있어도 되고 없어도 됨"(선택 항목).
export type CategoryMeta = {
  title: string;        // 페이지 제목 (h1)
  description: string;  // 페이지 설명 (h1 아래 회색 텍스트)
  docTitle?: string;    // <title> 태그 (브라우저 탭)
  metaDesc?: string;    // <meta name="description"> (검색엔진용, 화면 비표시)
};

// 대분류(앰프/스피커/소스기기/케이블)별 메타. 키 = 대분류 한글 이름.
export const TOP_META: Record<string, CategoryMeta> = {
  '앰프': {
    title: '앰프',
    description: '프리/파워/인티앰프, 포노앰프, 헤드폰 앰프, 리시버 등 신호 증폭 기기 매물.',
    docTitle: '앰프 매물 | Resonance',
    metaDesc: '프리앰프, 파워앰프, 인티앰프, 포노앰프, 헤드폰 앰프 등 다양한 앰프 매물을 확인하세요.'
  },
  '스피커': {
    title: '스피커',
    description: '북쉘프, 플로어 스탠딩, 톨보이, 센터, 사운드바, 서브우퍼 등 다양한 스피커 매물.',
    docTitle: '스피커 매물 | Resonance',
    metaDesc: '북쉘프부터 플로어 스탠딩까지 다양한 스피커 매물을 비교해보세요.'
  },
  '소스기기': {
    title: '소스기기',
    description: '턴테이블, CD 플레이어, DAC, 튜너, 디지털 플레이어 등 소스 컴포넌트 매물.',
    docTitle: '소스기기 매물 | Resonance',
    metaDesc: '아날로그/디지털 소스기기 — 턴테이블, CD/SACD 플레이어, DAC, 튜너 등.'
  },
  '케이블': {
    title: '케이블',
    description: 'RCA, XLR, 스피커, 파워, USB, HDMI 등 오디오·디지털 케이블 매물.',
    docTitle: '오디오 케이블 매물 | Resonance',
    metaDesc: 'RCA/XLR 인터커넥트, 스피커 케이블, 파워 케이블, 디지털 케이블 등.'
  }
};

// (대분류|하위) 조합별 메타 — 같은 하위 이름이라도 대분류에 따라 다른 설명을 보여줄 때.
// 키 형식: `대분류|하위` (예: '케이블|포노 케이블'). 이 표에 있으면 우선 적용됨.
export const CONTEXT_META: Record<string, CategoryMeta> = {
  // 포노 케이블 예시 — 케이블 컨텍스트 vs 턴테이블 액세서리 컨텍스트
  '케이블|포노 케이블': {
    title: '포노 케이블',
    description: '톤암 출력에서 포노앰프 입력까지 — 미세 신호를 전달하는 특수 케이블.',
    docTitle: '포노 케이블 매물 | Resonance 케이블',
    metaDesc: 'DIN/RCA 포노 케이블 매물. 도체·도금·차폐 옵션으로 필터링하세요.'
  },
  '턴테이블 액세서리|포노 케이블': {
    title: '포노 케이블',
    description: '턴테이블 셋업의 마지막 1%를 책임지는 신호 케이블.',
    docTitle: '포노 케이블 (턴테이블용) | Resonance',
    metaDesc: '턴테이블 톤암과 포노앰프 사이의 신호 케이블 매물.'
  }
};

// 상황에 맞는 메타를 골라주는 함수. 아래 '우선순위' 순서대로 확인함:
//   1순위) 대분류+하위 조합이 CONTEXT_META에 있으면 → 그걸 사용
//   2순위) 하위만 있으면 → 하위 이름으로 기본 메타를 즉석에서 만들어 반환
//   3순위) 대분류만 있으면 → TOP_META에서 찾아 반환
//   아무것도 없으면 null.
export function metaFor(top: string | null, sub: string | null): CategoryMeta | null {
  if (top && sub) {
    const key = `${top}|${sub}`;                 // 예: '케이블|포노 케이블'
    if (CONTEXT_META[key]) return CONTEXT_META[key];
  }
  if (sub) {
    // 하위 전용 메타가 따로 없을 때 쓰는 기본값(폴백)
    return {
      title: sub,
      description: `${sub} 매물을 살펴보세요.${top ? ` (${top} 카테고리)` : ''}`
    };
  }
  if (top && TOP_META[top]) return TOP_META[top];
  return null;
}
