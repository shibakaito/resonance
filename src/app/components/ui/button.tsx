// ============================================================================
// ui/button.tsx — 버튼 공통 부품 (2026-11-10 디자인 3a, 토큰 6개만)
// ----------------------------------------------------------------------------
// variant 2: primary = 검정 바탕(bg-fg text-bg), 마우스 올리면 반전(흰 바탕, 검정 글자)
//            secondary = 흰 바탕(bg-bg text-fg border-line), 마우스 올리면 bg-surface
// size 2: md = 40px, sm = 32px. 아이콘만 있는 버튼(iconOnly)은 정사각형이고 aria-label 이 없으면 타입 오류
// 비활성: text-muted bg-surface. 각진 모서리, 그림자 없음, 애니메이션 없음. 포커스는 theme.css 전역 규칙
// type 기본값은 "button" (폼 안에서 실수로 제출되지 않게)
// ============================================================================
import * as React from 'react';

type Variant = 'primary' | 'secondary';
type Size = 'md' | 'sm';
type Common = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & {
  variant?: Variant;
  size?: Size;
};
// 아이콘 전용이면 aria-label 필수 — 빠지면 타입 오류
export type ButtonProps =
  | (Common & { iconOnly?: false; 'aria-label'?: string })
  | (Common & { iconOnly: true; 'aria-label': string });

const BASE =
  'inline-flex items-center justify-center gap-2 border font-bold whitespace-nowrap rounded-none select-none ' +
  'disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted disabled:border-line';
const VARIANT: Record<Variant, string> = {
  primary: 'bg-fg text-bg border-fg enabled:hover:bg-bg enabled:hover:text-fg',
  secondary: 'bg-bg text-fg border-line enabled:hover:bg-surface',
};
const SIZE: Record<Size, string> = { md: 'h-10 px-4 text-14', sm: 'h-8 px-3 text-14' };
const ICON_SIZE: Record<Size, string> = { md: 'h-10 w-10 shrink-0 p-0', sm: 'h-8 w-8 shrink-0 p-0' };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', iconOnly = false, className = '', type = 'button', ...rest },
  ref,
) {
  const cls = [BASE, VARIANT[variant], iconOnly ? ICON_SIZE[size] : SIZE[size], className].filter(Boolean).join(' ');
  return <button ref={ref} type={type} className={cls} {...rest} />;
});
