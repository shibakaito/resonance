// ============================================================================
// scripts/seed-listings.ts — 테스트 매물 재시드 (판매 폼과 같은 specs.tech 형식)
// ----------------------------------------------------------------------------
// 실행:  npx --yes tsx scripts/seed-listings.ts --dry-run   → INSERT 없이 행 JSON·요약만 출력
//        npx --yes tsx scripts/seed-listings.ts             → 실제 INSERT (anon 키, RLS insert 정책 필요)
//        --force : DB에 "[테스트]" 접두 행이 이미 있어도 진행 (기본은 중단)
// 규칙:
//   · 값은 category-specs.ts 옵션 배열에서만 고름 → validateSeed 가 검증 (문자열 직접 입력 금지)
//   · 조립 문자열(정격 출력·주파수·크기·무게·진공관·드라이버…)은 src/lib/spec-builders.ts 의 빌더 그대로 사용
//   · 최상위 컬럼 매핑은 src/lib/listings.ts 의 toListingRow 그대로 사용 (폼과 단일 출처)
//   · kind별 분기 buildTechLikeForm 은 upload-page.tsx handleSubmit 의 분기와 거울 관계 ⚠️ 바꾸면 같이
//   · description 은 "[테스트] " 접두 → 정리는 SQL 한 줄: delete from listings where description like '[테스트]%'
//   · 키·URL 값은 절대 출력하지 않음
// ============================================================================
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { CategorySpecField, SelectOption } from '@/app/data/category-specs';
import type { PowerPair, DimRow, ValNoteRow, TubeRow, CrossoverRow, AmpPowerRow, DriverRow } from '@/lib/spec-builders';
import type { ListingInput } from '@/lib/listings';

// ── 시드 한 행의 입력 초안 (폼의 상태 슬롯과 1:1) ──
type Draft = {
  values?: Record<string, string>;                 // select / searchSelect / text / numSelect(+`${key}Type`)
  multi?: Record<string, string[]>;                // multi (impedance 포함)
  powerPairs?: PowerPair[];                        // power
  ranges?: Record<string, { low: string; high: string }>;
  dims?: Record<string, DimRow[]>;
  valNotes?: Record<string, ValNoteRow[]>;
  crossover?: CrossoverRow[];
  drivers?: DriverRow[];
  ampPower?: AmpPowerRow[];
  tubes?: TubeRow[];
};
type Seed = {
  category: '앰프' | '스피커' | '소스기기';
  sub: string;              // 하위 카테고리(잎) 한글 — 폼의 subcategory. specs.tech.type 으로도 저장됨
  brand: string; model: string; year: string;
  condition: string;        // labels.ts LABELS.condition 키
  price: number;            // 원
  country: string;          // 한글 (toListingRow 가 키로 변환) — 표에 없으면 ''
  ownership?: string;       // single_owner / multiple_owners / unknown
  finish?: string;          // 최상위 finish 컬럼 (스피커·소스기기는 tech.finish 에도 따로 넣음)
  description: string;      // "[테스트] " 접두는 스크립트가 붙임
  extras?: { appearance?: string; working?: string }; // specs 최상위(외관/작동 등급) — SPEC_LABELS 키
  imageSlot?: number;       // Storage 이미지 배분 슬롯(0~3). 없으면 이미지 없음
  draft: Draft;
};

const D = (w: string, d: string, h: string, note = ''): DimRow => ({ w, d, h, note });
const KG = (value: string, note = ''): ValNoteRow => ({ value, note });
const P = (w: string, ohm: string, note?: string): PowerPair => (note ? { w, ohm, note } : { w, ohm });
const DR = (type: string, structure: string, material: string, size: string, count: string, band = ''): DriverRow =>
  ({ type, structure, material, band, size, sizeUnit: 'inch', count });

