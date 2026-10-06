import { normalizeCharacterPaletteInput } from "@/lib/character-palette";
import type { Character, CharacterSubPage } from "@/lib/types";
import type { FieldGlitchConfig, GlitchZone } from "@/lib/types";
import type { CharacterDraft } from "@/lib/character-draft";
import {
  getMetaFieldBody,
  metaFieldGlitchPath,
  parseMetaFieldGlitchPath,
  setMetaFieldBody,
} from "@/lib/meta-fields";
import { normalizeFieldGlitchConfig } from "@/lib/normalize-text-glitch";
import {
  getProfileFieldLabel,
  getProfileFieldValue,
  parseProfileFieldGlitchPath,
  profileFieldGlitchPath,
  setProfileFieldValue,
} from "@/lib/profile-fields";
import {
  getRelationshipEntryFieldValue,
  parseRelationshipEntryGlitchPath,
  relationshipEntriesToLegacyLines,
  relationshipEntryGlitchPath,
  relationshipEntryLabelGlitchPath,
  relationshipEntryNameGlitchPath,
  setRelationshipEntryFieldValue,
} from "@/lib/relationship-entries";
import { isValidFieldGlitchConfig } from "@/lib/glitch-style";
import { sanitizePlainText } from "@/lib/glitch-display";
import { normalizeStorySource, parseStoryMarkupSourceRanges } from "@/lib/story-text";

export const GLITCH_FIELD_LABELS: Record<string, string> = {
  name: "이름",
  kanjiName: "한자 이름",
  subtitle: "한 줄 소개",
  quote: "대표 대사",
};

const SUB_PAGE_GLITCH_FIELD_PATHS = ["name", "kanjiName", "subtitle", "quote"] as const;

const BASE_GLITCH_FIELD_PATHS = ["name", "kanjiName", "subtitle", "quote"] as const;

export const SUB_PAGE_GLITCH_PREFIX = "subPages.";

export function parseSubPageGlitchPath(
  path: string,
): { subPageId: string; fieldPath: string } | null {
  if (!path.startsWith(SUB_PAGE_GLITCH_PREFIX)) {
    return null;
  }

  const rest = path.slice(SUB_PAGE_GLITCH_PREFIX.length);
  const dotIndex = rest.indexOf(".");

  if (dotIndex === -1) {
    return null;
  }

  const subPageId = rest.slice(0, dotIndex);
  const fieldPath = rest.slice(dotIndex + 1);

  if (!subPageId || !fieldPath) {
    return null;
  }

  return { subPageId, fieldPath };
}

export function subPageFieldGlitchPath(subPageId: string, fieldPath: string) {
  return `${SUB_PAGE_GLITCH_PREFIX}${subPageId}.${fieldPath}`;
}

function findSubPageInDraft(draft: CharacterDraft, subPageId: string) {
  return draft.subPages.find((subPage) => subPage.id === subPageId);
}

function getSubPageFieldValue(subPage: CharacterSubPage, fieldPath: string) {
  if (fieldPath === "name") return subPage.title;
  if (fieldPath === "kanjiName") return subPage.kanjiName ?? "";
  if (fieldPath === "subtitle") return subPage.subtitle;
  if (fieldPath === "quote") return subPage.quote;
  const metaFieldId = parseMetaFieldGlitchPath(fieldPath);
  if (metaFieldId) {
    return getMetaFieldBody(subPage.metaFields ?? [], metaFieldId);
  }
  if (fieldPath === "classification") return subPage.classification ?? "";
  if (fieldPath === "statusTags") return (subPage.statusTags ?? []).join("\n");
  const profileFieldId = parseProfileFieldGlitchPath(fieldPath);
  if (profileFieldId) return getProfileFieldValue(subPage.profileFields, profileFieldId);
  const relationshipEntryPath = parseRelationshipEntryGlitchPath(fieldPath);
  if (relationshipEntryPath) {
    return getRelationshipEntryFieldValue(
      subPage.relationshipEntries ?? [],
      relationshipEntryPath.entryId,
      relationshipEntryPath.field,
    );
  }
  if (fieldPath === "relationships") {
    return relationshipEntriesToLegacyLines(subPage.relationshipEntries ?? []).join("\n");
  }

  if (fieldPath.startsWith("settingSections.")) {
    const sectionPath = parseSettingSectionGlitchPath(fieldPath);
    if (sectionPath) {
      const section = subPage.settingSections?.find((item) => item.id === sectionPath.sectionId);
      if (!section) {
        return "";
      }

      if (sectionPath.field === "excerpt") {
        return section.excerpt ?? "";
      }

      if (sectionPath.field === "title") {
        return section.title;
      }

      return section.body;
    }
  }

  return "";
}

