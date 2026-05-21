# 부품/수리 + 음반/미디어 백업 (2026-05-18)

두 카테고리를 일시 제거함. 향후 복원 시 아래 코드 그대로 다시 넣으면 됨.

## 1. catalog.ts — CATEGORY_TREE 항목

```ts
{ top: '부품/수리', subs: ['진공관', '트랜지스터', '콘덴서', '저항', '릴레이', '볼륨 / 포텐셔미터', '스위치', '노브', '버튼', 'RCA 단자', 'XLR 단자', '스피커 단자', '헤드폰 잭', '광 단자', 'USB 단자', '디지털 동축 단자', 'HDMI 단자', '전원 인렛', '전원 트랜스', '출력 트랜스', '입력 트랜스/인터스테이지', '초크', '벨트', '램프', 'LED', '모터', '포노 카트리지/스타일러스', '광 픽업 (CD/DVD/SACD/LD)', '우드 케이스', '완제품 부품용 (분해/수리용)'] },
{ top: '음반 / 미디어', subs: ['LP (12인치)', 'EP / 싱글 (7인치)', '10인치 LP', '카세트테이프', '오픈릴 테이프', 'DAT 테이프', '8트랙 카트리지', 'CD', 'SACD', 'MiniDisc (MD)', 'DSD / 디지털 파일', 'LD', 'DVD', '블루레이', 'UHD 블루레이', '테스트 음반'] },
```

## 2. App.tsx — MEGA_CATS 변경 전

```ts
const MEGA_CATS = ['앰프', '스피커', '소스기기', '액세서리', '턴테이블 액세서리', '케이블', '부품/수리', '음반 / 미디어'] as const;
```

## 3. App.tsx — catGroups 분기

```ts
if (cat === '부품/수리') return PARTS_GROUPS;
if (cat === '음반 / 미디어') return MEDIA_GROUPS;
```

## 4. browse-page.tsx — 부품/수리 전용 상수

```ts
// 부품/수리 전용 상태 등급
const PART_CONDITIONS = ['신품 (NOS 포함)', '사용감 적음', '일반 사용감', '사용감 많음', '정크/부품용'];
const VERIFICATION_OPTS = ['테스트 완료', '측정값 첨부', '작동 미확인', '페어 매칭'];
// 진공관 전용
const TUBE_TYPES = ['출력관', '정류관', '전압증폭관', '정전압관'];
const PAIR_MATCH_OPTS = ['단품', '페어 (2개)', '쿼드 (4개)'];

// 부품/수리 카테고리: 모달에서만 그룹별로 표시
export const PARTS_GROUPS: { title: string; items: string[] }[] = [
  { title: '능동 소자', items: ['진공관', '트랜지스터'] },
  { title: '수동 소자', items: ['콘덴서', '저항', '릴레이'] },
  { title: '기구 부품', items: ['볼륨 / 포텐셔미터', '스위치', '노브', '버튼'] },
  { title: '단자/커넥터', items: ['RCA 단자', 'XLR 단자', '스피커 단자', '헤드폰 잭', '광 단자', 'USB 단자', '디지털 동축 단자', 'HDMI 단자', '전원 인렛'] },
  { title: '트랜스/전원', items: ['전원 트랜스', '출력 트랜스', '입력 트랜스/인터스테이지', '초크'] },
  { title: '소모품', items: ['벨트', '램프', 'LED', '모터'] },
  { title: '픽업', items: ['포노 카트리지/스타일러스', '광 픽업 (CD/DVD/SACD/LD)'] },
  { title: '외장재', items: ['우드 케이스'] },
  { title: '기타', items: ['완제품 부품용 (분해/수리용)'] }
];
```

## 5. browse-page.tsx — 음반/미디어 전용 상수

```ts
// 음반 / 미디어 카테고리: 모달에서만 그룹별로 표시
export const MEDIA_GROUPS: { title: string; items: string[] }[] = [
  { title: '아날로그 음반', items: ['LP (12인치)', 'EP / 싱글 (7인치)', '10인치 LP', '카세트테이프', '오픈릴 테이프', 'DAT 테이프', '8트랙 카트리지'] },
  { title: '디지털 음반', items: ['CD', 'SACD', 'MiniDisc (MD)', 'DSD / 디지털 파일'] },
  { title: '영상 미디어', items: ['LD', 'DVD', '블루레이', 'UHD 블루레이'] },
  { title: '테스트/특수', items: ['테스트 음반'] }
];

// 음반/미디어 전용 필터 옵션
const GENRES = ['클래식', '재즈', '팝', '록', '한국 가요 / K-pop', '힙합 / R&B', '일렉트로닉', '블루스', '컨트리 / 포크', '월드뮤직', 'OST / 사운드트랙', '종교음악', '기타'];
const MUSIC_FORMS = ['보컬', '인스트루멘탈'];
const MUSIC_REGIONS = ['한국', '영미', '유럽', '일본', '기타 아시아'];
const CLASSICAL_DETAILS = ['바로크', '고전', '낭만', '현대', '교향곡', '협주곡', '실내악', '오페라', '성악'];
```