// ── 시드 계획표 (앰프 7 / 스피커 6 / 턴테이블 4 / 카세트 4) ──
const SEEDS: Seed[] = [
  // ── 앰프 ──
  { category: '앰프', sub: '인티앰프', brand: 'Accuphase', model: 'E-380', year: '2019', condition: 'used_excellent', price: 4200000, country: '일본', ownership: 'single_owner',
    description: '정품 박스·리모컨 포함. 실사용 1년 미만, 잔기스 없음.', extras: { appearance: 'excellent', working: 'working' }, imageSlot: 0,
    draft: { values: { channel: '스테레오', device: '트랜지스터', opClass: 'Class AB', thd: '0.05', snr: '105', damping: '400', phono: '없음', toneControl: '있음', remote: '있음', voltage: '220V' },
      powerPairs: [P('120', '8Ω'), P('170', '4Ω'), P('240', '2Ω')], ranges: { freqResponse: { low: '20', high: '20' } },
      multi: { impedance: ['2Ω', '4Ω', '8Ω'], inputs: ['RCA', 'XLR', 'Main In'], outputs: ['스피커 터미널', 'Pre Out', 'Headphone Out'] },
      dims: { dimensions: [D('465', '422', '181')] }, valNotes: { weight: [KG('24.6')] } } },
  { category: '앰프', sub: '인티앰프', brand: 'Luxman', model: 'L-509X', year: '2018', condition: 'used_good', price: 6500000, country: '일본', ownership: 'multiple_owners',
    description: '일본 내수(100V) — 승압 트랜스 필요. 상판에 옅은 기스 1곳.',
    draft: { values: { channel: '스테레오', device: '트랜지스터', opClass: 'Class AB', thd: '0.007', snr: '107', damping: '370', phono: 'MM/MC', toneControl: '있음', remote: '있음', voltage: '100V' },
      powerPairs: [P('120', '8Ω'), P('240', '4Ω')], ranges: { freqResponse: { low: '20', high: '100' } },
      multi: { impedance: ['4Ω', '8Ω'], inputs: ['RCA', 'XLR', 'Main In'], outputs: ['스피커 터미널', 'Pre Out', 'Tape/Rec Out', 'Headphone Out'] },
      dims: { dimensions: [D('440', '454', '193')] }, valNotes: { weight: [KG('29.4')] } } },
  { category: '앰프', sub: '프리앰프', brand: 'Accuphase', model: 'C-2850', year: '2015', condition: 'used_excellent', price: 7800000, country: '일본', ownership: 'single_owner',
    description: '풀밸런스 프리앰프. 리모컨·정품 박스 포함.',
    draft: { values: { channel: '스테레오', device: '트랜지스터', thd: '0.005', snr: '118', phono: '없음', toneControl: '없음', remote: '있음', voltage: '220V' },
      ranges: { freqResponse: { low: '3', high: '200' } }, multi: { inputs: ['RCA', 'XLR'], outputs: ['RCA Out', 'XLR Out'] },
      dims: { dimensions: [D('465', '412', '156')] }, valNotes: { weight: [KG('24.3')] } } },
  { category: '앰프', sub: '파워앰프', brand: 'Pass Labs', model: 'X250.8', year: '2016', condition: 'used_good', price: 9500000, country: '미국', ownership: 'single_owner',
    description: '120V 사양(변압기 사용 중). 무게 45kg — 직거래 권장.',
    draft: { values: { channel: '스테레오', device: '트랜지스터', opClass: 'Class AB', thd: '0.1', snr: '100', damping: '150', phono: '없음', toneControl: '없음', remote: '없음', voltage: '120V' },
      powerPairs: [P('250', '8Ω'), P('500', '4Ω')], ranges: { freqResponse: { low: '1.5', high: '100' } },
      multi: { impedance: ['4Ω', '8Ω'], inputs: ['RCA', 'XLR'], outputs: ['스피커 터미널'] },
      dims: { dimensions: [D('483', '546', '244')] }, valNotes: { weight: [KG('45.4')] } } },
  { category: '앰프', sub: '포노앰프', brand: 'Musical Fidelity', model: 'MX-VYNL', year: '2017', condition: 'used_excellent', price: 950000, country: '영국', ownership: 'single_owner',
    description: 'MM/MC 겸용 풀밸런스 포노앰프. 어댑터 포함.',
    draft: { values: { device: '트랜지스터', cartridgeSupport: 'MM/MC', mmGain: '40', mmLoad: '47', mmLoadType: 'kΩ', mmCap: '100', mcBoostMode: '능동 헤드앰프', mcGain: '60', mcLoad: '100', mcLoadType: 'Ω',
        subsonic: '있음', monoSwitch: '없음', inputSensitivity: '5', maxInput: '300', outputLevel: '1', outputLevelType: 'V', outputImpedance: '50', groundTerminal: '있음', thd: '0.005', snr: '92', voltage: '프리볼트' },
      multi: { eqCurves: ['RIAA'], inputs: ['RCA', 'XLR'], outputs: ['RCA Out', 'XLR Out'] }, ranges: { freqResponse: { low: '10', high: '50' } },
      dims: { dimensions: [D('220', '215', '53')] }, valNotes: { weight: [KG('2')] } } },
  { category: '앰프', sub: '헤드폰 앰프', brand: 'Sennheiser', model: 'HDV 820', year: '2018', condition: 'used_excellent', price: 2400000, country: '독일', ownership: 'single_owner',
    description: 'DAC 내장 밸런스 헤드폰 앰프. 4.4mm·XLR 출력.', // powerPairs 는 스키마의 헤드폰 전용 키 hpOutput(부하별 출력)로 저장됨 → power 필터엔 0
    draft: { values: { device: '트랜지스터', opClass: 'Class AB', thd: '0.001', snr: '115', hpGain: '12', hpOutputImpedance: '0.5', hpDacChip: 'ESS SABRE ES9028', hpForm: '데스크탑', voltage: '프리볼트' },
      powerPairs: [P('2.4', '32Ω'), P('0.48', '300Ω'), P('0.24', '600Ω')], ranges: { freqResponse: { low: '10', high: '100' }, hpImpedanceRange: { low: '16', high: '600' } },
      multi: { inputs: ['XLR', 'RCA', 'USB-B', 'Optical', 'Coaxial'], outputs: ['XLR Out', 'RCA Out'], hpOutputs: ['4.4mm (Pentaconn)', '4-pin XLR', '듀얼 3-pin XLR', '6.35mm'] },
      dims: { dimensions: [D('224', '306', '44')] }, valNotes: { weight: [KG('2.25')] } } },
  { category: '앰프', sub: '파워앰프', brand: 'McIntosh', model: 'MC275', year: '2012', condition: 'used_excellent', price: 8500000, country: '미국', ownership: 'multiple_owners',
    description: '6세대 진공관 파워앰프. 출력관 KT88 교체 1년 경과, 바이어스 점검 완료.', imageSlot: 1,
    draft: { values: { channel: '스테레오', device: '진공관', opClass: 'Class AB', thd: '0.5', snr: '100', damping: '22', phono: '없음', toneControl: '없음', remote: '없음', voltage: '120V' },
      tubes: [{ role: '출력관', type: 'KT88', qty: '4' }, { role: '프리관', type: '12AX7', qty: '3' }, { role: '프리관', type: '12AT7', qty: '4' }],
      powerPairs: [P('75', '8Ω'), P('75', '4Ω'), P('75', '16Ω')], ranges: { freqResponse: { low: '20', high: '20' } },
      multi: { impedance: ['4Ω', '8Ω', '16Ω'], inputs: ['RCA', 'XLR'], outputs: ['스피커 터미널'] },
      dims: { dimensions: [D('432', '305', '216')] }, valNotes: { weight: [KG('30.4')] } } },
  // ── 스피커 ──
  { category: '스피커', sub: '북쉘프 스피커', brand: 'KEF', model: 'LS50 Meta', year: '2020', condition: 'used_excellent', price: 1350000, country: '영국', ownership: 'single_owner', finish: '카본 블랙',
    description: '페어. 정품 박스·그릴 포함. 스탠드 별매.', imageSlot: 2,
    draft: { values: { speakerDetail: 'passive', enclosure: '베이스 리플렉스', speakerImpedance: '8Ω', sensitivity: '85', recPower: '100', finish: '카본 블랙' },
      drivers: [DR('동축', 'Uni-Q', '', '5.25', '1', '우퍼 + 트위터')], ranges: { freqResponse: { low: '79', high: '28' } }, crossover: [{ value: '2200', unit: 'Hz' }],
      dims: { dimensions: [D('200', '278', '302')] }, valNotes: { weight: [KG('7.8')] } } },
  { category: '스피커', sub: '플로어 스탠딩 스피커', brand: 'Focal', model: 'Aria 936', year: '2016', condition: 'used_good', price: 3200000, country: '프랑스', ownership: 'single_owner', finish: '월넛',
    description: '페어. 하단 스파이크·베이스 포함. 직거래만.',
    draft: { values: { speakerDetail: 'passive', enclosure: '베이스 리플렉스', speakerImpedance: '8Ω', sensitivity: '92', recPower: '300', finish: '월넛' },
      drivers: [DR('우퍼', '콘 타입', '복합 소재', '6.5', '3'), DR('미드레인지', '콘 타입', '복합 소재', '6.5', '1'), DR('트위터', '돔 타입', '알루미늄', '1', '1')],
      ranges: { freqResponse: { low: '39', high: '28' } }, crossover: [{ value: '260', unit: 'Hz' }, { value: '2800', unit: 'Hz' }],
      dims: { dimensions: [D('294', '371', '1150')] }, valNotes: { weight: [KG('31')] } } },
  { category: '스피커', sub: '톨보이 스피커', brand: 'DALI', model: 'Oberon 7', year: '2019', condition: 'used_excellent', price: 1100000, country: '덴마크', ownership: 'single_owner', finish: '라이트 오크',
    description: '페어. 그릴 포함, 사용감 적음.',
    draft: { values: { speakerDetail: 'passive', enclosure: '베이스 리플렉스', speakerImpedance: '6Ω', sensitivity: '88.5', recPower: '180', finish: '라이트 오크' },
      drivers: [DR('우퍼', '콘 타입', '복합 소재', '7', '2'), DR('트위터', '돔 타입', '실크', '1.1', '1')],
      ranges: { freqResponse: { low: '36', high: '26' } }, crossover: [{ value: '2400', unit: 'Hz' }],
      dims: { dimensions: [D('200', '340', '1015')] }, valNotes: { weight: [KG('15.6')] } } },
  { category: '스피커', sub: '북쉘프 스피커', brand: 'Genelec', model: '8040B', year: '2021', condition: 'used_excellent', price: 2100000, country: '', ownership: 'single_owner', finish: '다크 그레이',
    description: '액티브 모니터 페어. 전원 케이블 2개 포함.',
    draft: { values: { speakerDetail: 'active', ampConfig: '바이앰프', opClass: 'Class AB', crossoverType: '액티브 크로스오버', enclosure: '베이스 리플렉스', finish: '다크 그레이', voltage: '프리볼트' },
      drivers: [DR('우퍼', '콘 타입', '폴리프로필렌', '6.5', '1'), DR('트위터', '돔 타입', '알루미늄', '0.75', '1')],
      ampPower: [{ type: '우퍼', power: '90W' }, { type: '트위터', power: '90W' }], ranges: { freqResponse: { low: '41', high: '21' } },
      multi: { inputs: ['XLR'] }, dims: { dimensions: [D('237', '223', '350')] }, valNotes: { weight: [KG('8.6')] } } },
  { category: '스피커', sub: '서브우퍼', brand: 'SVS', model: 'SB-2000 Pro', year: '2020', condition: 'used_excellent', price: 1050000, country: '미국', ownership: 'single_owner', finish: '블랙 애쉬',
    description: '밀폐형 12인치 서브우퍼. 앱 DSP 조절 가능.',
    draft: { values: { speakerDetail: 'active', ampPower: '550', ampPowerType: 'RMS', opClass: 'Class D', crossoverType: 'DSP 크로스오버', enclosure: '밀폐형', firingDirection: '전면 발사', phaseControl: '0°~180° 연속 조절', finish: '블랙 애쉬', voltage: '프리볼트' },
      drivers: [DR('우퍼', '콘 타입', '복합 소재', '12', '1')], ranges: { freqResponse: { low: '19', high: '240' } },
      multi: { inputs: ['RCA', 'XLR'], outputs: ['RCA Out'] }, dims: { dimensions: [D('372', '398', '400')] }, valNotes: { weight: [KG('17.6')] } } },
  { category: '스피커', sub: '사운드바', brand: 'Sonos', model: 'Arc + Sub (Gen 3)', year: '2020', condition: 'used_good', price: 1250000, country: '미국', ownership: 'single_owner', finish: '블랙',
    description: 'Arc + Sub 세트. 벽걸이 브래킷 미포함.',
    draft: { values: { speakerDetail: 'active', channelConfig: '5.1.2', surroundType: '가상 서라운드', arcSupport: 'eARC', roomCal: '앱 측정(스마트폰)', subIncluded: '무선 서브우퍼', subWeight: '16', finish: '블랙', voltage: '프리볼트' },
      multi: { audioFormats: ['Dolby Atmos', 'Dolby TrueHD', 'Dolby Digital Plus', 'Dolby Digital', 'PCM'], voiceAssistant: ['Alexa', 'Google Assistant'], inputs: ['HDMI In', 'Optical'], wireless: ['Wi-Fi', 'AirPlay'] },
      drivers: [DR('우퍼', '콘 타입', '복합 소재', '', '8'), DR('트위터', '돔 타입', '실크', '', '3')],
      dims: { dimensions: [D('1142', '116', '87')], subDimensions: [D('402', '158', '389')] }, valNotes: { weight: [KG('6.25')] } } },
  // ── 소스기기: 턴테이블 ──
  { category: '소스기기', sub: '턴테이블', brand: 'Rega', model: 'Planar 3', year: '2016', condition: 'used_excellent', price: 780000, country: '영국', ownership: 'single_owner', finish: '글로스 블랙',
    description: 'Elys 2 카트리지 장착. 벨트 교체 6개월 경과.', imageSlot: 3,
    draft: { values: { ttType: 'hifi', driveType: 'belt_drive', motorType: '24V 저소음 싱크로너스', autoMode: 'manual', wowFlutter: '0.1% 이하', platterMaterial: 'glass', tonearmShape: 'straight', tonearm: 'included',
        headshellRemovable: '없음', trackingForceAdj: '있음', antiSkating: '있음', cartridge: 'included', cartType: 'MM', cartModel: 'Rega Elys 2', phonoBuiltIn: 'none', bluetooth: 'none', groundTerminal: '있음', dustCover: 'yes', finish: '글로스 블랙', voltage: '220V' },
      multi: { speeds: ['33', '45'], outputs: ['RCA'] }, dims: { dimensions: [D('447', '360', '117')] }, valNotes: { weight: [KG('6')] } } },
  { category: '소스기기', sub: '턴테이블', brand: 'Technics', model: 'SL-1200GR', year: '2017', condition: 'used_excellent', price: 1650000, country: '일본', ownership: 'single_owner', finish: '실버',
    description: '카트리지 미포함(헤드셸만). 정품 박스 보관.',
    draft: { values: { ttType: 'hifi', driveType: 'direct_drive', motorType: '코어리스 다이렉트 드라이브', autoMode: 'manual', wowFlutter: '0.025% WRMS', snr: '78', platterMaterial: 'aluminum_diecast', tonearmShape: 's_shape', tonearm: 'included',
        headshellRemovable: '있음', trackingForceAdj: '있음', antiSkating: '있음', cartridge: 'not_included', phonoBuiltIn: 'none', bluetooth: 'none', groundTerminal: '있음', dustCover: 'yes', finish: '실버', voltage: '220V' },
      multi: { speeds: ['33', '45', '78'], outputs: ['RCA'] }, dims: { dimensions: [D('453', '372', '173')] }, valNotes: { weight: [KG('11.2')] } } },
  { category: '소스기기', sub: '턴테이블', brand: 'Sony', model: 'PS-LX310BT', year: '2019', condition: 'used_good', price: 180000, country: '일본', ownership: 'single_owner', finish: '블랙',
    description: '블루투스 송신 지원 올인원 턴테이블. 포노앰프 내장.',
    draft: { values: { ttType: 'all_in_one', driveType: 'belt_drive', autoMode: 'full_auto', cartridge: 'included', cartType: 'MM', cartModel: 'Sony 교체형 MM', phonoBuiltIn: 'built_in', phonoBypass: '있음', speakerConfig: 'none', portable: '없음', bluetooth: 'tx', dustCover: 'yes', finish: '블랙', voltage: '220V' },
      multi: { speeds: ['33', '45'], outputs: ['RCA', 'USB'] }, dims: { dimensions: [D('430', '367', '108')] }, valNotes: { weight: [KG('3.5')] } } },
  { category: '소스기기', sub: '턴테이블', brand: 'Pioneer', model: 'PLX-1000', year: '2015', condition: 'used_good', price: 620000, country: '일본', ownership: 'multiple_owners', finish: '블랙',
    description: 'DJ용 하이토크 DD. 더스트 커버 모서리 균열 있음.',
    draft: { values: { ttType: 'dj', driveType: 'direct_drive', motorType: '하이토크 다이렉트 드라이브', autoMode: 'manual', wowFlutter: '0.1% WRMS 이하', snr: '70', platterMaterial: 'aluminum_diecast', tonearmShape: 's_shape', tonearm: 'included',
        headshellRemovable: '있음', trackingForceAdj: '있음', antiSkating: '있음', cartridge: 'not_included', phonoBuiltIn: 'none', startingTorque: '4.5', reversePlay: '없음', bluetooth: 'none', groundTerminal: '있음', dustCover: 'damaged', finish: '블랙', voltage: '220V' },
      multi: { speeds: ['33', '45'], pitchRange: ['±8%', '±16%', '±50%'], outputs: ['RCA'] }, dims: { dimensions: [D('453', '353', '159')] }, valNotes: { weight: [KG('13.1')] } } },
  // ── 소스기기: 카세트 데크 ──
  { category: '소스기기', sub: '카세트 데크', brand: 'Nakamichi', model: 'CR-2', year: '1988', condition: 'used_good', price: 650000, country: '일본', ownership: 'unknown', finish: '블랙',
    description: '2헤드 듀얼 캡스턴. 벨트 교체 완료.',
    draft: { values: { headCount: 'two_head', deckCount: 'single', autoReverse: 'none', headMaterial: '크리스탈로이', capstan: 'dual', transportDrive: 'dc_servo', hxPro: '없음', bias: 'fine', snr: '66', snrType: 'Dolby C', wowFlutter: '0.035', wowFlutterType: 'WRMS', thd: '0.8',
        levelMeter: 'fluorescent', pitchControl: '없음', headWear: 'good', recFunction: 'normal', finish: '블랙', voltage: '100V' },
      multi: { tapeTypePlay: ['type_1', 'type_2', 'type_4'], tapeTypeRec: ['type_1', 'type_2', 'type_4'], noiseReduction: ['dolby_b', 'dolby_c'], inputs: ['RCA'], outputs: ['RCA', '헤드폰'], maintenance: ['belt'] },
      ranges: { freqResponse: { low: '20', high: '20' } }, dims: { dimensions: [D('430', '300', '110')] }, valNotes: { weight: [KG('6.5')] } } },
  { category: '소스기기', sub: '카세트 데크', brand: 'Nakamichi', model: 'ZX-7', year: '1981', condition: 'used_excellent', price: 1900000, country: '일본', ownership: 'multiple_owners', finish: '블랙',
    description: '3헤드 수동 캘리브레이션. 핀치롤러 교체·캘리브레이션 완료.',
    draft: { values: { headCount: 'three_head', offTapeMonitor: '있음', deckCount: 'single', autoReverse: 'none', headMaterial: '크리스탈로이', capstan: 'dual', transportDrive: 'direct', hxPro: '없음', bias: 'manual_cal', snr: '68', snrType: 'Dolby B', wowFlutter: '0.027', wowFlutterType: 'WRMS', thd: '0.8',
        levelMeter: 'fluorescent', pitchControl: '있음', headWear: 'light_wear', recFunction: 'normal', finish: '블랙', voltage: '100V' },
      multi: { tapeTypePlay: ['type_1', 'type_2', 'type_4', 'fecr'], tapeTypeRec: ['type_1', 'type_2', 'type_4'], noiseReduction: ['dolby_b'], inputs: ['RCA', '마이크'], outputs: ['RCA', '헤드폰'], maintenance: ['pinch_roller', 'calibration'] },
      ranges: { freqResponse: { low: '20', high: '20' } }, dims: { dimensions: [D('450', '300', '135')] }, valNotes: { weight: [KG('10.8')] } } },
  { category: '소스기기', sub: '카세트 데크', brand: 'Akai', model: 'GX-R75', year: '1986', condition: 'used_fair', price: 280000, country: '일본', ownership: 'unknown', finish: '블랙',
    description: '오토리버스(녹음+재생). 전면 패널 스크래치, 도어 작동 원활.', extras: { appearance: 'fair', working: 'needs_inspection' },
    draft: { values: { headCount: 'two_head', deckCount: 'single', autoReverse: 'rec_play', reverseMethod: 'head_rotate', headMaterial: '페라이트', capstan: 'dual', transportDrive: 'dc_servo', hxPro: '있음', bias: 'fixed', snr: '58', snrType: 'NR Off', wowFlutter: '0.05', wowFlutterType: 'WRMS', thd: '1',
        levelMeter: 'fluorescent', pitchControl: '없음', headWear: 'good', recFunction: 'normal', finish: '블랙', voltage: '120V' },
      multi: { tapeTypePlay: ['type_1', 'type_2', 'type_4'], tapeTypeRec: ['type_1', 'type_2', 'type_4'], noiseReduction: ['dolby_b', 'dolby_c'], inputs: ['RCA'], outputs: ['RCA', '헤드폰'] },
      ranges: { freqResponse: { low: '20', high: '19' } }, dims: { dimensions: [D('440', '290', '115')] }, valNotes: { weight: [KG('5.9')] } } },
  { category: '소스기기', sub: '카세트 데크', brand: 'Sony', model: 'TC-WE475', year: '1998', condition: 'used_good', price: 150000, country: '일본', ownership: 'single_owner', finish: '실버',
    description: '더블 데크(고속 더빙·릴레이 재생). 리모컨 미포함.',
    draft: { values: { headCount: 'two_head', deckCount: 'double', dubbingSpeed: 'both', parallelRec: '없음', continuousPlay: '있음', autoReverse: 'rec_play', reverseMethod: 'head_rotate', headMaterial: '퍼멀로이', capstan: 'single', transportDrive: 'belt', hxPro: '있음', bias: 'fixed', snr: '59', snrType: 'Dolby B', wowFlutter: '0.08', wowFlutterType: 'WRMS', thd: '1',
        levelMeter: 'led_peak', pitchControl: '있음', headWear: 'good', recFunction: 'normal', finish: '실버', voltage: '220V' },
      multi: { tapeTypePlay: ['type_1', 'type_2', 'type_4'], tapeTypeRec: ['type_1', 'type_2', 'type_4'], noiseReduction: ['dolby_b', 'dolby_c'], inputs: ['RCA'], outputs: ['RCA', '헤드폰'] },
      ranges: { freqResponse: { low: '30', high: '17' } }, dims: { dimensions: [D('430', '290', '125')] }, valNotes: { weight: [KG('4.2')] } } },
];

