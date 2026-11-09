# 디자인 현황 파악 (2026-11-10)

> 디자인 값을 한 곳(Tailwind 설정 + 전역 CSS)으로 모으기 전에, 지금 흩어진 값을 센 보고예요. 코드는 안 바꿨어요.
> 센 범위: `src/` 안의 실제로 쓰는 파일 28개. `src/app/components/ui/`(shadcn 부품 48개)는 **아무 데서도 import 하지 않아** 따로 봤어요(아래 ③).
> Tailwind는 4.1(설정 파일 `tailwind.config` 없음 — v4라 설정이 CSS 안 `@theme`에 있음). 전역 CSS는 `src/styles/index.css` → `fonts.css` + `tailwind.css` + `theme.css` (`globals.css`는 빈 파일).

---

## ① 값 세기

### 색 — 44종, 1,187회 (Tailwind 색 클래스 + hex 직접 지정 합침)

| 순위 | 색 | 횟수 | 메모 |
|---:|---|---:|---|
| 1 | `#000000` (`[#000000]`) | 258 | 검정 — hex로 박음 |
| 2 | `#e0e0e0` | 211 | 테두리 회색 — hex |
| 3 | `white` | 147 | |
| 4 | `gray-700` | 106 | |
| 5 | `#f7f7f7` | 105 | 옅은 배경 — hex |
| 6 | `gray-500` | 98 | |
| 7 | `gray-400` | 92 | |
| 8 | `gray-600` | 59 | |
| 9 | `red-500` | 13 | |
| 10 | `transparent` | 12 | |
| 11 | `gray-800` | 7 | |
| 12 | `#ff555d` | 7 | 필수 표시 점 |
| 13 | `slate-900` | 6 | |
| 14 | `blue-100` | 5 | |
| 15 | `green-500` | 5 | |

- 나머지 29종은 1~4회씩: blue(50~800 7종), amber(50~600 4종), green(100, 600, 800), red(50~700 4종), purple, pink, yellow, slate-700/800, gray-300, `#d93025`(경고 빨강), `#070a14`, `#f4f4f5`, `#3b82f6`.
- 회색이 두 갈래로 섞여 있어요: hex 회색(`#e0e0e0`, `#f7f7f7`, `#f4f4f5`)과 Tailwind 회색(`gray-300~800`), 거기에 `slate-*`까지.

### 글꼴

| 항목 | 종류 | 내용 |
|---|---:|---|
| 글꼴 패밀리 | 1 (+ mono 1회) | Paperlogy 하나. `font-mono` 1회 |
| 불러오는 방법 | — | `next/font` 아님. `src/styles/fonts.css`의 `@font-face` 9개(굵기 100~900), 파일은 `public/fonts/Paperlogy-*.ttf`(TTF, woff2 아님). `theme.css` body와 `--font-sans`에 지정, 대체 글꼴은 시스템(Apple SD Gothic Neo, 맑은 고딕) |
| 크기 클래스 | 10 | `text-sm` 148, `text-xs` 79, `text-2xl` 21, `text-xl` 11, `text-base` 8, `text-lg` 7, `text-[10px]` 5, `text-4xl` 3, `text-3xl` 3, `text-[26px]` 1 |
| 굵기 클래스 | 4 | `font-semibold` 135, `font-bold` 86, `font-medium` 17, `font-normal` 1 |

### 모서리 — 9종

| 클래스 | 횟수 |
|---|---:|
| `rounded-none` | 84 |
| `rounded-full` | 83 |
| `rounded-lg` | 53 |
| `rounded` | 19 |
| `rounded-xl` | 11 |
| `rounded-2xl` | 4 |
| `rounded-md` | 3 |
| `rounded-l-full`, `rounded-r-full` | 1, 1 |

각진 것(`rounded-none` 84)과 둥근 것(나머지 175)이 거의 반반이에요.

### 그림자 — 8종

