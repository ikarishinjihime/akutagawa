import type { CSSProperties } from "react";
import type { CaseFileDetailTheme } from "@/lib/types";
import { normalizeColorInput } from "@/lib/glitch-style";

export const CASE_FILE_THEME_FIELDS = [
  { key: "introLabel", label: "한 줄 소개 · 라벨", group: "intro" },
  { key: "introText", label: "한 줄 소개 · 글자", group: "intro" },
  { key: "introBackground", label: "한 줄 소개 · 배경", group: "intro" },
  { key: "introBorder", label: "한 줄 소개 · 테두리", group: "intro" },
  { key: "voiceLabel", label: "한마디 · 라벨", group: "voice" },
  { key: "voiceText", label: "한마디 · 글자", group: "voice" },
  { key: "voiceBackground", label: "한마디 · 배경", group: "voice" },
  { key: "voiceBorder", label: "한마디 · 테두리", group: "voice" },
] as const satisfies ReadonlyArray<{
  key: keyof CaseFileDetailTheme;
  label: string;
  group: "intro" | "voice";
}>;

export const DEFAULT_CASE_FILE_DETAIL_THEME: Required<CaseFileDetailTheme> = {
  introLabel: "rgba(168, 184, 214, 0.5)",
  introText: "rgba(236, 240, 245, 0.86)",
  introBackground: "rgba(0, 0, 0, 0.38)",
  introBorder: "rgba(255, 255, 255, 0.09)",
  voiceLabel: "rgba(160, 160, 160, 0.62)",
  voiceText: "rgba(210, 206, 200, 0.88)",
  voiceBackground: "rgba(12, 12, 12, 0.82)",
  voiceBorder: "rgba(255, 255, 255, 0.1)",
};

const CSS_VAR_BY_KEY: Record<keyof CaseFileDetailTheme, string> = {
  introLabel: "--case-intro-label",
  introText: "--case-intro-text",
  introBackground: "--case-intro-bg",
  introBorder: "--case-intro-border",
  voiceLabel: "--case-voice-label",
  voiceText: "--case-voice-text",
  voiceBackground: "--case-voice-bg",
  voiceBorder: "--case-voice-border",
};

function normalizeThemeColor(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  return normalizeColorInput(value.trim());
}

export function normalizeCaseFileDetailTheme(raw: unknown): CaseFileDetailTheme | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }

  const source = raw as CaseFileDetailTheme;
  const next: CaseFileDetailTheme = {};

  for (const field of CASE_FILE_THEME_FIELDS) {
    const color = normalizeThemeColor(source[field.key]);
    if (color) {
      next[field.key] = color;
    }
  }

  return Object.keys(next).length > 0 ? next : undefined;
}

export function resolveCaseFileDetailTheme(
  parentTheme?: CaseFileDetailTheme,
  subPageTheme?: CaseFileDetailTheme,
): Required<CaseFileDetailTheme> {
  return {
    ...DEFAULT_CASE_FILE_DETAIL_THEME,
    ...parentTheme,
    ...subPageTheme,
  };
}

export function compactCaseFileDetailTheme(
  theme?: CaseFileDetailTheme,
): CaseFileDetailTheme | undefined {
  const normalized = normalizeCaseFileDetailTheme(theme);
  return normalized && Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function caseFileDetailThemeStyle(
  parentTheme?: CaseFileDetailTheme,
  subPageTheme?: CaseFileDetailTheme,
): CSSProperties {
  const resolved = resolveCaseFileDetailTheme(parentTheme, subPageTheme);
  const style: Record<string, string> = {};

  for (const field of CASE_FILE_THEME_FIELDS) {
    style[CSS_VAR_BY_KEY[field.key]] = resolved[field.key];
  }

  return style as CSSProperties;
}

export function isDefaultCaseFileDetailTheme(theme?: CaseFileDetailTheme) {
  if (!theme) {
    return true;
  }

  const resolved = resolveCaseFileDetailTheme(theme);
  return CASE_FILE_THEME_FIELDS.every((field) => theme[field.key] === resolved[field.key]);
}
