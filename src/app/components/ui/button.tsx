// ============================================================================
// ui/button.tsx — 버튼 공통 부품 (2026-11-10 디자인 3a, 토큰 6개만)
// ----------------------------------------------------------------------------
// variant 3 (2026-11-10 등록 폼 시안):
//   primary   = 검정 바탕(bg-fg text-bg), 마우스 올리면 반전(흰 바탕, 검정 글자). 폼에서는 '등록하기' 하나만
//   secondary = 흰 바탕 + fg 1px 선, 마우스 올리면 bg-surface (예: 'N 추가', '사진 올리기')
//   line      = 흰 바탕 + line 1px 선, 마우스 올리면 bg-surface (안 고른 선택 버튼, 아이콘 버튼)
// 글자 14/500. size 2: md = 40px, sm = 32px. 아이콘만 있는 버튼(iconOnly)은 정사각형이고 aria-label 이 없으면 타입 오류
// noHover: primary 의 반전을 끔 (고른 상태를 보여 주는 버튼, 예: ChoiceField 의 고른 버튼)
// 비활성: text-muted bg-surface. 각진 모서리, 그림자 없음, 애니메이션 없음. 포커스는 theme.css 전역 규칙
// type 기본값은 "button" (폼 안에서 실수로 제출되지 않게)
// ============================================================================
import * as React from 'react';

type Variant = 'primary' | 'secondary' | 'line';
type Size = 'md' | 'sm';
type Common = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & {
  variant?: Variant;
  size?: Size;
  noHover?: boolean;
};
// 아이콘 전용이면 aria-label 필수 — 빠지면 타입 오류
export type ButtonProps =
  | (Common & { iconOnly?: false; 'aria-label'?: string })
  | (Common & { iconOnly: true; 'aria-label': string });

const BASE =
  'inline-flex items-center justify-center gap-2 border font-medium whitespace-nowrap rounded-none select-none ' +
  'disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted disabled:border-line';
const VARIANT: Record<Variant, string> = {
  primary: 'bg-fg text-bg border-fg enabled:hover:bg-bg enabled:hover:text-fg',
  secondary: 'bg-bg text-fg border-fg enabled:hover:bg-surface',
  line: 'bg-bg text-fg border-line enabled:hover:bg-surface',
};
const PRIMARY_STILL = 'bg-fg text-bg border-fg';
const SIZE: Record<Size, string> = { md: 'h-10 px-4 text-14', sm: 'h-8 px-3 text-14' };
const ICON_SIZE: Record<Size, string> = { md: 'h-10 w-10 shrink-0 p-0', sm: 'h-8 w-8 shrink-0 p-0' };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', iconOnly = false, noHover = false, className = '', type = 'button', ...rest },
  ref,
) {
  const cls = [BASE, noHover && variant === 'primary' ? PRIMARY_STILL : VARIANT[variant], iconOnly ? ICON_SIZE[size] : SIZE[size], className].filter(Boolean).join(' ');
  return <button ref={ref} type={type} className={cls} {...rest} />;
});
