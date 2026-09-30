# Resonance — 빈티지 오디오 중고 마켓 (Next.js 14 + Supabase)
## 작업 규칙
- 사용자는 비개발자. 파악(수정 X)→제안→구현 순서, 한 번에 하나, 단계별 커밋, push는 사용자 확인 후
- 사용자 철학: 선택지를 주되 강제 안 함. 필드 다 제공·대부분 선택·필수 최소(브랜드/모델/카테고리/상태/가격). 의미 없는 필드는 showWhen으로 숨김
## 구조
- 루트 app/ = 진짜 라우터, src/app = 컴포넌트. 업로드 /sell/upload
- 스키마 중심: src/app/data/category-specs.ts (AMP/SPEAKER/SOURCE_SPEC_FIELDS) + src/lib/labels.ts (영문키→한글)
- 케이블은 매핑 없음 → spec-fields.ts 옛 SPEC_FIELDS로 폴백(앰프 필드 노출). 미해결. labels.ts에 케이블 라벨은 이미 있음
- 패턴: select는 영문키 저장+labels 변환, 조건부는 showWhen 술어(카테고리 __sub / 값 기반), 빈 값 저장·표시 제외, numSelect = 값+조건 조립, 빌더(크기/무게/드라이버/크로스오버/앰프출력 등)는 [값][비고]+"추가", X버튼 거터 규칙 동일
- 새 카테고리 = 해당 대분류 배열에 블록 추가 + 게이트 술어 (앰프에 AVR, 소스기기에 카세트 추가한 방식)
- src/lib/listings.ts mapRow는 옛 flat 키만 읽음 → specs.tech 스펙 필터 미연동 (다음 핵심 작업)
## 검증
- 변경 후 tsc + 형제 카테고리 회귀 (필드 누수 없나)
- UI는 측정보다 사용자 스크린샷 기준. 사용자 브라우저는 HMR 스테일 가능 → ⌘+Shift+R 안내
- 브라우저 확인은 Claude in Chrome(사용자 세션)으로, 읽기 전용. 변경은 지시 시에만
- 테스트 매물은 [테스트] 접두사. 삭제는 대시보드 SQL (anon 키는 RLS로 DELETE 불가)
## 인프라
- GitHub 계정은 shibakaito 하나로 통일 — 리포·Vercel·Supabase 공통. 다른 GitHub 계정 사용 X
- shibakaito/resonance main → Vercel resonance-ebon.vercel.app 자동 배포
- Supabase kaito Project(Free, ap-northeast-1). 7일 미사용 시 일시정지 → 대시보드 Resume(ref·키 유지, 약 2분). 스키마 supabase/listings.sql, 복구 스크립트 supabase/rls-storage.sql(새 프로젝트 재생성 시에만)
- 일시정지 방지: Vercel Cron 매일 /api/keepalive → listings select. 크론이나 라우트 지우면 7일 뒤 Supabase 다시 정지됨
- 키는 .env.local(NEXT_PUBLIC_SUPABASE_URL/ANON_KEY) + Vercel 환경변수 — 프로젝트 바뀌면 둘 다 갱신
- 2026-10-30 이후 새 테이블은 Data API GRANT 필요(rls-storage.sql 섹션 4 참고)
