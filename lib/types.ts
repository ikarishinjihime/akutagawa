export type UploadedImage = {
  id: string;
  category?: "illustration" | "standing";
  name: string;
  url: string;
  size: number;
  thumbX?: number;
  thumbY?: number;
  thumbScale?: number;
};

export type Work = {
  title: string;
  kind: string;
  date: string;
  body: string;
  images?: UploadedImage[];
};

export type World = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  password?: string;
  textGlitch?: Record<string, FieldGlitchConfig>;
};

export type CharacterWorldEntry = {
  worldId: string;
  settings: string[];
  images: UploadedImage[];
  works: Work[];
};

export type SettingSectionKind = "record" | "story";

export type SettingSection = {
  id: string;
  title: string;
  body: string;
  /** record: Record Box에 전체 표시 · story: 미리보기 + 스토리 창 */
  kind?: SettingSectionKind;
  /** story일 때 Record Box에 보일 짧은 소개 (비우면 본문에서 자동 생성) */
  excerpt?: string;
};

/** 상세 카드 상단 메타 (상태·분류 등 사용자 정의 라벨) */
export type CaseMetaField = {
  id: string;
  label: string;
  body: string;
};

export type RelationshipEntry = {
  id: string;
  /** 관계 대상 이름 */
  name: string;
  /** 관계 유형 (형제, 라이벌, 연인 등) */
  label: string;
  /** 관계 설명 */
  body: string;
  /** 연결된 캐릭터 ID (클릭 시 해당 상세로 이동) */
  linkedCharacterId?: string;
  /** 연결된 상세 페이지 ID (`linkedCharacterId`가 있으면 그 캐릭터의 하위 페이지, 없으면 현재 캐릭터의 하위 페이지) */
  linkedSubPageId?: string;
};

export type SubPageSourceRef = {
  characterId: string;
  subPageId: string;
};

export type GlitchMarkdown = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
};

export type GlitchZoneStyle = {
  textColor?: string;
  markdown?: GlitchMarkdown;
  /** 스토리 $...$ 인용 강조 (편집기·본문 공통) */
  storyQuote?: boolean;
  /** 밑줄 색 (markdown.underline 켜진 경우) */
  underlineColor?: string;
  /** 밑줄 굵기 px (0.5~12, 0.5 단위, 기본 2) */
  underlineThickness?: number;
  /** 취소선 색 (markdown.strikethrough 켜진 경우) */
  strikethroughColor?: string;
  /** 취소선 굵기 px (0.5~12, 0.5 단위, 기본 2) */
  strikethroughThickness?: number;
  /** 글씨 크기 (%). 비우면 주변 글자 크기를 따릅니다. */
  fontSize?: number;
  /** 구간별 폰트 프리셋 (constants/glitch-font-presets.ts) */
  fontPreset?: string;
};

export type GlitchScrambleMode = "referenceOnly" | "referenceWithBuiltin";

export type GlitchErrorDisplayMode = "alternate" | "randomOnly";

export type GlitchErrorMessageSource = "auto" | "custom" | "none";

export type GlitchZone = {
  id: string;
  start: number;
  end: number;
  original: string;
  style?: GlitchZoneStyle;
  errorMessage?: string;
  errorMessageSource?: GlitchErrorMessageSource;
  /** 구간별 참조 단어 (한 줄에 하나) */
  wordPool?: string;
  scrambleMode?: GlitchScrambleMode;
  builtinScramble?: boolean;
  builtinTokens?: string[];
  errorDisplayMode?: GlitchErrorDisplayMode;
  tickMs?: number;
  /** 클릭 시 이동할 대상 (OC·페어·어나더 항목 또는 그 상세 페이지) */
  linkTarget?: ZoneLinkTarget;
  /** @deprecated linkTarget 사용. 예전 데이터 호환용 */
  linkSubPageId?: string;
};

/** OC / Pair / Another 섹션 간 이동 대상 */
export type ZoneLinkTarget = {
  section: "characters" | "pairs" | "others";
  characterId: string;
  /** 비어 있으면 해당 항목 본 페이지 */
  subPageId?: string;
};

export type CharacterKind = "oc" | "pair" | "other";

export type ProfileField = {
  id: string;
  label: string;
  value: string;
};

