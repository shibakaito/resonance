# Grace Project — Resonance 마켓플레이스 인수인계

> **최종 업데이트: 2026-05-22**
> 새 세션에서 `cat "/Users/igeon-yeong/Downloads/Grace Project/HANDOVER.md"` 로 컨텍스트 복원.

---

## ⚠️ 0. 먼저 읽을 것 — 현재 상태 (2026-05-22)

### git
- **`main`이 정식 브랜치** (Next.js + Supabase + Paperlogy 폰트 전부 포함). Vercel 자동 배포 연결.
- 작업 트리 깨끗, `origin/main` 동기화 완료. 최신 커밋: `c07649c feat(font): Paperlogy 폰트 적용`
- (옛 "main=Vite 보존" 논의는 **폐기**. Vite 백업은 `~/Downloads/Grace Project-backup-20260521` + 커밋 `37d157a`에 남음)
- **GitHub 인증**: `gh` CLI 설치·로그인 완료 (`gh auth login` → keyring 저장). 이후 `git push` 자동 인증.

### ⚠️ 배포 사이트가 깨지면 1순위: Vercel 환경변수
- 코드가 Supabase 키를 **필수**로 읽음. `.env.local`은 git 제외 → Vercel에 별도 등록 필요.
- 변수: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Vercel → Settings → Environment Variables → 등록 후 재배포. (로컬 dev는 `.env.local` 있어 정상)

### Supabase (백엔드)
- **URL**: `https://yooozcdvwvyzxzlhpnfs.supabase.co` (anon 키는 `.env.local`)
- **테이블**: `listings` (설계 SQL: `supabase/listings.sql`), 현재 약 52건 (더미 50 + MC2105/MC275)
- **RLS**: select 전체 허용 / 등록은 임시 `listings_insert_temp`(누구나 INSERT) — 로그인 생기면 본인만으로 조일 것
- **저장 규칙**: 선택지는 **영문 키/슬러그**로 저장 (condition=`used_excellent`, country=`us`, category=`power-amp`). 화면엔 한글 변환(다국어 대비).

### 새 핵심 파일 `src/lib/`
- `supabase.ts` — 클라이언트
- `listings.ts` — `fetchListings()` / `fetchListingById(id)` / `insertListing(form)` + `mapRow(DB행→Listing, 영문키→한글)`
- `labels.ts` — 영문키↔한글 변환표 `label()`/`keyFor()` (condition·country·location·ownership·shipping_type + specs)

### 폰트 — Paperlogy (2026-05-22 적용)
- 9종(`Thin~Black`) → `public/fonts/Paperlogy-*.ttf`
- `src/styles/fonts.css`에 `@font-face` 9개 등록 (`font-display: swap`, 지연 로딩 → **쓰는 굵기만 다운로드**)
- `src/styles/theme.css`의 `body` 기본 글꼴 + `--font-sans`를 `'Paperlogy', ui-sans-serif, system-ui, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif` 로 지정
- 실제 사용 굵기: **400(본문) · 500(제목/버튼/라벨) · 600(font-semibold) · 700(font-bold)** — 나머지 5종은 등록만 됨

### 이번 세션(2026-05-21 ~ 22) 완료
- **Supabase 연동** — browse·홈·PDP가 DB에서 매물 읽음, 카드→실제 id PDP
- **더미 완전 삭제** — `buildListings`·`dummy-catalog` 제거
- **판매 폼→INSERT** — `/sell/upload` 등록 시 DB 저장→상세 이동
- **상태 등급 통일** — '중고 -' 제거: 새상품/NOS/중고/민트급/매우 좋음/좋음/보통/점검 필요/작동 불가
- **필터 개선** — 브랜드=DB 실제만, 브랜드 검색 한글별칭, "모두 보기"(전부 펼침·스크롤 맨위·접기 끝·행 정확 잘림). 0건 회색비활성은 도입 후 되돌림(항상 선택 가능)
- **홈 메인 검색(C-2)** — 검색어→`/browse?q=`, brand/model/title/description + 한글 별칭 + 카테고리 한글 매칭, 상단 "'OO' 검색 결과 N건" + 편집 검색창
- **Paperlogy 폰트 적용** (위 "폰트" 항목 참조)

