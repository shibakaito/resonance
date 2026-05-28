// ============================================================================
// upload-image.ts — Supabase Storage의 'listings' 버킷에 이미지 업로드
// ----------------------------------------------------------------------------
// 사용법:
//   const url = await uploadListingImage(file);
//   // → 'https://.../storage/v1/object/public/listings/<uuid>.jpg' 같은 공개 URL
// ============================================================================

import { supabase } from '@/lib/supabase';

const BUCKET = 'listings';
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB (버킷 설정과 일치)

/**
 * 이미지 1장을 Supabase Storage에 업로드하고 공개 URL을 반환.
 * - 파일명은 crypto.randomUUID()로 고유 생성 (충돌·덮어쓰기 방지)
 * - 1년 캐시 (URL이 불변이라 안전)
 * - 에러 시 사용자에게 보여줄 한국어 메시지로 던짐
 */
export async function uploadListingImage(file: File): Promise<string> {
  if (!file) throw new Error('업로드할 파일이 없습니다.');

  // 사전 가드 (Supabase 측에서도 막히지만, 클라이언트에서 미리 알면 UX 좋음)
  if (file.size > MAX_BYTES) {
    throw new Error(
      `파일이 너무 큽니다 (${(file.size / 1024 / 1024).toFixed(1)}MB). 최대 5MB까지 업로드할 수 있어요.`
    );
  }
  if (file.type && !ALLOWED_TYPES.includes(file.type)) {
    throw new Error(
      `지원하지 않는 파일 형식입니다 (${file.type}). JPEG·PNG·WebP만 업로드할 수 있어요.`
    );
  }

  // 확장자 추출 (없으면 MIME에서 추론, 그래도 없으면 jpg)
  const extFromName = file.name.split('.').pop()?.toLowerCase();
  const extFromMime = file.type?.split('/').pop()?.toLowerCase();
  const ext = extFromName || extFromMime || 'jpg';

  // crypto.randomUUID는 브라우저(SecureContext)와 Node 19+ 모두 표준
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '31536000', // 1년 (UUID 파일명이라 갱신 X)
    upsert: false,            // 만일의 UUID 충돌 시 덮어쓰기 X
    contentType: file.type || undefined,
  });
  if (error) {
    throw new Error(`이미지 업로드 실패: ${error.message}`);
  }

  // public 버킷이라 인증 없이 영구 공개 URL 발급
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
