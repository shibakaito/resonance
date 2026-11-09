'use client';
// ============================================================================
// ui/dialog.tsx — 대화 상자 (2026-11-10 디자인 3a, 필터 모달용 — 3b 에서 붙임)
// ----------------------------------------------------------------------------
// Radix Dialog 위에 토큰만 입힘: role="dialog" + aria-modal, Esc 로 닫기, 포커스 가두기, 바깥(배경) 누르면 닫기는 Radix 가 처리
// 각진 흰 면 + border-line, 그림자 없음, 애니메이션 없음. 바깥 배경은 fg 40%
// 안쪽 스크롤이 페이지로 번지지 않게 overscroll-contain
// ============================================================================
import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Button } from './button';

export function Dialog({
  open,
  onOpenChange,
  title,
  children,
  footer,
  className = '',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;             // 대화 상자 이름 (위쪽 제목 + 화면 읽기 이름)
  children: React.ReactNode; // 본문 (넘치면 안에서 스크롤)
  footer?: React.ReactNode;  // 아래 고정 줄 (예: 초기화, 적용하기)
  className?: string;        // 너비 등 (기본 최대 512px)
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-fg/40" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={`fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col border border-line bg-bg rounded-none overscroll-contain ${className}`}
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-5">
            <DialogPrimitive.Title className="text-16 font-bold">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <Button iconOnly size="sm" aria-label="닫기">
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </DialogPrimitive.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
          {footer && <div className="shrink-0 border-t border-line px-5 py-3">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