### 미해결 / 다음 할 일
- PDP "비슷한 매물"·리뷰: 아직 하드코딩 더미 → 매물 쌓이면 DB 연결
- 검색 다듬기: "스피커" 검색에 "스피커 케이블" 섞임(부분일치 부작용) — 보류
- RLS insert 조이기 / 이미지(Storage 업로드 미구현, "이미지 없음" 표시) / 로그인·회원 미구현
- (참고) Perfect Circuit 사이트 폰트 = 본문 Libre Franklin / 제목 Roboto(700) — 적용은 보류
- (참고) 네트워크 보안 차단 점검: "새롭게 발견된 도메인" / "DGA 도메인"이 켜져 있으면 Vercel·Supabase 접속이 막힐 수 있음 (현재는 영향 없음 확인)

> ⚠️ 아래 2장 이후(Next.js 이전 설명)는 대부분 유효하나, **"백엔드 없음 / buildListings" 부분은 폐기**(이제 Supabase 사용).

---

## 1. 프로젝트 개요
- **이름**: Resonance (하이파이 오디오 중고 마켓플레이스 프로토타입)
- **위치**: `/Users/igeon-yeong/Downloads/Grace Project/`
- **GitHub**: `shibakaito/resonance`
- **현재 스택 (main)**: **Next.js 14.2 (App Router) + React 18.3 + TypeScript + Tailwind v4(PostCSS) + shadcn UI + Supabase + Paperlogy 폰트**
- **실행**: `npm run dev` (개발), `npm run build` (빌드), `npm start` (프로덕션)
- **백엔드**: Supabase (`listings` 테이블). 클라이언트는 `src/lib/listings.ts`의 `fetchListings()` / `fetchListingById()` / `insertListing()` 사용. ⚠️ 옛 `buildListings`·`dummy-catalog`는 **삭제됨**.

---

## 2. Next.js 이전 현황 (이번 세션 핵심 작업)

"클라이언트 우선 → 점진적 SSR" 전략으로 Vite SPA를 Next.js App Router로 이전 완료 (Phase 0~3-6).

### 라우트 구조 (루트 `app/`)
| 경로 | 파일 | 비고 |
|---|---|---|
| `/` | `app/page.tsx` | HomePage 렌더 (client) |
| `/browse/[[...slug]]` | `app/browse/[[...slug]]/page.tsx` | 옵셔널 캐치올. `/browse`, `/browse/amps`, `/browse/amps/preamp` |
| `/listing/[id]` | `app/listing/[id]/page.tsx` | PDP. **react-slick은 `next/dynamic(ssr:false)`** |
| `/sell` | `app/sell/page.tsx` | 판매 검색 → 선택 시 URL 쿼리로 데이터 전달 |
| `/sell/upload` | `app/sell/upload/page.tsx` | 쿼리 읽어 UploadPage initialData로 (useSearchParams + Suspense) |
| (공통) | `app/layout.tsx` | 루트 레이아웃 + `SiteHeader`(메가메뉴) + `SiteFooter` |

### 핵심 기술 노트
- **'use client'**: 상호작용 컴포넌트(site-header, browse-page, filter-*, listing-grid, listing-detail, home-page, upload-page, listing-search-page)에 부여.
- **browse-filters.ts**: 순수 로직/데이터/타입 → directive 없이 유지 (향후 SSR 재사용 목적).
- **react-slick (PDP 캐러셀)**: `next/dynamic`은 ref 전달 제약이 있어, **PDP 전체(ListingDetail)를 `dynamic(ssr:false)`로 로드**하고 react-slick은 그 안에서 정적 import → sliderRef(썸네일 이동) 정상 작동.
- **Tailwind v4**: Vite 플러그인 → `@tailwindcss/postcss`(postcss.config.mjs). `src/styles/tailwind.css`의 `@source`에 루트 `app/` 추가됨.
- **라우팅 변환**: react-router `useNavigate/useLocation` → Next `useRouter/usePathname/useParams`. 슬러그 변환은 `category-slugs.ts`의 `categoryFromSlug`/`categorySlug` 그대로 사용.
- **tsconfig**: exclude는 `node_modules`만 (모든 소스 타입검사). React 18 고정(react-slick/react-dnd 호환).
- 검증: `next build` 통과, 6개 라우트 모두 200 (dev 확인).

