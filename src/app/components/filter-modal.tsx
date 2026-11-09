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
import { FEATURE_FLAGS } from '../data/feature-flags'; // 숨김 플래그 (docs/hidden.md)
import { FILTER_LABELS as FL, FILTER_CHIP_PREFIX } from '@/lib/labels'; // 필터 칸 이름, 칩 접두 (labels.ts 한 곳)
import {
  ACCESSORY_GROUPS,
  AMP_DETAILS,
  AMP_GROUPS,
  AMP_METHODS,
  AMP_TYPES,
  AUTO_OPTS,
  CARTRIDGE_OPTS,
  CONDITIONS,
  APPEARANCE_OPTS,
  WORKING_OPTS,
  CONDUCTOR_OPTS,
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
  LOCATION_COUNTRIES,
  regionOptionsFor,
  REGION_VISIBLE_ALL,
  pruneRegions,
  Listing,
  OWNERSHIP_OPTS,
  PAIR_OPTS,
  PHONO_OPTS,
  PLATING_OPTS,
  filterVisibility,
  isFilterKeyVisible,
  pruneHiddenFilters,
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
  VOLTAGE_OPTS,
  PHONO_BUILTIN_OPTS,
  CD_DIGITAL_OUTS,
  CD_ANALOG_OUTS,
  TUNER_BANDS,
  CAS_HEAD_COUNTS,
  CAS_AUTOREVERSES,
  CAS_CAPSTANS,
  CAS_NRS,
  CAS_TAPE_TYPES,
  CAS_HEAD_WEARS,
  WOOFER_SIZES,
  applyFilters,
  cloneFilters,
  computeCategories,
  countBy,
  countFilters,
  emptyFilters,
  filterLabel,
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
    <div className="border-b border-surface last:border-b-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-4"
      >
        <h4 className="text-16 font-bold text-fg">{title}</h4>
        {open ? (
          <ChevronUp className="w-5 h-5 text-muted" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted" />
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
  maxVisible,
  getLabel
}: {
  options: readonly string[];
  selected: Set<string>;
  onToggle: (v: string) => void;
  counts?: Record<string, number>;
  maxVisible?: number;
  getLabel?: (opt: string) => string; // 옵션 값(언어 중립 키) → 화면 글자. 없으면 값 그대로
}) {
  const [showAll, setShowAll] = useState(false);
  const hasMore = maxVisible != null && options.length > maxVisible;
  const visible = hasMore && !showAll ? options.slice(0, maxVisible) : options;

  return (
    <div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {visible.map((opt) => (
          <label
            key={opt}
            className="flex items-center gap-2 text-14 text-fg cursor-pointer hover:text-fg"
          >
            <input
              type="checkbox"
              checked={selected.has(opt)}
              onChange={() => onToggle(opt)}
              className="accent-fg"
            />
            <span>{getLabel ? getLabel(opt) : opt}</span>
            {counts && <span className="text-muted">({counts[opt] ?? 0})</span>}
          </label>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="flex items-center gap-1 mt-2 text-14 font-medium text-fg hover:text-fg"
        >
          {showAll ? (
            <>
              <Minus className="w-4 h-4" />
              접기
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              모두 보기
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
  minOnly = false,
  minPlaceholder = '최소'
}: {
  minVal: string;
  maxVal: string;
  setMin: (s: string) => void;
  setMax: (s: string) => void;
  thousands?: boolean;
  minOnly?: boolean;
  minPlaceholder?: string;
}) {
  const display = (s: string) =>
    thousands && s !== '' ? Number(s).toLocaleString('ko-KR') : s;
  const handle = (setter: (s: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(thousands ? e.target.value.replace(/[^\d]/g, '') : e.target.value);
  };

  return (
    <div className="flex items-stretch border border-line rounded-lg overflow-hidden focus-within:border-fg max-w-xs">
      <input
        type={thousands ? 'text' : 'number'}
        inputMode="numeric"
        min={0}
        value={display(minVal)}
        onChange={handle(setMin)}
        placeholder={minPlaceholder}
        className="flex-1 w-0 px-3 py-2 text-14 focus:outline-none"
      />
      {!minOnly && (
        <>
          <span className="w-px bg-line" />
          <input
            type={thousands ? 'text' : 'number'}
            inputMode="numeric"
            min={0}
            value={display(maxVal)}
            onChange={handle(setMax)}
            placeholder="최대"
            className="flex-1 w-0 px-3 py-2 text-14 focus:outline-none"
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
  category,
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
  category: string | null; // 대분류 한글 — filterVisibility 에 넣음
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
  // 필터 값(키) → 화면 글자 (체크 칸, 칩 공용)
  const lab = (k: keyof Filters) => (v: string) => filterLabel(k, v);
  const [draftSubCategories, setDraftSubCategories] = useState<Set<string>>(
    () => new Set(subCategories)
  );

  // 모달에서 하위 카테고리를 바꾸면 사라지는 필터 칸의 값(체크와 범위 입력)도 같이 비움 — 사이드바와 같은 규칙(pruneHiddenFilters, 2026-11-10)
  const toggleDraftSubCategory = (v: string) => {
    const next = new Set(draftSubCategories);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    setDraftSubCategories(next);
    const nv = filterVisibility(category, next);
    setDraft((d) => pruneHiddenFilters(d, nv));
    if (!nv.power) { setPowerMinInput(''); setPowerMaxInput(''); }
    if (!nv.headphoneImp) setHpImpInput('');
    if (!nv.speaker) { setSensMinInput(''); setSensMaxInput(''); setRecMinInput(''); setRecMaxInput(''); }
    if (!nv.powerDevice) { setCapMinInput(''); setCapMaxInput(''); }
    if (!nv.cable) { setLenMinInput(''); setLenMaxInput(''); }
  };
  const str = (n: number | null) => (n != null ? String(n) : '');
  const [priceMinInput, setPriceMinInput] = useState(str(filters.priceMin));
  const [priceMaxInput, setPriceMaxInput] = useState(str(filters.priceMax));
  const [yearMinInput, setYearMinInput] = useState(str(filters.yearMin));
  const [yearMaxInput, setYearMaxInput] = useState(str(filters.yearMax));
  const [powerMinInput, setPowerMinInput] = useState(str(filters.powerMin));
  const [powerMaxInput, setPowerMaxInput] = useState(str(filters.powerMax));
  const [hpImpInput, setHpImpInput] = useState(str(filters.headphoneImp)); // 헤드폰 앰프: 내 헤드폰 임피던스(Ω)
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

  // 어떤 필터 칸이 보이나 — 사이드바와 같은 함수(browse-filters.ts filterVisibility)에 모달에서 고르는 중인 하위 카테고리를 넣어서 (2026-11-10)
  const draftVis = useMemo(() => filterVisibility(category, draftSubCategories), [category, draftSubCategories]);
  const draftIsTurntable = draftVis.turntable;
  const draftIsCd = draftVis.cd;
  const draftIsTuner = draftVis.tuner;
  const draftIsPowerDevice = draftVis.powerDevice;
  const draftIsCable = draftVis.cable;
  const draftIsHeadphoneAmp = draftVis.headphoneImp;

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
      headphoneImp: num(hpImpInput),
      sensitivityMin: num(sensMinInput),
      sensitivityMax: num(sensMaxInput),
      recPowerMin: num(recMinInput),
      recPowerMax: num(recMaxInput),
      ratedCapacityMin: num(capMinInput),
      ratedCapacityMax: num(capMaxInput),
      cableLengthMin: num(lenMinInput),
      cableLengthMax: num(lenMaxInput)
    };
    return applyFilters(base, effective, draftVis).length;
  }, [draftVis, draft, draftSubCategories, priceMinInput, priceMaxInput, yearMinInput, yearMaxInput, powerMinInput, powerMaxInput, hpImpInput, sensMinInput, sensMaxInput, recMinInput, recMaxInput, capMinInput, capMaxInput, lenMinInput, lenMaxInput, listings, isAmp, isSpeaker, draftIsTurntable, draftIsPowerDevice, draftIsCable]);

  const handleReset = () => {
    setDraft(emptyFilters());
    setDraftSubCategories(new Set());
    setPriceMinInput('');
    setPriceMaxInput('');
    setYearMinInput('');
    setYearMaxInput('');
    setPowerMinInput('');
    setPowerMaxInput('');
    setHpImpInput('');
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
        headphoneImp: num(hpImpInput),
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
    'brand', 'model', 'condition', 'appearance', 'working', 'ownership', 'country', 'locationCountry', 'region',
    'ampType', 'ampDetail', 'ampMethod', 'impedance', 'phono', 'toneControl', 'remote', 'voltage',
    'speakerDetail', 'driverConfig', 'enclosure', 'speakerImpedance', 'wooferSize',
    'driveType', 'tonearm', 'cartridge', 'speeds', 'autoMode', 'dustCover', 'phonoBuiltIn', 'cdDigitalOut', 'cdAnalogOut', 'tunerBand',
    'headCount', 'autoReverse', 'capstan', 'noiseReduction', 'tapeTypeRec', 'headWear',
    'terminalIn', 'terminalOut', 'directional', 'conductor', 'plating', 'shield', 'pair'
  ];
  const prefixFor: Partial<Record<keyof Filters, string>> = FILTER_CHIP_PREFIX; // 칩 접두 — labels.ts 한 표(사이드바 칩과 같음)

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
      label: `${FILTER_CHIP_PREFIX.terminalIn}: ${tIn} → ${FILTER_CHIP_PREFIX.terminalOut}: ${tOut}`,
      remove: () => setDraft({ ...draft, terminalIn: new Set(), terminalOut: new Set() })
    });
  }
  for (const key of setFieldKeys) {
    if (!isFilterKeyVisible(key, draftVis)) continue; // 지금 보이는 칸의 값만 칩으로 (사이드바와 같은 규칙)
    if (combineTerm && (key === 'terminalIn' || key === 'terminalOut')) continue;
    for (const v of draft[key] as Set<string>) {
      const prefix = prefixFor[key];
      const useColon = key === 'terminalIn' || key === 'terminalOut';
      const t = filterLabel(key, v); // 칩 글자 = 값(키)의 화면 글자
      draftChips.push({
        key: `${key}-${v}`,
        label: prefix ? (useColon ? `${prefix}: ${t}` : `${prefix} ${t}`) : t,
        remove: () => toggleIn(key)(v)
      });
    }
  }
  const priceLabel = rangeLabel(priceMinInput, priceMaxInput, '만원');
  if (priceLabel)
    draftChips.push({
      key: 'price',
      label: `${FL.price}: ${priceLabel}`,
      remove: () => {
        setPriceMinInput('');
        setPriceMaxInput('');
      }
    });
  const yearLabel = rangeLabel(yearMinInput, yearMaxInput, '');
  if (yearLabel)
    draftChips.push({
      key: 'year',
      label: `${FL.year}: ${yearLabel}`,
      remove: () => {
        setYearMinInput('');
        setYearMaxInput('');
      }
    });
  const powerLabel = draftVis.power ? rangeLabel(powerMinInput, powerMaxInput, 'W') : null;
  if (powerLabel)
    draftChips.push({
      key: 'power',
      label: `${FL.power}: ${powerLabel}`,
      remove: () => {
        setPowerMinInput('');
        setPowerMaxInput('');
      }
    });
  const sensLabel = rangeLabel(sensMinInput, sensMaxInput, 'dB');
  if (sensLabel)
    draftChips.push({
      key: 'sensitivity',
      label: `${FL.sensitivity}: ${sensLabel}`,
      remove: () => {
        setSensMinInput('');
        setSensMaxInput('');
      }
    });
  const recLabel = rangeLabel(recMinInput, recMaxInput, 'W');
  if (recLabel)
    draftChips.push({
      key: 'recPower',
      label: `${FL.recPower}: ${recLabel}`,
      remove: () => {
        setRecMinInput('');
        setRecMaxInput('');
      }
    });
  const capLabel = rangeLabel(capMinInput, capMaxInput, 'W');
  if (capLabel)
    draftChips.push({
      key: 'ratedCapacity',
      label: `${FL.ratedCapacity}: ${capLabel}`,
      remove: () => {
        setCapMinInput('');
        setCapMaxInput('');
      }
    });
  const lenLabel = rangeLabel(lenMinInput, lenMaxInput, 'm');
  if (lenLabel)
    draftChips.push({
      key: 'cableLength',
      label: `${FL.cableLength}: ${lenLabel}`,
      remove: () => {
        setLenMinInput('');
        setLenMaxInput('');
      }
    });

  return (
    <div
      className="fixed inset-0 z-50 bg-fg/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-bg rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-line">
          <h3 className="text-20 font-bold text-fg">필터</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-surface flex items-center justify-center"
            aria-label="닫기"
          >
            <X className="w-5 h-5 text-fg" />
          </button>
        </div>

        {/* 본문 (아코디언, 스크롤) */}
        <div className="min-h-0 px-5 overflow-y-auto">
          {categoryOptions.length > 0 && !isSource && !isAccessory && !isTtAccessory && (
            <Section title={FL.category} defaultOpen>
              <CheckGroup
                options={categoryOptions}
                selected={draftSubCategories}
                onToggle={toggleDraftSubCategory}
                counts={counts.subcategory}
              />
            </Section>
          )}
          {isSource &&
            SOURCE_GROUPS.map((g) => ({ ...g, items: g.items.filter((it) => categoryOptions.includes(it)) })) // 숨김 표식 칸 제외 (categoryOptions = 보이는 하위 카테고리)
              .filter((g) => g.items.length > 0)
              .map((g) => (
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
            <Section title={`${FL.ratedCapacity} (W)`} defaultOpen>
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
              <Section title={`${FL.cableLength} (m)`} defaultOpen>
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
                  <Section title={FL.terminalInOut} defaultOpen>
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
              <Section title={FL.conductor} defaultOpen>
                <CheckGroup
                  options={CONDUCTOR_OPTS}
                  selected={draft.conductor}
                  onToggle={toggleIn('conductor')}
                  counts={counts.conductor}
                />
              </Section>
              <Section title={FL.plating} defaultOpen>
                <CheckGroup
                  options={PLATING_OPTS}
                  selected={draft.plating}
                  onToggle={toggleIn('plating')}
                  counts={counts.plating}
                />
              </Section>
              {[...draftSubCategories].some((s) => SHIELD_RELEVANT.includes(s)) && (
                <Section title={FL.shield} defaultOpen>
                  <CheckGroup
                    options={SHIELD_OPTS}
                    selected={draft.shield}
                    onToggle={toggleIn('shield')}
                    counts={counts.shield}
                  />
                </Section>
              )}
              <Section title={FL.pair} defaultOpen>
                <CheckGroup
                  options={PAIR_OPTS}
                  selected={draft.pair}
                  onToggle={toggleIn('pair')}
                  counts={counts.pair}
                />
              </Section>
              <Section title={FL.directional} defaultOpen>
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
              {draftVis.channel && (
              <Section title={FL.ampDetail} defaultOpen>
                <CheckGroup
                  options={AMP_DETAILS}
                  selected={draft.ampDetail}
                  getLabel={lab('ampDetail')}
                  onToggle={toggleIn('ampDetail')}
                  counts={counts.ampDetail}
                />
              </Section>
              )}
              <Section title={FL.ampMethod} defaultOpen>
                <CheckGroup
                  options={AMP_METHODS}
                  selected={draft.ampMethod}
                  getLabel={lab('ampMethod')}
                  onToggle={toggleIn('ampMethod')}
                  counts={counts.ampMethod}
                />
              </Section>
            </>
          )}
          {isSpeaker && (
            <Section title={FL.speakerDetail} defaultOpen>
              <CheckGroup
                options={SPEAKER_DETAILS}
                selected={draft.speakerDetail}
                  getLabel={lab('speakerDetail')}
                onToggle={toggleIn('speakerDetail')}
                counts={counts.speakerDetail}
              />
            </Section>
          )}

          <Section title={FL.brand} defaultOpen>
            <CheckGroup
              options={brandOptions}
              selected={draft.brand}
              onToggle={toggleIn('brand')}
              counts={counts.brand}
              maxVisible={5}
            />
          </Section>
          {/* 상태(종류 4개) → 외관 상태 → 작동 상태 (2026-11-10 상태 등급 재구성) */}
          <Section title={FL.condition} defaultOpen>
            <CheckGroup
              options={CONDITIONS}
              selected={draft.condition}
                  getLabel={lab('condition')}
              onToggle={toggleIn('condition')}
              counts={counts.condition}
            />
          </Section>
          <Section title={FL.appearance} defaultOpen>
            <CheckGroup options={APPEARANCE_OPTS} selected={draft.appearance} getLabel={lab('appearance')} onToggle={toggleIn('appearance')} counts={counts.appearance} />
          </Section>
          <Section title={FL.working} defaultOpen>
            <CheckGroup options={WORKING_OPTS} selected={draft.working} getLabel={lab('working')} onToggle={toggleIn('working')} counts={counts.working} />
          </Section>
          <Section title={FL.price} defaultOpen>
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
              {draftIsHeadphoneAmp ? (
                <Section title={`${FL.headphoneImp} (Ω)`} defaultOpen>
                  <MinMaxRow minVal={hpImpInput} maxVal="" setMin={setHpImpInput} setMax={() => {}} minOnly minPlaceholder="예: 32" />
                </Section>
              ) : draftVis.power && (
                <Section title={`${FL.power} (W)`} defaultOpen>
                  <MinMaxRow
                    minVal={powerMinInput}
                    maxVal={powerMaxInput}
                    setMin={setPowerMinInput}
                    setMax={setPowerMaxInput}
                  />
                </Section>
              )}
              {draftVis.impedance && (
              <Section title={FL.impedance}>
                <CheckGroup
                  options={IMPEDANCE_OPTS}
                  selected={draft.impedance}
                  onToggle={toggleIn('impedance')}
                  counts={counts.impedance}
                />
              </Section>
              )}
              <Section title={FL.phono}>
                <CheckGroup
                  options={PHONO_OPTS}
                  selected={draft.phono}
                  getLabel={lab('phono')}
                  onToggle={toggleIn('phono')}
                  counts={counts.phono}
                />
              </Section>
              {FEATURE_FLAGS.toneControlFilter && (
              <Section title={FL.toneControl}>
                <CheckGroup
                  options={TONE_OPTS}
                  selected={draft.toneControl}
                  getLabel={lab('toneControl')}
                  onToggle={toggleIn('toneControl')}
                  counts={counts.toneControl}
                />
              </Section>
              )}
              {FEATURE_FLAGS.remoteFilter && (
              <Section title={FL.remote}>
                <CheckGroup
                  options={REMOTE_OPTS}
                  selected={draft.remote}
                  getLabel={lab('remote')}
                  onToggle={toggleIn('remote')}
                  counts={counts.remote}
                />
              </Section>
              )}
              <Section title={FL.voltage}>
                <CheckGroup
                  options={VOLTAGE_OPTS}
                  selected={draft.voltage}
                  getLabel={lab('voltage')}
                  onToggle={toggleIn('voltage')}
                  counts={counts.voltage}
                />
              </Section>
            </>
          )}

          {isSpeaker && (
            <>
              <Section title={FL.driverConfig}>
                <CheckGroup
                  options={DRIVER_CONFIGS}
                  selected={draft.driverConfig}
                  getLabel={lab('driverConfig')}
                  onToggle={toggleIn('driverConfig')}
                  counts={counts.driverConfig}
                />
              </Section>
              <Section title={FL.wooferSize}>
                <CheckGroup
                  options={WOOFER_SIZES}
                  selected={draft.wooferSize}
                  getLabel={lab('wooferSize')}
                  onToggle={toggleIn('wooferSize')}
                  counts={counts.wooferSize}
                />
              </Section>
              <Section title={FL.enclosure}>
                <CheckGroup
                  options={ENCLOSURE_TYPES}
                  selected={draft.enclosure}
                  getLabel={lab('enclosure')}
                  onToggle={toggleIn('enclosure')}
                  counts={counts.enclosure}
                />
              </Section>
              <Section title={FL.speakerImpedance}>
                <CheckGroup
                  options={SPEAKER_IMPEDANCE}
                  selected={draft.speakerImpedance}
                  getLabel={lab('speakerImpedance')}
                  onToggle={toggleIn('speakerImpedance')}
                  counts={counts.speakerImpedance}
                />
              </Section>
              <Section title={`${FL.sensitivity} (dB)`}>
                <MinMaxRow
                  minVal={sensMinInput}
                  maxVal={sensMaxInput}
                  setMin={setSensMinInput}
                  setMax={setSensMaxInput}
                />
              </Section>
              <Section title={FL.voltage}>
                <CheckGroup options={VOLTAGE_OPTS} selected={draft.voltage} getLabel={lab('voltage')} onToggle={toggleIn('voltage')} counts={counts.voltage} />
              </Section>
              {FEATURE_FLAGS.recPowerFilter && (
              <Section title={`${FL.recPower} (W)`}>
                <MinMaxRow
                  minVal={recMinInput}
                  maxVal={recMaxInput}
                  setMin={setRecMinInput}
                  setMax={setRecMaxInput}
                />
              </Section>
              )}
            </>
          )}

          {/* CD 플레이어, 튜너 전용 (2026-11-10) */}
          {draftIsCd && (
            <>
              <Section title={FL.cdDigitalOut} defaultOpen>
                <CheckGroup options={CD_DIGITAL_OUTS} selected={draft.cdDigitalOut} getLabel={lab('cdDigitalOut')} onToggle={toggleIn('cdDigitalOut')} counts={counts.cdDigitalOut} />
              </Section>
              <Section title={FL.cdAnalogOut} defaultOpen>
                <CheckGroup options={CD_ANALOG_OUTS} selected={draft.cdAnalogOut} getLabel={lab('cdAnalogOut')} onToggle={toggleIn('cdAnalogOut')} counts={counts.cdAnalogOut} />
              </Section>
              <Section title={FL.voltage}>
                <CheckGroup options={VOLTAGE_OPTS} selected={draft.voltage} getLabel={lab('voltage')} onToggle={toggleIn('voltage')} counts={counts.voltage} />
              </Section>
            </>
          )}
          {/* 카세트 데크 전용 (2026-11-10) — 핵심 칸 6개 + 전원 전압 */}
          {draftVis.cassette && (
            <>
              <Section title={FL.headCount} defaultOpen>
                <CheckGroup options={CAS_HEAD_COUNTS} selected={draft.headCount} getLabel={lab('headCount')} onToggle={toggleIn('headCount')} counts={counts.headCount} />
              </Section>
              <Section title={FL.autoReverse} defaultOpen>
                <CheckGroup options={CAS_AUTOREVERSES} selected={draft.autoReverse} getLabel={lab('autoReverse')} onToggle={toggleIn('autoReverse')} counts={counts.autoReverse} />
              </Section>
              <Section title={FL.capstan} defaultOpen>
                <CheckGroup options={CAS_CAPSTANS} selected={draft.capstan} getLabel={lab('capstan')} onToggle={toggleIn('capstan')} counts={counts.capstan} />
              </Section>
              <Section title={FL.noiseReduction} defaultOpen>
                <CheckGroup options={CAS_NRS} selected={draft.noiseReduction} getLabel={lab('noiseReduction')} onToggle={toggleIn('noiseReduction')} counts={counts.noiseReduction} />
              </Section>
              <Section title={FL.tapeTypeRec} defaultOpen>
                <CheckGroup options={CAS_TAPE_TYPES} selected={draft.tapeTypeRec} getLabel={lab('tapeTypeRec')} onToggle={toggleIn('tapeTypeRec')} counts={counts.tapeTypeRec} />
              </Section>
              <Section title={FL.headWear} defaultOpen>
                <CheckGroup options={CAS_HEAD_WEARS} selected={draft.headWear} getLabel={lab('headWear')} onToggle={toggleIn('headWear')} counts={counts.headWear} />
              </Section>
              <Section title={FL.voltage} defaultOpen>
                <CheckGroup options={VOLTAGE_OPTS} selected={draft.voltage} getLabel={lab('voltage')} onToggle={toggleIn('voltage')} counts={counts.voltage} />
              </Section>
            </>
          )}
          {draftIsTuner && (
            <>
              <Section title={FL.tunerBand} defaultOpen>
                <CheckGroup options={TUNER_BANDS} selected={draft.tunerBand} getLabel={lab('tunerBand')} onToggle={toggleIn('tunerBand')} counts={counts.tunerBand} />
              </Section>
              <Section title={FL.voltage}>
                <CheckGroup options={VOLTAGE_OPTS} selected={draft.voltage} getLabel={lab('voltage')} onToggle={toggleIn('voltage')} counts={counts.voltage} />
              </Section>
            </>
          )}

          {draftIsTurntable && (
            <>
              {/* 순서: 구동 방식, 회전수, 조작 방식, 톤암, 카트리지, 포노앰프 내장, 전원 전압 (2026-11-10, 형식 필터는 없음) */}
              <Section title={FL.driveType} defaultOpen>
                <CheckGroup
                  options={DRIVE_TYPES}
                  selected={draft.driveType}
                  getLabel={lab('driveType')}
                  onToggle={toggleIn('driveType')}
                  counts={counts.driveType}
                />
              </Section>
              <Section title={FL.speeds} defaultOpen>
                <CheckGroup
                  options={SPEED_OPTS}
                  selected={draft.speeds}
                  getLabel={lab('speeds')}
                  onToggle={toggleIn('speeds')}
                  counts={counts.speeds}
                />
              </Section>
              <Section title={FL.autoMode} defaultOpen>
                <CheckGroup
                  options={AUTO_OPTS}
                  selected={draft.autoMode}
                  getLabel={lab('autoMode')}
                  onToggle={toggleIn('autoMode')}
                  counts={counts.autoMode}
                />
              </Section>
              <Section title={FL.tonearm} defaultOpen>
                <CheckGroup
                  options={TONEARM_OPTS}
                  selected={draft.tonearm}
                  getLabel={lab('tonearm')}
                  onToggle={toggleIn('tonearm')}
                  counts={counts.tonearm}
                />
              </Section>
              <Section title={FL.cartridge} defaultOpen>
                <CheckGroup
                  options={CARTRIDGE_OPTS}
                  selected={draft.cartridge}
                  getLabel={lab('cartridge')}
                  onToggle={toggleIn('cartridge')}
                  counts={counts.cartridge}
                />
              </Section>
              <Section title={FL.phonoBuiltIn} defaultOpen>
                <CheckGroup
                  options={PHONO_BUILTIN_OPTS}
                  selected={draft.phonoBuiltIn}
                  getLabel={lab('phonoBuiltIn')}
                  onToggle={toggleIn('phonoBuiltIn')}
                  counts={counts.phonoBuiltIn}
                />
              </Section>
              <Section title={FL.voltage} defaultOpen>
                <CheckGroup
                  options={VOLTAGE_OPTS}
                  selected={draft.voltage}
                  getLabel={lab('voltage')}
                  onToggle={toggleIn('voltage')}
                  counts={counts.voltage}
                />
              </Section>
              {FEATURE_FLAGS.dustCoverFilter && (
              <Section title={FL.dustCover} defaultOpen>
                <CheckGroup
                  options={DUSTCOVER_OPTS}
                  selected={draft.dustCover}
                  getLabel={lab('dustCover')}
                  onToggle={toggleIn('dustCover')}
                  counts={counts.dustCover}
                />
              </Section>
              )}
            </>
          )}

          <Section title={FL.year}>
            <MinMaxRow
              minVal={yearMinInput}
              maxVal={yearMaxInput}
              setMin={setYearMinInput}
              setMax={setYearMaxInput}
            />
          </Section>
          {FEATURE_FLAGS.ownership && (
          <Section title={FL.ownership}>
            <CheckGroup
              options={OWNERSHIP_OPTS}
              selected={draft.ownership}
                  getLabel={lab('ownership')}
              onToggle={toggleIn('ownership')}
              counts={counts.ownership}
            />
          </Section>
          )}
          <Section title={FL.country}>
            <CheckGroup
              options={COUNTRY_OPTS}
              selected={draft.country}
                  getLabel={lab('country')}
              onToggle={toggleIn('country')}
              counts={counts.country}
            />
          </Section>
          <Section title={FL.locationCountry}>
            <CheckGroup
              options={LOCATION_COUNTRIES}
              selected={draft.locationCountry}
              getLabel={lab('locationCountry')}
              onToggle={(v) => { const set = new Set(draft.locationCountry); if (set.has(v)) set.delete(v); else set.add(v); setDraft(pruneRegions({ ...draft, locationCountry: set })); }}
              counts={counts.locationCountry}
            />
          </Section>
          <Section title={FL.region}>
            <CheckGroup
              options={regionOptionsFor(draft.locationCountry)}
              maxVisible={draft.locationCountry.size ? undefined : REGION_VISIBLE_ALL}
              selected={draft.region}
                  getLabel={lab('region')}
              onToggle={toggleIn('region')}
              counts={counts.region}
            />
          </Section>
        </div>

        {/* 선택한 필터 칩 */}
        {draftChips.length > 0 && (
          <div className="flex-shrink-0 border-t border-line px-5 py-3 max-h-28 overflow-y-auto">
            <div className="flex flex-wrap gap-2">
              {draftChips.map((chip) => (
                <button
                  key={chip.key}
                  onClick={chip.remove}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-surface text-fg border border-line rounded-full text-12 font-medium hover:bg-line"
                >
                  {chip.label}
                  <X className="w-3 h-3" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 푸터 */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-t border-line">
          <button
            onClick={handleReset}
            className="text-14 text-fg hover:text-fg font-medium"
          >
            필터 초기화
          </button>
          <button
            onClick={handleApply}
            className="bg-fg text-bg text-14 font-bold px-6 py-2 rounded-lg hover:bg-fg transition"
          >
            적용하기 ({previewCount.toLocaleString('ko-KR')}건)
          </button>
        </div>
      </div>
    </div>
  );
}

