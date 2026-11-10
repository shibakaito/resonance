'use client';
// ============================================================================
// listing-detail.tsx — 상품 상세(PDP) 화면 (/listing/[id])
// ----------------------------------------------------------------------------
// app/listing/[id]/page.tsx 가 next/dynamic(ssr:false)로 불러옴. 매물은 브라우저에서 Supabase로 읽음
// 2026-11-10 상세 시안: 가짜 데이터 없이 매물에 저장된 값만 보여 줌. 토큰 6개와 공통 부품(Button, Badge, Card)만
//   폭 1120. 위 32에 경로 '홈 › 대분류 › 세부 카테고리'(14 muted, 화살표 16, 홈과 대분류는 둘러보기 링크) → 24 → 두 열
//   두 열: 왼쪽 640(갤러리, 아래 정보 구간) + 사이 16 + 오른쪽 464. 좁은 화면은 한 줄(갤러리 → 오른쪽 열 → 정보 구간)
//   갤러리: 썸네일 세로 줄(64 정사각, 사이 8, line 선, 고른 것 fg 선, 사진 수만큼, 큰 사진보다 길면 아래로 이어짐)
//     + 큰 사진 568 정사각(line 선, 바탕 surface, cover). 오른쪽 위 8에 찜 32, 오른쪽 아래 8에 'N / 전체'
//     사진이 없거나 깨지면 '사진 없음'(14 muted)
//   오른쪽 열: 제목(24/700, 매물 title) → 12 → 배지(상태, 외관 상태, 작동 상태 중 값 있는 것. 작동이 점검 필요나 수리 필요면 danger)
//     → 24, 위 선, 24 → 가격 32/700 → 4 → 정가(있을 때만, 14 muted 줄 그음) → 24 → 메시지 보내기(FEATURE_FLAGS.messaging)
//     → 8 → [관심 제품][주소 복사 40] → 24 → 위 선 → 메타 표(라벨 96 + 값 14, 줄 40): 등록일, 배송, 직거래(가능일 때만), 지역(있을 때만)
//   바로 구매, 장바구니 담기, 가격 제안, 판매자 저장은 FEATURE_FLAGS.commerce 로 숨김 (docs/hidden.md)
//   정보 구간(구간 위 48, 제목 줄 40(20/700) 아래 16). 표 줄 = 라벨 168(14/500 muted) + 값 16, 줄 최소 40, 위아래 8, 줄 아래 선
//     제품 정보: 브랜드, 모델, 카테고리, 출시 연도, 제조국, 구성품, 상태, 외관 상태, 작동 상태 중 값 있는 줄. 처음 5줄 + '더 보기 (N)'
//     기술 사양: 카테고리 스키마 순서(사양 추가 카테고리는 핵심 칸 + 크기 + 무게) + 추가 사양(입력 순서). 처음 4줄 + '더 보기 (N)'
//     설명: 매물 description 그대로(줄바꿈 유지), 비면 구간 없음 / 유튜브 영상: youtube_link 있을 때만 16:9 플레이어
// 예전 가짜 요소(장바구니 담은 사람 수, 하트 수, 별점과 리뷰 수, 조회수, 제안 수, 시세 카드, 비슷한 제품 광고 목록,
//   등급 기준 링크, 고정 설명 글, 판매자에 대하여, 판매자 리뷰)와 react-slick 캐러셀, 사진 확대는 삭제
// ============================================================================

