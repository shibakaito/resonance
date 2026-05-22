'use client';
// ============================================================================
// filter-modal.tsx — 모바일/전체 필터 "모달(팝업)" 화면
// ----------------------------------------------------------------------------
// browse-page.tsx에서 분리. 좁은 화면(모바일)에서 사이드바 대신 뜨는 전체 필터 팝업.
//   - Section / CheckGroup / MinMaxRow : 모달 내부 전용 작은 부품들
//   - FilterModal : 위 부품들을 조합한 실제 모달 컴포넌트 (browse-page에서 사용)
// ============================================================================

import { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronUp, X, Plus, Minus } from 'lucide-react';
import { FilterDropdown } from './filter-controls';
import { terminalsPrioritized } from '../data/cable-terminals';
import {
  ACCESSORY_GROUPS,
  AMP_DETAILS,
  AMP_GROUPS,
  AMP_METHODS,
  AMP_TYPES,
  AUTO_OPTS,
  CARTRIDGE_OPTS,
  CONDITIONS,
  CONDITION_DISPLAY,
  CONDUCTOR_OPTS,
  CONNECTION_TYPES,
  COUNTRY_OPTS,
  CROSS_LISTING,
  Counts,
  DIRECTIONALITY_OPTS,
  DRIVER_CONFIGS,
  DRIVE_TYPES,
  DUSTCOVER_OPTS,
  ENCLOSURE_TYPES,
  Filters,
  IMPEDANCE_OPTS,
  LOCATIONS,
  Listing,
  OWNERSHIP_OPTS,
  PAIR_OPTS,
  PHONO_OPTS,
  PLATING_OPTS,
  POWER_DEVICE_ITEMS,
  REMOTE_OPTS,
  SHIELD_OPTS,
  SHIELD_RELEVANT,
  SORT_OPTIONS,
  SOURCE_GROUPS,
  SPEAKER_DETAILS,
  SPEAKER_GROUPS,
  SPEAKER_IMPEDANCE,
  SPEED_OPTS,
  TONEARM_OPTS,
  TONE_OPTS,
  TT_ACCESSORY_GROUPS,
  USED_ALL,
  VOLTAGE_OPTS,
  WOOFER_SIZES,
  applyFilters,
  cloneFilters,
  computeCategories,
  countBy,
  countFilters,
  emptyFilters,
  fmtPrice,
  parseYear,
} from './browse-filters';

