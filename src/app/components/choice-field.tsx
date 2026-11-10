'use client';
// ============================================================================
// choice-field.tsx — 폼 선택 부품 하나 (버튼 / 드롭다운 자동 결정, 2026-11-10)
// ----------------------------------------------------------------------------
// 규칙 (CLAUDE.md 구조에도 한 줄):
//   하나 고르기  — 선택지 5개 이하면 버튼 한 줄, 6개 이상이면 드롭다운
//   여러 개 고르기 — 선택지 6개 이하면 버튼 토글, 7개 이상이면 지금 방식(드롭다운)
//   판단은 그 순간의 선택지 개수로 (조건에 따라 선택지가 바뀌는 칸도 저절로 따라감). 칸마다 손으로 정하지 않음
// 버튼 모양 = 공통 Button(ui/button.tsx, 선택 = primary, 안 고름 = secondary). 저장값은 드롭다운과 같음:
//   하나 고르기는 값 하나(다시 누르면 해제는 allowClear 일 때만), 여러 개 고르기는 누른 순서대로 쌓임(드롭다운과 같은 순서 규칙)
// 드롭다운 쪽 모양은 부르는 곳이 dropdown 으로 넘김 (칸마다 검색, 별칭, 직접 입력 등 기존 동작 그대로)
// 예외: CHOICE_DROPDOWN_ONLY 목록에 든 칸(fieldKey)은 선택지 수와 상관없이 늘 드롭다운 — 예외는 이 목록 하나로만 관리
// ============================================================================
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { Button } from './ui/button';

export type ChoiceOption = string | { value: string; label: string };

// 버튼으로 그릴 최대 선택지 수
export const CHOICE_BUTTON_MAX = { single: 5, multi: 6 } as const;
// 버튼 규칙의 예외 — 늘 드롭다운으로 그릴 칸 (저장 키 이름). 칸을 더하거나 빼려면 여기만
//   상태 묶음 세 칸 — condition(상태), appearance(외관 상태), working(작동 상태): 2026-11-10 드롭다운 유지 결정
export const CHOICE_DROPDOWN_ONLY: ReadonlySet<string> = new Set(['condition', 'appearance', 'working']);
// 선택지 수(와 예외 목록) → 버튼으로 그릴지
export const choiceAsButtons = (count: number, multiple: boolean, fieldKey?: string): boolean =>
  !(fieldKey && CHOICE_DROPDOWN_ONLY.has(fieldKey)) &&
  count > 0 && count <= (multiple ? CHOICE_BUTTON_MAX.multi : CHOICE_BUTTON_MAX.single);

const norm = (o: ChoiceOption) => (typeof o === 'string' ? { value: o, label: o } : o);

type Common = {
  fieldKey?: string;                   // 칸의 저장 키 (예: 'condition', 'channel') — 예외 목록 CHOICE_DROPDOWN_ONLY 와 맞춰 봄
  options: ChoiceOption[];
  dropdown: ReactNode;                 // 선택지가 많을 때 그릴 기존 드롭다운
  disabled?: boolean;                  // 흐리게(누를 수 없음) — 예: 상태가 중고가 아닐 때 외관, 작동
  buttonText?: Record<string, string>; // 버튼 글자만 바꿀 때 (예: 회전수 '33' → '33⅓'). 저장값은 그대로
  ariaLabel?: string;
  labelledBy?: string;                 // Field 이름표의 id — 있으면 aria-label 대신 이걸로 버튼 묶음 이름을 붙임
};
type Single = Common & { multiple?: false; value: string; onChange: (v: string) => void; allowClear?: boolean };
type Multi = Common & { multiple: true; values: string[]; onChange: Dispatch<SetStateAction<string[]>> };

// 각진 버튼 한 개 — 공통 Button(2026-11-10 디자인 3a): 선택 = primary(검정 바탕), 안 고름 = secondary(흰 바탕). 높이 40px
function ChoiceButton({ on, disabled, onClick, children }: { on: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <Button variant={on ? 'primary' : 'secondary'} noHover aria-pressed={on} disabled={disabled} onClick={onClick} className="min-w-16">
      {children}
    </Button>
  );
}

export function ChoiceField(props: Single | Multi) {
  const opts = props.options.map(norm);
  if (!choiceAsButtons(opts.length, props.multiple === true, props.fieldKey)) return <>{props.dropdown}</>;
  const text = (v: string, label: string) => props.buttonText?.[v] ?? label;
  // 버튼 하나의 상태와 누름 동작 — 여러 개 고르기는 누른 순서대로 쌓고 다시 누르면 뺌, 하나 고르기는 바꾸기(allowClear 면 다시 눌러 해제)
  let isOn: (v: string) => boolean;
  let press: (v: string) => void;
  if (props.multiple === true) {
    const { values, onChange } = props;
    isOn = (v) => values.includes(v);
    press = (v) => onChange((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  } else {
    const { value, onChange, allowClear = true } = props;
    isOn = (v) => value === v;
    press = (v) => {
      if (value !== v) onChange(v);
      else if (allowClear) onChange('');
    };
  }
  return (
    <div role="group" aria-label={props.labelledBy ? undefined : props.ariaLabel} aria-labelledby={props.labelledBy} className="flex flex-wrap gap-2">
      {opts.map((o) => (
        <ChoiceButton key={o.value} on={isOn(o.value)} disabled={props.disabled} onClick={() => press(o.value)}>
          {text(o.value, o.label)}
        </ChoiceButton>
      ))}
    </div>
  );
}
