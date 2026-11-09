// ============================================================================
// ui/badge.tsx — 작은 표시 (2026-11-10 디자인 3a, 토큰 6개만)
// ----------------------------------------------------------------------------
// outline(기본) = text-fg border-line / danger = text-danger border-danger. 바탕 없음, 각진 모서리
// ConditionBadge(상태 배지, 작동 경고)가 이 부품을 씀
// ============================================================================
import * as React from 'react';

type Variant = 'outline' | 'danger';
const VARIANT: Record<Variant, string> = {
  outline: 'text-fg border-line',
  danger: 'text-danger border-danger',
};

export function Badge({
  variant = 'outline',
  className = '',
  ...rest
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={`inline-flex items-center border px-2 py-1 text-12 leading-none font-bold whitespace-nowrap rounded-none ${VARIANT[variant]} ${className}`}
      {...rest}
    />
  );
}