/** 상세 페이지 한 줄 소개·한마디 박스 색 (비우면 기본값) */
export type CaseFileDetailTheme = {
  introLabel?: string;
  introText?: string;
  introBackground?: string;
  introBorder?: string;
  voiceLabel?: string;
  voiceText?: string;
  voiceBackground?: string;
  voiceBorder?: string;
};

export type CharacterSubPage = {
  id: string;
  /** 다른 캐릭터의 공용 상세 페이지를 가리킬 때 */
  sharedFrom?: SubPageSourceRef;
  /** true면 다른 캐릭터가 이 상세 페이지를 불러올 수 있음 */
  isShared?: boolean;
  /** 상세 페이지 카드/히어로에 쓰일 표시 ID */
  displayId?: string;
  /** 대상 종류 (직접 입력 · 예: 서브캐릭터, 물건, 능력, 장소) */
  entryKind?: string;
  title: string;
  /** 한자 이름 */
  kanjiName?: string;
  subtitle: string;
  quote: string;
  metaFields?: CaseMetaField[];
  /** @deprecated metaFields 사용 */
  statusTags?: string[];
  /** @deprecated metaFields 사용 */
  classification?: string;
  palette: string;
  detailTheme?: CaseFileDetailTheme;
  profileFields: ProfileField[];
  settingSections?: SettingSection[];
  relationships?: string[];
  relationshipEntries?: RelationshipEntry[];
  images?: UploadedImage[];
  works?: Work[];
  textGlitch?: Record<string, FieldGlitchConfig>;
  bgmUrl?: string;
};

export type FieldGlitchConfig = {
  wordPool: string;
  scrambleMode?: GlitchScrambleMode;
  builtinScramble?: boolean;
  /** alternate: 원문 ↔ 오류 번갈아 · randomOnly: 오류만 계속 랜덤 */
  errorDisplayMode?: GlitchErrorDisplayMode;
  /** 비어 있으면 전체 기본 기호 풀 사용 */
  builtinTokens?: string[];
  zones: GlitchZone[];
  tickMs?: number;
  defaultStyle?: GlitchZoneStyle;
};

export type Character = {
  id: string;
  kind?: CharacterKind;
  name: string;
  kanjiName?: string;
  metaFields?: CaseMetaField[];
  /** @deprecated metaFields 사용 */
  statusTags?: string[];
  /** @deprecated metaFields 사용 */
  classification?: string;
  subtitle: string;
  quote: string;
  palette: string;
  detailTheme?: CaseFileDetailTheme;
  profileFields: ProfileField[];
  settings: string[];
  settingSections?: SettingSection[];
  relationships: string[];
  relationshipEntries?: RelationshipEntry[];
  images?: UploadedImage[];
  works: Work[];
  worldEntries?: CharacterWorldEntry[];
  textGlitch?: Record<string, FieldGlitchConfig>;
  subPages?: CharacterSubPage[];
  /** kind가 pair일 때 연결된 OC 캐릭터 ID (최대 2명) */
  pairMemberIds?: string[];
  /** 캐릭터 상세 보기에서 재생할 BGM (`/audio/...`) */
  bgmUrl?: string;
  /** 관리자에서 편집하는 기밀 열람 플래그 */
  confidential?: boolean;
  /** 관리자에서 편집하는 문서 열람등급 (S/A/B/C) — lib/clearance.ts 참고 */
  clearance?: string;
};

export type HomeContent = {
  eyebrow: string;
  title: string;
  body: string;
  /** 관리자에서 편집하는 홈 공지/메모 */
  notice?: string;
};

/** 갠홈(extract) 섹션에 표시할 클릭 가능한 배너 */
export type PersonalHomeBanner = {
  id: string;
  label: string;
  linkUrl: string;
  image: UploadedImage;
};

export type ExtractContent = {
  banners: PersonalHomeBanner[];
};

export type BgmTrackScope = "site" | "character-only";

export type BgmTrack = {
  id: string;
  label: string;
  url: string;
  scope: BgmTrackScope;
};

export type BgmContent = {
  tracks: BgmTrack[];
};

export type DiaryEntry = {
  id: string;
  title: string;
  date: string;
  body: string;
};

export type GuestbookEntry = {
  id: string;
  name: string;
  body: string;
  reply: string;
  createdAtMillis: number;
};
