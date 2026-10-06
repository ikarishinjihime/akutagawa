import type { Character, ExtractContent, HomeContent } from "@/lib/types";
import { createDefaultProfileFields } from "@/lib/profile-fields";

/**
 * Firestore의 site/home 문서가 비어 있을 때 사용할 기본 문구입니다.
 */
export const defaultHomeContent: HomeContent = {
  eyebrow: "",
  title: "",
  body: "",
};

/**
 * Firestore의 site/archive 문서가 비어 있을 때 사용할 기본 문구입니다.
 */
export const defaultArchiveContent: HomeContent = {
  eyebrow: "",
  title: "",
  body: "",
};

/**
 * Archive 하위 메뉴 (OC · Pair · Another).
 */
export const archiveSubSections = [
  { id: "characters", label: "OC" },
  { id: "pairs", label: "Pair" },
  { id: "others", label: "Another" },
] as const;

export type ArchiveSubSectionId = (typeof archiveSubSections)[number]["id"];

/**
 * 왼쪽 메뉴에 표시할 섹션 목록입니다.
 */
export const sections = [
  { id: "home", label: "Home" },
  { id: "archive", label: "Archive" },
  { id: "worlds", label: "World" },
  { id: "diary", label: "Diary" },
  { id: "guest", label: "Guest" },
  { id: "extract", label: "BANNER" },
] as const;

export type SectionId = (typeof sections)[number]["id"];

/**
 * Firestore의 site/extract 문서가 비어 있을 때 사용할 기본값입니다.
 */
export const defaultExtractContent: ExtractContent = {
  banners: [],
};

/**
 * 자캐 데이터가 아직 없을 때 화면을 비우지 않기 위한 기본 자캐 값입니다.
 */
export const emptyCharacter: Character = {
  id: "",
  name: "자캐 없음",
  subtitle: "관리자 로그인 후 OC에서 자캐를 추가해주세요.",
  quote: "아직 등록된 자캐가 없어요.",
  palette: "from-zinc-700 via-zinc-950 to-black",
  profileFields: createDefaultProfileFields(),
  settings: [],
  settingSections: [],
  relationships: [],
  images: [],
  works: [],
  worldEntries: [],
};
