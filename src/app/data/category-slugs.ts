// ============================================================================
// category-slugs.ts — 카테고리 한글 이름 ↔ 영문 URL 주소(슬러그) 변환
// ----------------------------------------------------------------------------
// '슬러그(slug)' = URL에 들어가는 짧은 영문 키워드.
//   예: 한글 '앰프' ↔ 영문 'amps'  →  주소창에 /browse/amps 처럼 표시됨.
// 왜 필요? 주소창에 한글이 들어가면 깨지거나 보기 안 좋고, 공유/검색엔진(SEO)에도
//          영문 주소가 더 깔끔하기 때문. 그래서 화면엔 한글, 주소엔 영문을 씀.
// 핵심 흐름: (한글)categorySlug() → 영문 / (영문)categoryFromSlug() → 한글
// ============================================================================

import { CATEGORY_TREE, flattenSubs } from './catalog';

// 대분류(앰프/스피커/...)의 한글→영문 슬러그 표.
// Record<string, string> = "문자열 키 → 문자열 값" 형태의 객체 타입.
export const TOP_SLUGS: Record<string, string> = {
  '앰프': 'amps',
  '스피커': 'speakers',
  '소스기기': 'sources',
  '케이블': 'cables'
};

// 하위 카테고리(서브)의 한글→영문 슬러그 표.
// '평면 매핑' = 어느 대분류에 속하든 같은 한글 이름이면 같은 슬러그를 씀.
//   예: '포노 케이블'은 케이블/턴테이블 양쪽에 있어도 슬러그는 'phono-cable' 하나.
export const SUB_SLUGS: Record<string, string> = {
  // 앰프
  '프리앰프': 'preamp',
  '파워앰프': 'power-amp',
  '인티앰프': 'integrated-amp',
  '포노 스테이지': 'phono-stage',
  'MM/MC 포노앰프': 'phono-amp',
  '포노앰프': 'phono-amp', // 포노 스테이지 하위(3단계 그룹의 잎). MC 스텝업 헤드앰프/트랜스는 아래에 기존 슬러그 존재.
  '파워 서플라이': 'power-supply',
  '부품': 'parts',
  '소모품': 'consumables',
  '드라이버': 'driver',
  '네트워크': 'network',
  '기타 부품': 'misc-parts',
  'MC 스텝업 트랜스': 'mc-step-up',
  'MC 스텝업 헤드앰프': 'mc-head-amp',
  '헤드폰 앰프': 'headphone-amp',
  '네트워크 앰프': 'network-amp',
  '리시버': 'receiver',
  'AV 리시버': 'av-receiver',

  // 스피커
  '북쉘프 스피커': 'bookshelf',
  '플로어 스탠딩 스피커': 'floor-standing',
  '톨보이 스피커': 'tallboy',
  '센터 스피커': 'center',
  '사운드바': 'soundbar',
  '서브우퍼': 'subwoofer',

  // 소스기기
  '턴테이블': 'turntable',
  '카세트 데크': 'cassette-deck',
  '오픈릴 데크': 'open-reel',
  'CD 플레이어': 'cd-player',
  'CD 트랜스포트': 'cd-transport',
  'SACD 플레이어': 'sacd-player',
  'DAC': 'dac',
  '네트워크 플레이어': 'network-player',
  '블루투스 리시버': 'bluetooth-receiver',
  'FM 튜너': 'fm-tuner',
  'AM/FM 튜너': 'am-fm-tuner',
  'LD 플레이어': 'ld-player',
  'DVD 플레이어': 'dvd-player',
  '블루레이 플레이어': 'blu-ray-player',

  // 액세서리
  '파워 컨디셔너': 'power-conditioner',
  '전원 필터': 'power-filter',
  '오디오 멀티탭': 'audio-power-strip',
  '리니어 전원장치': 'linear-power-supply',
  '스텝다운 트랜스': 'step-down-transformer',
  '아이솔레이션 트랜스': 'isolation-transformer',
  '오디오 랙': 'audio-rack',
  '스피커 스탠드': 'speaker-stand',
  '인슐레이터': 'insulator',
  '스파이크': 'spike',
  '슈즈': 'shoe',
  '방진 매트': 'vibration-mat',

  // 턴테이블 액세서리
  'MM 카트리지': 'mm-cartridge',
  'MC 카트리지': 'mc-cartridge',
  '헤드쉘': 'headshell',
  '헤드쉘 와이어': 'headshell-wire',
  '오버행 게이지': 'overhang-gauge',
  '침압계': 'stylus-force-gauge',
  '카트리지 정렬 게이지': 'cartridge-alignment',
  '턴테이블 벨트': 'turntable-belt',
  '모터 풀리': 'motor-pulley',
  '서브 플래터': 'subplatter',
  '턴테이블 플린스': 'turntable-plinth',
  '33/45 어댑터': 'adapter-33-45',
  '톤암': 'tonearm',
  '톤암 리프터': 'tonearm-lifter',
  '턴테이블 매트': 'turntable-mat',
  '레코드 스테빌라이저': 'record-stabilizer',
  '레코드 클리너': 'record-cleaner',
  '스타일러스 클리너': 'stylus-cleaner',
  '더스트 커버': 'dust-cover',

  // 케이블
  'RCA 케이블': 'rca-cable',
  'XLR 케이블': 'xlr-cable',
  '스피커 케이블': 'speaker-cable',
  '파워 케이블': 'power-cable',
  '디지털 동축 케이블': 'digital-coaxial-cable',
  '광 케이블': 'optical-cable',
  'USB 케이블': 'usb-cable',
  'AES/EBU 케이블': 'aes-ebu-cable',
  'BNC 케이블': 'bnc-cable',
  'HDMI 케이블': 'hdmi-cable',
  '포노 케이블': 'phono-cable',
  '점퍼 케이블': 'jumper-cable',
  '헤드폰 케이블': 'headphone-cable',
  '이어폰 케이블': 'earphone-cable',

};