// 모달 안 아코디언 섹션
export function Section({
  title,
  defaultOpen = false,
  children
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[#f7f7f7] last:border-b-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-3.5"
      >
        <h4 className="text-base font-bold text-[#000000]">{title}</h4>
        {open ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  );
}

// 체크박스 그룹 (maxVisible 지정 시 "더보기"로 나머지 표시)
export function CheckGroup({
  options,
  selected,
  onToggle,
  counts,
  maxVisible
}: {
  options: readonly string[];
  selected: Set<string>;
  onToggle: (v: string) => void;
  counts?: Record<string, number>;
  maxVisible?: number;
}) {
  const [showAll, setShowAll] = useState(false);
  const hasMore = maxVisible != null && options.length > maxVisible;
  const visible = hasMore && !showAll ? options.slice(0, maxVisible) : options;

  return (
    <div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {visible.map((opt) => (
          <label
            key={opt}
            className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-[#000000]"
          >
            <input
              type="checkbox"
              checked={selected.has(opt)}
              onChange={() => onToggle(opt)}
              className="accent-[#000000]"
            />
            <span>{opt}</span>
            {counts && <span className="text-gray-400">({counts[opt] ?? 0})</span>}
          </label>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="flex items-center gap-1 mt-2 text-sm font-medium text-gray-700 hover:text-[#000000]"
        >
          {showAll ? (
            <>
              <Minus className="w-4 h-4" />
              접기
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              더보기 ({options.length - maxVisible!})
            </>
          )}
        </button>
      )}
    </div>
  );
}

// Min / Max 입력 한 줄 (thousands=true면 천 단위 쉼표 표시, state는 숫자만 저장)
export function MinMaxRow({
  minVal,
  maxVal,
  setMin,
  setMax,
  thousands = false,
  minOnly = false
}: {
  minVal: string;
  maxVal: string;
  setMin: (s: string) => void;
  setMax: (s: string) => void;
  thousands?: boolean;
  minOnly?: boolean;
}) {
  const display = (s: string) =>
    thousands && s !== '' ? Number(s).toLocaleString('ko-KR') : s;
  const handle = (setter: (s: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(thousands ? e.target.value.replace(/[^\d]/g, '') : e.target.value);
  };

  return (
    <div className="flex items-stretch border border-[#e0e0e0] rounded-lg overflow-hidden focus-within:border-[#000000] max-w-xs">
      <input
        type={thousands ? 'text' : 'number'}
        inputMode="numeric"
        min={0}
        value={display(minVal)}
        onChange={handle(setMin)}
        placeholder="최소"
        className="flex-1 w-0 px-3 py-2 text-sm focus:outline-none"
      />
      {!minOnly && (
        <>
          <span className="w-px bg-[#e0e0e0]" />
          <input
            type={thousands ? 'text' : 'number'}
            inputMode="numeric"
            min={0}
            value={display(maxVal)}
            onChange={handle(setMax)}
            placeholder="최대"
            className="flex-1 w-0 px-3 py-2 text-sm focus:outline-none"
          />
        </>
      )}
    </div>
  );
}

// "필터" 팝업 모달 — 적용하기 누를 때만 반영
export function FilterModal({
  filters,
  counts,
  isAmp,
  isSpeaker,
  isSource,
  isAccessory,
  isTtAccessory,
  isCable,
  subCategories,
  categoryOptions,
  listings,
  brandOptions,
  onApply,
  onClose
}: {
  filters: Filters;
  counts: Counts;
  isAmp: boolean;
  isSpeaker: boolean;
  isSource: boolean;
  isAccessory: boolean;
  isTtAccessory: boolean;
  isCable: boolean;
  subCategories: Set<string>;
  categoryOptions: readonly string[];
  listings: Listing[];
  brandOptions: readonly string[];
  onApply: (next: Filters, subCategories: Set<string>) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Filters>(() => cloneFilters(filters));
  const [draftSubCategories, setDraftSubCategories] = useState<Set<string>>(
    () => new Set(subCategories)
  );

  const toggleDraftSubCategory = (v: string) => {
    setDraftSubCategories((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  };
  const str = (n: number | null) => (n != null ? String(n) : '');
  const [priceMinInput, setPriceMinInput] = useState(str(filters.priceMin));
  const [priceMaxInput, setPriceMaxInput] = useState(str(filters.priceMax));
  const [yearMinInput, setYearMinInput] = useState(str(filters.yearMin));
  const [yearMaxInput, setYearMaxInput] = useState(str(filters.yearMax));
  const [powerMinInput, setPowerMinInput] = useState(str(filters.powerMin));
  const [powerMaxInput, setPowerMaxInput] = useState(str(filters.powerMax));
  const [sensMinInput, setSensMinInput] = useState(str(filters.sensitivityMin));
  const [sensMaxInput, setSensMaxInput] = useState(str(filters.sensitivityMax));
  const [recMinInput, setRecMinInput] = useState(str(filters.recPowerMin));
  const [recMaxInput, setRecMaxInput] = useState(str(filters.recPowerMax));
  const [capMinInput, setCapMinInput] = useState(str(filters.ratedCapacityMin));
  const [capMaxInput, setCapMaxInput] = useState(str(filters.ratedCapacityMax));
  const [lenMinInput, setLenMinInput] = useState(str(filters.cableLengthMin));
  const [lenMaxInput, setLenMaxInput] = useState(str(filters.cableLengthMax));

  // 모달이 열린 동안 배경 스크롤 잠금
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const toggleIn = (key: keyof Filters) => (v: string) => {
    const set = new Set(draft[key] as Set<string>);
    if (set.has(v)) set.delete(v);
    else set.add(v);
    setDraft({ ...draft, [key]: set });
  };

  const num = (s: string): number | null => {
    if (s.trim() === '') return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };

  const draftIsTurntable =
    isSource && draftSubCategories.size === 1 && draftSubCategories.has('턴테이블');
  const draftIsPowerDevice =
    isAccessory && [...draftSubCategories].some((s) => POWER_DEVICE_ITEMS.includes(s));
  const draftIsCable = isCable;

  // 현재 모달에서 설정한 값으로 미리 필터링한 결과 수
  const previewCount = useMemo(() => {
    let base = listings;
    if (draftSubCategories.size > 0) base = base.filter((l) => l.categories.some((c) => draftSubCategories.has(c)));
    const effective: Filters = {
      ...draft,
      priceMin: num(priceMinInput),
      priceMax: num(priceMaxInput),
      yearMin: num(yearMinInput),
      yearMax: num(yearMaxInput),
      powerMin: num(powerMinInput),
      powerMax: num(powerMaxInput),
      sensitivityMin: num(sensMinInput),
      sensitivityMax: num(sensMaxInput),
      recPowerMin: num(recMinInput),
      recPowerMax: num(recMaxInput),
      ratedCapacityMin: num(capMinInput),
      ratedCapacityMax: num(capMaxInput),
      cableLengthMin: num(lenMinInput),
      cableLengthMax: num(lenMaxInput)
    };
    return applyFilters(base, effective, isAmp, isSpeaker, draftIsTurntable, draftIsPowerDevice, draftIsCable).length;
  }, [draft, draftSubCategories, priceMinInput, priceMaxInput, yearMinInput, yearMaxInput, powerMinInput, powerMaxInput, sensMinInput, sensMaxInput, recMinInput, recMaxInput, capMinInput, capMaxInput, lenMinInput, lenMaxInput, listings, isAmp, isSpeaker, draftIsTurntable, draftIsPowerDevice, draftIsCable]);

  const handleReset = () => {
    setDraft(emptyFilters());
    setDraftSubCategories(new Set());
    setPriceMinInput('');
    setPriceMaxInput('');
    setYearMinInput('');
    setYearMaxInput('');
    setPowerMinInput('');
    setPowerMaxInput('');
    setSensMinInput('');
    setSensMaxInput('');
    setRecMinInput('');
    setRecMaxInput('');
    setCapMinInput('');
    setCapMaxInput('');
    setLenMinInput('');
    setLenMaxInput('');
  };

  const handleApply = () => {
    onApply(
      {
        ...draft,
        priceMin: num(priceMinInput),
        priceMax: num(priceMaxInput),
        yearMin: num(yearMinInput),
        yearMax: num(yearMaxInput),
        powerMin: num(powerMinInput),
        powerMax: num(powerMaxInput),
        sensitivityMin: num(sensMinInput),
        sensitivityMax: num(sensMaxInput),
        recPowerMin: num(recMinInput),
        recPowerMax: num(recMaxInput),
        ratedCapacityMin: num(capMinInput),
        ratedCapacityMax: num(capMaxInput),
        cableLengthMin: num(lenMinInput),
        cableLengthMax: num(lenMaxInput)
      },
      draftSubCategories
    );
    onClose();
  };

  // 현재 모달에서 선택한 항목들을 칩으로 표시
  const rangeLabel = (min: string, max: string, suffix: string): string | null => {
    const useComma = suffix !== ''; // 연도(빈 suffix)는 콤마 미적용
    const fmt = (s: string) => {
      if (!useComma) return s;
      const n = Number(s);
      return Number.isFinite(n) ? n.toLocaleString('ko-KR') : s;
    };
    const a = min.trim();
    const b = max.trim();
    if (a && b) return `${fmt(a)} ~ ${fmt(b)}${suffix}`;
    if (a) return `${fmt(a)}${suffix} 이상`;
    if (b) return `${fmt(b)}${suffix} 이하`;
    return null;
  };

  const setFieldKeys: (keyof Filters)[] = [
    'brand', 'condition', 'ownership', 'country', 'region',
    'ampType', 'ampDetail', 'ampMethod', 'impedance', 'phono', 'toneControl', 'remote', 'voltage',
    'speakerDetail', 'driverConfig', 'enclosure', 'speakerImpedance', 'connection', 'wooferSize',
    'driveType', 'tonearm', 'cartridge', 'speeds', 'autoMode', 'dustCover',
    'terminalIn', 'terminalOut', 'directional', 'conductor', 'plating', 'shield', 'pair'
  ];
  const prefixFor: Partial<Record<keyof Filters, string>> = {
    phono: '포노',
    toneControl: '톤 컨트롤',
    remote: '리모컨',
    terminalIn: '입력',
    terminalOut: '출력',
    directional: '방향성',
    conductor: '도체',
    plating: '도금',
    shield: '차폐'
  };

  const draftChips: { key: string; label: string; remove: () => void }[] = [];
  for (const sc of draftSubCategories) {
    draftChips.push({
      key: `sub-${sc}`,
      label: sc,
      remove: () => toggleDraftSubCategory(sc)
    });
  }
  // 입력/출력 단자 결합 칩 (둘 다 정확히 1개 선택된 경우)
  const tInSize = draft.terminalIn.size;
  const tOutSize = draft.terminalOut.size;
  const combineTerm = tInSize === 1 && tOutSize === 1;
  if (combineTerm) {
    const tIn = [...draft.terminalIn][0];
    const tOut = [...draft.terminalOut][0];
    draftChips.push({
      key: `term-pair-${tIn}-${tOut}`,
      label: `입력: ${tIn} → 출력: ${tOut}`,
      remove: () => setDraft({ ...draft, terminalIn: new Set(), terminalOut: new Set() })
    });
  }
  for (const key of setFieldKeys) {
    if (combineTerm && (key === 'terminalIn' || key === 'terminalOut')) continue;
    for (const v of draft[key] as Set<string>) {
      const prefix = prefixFor[key];
      const useColon = key === 'terminalIn' || key === 'terminalOut';
      draftChips.push({
        key: `${key}-${v}`,
        label: prefix ? (useColon ? `${prefix}: ${v}` : `${prefix} ${v}`) : v,
        remove: () => toggleIn(key)(v)
      });
    }
  }
  const priceLabel = rangeLabel(priceMinInput, priceMaxInput, '만원');
  if (priceLabel)
    draftChips.push({
      key: 'price',
      label: `가격: ${priceLabel}`,
      remove: () => {
        setPriceMinInput('');
        setPriceMaxInput('');
      }
    });
  const yearLabel = rangeLabel(yearMinInput, yearMaxInput, '');
  if (yearLabel)
    draftChips.push({
      key: 'year',
      label: `출시년도: ${yearLabel}`,
      remove: () => {
        setYearMinInput('');
        setYearMaxInput('');
      }
    });
  const powerLabel = rangeLabel(powerMinInput, powerMaxInput, 'W');
  if (powerLabel)
    draftChips.push({
      key: 'power',
      label: `정격 출력: ${powerLabel}`,
      remove: () => {
        setPowerMinInput('');
        setPowerMaxInput('');
      }
    });
  const sensLabel = rangeLabel(sensMinInput, sensMaxInput, 'dB');
  if (sensLabel)
    draftChips.push({
      key: 'sensitivity',
      label: `감도: ${sensLabel}`,
      remove: () => {
        setSensMinInput('');
        setSensMaxInput('');
      }
    });
  const recLabel = rangeLabel(recMinInput, recMaxInput, 'W');
  if (recLabel)
    draftChips.push({
      key: 'recPower',
      label: `권장 앰프 출력: ${recLabel}`,
      remove: () => {
        setRecMinInput('');
        setRecMaxInput('');
      }
    });
  const capLabel = rangeLabel(capMinInput, capMaxInput, 'W');
  if (capLabel)
    draftChips.push({
      key: 'ratedCapacity',
      label: `정격 용량: ${capLabel}`,
      remove: () => {
        setCapMinInput('');
        setCapMaxInput('');
      }
    });
  const lenLabel = rangeLabel(lenMinInput, lenMaxInput, 'm');
  if (lenLabel)
    draftChips.push({
      key: 'cableLength',
      label: `길이: ${lenLabel}`,
      remove: () => {
        setLenMinInput('');
        setLenMaxInput('');
      }
    });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-[#e0e0e0]">
          <h3 className="text-lg font-bold text-[#000000]">필터</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-[#f7f7f7] flex items-center justify-center"
            aria-label="닫기"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* 본문 (아코디언, 스크롤) */}
        <div className="min-h-0 px-5 overflow-y-auto">
          {categoryOptions.length > 0 && !isSource && !isAccessory && !isTtAccessory && (
            <Section title="카테고리" defaultOpen>
              <CheckGroup
                options={categoryOptions}
                selected={draftSubCategories}
                onToggle={toggleDraftSubCategory}
                counts={counts.subcategory}
              />
            </Section>
          )}
          {isSource &&
            SOURCE_GROUPS.map((g) => (
              <Section key={g.title} title={g.title} defaultOpen>
                <CheckGroup
                  options={g.items}
                  selected={draftSubCategories}
                  onToggle={toggleDraftSubCategory}
                  counts={counts.subcategory}
                />
              </Section>
            ))}
          {isAccessory &&
            ACCESSORY_GROUPS.map((g) => (
              <Section key={g.title} title={g.title} defaultOpen>
                <CheckGroup
                  options={g.items}
                  selected={draftSubCategories}
                  onToggle={toggleDraftSubCategory}
                  counts={counts.subcategory}
                />
              </Section>
            ))}
          {isTtAccessory &&
            TT_ACCESSORY_GROUPS.map((g) => (
              <Section key={g.title} title={g.title} defaultOpen>
                <CheckGroup
                  options={g.items}
                  selected={draftSubCategories}
                  onToggle={toggleDraftSubCategory}
                  counts={counts.subcategory}
                />
              </Section>
            ))}
          {draftIsPowerDevice && (
            <Section title="정격 용량 (W)" defaultOpen>
              <MinMaxRow
                minVal={capMinInput}
                maxVal={capMaxInput}
                setMin={setCapMinInput}
                setMax={setCapMaxInput}
              />
            </Section>
          )}
          {draftIsCable && (
            <>
              <Section title="길이 (m)" defaultOpen>
                <MinMaxRow
                  minVal={lenMinInput}
                  maxVal={lenMaxInput}
                  setMin={setLenMinInput}
                  setMax={setLenMaxInput}
                />
              </Section>
              {(() => {
                const sortedTerms = terminalsPrioritized([...draftSubCategories]);
                return (
                  <Section title="입출력 단자" defaultOpen>
                    <div className="flex items-stretch gap-2 max-w-xs">
                      <FilterDropdown
                        label="입력 단자"
                        options={sortedTerms}
                        selected={draft.terminalIn}
                        onToggle={toggleIn('terminalIn')}
                        onClear={() => setDraft({ ...draft, terminalIn: new Set() })}
                        counts={counts.terminalIn}
                        scrollable
                        variant="box"
                      />
                      <FilterDropdown
                        label="출력 단자"
                        options={sortedTerms}
                        selected={draft.terminalOut}
                        onToggle={toggleIn('terminalOut')}
                        onClear={() => setDraft({ ...draft, terminalOut: new Set() })}
                        counts={counts.terminalOut}
                        scrollable
                        variant="box"
                      />
                    </div>
                  </Section>
                );
              })()}
              <Section title="도체 재질" defaultOpen>
                <CheckGroup
                  options={CONDUCTOR_OPTS}
                  selected={draft.conductor}
                  onToggle={toggleIn('conductor')}
                  counts={counts.conductor}
                />
              </Section>
              <Section title="커넥터 도금" defaultOpen>
                <CheckGroup
                  options={PLATING_OPTS}
                  selected={draft.plating}
                  onToggle={toggleIn('plating')}
                  counts={counts.plating}
                />
              </Section>
              {[...draftSubCategories].some((s) => SHIELD_RELEVANT.includes(s)) && (
                <Section title="차폐 방식" defaultOpen>
                  <CheckGroup
                    options={SHIELD_OPTS}
                    selected={draft.shield}
                    onToggle={toggleIn('shield')}
                    counts={counts.shield}
                  />
                </Section>
              )}
              <Section title="페어 여부" defaultOpen>
                <CheckGroup
                  options={PAIR_OPTS}
                  selected={draft.pair}
                  onToggle={toggleIn('pair')}
                  counts={counts.pair}
                />
              </Section>
              <Section title="방향성" defaultOpen>
                <CheckGroup
                  options={DIRECTIONALITY_OPTS}
                  selected={draft.directional}
                  onToggle={toggleIn('directional')}
                  counts={counts.directional}
                />
              </Section>
            </>
          )}
          {isAmp && (
            <>
              <Section title="세부 카테고리" defaultOpen>
                <CheckGroup
                  options={AMP_DETAILS}
                  selected={draft.ampDetail}
                  onToggle={toggleIn('ampDetail')}
                  counts={counts.ampDetail}
                />
              </Section>
              <Section title="증폭 방식" defaultOpen>
                <CheckGroup
                  options={AMP_METHODS}
                  selected={draft.ampMethod}
                  onToggle={toggleIn('ampMethod')}
                  counts={counts.ampMethod}
                />
              </Section>
            </>
          )}
          {isSpeaker && (
            <Section title="세부 카테고리" defaultOpen>
              <CheckGroup
                options={SPEAKER_DETAILS}
                selected={draft.speakerDetail}
                onToggle={toggleIn('speakerDetail')}
                counts={counts.speakerDetail}
              />
            </Section>
          )}

          <Section title="브랜드" defaultOpen>
            <CheckGroup
              options={brandOptions}
              selected={draft.brand}
              onToggle={toggleIn('brand')}
              counts={counts.brand}
              maxVisible={5}
            />
          </Section>
          <Section title="상태" defaultOpen>
            <CheckGroup
              options={CONDITIONS}
              selected={draft.condition}
              onToggle={toggleIn('condition')}
              counts={counts.condition}
            />
          </Section>
          <Section title="가격" defaultOpen>
            <MinMaxRow
              minVal={priceMinInput}
              maxVal={priceMaxInput}
              setMin={setPriceMinInput}
              setMax={setPriceMaxInput}
              thousands
            />
          </Section>

          {isAmp && (
            <>
              <Section title="정격 출력 (W)" defaultOpen>
                <MinMaxRow
                  minVal={powerMinInput}
                  maxVal={powerMaxInput}
                  setMin={setPowerMinInput}
                  setMax={setPowerMaxInput}
                />
              </Section>
              <Section title="지원 임피던스">
                <CheckGroup
                  options={IMPEDANCE_OPTS}
                  selected={draft.impedance}
                  onToggle={toggleIn('impedance')}
                  counts={counts.impedance}
                />
              </Section>
              <Section title="포노 입력">
                <CheckGroup
                  options={PHONO_OPTS}
                  selected={draft.phono}
                  onToggle={toggleIn('phono')}
                  counts={counts.phono}
                />
              </Section>
              <Section title="톤 컨트롤">
                <CheckGroup
                  options={TONE_OPTS}
                  selected={draft.toneControl}
                  onToggle={toggleIn('toneControl')}
                  counts={counts.toneControl}
                />
              </Section>
              <Section title="리모컨">
                <CheckGroup
                  options={REMOTE_OPTS}
                  selected={draft.remote}
                  onToggle={toggleIn('remote')}
                  counts={counts.remote}
                />
              </Section>
              <Section title="전원전압">
                <CheckGroup
                  options={VOLTAGE_OPTS}
                  selected={draft.voltage}
                  onToggle={toggleIn('voltage')}
                  counts={counts.voltage}
                />
              </Section>
            </>
          )}

          {isSpeaker && (
            <>
              <Section title="연결 방식" defaultOpen>
                <CheckGroup
                  options={CONNECTION_TYPES}
                  selected={draft.connection}
                  onToggle={toggleIn('connection')}
                  counts={counts.connection}
                />
              </Section>
              <Section title="드라이버 구성">
                <CheckGroup
                  options={DRIVER_CONFIGS}
                  selected={draft.driverConfig}
                  onToggle={toggleIn('driverConfig')}
                  counts={counts.driverConfig}
                />
              </Section>
              <Section title="우퍼 크기">
                <CheckGroup
                  options={WOOFER_SIZES}
                  selected={draft.wooferSize}
                  onToggle={toggleIn('wooferSize')}
                  counts={counts.wooferSize}
                />
              </Section>
              <Section title="인클로저 타입">
                <CheckGroup
                  options={ENCLOSURE_TYPES}
                  selected={draft.enclosure}
                  onToggle={toggleIn('enclosure')}
                  counts={counts.enclosure}
                />
              </Section>
              <Section title="임피던스">
                <CheckGroup
                  options={SPEAKER_IMPEDANCE}
                  selected={draft.speakerImpedance}
                  onToggle={toggleIn('speakerImpedance')}
                  counts={counts.speakerImpedance}
                />
              </Section>
              <Section title="감도 (dB)">
                <MinMaxRow
                  minVal={sensMinInput}
                  maxVal={sensMaxInput}
                  setMin={setSensMinInput}
                  setMax={setSensMaxInput}
                />
              </Section>
              <Section title="권장 앰프 출력 (W)">
                <MinMaxRow
                  minVal={recMinInput}
                  maxVal={recMaxInput}
                  setMin={setRecMinInput}
                  setMax={setRecMaxInput}
                />
              </Section>
            </>
          )}

          {draftIsTurntable && (
            <>
              <Section title="구동 방식" defaultOpen>
                <CheckGroup
                  options={DRIVE_TYPES}
                  selected={draft.driveType}
                  onToggle={toggleIn('driveType')}
                  counts={counts.driveType}
                />
              </Section>
              <Section title="톤암" defaultOpen>
                <CheckGroup
                  options={TONEARM_OPTS}
                  selected={draft.tonearm}
                  onToggle={toggleIn('tonearm')}
                  counts={counts.tonearm}
                />
              </Section>
              <Section title="카트리지" defaultOpen>
                <CheckGroup
                  options={CARTRIDGE_OPTS}
                  selected={draft.cartridge}
                  onToggle={toggleIn('cartridge')}
                  counts={counts.cartridge}
                />
              </Section>
              <Section title="속도" defaultOpen>
                <CheckGroup
                  options={SPEED_OPTS}
                  selected={draft.speeds}
                  onToggle={toggleIn('speeds')}
                  counts={counts.speeds}
                />
              </Section>
              <Section title="오토 기능" defaultOpen>
                <CheckGroup
                  options={AUTO_OPTS}
                  selected={draft.autoMode}
                  onToggle={toggleIn('autoMode')}
                  counts={counts.autoMode}
                />
              </Section>
              <Section title="더스트 커버" defaultOpen>
                <CheckGroup
                  options={DUSTCOVER_OPTS}
                  selected={draft.dustCover}
                  onToggle={toggleIn('dustCover')}
                  counts={counts.dustCover}
                />
              </Section>
            </>
          )}

          <Section title="출시년도">
            <MinMaxRow
              minVal={yearMinInput}
              maxVal={yearMaxInput}
              setMin={setYearMinInput}
              setMax={setYearMaxInput}
            />
          </Section>
          <Section title="소유권">
            <CheckGroup
              options={OWNERSHIP_OPTS}
              selected={draft.ownership}
              onToggle={toggleIn('ownership')}
              counts={counts.ownership}
            />
          </Section>
          <Section title="제조국">
            <CheckGroup
              options={COUNTRY_OPTS}
              selected={draft.country}
              onToggle={toggleIn('country')}
              counts={counts.country}
            />
          </Section>
          <Section title="지역">
            <CheckGroup
              options={LOCATIONS}
              selected={draft.region}
              onToggle={toggleIn('region')}
              counts={counts.region}
            />
          </Section>
        </div>

        {/* 선택한 필터 칩 */}
        {draftChips.length > 0 && (
          <div className="flex-shrink-0 border-t border-[#e0e0e0] px-5 py-3 max-h-28 overflow-y-auto">
            <div className="flex flex-wrap gap-2">
              {draftChips.map((chip) => (
                <button
                  key={chip.key}
                  onClick={chip.remove}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-[#f7f7f7] text-[#000000] border border-[#e0e0e0] rounded-full text-xs font-medium hover:bg-[#e0e0e0]"
                >
                  {chip.label}
                  <X className="w-3 h-3" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 푸터 */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-t border-[#e0e0e0]">
          <button
            onClick={handleReset}
            className="text-sm text-gray-600 hover:text-[#000000] font-medium"
          >
            필터 초기화
          </button>
          <button
            onClick={handleApply}
            className="bg-[#000000] text-white text-sm font-semibold px-6 py-2 rounded-lg hover:bg-[#000000] transition"
          >
            적용하기 ({previewCount.toLocaleString('ko-KR')}건)
          </button>
        </div>
      </div>
    </div>
  );
}

