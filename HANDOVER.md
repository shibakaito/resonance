# Grace Project — Resonance 마켓플레이스 인수인계

> **최종 업데이트: 2026-05-19**
> 새 세션에서 `cat HANDOVER.md` 또는 파일 첨부로 즉시 컨텍스트 복원 가능.

## 0. 프로젝트 개요
- **이름**: Resonance (오디오 중고 마켓플레이스 프로토타입)
- **위치**: `/Users/igeon-yeong/Downloads/Grace Project/`
- **스택**: Vite + React + TypeScript + Tailwind v4 + React Router v6 + shadcn UI
- **빌드/실행**: `npm run dev` (개발), `npm run build` (빌드)
- **현재 코드 규모**: ~12,107 라인 (직접 작성 ~7K, shadcn UI ~5K)

## 1. 현재 카테고리 구조 (6개 최상위)
```
앰프 ─ BY TYPE: 프리/파워/인티/포노 스테이지/헤드폰/네트워크/리시버/AV 리시버
       ETC: 액세서리 / 파워 서플라이 / 부품 / 소모품

스피커 ─ BY TYPE: 북쉘프/플로어 스탠딩/톨보이/센터/사운드바/서브우퍼
         ETC: 액세서리 / 케이블 / 드라이버 / 네트워크 / 기타 부품

소스기기 ─ 아날로그 / 디지털 / 튜너 / AV (4그룹 14항목)

액세서리 ─ 전원 장치 / 거치·받침 / 진동 제어 (3그룹 12항목)

턴테이블 ─ BY TYPE / 카트리지+액세서리 / 포노 스테이지 / 톤암+액세서리 / 턴테이블 액세서리 (5그룹 25항목)

케이블 ─ 평면 14항목 (RCA/XLR/스피커/파워/디지털 동축/광/USB/AES-EBU/BNC/HDMI/포노/점퍼/헤드폰/이어폰)
```

### 삭제됐던 카테고리 (백업 있음)
- 부품/수리, 음반/미디어 → `backup/parts-media-2026-05-18.md`에 코드 보관

### 카테고리 간 연동 (CROSS_LISTING)
`browse-page.tsx`의 `CROSS_LISTING` 객체:
- `포노 스테이지` ↔ `MM/MC 포노앰프` (앰프와 턴테이블이 동일 매물 공유)

### 라우팅 재매핑 (`App.tsx` goBrowse)
특수 케이스만 다른 top 페이지로 redirect:
| 클릭 | → 이동 |
|---|---|
| 턴테이블 > 턴테이블 | 소스기기 > 턴테이블 |
| 앰프/스피커 > 액세서리 | 액세서리 top |
| 스피커 > 케이블 | 케이블 top |
| 앰프 > 파워 서플라이 | 액세서리 > 리니어 전원장치 |

## 2. 색상 팔레트 (모노톤)
```
배경:        #FFFFFF (white)
보조 배경:   #F7F7F7
구분선/칩:   #E0E0E0
강조/텍스트: #000000 (pure black)
중간 회색:   gray-400~800 (본문/보조 텍스트, 변경 안 함)
```
오렌지 액센트는 모두 검정으로 교체 완료. Tailwind 임의값 문법 (`bg-[#f7f7f7]`) 사용.

푸터는 다크 — `bg-[#000000] text-white`, `text-gray-400` 보조.

## 3. 핵심 파일
| 파일 | 역할 | 라인 |
|---|---|---|
| `src/app/App.tsx` | 헤더·메가 메뉴·라우팅·PDP·푸터 | ~1,440 |
| `src/app/components/browse-page.tsx` | 매물 브라우즈 + 필터 시스템 (가장 복잡) | 2,295 |
| `src/app/components/home-page.tsx` | 홈 페이지 | 1,068 |
| `src/app/components/upload-page.tsx` | 매물 업로드 (더미) | 667 |
| `src/app/data/catalog.ts` | 카테고리 트리 + CATALOG 매물 데이터 | 519 |
| `src/app/data/cable-terminals.ts` | 케이블 단자 매핑·시드 | 144 |
| `src/app/data/category-slugs.ts` | URL 슬러그 매핑 (한↔영) | 138 |
| `src/app/data/category-meta.ts` | 카테고리 메타 (제목·SEO) | 85 |

## 4. URL 라우팅 구조 (React Router)
```
/                    → 홈
/browse              → 전체 매물
/browse/:cat         → 카테고리 (예: /browse/turntable)
/browse/:cat/:sub    → 서브 (예: /browse/turntable/mm-cartridge)
/listing/:id         → PDP (현재 /listing/1 하드코딩)
/sell, /sell/upload  → 판매 흐름
```

한글 카테고리 → 영문 슬러그 (`category-slugs.ts`):
- 앰프 → `amps` / 스피커 → `speakers` / 소스기기 → `sources`
- 액세서리 → `accessories` / 턴테이블 → `turntable` / 케이블 → `cables`

## 5. 헤더 메가 메뉴 (Shop by Category)
- "Shop by Category" 알약 버튼 (로고 옆) — **클릭으로** 열림 (호버 X)
- 사이드바(좌 256px) + 디테일(우) 구조 — Perfect Circuit 스타일
- 박스 크기 **고정**: `w-[1120px] h-[680px]`
- 백드롭: `fixed inset-0 bg-black/20 backdrop-blur-sm`
- 사이드바 호버 시 우측 디테일 전환 (메가 메뉴 안에서)
- 내부 스크롤 없음, 배경 스크롤 잠금 없음 (해제 완료)
- 그룹 헤더 `text-[#000000]`, 항목 `text-[#000000]`, hover `opacity-60`