function setSubPageFieldValue(
  subPage: CharacterSubPage,
  fieldPath: string,
  value: string,
): CharacterSubPage {
  if (fieldPath === "name") return { ...subPage, title: value };
  if (fieldPath === "kanjiName") return { ...subPage, kanjiName: value };
  if (fieldPath === "subtitle") return { ...subPage, subtitle: value };
  if (fieldPath === "quote") return { ...subPage, quote: value };
  const metaFieldId = parseMetaFieldGlitchPath(fieldPath);
  if (metaFieldId) {
    return {
      ...subPage,
      metaFields: setMetaFieldBody(subPage.metaFields ?? [], metaFieldId, value),
    };
  }
  if (fieldPath === "classification") return { ...subPage, classification: value };
  if (fieldPath === "statusTags") {
    return {
      ...subPage,
      statusTags: value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    };
  }
  const profileFieldId = parseProfileFieldGlitchPath(fieldPath);
  if (profileFieldId) {
    return {
      ...subPage,
      profileFields: setProfileFieldValue(subPage.profileFields, profileFieldId, value),
    };
  }
  const relationshipEntryPath = parseRelationshipEntryGlitchPath(fieldPath);
  if (relationshipEntryPath) {
    return {
      ...subPage,
      relationshipEntries: setRelationshipEntryFieldValue(
        subPage.relationshipEntries ?? [],
        relationshipEntryPath.entryId,
        relationshipEntryPath.field,
        value,
      ),
    };
  }
  if (fieldPath === "relationships") {
    return subPage;
  }

  if (fieldPath.startsWith("settingSections.")) {
    const sectionPath = parseSettingSectionGlitchPath(fieldPath);
    if (sectionPath) {
      return {
        ...subPage,
        settingSections: (subPage.settingSections ?? []).map((section) => {
          if (section.id !== sectionPath.sectionId) {
            return section;
          }

          if (sectionPath.field === "excerpt") {
            return { ...section, excerpt: value };
          }

          if (sectionPath.field === "title") {
            return { ...section, title: value };
          }

          return { ...section, body: value };
        }),
      };
    }
  }

  return subPage;
}

export function getGlitchFieldLabel(path: string): string {
  const subPagePath = parseSubPageGlitchPath(path);

  if (subPagePath) {
    const innerLabel = getGlitchFieldLabel(subPagePath.fieldPath);
    return `상세 페이지 · ${innerLabel}`;
  }

  if (GLITCH_FIELD_LABELS[path]) {
    return GLITCH_FIELD_LABELS[path];
  }

  const profileFieldId = parseProfileFieldGlitchPath(path);
  if (profileFieldId) {
    return getProfileFieldLabel(profileFieldId, []);
  }

  if (path === "title") {
    return "세계관 이름";
  }

  if (path === "description") {
    return "상세 설명";
  }

  if (path.startsWith("settingSections.")) {
    const sectionPath = parseSettingSectionGlitchPath(path);
    if (sectionPath?.field === "excerpt") {
      return `스토리 소개 (${sectionPath.sectionId})`;
    }

    if (sectionPath?.field === "title") {
      return `레코드 박스 제목 (${sectionPath.sectionId})`;
    }

    return `상세 설정 본문 (${sectionPath?.sectionId ?? path.slice("settingSections.".length)})`;
  }

  const metaFieldId = parseMetaFieldGlitchPath(path);
  if (metaFieldId) {
    return `카드 메타 (${metaFieldId})`;
  }

  const relationshipEntryPath = parseRelationshipEntryGlitchPath(path);
  if (relationshipEntryPath) {
    if (relationshipEntryPath.field === "name") {
      return `관계 이름 (${relationshipEntryPath.entryId})`;
    }

    if (relationshipEntryPath.field === "label") {
      return `관계 유형 (${relationshipEntryPath.entryId})`;
    }

    return `관계 설명 (${relationshipEntryPath.entryId})`;
  }

  if (path.startsWith("works.")) {
    return `연성 본문 (${path.slice("works.".length)})`;
  }

  return path;
}

export function getCharacterDraftFieldValue(draft: CharacterDraft, path: string) {
  const subPagePath = parseSubPageGlitchPath(path);
  if (subPagePath) {
    const subPage = findSubPageInDraft(draft, subPagePath.subPageId);
    return subPage ? getSubPageFieldValue(subPage, subPagePath.fieldPath) : "";
  }

  if (path === "name") return draft.name;
  if (path === "kanjiName") return draft.kanjiName;
  if (path === "subtitle") return draft.subtitle;
  if (path === "quote") return draft.quote;
  const metaFieldId = parseMetaFieldGlitchPath(path);
  if (metaFieldId) return getMetaFieldBody(draft.metaFields, metaFieldId);
  const profileFieldId = parseProfileFieldGlitchPath(path);
  if (profileFieldId) return getProfileFieldValue(draft.profileFields, profileFieldId);
  const relationshipEntryPath = parseRelationshipEntryGlitchPath(path);
  if (relationshipEntryPath) {
    return getRelationshipEntryFieldValue(
      draft.relationshipEntries,
      relationshipEntryPath.entryId,
      relationshipEntryPath.field,
    );
  }
  if (path === "relationships")
    return relationshipEntriesToLegacyLines(draft.relationshipEntries).join("\n");

  if (path.startsWith("settingSections.")) {
    const sectionPath = parseSettingSectionGlitchPath(path);
    if (sectionPath) {
      const section = draft.settingSections.find((item) => item.id === sectionPath.sectionId);
      if (!section) {
        return "";
      }

      if (sectionPath.field === "excerpt") {
        return section.excerpt ?? "";
      }

      if (sectionPath.field === "title") {
        return section.title;
      }

      return section.body;
    }
  }

  return "";
}