| 클래스 | 횟수 |
|---|---:|
| `shadow-md` | 18 |
| `shadow-lg` | 16 |
| `shadow-sm` | 10 |
| `shadow-xl` | 3 |
| `shadow-2xl`, `shadow`, `shadow-none` | 1, 1, 1 |
| 임의값 `shadow-[0_-6px_20px_-6px_rgba(...),0_10px_20px_-6px_rgba(...)]` | 1 (상세 오른쪽 고정 칸) |

### 간격 (p-, m-, gap-, space-)

| 구분 | 종류 | 횟수 | 내용 |
|---|---:|---:|---|
| 4px 배수가 아닌 값(.5 단위 = 2, 6, 10, 14px) | 14 | 81 | `gap-1.5` 26, `py-1.5` 13, `py-2.5` 9, `py-0.5` 7, `px-1.5` 6, `mt-0.5` 6, `px-2.5` 5, `mt-2.5` 2, `mb-1.5` 2, `py-3.5`, `pl-2.5`, `pr-1.5`, `gap-0.5`, `mb-2.5` 각 1 |
| 임의값 `[...]` | 2 | 2 | `ml-[10px]`, `px-[12.5%]` |

- 간격 말고 높이와 너비에는 임의값이 더 있어요(예: 입력칸 높이 `h-[42px]`가 폼 전체에 반복).

---

## ② 설정 파일

| 파일 | 정의된 것 |
|---|---|
| `src/styles/theme.css` `:root` | 색 변수 31개(`--background`, `--foreground`, `--primary` `#030213`, `--muted` `#ececf0`, `--accent`, `--destructive` `#d4183d`, `--border`, `--input-background` `#f3f3f5`, `--ring`, `--chart-1~5`, `--sidebar-*` 8개 등), `--radius` 0.625rem, `--font-size` 16px, 굵기 변수 2개 |
| `theme.css` `.dark` | 위 색의 어두운 판 (다크 모드는 화면에서 안 씀) |
| `theme.css` `@theme inline` | `--font-sans`(Paperlogy), `--color-*` 32개(위 변수 연결), `--radius-sm/md/lg/xl` |
| `theme.css` `@layer base` | body 글꼴, h1~h4, label, button, input 기본 크기와 굵기 |
| `src/styles/fonts.css` | Paperlogy `@font-face` 9개 |
| `src/styles/globals.css` | 빈 파일 |
| `tailwind.config` | 없음 (Tailwind 4) |

**변수로 쓰는 곳과 직접 박힌 곳의 비율**

| | 횟수 | 비율 |
|---|---:|---:|
| 테마 변수로 쓰는 색 클래스(`bg-primary`, `text-muted-foreground`, `var(--…)` 등) | 0 | 0% |
| 직접 박힌 색(hex 직접 + Tailwind 기본 팔레트) | 1,187 | 100% |

`theme.css`의 변수와 `--radius`는 shadcn 기본값 그대로이고, 실제 화면 코드는 하나도 안 읽어요. 쓰이는 곳은 `@layer base`의 `border-border`, `bg-background`, `text-foreground`(전역 기본값) 정도예요.

---

## ③ 공통 부품 현황