### 파일 구조
```
app/                        ← Next 라우트 (신규)
  layout.tsx, page.tsx
  browse/[[...slug]]/page.tsx
  listing/[id]/page.tsx
  sell/page.tsx, sell/upload/page.tsx
src/app/components/         ← 화면 컴포넌트 (기존, 위치 유지)
  site-header.tsx, site-footer.tsx   (레이아웃, 신규 분리)
  home-page.tsx, listing-detail.tsx
  browse-page.tsx + browse-filters.ts + filter-controls.tsx + filter-modal.tsx + listing-grid.tsx
  listing-search-page.tsx, upload-page.tsx
  ui/                       ← shadcn 컴포넌트
src/app/data/              ← catalog / category-slugs / category-meta / cable-terminals / dummy-catalog
src/styles/                ← index.css → fonts/tailwind/theme.css
next.config.mjs, tsconfig.json, postcss.config.mjs
(삭제됨: src/app/App.tsx, src/main.tsx, vite.config.ts, index.html)
```

---

## 3. 현재 카테고리 구조 (4개 최상위 — 이번에 축소됨)
```
앰프      ─ 프리/파워/인티/포노 스테이지/헤드폰/네트워크/리시버/AV 리시버 (8)
스피커    ─ 북쉘프/플로어 스탠딩/톨보이/센터/사운드바/서브우퍼 (6)
소스기기  ─ 턴테이블/카세트/오픈릴/CD/CD트랜스포트/SACD/DAC/네트워크플레이어/블루투스/FM/AM-FM/LD/DVD/블루레이 (14)
케이블    ─ RCA/XLR/스피커/파워/디지털동축/광/USB/AES-EBU/BNC/HDMI/포노/점퍼/헤드폰/이어폰 (14)
```
- **삭제됨(백업 있음)**: 액세서리(대분류), 턴테이블(대분류), 앰프 ETC, 스피커 ETC → `backup/categories-removed-2026-05-20.md`
- 카테고리 정의: `src/app/data/catalog.ts`의 `CATEGORY_TREE`. 수정 시 category-slugs.ts·category-meta.ts도 함께 점검.

---

## 4. 디자인/기능 메모
- 모노톤 디자인 (#000000 / #FFFFFF / #F7F7F7 / #E0E0E0)
- 메가 메뉴: Apple 스타일 풀폭 슬라이드 (열림 `mega-unroll` / 닫힘 `mega-roll-up`, theme.css), 좌 대분류 + 중앙 BY TYPE + 우 KEF식 이미지
- browse 좌측 필터: 아코디언(FilterSection) + 범위입력(RangeSection). 브랜드 5개씩 더보기, 프리앰프=정격출력/임피던스 숨김, 헤드폰앰프=지원임피던스(Ω) 범위
- **숨은 기능 — 관리자(이미지 편집) 모드**: 홈에서 `Ctrl + Shift + A` 토글. 히어로 이미지 드래그/확대/밝기 조절, localStorage 저장. (`home-page.tsx` ~407줄)
- 더미 매물 120개: `src/app/data/dummy-catalog.ts` (`INCLUDE_DUMMY=false`로 끄거나 파일 삭제로 제거)

---

## 5. 다음 단계 / 배포 전 점검

### 배포 (Vercel 권장) — 사용자가 직접 진행 예정
- GitHub `shibakaito/resonance` 연결 → `migrate/nextjs` 프리뷰 배포로 먼저 확인.
- 빌드 명령 `next build` 자동 감지. 환경변수 현재 불필요.

### 배포 전 점검
1. 이미지 404 확인 (매물 카드는 대부분 `no-image.png` 폴백, PDP만 실제 webp)
2. `next.config.mjs`에 `eslint.ignoreDuringBuilds:true` 임시 설정됨 → `next lint` 한 번 정리 권장
3. 메타데이터: 전 페이지 동일 title("Resonance") → 카테고리/상세에 `generateMetadata` 추가 권장(점진적 SSR)
4. 모바일 반응형(메가메뉴/PDP) 확인
5. `Ctrl+Shift+A` 관리자 단축키가 브라우저 단축키와 겹치는지 확인

### 향후 후보
- 백엔드(Supabase) + 실제 매물 데이터 → `/listing/[id]` 실제 id 라우팅
- 이미지 업로드 기능
- 카테고리별 SEO 메타 (SSR 전환)

---

## 6. 안전장치 요약
- 백업 폴더: `~/Downloads/Grace Project-backup-20260521` (node_modules 제외 전체 소스)
- Vite 버전: 커밋 `37d157a` + `refactor/browse-page-split` 브랜치
- 카테고리 삭제 백업: `backup/categories-removed-2026-05-20.md`
- 작업은 브랜치에서, 단계마다 커밋. main 강제 push 등 파괴적 작업은 사용자 승인 후에만.