export function getCharacterFieldValue(character: Character, path: string) {
  if (path === "name") return character.name;
  if (path === "kanjiName") return character.kanjiName ?? "";
  if (path === "subtitle") return character.subtitle;
  if (path === "quote") return character.quote;
  const metaFieldId = parseMetaFieldGlitchPath(path);
  if (metaFieldId) return getMetaFieldBody(character.metaFields ?? [], metaFieldId);
  if (path === "classification") return character.classification ?? "";
  if (path === "statusTags") return (character.statusTags ?? []).join("\n");
  const profileFieldId = parseProfileFieldGlitchPath(path);
  if (profileFieldId) return getProfileFieldValue(character.profileFields, profileFieldId);
  const relationshipEntryPath = parseRelationshipEntryGlitchPath(path);
  if (relationshipEntryPath) {
    return getRelationshipEntryFieldValue(
      character.relationshipEntries ?? [],
      relationshipEntryPath.entryId,
      relationshipEntryPath.field,
    );
  }
  if (path === "relationships") {
    return (
      relationshipEntriesToLegacyLines(character.relationshipEntries ?? []).join("\n") ||
      character.relationships.join("\n")
    );
  }

  if (path.startsWith("settingSections.")) {
    const sectionPath = parseSettingSectionGlitchPath(path);
    if (sectionPath) {
      const section = character.settingSections?.find((item) => item.id === sectionPath.sectionId);
      if (!section) {
        return "";
      }

      if (sectionPath.field === "excerpt") {
        return section.excerpt ?? "";
      }

      if (sectionPath.field === "title") {
        return section.title;
      }

      return section.body;
    }
  }

  return "";
}

export function setCharacterDraftFieldValue(
  draft: CharacterDraft,
  path: string,
  value: string,
): CharacterDraft {
  const subPagePath = parseSubPageGlitchPath(path);
  if (subPagePath) {
    return {
      ...draft,
      subPages: draft.subPages.map((subPage) =>
        subPage.id === subPagePath.subPageId
          ? setSubPageFieldValue(subPage, subPagePath.fieldPath, value)
          : subPage,
      ),
    };
  }

  if (path === "name") return { ...draft, name: value };
  if (path === "kanjiName") return { ...draft, kanjiName: value };
  if (path === "subtitle") return { ...draft, subtitle: value };
  if (path === "quote") return { ...draft, quote: value };
  const metaFieldId = parseMetaFieldGlitchPath(path);
  if (metaFieldId) {
    return {
      ...draft,
      metaFields: setMetaFieldBody(draft.metaFields, metaFieldId, value),
    };
  }
  const profileFieldId = parseProfileFieldGlitchPath(path);
  if (profileFieldId) {
    return {
      ...draft,
      profileFields: setProfileFieldValue(draft.profileFields, profileFieldId, value),
    };
  }
  const relationshipEntryPath = parseRelationshipEntryGlitchPath(path);
  if (relationshipEntryPath) {
    return {
      ...draft,
      relationshipEntries: setRelationshipEntryFieldValue(
        draft.relationshipEntries,
        relationshipEntryPath.entryId,
        relationshipEntryPath.field,
        value,
      ),
    };
  }
  if (path === "relationships") return draft;

  if (path.startsWith("settingSections.")) {
    const sectionPath = parseSettingSectionGlitchPath(path);
    if (sectionPath) {
      return {
        ...draft,
        settingSections: draft.settingSections.map((section) => {
          if (section.id !== sectionPath.sectionId) {
            return section;
          }

          if (sectionPath.field === "excerpt") {
            return { ...section, excerpt: value };
          }

          if (sectionPath.field === "title") {
            return { ...section, title: value };
          }

          return { ...section, body: value };
        }),
      };
    }
  }

  return draft;
}

export function reanchorZone(text: string, zone: GlitchZone): GlitchZone | null {
  const normalizedText = sanitizePlainText(text);
  const normalizedOriginal = sanitizePlainText(zone.original);

  if (!normalizedOriginal) {
    return null;
  }

  let start = zone.start;
  let end = zone.end;

  if (normalizedText.slice(start, end) === normalizedOriginal) {
    return {
      ...zone,
      start,
      end,
      original: normalizedOriginal,
    };
  }

  const nextIndex = normalizedText.indexOf(normalizedOriginal);
  if (nextIndex === -1) {
    // 0번부터 original 길이만큼 덮던 구간은 필드 값만 바뀐 경우로 보고 설정을 유지합니다.
    if (
      zone.start === 0 &&
      zone.end - zone.start === normalizedOriginal.length &&
      normalizedText.length > 0
    ) {
      return {
        ...zone,
        start: 0,
        end: normalizedText.length,
        original: normalizedText,
      };
    }

    return null;
  }

  start = nextIndex;
  end = nextIndex + normalizedOriginal.length;

  if (start < 0 || end > normalizedText.length || start >= end) {
    return null;
  }

  return {
    ...zone,
    start,
    end,
    original: normalizedOriginal,
  };
}

