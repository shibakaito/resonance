// ============================================================================
// catalog.ts — 카탈로그(상품 원본 데이터) + 브랜드 사전 + 카테고리 트리
// ----------------------------------------------------------------------------
// 이 파일은 앱 전체가 참조하는 "데이터의 뿌리"입니다. 크게 4가지를 담고 있어요.
//   1) CATALOG        : 실제 상품 원본 목록 (지금은 비어 있음)
//   2) BRAND_DIRECTORY: 419개 브랜드의 영문 이름 + 한글 별칭(검색용)
//   3) CATEGORY_TREE  : 대분류 → 하위 카테고리 구조 (메뉴/필터의 기준)
//   4) 검색 헬퍼 함수  : searchCatalog / searchBrands / subcategoriesFor 등
//
// ⚠️ 원래 McIntosh.rtf 파일에서 자동 생성된 파일이라 윗부분은 손대지 않는 게 원칙.
//    (새 RTF를 ~/Downloads 에 넣고 파싱 스크립트를 돌리면 다시 만들어짐)
// ============================================================================

// 카탈로그 한 줄(상품 1개)의 형태를 정의하는 "타입(type)".
// 타입 = "이 데이터는 이런 모양이어야 한다"는 약속. 오타나 빠진 값을 미리 잡아줌.
export type CatalogItem = {
  brand: string;        // 브랜드명 (예: 'McIntosh')
  model: string;        // 모델명 (예: 'MC275')
  year: string;         // 출시 연도 문자열 (예: '2022' 또는 '1963 - 1972년')
  category: string;     // 카테고리 (예: '인티앰프')
  description: string;  // 한 줄 설명
};

// 실제 상품 목록. 지금은 비어 있음(더미 매물은 dummy-catalog.ts에서 따로 합쳐짐).
// CatalogItem[] = "CatalogItem 들이 들어가는 배열"이라는 뜻.
export const CATALOG: CatalogItem[] = [
];

// CATALOG에 등장하는 브랜드/카테고리만 중복 없이 뽑아낸 목록.
// new Set(...) = 중복 제거, Array.from(...) = 다시 배열로 변환.
export const CATALOG_BRANDS = Array.from(new Set(CATALOG.map((c) => c.brand)));
export const CATALOG_CATEGORIES = Array.from(new Set(CATALOG.map((c) => c.category)));

// "인기 브랜드" 칩에 보여줄, 손으로 고른 대표 브랜드 목록.
// 이 이름들은 아래 BRAND_DIRECTORY를 통해 한글 별칭 검색도 지원됨.
export const POPULAR_BRANDS = [
  'McIntosh',
  'Marantz',
  'Luxman',
  'Accuphase',
  'Yamaha',
  'Pass Labs',
  'Naim',
  'Bowers & Wilkins'
];

// 검색어를 비교하기 쉬운 형태로 "정규화"하는 함수.
// 공백·&·-·/ 를 모두 지우고 소문자로 바꿈.
// 예: "Bowers & Wilkins" → "bowerswilkins" → "B&W"로 쳐도 매칭되게 함.
const normalize = (s: string) => s.replace(/[\s&\-/]+/g, '').toLowerCase();

// 한글/별칭 검색어를 → 정식 영문 브랜드명으로 바꿔주는 함수.
// 예: "마란츠" 라고 치면 "Marantz" 로 변환해서 검색 정확도를 높임.
// 매칭되는 브랜드가 없으면 입력한 검색어를 그대로 돌려줌.
function expandQueryToBrand(query: string): string {
  const q = normalize(query);
  if (!q) return query;                       // 빈 검색어면 그대로
  for (const b of BRAND_DIRECTORY) {          // 모든 브랜드를 하나씩 확인
    if (normalize(b.name).includes(q)) return query;          // 영문명에 이미 포함되면 그대로
    if (b.aliases.some((a) => normalize(a) === q || normalize(a).includes(q))) {
      return b.name;                          // 한글 별칭이 맞으면 → 영문 정식명으로 교체
    }
  }
  return query;
}

// 카탈로그(상품)에서 검색어와 맞는 상품을 찾아 최대 limit개 반환.
// 브랜드+모델+카테고리를 한 덩어리로 합쳐서 검색어가 포함되는지 확인.
export function searchCatalog(query: string, limit = 20): CatalogItem[] {
  if (!query.trim()) return [];               // 검색어가 비었으면 빈 결과
  const expanded = expandQueryToBrand(query); // 한글 별칭 → 영문 변환
  const q = normalize(expanded);
  return CATALOG.filter((r) => {
    const hay = normalize(`${r.brand} ${r.model} ${r.category}`); // 검색 대상 문자열
    return hay.includes(q);                   // 검색어가 들어있으면 통과
  }).slice(0, limit);                         // 앞에서 limit개만 잘라서 반환
}

// --- 브랜드 사전 (419개 브랜드 + 한글 별칭) ---
// Brand 타입: name = 정식 영문명, aliases = 한글/약어 등 검색용 별칭 목록.
export type Brand = { name: string; aliases: string[] };

