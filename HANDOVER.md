# Grace Project — Resonance 마켓플레이스 인수인계

> **최종 업데이트: 2026-05-28**
> 새 세션에서 `cat "/Users/igeon-yeong/Downloads/Grace Project/HANDOVER.md"` 로 컨텍스트 복원.

---

## ⚠️ 0. 먼저 읽을 것 — 현재 상태 (2026-05-28)

### git
- **`main`이 정식 브랜치**. Vercel 자동 배포 연결. 작업 트리 깨끗, `origin/main` 동기화.
- 최신 커밋: `a969148 feat(listings): 외관/작동 상태를 specs(jsonb)에 저장 + 상세에 표시`
- **GitHub 인증**: `gh` CLI 로그인 완료 (keyring 저장). `git push` 자동 인증.

### ⚠️ 배포 사이트가 깨지면 1순위: Vercel 환경변수
- 코드가 Supabase 키를 **필수**로 읽음. `.env.local`은 git 제외 → Vercel에 별도 등록 필요.
- 변수: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Vercel → Settings → Environment Variables → 등록 후 재배포.

### Supabase (백엔드)
- **URL**: `https://yooozcdvwvyzxzlhpnfs.supabase.co` (anon 키는 `.env.local`)
- **테이블 `listings`** (설계 SQL: `supabase/listings.sql`), 현재 ~53건 (옛 더미 50 + MC2105 + MC275 + 테스트 매물 `03366023...`)
  - **RLS**: select 전체 허용 / 등록은 임시 `listings_insert_temp`(누구나 INSERT) — 로그인 생기면 본인만으로 조일 것
  - **저장 규칙**: 선택지는 **영문 키/슬러그**로 저장. 화면엔 한글 변환(다국어 대비).
- **Storage 버킷 `listings`** (2026-05-28 추가): Public, 5MB, `image/jpeg·png·webp`
  - RLS: 누구나 SELECT/INSERT (DELETE는 정책 없음 — 정리는 대시보드 수동)
  - 검증용 더미 PNG 2~3장 남아있음. 정리할 거면 Supabase 대시보드에서 수동 삭제.

### 핵심 파일 `src/lib/`
| 파일 | 역할 |
|---|---|
| `supabase.ts` | 클라이언트 |
| `listings.ts` | `fetchListings()` / `fetchListingById(id)` / `insertListing(form)` + `mapRow` (DB행→Listing, 영문키→한글) |
| `labels.ts` | 영문키↔한글 변환표 `label()`/`keyFor()` (condition·country·location·ownership·shipping_type + SPEC_LABELS의 각 spec) |
| **`keyboard-layout.ts`** (2026-05-22 추가) | `en2ko('doavm')→'앰프'`, `ko2en('앰프')→'doavm'` 양방향. 두벌식 매핑 + `es-hangul`의 `assemble`/`disassemble` |
| **`did-you-mean.ts`** (2026-05-22 추가) | `suggest(q)` — Sørensen-Dice(영문) + Levenshtein(한글) 보조. 브랜드+한글별칭+카테고리(영어 별칭 포함) 풀에서 매칭. ≤2자 한글 별칭은 노이즈 차단으로 풀에서 제외 |
| **`upload-image.ts`** (2026-05-28 추가) | `uploadListingImage(file)` — Supabase Storage `listings` 버킷 업로드, public URL 반환. 5MB·MIME 가드, `crypto.randomUUID()` 파일명, 한국어 에러 메시지 |

### 폰트 — Paperlogy
- 9종 `public/fonts/Paperlogy-*.ttf` + `fonts.css`에 `@font-face` 9개 (지연 로딩 = 쓰는 굵기만 받음)
- `theme.css`의 body 기본 글꼴 + `--font-sans`를 Paperlogy로
- 실사용 굵기: 400(본문) · 500(제목·라벨·버튼) · 600(font-semibold) · 700(font-bold)

### 검색 기능 (browse 검색 = `browse-page.tsx`의 `searchedListings`)
1차 매칭 (`matchByQuery`):
- 브랜드: `searchBrands(q)` — 영문/한글 별칭
- 카테고리: 대분류·서브 부분일치 + **영어 별칭** (`CATEGORY_ALIASES`: 앰프=amp/amps/amplifier(s) 등 4 대분류)
- 본문(brand+model+title+description) 정규화 부분일치
- ⚠️ 영문 ≤2자는 카테고리 부분일치 차단(`ap` → `amp` 우연 매칭 방지)

Lazy fallback (1차 < 3건일 때):
- 한영 자판 변환 (`en2ko`/`ko2en`) — `doavm`→`앰프` 18건
- 노이즈 가드: 한글 음절 ≥2 또는 영문 ≥2일 때만 변환 채택

Did you mean? (1차 결과 0건일 때만):
- `suggest(q)` 결과 1개를 h1 아래에 "혹시 'OO'를 찾으세요?" 노출. 클릭 → `onSearch(label)`로 재검색
- 영문: Dice ≥0.5, length≥3, 길이차≤5
- 한글: Levenshtein 거리 ≤1 (길이≤4) or ≤2 (긴 경우)