| 부품 | 공통 부품 파일 | 부품 안 쓰고 직접 만든 곳 |
|---|---|---|
| 버튼 | 없음 (`ui/button.tsx`는 있지만 안 씀) | `<button>` 141곳(폼 47, 상세 29, 홈 25, 필터 부품 11, 헤더 8, 검색 6, 둘러보기 6, 모달 6, 카드 2, 선택 부품 1). 모양을 매번 클래스로 씀 |
| 입력칸 — 텍스트, 숫자 | 없음 (`ui/input.tsx` 안 씀) | `<input>` 52곳(폼 34, 홈 7, 필터 부품 7, 모달 2, 둘러보기 1, 검색 1). 대부분 `h-[42px] border-[#e0e0e0] rounded-none …` 복사 |
| 입력칸 — 드롭다운(검색형) | 파일 안에만 있음: 폼의 `Typeahead`(`upload-page.tsx`, 9곳), 홈의 `Combobox`(`home-page.tsx`) — 같은 일을 하는 부품이 두 벌 | — |
| 입력칸 — 드롭다운(선택) | 폼 선택 부품 `choice-field.tsx` `ChoiceField`(버튼 / 드롭다운 자동, 폼 9곳) | 기본 `<select>` 17곳(폼 15, 상세 1, 둘러보기 정렬 1). 폼의 다중 선택 `MultiSelectDropdown`, `ImpedanceSelect`는 `upload-page.tsx` 안에만 |
| 필터 칸 | `filter-controls.tsx`(`FilterSection` 47곳, `RangeSection` 8곳, 드롭다운 3종), `filter-modal.tsx`(`Section`, `CheckGroup`, `MinMaxRow`) | 사이드바와 모달이 서로 다른 부품을 씀 |
| 카드 | 없음 | 매물 카드 5벌: 둘러보기 `listing-grid.tsx`, 홈 추천 매물, 홈 관심 매물, 상세 비슷한 매물 2곳(가짜 데이터) |
| 배지 | `condition-badge.tsx` `ConditionBadge`(상태 배지, 3곳) | 작은 배지 9곳 정도(상세 "수제품", 개수 표시 등)를 직접 만듦 |
| 모달 | 없음 (`ui/dialog.tsx`, `ui/sheet.tsx` 안 씀) | 필터 모달 1곳(`filter-modal.tsx`, `fixed inset-0` 직접) |

- `src/app/components/ui/` 48개 파일(shadcn: button, input, card, badge, dialog, select 등)은 전부 import 0회예요. 지울지 살릴지 정할 대상이에요.

---

## ④ web-design-guidelines 검사 (홈, 둘러보기 + 필터, 매물 상세, 등록 폼)

규칙: `vercel-labs/web-interface-guidelines` 최신본(2026-11-10 받음, 191줄). 정규식으로 훑고 몇 곳은 직접 열어 확인했어요. 고치지 않았어요.
대상 파일: 홈 `home-page.tsx` `site-header.tsx` `site-footer.tsx` / 둘러보기 `browse-page.tsx` `filter-controls.tsx` `filter-modal.tsx` `listing-grid.tsx` / 상세 `listing-detail.tsx` / 폼 `upload-page.tsx` `choice-field.tsx`

### 높음 — 키보드, 화면 읽기 사용자가 막히거나 기능이 비어 있음

| # | 항목 | 쪽 | 개수 | 예 |
|---:|---|---|---:|---|
| 1 | 라벨이 입력칸과 연결 안 됨(`htmlFor` 없음, 칸을 감싸지도 않음) → 라벨 눌러도 칸에 안 감, 화면 읽기가 칸 이름을 못 읽음 | 폼 46, 홈 4, 둘러보기 3 | 53 | `upload-page.tsx:1324`, `home-page.tsx:528`, `filter-controls.tsx:111` |
| 2 | `focus:outline-none` 뒤 대체 포커스 표시가 테두리 색 바뀜뿐이거나 아예 없음, `focus-visible` 안 씀 | 폼 49, 둘러보기 11(대체 없음 6), 홈 3(대체 없음 1), 상세 1 | 64 | `filter-controls.tsx:477`, `home-page.tsx:231`, `upload-page.tsx:2598` |
| 3 | 필터 모달에 `role="dialog"`, `aria-modal`, Esc로 닫기, 포커스 가두기, `overscroll-behavior: contain` 없음 | 둘러보기 | 1 | `filter-modal.tsx:536` |
| 4 | 아이콘만 있는 버튼에 `aria-label` 없음 (폼 설명 칸의 굵게 / 기울임 / 목록 버튼 3개는 누르는 동작도 없음) | 폼 5, 홈 2, 상세 1 | 8 | `home-page.tsx:676`(검색), `upload-page.tsx:2583` |
| 5 | `href="#"` 빈 링크 | 헤더, 푸터 14, 상세 1("등급 기준 자세히 보기") | 15 | `site-footer.tsx:16`, `listing-detail.tsx:510` |
| 6 | 폼 입력칸에 `autoComplete`, `name` 없음 | 폼 | 0/34 | `upload-page.tsx` 전체 |

### 중간 — 화면 품질, 쓰기 불편