// ── .env.local 로더 (dotenv 의존 없이) — 값은 출력하지 않음 ──
function loadEnvLocal() {
  const file = resolve(process.cwd(), '.env.local');
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    const val = m[2].replace(/^["']|["']$/g, '');
    if (!process.env[m[1]]) process.env[m[1]] = val;
  }
}

// ── 폼 handleSubmit 의 kind별 분기와 거울 관계 (upload-page.tsx "⚠️ 아래 kind별 분기는 ..." 참조) ──
function buildTechLikeForm(fields: CategorySpecField[], category: string, sub: string, d: Draft, B: typeof import('@/lib/spec-builders')) {
  const values = d.values ?? {};
  const tech: Record<string, string | string[]> = {};
  const gate: Record<string, string | string[]> = { ...values, __sub: sub };
  for (const f of fields) {
    if (f.showWhen && !f.showWhen(gate)) continue;           // 폼: 화면에 안 보이는 필드는 저장하지 않음
    const inp = f.input;
    let v: string | string[] = '';
    if (inp.kind === 'auto') v = (sub || category).trim();
    else if (inp.kind === 'power') v = B.buildPower(d.powerPairs ?? []);
    else if (inp.kind === 'range') { const r = d.ranges?.[f.key] ?? { low: '', high: '' }; v = B.buildFreq(r.low, r.high, inp.lowUnit, inp.highUnit); }
    else if (inp.kind === 'dimensions') v = B.buildDims(d.dims?.[f.key] ?? []);
    else if (inp.kind === 'valueNote') v = B.buildValNotes(d.valNotes?.[f.key] ?? [], inp.unit);
    else if (inp.kind === 'crossover') v = B.buildCrossover(d.crossover ?? []);
    else if (inp.kind === 'multi') v = d.multi?.[f.key] ?? [];
    else if (inp.kind === 'drivers') v = B.driverSummary(d.drivers ?? []).join(' ');
    else if (inp.kind === 'ampPower') v = B.buildAmpPower(d.ampPower ?? []);
    else if (inp.kind === 'numSelect') v = B.buildNumSelect(values[f.key], values[`${f.key}Type`], inp.unit, inp.glue);
    else if (inp.kind === 'tubeBuilder') v = B.buildTubes(d.tubes ?? []);
    else v = (values[f.key] ?? '').trim();                  // select / searchSelect / text
    if (Array.isArray(v) ? v.length > 0 : v) tech[f.key] = v;
  }
  return tech;
}

// ── 값 검증: 옵션 배열 밖의 값·보이지 않는 필드·숫자 아닌 수치를 잡아냄 ──
function validateSeed(seed: Seed, fields: CategorySpecField[], S: typeof import('@/app/data/category-specs'), B: typeof import('@/lib/spec-builders'), L: typeof import('@/lib/labels')): string[] {
  const errs: string[] = [];
  const d = seed.draft; const values = d.values ?? {};
  const gate: Record<string, string | string[]> = { ...values, __sub: seed.sub };
  const visible = fields.filter((f) => !f.showWhen || f.showWhen(gate));
  const byKey = new Map<string, CategorySpecField>();
  visible.forEach((f) => { if (!byKey.has(f.key)) byKey.set(f.key, f); });
  const kinds = new Set(visible.map((f) => f.input.kind));
  const optVals = (opts: SelectOption[]) => opts.map((o) => (typeof o === 'string' ? o : o.value));
  const isNum = (s: string) => s === '' || /^\d+(\.\d+)?$/.test(s);
  const tag = (k: string) => `${seed.brand} ${seed.model} · ${k}`;
  for (const k of Object.keys(values)) {
    if (byKey.has(k)) continue;
    const base = k.endsWith('Type') ? k.slice(0, -4) : '';
    if (base && byKey.get(base)?.input.kind === 'numSelect') continue;
    errs.push(`${tag(k)}: 이 하위 카테고리에서 보이지 않는 필드(또는 키 오타)`);
  }
  const slots: [string, Record<string, unknown> | undefined][] = [['multi', d.multi], ['ranges', d.ranges], ['dims', d.dims], ['valNotes', d.valNotes]];
  for (const [slot, obj] of slots) for (const k of Object.keys(obj ?? {})) if (!byKey.has(k)) errs.push(`${tag(k)}: ${slot} 키가 보이지 않는 필드`);
  if (d.powerPairs?.length && !kinds.has('power')) errs.push(`${tag('powerPairs')}: 이 하위 카테고리엔 정격 출력 칸이 없음`);
  if (d.crossover?.length && !kinds.has('crossover')) errs.push(`${tag('crossover')}: 크로스오버 칸이 없음`);
  if (d.drivers?.length && !kinds.has('drivers')) errs.push(`${tag('drivers')}: 드라이버 구성 칸이 없음`);
  if (d.ampPower?.length && !kinds.has('ampPower')) errs.push(`${tag('ampPower')}: 앰프 출력 빌더 칸이 없음`);
  if (d.tubes?.length && !kinds.has('tubeBuilder')) errs.push(`${tag('tubes')}: 진공관 칸이 없음 (device 가 진공관/하이브리드여야 함)`);
  for (const f of visible) {
    const inp = f.input; const v = values[f.key] ?? '';
    if (inp.kind === 'select') { const o = optVals(inp.options); if (v && !o.includes(v)) errs.push(`${tag(f.key)}: "${v}" 옵션에 없음 [${o.join(' | ')}]`); }
    else if (inp.kind === 'searchSelect') { if (v && !inp.options.includes(v)) errs.push(`${tag(f.key)}: "${v}" 옵션에 없음 [${inp.options.join(' | ')}]`); }
    else if (inp.kind === 'text') { if (v && !inp.free && !isNum(v)) errs.push(`${tag(f.key)}: 숫자만 허용 ("${v}")`); }
    else if (inp.kind === 'numSelect') { if (!isNum(v)) errs.push(`${tag(f.key)}: 숫자만 ("${v}")`); const t = values[`${f.key}Type`]; if (t && !inp.options.includes(t)) errs.push(`${tag(f.key + 'Type')}: "${t}" 옵션에 없음 [${inp.options.join(' | ')}]`); }
    else if (inp.kind === 'multi') { const o = optVals(inp.options); for (const x of d.multi?.[f.key] ?? []) if (!o.includes(x)) errs.push(`${tag(f.key)}: "${x}" 옵션에 없음 [${o.join(' | ')}]`); }
    else if (inp.kind === 'power') { const ohms = inp.ohmOptions ?? S.AMP_OHM_OPTS; for (const p of d.powerPairs ?? []) { if (!isNum(p.w)) errs.push(`${tag(f.key)}: W 값 숫자 아님 ("${p.w}")`); if (p.ohm && !ohms.includes(p.ohm)) errs.push(`${tag(f.key)}: "${p.ohm}" 옴 옵션에 없음 [${ohms.join(' | ')}]`); } }
    else if (inp.kind === 'range') { const r = d.ranges?.[f.key]; if (r && (!isNum(r.low) || !isNum(r.high))) errs.push(`${tag(f.key)}: 범위 값 숫자 아님`); }
    else if (inp.kind === 'dimensions') { for (const r of d.dims?.[f.key] ?? []) if (![r.w, r.d, r.h].every(isNum)) errs.push(`${tag(f.key)}: 크기 값 숫자 아님`); }
    else if (inp.kind === 'valueNote') { for (const r of d.valNotes?.[f.key] ?? []) if (!isNum(r.value)) errs.push(`${tag(f.key)}: 무게 값 숫자 아님`); }
    else if (inp.kind === 'crossover') { for (const r of d.crossover ?? []) { if (!isNum(r.value)) errs.push(`${tag(f.key)}: 크로스오버 값 숫자 아님`); if (!['Hz', 'kHz'].includes(r.unit)) errs.push(`${tag(f.key)}: 단위 "${r.unit}"`); } }
    else if (inp.kind === 'drivers') {
      for (const r of d.drivers ?? []) {
        if (!S.DRIVER_TYPES.includes(r.type)) errs.push(`${tag('drivers')}: 종류 "${r.type}" 없음`);
        if (r.type === '동축') { if (r.band && !S.COAXIAL_BANDS.includes(r.band)) errs.push(`${tag('drivers')}: 동축 대역 "${r.band}" 없음`); }
        else if (r.material && !(S.DRIVER_MATERIAL[r.type] ?? []).includes(r.material)) errs.push(`${tag('drivers')}: ${r.type} 재질 "${r.material}" 없음 [${(S.DRIVER_MATERIAL[r.type] ?? []).join(' | ')}]`);
        if (r.structure && !(S.DRIVER_STRUCT[r.type] ?? []).includes(r.structure)) errs.push(`${tag('drivers')}: ${r.type} 구조 "${r.structure}" 없음 [${(S.DRIVER_STRUCT[r.type] ?? []).join(' | ')}]`);
        if (!isNum(r.size) || !isNum(r.count)) errs.push(`${tag('drivers')}: 크기/개수 숫자 아님`);
        if (!['inch', 'mm'].includes(r.sizeUnit)) errs.push(`${tag('drivers')}: 크기 단위 "${r.sizeUnit}"`);
      }
    }
    else if (inp.kind === 'ampPower') { for (const r of d.ampPower ?? []) if (!B.AMP_POWER_TYPES.includes(r.type)) errs.push(`${tag('ampPower')}: 종류 "${r.type}" 없음 [${B.AMP_POWER_TYPES.join(' | ')}]`); }
    else if (inp.kind === 'tubeBuilder') { for (const r of d.tubes ?? []) { if (!S.TUBE_ROLE_OPTS.includes(r.role)) errs.push(`${tag('tubes')}: 역할 "${r.role}" 없음`); if (!(S.TUBE_TYPE_MAP[r.role] ?? []).includes(r.type)) errs.push(`${tag('tubes')}: ${r.role} 종류 "${r.type}" 없음`); if (!isNum(r.qty)) errs.push(`${tag('tubes')}: 개수 숫자 아님`); } }
  }
  if (!(seed.condition in L.LABELS.condition)) errs.push(`${tag('condition')}: "${seed.condition}" 키 없음`);
  if (seed.ownership && !(seed.ownership in L.LABELS.ownership)) errs.push(`${tag('ownership')}: "${seed.ownership}" 키 없음`);
  if (seed.country && !L.keyFor('country', seed.country)) errs.push(`${tag('country')}: "${seed.country}" 표에 없음`);
  if (seed.extras?.appearance && !(seed.extras.appearance in L.SPEC_LABELS.appearance)) errs.push(`${tag('appearance')}: 키 없음`);
  if (seed.extras?.working && !(seed.extras.working in L.SPEC_LABELS.working)) errs.push(`${tag('working')}: 키 없음`);
  return errs;
}

// 값의 "모양" 분류 — 폼 저장 행과 시드 행의 형식 대조용
const shapeOf = (v: unknown): string => {
  if (Array.isArray(v)) return `배열[${v.length}]`;
  if (typeof v !== 'string') return typeof v;
  if (/^\d+(\.\d+)?W @ \d+Ω(, \d+(\.\d+)?W @ \d+Ω)*$/.test(v)) return '출력 "NW @ NΩ, …"';
  if (/^\d+(\.\d+)?[A-Za-zΩ]+~\d+(\.\d+)?[A-Za-zΩ]+$/.test(v)) return '범위 "N단위~N단위"';
  if (/^\d+×\d+×\d+/.test(v)) return '크기 "W×D×H"';
  if (/^\d+(\.\d+)?kg/.test(v)) return '무게 "Nkg"';
  if (/^\d+(\.\d+)?$/.test(v)) return '숫자 문자열';
  return '텍스트';
};

async function main() {
  loadEnvLocal();
  const DRY = process.argv.includes('--dry-run');
  const FORCE = process.argv.includes('--force');
  // 정적 import 는 호이스팅되어 .env.local 로드보다 먼저 평가되므로(supabase.ts 가 즉시 throw) 여기서 동적 import
  const { supabase } = await import('@/lib/supabase');
  const { toListingRow } = await import('@/lib/listings');
  const S = await import('@/app/data/category-specs');
  const B = await import('@/lib/spec-builders');
  const L = await import('@/lib/labels');

  console.log(`모드: ${DRY ? 'DRY-RUN (INSERT 없음)' : '실제 INSERT'}${FORCE ? ' / --force' : ''} · 시드 ${SEEDS.length}행`);

  // 1) 검증
  const errors = SEEDS.flatMap((s) => validateSeed(s, S.SPEC_FIELDS_BY_CATEGORY[s.category], S, B, L));
  if (errors.length) { console.error(`✗ 검증 실패 ${errors.length}건:`); errors.forEach((e) => console.error('  - ' + e)); process.exit(1); }
  console.log('✓ 검증 통과 (옵션 배열 밖의 값 없음, 보이지 않는 필드 없음)');

  // 2) 기존 [테스트] 행 가드
  const { count: descCount } = await supabase.from('listings').select('id', { count: 'exact', head: true }).ilike('description', '[테스트]%');
  const { count: titleCount } = await supabase.from('listings').select('id', { count: 'exact', head: true }).or('title.ilike.[테스트]%,title.ilike.[TEST]%');
  console.log(`기존 행: description "[테스트]" 접두 ${descCount ?? 0}건 / title 접두([테스트]·[TEST]) ${titleCount ?? 0}건`);
  if (!DRY && (descCount ?? 0) > 0 && !FORCE) { console.error('✗ [테스트] 행이 이미 있어 중단. 정리 후 실행하거나 --force.'); process.exit(2); }

  // 3) Storage 이미지 → 4개 슬롯에 라운드로빈 배분
  const { data: objs, error: sErr } = await supabase.storage.from('listings').list('', { limit: 100 });
  if (sErr) console.warn('⚠ Storage 목록 조회 실패 (이미지 없이 진행):', sErr.message);
  const urls = (objs ?? []).filter((o) => o.name && !o.name.startsWith('.')).map((o) => supabase.storage.from('listings').getPublicUrl(o.name).data.publicUrl);
  const slots = [0, 1, 2, 3].map((k) => urls.filter((_, i) => i % 4 === k));
  console.log(`Storage 이미지 ${urls.length}개 → 슬롯별 ${slots.map((s) => s.length).join('/')}장`);

  // 4) 행 조립 (폼과 동일 경로: tech 조립 → ListingInput → toListingRow)
  const rows = SEEDS.map((seed) => {
    const fields = S.SPEC_FIELDS_BY_CATEGORY[seed.category];
    const tech = buildTechLikeForm(fields, seed.category, seed.sub, seed.draft, B);
    const specs: Record<string, unknown> = {};
    if (seed.extras?.appearance) specs.appearance = seed.extras.appearance;
    if (seed.extras?.working) specs.working = seed.extras.working;
    if (Object.keys(tech).length > 0) specs.tech = tech;
    const input: ListingInput = {
      images: seed.imageSlot != null ? slots[seed.imageSlot] ?? [] : [],
      title: [seed.brand, seed.model, seed.sub].filter(Boolean).join(' '),   // 폼의 상품명 자동 반영과 동일
      category: seed.category, subcategory: seed.sub, brand: seed.brand, model: seed.model, year: seed.year,
      finish: seed.finish ?? '', country: seed.country, handmade: false, condition: seed.condition, ownership: seed.ownership ?? '',
      description: `[테스트] ${seed.description}`, sku: '', youtubeLink: '', price: String(seed.price), comparePrice: '',
      acceptOffers: true, shippingType: 'flat', shippingCost: '30000', localPickup: true, specs,
    };
    return toListingRow(input);
  });

  // 5) 출력
  if (DRY) {
    const firstAmp = rows.findIndex((r) => r.category === 'integrated-amp');
    const firstSpk = rows.findIndex((r) => r.category === 'bookshelf');
    console.log('\n===== [전문] 앰프 1행 (' + SEEDS[firstAmp].brand + ' ' + SEEDS[firstAmp].model + ') =====');
    console.log(JSON.stringify(rows[firstAmp], null, 2));
    console.log('\n===== [전문] 스피커 1행 (' + SEEDS[firstSpk].brand + ' ' + SEEDS[firstSpk].model + ') =====');
    console.log(JSON.stringify(rows[firstSpk], null, 2));
    console.log('\n===== [요약] 전체 ' + rows.length + '행 =====');
    rows.forEach((r, i) => {
      const t = (r.specs as { tech?: Record<string, unknown> }).tech ?? {};
      console.log(`${String(i + 1).padStart(2)}. ${SEEDS[i].sub.padEnd(10)} | ${(SEEDS[i].brand + ' ' + SEEDS[i].model).padEnd(28)} | ₩${r.price.toLocaleString('ko-KR').padStart(10)} | ${String(r.condition).padEnd(14)} | tech ${String(Object.keys(t).length).padStart(2)}키 | 이미지 ${r.images.length}`);
    });
    // 6) 폼으로 저장된 E-800 행과 키·값 형식 대조
    const { data: e800 } = await supabase.from('listings').select('id,title,model,specs').or('title.ilike.%E-800%,model.ilike.%E-800%');
    const ref = (e800 ?? []).map((r) => ({ ...r, tech: (r.specs?.tech ?? {}) as Record<string, unknown> })).sort((a, b) => Object.keys(b.tech).length - Object.keys(a.tech).length)[0];
    if (ref) {
      const seedTech = (rows[firstAmp].specs as { tech: Record<string, unknown> }).tech;
      console.log(`\n===== [대조] 폼 저장 E-800 (tech ${Object.keys(ref.tech).length}키) vs 시드 ${SEEDS[firstAmp].model} (tech ${Object.keys(seedTech).length}키) =====`);
      const keys = Array.from(new Set([...Object.keys(ref.tech), ...Object.keys(seedTech)]));
      console.log('키'.padEnd(16) + '| 폼 E-800'.padEnd(34) + '| 시드'.padEnd(36) + '| 형식');
      for (const k of keys) {
        const a = ref.tech[k], b = seedTech[k];
        const fa = a === undefined ? '(없음)' : JSON.stringify(a).slice(0, 30), fb = b === undefined ? '(없음)' : JSON.stringify(b).slice(0, 32);
        const same = a === undefined || b === undefined ? '-' : (shapeOf(a) === shapeOf(b) ? '같음' : `다름: ${shapeOf(a)} → ${shapeOf(b)}`);
        console.log(k.padEnd(16) + '| ' + fa.padEnd(32) + '| ' + fb.padEnd(34) + '| ' + same);
      }
    } else console.log('\n(대조 대상 E-800 행을 찾지 못함)');
    return;
  }

  // 7) 실제 INSERT
  const { data, error } = await supabase.from('listings').insert(rows).select('id');
  if (error) { console.error('✗ INSERT 실패:', error.message); process.exit(3); }
  console.log(`✓ INSERT ${data?.length ?? 0}행 완료`);
}

main().catch((e) => { console.error('✗ 오류:', e instanceof Error ? e.message : e); process.exit(9); });