// 아래는 419개 브랜드 데이터가 쭉 나열된 큰 배열입니다.
// 각 줄: { name: '영문 정식명', aliases: ['한글표기', '약어', ...] }
// aliases 덕분에 사용자가 한글로 검색해도 영문 브랜드를 찾을 수 있어요.
export const BRAND_DIRECTORY: Brand[] = [
  { name: '64 Audio', aliases: ['64오디오', '식스티포오디오'] },
  { name: '7Hz', aliases: ['7헤르츠', '세븐헤르츠'] },
  { name: 'AAW', aliases: [] },
  { name: 'Acapella', aliases: ['아카펠라'] },
  { name: 'Accuphase', aliases: ['어큐페이즈', '아큐페이즈'] },
  { name: 'Acoustat', aliases: ['어쿠스탯'] },
  { name: 'Acoustic Energy', aliases: ['어쿠스틱 에너지'] },
  { name: 'Acoustic Research', aliases: ['어쿠스틱 리서치', 'AR'] },
  { name: 'Acoustune', aliases: ['어쿠스튠'] },
  { name: 'Acrolink', aliases: ['아크로링크'] },
  { name: 'Adam Audio', aliases: ['아담 오디오', 'ADAM', 'ADAM Audio'] },
  { name: 'Adcom', aliases: ['애드컴'] },
  { name: 'Advent', aliases: ['어드벤트'] },
  { name: 'Aesthetix', aliases: ['에스테틱스'] },
  { name: 'Aiaiai', aliases: ['아이아이아이', 'AIAIAI'] },
  { name: 'Air Tight', aliases: ['에어타이트'] },
  { name: 'Aiwa', aliases: ['아이와'] },
  { name: 'Akai', aliases: ['아카이'] },
  { name: 'AKG', aliases: ['에이케이지'] },
  { name: 'Alesis', aliases: ['알레시스'] },
  { name: 'Allen & Heath', aliases: ['알렌앤히스', '알렌 히스'] },
  { name: 'Allnic Audio', aliases: ['올닉', '올닉 오디오', 'Allnic'] },
  { name: 'Alphason', aliases: ['알파슨'] },
  { name: 'AlphaTheta', aliases: ['알파세타'] },
  { name: 'Altec Lansing', aliases: ['알텍', '알텍 랜싱', 'Altec'] },
  { name: 'Alto Professional', aliases: ['알토', '알토 프로페셔널', 'Alto'] },
  { name: 'Ampex', aliases: ['암펙스'] },
  { name: 'Amphion', aliases: ['암피온'] },
  { name: 'Analog Domain', aliases: ['아날로그 도메인'] },
  { name: 'Antelope Audio', aliases: ['안텔롭', '안텔롭 오디오', 'Antelope'] },
  { name: 'Anthem', aliases: ['앤썸'] },
  { name: 'Apogee Acoustics', aliases: ['아포지 어쿠스틱스', 'Apogee'] },
  { name: 'Apogee Electronics', aliases: ['아포지', '아포지 일렉트로닉스', 'Apogee'] },
  { name: 'April Music', aliases: ['에이프릴뮤직', '에이프릴 뮤직'] },
  { name: 'Arcam', aliases: ['아캄'] },
  { name: 'Astell&Kern', aliases: ['아스텔앤컨', '아스텔앤컨', 'A&K'] },
  { name: 'ATC', aliases: ['에이티씨'] },
  { name: 'Audeze', aliases: ['오디지'] },
  { name: 'Audia Flight', aliases: ['오디아 플라이트'] },
  { name: 'Audient', aliases: ['오디언트'] },
  { name: 'Audio Alchemy', aliases: ['오디오 알케미'] },
  { name: 'Audio Analogue', aliases: ['오디오 아날로그'] },
  { name: 'Audio Note', aliases: ['오디오 노트'] },
  { name: 'Audio Physic', aliases: ['오디오 피직'] },
  { name: 'Audio Research', aliases: ['오디오 리서치', '오디오리서치', 'ARC'] },
  { name: 'Audio-Technica', aliases: ['오디오테크니카', '오디오 테크니카'] },
  { name: 'Audiolab', aliases: ['오디오랩'] },
  { name: 'AudioQuest', aliases: ['오디오퀘스트', '오디오 퀘스트'] },
  { name: 'Audiovector', aliases: ['오디오벡터', 'AudioVector'] },
  { name: 'Aune', aliases: ['아우네'] },
  { name: 'Aura Audio', aliases: ['아우라 오디오', '오라 오디오', '아우라', '오라'] },
  { name: 'Auralic', aliases: ['오랄릭', '아우랄릭'] },
  { name: 'Aurender', aliases: ['오렌더', '아우렌더'] },
  { name: 'Auris Audio', aliases: ['오리스 오디오', 'Auris'] },
  { name: 'Austrian Audio', aliases: ['오스트리안 오디오'] },
  { name: 'Avantgarde Acoustic', aliases: ['아방가르드', '아방가르드 어쿠스틱', 'Avantgarde'] },
  { name: 'Avid', aliases: ['아비드'] },
  { name: 'Avid HiFi', aliases: ['아비드 하이파이'] },
  { name: 'AVM', aliases: ['에이브이엠'] },
  { name: 'Ayon Audio', aliases: ['에이온', '에이온 오디오', 'Ayon'] },
  { name: 'Ayre', aliases: ['에어'] },
  { name: 'Bakoon Products', aliases: ['바쿤', '바쿤 프로덕츠', 'Bakoon'] },
  { name: 'Balanced Audio Technology', aliases: ['BAT', '비에이티', '배트'] },
  { name: 'Bang & Olufsen', aliases: ['뱅앤올룹슨', '비앤오', 'B&O'] },
  { name: 'Bel Canto', aliases: ['벨칸토'] },
  { name: 'Benchmark', aliases: ['벤치마크'] },
  { name: 'Beyerdynamic', aliases: ['베이어다이나믹', '베이어'] },
  { name: 'BGVP', aliases: [] },
  { name: 'Biamp', aliases: ['바이앰프'] },
  { name: 'Black Lion Audio', aliases: ['블랙라이언오디오', '블랙 라이언 오디오', 'Black Lion'] },
  { name: 'Bluesound', aliases: ['블루사운드'] },
  { name: 'Bose', aliases: ['보스'] },
  { name: 'Bose Professional', aliases: ['보스 프로페셔널', 'Bose Pro'] },
  { name: 'Boulder', aliases: ['볼더'] },
  { name: 'Bowers & Wilkins', aliases: ['바워스앤윌킨스', '바우어스앤윌킨스', 'B&W'] },
  { name: 'Bozak', aliases: ['보작'] },
  { name: 'Braun', aliases: ['브라운'] },
  { name: 'Bricasti Design', aliases: ['브리카스티', '브리카스티 디자인', 'Bricasti'] },
  { name: 'Brinkmann', aliases: ['브링크만'] },
  { name: 'Bryston', aliases: ['브라이스턴', '브리스톤'] },
  { name: 'BSR', aliases: ['비에스알'] },
  { name: 'Burmester', aliases: ['부메스터'] },
  { name: 'C.E.C.', aliases: ['씨이씨', 'CEC'] },
  { name: 'Cambridge Audio', aliases: ['캠브리지 오디오'] },
  { name: 'Campfire Audio', aliases: ['캠프파이어 오디오', 'Campfire'] },
  { name: 'Canare', aliases: ['카나레'] },
  { name: 'Canton', aliases: ['칸톤'] },
  { name: 'Cardas Audio', aliases: ['카다스', '카다스 오디오', 'Cardas'] },
  { name: 'Carver', aliases: ['카버'] },
  { name: 'Cary Audio', aliases: ['캐리 오디오', 'Cary'] },
  { name: 'Castle', aliases: ['캐슬'] },
  { name: 'Cayin', aliases: ['케인', '카인'] },
  { name: 'Celestion', aliases: ['셀레스천', '셀레스션'] },
  { name: 'Cerwin-Vega', aliases: ['서윈베가'] },
  { name: 'CH Precision', aliases: ['CH 프리시전', '씨에이치 프리시전'] },
  { name: 'Chord Company', aliases: ['코드 컴퍼니'] },
  { name: 'Chord Electronics', aliases: ['코드 일렉트로닉스', '코드'] },
  { name: 'Classe', aliases: ['클라세', '클라쎄', 'Classé'] },
  { name: 'Clearaudio', aliases: ['클리어오디오'] },
  { name: 'Conrad-Johnson', aliases: ['콘라드존슨', '콘래드존슨'] },
  { name: 'Constellation Audio', aliases: ['콘스텔레이션 오디오', 'Constellation'] },
  { name: 'Copland', aliases: ['코플랜드'] },
  { name: 'Cowon', aliases: ['코원'] },
  { name: 'Cranborne Audio', aliases: ['크랜본 오디오', 'Cranborne'] },
  { name: 'Creek', aliases: ['크릭'] },
  { name: 'Crown', aliases: ['크라운'] },
  { name: 'Crystal Cable', aliases: ['크리스탈 케이블'] },
  { name: 'Cyrus', aliases: ['사이러스'] },
  { name: 'DALI', aliases: ['달리'] },
  { name: 'Dan Clark Audio', aliases: ['댄클락오디오', '댄 클락 오디오', 'DCA', 'Dan Clark'] },
  { name: 'Dan D\'Agostino', aliases: ['댄 다고스티노', '다고스티노'] },
  { name: 'd&b audiotechnik', aliases: ['디앤비 오디오테크닉', 'd&b'] },
  { name: 'Dangerous Music', aliases: ['데인저러스 뮤직'] },
  { name: 'dbx', aliases: ['디비엑스'] },
  { name: 'dCS', aliases: ['디씨에스'] },
  { name: 'Definitive Technology', aliases: ['데피니티브 테크놀로지'] },
  { name: 'Denon', aliases: ['데논', '데논'] },
  { name: 'Devialet', aliases: ['드비알레', '드비알렛'] },
  { name: 'DeVore Fidelity', aliases: ['드보어 피델리티', 'DeVore'] },
  { name: 'Diapason', aliases: ['디아파송'] },
  { name: 'Diatone', aliases: ['다이아톤'] },
  { name: 'DiGiCo', aliases: ['디지코'] },
  { name: 'Dual', aliases: ['듀얼'] },
  { name: 'Dunu', aliases: ['두누'] },
  { name: 'Dynaco', aliases: ['다이나코'] },
  { name: 'Dynaudio', aliases: ['다인오디오', '다인 오디오'] },
  { name: 'EAR Yoshino', aliases: ['EAR 요시노', '이어 요시노', 'EAR'] },
  { name: 'EAW', aliases: ['이AW'] },
  { name: 'Edifier', aliases: ['에디파이어'] },
  { name: 'ELAC', aliases: ['엘락'] },
  { name: 'Electro-Voice', aliases: ['일렉트로보이스', 'EV'] },
  { name: 'Electrocompaniet', aliases: ['일렉트로콤파니에', '일렉트로콤파니엣'] },
  { name: 'Elipson', aliases: ['엘립손'] },
  { name: 'EMM Labs', aliases: ['EMM 랩스', '이엠엠 랩스'] },
  { name: 'Empire', aliases: ['엠파이어'] },
  { name: 'ENLEUM', aliases: ['엔리움', 'Enleum'] },
  { name: 'Epos', aliases: ['에포스'] },
  { name: 'Esoteric', aliases: ['에소테릭'] },
  { name: 'ESS', aliases: ['이에스에스'] },
  { name: 'Etymotic', aliases: ['에티모틱'] },
  { name: 'Eventide', aliases: ['이벤트타이드'] },
  { name: 'Eversolo', aliases: ['에버솔로'] },
  { name: 'Exposure', aliases: ['익스포저'] },
  { name: 'Fairchild', aliases: ['페어차일드'] },
  { name: 'Ferrum', aliases: ['페럼'] },
  { name: 'FiiO', aliases: ['피오', 'Fiio'] },
  { name: 'Final', aliases: ['파이널', 'Final Audio'] },
  { name: 'FIR Audio', aliases: ['퍼 오디오'] },
  { name: 'Fisher', aliases: ['피셔', '더 피셔', '더피셔', 'The Fisher'] },
  { name: 'FM Acoustics', aliases: ['FM 어쿠스틱스', '에프엠 어쿠스틱스'] },
  { name: 'Focal', aliases: ['포칼'] },
  { name: 'Focusrite', aliases: ['포커스라이트'] },
  { name: 'Formula Sound', aliases: ['포뮬라 사운드'] },
  { name: 'Fostex', aliases: ['포스텍스'] },
  { name: 'Furutech', aliases: ['후루텍'] },
  { name: 'Fyne Audio', aliases: ['파인오디오'] },
  { name: 'Garrard', aliases: ['가라드', '게라드'] },
  { name: 'Genelec', aliases: ['제네렉'] },
  { name: 'Gold Note', aliases: ['골드노트'] },
  { name: 'Goldmund', aliases: ['골드문트'] },
  { name: 'Goldring', aliases: ['골드링'] },
  { name: 'Grace Design', aliases: ['그레이스 디자인'] },
  { name: 'Grado', aliases: ['그라도'] },
  { name: 'Graham Audio', aliases: ['그라함 오디오'] },
  { name: 'Gryphon', aliases: ['그리폰'] },
  { name: 'Hana', aliases: ['하나'] },
  { name: 'Harbeth', aliases: ['하베스'] },
  { name: 'Harman Kardon', aliases: ['하만카돈', '하만 카돈'] },
  { name: 'Heathkit', aliases: ['히스킷'] },
  { name: 'Heco', aliases: ['헤코'] },
  { name: 'Heed Audio', aliases: ['히드 오디오', 'Heed'] },
  { name: 'Hegel', aliases: ['헤겔'] },
  { name: 'HH Scott', aliases: ['스코트', 'HH 스코트', 'H.H. Scott'] },
  { name: 'HiBy', aliases: ['하이비'] },
  { name: 'Hidizs', aliases: ['하이디즈'] },
  { name: 'HiFi ROSE', aliases: ['하이파이로즈', '하이파이 로즈', '로즈'] },
  { name: 'HIFIMAN', aliases: ['하이파이맨', 'Hifiman'] },
  { name: 'HK Audio', aliases: ['HK 오디오', '에이치케이 오디오'] },
  { name: 'Hsu Research', aliases: ['수 리서치', 'HSU'] },
  { name: 'iBasso', aliases: ['아이바쏘', '아이바소'] },
  { name: 'iFi audio', aliases: ['아이파이 오디오', '아이파이', 'iFi'] },
  { name: 'Infinity', aliases: ['인피니티'] },
  { name: 'Inkel', aliases: ['인켈'] },
  { name: 'Innuos', aliases: ['이누오스', '이누오스'] },
  { name: 'Inter-M', aliases: ['인터엠'] },
  { name: 'iRiver', aliases: ['아이리버', 'iriver'] },
  { name: 'IsoTek', aliases: ['아이소텍'] },
  { name: 'Jadis', aliases: ['자디스'] },
  { name: 'Jamo', aliases: ['야모', '자모'] },
  { name: 'JBL', aliases: ['제이비엘'] },
  { name: 'JDS Labs', aliases: ['JDS 랩스', '제이디에스 랩스'] },
  { name: 'Jeff Rowland', aliases: ['제프롤랜드', '제프 롤랜드'] },
  { name: 'JH Audio', aliases: ['제이에이치 오디오'] },
  { name: 'JL Audio', aliases: ['제이엘 오디오'] },
  { name: 'JLab', aliases: ['제이랩'] },
  { name: 'Joseph Audio', aliases: ['조셉 오디오'] },
  { name: 'JVC', aliases: ['제이브이씨', '빅터'] },
  { name: 'Kali Audio', aliases: ['칼리 오디오'] },
  { name: 'Kanto', aliases: ['칸토'] },
  { name: 'KEF', aliases: ['케프'] },
  { name: 'Kenwood', aliases: ['켄우드', '트리오'] },
  { name: 'Kimber Kable', aliases: ['킴버 케이블', 'Kimber'] },
  { name: 'Kinera', aliases: ['키네라'] },
  { name: 'Klein + Hummel', aliases: ['클라인앤험멜', '클라인 험멜'] },
  { name: 'KLH', aliases: ['케이엘에이치'] },
  { name: 'Klipsch', aliases: ['클립쉬'] },
  { name: 'Koetsu', aliases: ['고에츠', '코에츠'] },
  { name: 'Kondo', aliases: ['콘도'] },
  { name: 'KR Audio', aliases: ['케이알 오디오'] },
  { name: 'Krell', aliases: ['크렐'] },
  { name: 'Krix', aliases: ['크릭스'] },
  { name: 'KRK', aliases: ['케이알케이'] },
  { name: 'Kudos Audio', aliases: ['쿠도스 오디오', 'Kudos'] },
  { name: 'Kuzma', aliases: ['쿠즈마'] },
  { name: 'Lab Gruppen', aliases: ['랩그루펜'] },
  { name: 'Lafayette', aliases: ['라파예트'] },
  { name: 'Leak', aliases: ['리크'] },
  { name: 'Leben', aliases: ['레벤'] },
  { name: 'Letshuoer', aliases: ['렛슈어'] },
  { name: 'Lexicon', aliases: ['렉시콘'] },
  { name: 'Line Magnetic', aliases: ['라인마그네틱', '라인 마그네틱'] },
  { name: 'Linn', aliases: ['린'] },
  { name: 'Lotoo', aliases: ['로투'] },
  { name: 'Lumin', aliases: ['루민'] },
  { name: 'Luxman', aliases: ['럭스만', '럭스맨'] },
  { name: 'Lyngdorf', aliases: ['링돌프'] },
  { name: 'Lyra', aliases: ['라이라'] },
  { name: 'Mackie', aliases: ['맥키'] },
  { name: 'Magico', aliases: ['매지코'] },
  { name: 'Magnat', aliases: ['마그낫'] },
  { name: 'Magnepan', aliases: ['매그니팬', '마그네판'] },
  { name: 'M&K Sound', aliases: ['M&K 사운드', '엠앤케이', 'Miller & Kreisel'] },
  { name: 'Manger', aliases: ['망거'] },
  { name: 'Manley', aliases: ['맨리'] },
  { name: 'Marantz', aliases: ['마란츠'] },
  { name: 'Mark Levinson', aliases: ['마크레빈슨', '마크 레빈슨'] },
  { name: 'MartinLogan', aliases: ['마틴로건'] },
  { name: 'Master & Dynamic', aliases: ['마스터앤다이나믹'] },
  { name: 'Matrix Audio', aliases: ['매트릭스 오디오'] },
  { name: 'MBL', aliases: ['엠비엘'] },
  { name: 'McIntosh', aliases: ['맥킨토시', '매킨토시'] },
  { name: 'Meier Audio', aliases: ['마이어 오디오'] },
  { name: 'Merging Technologies', aliases: ['머징 테크놀로지스', 'Merging'] },
  { name: 'Meridian', aliases: ['메리디안'] },
  { name: 'Meyer Sound', aliases: ['마이어 사운드'] },
  { name: 'Meze Audio', aliases: ['메제 오디오', '메제', 'Meze'] },
  { name: 'Michell Engineering', aliases: ['미첼 엔지니어링', '미첼', 'Michell'] },
  { name: 'Micro Seiki', aliases: ['마이크로 세이키'] },
  { name: 'Midas', aliases: ['마이다스'] },
  { name: 'MIPRO', aliases: ['마이프로'] },
  { name: 'Mission', aliases: ['미션'] },
  { name: 'Mitchell & Johnson', aliases: ['미첼앤존슨'] },
  { name: 'MoFi Electronics', aliases: ['모파이', '모바일 피델리티', 'MoFi'] },
  { name: 'Mogami', aliases: ['모가미'] },
  { name: 'Mola Mola', aliases: ['몰라몰라'] },
  { name: 'Monitor Audio', aliases: ['모니터오디오'] },
  { name: 'Moon', aliases: ['문', '심오디오 문', 'Simaudio Moon'] },
  { name: 'Moondrop', aliases: ['문드롭'] },
  { name: 'MOTU', aliases: ['모투'] },
  { name: 'Musical Fidelity', aliases: ['뮤지컬 피델리티'] },
  { name: 'My Sonic Lab', aliases: ['마이소닉랩'] },
  { name: 'NAD', aliases: ['나드', '엔에이디'] },
  { name: 'Nagaoka', aliases: ['나가오카'] },
  { name: 'Nagra', aliases: ['나그라'] },
  { name: 'Naim', aliases: ['네임', '나임'] },
  { name: 'Nakamichi', aliases: ['나카미치'] },
  { name: 'Neat Acoustics', aliases: ['니트 어쿠스틱스', 'Neat'] },
  { name: 'Neumann', aliases: ['노이만'] },
  { name: 'Noble Audio', aliases: ['노블 오디오', 'Noble'] },
  { name: 'Nordost', aliases: ['노도스트', '노르도스트'] },
  { name: 'Nottingham Analogue', aliases: ['노팅엄 아날로그'] },
  { name: 'NuForce', aliases: ['누포스'] },
  { name: 'NuPrime', aliases: ['누프라임'] },
  { name: 'Octave', aliases: ['옥타브'] },
  { name: 'Onix', aliases: ['오닉스'] },
  { name: 'Onkyo', aliases: ['온쿄'] },
  { name: 'Oppo', aliases: ['오포'] },
  { name: 'Optonica', aliases: ['옵토니카'] },
  { name: 'Oracle Audio', aliases: ['오라클 오디오', 'Oracle'] },
  { name: 'Oriolus', aliases: ['오리올루스'] },
  { name: 'Ortofon', aliases: ['오토폰'] },
  { name: 'Oyaide', aliases: ['오야이데'] },
  { name: 'Parasound', aliases: ['파라사운드'] },
  { name: 'Pass Labs', aliases: ['패스랩스', '패스 랩스'] },
  { name: 'Perlisten', aliases: ['펄리스튼'] },
  { name: 'Perreaux', aliases: ['페로', '페로우'] },
  { name: 'Phase Tech', aliases: ['페이즈텍'] },
  { name: 'Phasemation', aliases: ['페이즈메이션'] },
  { name: 'Philips', aliases: ['필립스'] },
  { name: 'Piega', aliases: ['피에가'] },
  { name: 'Pioneer', aliases: ['파이오니어'] },
  { name: 'PMC', aliases: ['피엠씨'] },
  { name: 'Polk Audio', aliases: ['폴크오디오', '폴크', 'Polk'] },
  { name: 'Precision Fidelity', aliases: ['프리시전 피델리티'] },
  { name: 'PreSonus', aliases: ['프리소너스'] },
  { name: 'PrimaLuna', aliases: ['프리마루나'] },
  { name: 'Primare', aliases: ['프라이메어', '프리메어'] },
  { name: 'Pro-Ject', aliases: ['프로젝트'] },
  { name: 'ProAc', aliases: ['프로악'] },
  { name: 'PS Audio', aliases: ['피에스오디오'] },
  { name: 'PSB', aliases: ['피에스비'] },
  { name: 'PSI Audio', aliases: ['피에스아이 오디오'] },
  { name: 'Pultec', aliases: ['풀텍'] },
  { name: 'Q Acoustics', aliases: ['큐 어쿠스틱스'] },
  { name: 'qdc', aliases: ['큐디씨'] },
  { name: 'QED', aliases: ['큐이디'] },
  { name: 'QSC', aliases: ['큐에스씨'] },
  { name: 'Quad', aliases: ['쿼드'] },
  { name: 'Questyle', aliases: ['퀘스타일'] },
  { name: 'Raidho', aliases: ['라이도'] },
  { name: 'Rane', aliases: ['레인'] },
  { name: 'RCA', aliases: ['알씨에이'] },
  { name: 'RCF', aliases: ['알씨에프'] },
  { name: 'Rega', aliases: ['레가'] },
  { name: 'REL', aliases: ['렐'] },
  { name: 'Revel', aliases: ['레벨'] },
  { name: 'ReVox', aliases: ['리복스', '레복스'] },
  { name: 'RHA', aliases: ['알에이치에이'] },
  { name: 'RME', aliases: ['알엠이'] },
  { name: 'Rode', aliases: ['로데', '로드', 'RØDE'] },
  { name: 'Rogers', aliases: ['로저스'] },
  { name: 'Rogue Audio', aliases: ['로그 오디오', 'Rogue'] },
  { name: 'Roksan', aliases: ['록산'] },
  { name: 'Rotel', aliases: ['로텔'] },
  { name: 'Ruark Audio', aliases: ['루악 오디오', 'Ruark'] },
  { name: 'Rupert Neve Designs', aliases: ['루퍼트 니브 디자인', '루퍼트 니브', 'RND'] },
  { name: 'SAE', aliases: ['에스에이이'] },
  { name: 'Samick', aliases: ['삼익'] },
  { name: 'Sansui', aliases: ['산수이'] },
  { name: 'Scansonic HD', aliases: ['스캔소닉'] },
  { name: 'Schiit', aliases: ['스키트'] },
  { name: 'Sennheiser', aliases: ['젠하이저', '센하이저'] },
  { name: 'Shanling', aliases: ['샨링'] },
  { name: 'Sharp', aliases: ['샤프'] },
  { name: 'Shelter', aliases: ['쉘터'] },
  { name: 'Sherwood', aliases: ['셔우드'] },
  { name: 'Shindo', aliases: ['신도'] },
  { name: 'Shure', aliases: ['슈어'] },
  { name: 'Silbatone Acoustics', aliases: ['실바톤', '실바톤 어쿠스틱스', 'Silbatone'] },
  { name: 'Siltech', aliases: ['실텍'] },
  { name: 'Simaudio', aliases: ['심오디오', '시마오디오'] },
  { name: 'SME', aliases: ['에스엠이'] },
  { name: 'SMSL', aliases: ['에스엠에스엘'] },
  { name: 'Snell Acoustics', aliases: ['스넬', '스넬 어쿠스틱스', 'Snell'] },
  { name: 'Softears', aliases: ['소프트이어스'] },
  { name: 'Sonos', aliases: ['소노스'] },
  { name: 'Sonus Faber', aliases: ['소너스 파베르', '소누스 파베르'] },
  { name: 'Sony', aliases: ['소니'] },
  { name: 'SOtM', aliases: ['솜', '소튬'] },
  { name: 'Soulnote', aliases: ['소울노트'] },
  { name: 'Soulution', aliases: ['솔루션'] },
  { name: 'Soundcraft', aliases: ['사운드크래프트'] },
  { name: 'SPEC', aliases: ['스펙'] },
  { name: 'Spendor', aliases: ['스펜더'] },
  { name: 'SPL', aliases: ['에스피엘'] },
  { name: 'SSL', aliases: ['에스에스엘', 'Solid State Logic'] },
  { name: 'Stax', aliases: ['스탁스', '스타ックス'] },
  { name: 'Stello', aliases: ['스텔로'] },
  { name: 'Studer', aliases: ['스튜더'] },
  { name: 'Sugden', aliases: ['서그덴'] },
  { name: 'Sumiko', aliases: ['스미코'] },
  { name: 'Sunfire', aliases: ['선파이어'] },
  { name: 'SVS', aliases: ['에스브이에스'] },
  { name: 'TAD', aliases: ['티에이디'] },
  { name: 'Taiko Audio', aliases: ['타이코 오디오', 'Taiko'] },
  { name: 'Tannoy', aliases: ['탄노이'] },
  { name: 'Tascam', aliases: ['타스캠'] },
  { name: 'TEAC', aliases: ['티악'] },
  { name: 'TechDAS', aliases: ['테크다스'] },
  { name: 'Technics', aliases: ['테크닉스'] },
  { name: 'Thorens', aliases: ['토렌스'] },
  { name: 'Thrax', aliases: ['쓰랙스', '스랙스'] },
  { name: 'Tin HiFi', aliases: ['틴하이파이'] },
  { name: 'Tivoli Audio', aliases: ['티볼리 오디오', 'Tivoli'] },
  { name: 'Topping', aliases: ['토핑'] },
  { name: 'Totem Acoustic', aliases: ['토템', '토템 어쿠스틱', 'Totem'] },
  { name: 'T+A', aliases: ['티플러스에이', '티앤에이'] },
  { name: 'Trafomatic', aliases: ['트라포매틱'] },
  { name: 'Transparent', aliases: ['트랜스페어런트'] },
  { name: 'Triangle', aliases: ['트라이앵글'] },
  { name: 'Trigon', aliases: ['트리곤'] },
  { name: 'Trinnov', aliases: ['트리노프'] },
  { name: 'Truthear', aliases: ['트루스이어', '트루디어'] },
  { name: 'Turbosound', aliases: ['터보사운드'] },
  { name: 'Ultrasone', aliases: ['울트라손'] },
  { name: 'Unique Melody', aliases: ['유니크멜로디'] },
  { name: 'Unison Research', aliases: ['유니슨 리서치'] },
  { name: 'Universal Audio', aliases: ['유니버설 오디오', 'UA'] },
  { name: 'Usher', aliases: ['어셔'] },
  { name: 'VAC', aliases: ['브이에이씨'] },
  { name: 'Van den Hul', aliases: ['반덴헐'] },
  { name: 'Vandersteen', aliases: ['밴더스틴'] },
  { name: 'Verity Audio', aliases: ['베리티 오디오', 'Verity'] },
  { name: 'Vienna Acoustics', aliases: ['비엔나 어쿠스틱스'] },
  { name: 'Vincent', aliases: ['빈센트'] },
  { name: 'Violectric', aliases: ['바이오렉트릭'] },
  { name: 'Vision Ears', aliases: ['비전이어스'] },
  { name: 'Vitus Audio', aliases: ['비투스 오디오', 'Vitus'] },
  { name: 'Vivid Audio', aliases: ['비비드 오디오', 'Vivid'] },
  { name: 'VPI', aliases: ['브이피아이'] },
  { name: 'VTL', aliases: ['브이티엘'] },
  { name: 'Wadia', aliases: ['와디아'] },
  { name: 'Waversa Systems', aliases: ['웨이버사', '웨이버사 시스템즈', 'Waversa'] },
  { name: 'Weiss', aliases: ['바이스'] },
  { name: 'Western Electric', aliases: ['웨스턴 일렉트릭', 'WE'] },
  { name: 'Westlake Audio', aliases: ['웨스트레이크 오디오', 'Westlake'] },
  { name: 'Westone', aliases: ['웨스톤'] },
  { name: 'Wharfedale', aliases: ['와피데일', '워피데일'] },
  { name: 'WiiM', aliases: ['윔', 'Wiim'] },
  { name: 'Wilson Audio', aliases: ['윌슨오디오', '윌슨 오디오', 'Wilson'] },
  { name: 'Wireworld', aliases: ['와이어월드'] },
  { name: 'Wolf von Langa', aliases: ['볼프 폰 랑가'] },
  { name: 'Xavian', aliases: ['자비안'] },
  { name: 'xDuoo', aliases: ['엑스듀오'] },
  { name: 'Yamaha', aliases: ['야마하'] },
  { name: 'YBA', aliases: ['와이비에이'] },
  { name: 'Zanden', aliases: ['잔덴'] },
  { name: 'ZMF', aliases: ['제트엠에프'] },
  { name: 'ZYX', aliases: ['지와이엑스'] },
];