export function reanchorGlitchConfig(
  text: string,
  config?: FieldGlitchConfig,
): FieldGlitchConfig | undefined {
  if (!config?.zones?.length) {
    return undefined;
  }

  const zones = config.zones
    .map((zone) => reanchorZone(text, zone))
    .filter((zone): zone is GlitchZone => zone !== null);

  if (zones.length === 0) {
    return undefined;
  }

  return normalizeFieldGlitchConfig({
    ...config,
    wordPool: config.wordPool.trim(),
    zones,
  });
}

function mapSegmentSourceOffsetToDisplay(
  segmentSource: string,
  displayText: string,
  offsetInSegment: number,
): number {
  if (segmentSource === displayText) {
    return Math.min(offsetInSegment, displayText.length);
  }

  const ranges = parseStoryMarkupSourceRanges(segmentSource);
  let displayCursor = 0;
  let sourceCursor = 0;

  for (const range of ranges) {
    const rangeSourceLength = range.sourceEnd - range.sourceStart;
    const rangeDisplayLength = range.text.length;

    if (offsetInSegment <= sourceCursor) {
      return displayCursor;
    }

    if (offsetInSegment >= sourceCursor + rangeSourceLength) {
      sourceCursor += rangeSourceLength;
      displayCursor += rangeDisplayLength;
      continue;
    }

    const within = offsetInSegment - sourceCursor;
    if (range.type === "plain") {
      return displayCursor + within;
    }

    const markupPrefix = rangeSourceLength - rangeDisplayLength;
    return displayCursor + Math.max(0, Math.min(within - markupPrefix, rangeDisplayLength));
  }

  return displayText.length;
}

/**
 * 스토리 마크업으로 쪼갠 구간에 맞게 글리치 구역 좌표를 잘라 냅니다.
 */
export function sliceGlitchConfigForSourceRange(
  sourceText: string,
  config: FieldGlitchConfig | undefined,
  sourceStart: number,
  sourceEnd: number,
  displayText: string,
): FieldGlitchConfig | undefined {
  if (!config?.zones?.length || sourceStart >= sourceEnd) {
    return undefined;
  }

  const source = normalizeStorySource(sourceText);
  const segmentSource = source.slice(sourceStart, sourceEnd);
  const zones: GlitchZone[] = [];

  for (const zone of config.zones) {
    if (zone.end <= sourceStart || zone.start >= sourceEnd) {
      continue;
    }

    const clipStart = Math.max(zone.start, sourceStart);
    const clipEnd = Math.min(zone.end, sourceEnd);
    if (clipStart >= clipEnd) {
      continue;
    }

    const sliceStart = clipStart - sourceStart;
    const sliceEnd = clipEnd - sourceStart;
    const displayStart = mapSegmentSourceOffsetToDisplay(segmentSource, displayText, sliceStart);
    const displayEnd = mapSegmentSourceOffsetToDisplay(segmentSource, displayText, sliceEnd);

    if (displayStart >= displayEnd) {
      continue;
    }

    zones.push({
      ...zone,
      start: displayStart,
      end: displayEnd,
      original: displayText.slice(displayStart, displayEnd),
    });
  }

  if (zones.length === 0) {
    return undefined;
  }

  return reanchorGlitchConfig(
    displayText,
    normalizeFieldGlitchConfig({
      ...config,
      wordPool: config.wordPool.trim(),
      zones,
    }),
  );
}