## 6. 케이블 필터 시스템 (특별히 정교한 부분)
`cable-terminals.ts`
- `CABLE_TERMINALS`: 14개 케이블 카테고리별 가용 단자 풀
- `pickTerminalPair(category, seed)`: 매물별 입력/출력 단자 결정 (9개 분기)
  - 이어폰 케이블: PLAYER → IEM (분리)
  - 헤드폰 케이블: PLAYER → CUP (분리)
  - USB 케이블: HOST → DEVICE (USB-C 양쪽 풀)
  - 파워 케이블: 콘센트 → IEC
  - 포노: DIN-DIN 금지 (60% DIN→RCA, 40% RCA-RCA)
  - 점퍼: 100% 양쪽 동일
  - HDMI: 94% HDMI-HDMI
  - 광: Mini-Mini 금지
  - 그 외: 75% 양쪽 동일

`browse-page.tsx`의 필터:
- 입력/출력 단자 (각각 별도 드롭다운, 카테고리별 우선순위 정렬)
- 도체 8종 (`일반 구리 / OFC / OCC / UP-OCC / 은도금 구리 / 순은 / 하이브리드 / 기타`)
- 도금 5종 (`금도금 / 로듐 도금 / 은도금 / 니켈 도금 / 무도금`)
- 차폐, 페어, 방향성, 길이 등

## 7. 현재 데이터 상태
- **CATALOG 비어 있음** (436개 더미 매물 모두 삭제)
- 모든 카테고리 페이지에서 "매물 없음" 표시
- 필터 UI는 정상, 다만 매칭 결과 0건

원래 있던 매물은 git 이전 커밋이나 시드 함수로 복원 가능 (현재 별도 백업 없음).

## 8. 백엔드 상태
**없음**. 순수 프론트엔드 SPA.
- 이미지 업로드: 더미 (sampleImages 순환만)
- 사용자 인증: 없음
- 결제: 없음
- DB: 없음 (catalog.ts 정적 데이터)

실서비스로 만들려면 Supabase/Firebase 같은 BaaS 추천.

## 9. 빌드 결과
- 번들 JS: ~436 KB (gzipped ~125 KB)
- React Router 도입 후 ~40 KB 증가했었음
- 1,650+ modules transformed

## 10. 진행 중인 작업 / 다음 단계 후보
1. **백엔드 도입** — Supabase 추천 (Auth + DB + Storage 통합)
2. **이미지 업로드** — `<input type="file">` + Storage presigned URL
3. **카테고리별 더미 매물 생성** — Cabinet.ts CATALOG 채워넣기
4. **부품/수리, 음반/미디어 재추가** (백업 파일 활용)
5. **PDP에 실제 listing ID 라우팅** — 현재 `/listing/1` 하드코딩
6. **검색 필터 쿼리 파라미터 URL 보존** — `/browse/cables?brand=...&min=...`
7. **`browse-page.tsx` 2,295줄 분리 리팩토링** — 너무 비대함

## 11. 최근 작업 이력
1. ✅ 케이블 입력/출력 단자 분리 + 카테고리별 단자 매핑
2. ✅ 도체·도금 옵션 정비, NOS 등급 추가
3. ✅ 턴테이블 액세서리 신설 → 턴테이블로 이름 변경 + 그룹 재구조화
4. ✅ Perfect Circuit 스타일 메가 메뉴 (사이드바 + 디테일)
5. ✅ React Router 도입, URL 라우팅, 슬러그 매핑, SEO 메타
6. ✅ 다중 카테고리 등록 (CROSS_LISTING), 라우팅 재매핑
7. ✅ 부품/수리·음반/미디어 일시 제거 (백업 있음)
8. ✅ 오렌지 → 모노톤(블랙·#F7F7F7·#E0E0E0) 전체 교체
9. ✅ 메가 메뉴 박스 크기 고정 (1120×680px), 스크롤 락 해제
10. ✅ CATALOG 더미 매물 전부 삭제 (방금)

## 12. 새 세션 시작 시
1. `cat HANDOVER.md` 또는 파일 첨부로 컨텍스트 복원
2. 작업 디렉토리: `/Users/igeon-yeong/Downloads/Grace Project`
3. 메모리에 자동 로드되는 정보: 한국어 사용자, 코딩 초보, 한국어 맞춤법 검토 필요
4. 빌드 검증 명령: `cd "/Users/igeon-yeong/Downloads/Grace Project" && npm run build`
5. 백업 디렉토리: `backup/parts-media-2026-05-18.md`

## 13. 작업 시 주의
- 큰 파일(browse-page.tsx) 편집 전 항상 `Read`로 정확한 위치 확인
- 카테고리·sub 이름 변경 시 **3~4곳 동시 수정 필수**:
  - `catalog.ts` CATEGORY_TREE
  - `browse-page.tsx` (GROUPS 상수, isXxx 플래그)
  - `App.tsx` (MEGA_CATS, catGroups, 라우팅 재매핑)
  - `category-slugs.ts` SUB_SLUGS
  - (해당되면) `category-meta.ts`, `cable-terminals.ts`
- 한국어 표기 검토: 외래어 한 단어는 붙여서 (모노블록, 톨보이 등)
- 색상 변경 시 5개 파일 일괄 sed 권장