// 역매핑: 위 표를 거꾸로 뒤집어 "영문 슬러그 → 한글 이름" 표를 자동 생성.
//   Object.entries(m): {앰프:'amps'} → [['앰프','amps']] 형태의 배열로 변환
//   .map([k,v] => [v,k]): 키와 값을 서로 바꿈 → [['amps','앰프']]
//   Object.fromEntries(...): 다시 객체로 변환 → {amps:'앰프'}
const reverse = <T extends Record<string, string>>(m: T) =>
  Object.fromEntries(Object.entries(m).map(([k, v]) => [v, k])) as Record<string, string>;

export const TOP_FROM_SLUG = reverse(TOP_SLUGS);   // 영문→한글 (대분류)
export const SUB_FROM_SLUG = reverse(SUB_SLUGS);   // 영문→한글 (하위)

// [한글 → 영문] 한글 카테고리 이름을 URL용 영문 슬러그로 변환.
//   표에 없으면 encodeURIComponent로 안전하게 인코딩(최후의 폴백).
//   '?? ' 연산자: 앞 값이 없으면(null/undefined) 뒤 값을 사용.
export function categorySlug(name: string | null | undefined): string | null {
  if (!name) return null;
  return TOP_SLUGS[name] ?? SUB_SLUGS[name] ?? encodeURIComponent(name);
}

// [영문 → 한글] URL 슬러그를 다시 원래 한글 카테고리 이름으로 변환.
//   주소창의 슬러그를 읽어 화면에 한글 카테고리를 표시할 때 사용.
export function categoryFromSlug(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return TOP_FROM_SLUG[slug] ?? SUB_FROM_SLUG[slug] ?? decodeURIComponent(slug);
}

// 개발용 자가진단: CATEGORY_TREE의 모든 하위 카테고리가 SUB_SLUGS에 등록됐는지 검사.
//   슬러그를 빠뜨리면 그 카테고리 URL이 깨지므로, 누락 목록을 돌려줘 점검에 사용.
export function validateSlugMapping(): { missing: string[] } {
  const allSubs = CATEGORY_TREE.flatMap((c) => flattenSubs(c.subs));   // 모든 하위 카테고리(잎)
  const missing = allSubs.filter((s) => !(s in SUB_SLUGS)); // 슬러그가 없는 것만 추림
  return { missing };
}
