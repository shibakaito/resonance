# 숨김 목록

숨김은 삭제가 아니에요. 코드와 문구는 그대로 두고 표식이나 플래그만 꺼 둔 것이라, 다시 켜면 돌아와요.

- 칸, 필터, 기능 플래그: `src/app/data/feature-flags.ts` 의 `FEATURE_FLAGS` (플래그마다 이유와 날짜 주석)
- 카테고리 숨김: `src/app/data/catalog.ts` 의 `CATEGORY_TREE` 안 `hidden: true` 표식
- 숨긴 카테고리 매물은 목록과 개수에서 빠지지만 DB에는 그대로 있고, 상세 주소로는 열려요.

| 항목 | 종류 | 어디에 플래그가 있나 | 숨긴 날짜 | 다시 켜는 법 |
|---|---|---|---|---|
| 앰프: 포노앰프 | 카테고리 | `catalog.ts` CATEGORY_TREE `{ name: '포노앰프', hidden: true }` | 2026-11-08 | `hidden: true` 지우기(문자열 `'포노앰프'`로) |
| 앰프: MC 스텝업 헤드앰프, MC 스텝업 트랜스 | 카테고리 | `catalog.ts` CATEGORY_TREE 잎마다 `hidden: true` | 2026-11-08 | 같음 |
| 앰프: 헤드폰 앰프, 네트워크 앰프, AV 리시버 | 카테고리 | `catalog.ts` CATEGORY_TREE 잎마다 `hidden: true` | 2026-11-08 | 같음 |
| 스피커: 톨보이 스피커, 센터 스피커, 사운드바 | 카테고리 | `catalog.ts` CATEGORY_TREE 잎마다 `hidden: true` | 2026-11-08 | 같음 |
| 스피커: 서브우퍼 | 카테고리 | `catalog.ts` CATEGORY_TREE `hidden: true` | 2026-11-08 | 같음 |
| 소스기기: 오픈릴 데크, CD 트랜스포트, SACD 플레이어, DAC, 네트워크 플레이어, 블루투스 리시버, FM 튜너, LD 플레이어, DVD 플레이어, 블루레이 플레이어 | 카테고리 | `catalog.ts` CATEGORY_TREE 잎마다 `hidden: true` | 2026-11-08 | 같음 |
| 케이블 대분류 전체(하위 14개) | 카테고리 | `catalog.ts` CATEGORY_TREE `{ top: '케이블', hidden: true, … }` | 2026-11-08 | 대분류의 `hidden: true` 지우기 |
| 케이블 필터 8개: 길이, 입력 단자, 출력 단자, 도체 재질, 커넥터 도금, 차폐 방식, 페어 여부, 방향성 | 필터 | 따로 플래그 없음. 케이블 대분류 숨김을 따라 안 보임(`browse-page.tsx` `isCable &&`) | 2026-11-08 | 케이블 대분류를 켜면 같이 보임 |
| 전원 장치 필터: 정격 용량 | 필터 | 따로 플래그 없음. 액세서리 대분류가 CATEGORY_TREE에 없어서 안 보임(`browse-page.tsx` `isPowerDevice &&`) | 확인 안 됨(이번 블록 전부터) | 액세서리 대분류를 CATEGORY_TREE에 넣으면 보임 |
| 구성품 체크 카드(원래 박스 등 7개 + 기타 구성품 글) | 칸 (되돌리기) | `FEATURE_FLAGS.componentChecks` | 2026-11-09 | `true`로. 저장이 키 배열(specs.components)과 글(specs.componentsOther)로 바뀜 |
| 출시 연도 '대략 / 모름' 체크, '약 N년' 표시 | 칸 (되돌리기) | `FEATURE_FLAGS.yearApprox` | 2026-11-09 | `true`로. 저장(specs.yearApprox)과 카드, 상세 '약 N년'이 같이 돌아옴 |
| 가격 섹션 시장 가격 비교 카드 | 기능 | `FEATURE_FLAGS.marketPriceCard` | 2026-11-09 | `true`로(시세 값은 아직 하드코딩) |
| 상태, 외관, 작동 등급 정의 문구(폼과 상세) | 기능 | `FEATURE_FLAGS.gradeDescriptions` (문구는 `labels.ts` LABEL_DESC) | 2026-11-09 | `true`로 |
| "핸드메이드 제품인가요?" 칸 | 칸 | `FEATURE_FLAGS.handmadeField` | 2026-11-09 | `true`로(저장 로직은 끈 동안에도 그대로, 기본 false) |
| 앰프 필터 '리모컨 포함'(사이드바, 필터 모달) | 필터 | `FEATURE_FLAGS.remoteFilter` | 2026-11-09 | `true`로. 리모컨 칸이 상세 사양으로 간 것은 플래그가 아니라 `category-specs.ts` CORE_SPEC_KEYS 변경이라, 핵심으로 되돌리려면 목록에 `'remote'` 다시 넣기 |

플래그를 켜고 끌 때는 시드(`scripts/seed-listings.ts`)도 같은 플래그를 따르니 dry-run으로 한 번 확인하세요.
