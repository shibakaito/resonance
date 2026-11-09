'use client';
// ============================================================================
// ui/field.tsx — 칸 한 개를 감싸는 부품 (2026-11-10 디자인 3a, 토큰 6개만)
// ----------------------------------------------------------------------------
// label(htmlFor 자동 연결) + 필수 점(danger) + hint(muted) + error(danger)
// 안에는 Input, Textarea, Select(네이티브 select), Autocomplete 어느 것이든 하나를 넣음 → Field 가 id, aria-describedby,
//   aria-invalid, aria-required 를 넣어 줌
// 안이 칸 여러 개(크기 W×D×H, 숫자 + 단위, 버튼 묶음, 행 빌더)면 group 으로: 이름표(span) + role="group" aria-labelledby
//   또는 children 을 함수로 넘겨 id 들을 받아 직접 연결
// 높이 40px, border-line, 포커스는 theme.css 전역 규칙. 각진 모서리, 그림자, 애니메이션 없음
// ============================================================================
import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { LABEL_CLASS } from './label';

export type FieldIds = { id: string; labelId: string; describedBy?: string };

type FieldProps = {
  label: React.ReactNode;
  required?: boolean;      // 필수 점(danger) + aria-required
  hint?: React.ReactNode;  // 칸 아래 안내(muted)
  error?: React.ReactNode; // 칸 아래 오류(danger) + aria-invalid
  disabled?: boolean;      // 라벨을 흐리게(muted)
  group?: boolean;         // 칸 여러 개를 한 이름으로 묶을 때 — 이름표 + role="group"
  id?: string;             // 칸 id 를 직접 정할 때 (보통은 자동)
  className?: string;
  children: React.ReactElement | ((ids: FieldIds) => React.ReactNode);
};

// 필수 표시 — 점은 눈으로만, 화면 읽기에는 "필수"
function RequiredMark() {
  return (
    <>
      <span aria-hidden className="ml-1 inline-block h-1.5 w-1.5 bg-danger align-middle" />
      <span className="sr-only">(필수)</span>
    </>
  );
}

export function Field({ label, required, hint, error, disabled, group, id: idProp, className = '', children }: FieldProps) {
  const auto = React.useId();
  const id = idProp ?? `f${auto.replace(/[^a-zA-Z0-9]/g, '')}`;
  const labelId = `${id}-label`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  const ids: FieldIds = { id, labelId, describedBy };
  const labelCls = `${LABEL_CLASS} ${disabled ? 'text-muted' : ''}`;
  const name = (
    <>
      {label}
      {required && <RequiredMark />}
    </>
  );

  let body: React.ReactNode;
  if (typeof children === 'function') body = children(ids);
  else if (group) body = children;
  else
    body = React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
      id: (children.props as { id?: string }).id ?? id,
      'aria-describedby': describedBy,
      'aria-invalid': error ? true : undefined,
      'aria-required': required ? true : undefined,
    });

  return (
    <div className={className}>
      {group ? (
        <span id={labelId} className={labelCls}>{name}</span>
      ) : (
        <label id={labelId} htmlFor={id} className={labelCls}>{name}</label>
      )}
      {group ? (
        <div role="group" aria-labelledby={labelId} aria-describedby={describedBy}>{body}</div>
      ) : (
        body
      )}
      {hint && <p id={hintId} className="mt-1 text-12 text-muted">{hint}</p>}
      {error && <p id={errorId} className="mt-1 text-12 text-danger">{error}</p>}
    </div>
  );
}

// 네이티브 select — Field 안에 넣는 드롭다운 (높이 40px, border-line, 오른쪽 화살표)
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className = '', children, ...rest },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={`h-10 w-full min-w-0 appearance-none border border-line bg-bg pl-3 pr-9 text-16 text-fg rounded-none disabled:bg-surface disabled:text-muted disabled:cursor-not-allowed ${className}`}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
    </div>
  );
});
