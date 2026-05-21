// ⚠️ 임시 더미 매물 데이터 — 나중에 쉽게 제거할 수 있도록 분리된 파일입니다.
//
// 제거 방법 (두 가지 모두 필요):
//   1) 이 파일 자체를 삭제: src/app/data/dummy-catalog.ts
//   2) src/app/components/browse-page.tsx 의 buildListings 함수 안에서
//      DUMMY_CATALOG 관련 줄(주석 표시됨)을 삭제
//
// 또는 토글로 비활성화만 하려면 INCLUDE_DUMMY를 false로 설정.

import type { CatalogItem } from './catalog';

export const INCLUDE_DUMMY = true;

export const DUMMY_CATALOG: CatalogItem[] = [
  // ─── 앰프 (25) ────────────────────────────────────────────────
  { brand: 'McIntosh', model: 'MA8950', year: '2022', category: '인티앰프', description: '하이엔드 솔리드 스테이트 인티앰프' },
  { brand: 'McIntosh', model: 'C2700', year: '2020', category: '프리앰프', description: '진공관 프리앰프 + DAC 옵션' },
  { brand: 'McIntosh', model: 'MC275', year: '2019', category: '파워앰프', description: '클래식 진공관 파워앰프' },
  { brand: 'Marantz', model: 'PM-10', year: '2021', category: '인티앰프', description: '레퍼런스 클래스 D 인티앰프' },
  { brand: 'Marantz', model: 'SR8015', year: '2020', category: 'AV 리시버', description: '11.2채널 8K AV 리시버' },
  { brand: 'Accuphase', model: 'E-800', year: '2021', category: '인티앰프', description: 'A급 50주년 기념 인티앰프' },
  { brand: 'Accuphase', model: 'C-3900', year: '2022', category: '프리앰프', description: '플래그십 프리앰프' },
  { brand: 'Luxman', model: 'L-595A', year: '2020', category: '인티앰프', description: '한정판 A급 인티앰프' },
  { brand: 'Luxman', model: 'M-10X', year: '2022', category: '파워앰프', description: '플래그십 스테레오 파워앰프' },
  { brand: 'Yamaha', model: 'A-S3200', year: '2020', category: '인티앰프', description: '플래그십 하이엔드 인티앰프' },
  { brand: 'Yamaha', model: 'RX-A8A', year: '2021', category: 'AV 리시버', description: 'Aventage 11.2채널 리시버' },
  { brand: 'Pass Labs', model: 'INT-25', year: '2019', category: '인티앰프', description: 'Class A 인티앰프 25W' },
  { brand: 'Pass Labs', model: 'XA60.8', year: '2018', category: '파워앰프', description: 'Class A 모노블록 파워앰프' },
  { brand: 'Naim', model: 'NAIT XS 3', year: '2020', category: '인티앰프', description: 'XS 시리즈 인티앰프' },
  { brand: 'Naim', model: 'Supernait 3', year: '2021', category: '인티앰프', description: '레퍼런스 클래스 인티앰프' },
  { brand: 'Audio Research', model: 'REF 6SE', year: '2019', category: '프리앰프', description: '하이엔드 진공관 프리앰프' },
  { brand: 'Audio Research', model: 'PH9', year: '2020', category: '포노 스테이지', description: '진공관 포노 스테이지' },
  { brand: 'Burmester', model: '101', year: '2021', category: '인티앰프', description: '독일제 솔리드 스테이트 인티앰프' },
  { brand: 'Cambridge Audio', model: 'CXA81', year: '2022', category: '인티앰프', description: '리뷰 호평 인티앰프' },
  { brand: 'Arcam', model: 'SA30', year: '2021', category: '인티앰프', description: 'Dirac Live 룸 보정 인티앰프' },
  { brand: 'Denon', model: 'AVR-X8500H', year: '2019', category: 'AV 리시버', description: '13.2채널 플래그십 AV 리시버' },
  { brand: 'Audeze', model: 'CRBN', year: '2022', category: '헤드폰 앰프', description: '정전형 헤드폰 앰프' },
  { brand: 'Chord Electronics', model: 'TToby', year: '2020', category: '파워앰프', description: '스테레오 파워앰프' },
  { brand: 'Bryston', model: '4B³', year: '2021', category: '파워앰프', description: '300W 스테레오 파워앰프' },
  { brand: 'Audio Note', model: 'M3', year: '2019', category: '프리앰프', description: '진공관 프리앰프' },

  // ─── 스피커 (20) ──────────────────────────────────────────────
  { brand: 'Bowers & Wilkins', model: '805 D4', year: '2022', category: '북쉘프 스피커', description: '다이아몬드 트위터 북쉘프' },
  { brand: 'Bowers & Wilkins', model: '802 D4', year: '2022', category: '플로어 스탠딩 스피커', description: '플래그십 플로어 스탠딩' },
  { brand: 'KEF', model: 'LS50 Meta', year: '2020', category: '북쉘프 스피커', description: 'MAT 기술 적용 북쉘프' },
  { brand: 'KEF', model: 'Reference 5', year: '2021', category: '플로어 스탠딩 스피커', description: '레퍼런스 시리즈 플로어 스탠딩' },
  { brand: 'Focal', model: 'Sopra No.2', year: '2019', category: '플로어 스탠딩 스피커', description: 'Beryllium 트위터 플로어 스탠딩' },
  { brand: 'Focal', model: 'Aria 906', year: '2020', category: '북쉘프 스피커', description: 'Aria 시리즈 북쉘프' },
  { brand: 'Klipsch', model: 'RP-600M II', year: '2022', category: '북쉘프 스피커', description: '혼 로디드 북쉘프' },
  { brand: 'Klipsch', model: 'Cornwall IV', year: '2021', category: '톨보이 스피커', description: '헤리티지 시리즈 톨보이' },
  { brand: 'Wilson Audio', model: 'Sasha DAW', year: '2019', category: '플로어 스탠딩 스피커', description: '하이엔드 플로어 스탠딩' },
  { brand: 'Magico', model: 'A3', year: '2020', category: '플로어 스탠딩 스피커', description: '알루미늄 인클로저 플로어 스탠딩' },
  { brand: 'ATC', model: 'SCM40', year: '2021', category: '플로어 스탠딩 스피커', description: '스튜디오 레퍼런스 플로어 스탠딩' },
  { brand: 'ATC', model: 'SCM19', year: '2020', category: '북쉘프 스피커', description: '스튜디오 레퍼런스 북쉘프' },
  { brand: 'Sonus Faber', model: 'Olympica Nova III', year: '2020', category: '플로어 스탠딩 스피커', description: '이탈리아제 플로어 스탠딩' },
  { brand: 'Dynaudio', model: 'Confidence 30', year: '2021', category: '플로어 스탠딩 스피커', description: '플래그십 플로어 스탠딩' },
  { brand: 'Tannoy', model: 'Legacy Cheviot', year: '2018', category: '톨보이 스피커', description: '듀얼 컨센트릭 톨보이' },
  { brand: 'JBL', model: 'L100 Classic', year: '2019', category: '북쉘프 스피커', description: '레트로 디자인 북쉘프' },
  { brand: 'JBL', model: 'Bar 1300', year: '2022', category: '사운드바', description: '11.1.4채널 돌비 애트모스 사운드바' },
  { brand: 'SVS', model: 'PB-3000', year: '2020', category: '서브우퍼', description: '13인치 패시브 라디에이터 서브우퍼' },
  { brand: 'REL', model: 'S/812', year: '2021', category: '서브우퍼', description: '12인치 하이엔드 서브우퍼' },
  { brand: 'Sennheiser', model: 'Ambeo Soundbar', year: '2021', category: '사운드바', description: '3D 이머시브 사운드바' },

  // ─── 소스기기 (25) ────────────────────────────────────────────
  { brand: 'Pro-Ject', model: 'Debut Carbon EVO', year: '2020', category: '턴테이블', description: '입문용 카본 톤암 턴테이블' },
  { brand: 'Pro-Ject', model: 'X8', year: '2022', category: '턴테이블', description: '하이엔드 매스로디드 턴테이블' },
  { brand: 'Rega', model: 'Planar 3', year: '2019', category: '턴테이블', description: 'RB330 톤암 장착 턴테이블' },
  { brand: 'Rega', model: 'Planar 10', year: '2021', category: '턴테이블', description: '플래그십 세라믹 플래터 턴테이블' },
  { brand: 'Technics', model: 'SL-1200GR', year: '2018', category: '턴테이블', description: '다이렉트 드라이브 클래식 턴테이블' },
  { brand: 'Clearaudio', model: 'Concept', year: '2020', category: '턴테이블', description: 'Made in Germany 턴테이블' },
  { brand: 'Marantz', model: 'SA-10', year: '2019', category: 'SACD 플레이어', description: '레퍼런스 SACD 플레이어' },
  { brand: 'Esoteric', model: 'K-01XD', year: '2021', category: 'SACD 플레이어', description: '플래그십 SACD/CD 플레이어' },
  { brand: 'Cambridge Audio', model: 'CXC v2', year: '2021', category: 'CD 트랜스포트', description: 'CD 전용 트랜스포트' },
  { brand: 'McIntosh', model: 'MCT500', year: '2020', category: 'CD 트랜스포트', description: 'SACD 트랜스포트' },
  { brand: 'Marantz', model: 'CD 6007', year: '2021', category: 'CD 플레이어', description: '엔트리 레벨 CD 플레이어' },
  { brand: 'Chord Electronics', model: 'DAVE', year: '2019', category: 'DAC', description: '레퍼런스 DAC' },
  { brand: 'Chord Electronics', model: 'Hugo TT 2', year: '2020', category: 'DAC', description: '데스크탑 하이엔드 DAC' },
  { brand: 'Benchmark', model: 'DAC3 B', year: '2020', category: 'DAC', description: '스튜디오 레퍼런스 DAC' },
  { brand: 'RME', model: 'ADI-2 DAC FS', year: '2021', category: 'DAC', description: '베스트셀러 데스크탑 DAC' },
  { brand: 'Auralic', model: 'Vega G2.1', year: '2020', category: 'DAC', description: '스트리밍 DAC' },
  { brand: 'Aurender', model: 'N20', year: '2021', category: '네트워크 플레이어', description: '레퍼런스 뮤직 서버' },
  { brand: 'Bluesound', model: 'Node 2i', year: '2019', category: '네트워크 플레이어', description: '대중적인 스트리머' },
  { brand: 'Naim', model: 'NDX 2', year: '2020', category: '네트워크 플레이어', description: '하이엔드 네트워크 플레이어' },
  { brand: 'Lyngdorf', model: 'TDAI-3400', year: '2021', category: '네트워크 앰프', description: 'RoomPerfect 통합 앰프' },
  { brand: 'Magnum Dynalab', model: 'MD-309', year: '2018', category: 'FM 튜너', description: '하이엔드 FM 튜너' },
  { brand: 'Tandberg', model: 'TD-20A', year: '1980', category: '오픈릴 데크', description: '빈티지 오픈릴 데크' },
  { brand: 'Nakamichi', model: 'Dragon', year: '1985', category: '카세트 데크', description: '전설의 카세트 데크' },
  { brand: 'Tascam', model: '202MKVII', year: '2020', category: '카세트 데크', description: '듀얼 카세트 데크' },
  { brand: 'Oppo', model: 'UDP-205', year: '2018', category: '블루레이 플레이어', description: '4K UHD 블루레이 플레이어' },

  // ─── 케이블 (15) ──────────────────────────────────────────────
  { brand: 'AudioQuest', model: 'Mackenzie', year: '2021', category: 'RCA 케이블', description: 'PSC+ 도체 RCA 인터커넥트' },
  { brand: 'AudioQuest', model: 'Sky', year: '2020', category: 'XLR 케이블', description: 'PSS 도체 XLR 인터커넥트' },
  { brand: 'AudioQuest', model: 'Rocket 88', year: '2021', category: '스피커 케이블', description: '바이와이어링 스피커 케이블' },
  { brand: 'AudioQuest', model: 'NRG-Z3', year: '2020', category: '파워 케이블', description: '오디오 그레이드 파워 케이블' },
  { brand: 'AudioQuest', model: 'Carbon HDMI', year: '2021', category: 'HDMI 케이블', description: '8K HDMI 케이블' },
  { brand: 'Cardas Audio', model: 'Clear Sky', year: '2020', category: 'RCA 케이블', description: '하이엔드 RCA 케이블' },
  { brand: 'Cardas Audio', model: 'Clear Beyond', year: '2019', category: '스피커 케이블', description: '레퍼런스 스피커 케이블' },
  { brand: 'Nordost', model: 'Heimdall 2', year: '2020', category: 'RCA 케이블', description: 'MicroMono 필라멘트 RCA' },
  { brand: 'Nordost', model: 'Tyr 2', year: '2021', category: '스피커 케이블', description: '하이엔드 스피커 케이블' },
  { brand: 'Kimber Kable', model: '8TC', year: '2019', category: '스피커 케이블', description: '클래식 스피커 케이블' },
  { brand: 'Chord Company', model: 'Signature Reference', year: '2020', category: 'XLR 케이블', description: '시그니처 XLR 케이블' },
  { brand: 'Chord Company', model: 'Sarum T', year: '2021', category: '디지털 동축 케이블', description: '레퍼런스 디지털 동축' },
  { brand: 'Wireworld', model: 'Platinum Starlight 8', year: '2020', category: 'USB 케이블', description: '하이엔드 USB 케이블' },
  { brand: 'Furutech', model: 'GT2 Pro', year: '2021', category: 'USB 케이블', description: '오디오 그레이드 USB' },
  { brand: 'Acrolink', model: '7N-D5000', year: '2020', category: '광 케이블', description: '광 디지털 케이블' },
];
