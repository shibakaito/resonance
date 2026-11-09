// ============================================================================
// ui/input.tsx — 한 줄 입력칸 (2026-11-10 디자인 3a, 토큰 6개만)
// ----------------------------------------------------------------------------
// 높이 40px, border-line, 흰 바탕. 비활성은 bg-surface text-muted. 포커스는 theme.css 전역 규칙
// 라벨은 Field 로 감싸서 붙임(Field 가 id 를 넣어 htmlFor 와 연결)
// ============================================================================
import * as React from 'react';

export const INPUT_CLASS =
  'h-10 w-full min-w-0 border border-line bg-bg px-3 text-16 text-fg rounded-none placeholder:text-muted ' +
  'disabled:bg-surface disabled:text-muted disabled:cursor-not-allowed';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className = '', type = 'text', ...rest },
  ref,
) {
  return <input ref={ref} type={type} className={`${INPUT_CLASS} ${className}`} {...rest} />;
});