import { useState, useEffect, useId } from 'react';
import Link from 'next/link';
import { Heart, Check, Link as LinkIcon, MessageCircle, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';
import type { Listing } from './browse-filters';
import { fmtPrice, fmtDate, yearText, WORKING_WARN_KEYS } from './browse-filters';
import { fetchListingById } from '@/lib/listings';
import { SPEC_FIELDS } from '@/app/data/spec-fields';
import { SPEC_FIELDS_BY_CATEGORY, hiddenByDetailMode, optLabel, type SelectOption, type CategorySpecField } from '@/app/data/category-specs';
import { topCategoryOf } from '@/app/data/catalog';
import { categorySlug } from '@/app/data/category-slugs';
import { FEATURE_FLAGS } from '@/app/data/feature-flags'; // 숨김 플래그 (docs/hidden.md)
import { label, desc } from '@/lib/labels';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

// 대분류 → 둘러보기 주소 (경로 줄)
const browseHref = (top: string) => {
  const slug = categorySlug(top);
  return slug ? `/browse/${slug}` : '/browse';
};

// 배송 글자: 무료 배송 / 고정 배송비 ₩N / 배송비 별도. 고르지 않은 매물은 '' (줄 없음)
const shippingText = (l: Listing): string => {
  if (!l.shippingType) return '';
  const name = label('shipping_type', l.shippingType);
  return l.shippingType === 'flat' && l.shippingCost ? `${name} ${fmtPrice(l.shippingCost, l.currency)}` : name;
};

// 유튜브 주소 → 영상 id (watch?v=, youtu.be/, embed/, shorts/, live/). 못 읽으면 '' → 구간 없음
const youtubeIdOf = (url: string): string => {
  const m = /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/.exec(url.trim());
  return m ? m[1] : '';
};

// 정보 구간 — 위 48, 제목 줄 40(20/700), 아래 16
function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  const headId = useId();
  return (
    <section aria-labelledby={headId} className="mt-12">
      <h2 id={headId} className="flex h-10 items-center text-20 font-bold">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

// 표 — 줄: 라벨 168(14/500 muted) + 값 16, 최소 40(위아래 8), 줄 아래 선. 처음 initial 줄만 보이고
//   나머지는 '더 보기 (숨은 줄 수)'(14/500 텍스트 버튼, 줄 40, 표 아래 8, 화살표 16). 누르면 전부 펴고 '접기'
type TableRow = { key: string; label: string; value: React.ReactNode; pre?: boolean };
function SpecTable({ rows, initial }: { rows: TableRow[]; initial: number }) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const hidden = Math.max(0, rows.length - initial);
  const shown = open || hidden === 0 ? rows : rows.slice(0, initial);
  return (
    <>
      <dl id={listId}>
        {shown.map((r) => (
          <div key={r.key} className="grid min-h-10 grid-cols-[168px_minmax(0,1fr)] items-baseline border-b border-line py-2">
            <dt className="break-words pr-4 text-14 font-medium text-muted">{r.label}</dt>
            <dd className={`break-words text-16${r.pre ? ' whitespace-pre-line' : ''}`}>{r.value}</dd>
          </div>
        ))}
      </dl>
      {hidden > 0 && (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((v) => !v)}
          className="mt-2 inline-flex h-10 items-center gap-1 text-14 font-medium text-fg hover:underline"
        >
          {open ? '접기' : `더 보기 (${hidden})`}
          {open ? <ChevronUp aria-hidden className="h-4 w-4" /> : <ChevronDown aria-hidden className="h-4 w-4" />}
        </button>
      )}
    </>
  );
}

