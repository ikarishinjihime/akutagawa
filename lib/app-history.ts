import { archiveSubSections, sections, type ArchiveSubSectionId, type SectionId } from "@/constants/home";
import type { AppHistoryState, CharacterDetailTab } from "@/types/home.types";

export const APP_HISTORY_VERSION = 1 as const;

const VALID_SECTIONS = new Set<SectionId>(sections.map((entry) => entry.id));
const VALID_ARCHIVE_SUBS = new Set<ArchiveSubSectionId>(archiveSubSections.map((entry) => entry.id));
const VALID_TABS = new Set<CharacterDetailTab>(["settings", "images", "works", "worlds"]);

const DEFAULT_ARCHIVE_SUB: ArchiveSubSectionId = "characters";
const DEFAULT_TAB: CharacterDetailTab = "settings";

/**
 * 현재 화면 상태를 브라우저 history state로 직렬화합니다.
 */
export const createAppHistoryState = (
  params: Partial<AppHistoryState> & Pick<AppHistoryState, "section">,
): AppHistoryState => ({
  v: APP_HISTORY_VERSION,
  section: params.section,
  archiveSub: params.archiveSub ?? DEFAULT_ARCHIVE_SUB,
  characterId: params.characterId ?? "",
  subPageId: params.subPageId ?? "",
  tab: params.tab ?? DEFAULT_TAB,
  worldId: params.worldId ?? "",
  characterWorldId: params.characterWorldId ?? "",
});

/**
 * history.state 또는 URL 쿼리에서 앱 내비게이션 상태를 복원합니다.
 */
export const parseAppHistoryState = (value: unknown): AppHistoryState | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Partial<AppHistoryState>;
  if (raw.v !== APP_HISTORY_VERSION || !raw.section || !VALID_SECTIONS.has(raw.section)) {
    return null;
  }

  const archiveSub =
    raw.archiveSub && VALID_ARCHIVE_SUBS.has(raw.archiveSub) ? raw.archiveSub : DEFAULT_ARCHIVE_SUB;
  const tab = raw.tab && VALID_TABS.has(raw.tab) ? raw.tab : DEFAULT_TAB;

  return createAppHistoryState({
    section: raw.section,
    archiveSub,
    characterId: typeof raw.characterId === "string" ? raw.characterId : "",
    subPageId: typeof raw.subPageId === "string" ? raw.subPageId : "",
    tab,
    worldId: typeof raw.worldId === "string" ? raw.worldId : "",
    characterWorldId: typeof raw.characterWorldId === "string" ? raw.characterWorldId : "",
  });
};

export const appHistoryStatesEqual = (left: AppHistoryState, right: AppHistoryState) =>
  left.section === right.section &&
  left.archiveSub === right.archiveSub &&
  left.characterId === right.characterId &&
  left.subPageId === right.subPageId &&
  left.tab === right.tab &&
  left.worldId === right.worldId &&
  left.characterWorldId === right.characterWorldId;

/**
 * 공유·새로고침용 URL 쿼리를 생성합니다.
 */
export const buildAppHistoryUrl = (state: AppHistoryState, pathname = "/") => {
  const params = new URLSearchParams();

  if (state.section !== "home") {
    params.set("s", state.section);
  }

  if (state.section === "archive" && state.archiveSub !== DEFAULT_ARCHIVE_SUB) {
    params.set("a", state.archiveSub);
  }

  if (state.characterId) {
    params.set("c", state.characterId);
  }

  if (state.subPageId) {
    params.set("sp", state.subPageId);
  }

  if (state.tab !== DEFAULT_TAB) {
    params.set("t", state.tab);
  }

  if (state.section === "worlds" && state.worldId) {
    params.set("w", state.worldId);
  }

  if (state.characterWorldId) {
    params.set("cw", state.characterWorldId);
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
};

/**
 * 최초 진입 시 URL 쿼리로부터 내비게이션 상태를 읽습니다.
 */
export const readAppHistoryStateFromUrl = (search: string): AppHistoryState | null => {
  const params = new URLSearchParams(search);
  const section = params.get("s");

  if (!section || !VALID_SECTIONS.has(section as SectionId)) {
    return null;
  }

  const archiveSubParam = params.get("a");
  const archiveSub =
    archiveSubParam && VALID_ARCHIVE_SUBS.has(archiveSubParam as ArchiveSubSectionId)
      ? (archiveSubParam as ArchiveSubSectionId)
      : DEFAULT_ARCHIVE_SUB;

  const tabParam = params.get("t");
  const tab =
    tabParam && VALID_TABS.has(tabParam as CharacterDetailTab)
      ? (tabParam as CharacterDetailTab)
      : DEFAULT_TAB;

  return createAppHistoryState({
    section: section as SectionId,
    archiveSub,
    characterId: params.get("c") ?? "",
    subPageId: params.get("sp") ?? "",
    tab,
    worldId: params.get("w") ?? "",
    characterWorldId: params.get("cw") ?? "",
  });
};
