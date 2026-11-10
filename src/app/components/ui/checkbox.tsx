// ============================================================================
// ui/checkbox.tsx — 체크박스 (2026-11-10 시안. 등록 폼에서 옮겨 폼과 둘러보기 필터가 같은 부품을 씀)
// ----------------------------------------------------------------------------
// 20×20 각진 상자, line 1px 선, 체크하면 fg 채움에 흰 체크. 네이티브 input 을 그대로 써서(appearance-none)
//   키보드, 화면 읽기, 포커스 표시(전역 :focus-visible)는 기본 그대로
// variant
//   form: 상자와 글자 사이 12, 글자 14/500, 아래 도움말 14 muted(간격 4), 필수 점 (등록 폼)
//   list: 줄 높이 32, 상자와 글자 사이 8, 글자 14 (둘러보기 필터 선택지). trailing = 줄 오른쪽 끝(개수 등)
// ============================================================================
import * as React from 'react';
import { Check } from 'lucide-react';
import { RequiredMark } from './field';

export function Checkbox({
  checked,
  onChange,
  children,
  help,
  required = false,
  variant = 'form',
  trailing,
  className = '',
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
  help?: React.ReactNode;       // form: 글자 아래 도움말
  required?: boolean;           // form: 필수 점 + aria-required
  variant?: 'form' | 'list';
  trailing?: React.ReactNode;   // list: 줄 오른쪽 끝 (예: 개수)
  className?: string;
}) {
  const list = variant === 'list';
  return (
    <label className={`flex cursor-pointer ${list ? 'h-8 items-center gap-2' : 'items-start gap-3'} ${className}`}>
      <span className="relative flex h-5 w-5 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-required={required || undefined}
          className="peer h-5 w-5 cursor-pointer appearance-none border border-line bg-bg checked:border-fg checked:bg-fg"
        />
        <Check aria-hidden className="pointer-events-none absolute inset-0 m-auto hidden h-4 w-4 text-bg peer-checked:block" />
      </span>
      {list ? (
        <>
          <span className="min-w-0 flex-1 truncate text-14 text-fg">{children}</span>
          {trailing}
        </>
      ) : (
        <span className="min-w-0">
          <span className="block text-14 font-medium">
            {children}
            {required && <RequiredMark />}
          </span>
          {help && <span className="mt-1 block text-14 text-muted">{help}</span>}
        </span>
      )}
    </label>
  );
}
