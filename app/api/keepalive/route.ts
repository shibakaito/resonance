// ============================================================================
// /api/keepalive — Supabase 자동 일시정지 방지용 핑 (보조 장치)
// ----------------------------------------------------------------------------
// 왜:  Supabase Free 프로젝트는 7일간 활동이 없으면 자동 일시정지(paused)되고,
//      그러면 사이트의 매물 조회·등록이 전부 멈춥니다 (2026-09-30 실제 발생).
// 방법: Vercel Cron(vercel.json)이 매일 이 라우트를 GET으로 호출
//      → anon 키로 listings 1건(id만) 조회 → DB에 "활동"이 기록돼 정지 타이머가 리셋.
//      주 장치는 DB 안의 pg_cron 매시간 쓰기 (supabase/rls-storage.sql 섹션 5).
// 보안: 읽기 전용(공개 select 정책과 같은 권한)이라 누가 호출해도 무해합니다.
//      Vercel 환경변수 CRON_SECRET 을 넣으면 Authorization: Bearer <값> 을 검사하고,
//      없으면 검사 없이 통과합니다.
// 주의: 이 파일이나 vercel.json 의 crons 항목을 지우면 7일 뒤 다시 정지됩니다.
// ============================================================================
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 빌드 시 정적 캐시 금지 — 라우트 자체를 매 호출마다 실행.
export const dynamic = 'force-dynamic';
// ⚠️ dynamic 만으로는 부족 — Next 14 는 GET 라우트 안의 fetch(= Supabase 조회)를 Data Cache 에
//    1년짜리로 저장해 두고 재사용해서, 호출이 성공해도 Supabase 까지는 안 가는 날이 생김
//    (2026-10-10 Vercel 로그 "Using cache" 로 확인). → 이 라우트의 fetch 는 전부 캐시 없이 보냄.
export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  try {
    // keepalive 전용 클라이언트 — Supabase 로 가는 fetch 마다 cache: 'no-store' (위 fetchCache 와 이중 안전장치).
    //   앱 공용 클라이언트(src/lib/supabase.ts)는 브라우저에서도 쓰여서 건드리지 않음.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      {
        global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
        auth: { persistSession: false },
      }
    );
    const { data, error } = await supabase.from('listings').select('id').limit(1);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { ok: true, table: 'listings', rows: data?.length ?? 0, at: new Date().toISOString() },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
