'use client';
// ============================================================================
// filter-panel.tsx — 둘러보기 필터 묶음 전체 (사이드바와 좁은 화면 필터 대화상자가 같은 부품, 같은 순서)
// ----------------------------------------------------------------------------
// 2026-11-10 시안. 순서: 카테고리, 상태, 외관 상태, 브랜드, 가격, 작동 상태,
//   그다음 카테고리 전용 필터(filterVisibility 가 보이게 하는 칸, 예전 사이드바 순서 그대로), 출시 연도, 제조국, 지역
//   기본 펼침은 카테고리, 상태, 외관 상태, 브랜드, 가격 다섯 개. 나머지는 접힘(펼침 상태는 묶음 화면 상태라 저장 안 함)
// 값을 어디에 반영할지는 부르는 쪽이 정함: 사이드바는 바로, 대화상자는 '적용하기' 전까지 초안
//   → filters / setFilters, subCategories / onToggleSub 를 받음. 개수(counts)는 부르는 쪽이 집계해서 넘김
// 필터 계산(applyFilters), 주소 파라미터, 보이는 칸 규칙(filterVisibility)은 browse-filters.ts 그대로
// ============================================================================

import { FilterSection, RangeSection, FilterDropdown } from './filter-controls';
import { BRAND_DIRECTORY } from '../data/catalog';
import { terminalsPrioritized } from '../data/cable-terminals';
import { FEATURE_FLAGS } from '../data/feature-flags'; // 숨김 플래그 (docs/hidden.md)
import { FILTER_LABELS as FL } from '@/lib/labels';
import {
  AMP_DETAILS,
  AMP_METHODS,
  APPEARANCE_OPTS,
  AUTO_OPTS,
  CARTRIDGE_OPTS,
  CAS_AUTOREVERSES,
  CAS_CAPSTANS,
  CAS_HEAD_COUNTS,
  CAS_HEAD_WEARS,
  CAS_NRS,
  CAS_TAPE_TYPES,
  CD_ANALOG_OUTS,
  CD_DIGITAL_OUTS,
  CONDITIONS,
  CONDUCTOR_OPTS,
  COUNTRY_OPTS,
  DIRECTIONALITY_OPTS,
  DRIVER_CONFIGS,
  DRIVE_TYPES,
  DUSTCOVER_OPTS,
  ENCLOSURE_TYPES,
  IMPEDANCE_OPTS,
  LOCATION_COUNTRIES,
  OWNERSHIP_OPTS,
  PAIR_OPTS,
  PHONO_BUILTIN_OPTS,
  PHONO_OPTS,
  PLATING_OPTS,
  REMOTE_OPTS,
  SHIELD_OPTS,
  SHIELD_RELEVANT,
  SPEAKER_DETAILS,
  SPEAKER_IMPEDANCE,
  SPEED_OPTS,
  TONEARM_OPTS,
  TONE_OPTS,
  TUNER_BANDS,
  VOLTAGE_OPTS,
  WOOFER_SIZES,
  WORKING_OPTS,
  filterLabel,
  pruneRegions,
  regionOptionsFor,
  type Counts,
  type Filters,
  type FilterVisibility,
} from './browse-filters';

// 브랜드 영문명 → 한글 별칭 목록 (브랜드 검색 칸용). 홈 콤보박스와 같은 BRAND_DIRECTORY
const BRAND_ALIASES: Record<string, readonly string[]> = Object.fromEntries(BRAND_DIRECTORY.map((b) => [b.name, b.aliases]));

// 값이 Set 인 필터 키만
type SetKey = { [K in keyof Filters]: Filters[K] extends Set<string> ? K : never }[keyof Filters];