### Typeahead (판매 폼 카테고리/브랜드/모델/제조국)
공통 컴포넌트(`upload-page.tsx` 안 정의)에 `enableKeyboardLayout` prop:
- 카테고리·브랜드만 켜짐 (모델·제조국은 정확도 우선)
- 동일 lazy fallback 패턴 (1차 0건 → en2ko/ko2en)
- 카테고리는 "앰프 > 프리앰프" 풀패스 검색, 선택 시 top/sub 분리 저장
- 브랜드는 한글 별칭(`searchBrands`)
- 모델은 brand + subcategory가 둘 다 일치할 때만 후보 (없으면 자유 입력만)
- `findBestMatch` 노란 매칭 하이라이트 (`highlightMatch` 정규화 기반)
- 키보드 ↑↓ Enter Esc + IME 조합 중 Enter 무시(한글 IME 이슈 해결)
- X 버튼(값 있을 때만, 우측 끝)

### 카탈로그 (`src/app/data/catalog.ts`)
- **McIntosh 모델 131개** (2026-05-22 추가, `Mcintosh.rtf` 파싱):
  프리앰프 36 / 파워앰프 33 / 인티앰프 18 / 스피커 16 / 소스기기 17 / 리시버·튜너·AV 11
- 다른 브랜드(Marantz/Luxman/Accuphase 등)는 BRAND_DIRECTORY에만 있고 모델 데이터 미입력
- 추가 RTF 4개(`Marantz.rtf`, `used.rtf`, `category.rtf`, `Brand.rtf`)가 프로젝트 루트에 있어 같은 방식으로 추가 가능
- `CATEGORY_ALIASES`: 영어 카테고리 별칭 4 대분류 (검색용)

### 매물 이미지 (end-to-end 완성)
- 폼: `/sell/upload`의 사진 박스 클릭/드래그앤드롭 → `uploadListingImage` 호출 → `images` state에 public URL 추가
- 미리보기/카드/상세: 모두 `object-contain` + `bg-[#f7f7f7]` (잘림 없이 비율 보존, 회색 여백)
- 카드/상세 표시: `l.images?.[0] ?? NO_IMAGE`, `onError`로 NO_IMAGE fallback (무한 루프 방지: `img.onerror = null`)
- 상세 캐러셀: `listing.images`(빈 배열이면 NO_IMAGE 1장)
- ⚠️ 카드의 추천 매물(`item.img`)은 별개 하드코딩 데이터

### 판매 폼 (`/sell/upload`) — 외관/작동 상태
- UI: 드롭다운(등급) + 옆 자유 입력칸. 5개 입력칸(소유권/구성품/상태/외관/작동) 정렬 통일 — 텍스트 시작점 588.5px
  - select: `h-[42px] pl-2 pr-3` (UA 추가 4px 보정으로 input과 동일 위치)
  - input: `h-[42px] px-3`
- 저장: `handleSubmit`이 `specsToSave` 객체로 묶어 `insertListing`에 전달 (비어있는 키 제외)
- DB: `specs` jsonb에 `appearance`/`appearanceDetail`/`working`/`workingDetail` 저장
- 표시: `listing-detail.tsx`에서 한글 변환 + 값 없으면 박스 자체 안 보임 (옛 매물 호환)
- `condition`(필터/검색/뱃지)은 그대로 — 외관/작동은 **참고용 별도 필드**

### 이번 세션(2026-05-23 ~ 28) 완료
- **검색 강화 시리즈**: 한영 자판 매칭(browse + Typeahead) / Did you mean? / 카테고리 영어 별칭 + 대분류 부분일치
- **McIntosh 카탈로그 131개** 데이터 추가 (`Mcintosh.rtf` 파싱)
- **이미지 업로드 end-to-end**: Storage 버킷 + 폼 파일 input + 카드·상세 표시 + 비율 contain + onError fallback
- **판매 폼 정리**: 안내문 삭제 / 필수 표시 빨간 점(#ff555d) / condition 디폴트 "선택하세요"(회색) / 외관·작동 등급+자유입력 → specs jsonb → 상세 표시 / 5개 입력칸 정렬 통일
- **npm 의존성 추가**:
  - `es-hangul ^2.3.8` — 한글 자모 조합
  - `string-similarity ^4.0.4` + `@types/string-similarity ^4.0.2` — Dice 계수
- **테스트 매물**: `03366023-1966-4b5e-8553-4869e2c38d86` (McIntosh C 22, 외관/작동 specs 있음, 옛 더미 이미지 1장)

### 미해결 / 다음 할 일
- **기술 사양 16개 입력(SPEC_FIELDS) → DB 저장 미연결** (`specs` state는 있는데 `specsToSave`에 안 들어감. 외관/작동만 저장됨)
- **사용 안 되는 state 정리**: `title` / `finish` / `handmade` (5단계 변경 때 UI는 제거됐는데 state는 남음, `ListingInput`에도 그대로)
- **추가 RTF 파일 카탈로그화**: `Marantz.rtf` 등 4개 파일이 미사용 상태
- **PDP "비슷한 매물"·리뷰**: 아직 하드코딩 더미 → 매물 쌓이면 DB 연결
- **검색 다듬기**: "스피커" 검색에 "스피커 케이블" 섞임(부분일치 부작용)
- **RLS**: insert 정책 임시 (`listings_insert_temp`, Storage `listings_insert_temp`) → 로그인 생기면 본인만으로 조일 것
- **로그인·회원 미구현**
- **Storage 정리**: 검증용 더미 PNG 몇 장이 `listings` 버킷에 남아있음 (대시보드에서 수동 삭제)
- (참고) Perfect Circuit 폰트 = 본문 Libre Franklin / 제목 Roboto(700) — 적용은 보류
- (참고) 네트워크 보안 차단: "새롭게 발견된 도메인" / "DGA 도메인" 카테고리가 켜져 있으면 Vercel·Supabase 접속이 막힐 수 있음

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
