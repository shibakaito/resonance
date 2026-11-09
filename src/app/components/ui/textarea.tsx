// ============================================================================
// ui/textarea.tsx — 여러 줄 입력칸 (2026-11-10 디자인 3a, 토큰 6개만)
// ----------------------------------------------------------------------------
// border-line, 흰 바탕, 세로로만 늘이기. 비활성은 bg-surface text-muted. 포커스는 theme.css 전역 규칙
// ============================================================================
import * as React from 'react';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className = '', rows = 4, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={`w-full min-w-0 border border-line bg-bg px-3 py-2 text-16 text-fg rounded-none resize-y placeholder:text-muted disabled:bg-surface disabled:text-muted ${className}`}
        {...rest}
      />
    );
  },
);
