// ============================================================================
// ui/input.tsx — 한 줄 입력칸 (2026-11-10 디자인 3a, 토큰 6개만)
// ----------------------------------------------------------------------------
// 높이 40px, border-line, 흰 바탕. 읽기 전용과 비활성은 bg-surface text-muted. 포커스는 theme.css 전역 규칙
// 라벨은 Field 로 감싸서 붙임(Field 가 id 를 넣어 htmlFor 와 연결)
// ============================================================================
import * as React from 'react';

// 기본 모양 + 부르는 곳의 className. 너비, 높이, 가로 여백, 글자 크기, 글자색, 바탕색은 부르는 곳이 정하면 그쪽만 씀
//   (같은 속성 클래스 두 개가 겹치면 CSS 순서로 이기는 쪽이 정해져 헷갈림 — 하나만 남김)
type FieldBase = { w?: string; h?: string; px?: string; text?: string; color?: string; bg?: string };
export function fieldClass(base: FieldBase, rest: string, className = ''): string {
  const has = (re: RegExp) => re.test(` ${className} `);
  return [
    !has(/\s(w-|flex-1\s|flex-\[)/) && base.w,
    !has(/\sh-/) && base.h,
    !has(/\s(px-|pl-|pr-)/) && base.px,
    !has(/\stext-(12|14|16|20|24|32)\s/) && base.text,
    !has(/\stext-(fg|muted|danger|bg|line|surface)\s/) && base.color,
    !has(/\sbg-/) && base.bg,
    rest,
    className,
  ]
    .filter(Boolean)
    .join(' ');
}

// 읽기 전용(readOnly)과 비활성은 회색 면(bg-surface text-muted)
const INPUT_REST =
  'min-w-0 border border-line rounded-none placeholder:text-muted read-only:bg-surface read-only:text-muted read-only:cursor-default ' +
  'disabled:bg-surface disabled:text-muted disabled:cursor-not-allowed';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className = '', type = 'text', ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      className={fieldClass({ w: 'w-full', h: 'h-10', px: 'px-3', text: 'text-16', color: 'text-fg', bg: 'bg-bg' }, INPUT_REST, className)}
      {...rest}
    />
  );
});