| # | 항목 | 쪽 | 개수 | 예 |
|---:|---|---|---:|---|
| 7 | `<img>`에 `width`/`height` 없음(화면 밀림), `loading` 지정 없음 | 홈 7, 상세 4, 둘러보기 2, 폼 2 | 15 | `listing-grid.tsx:49`, `home-page.tsx:490` |
| 8 | 필터 상태가 주소에 안 남음(처음 들어올 때만 주소를 읽음) → 새로고침, 공유하면 필터가 사라짐 | 둘러보기 | — | `browse-page.tsx` |
| 9 | 링크가 아니라 `onClick`으로 이동 → 새 탭 열기(Cmd+클릭) 안 됨 | 헤더 | 3 | `site-header.tsx:66`, `:202`, `:204` |
| 10 | `transition-all` | 상세 | 12 | `listing-detail.tsx:164` |
| 11 | 움직임 줄이기(`prefers-reduced-motion`) 대응이 사이트 어디에도 없음(메가 메뉴 펼침 등) | 전체 | — | `theme.css` `megaUnroll` |

### 낮음

| # | 항목 | 개수 |
|---:|---|---:|
| 12 | 본문 건너뛰기 링크 없음, `<meta name="theme-color">` 없음 | — |
| 13 | 가격 등 숫자 비교 칸에 `tabular-nums` 없음 | 0곳 사용 |
| 14 | 글꼴 TTF 9개를 `@font-face`로만 불러옴(woff2, preload 없음) | 9 |

- 오탐으로 뺀 것: "..." 말줄임표 2곳은 주석이었어요(`upload-page.tsx:1113`, `:1117`).

---

## ⑤ Pretendard

| 질문 | 답 |
|---|---|
| 지금 들어 있나 | 없음. 패키지(`package.json`), 글꼴 파일(`public/fonts`), CSS 어디에도 없음. 지금 글꼴은 Paperlogy(TTF 9개, `@font-face`) |
| `next/font`로 넣을 때 필요한 것 | 파일. Pretendard는 Google Fonts에 없어서 `next/font/google`로는 못 쓰고, `next/font/local`에 `PretendardVariable.woff2` 파일 하나(직접 받거나 npm `pretendard` 패키지 안의 같은 파일)를 지정하면 돼요 |

---

# 디자인 2단계: 설정 잡기 (2026-11-10)

