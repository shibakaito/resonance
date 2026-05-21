# Grace Project — Resonance 마켓플레이스 인수인계

> **최종 업데이트: 2026-05-21**
> 새 세션에서 `cat "/Users/igeon-yeong/Downloads/Grace Project/HANDOVER.md"` 로 컨텍스트 복원.

---

## ⚠️ 0. 먼저 읽을 것 — git 브랜치 상태 (중요)

| 브랜치 | 내용 | 비고 |
|---|---|---|
| `migrate/nextjs` | **Next.js 이전 완료본 (최신/작업본)** | GitHub에 push됨. 현재 이 브랜치에서 작업 중 |
| `main` | ⚠️ **현재 Next.js 커밋(48dacc4)으로 드리프트됨** | 원래는 "Vite 버전 보존" 의도였으나 어긋남 (로컬+원격 둘 다) |
| `refactor/browse-page-split` | **Vite 버전 (분리 완료, 커밋 37d157a)** | 로컬 보존. "원래 main이 가리켜야 할 Vite 버전" |

- **Vite 버전은 유실되지 않음**: 커밋 `37d157a` + `refactor/browse-page-split` 브랜치 + 백업 폴더 `~/Downloads/Grace Project-backup-20260521`.
- **미해결 과제**: `main`을 Vite(`37d157a`)로 되돌릴지, 아니면 Next 버전을 main으로 받아들일지 결정 필요.
  - Vite로 되돌리려면(파괴적, 강제 push 필요 — 명시 승인 후에만):
    ```
    git branch -f main 37d157a
    git push --force origin main      # ⚠️ 강제 push, 신중히
    ```

---

## 1. 프로젝트 개요
- **이름**: Resonance (하이파이 오디오 중고 마켓플레이스 프로토타입)
- **위치**: `/Users/igeon-yeong/Downloads/Grace Project/`
- **GitHub**: `shibakaito/resonance`
- **현재 스택 (migrate/nextjs)**: **Next.js 14.2 (App Router) + React 18.3 + TypeScript + Tailwind v4(PostCSS) + shadcn UI**
- **실행**: `npm run dev` (개발), `npm run build` (빌드), `npm start` (프로덕션)
- **백엔드 없음**: 매물은 `buildListings()`가 시드 기반으로 클라이언트 생성 (CATALOG 비어있음 + DUMMY_CATALOG 120개)

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