## 6. browse-page.tsx — Listing 필드

```ts
// 부품/수리 전용
partCondition: string;
verification: string;
tubeType: string;
pairMatch: string;
// 음반/미디어 전용
genre: string;
musicForm: string;
musicRegion: string;
classicalDetail: string;
```

## 7. browse-page.tsx — Filters 필드

```ts
// 부품/수리 전용
partCondition: Set<string>;
verification: Set<string>;
tubeType: Set<string>;
pairMatch: Set<string>;
// 음반/미디어 전용
genre: Set<string>;
musicForm: Set<string>;
musicRegion: Set<string>;
classicalDetail: Set<string>;
```

## 8. browse-page.tsx — buildListings seed 값

```ts
partCondition: PART_CONDITIONS[(seed >> 2) % PART_CONDITIONS.length],
verification: VERIFICATION_OPTS[(seed >> 4) % VERIFICATION_OPTS.length],
tubeType: TUBE_TYPES[(seed >> 6) % TUBE_TYPES.length],
pairMatch: PAIR_MATCH_OPTS[(seed >> 8) % PAIR_MATCH_OPTS.length],
// 음반/미디어 매물이 시드 데이터에 아직 없어 빈 값 (필터 UI는 노출되지만 매칭 0건)
genre: '',
musicForm: '',
musicRegion: '',
classicalDetail: ''
```

## 9. browse-page.tsx — applyFilters 분기

```ts
function applyFilters(list: Listing[], f: Filters, isAmp: boolean, isSpeaker: boolean, isTurntable: boolean, isPowerDevice: boolean, isCable: boolean, isParts: boolean, isPartTube: boolean, isMedia: boolean): Listing[] {
  // ...
  if (!isParts && f.condition.size > 0) r = r.filter((l) => f.condition.has(l.condition));
  if (isParts) {
    if (f.partCondition.size > 0) r = r.filter((l) => f.partCondition.has(l.partCondition));
    if (f.verification.size > 0) r = r.filter((l) => f.verification.has(l.verification));
  }
  // ...
  if (isPartTube) {
    if (f.tubeType.size > 0) r = r.filter((l) => f.tubeType.has(l.tubeType));
    if (f.pairMatch.size > 0) r = r.filter((l) => f.pairMatch.has(l.pairMatch));
  }
  if (isMedia) {
    if (f.genre.size > 0) r = r.filter((l) => f.genre.has(l.genre));
    if (f.musicForm.size > 0) r = r.filter((l) => f.musicForm.has(l.musicForm));
    if (f.musicRegion.size > 0) r = r.filter((l) => f.musicRegion.has(l.musicRegion));
    if (f.classicalDetail.size > 0) r = r.filter((l) => f.classicalDetail.has(l.classicalDetail));
  }
}
```

## 10. browse-page.tsx — 카테고리 플래그

```ts
const isParts = category === '부품/수리';
const isMedia = category === '음반 / 미디어';
// 진공관 단독 시 진공관 전용 필터
const isPartTube = isParts && [...subCategories].some((s) => s === '진공관');
```

## 11. browse-page.tsx — 모달 그룹 렌더

부품/수리:
```tsx
{isParts && PARTS_GROUPS.map((g) => (
  <Section key={g.title} title={g.title} defaultOpen>
    <CheckGroup options={g.items} selected={draftSubCategories} onToggle={toggleDraftSubCategory} counts={counts.subcategory} />
  </Section>
))}
```

음반/미디어:
```tsx
{isMedia && MEDIA_GROUPS.map((g) => (
  <Section key={g.title} title={g.title} defaultOpen>
    <CheckGroup options={g.items} selected={draftSubCategories} onToggle={toggleDraftSubCategory} counts={counts.subcategory} />
  </Section>
))}
{isMedia && (
  <>
    <Section title="장르" defaultOpen>
      <CheckGroup options={GENRES} selected={draft.genre} onToggle={toggleIn('genre')} counts={counts.genre} />
    </Section>
    {draft.genre.has('클래식') && (
      <Section title="클래식 세부" defaultOpen>
        <CheckGroup options={CLASSICAL_DETAILS} selected={draft.classicalDetail} onToggle={toggleIn('classicalDetail')} counts={counts.classicalDetail} />
      </Section>
    )}
    <Section title="음악 형태" defaultOpen>
      <CheckGroup options={MUSIC_FORMS} selected={draft.musicForm} onToggle={toggleIn('musicForm')} counts={counts.musicForm} />
    </Section>
    <Section title="지역/언어" defaultOpen>
      <CheckGroup options={MUSIC_REGIONS} selected={draft.musicRegion} onToggle={toggleIn('musicRegion')} counts={counts.musicRegion} />
    </Section>
  </>
)}
```

