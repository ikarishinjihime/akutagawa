import type { Character, SettingSection, UploadedImage, Work } from "@/lib/types";
import type { ArchiveSubSectionId, SectionId } from "@/constants/home";

/**
 * 공개 페이지(홈)에서 사용하는 이미지 갤러리 모달 상태입니다.
 */
export type GalleryModalItem = {
  image: UploadedImage;
  character: Character;
};

/**
 * 스탠딩 표정 모음 모달 상태입니다.
 */
export type ExpressionModalItem = {
  character: Character;
  images: UploadedImage[];
};

/**
 * 스토리 창(레코드 박스 서사) 모달 상태입니다.
 */
export type StoryModalItem = {
  character: Character;
  section: SettingSection;
};

/**
 * 이북 리더 모달 상태입니다.
 */
export type ReaderModalItem = {
  character: Character;
  work: Work;
};

/**
 * 자캐 상세 뷰의 탭 식별자입니다.
 */
export type CharacterDetailTab = "settings" | "images" | "works" | "worlds";

/** 브라우저 history / URL과 동기화되는 SPA 화면 상태 */
export type AppHistoryState = {
  v: 1;
  section: SectionId;
  archiveSub: ArchiveSubSectionId;
  characterId: string;
  subPageId: string;
  tab: CharacterDetailTab;
  worldId: string;
  characterWorldId: string;
};

/** @deprecated AppHistoryState를 사용합니다. */
export type DetailNavSnapshot = {
  section: "archive";
  archiveSub: ArchiveSubSectionId;
  characterId: string;
  subPageId: string;
  tab: CharacterDetailTab;
};