// 브랜드 이름만 뽑아 정렬한 목록 (자동완성/목록용).
// 정렬 규칙: 알파벳(A-Z)을 먼저, 숫자로 시작하는 이름(64 Audio, 7Hz 등)은 맨 뒤로.
//   - localeCompare: 문자열을 사전 순으로 비교해주는 표준 함수
export const ALL_BRAND_NAMES = BRAND_DIRECTORY.map((b) => b.name).sort((a, b) => {
  const aDigit = /^[0-9]/.test(a);   // a가 숫자로 시작하는가?
  const bDigit = /^[0-9]/.test(b);   // b가 숫자로 시작하는가?
  if (aDigit !== bDigit) return aDigit ? 1 : -1;  // 숫자 시작이면 뒤로 보냄
  return a.localeCompare(b);         // 둘 다 같은 종류면 사전 순
});

// 위쪽 normalize와 같은 함수(파일 내 다른 위치에서 쓰려고 한 번 더 선언).
const _normalize = (s: string) => s.replace(/[\s&\-/]+/g, '').toLowerCase();

// 브랜드 사전에서 검색어와 맞는 브랜드를 최대 limit개 반환 (브랜드 자동완성용).
// 영문명 또는 한글 별칭 중 하나라도 검색어를 포함하면 결과에 포함.
export function searchBrands(query: string, limit = 10): Brand[] {
  const q = _normalize(query);
  if (!q) return [];
  return BRAND_DIRECTORY.filter((b) => {
    if (_normalize(b.name).includes(q)) return true;          // 영문명 매칭
    return b.aliases.some((a) => _normalize(a).includes(q));  // 별칭 매칭
  }).slice(0, limit);
}