function linesToList(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function draftAsGlitchAnchorCharacter(draft: CharacterDraft): Character {
  return {
    id: draft.id,
    name: draft.name.trim(),
    kanjiName: draft.kanjiName.trim(),
    subtitle: draft.subtitle.trim(),
    quote: draft.quote.trim(),
    metaFields: draft.metaFields.map((field) => ({
      ...field,
      label: field.label.trim(),
      body: field.body.trim(),
    })),
    profileFields: draft.profileFields.map((field) => ({
      ...field,
      label: field.label.trim(),
      value: field.value.trim(),
    })),
    settings: [],
    settingSections: draft.settingSections.map((section) => ({
      ...section,
      title: section.title.trim(),
      body: section.body.trim(),
    })),
    relationships: relationshipEntriesToLegacyLines(draft.relationshipEntries),
    relationshipEntries: draft.relationshipEntries.map((entry) => ({
      ...entry,
      name: entry.name.trim(),
      label: entry.label.trim(),
      body: entry.body.trim(),
    })),
    palette: normalizeCharacterPaletteInput(draft.palette),
    works: [],
  };
}

export function pruneSubPageTextGlitch(
  textGlitch: Record<string, FieldGlitchConfig> | undefined,
  subPage: CharacterSubPage,
): Record<string, FieldGlitchConfig> {
  if (!textGlitch) {
    return {};
  }

  const nextEntries = Object.entries(textGlitch)
    .map(([fieldPath, config]) => {
      const text = getSubPageFieldValue(subPage, fieldPath);
      const anchored = reanchorGlitchConfig(text, config);
      const normalized = anchored ? normalizeFieldGlitchConfig(anchored) : undefined;
      return normalized ? ([fieldPath, normalized] as const) : null;
    })
    .filter((entry): entry is readonly [string, FieldGlitchConfig] => entry !== null);

  return Object.fromEntries(nextEntries);
}

export function compactSubPageTextGlitch(subPage: CharacterSubPage) {
  const compacted = pruneSubPageTextGlitch(subPage.textGlitch, subPage);

  if (Object.keys(compacted).length === 0) {
    return undefined;
  }

  return compacted;
}

export function pruneDraftTextGlitch(
  textGlitch: Record<string, FieldGlitchConfig>,
  draft: CharacterDraft,
): Record<string, FieldGlitchConfig> {
  const anchorCharacter = draftAsGlitchAnchorCharacter(draft);

  const nextEntries = Object.entries(textGlitch)
    .map(([path, config]) => {
      const text = getCharacterFieldValue(anchorCharacter, path);
      const anchored = reanchorGlitchConfig(text, config);
      const normalized = anchored ? normalizeFieldGlitchConfig(anchored) : undefined;
      return normalized ? ([path, normalized] as const) : null;
    })
    .filter((entry): entry is readonly [string, FieldGlitchConfig] => entry !== null);

  return Object.fromEntries(nextEntries);
}

export function compactTextGlitch(
  textGlitch: Record<string, FieldGlitchConfig> | undefined,
  character: Character,
) {
  if (!textGlitch) {
    return undefined;
  }

  const nextEntries = Object.entries(textGlitch)
    .map(([path, config]) => {
      const text = getCharacterFieldValue(character, path);
      const anchored = reanchorGlitchConfig(text, config);
      const normalized = anchored ? normalizeFieldGlitchConfig(anchored) : undefined;
      return normalized ? ([path, normalized] as const) : null;
    })
    .filter((entry): entry is readonly [string, FieldGlitchConfig] => entry !== null);

  if (nextEntries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(nextEntries);
}

export function compactDraftTextGlitch(
  textGlitch: Record<string, FieldGlitchConfig> | undefined,
  draft: CharacterDraft,
) {
  return compactTextGlitch(textGlitch, draftAsGlitchAnchorCharacter(draft));
}

export type GlitchEditSection = "card" | "record";

const RECORD_GLITCH_PATHS = new Set(["relationships"]);

export function getGlitchSectionForPath(path: string): GlitchEditSection {
  const subPagePath = parseSubPageGlitchPath(path);
  const fieldPath = subPagePath?.fieldPath ?? path;

  if (
    RECORD_GLITCH_PATHS.has(fieldPath) ||
    fieldPath.startsWith("settingSections.") ||
    fieldPath.startsWith("relationships.")
  ) {
    return "record";
  }

  return "card";
}

function findGlitchFieldElement(path: string) {
  const fields = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
    "[data-glitch-field]",
  );

  return Array.from(fields).find((element) => element.dataset.glitchField === path) ?? null;
}

export function focusGlitchFieldElement(path: string, options?: { preferWorkTextarea?: boolean }) {
  if (typeof document === "undefined") {
    return;
  }

  const focusTarget = () => {
    if (options?.preferWorkTextarea) {
      const workTextarea = document.querySelector("[data-glitch-work-textarea]");
      if (workTextarea instanceof HTMLTextAreaElement) {
        workTextarea.scrollIntoView({ behavior: "smooth", block: "center" });
        workTextarea.focus({ preventScroll: true });
        return true;
      }
    }

    const field = findGlitchFieldElement(path);
    if (field) {
      field.scrollIntoView({ behavior: "smooth", block: "center" });
      field.focus({ preventScroll: true });
      return true;
    }

    return false;
  };

  window.setTimeout(() => {
    if (focusTarget()) {
      return;
    }

    window.setTimeout(focusTarget, 200);
  }, 50);
}

export type GlitchFieldOption = {
  path: string;
  label: string;
  hasGlitch: boolean;
};

export type GlitchFieldOptionGroup = {
  id: string;
  label: string;
  options: GlitchFieldOption[];
};

function buildBaseGlitchFieldOptions(
  draft: CharacterDraft,
  textGlitch: Record<string, FieldGlitchConfig>,
): GlitchFieldOption[] {
  const staticOptions = BASE_GLITCH_FIELD_PATHS.map((path) => ({
    path,
    label: GLITCH_FIELD_LABELS[path],
    hasGlitch: Boolean(textGlitch[path]),
  }));

  const profileOptions = draft.profileFields.map((field, index) => {
    const path = profileFieldGlitchPath(field.id);
    return {
      path,
      label:
        field.label.trim() ||
        getProfileFieldLabel(field.id, draft.profileFields) ||
        `프로필 ${index + 1}`,
      hasGlitch: Boolean(textGlitch[path]),
    };
  });

  return [...staticOptions, ...profileOptions];
}

function buildRelationshipGlitchFieldOptions(
  draft: CharacterDraft,
  textGlitch: Record<string, FieldGlitchConfig>,
): GlitchFieldOption[] {
  return draft.relationshipEntries.flatMap((entry, index) => {
    const labelParts = [entry.name.trim(), entry.label.trim()].filter(Boolean);
    const fallbackLabel = labelParts.join(" · ") || `관계 ${index + 1}`;

    return [
      {
        path: relationshipEntryNameGlitchPath(entry.id),
        label: `${fallbackLabel} · 이름`,
        hasGlitch: Boolean(textGlitch[relationshipEntryNameGlitchPath(entry.id)]),
      },
      {
        path: relationshipEntryLabelGlitchPath(entry.id),
        label: `${fallbackLabel} · 유형`,
        hasGlitch: Boolean(textGlitch[relationshipEntryLabelGlitchPath(entry.id)]),
      },
      {
        path: relationshipEntryGlitchPath(entry.id),
        label: `${fallbackLabel} · 설명`,
        hasGlitch: Boolean(textGlitch[relationshipEntryGlitchPath(entry.id)]),
      },
    ];
  });
}
function buildMetaFieldGlitchFieldOptions(
  draft: CharacterDraft,
  textGlitch: Record<string, FieldGlitchConfig>,
): GlitchFieldOption[] {
  return draft.metaFields.map((field, index) => {
    const path = metaFieldGlitchPath(field.id);
    return {
      path,
      label: field.label.trim() || `카드 메타 ${index + 1}`,
      hasGlitch: Boolean(textGlitch[path]),
    };
  });
}

function buildRecordBoxGlitchFieldOptions(
  draft: CharacterDraft,
  textGlitch: Record<string, FieldGlitchConfig>,
): GlitchFieldOption[] {
  return draft.settingSections.flatMap((section, index) => {
    const baseLabel = section.title.trim() || `레코드 박스 ${index + 1}`;
    const bodyPath = settingSectionGlitchPath(section.id);
    const titlePath = settingSectionTitleGlitchPath(section.id);
    const options: GlitchFieldOption[] = [
      {
        path: titlePath,
        label: `${baseLabel} · 제목`,
        hasGlitch: Boolean(textGlitch[titlePath]),
      },
      {
        path: bodyPath,
        label: `${baseLabel} · 본문`,
        hasGlitch: Boolean(textGlitch[bodyPath]),
      },
    ];

    if (section.kind === "story") {
      const excerptPath = settingSectionExcerptGlitchPath(section.id);
      options.push({
        path: excerptPath,
        label: `${baseLabel} · 소개`,
        hasGlitch: Boolean(textGlitch[excerptPath]),
      });
    }

    return options;
  });
}

function buildSubPageGlitchFieldOptions(subPage: CharacterSubPage): GlitchFieldOption[] {
  const subGlitch = subPage.textGlitch ?? {};
  const options: GlitchFieldOption[] = [];

  SUB_PAGE_GLITCH_FIELD_PATHS.forEach((fieldPath) => {
    const path = subPageFieldGlitchPath(subPage.id, fieldPath);
    options.push({
      path,
      label: GLITCH_FIELD_LABELS[fieldPath],
      hasGlitch: Boolean(subGlitch[fieldPath]),
    });
  });

  subPage.profileFields.forEach((field, index) => {
    const fieldPath = profileFieldGlitchPath(field.id);
    options.push({
      path: subPageFieldGlitchPath(subPage.id, fieldPath),
      label:
        field.label.trim() ||
        getProfileFieldLabel(field.id, subPage.profileFields) ||
        `프로필 ${index + 1}`,
      hasGlitch: Boolean(subGlitch[fieldPath]),
    });
  });

  (subPage.metaFields ?? []).forEach((field, index) => {
    const fieldPath = metaFieldGlitchPath(field.id);
    options.push({
      path: subPageFieldGlitchPath(subPage.id, fieldPath),
      label: field.label.trim() || `카드 메타 ${index + 1}`,
      hasGlitch: Boolean(subGlitch[fieldPath]),
    });
  });

  subPage.settingSections?.forEach((section, index) => {
    const baseLabel = section.title.trim() || `레코드 박스 ${index + 1}`;
    const bodyFieldPath = settingSectionGlitchPath(section.id);
    const titleFieldPath = settingSectionTitleGlitchPath(section.id);
    options.push(
      {
        path: subPageFieldGlitchPath(subPage.id, titleFieldPath),
        label: `${baseLabel} · 제목`,
        hasGlitch: Boolean(subGlitch[titleFieldPath]),
      },
      {
        path: subPageFieldGlitchPath(subPage.id, bodyFieldPath),
        label: `${baseLabel} · 본문`,
        hasGlitch: Boolean(subGlitch[bodyFieldPath]),
      },
    );

    if (section.kind === "story") {
      const excerptFieldPath = settingSectionExcerptGlitchPath(section.id);
      options.push({
        path: subPageFieldGlitchPath(subPage.id, excerptFieldPath),
        label: `${baseLabel} · 소개`,
        hasGlitch: Boolean(subGlitch[excerptFieldPath]),
      });
    }
  });

  (subPage.relationshipEntries ?? []).forEach((entry, index) => {
    const labelParts = [entry.name.trim(), entry.label.trim()].filter(Boolean);
    const fallbackLabel = labelParts.join(" · ") || `관계 ${index + 1}`;

    options.push(
      {
        path: subPageFieldGlitchPath(subPage.id, relationshipEntryNameGlitchPath(entry.id)),
        label: `${fallbackLabel} · 이름`,
        hasGlitch: Boolean(subGlitch[relationshipEntryNameGlitchPath(entry.id)]),
      },
      {
        path: subPageFieldGlitchPath(subPage.id, relationshipEntryLabelGlitchPath(entry.id)),
        label: `${fallbackLabel} · 유형`,
        hasGlitch: Boolean(subGlitch[relationshipEntryLabelGlitchPath(entry.id)]),
      },
      {
        path: subPageFieldGlitchPath(subPage.id, relationshipEntryGlitchPath(entry.id)),
        label: `${fallbackLabel} · 설명`,
        hasGlitch: Boolean(subGlitch[relationshipEntryGlitchPath(entry.id)]),
      },
    );
  });

  return options;
}

export function buildGlitchFieldOptionGroups(
  draft: CharacterDraft,
  textGlitch: Record<string, FieldGlitchConfig>,
): GlitchFieldOptionGroup[] {
  const groups: GlitchFieldOptionGroup[] = [
    {
      id: "basics",
      label: "본 페이지",
      options: buildBaseGlitchFieldOptions(draft, textGlitch),
    },
  ];

  const metaFieldOptions = buildMetaFieldGlitchFieldOptions(draft, textGlitch);
  if (metaFieldOptions.length > 0) {
    groups.push({
      id: "meta-fields",
      label: "카드 메타",
      options: metaFieldOptions,
    });
  }

  const recordBoxOptions = buildRecordBoxGlitchFieldOptions(draft, textGlitch);
  if (recordBoxOptions.length > 0) {
    groups.push({
      id: "record-boxes",
      label: "레코드 박스",
      options: recordBoxOptions,
    });
  }

  const relationshipOptions = buildRelationshipGlitchFieldOptions(draft, textGlitch);
  if (relationshipOptions.length > 0) {
    groups.push({
      id: "relationships",
      label: "관계",
      options: relationshipOptions,
    });
  }

  draft.subPages.forEach((subPage, subIndex) => {
    const options = buildSubPageGlitchFieldOptions(subPage);
    if (options.length === 0) {
      return;
    }

    groups.push({
      id: `subpage-${subPage.id}`,
      label: subPage.title.trim() || `상세 페이지 ${subIndex + 1}`,
      options,
    });
  });

  return groups;
}

export function buildGlitchFieldOptions(
  draft: CharacterDraft,
  textGlitch: Record<string, FieldGlitchConfig>,
) {
  return buildGlitchFieldOptionGroups(draft, textGlitch).flatMap((group) =>
    group.options.map((option) => ({
      ...option,
      label:
        group.id === "basics" || group.id === "record-boxes"
          ? option.label
          : `${group.label} · ${option.label}`,
    })),
  );
}

export function countDraftGlitchFields(draft: CharacterDraft) {
  let count = Object.keys(draft.textGlitch).length;

  for (const subPage of draft.subPages) {
    count += Object.keys(subPage.textGlitch ?? {}).length;
  }

  return count;
}

export function getDraftGlitchConfig(draft: CharacterDraft, path: string) {
  const subPagePath = parseSubPageGlitchPath(path);
  if (subPagePath) {
    const subPage = findSubPageInDraft(draft, subPagePath.subPageId);
    return subPage?.textGlitch?.[subPagePath.fieldPath];
  }

  return draft.textGlitch[path];
}

export function glitchConfigSignature(text: string, glitch?: FieldGlitchConfig) {
  if (!glitch?.zones?.length || !isValidFieldGlitchConfig(glitch)) {
    return "";
  }

  return JSON.stringify({
    text,
    wordPool: glitch.wordPool.trim(),
    scrambleMode: glitch.scrambleMode,
    builtinScramble: glitch.builtinScramble,
    errorDisplayMode: glitch.errorDisplayMode,
    builtinTokens: glitch.builtinTokens,
    tickMs: glitch.tickMs,
    defaultStyle: glitch.defaultStyle,
    zones: [...glitch.zones]
      .map((zone) => ({
        id: zone.id,
        start: zone.start,
        end: zone.end,
        original: zone.original,
        style: zone.style,
        errorMessage: zone.errorMessage,
        errorMessageSource: zone.errorMessageSource,
        wordPool: zone.wordPool,
        scrambleMode: zone.scrambleMode,
        builtinScramble: zone.builtinScramble,
        builtinTokens: zone.builtinTokens,
        errorDisplayMode: zone.errorDisplayMode,
        tickMs: zone.tickMs,
        linkTarget: zone.linkTarget,
        linkSubPageId: zone.linkSubPageId,
      }))
      .sort((left, right) => left.start - right.start),
  });
}

export function getCharacterFieldGlitch(
  textGlitch: Record<string, FieldGlitchConfig> | undefined,
  path: string,
  text: string,
) {
  return reanchorGlitchConfig(text, textGlitch?.[path]);
}

export function settingSectionGlitchPath(sectionId: string) {
  return `settingSections.${sectionId}`;
}

export function settingSectionTitleGlitchPath(sectionId: string) {
  return `settingSections.${sectionId}.title`;
}

export function settingSectionExcerptGlitchPath(sectionId: string) {
  return `settingSections.${sectionId}.excerpt`;
}

export type SettingSectionGlitchField = "body" | "excerpt" | "title";

export function parseSettingSectionGlitchPath(
  path: string,
): { sectionId: string; field: SettingSectionGlitchField } | null {
  if (!path.startsWith("settingSections.")) {
    return null;
  }

  const rest = path.slice("settingSections.".length);
  if (!rest) {
    return null;
  }

  if (rest.endsWith(".excerpt")) {
    return { sectionId: rest.slice(0, -".excerpt".length), field: "excerpt" };
  }

  if (rest.endsWith(".title")) {
    return { sectionId: rest.slice(0, -".title".length), field: "title" };
  }

  return { sectionId: rest, field: "body" };
}

export function workBodyGlitchPath(index: number) {
  return `works.${index}.body`;
}

function resolveStoredGlitchConfig(config: FieldGlitchConfig | undefined) {
  if (!config) {
    return undefined;
  }

  return (
    normalizeFieldGlitchConfig(config) ?? (isValidFieldGlitchConfig(config) ? config : undefined)
  );
}

export function updateDraftGlitchPath(
  draft: CharacterDraft,
  path: string,
  config: FieldGlitchConfig | undefined,
): CharacterDraft {
  const normalized = resolveStoredGlitchConfig(config);
  const subPagePath = parseSubPageGlitchPath(path);

  if (subPagePath) {
    return {
      ...draft,
      subPages: draft.subPages.map((subPage) => {
        if (subPage.id !== subPagePath.subPageId) {
          return subPage;
        }

        const nextGlitch = { ...(subPage.textGlitch ?? {}) };

        if (!normalized) {
          delete nextGlitch[subPagePath.fieldPath];
        } else {
          nextGlitch[subPagePath.fieldPath] = normalized;
        }

        return {
          ...subPage,
          textGlitch: nextGlitch,
        };
      }),
    };
  }

  const nextGlitch = { ...draft.textGlitch };

  if (!normalized) {
    delete nextGlitch[path];
  } else {
    nextGlitch[path] = normalized;
  }

  return {
    ...draft,
    textGlitch: nextGlitch,
  };
}

export function updateDraftFieldValue(
  draft: CharacterDraft,
  path: string,
  value: string,
): CharacterDraft {
  const subPagePath = parseSubPageGlitchPath(path);

  if (subPagePath) {
    const subPage = findSubPageInDraft(draft, subPagePath.subPageId);
    if (!subPage) {
      return draft;
    }

    const nextSubPage = setSubPageFieldValue(subPage, subPagePath.fieldPath, value);
    const reanchored = reanchorGlitchConfig(value, subPage.textGlitch?.[subPagePath.fieldPath]);
    const normalized = reanchored ? normalizeFieldGlitchConfig(reanchored) : undefined;
    const nextGlitch = { ...(subPage.textGlitch ?? {}) };

    if (normalized) {
      nextGlitch[subPagePath.fieldPath] = normalized;
    } else {
      delete nextGlitch[subPagePath.fieldPath];
    }

    return {
      ...draft,
      subPages: draft.subPages.map((entry) =>
        entry.id === subPagePath.subPageId ? { ...nextSubPage, textGlitch: nextGlitch } : entry,
      ),
    };
  }

  const nextDraft = setCharacterDraftFieldValue(draft, path, value);
  const reanchored = reanchorGlitchConfig(value, draft.textGlitch[path]);
  const normalized = reanchored ? normalizeFieldGlitchConfig(reanchored) : undefined;
  const nextGlitch = { ...draft.textGlitch };

  if (normalized) {
    nextGlitch[path] = normalized;
  } else {
    delete nextGlitch[path];
  }

  return {
    ...nextDraft,
    textGlitch: nextGlitch,
  };
}