export function FilterPanel({
  vis,
  filters,
  setFilters,
  subCategories,
  onToggleSub,
  categoryOptions,
  counts,
  brandOptions,
}: {
  vis: FilterVisibility;                                 // 지금 보이는 칸 (filterVisibility 결과)
  filters: Filters;
  setFilters: (update: (prev: Filters) => Filters) => void;
  subCategories: Set<string>;                            // 고른 하위 카테고리
  onToggleSub: (v: string) => void;
  categoryOptions: readonly string[];                    // 카테고리 묶음 선택지 (대분류의 보이는 하위 카테고리, 묶음 순서)
  counts: Counts;
  brandOptions: readonly string[];                       // 매물 있는 브랜드, 매물 수 내림차순
}) {
  const toggle = (key: SetKey) => (v: string) =>
    setFilters((prev) => {
      const set = new Set(prev[key]);
      if (set.has(v)) set.delete(v);
      else set.add(v);
      return { ...prev, [key]: set };
    });
  // 체크 묶음 하나 — 화면 글자는 filterLabel(키, 값). labeled=false 는 예전처럼 값 그대로(지원 임피던스, 케이블 칸)
  const check = (key: SetKey, label: string, options: readonly string[], opts: { open?: boolean; labeled?: boolean } = {}) => (
    <FilterSection
      label={label}
      options={options}
      selected={filters[key]}
      getLabel={opts.labeled === false ? undefined : (v) => filterLabel(key, v)}
      onToggle={toggle(key)}
      counts={(counts as Record<string, Record<string, number>>)[key]}
      defaultOpen={opts.open ?? false}
    />
  );
  // 범위 묶음 하나 — 적용하면 최소, 최대 두 값을 같이 바꿈
  const range = (minKey: keyof Filters, maxKey: keyof Filters) => (m: number | null, x: number | null) =>
    setFilters((prev) => ({ ...prev, [minKey]: m, [maxKey]: x }));

  return (
    <div className="flex flex-col">
      {/* 1~5: 기본 펼침 */}
      {categoryOptions.length > 0 && (
        <FilterSection
          label={FL.category}
          options={categoryOptions}
          selected={subCategories}
          onToggle={onToggleSub}
          counts={counts.subcategory}
          defaultOpen
        />
      )}
      {check('condition', FL.condition, CONDITIONS, { open: true })}
      {check('appearance', FL.appearance, APPEARANCE_OPTS, { open: true })}
      <FilterSection
        label={FL.brand}
        options={brandOptions}
        selected={filters.brand}
        onToggle={toggle('brand')}
        counts={counts.brand}
        searchable
        getAliases={(name) => BRAND_ALIASES[name] ?? []}
        defaultOpen
      />
      <RangeSection label={FL.price} min={filters.priceMin} max={filters.priceMax} onApply={range('priceMin', 'priceMax')} defaultOpen />

      {check('working', FL.working, WORKING_OPTS)}

      {/* 카테고리 전용 — 앰프 */}
      {vis.amp && (
        <>
          {vis.channel && check('ampDetail', FL.ampDetail, AMP_DETAILS)}
          {check('ampMethod', FL.ampMethod, AMP_METHODS)}
          {/* 헤드폰 앰프: 정격 출력 대신 "내 헤드폰 임피던스" 한 칸 — 매물 권장 범위(하한 ≤ N ≤ 상한)에 들면 표시 */}
          {vis.headphoneImp ? (
            <RangeSection label={FL.headphoneImp} unit="Ω" single singlePlaceholder="예: 32" min={filters.headphoneImp} max={null} onApply={(n) => setFilters((prev) => ({ ...prev, headphoneImp: n }))} />
          ) : (
            vis.power && <RangeSection label={`${FL.power} (W·8Ω)`} min={filters.powerMin} max={filters.powerMax} onApply={range('powerMin', 'powerMax')} />
          )}
          {vis.impedance && check('impedance', FL.impedance, IMPEDANCE_OPTS, { labeled: false })}
          {check('phono', FL.phono, PHONO_OPTS)}
          {FEATURE_FLAGS.toneControlFilter && check('toneControl', FL.toneControl, TONE_OPTS)}
          {FEATURE_FLAGS.remoteFilter && check('remote', FL.remote, REMOTE_OPTS)}
          {check('voltage', FL.voltage, VOLTAGE_OPTS)}
        </>
      )}

      {/* 카테고리 전용 — 스피커 */}
      {vis.speaker && (
        <>
          {check('speakerDetail', FL.speakerDetail, SPEAKER_DETAILS)}
          {check('driverConfig', FL.driverConfig, DRIVER_CONFIGS)}
          {check('wooferSize', FL.wooferSize, WOOFER_SIZES)}
          {check('enclosure', FL.enclosure, ENCLOSURE_TYPES)}
          {check('speakerImpedance', FL.speakerImpedance, SPEAKER_IMPEDANCE)}
          <RangeSection label={FL.sensitivity} unit="dB" min={filters.sensitivityMin} max={filters.sensitivityMax} onApply={range('sensitivityMin', 'sensitivityMax')} />
          {/* 전원 전압 — 액티브 스피커만 값이 있어 패시브는 집계, 결과에서 빠짐 */}
          {check('voltage', FL.voltage, VOLTAGE_OPTS)}
          {FEATURE_FLAGS.recPowerFilter && <RangeSection label={FL.recPower} unit="W" min={filters.recPowerMin} max={filters.recPowerMax} onApply={range('recPowerMin', 'recPowerMax')} />}
        </>
      )}

      {/* 카테고리 전용 — 케이블 (숨긴 카테고리) */}
      {vis.cable && (
        <>
          <RangeSection label={FL.cableLength} unit="m" step={0.5} min={filters.cableLengthMin} max={filters.cableLengthMax} onApply={range('cableLengthMin', 'cableLengthMax')} />
          {(() => {
            const sortedTerms = terminalsPrioritized([...subCategories]);
            return (
              <div className="border-b border-line py-4">
                <span className="flex h-10 items-center text-14 font-bold text-fg">입출력 단자</span>
                <div className="mt-2 flex flex-col gap-2">
                  <FilterDropdown label={FL.terminalIn} options={sortedTerms} selected={filters.terminalIn} onToggle={toggle('terminalIn')} onClear={() => setFilters((prev) => ({ ...prev, terminalIn: new Set() }))} counts={counts.terminalIn} scrollable variant="box" />
                  <FilterDropdown label={FL.terminalOut} options={sortedTerms} selected={filters.terminalOut} onToggle={toggle('terminalOut')} onClear={() => setFilters((prev) => ({ ...prev, terminalOut: new Set() }))} counts={counts.terminalOut} scrollable variant="box" />
                </div>
              </div>
            );
          })()}
          {check('conductor', FL.conductor, CONDUCTOR_OPTS, { labeled: false })}
          {check('plating', FL.plating, PLATING_OPTS, { labeled: false })}
          {[...subCategories].some((s) => SHIELD_RELEVANT.includes(s)) && check('shield', FL.shield, SHIELD_OPTS, { labeled: false })}
          {check('pair', FL.pair, PAIR_OPTS, { labeled: false })}
          {check('directional', FL.directional, DIRECTIONALITY_OPTS, { labeled: false })}
        </>
      )}

      {/* 카테고리 전용 — 턴테이블 (구동 방식, 회전수, 조작 방식, 톤암, 카트리지, 포노앰프 내장, 전원 전압) */}
      {vis.turntable && (
        <>
          {check('driveType', FL.driveType, DRIVE_TYPES)}
          {check('speeds', FL.speeds, SPEED_OPTS)}
          {check('autoMode', FL.autoMode, AUTO_OPTS)}
          {check('tonearm', FL.tonearm, TONEARM_OPTS)}
          {check('cartridge', FL.cartridge, CARTRIDGE_OPTS)}
          {check('phonoBuiltIn', FL.phonoBuiltIn, PHONO_BUILTIN_OPTS)}
          {check('voltage', FL.voltage, VOLTAGE_OPTS)}
          {FEATURE_FLAGS.dustCoverFilter && check('dustCover', FL.dustCover, DUSTCOVER_OPTS)}
        </>
      )}

      {/* 카테고리 전용 — CD 플레이어 */}
      {vis.cd && (
        <>
          {check('cdDigitalOut', FL.cdDigitalOut, CD_DIGITAL_OUTS)}
          {check('cdAnalogOut', FL.cdAnalogOut, CD_ANALOG_OUTS)}
          {check('voltage', FL.voltage, VOLTAGE_OPTS)}
        </>
      )}

      {/* 카테고리 전용 — 카세트 데크 (핵심 칸 6개 + 전원 전압) */}
      {vis.cassette && (
        <>
          {check('headCount', FL.headCount, CAS_HEAD_COUNTS)}
          {check('autoReverse', FL.autoReverse, CAS_AUTOREVERSES)}
          {check('capstan', FL.capstan, CAS_CAPSTANS)}
          {check('noiseReduction', FL.noiseReduction, CAS_NRS)}
          {check('tapeTypeRec', FL.tapeTypeRec, CAS_TAPE_TYPES)}
          {check('headWear', FL.headWear, CAS_HEAD_WEARS)}
          {check('voltage', FL.voltage, VOLTAGE_OPTS)}
        </>
      )}

      {/* 카테고리 전용 — 튜너 */}
      {vis.tuner && (
        <>
          {check('tunerBand', FL.tunerBand, TUNER_BANDS)}
          {check('voltage', FL.voltage, VOLTAGE_OPTS)}
        </>
      )}

      {/* 카테고리 전용 — 전원 장치 */}
      {vis.powerDevice && (
        <RangeSection label={FL.ratedCapacity} unit="W" min={filters.ratedCapacityMin} max={filters.ratedCapacityMax} onApply={range('ratedCapacityMin', 'ratedCapacityMax')} />
      )}

      {/* 공통 끝: 출시 연도, (소유권), 제조국, (국가), 지역 */}
      <RangeSection label={FL.year} noComma min={filters.yearMin} max={filters.yearMax} onApply={range('yearMin', 'yearMax')} />
      {FEATURE_FLAGS.ownership && check('ownership', FL.ownership, OWNERSHIP_OPTS)}
      {check('country', FL.country, COUNTRY_OPTS)}
      {/* 국가 → 지역: 국가를 고르면 지역은 그 나라 것만 (FEATURE_FLAGS.japan 꺼지면 국가 칸 없음) */}
      {vis.locationCountry && (
        <FilterSection
          label={FL.locationCountry}
          options={LOCATION_COUNTRIES}
          selected={filters.locationCountry}
          getLabel={(v) => filterLabel('locationCountry', v)}
          onToggle={(v) =>
            setFilters((prev) => {
              const set = new Set(prev.locationCountry);
              if (set.has(v)) set.delete(v);
              else set.add(v);
              return pruneRegions({ ...prev, locationCountry: set });
            })
          }
          counts={counts.locationCountry}
        />
      )}
      {check('region', FL.region, regionOptionsFor(filters.locationCountry))}
    </div>
  );
}
