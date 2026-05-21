// ============================================================================
// supabase.ts — Supabase 클라이언트(앱이 DB에 접속하는 통로)
// ----------------------------------------------------------------------------
// .env.local 의 환경변수에서 URL/키를 읽어 클라이언트 1개를 만들어 내보냅니다.
// 사용법:  import { supabase } from '@/lib/supabase';
//
// ⚠️ 여기 쓰는 키는 "공개(anon / publishable)" 키입니다 — 브라우저에 노출돼도
//    되는 키예요. 비공개 service_role 키는 절대 이 파일에 넣지 마세요.
// ============================================================================
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 환경변수가 비어 있으면(=.env.local 미설정) 바로 알기 쉽게 에러를 띄움
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase 환경변수가 없습니다. .env.local 에 ' +
      'NEXT_PUBLIC_SUPABASE_URL 과 NEXT_PUBLIC_SUPABASE_ANON_KEY 를 ' +
      '넣었는지 확인하세요. (값을 넣은 뒤 dev 서버를 재시작해야 적용됩니다)'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