export function ListingDetail({ id }: { id?: string }) {
  // URL의 id로 Supabase에서 매물을 불러옴 (영문 키 → 한글 변환은 fetch 안에서 처리)
  const [listing, setListing] = useState<Listing | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  useEffect(() => {
    if (!id) return;
    let active = true;
    fetchListingById(id)
      .then((row) => {
        if (!active) return;
        setListing(row);
        setLoadState(row ? 'ready' : 'missing');
      })
      .catch((err) => {
        console.error('매물 불러오기 실패:', err);
        if (active) setLoadState('error');
      });
    return () => { active = false; };
  }, [id]);

  // 갤러리 — 고른 사진, 불러오지 못한 사진 번호
  const [current, setCurrent] = useState(0);
  const [broken, setBroken] = useState<Set<number>>(new Set());
  const markBroken = (i: number) => setBroken((prev) => new Set(prev).add(i));

  // 찜(사진 위 하트)과 관심 제품은 같은 상태 — 이 화면 안에서만(홈, 둘러보기와 같음, 저장 안 함)
  const [liked, setLiked] = useState(false);
  const toggleLike = () => setLiked((v) => !v);

  // 주소 복사 — 복사되면 2초 동안 체크 아이콘, 화면 읽기 프로그램에는 aria-live 로 알림
  const [copied, setCopied] = useState(false);
  const [copyMsg, setCopyMsg] = useState('');
  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyMsg('주소를 복사했어요');
      setCopied(true);
    } catch {
      setCopyMsg('주소를 복사하지 못했어요');
    }
  };
  useEffect(() => {
    if (!copyMsg) return;
    const t = setTimeout(() => {
      setCopied(false);
      setCopyMsg('');
    }, 2000);
    return () => clearTimeout(t);
  }, [copyMsg]);

  // 판매자 저장 (FEATURE_FLAGS.commerce 켜졌을 때만 보이는 버튼)
  const [sellerSaved, setSellerSaved] = useState(false);

  // 불러오는 중, 없는 매물, 불러오기 실패
  if (!listing) {
    return (
      <main className="mx-auto w-full max-w-280 px-4 pt-8 xl:px-0">
        <p role="status" className="text-14 text-muted">
          {loadState === 'loading' ? '불러오는 중…' : loadState === 'missing' ? '매물을 찾을 수 없어요.' : '매물을 불러오지 못했어요.'}
        </p>
      </main>
    );
  }

  const top = topCategoryOf(listing.category); // 대분류 (예: 앰프)
  const sub = listing.category;                // 세부 카테고리 (예: 인티앰프)
  const name = `${listing.brand} ${listing.model}`;
  const images = listing.images;
  const showPhoto = images.length > 0 && !broken.has(current);

  // 배지 — 상태, 외관 상태, 작동 상태 중 값 있는 것
  const badges = [
    { text: label('condition', listing.condition), danger: false },
    { text: label('appearance', listing.appearance), danger: false },
    { text: label('working', listing.working), danger: WORKING_WARN_KEYS.includes(listing.working) },
  ].filter((b) => b.text);

  // 메타 표 — 값 있는 줄만
  const metaRows: [string, string][] = (
    [
      ['등록일', fmtDate(listing.createdAt)],
      ['배송', shippingText(listing)],
      ['직거래', listing.localPickup ? '가능' : ''],
      ['지역', label('location', listing.location)],
    ] as [string, string][]
  ).filter(([, v]) => v);

  // 등급 칸 값 — 라벨 + 정의(FEATURE_FLAGS.gradeDescriptions 켜졌을 때만) + 옛 매물 메모(appearanceDetail, workingDetail). 키가 비면 ''
  const gradeValue = (field: string, key: string, memo = ''): React.ReactNode => {
    if (!key) return '';
    const d = desc(field, key);
    if (!d && !memo) return label(field, key);
    return (
      <>
        {label(field, key)}
        {d && <span className="ml-2 text-14 text-muted">{d}</span>}
        {memo && <span className="mt-1 block text-14">{memo}</span>}
      </>
    );
  };

  // 제품 정보 — 값 있는 줄만. 소유권, 정비 이력은 플래그가 꺼져 있어 안 보임 (docs/hidden.md)
  const infoRows: TableRow[] = (
    [
      { key: 'brand', label: '브랜드', value: listing.brand },
      { key: 'model', label: '모델', value: listing.model },
      { key: 'category', label: '카테고리', value: sub && sub !== top ? `${top}, ${sub}` : top },
      { key: 'year', label: '출시 연도', value: yearText(listing) },
      { key: 'country', label: '제조국', value: label('country', listing.country) },
      FEATURE_FLAGS.ownership && { key: 'ownership', label: '소유권', value: label('ownership', listing.ownership) },
      { key: 'components', label: '구성품', value: [...listing.components.map((k) => label('components', k)), listing.componentsOther].filter(Boolean).join(', ') },
      { key: 'condition', label: '상태', value: gradeValue('condition', listing.condition) },
      { key: 'appearance', label: '외관 상태', value: gradeValue('appearance', listing.appearance, listing.appearanceDetail) },
      { key: 'working', label: '작동 상태', value: gradeValue('working', listing.working, listing.workingDetail) },
      FEATURE_FLAGS.maintenance && { key: 'maintenance', label: '정비 이력', value: listing.maintenance.join(', ') },
    ] as (TableRow | false)[]
  ).filter((r): r is TableRow => !!r && !!r.value);

  // 기술 사양 — 카테고리 스키마(앰프, 스피커, 소스기기)가 있으면 그 라벨과 순서로, 없으면 SPEC_FIELDS(케이블 등)
  //   폼과 같은 게이팅: showWhen(형식, __sub = 세부 카테고리) + 상세 모드 'custom'이면 숨긴 상세 칸은 옛 값이 있어도 안 보임
  //   → 사양 추가 카테고리는 핵심 칸(스키마 순서) + 크기 + 무게. 값 빈 칸은 줄 없음. 그 아래 추가 사양(customSpecs) 입력 순서대로
  const techRows: TableRow[] = (() => {
    const specs = listing.techSpecs;
    const schema = (SPEC_FIELDS_BY_CATEGORY[top] ?? SPEC_FIELDS) as readonly {
      key: string; label: string;
      input?: { kind: string; options?: SelectOption[] };
      showWhen?: (s: Record<string, string | string[]>) => boolean;
    }[];
    // 표시값: 배열 → 'a, b' / select, 검색 드롭다운(영문 키 저장)은 optLabel 로 옵션 라벨 / 스피커 임피던스는 숫자 → '8Ω' / 그 밖은 그대로
    const fmt = (f: (typeof schema)[number], v: string | string[]): string => {
      if (Array.isArray(v)) return v.map((x) => optLabel(f.input?.options, x)).join(', ');
      if (f.input?.kind === 'select' || f.input?.kind === 'searchSelect') return optLabel(f.input.options, v);
      if (f.key === 'speakerImpedance') return /Ω$/.test(v) ? v : `${v}Ω`;
      return v;
    };
    const fields = schema.filter((f) => {
      if (f.showWhen && !f.showWhen({ ...specs, __sub: sub })) return false;
      if (f.input && hiddenByDetailMode(sub, f as CategorySpecField)) return false;
      const v = specs[f.key];
      return Array.isArray(v) ? v.length > 0 : Boolean(v);
    });
    return [
      ...fields.map((f, i) => ({
        key: `${i}-${f.key}`,
        label: f.label,
        value: fmt(f, specs[f.key]),
        pre: f.input?.kind === 'textarea' || f.key === 'otherSpecs', // 기타 사양(여러 줄 글)은 줄바꿈 그대로
      })),
      ...listing.customSpecs.map((c, i) => ({ key: `custom-${i}`, label: c.title, value: c.value })),
    ];
  })();

  const videoId = youtubeIdOf(listing.youtubeLink);

  return (
    <main className="mx-auto w-full max-w-280 px-4 pt-8 xl:px-0">
      {/* 경로 — 홈 › 대분류 › 세부 카테고리. 홈과 대분류는 링크 */}
      <nav aria-label="경로">
        <ol className="flex flex-wrap items-center gap-1 text-14 text-muted">
          <li>
            <Link href="/" className="hover:text-fg">
              홈
            </Link>
          </li>
          <li className="flex items-center gap-1">
            <ChevronRight aria-hidden className="h-4 w-4" />
            <Link href={browseHref(top)} className="hover:text-fg">
              {top}
            </Link>
          </li>
          {sub && sub !== top && (
            <li className="flex items-center gap-1">
              <ChevronRight aria-hidden className="h-4 w-4" />
              <span>{sub}</span>
            </li>
          )}
        </ol>
      </nav>

      {/* 두 열 — 넓은 화면: 왼쪽(갤러리 위, 정보 구간 아래) + 오른쪽 464. 좁은 화면: 갤러리 → 오른쪽 열 → 정보 구간 */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_464px] lg:grid-rows-[auto_1fr] lg:gap-x-4">
        {/* 갤러리 — 썸네일 줄 64 + 사이 8 + 큰 사진 568 */}
        <div className="flex max-w-160 items-start gap-2 lg:col-start-1 lg:row-start-1">
          <div className="flex w-16 shrink-0 flex-col gap-2">
            {images.map((src, i) => (
              <button
                key={`${i}-${src}`}
                type="button"
                aria-label={`사진 ${i + 1}`}
                aria-pressed={i === current}
                onClick={() => setCurrent(i)}
                className={`h-16 w-16 overflow-hidden border bg-surface ${i === current ? 'border-fg' : 'border-line'}`}
              >
                {!broken.has(i) && (
                  <img src={src} alt="" width={64} height={64} onError={() => markBroken(i)} className="block h-full w-full object-cover" />
                )}
              </button>
            ))}
          </div>
          {/* 찜과 'N / 전체'는 선 밖 기준으로 8 (선 있는 사진 칸이 아니라 바깥 칸에 붙임) */}
          <div className="relative min-w-0 flex-1">
            <div className="aspect-square overflow-hidden border border-line bg-surface">
              {showPhoto ? (
                <img
                  src={images[current]}
                  alt={`${name} 사진 ${current + 1}`}
                  width={568}
                  height={568}
                  onError={() => markBroken(current)}
                  className="block h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-14 text-muted">사진 없음</div>
              )}
            </div>
            <Button
              iconOnly
              size="sm"
              variant="line"
              aria-label="찜하기"
              aria-pressed={liked}
              onClick={toggleLike}
              className="absolute right-2 top-2 z-10"
            >
              <Heart aria-hidden className={`h-4 w-4 ${liked ? 'fill-fg' : ''}`} />
            </Button>
            {images.length > 0 && (
              <span className="absolute bottom-2 right-2 inline-flex h-6 items-center border border-line bg-bg px-2 text-12">
                {current + 1} / {images.length}
              </span>
            )}
          </div>
        </div>

        {/* 오른쪽 열 — 제목, 배지, 가격, 버튼, 메타 */}
        <div className="mt-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0">
          <h1 className="text-24 font-bold">{listing.title || name}</h1>
          {badges.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {badges.map((b) => (
                <Badge key={b.text} variant={b.danger ? 'danger' : 'outline'}>
                  {b.text}
                </Badge>
              ))}
            </div>
          )}

          <div className="mt-6 border-t border-line pt-6">
            <p className="text-32 font-bold">{fmtPrice(listing.price, listing.currency)}</p>
            {listing.comparePrice != null && listing.comparePrice > 0 && (
              <p className="mt-1 text-14 text-muted">
                정가 <s>{fmtPrice(listing.comparePrice, listing.currency)}</s>
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-2">
            {/* 거래 기능 — FEATURE_FLAGS.commerce 꺼지면 안 보임 (docs/hidden.md) */}
            {FEATURE_FLAGS.commerce && (
              <>
                <Button variant="primary" className="w-full">
                  바로 구매
                </Button>
                <Button variant="secondary" className="w-full">
                  장바구니 담기
                </Button>
                <div className="flex gap-2">
                  <Button variant="secondary" className="min-w-0 flex-1">
                    <MessageCircle aria-hidden className="h-4 w-4" />
                    가격 제안
                  </Button>
                  <Button variant="secondary" aria-pressed={sellerSaved} onClick={() => setSellerSaved((v) => !v)} className="min-w-0 flex-1">
                    <Heart aria-hidden className={`h-4 w-4 ${sellerSaved ? 'fill-fg' : ''}`} />
                    판매자 저장
                  </Button>
                </div>
              </>
            )}
            {/* 메시지 — FEATURE_FLAGS.messaging 꺼지면 안 보임 */}
            {FEATURE_FLAGS.messaging && (
              <Button variant="primary" className="w-full">
                메시지 보내기
              </Button>
            )}
            <div className="flex gap-2">
              <Button variant="secondary" aria-pressed={liked} onClick={toggleLike} className="min-w-0 flex-1">
                <Heart aria-hidden className={`h-4 w-4 ${liked ? 'fill-fg' : ''}`} />
                관심 제품
              </Button>
              <Button iconOnly variant="secondary" aria-label="주소 복사" onClick={copyUrl}>
                {copied ? <Check aria-hidden className="h-4 w-4" /> : <LinkIcon aria-hidden className="h-4 w-4" />}
              </Button>
            </div>
            <p aria-live="polite" className="sr-only">
              {copyMsg}
            </p>
          </div>

          {/* 메타 표 — 라벨 96 + 값 14, 줄 40, 줄 아래 선 */}
          <dl className="mt-6 border-t border-line">
            {metaRows.map(([k, v]) => (
              <div key={k} className="grid min-h-10 grid-cols-[96px_minmax(0,1fr)] items-center border-b border-line py-2">
                <dt className="text-14 font-medium text-muted">{k}</dt>
                <dd className="text-14">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* 정보 구간 — 제품 정보, 기술 사양, 설명, 유튜브 영상 */}
        <div className="lg:col-start-1 lg:row-start-2">
          <InfoSection title="제품 정보">
            <SpecTable rows={infoRows} initial={5} />
          </InfoSection>

          {techRows.length > 0 && (
            <InfoSection title="기술 사양">
              <SpecTable rows={techRows} initial={4} />
            </InfoSection>
          )}

          {listing.description.trim() && (
            <InfoSection title="설명">
              <p className="whitespace-pre-line break-words text-16">{listing.description}</p>
            </InfoSection>
          )}

          {videoId && (
            <InfoSection title="유튜브 영상">
              <div className="aspect-video border border-line bg-surface">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                  title={`${name} 유튜브 영상`}
                  loading="lazy"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  className="block h-full w-full"
                />
              </div>
            </InfoSection>
          )}
        </div>
      </div>
    </main>
  );
}