// --- 카테고리 트리 (category.rtf에서 자동 생성) ---
// 앱의 메뉴/필터/URL이 모두 이 구조를 기준으로 동작함. ★가장 중요한 데이터 중 하나★
//   top  = 대분류 (앰프, 스피커, 소스기기, 케이블)
//   subs = 그 대분류에 속한 하위 카테고리 목록
// ⚠️ 여기를 수정하면 메뉴·필터·URL이 함께 바뀌므로 신중하게! (HANDOVER §13 참고)
export const CATEGORY_TREE: { top: string; subs: string[] }[] = [
  { top: '앰프', subs: ['프리앰프', '파워앰프', '인티앰프', '포노 스테이지', '헤드폰 앰프', '네트워크 앰프', '리시버', 'AV 리시버'] },
  { top: '스피커', subs: ['북쉘프 스피커', '플로어 스탠딩 스피커', '톨보이 스피커', '센터 스피커', '사운드바', '서브우퍼'] },
  { top: '소스기기', subs: ['턴테이블', '카세트 데크', '오픈릴 데크', 'CD 플레이어', 'CD 트랜스포트', 'SACD 플레이어', 'DAC', '네트워크 플레이어', '블루투스 리시버', 'FM 튜너', 'AM/FM 튜너', 'LD 플레이어', 'DVD 플레이어', '블루레이 플레이어'] },
  { top: '케이블', subs: ['RCA 케이블', 'XLR 케이블', '스피커 케이블', '파워 케이블', '디지털 동축 케이블', '광 케이블', 'USB 케이블', 'AES/EBU 케이블', 'BNC 케이블', 'HDMI 케이블', '포노 케이블', '점퍼 케이블', '헤드폰 케이블', '이어폰 케이블'] },
];

// 대분류 이름만 모은 목록: ['앰프', '스피커', '소스기기', '케이블']
export const TOP_CATEGORIES = CATEGORY_TREE.map((c) => c.top);
// 모든 하위 카테고리를 하나의 평평한 배열로 합친 목록.
//   flatMap = map(각 항목 변환) + flat(중첩 배열을 한 단계 펼치기)을 합친 것.
export const ALL_SUBCATEGORIES = CATEGORY_TREE.flatMap((c) => c.subs);

// 헬퍼 함수: 특정 대분류(top)에 속한 하위 카테고리 목록을 반환. 없으면 빈 배열.
//   find(...) = 조건에 맞는 첫 항목을 찾음 (없으면 undefined)
//   ?.subs    = 찾은 게 있으면 subs를 꺼냄 (없으면 undefined) — '옵셔널 체이닝'
//   ?? []     = 앞이 undefined면 빈 배열로 대체 — '널 병합'
export function subcategoriesFor(top: string): string[] {
  return CATEGORY_TREE.find((c) => c.top === top)?.subs ?? [];
}
