// ============================================================================
// ui/label.tsx — 칸 이름 (2026-11-10 디자인 3a)
// ----------------------------------------------------------------------------
// 보통은 Field 가 씀. field-label 클래스는 등록 폼 안에서 theme.css 의 라벨 모양(대문자, 14px, 굵게, muted)을 받음
// ============================================================================
import * as React from 'react';

export const LABEL_CLASS = 'field-label block mb-2 text-14 font-medium'; // 라벨 14/500 fg, 칸과 8 (2026-11-10 등록 폼 시안)

export function Label({ className = '', ...rest }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={`${LABEL_CLASS} ${className}`} {...rest} />;
}