진공관 전용 (parts 안):
```tsx
{draftIsPartTube && (
  <>
    <Section title="관 종류" defaultOpen>
      <CheckGroup options={TUBE_TYPES} selected={draft.tubeType} onToggle={toggleIn('tubeType')} counts={counts.tubeType} />
    </Section>
    <Section title="페어 매칭" defaultOpen>
      <CheckGroup options={PAIR_MATCH_OPTS} selected={draft.pairMatch} onToggle={toggleIn('pairMatch')} counts={counts.pairMatch} />
    </Section>
  </>
)}
```

부품 상태/검증 (parts 안):
```tsx
{isParts ? (
  <CheckGroup options={PART_CONDITIONS} selected={draft.partCondition} onToggle={toggleIn('partCondition')} counts={counts.partCondition} />
) : (
  <CheckGroup options={CONDITIONS} selected={draft.condition} onToggle={toggleIn('condition')} counts={counts.condition} />
)}
{isParts && (
  <Section title="검증 상태" defaultOpen>
    <CheckGroup options={VERIFICATION_OPTS} selected={draft.verification} onToggle={toggleIn('verification')} counts={counts.verification} />
  </Section>
)}
```

상단 필터 바:
```tsx
options={isParts ? PART_CONDITIONS : CONDITIONS}
selected={isParts ? filters.partCondition : filters.condition}
onToggle={isParts ? toggleField('partCondition') : toggleField('condition')}
counts={isParts ? counts.partCondition : counts.condition}
```

## 12. browse-page.tsx — Counts 집계

```ts
partCondition: countBy(categoryListings, (l) => l.partCondition),
verification: countBy(categoryListings, (l) => l.verification),
tubeType: countBy(categoryListings, (l) => l.tubeType),
pairMatch: countBy(categoryListings, (l) => l.pairMatch),
genre: countBy(categoryListings, (l) => l.genre),
musicForm: countBy(categoryListings, (l) => l.musicForm),
musicRegion: countBy(categoryListings, (l) => l.musicRegion),
classicalDetail: countBy(categoryListings, (l) => l.classicalDetail)
```

## 13. browse-page.tsx — Active chips setFieldKeys

```ts
{ key: 'partCondition', partsOnly: true },
{ key: 'verification', prefix: '검증', partsOnly: true },
{ key: 'tubeType', partTubeOnly: true },
{ key: 'pairMatch', partTubeOnly: true },
{ key: 'genre', prefix: '장르', mediaOnly: true },
{ key: 'classicalDetail', prefix: '클래식', mediaOnly: true },
{ key: 'musicForm', mediaOnly: true },
{ key: 'musicRegion', prefix: '지역', mediaOnly: true }
```

조건 destructure: `{ ..., partsOnly, partTubeOnly, mediaOnly }` + `if (partsOnly && !isParts) continue;` 식으로 분기.

## 14. category-slugs.ts — TOP_SLUGS 항목

```ts
'부품/수리': 'parts',
'음반 / 미디어': 'media',
```

## 15. category-slugs.ts — SUB_SLUGS 항목

부품/수리 sub 30개 + 음반/미디어 sub 16개 — 자세한 매핑은 git 이전 커밋 또는 위 catalog.ts subs 참조.

## 16. category-meta.ts — TOP_META 항목

```ts
'부품/수리': {
  title: '부품 / 수리',
  description: '진공관, 콘덴서, 트랜스, 단자 등 빈티지·DIY용 부품과 수리 자재.',
  docTitle: '오디오 부품·수리용 매물 | Resonance',
  metaDesc: '진공관, 콘덴서, 저항, 트랜스, 카트리지 등 부품 및 수리 자재 매물.'
},
'음반 / 미디어': {
  title: '음반 / 미디어',
  description: 'LP, CD, SACD, 테이프, LD/DVD 등 음원·영상 미디어.',
  docTitle: '음반·미디어 매물 | Resonance',
  metaDesc: 'LP, CD, SACD, 카세트, LD/DVD/블루레이 등 음반과 영상 미디어.'
}
```

## 17. FilterModal props에 isMedia / isParts / isPartTube 추가도 필요

`{ isParts: boolean; isMedia: boolean; isPartTube: boolean; }` props 정의 + 호출부에서 전달.

---

## 복원 방법

1. catalog.ts에 두 카테고리 다시 추가
2. browse-page.tsx에 상수/타입/필터 로직/모달 UI 복원
3. App.tsx의 MEGA_CATS에 두 카테고리 추가
4. App.tsx의 catGroups에 분기 추가
5. category-slugs.ts·category-meta.ts에 매핑 복원
6. `npm run build` 통과 확인