- 글꼴: Pretendard Variable woff2 한 파일(`src/fonts/PretendardVariable.woff2`, 2,057,688바이트 = 2.06MB, npm `pretendard@1.3.9`)을 `app/layout.tsx`에서 `next/font/local`로 불러 `--font-sans`에 연결. Paperlogy `@font-face`(`fonts.css`)와 TTF 9개(합계 약 11MB) 삭제.
- 토큰(`src/styles/theme.css` `@theme`): 색 6(bg #ffffff, surface #f7f7f7, line #e0e0e0, fg #000000, muted = gray-700 값 `oklch(37.3% 0.034 259.733)`, danger #d93025), 간격 4px, 글자 크기 6단(`text-12`~`text-32`), 굵기 3(`font-regular`, `font-medium`, `font-bold`). 글자 크기와 굵기는 아직 강제 안 함.
- 모서리 변수 전부 0, 그림자 변수 전부 없음 + 정적 값(`rounded-full` 등)과 임의값 그림자도 0이 되게 `@layer utilities` 한 덩어리.
- 값이 같은 치환: `[#000000]` → fg 258, `[#e0e0e0]` → line 211, `[#f7f7f7]` → surface 105, white → bg 148(레이아웃 1 포함), gray-700 → muted 106, `[#d93025]` → danger 2. 토큰 사용 비율 0% → 69.9%(1,188회 중 830회).

## ⑤ 남은 색 매핑표 (고치지 않음)

| 지금 색 | 횟수 | 주로 쓰는 곳 | 보낼 토큰 | 메모 |
|---|---:|---|---|---|
| gray-500 | 98 | 보조 글자, 개수, 아이콘 | muted | **결정 필요** — gray-700(muted)보다 밝음. 보조 글자를 한 단계로 합칠지, 두 번째 보조색(예: muted-2)을 둘지 |
| gray-400 | 92 | 비활성 글자, 자리 표시, 아이콘 | muted | **결정 필요** — 더 밝음. 비활성 표시는 따로 둘지 |
| gray-600 | 59 | 보조 글자 | muted | 값 가까움 |
| gray-800 | 7 | 헤더 메뉴 글자 | fg | |
| gray-300 | 2 | 구분선 | line | |
| slate-900 | 6 | 홈 탭 선택, 어두운 배너 | fg | |
| slate-700, slate-800 | 3, 1 | 어두운 배너 그라데이션, 말풍선 | fg | **결정 필요** — 그라데이션은 없앨지 |
| black | 4 | 검정 | fg | 값 같음(#000). 이번 블록 목록 밖이라 안 바꿈 |
| `#070a14` | 1 | 홈 첫 화면 배경 | fg | 값 거의 같음 |
| `body` 기본 글자색 `oklch(0.145 0 0)` | 전역 | 클래스 없는 글자 전부 | fg | **결정 필요** — #000000 과 아주 조금 다름(예전 shadcn 값 그대로 둠) |
| 기본 테두리색 `rgba(0,0,0,0.1)` | 전역 | 색 안 적은 테두리 전부 | line | **결정 필요** — 흰 바탕에서 #e6e6e6 정도, line(#e0e0e0)보다 옅음 |
| 기본 외곽선색(ring 50%) | 전역 | 포커스 외곽선 | — | **결정 필요** — 포커스 색 토큰을 따로 둘지 |
| `#f4f4f5` | 1 + CSS 2 | 폼 입력칸 회색 채움(`theme.css` `#section-info`, `.spec-field`, `ImpedanceSelect`) | surface | 값 다름(#f7f7f7). 합쳐도 거의 안 보임 |
| `#717182` | CSS 2 | 폼 라벨 회색(`theme.css`) | muted | **결정 필요** — 보라빛 회색 |
| `#3b82f6` | 1 + CSS 2 | 폼 입력칸 포커스 파랑 | — | **결정 필요** — 포커스 색 토큰(예: focus)을 둘지, fg 로 갈지 |
| red-500 | 13 | 찜 하트, 상세 할인 배지 | danger | **결정 필요** — 찜 하트는 경고가 아니라 강조색 |
| red-50, red-200, red-600, red-700 | 2, 2, 1, 2 | 오류 안내 박스 | danger | 옅은 면(red-50)은 **결정 필요** — danger 옅은 판을 둘지 |
| `#ff555d` | 7 | 폼 필수 표시 점 | danger | **결정 필요** — 필수 표시를 빨강으로 둘지 fg 로 갈지 |
| green-100, green-800 | 2, 2 | 상태 배지(초록) | — | **결정 필요** — 상태 배지 색. 각진 흑백으로 갈지 초록 토큰(예: ok)을 둘지 |
| green-500, green-600 | 5, 3 | 폼 시세 카드(숨김), 막대 | — | 숨긴 기능. 켤 때 결정 |
| purple-400, purple-500 | 2, 1 | 시세 카드 막대(폼 숨김), 상세 가격 막대 | — | **결정 필요** — 그래프 색 |
| blue-50, 100, 200, 500, 600, 700, 800 | 1, 5, 1, 2, 4, 2, 1 | 검색 결과 쪽 안내 카드, 링크 | — | **결정 필요** — 정보, 링크 색 토큰을 둘지 |
| amber-50, 100, 200, 600 | 2, 3, 1, 3 | 검색 결과 쪽 판매 안내 카드 | — | **결정 필요** — 주의 색 |
| yellow-200 | 2 | 폼 검색 글자 강조 | — | **결정 필요** — 강조 바탕색 |
| pink-500 | 2 | 상세 판매자 아바타 그라데이션 | — | 그라데이션 없앨지 **결정 필요** |
| transparent | 12 | 투명 | 그대로 | 토큰 아님 |

- 각진 모서리에서 빠진 것: 등록 폼 배송 방식의 기본 라디오 버튼 3개(브라우저 기본 동그라미, 클래스가 아님).
