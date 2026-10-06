import type { CSSProperties } from "react";
import { normalizeGlitchFontPreset, resolveGlitchFontFamily } from "@/constants/glitch-font-presets";
import type { FieldGlitchConfig, GlitchMarkdown, GlitchZoneStyle } from "@/lib/types";
import { fieldConfigHasScrambleAlternation } from "@/lib/glitch-scramble-options";
import { fieldGlitchHasLinks } from "@/lib/zone-links";

export const DEFAULT_GLITCH_TICK_MS = 800;
export const MIN_GLITCH_TICK_MS = 100;
export const MAX_GLITCH_TICK_MS = 10000;
export const GLITCH_TICK_PULSE_MS = 100;

export const MIN_DECORATION_THICKNESS_PX = 0.5;
export const MAX_DECORATION_THICKNESS_PX = 12;
export const DEFAULT_DECORATION_THICKNESS_PX = 2;
export const DECORATION_THICKNESS_STEP_PX = 0.5;

export const MIN_GLITCH_FONT_SIZE_PERCENT = 50;
export const MAX_GLITCH_FONT_SIZE_PERCENT = 200;
export const GLITCH_FONT_SIZE_STEP_PERCENT = 5;

export const GLITCH_STYLE_PRESETS: Record<string, GlitchZoneStyle> = {
  inherit: {},
  error: {
    markdown: { bold: true },
  },
  muted: {
    markdown: { italic: true },
  },
};

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export function clampGlitchTickMs(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return DEFAULT_GLITCH_TICK_MS;
  }

  return Math.min(MAX_GLITCH_TICK_MS, Math.max(MIN_GLITCH_TICK_MS, Math.round(value)));
}

export function normalizeColorInput(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return undefined;
  }

  if (trimmed === "inherit" || trimmed === "currentColor" || trimmed.startsWith("rgba(")) {
    return trimmed;
  }

  if (trimmed.startsWith("rgb(") || trimmed.startsWith("hsl(")) {
    return trimmed;
  }

  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return HEX_COLOR_PATTERN.test(withHash) ? withHash : undefined;
}

export function clampDecorationThicknessPx(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return undefined;
  }

  const stepped = Math.round(value / DECORATION_THICKNESS_STEP_PX) * DECORATION_THICKNESS_STEP_PX;

  return Math.min(MAX_DECORATION_THICKNESS_PX, Math.max(MIN_DECORATION_THICKNESS_PX, stepped));
}

export function formatDecorationThicknessPx(value: number) {
  return Number.isInteger(value) ? `${value}px` : `${value.toFixed(1)}px`;
}

export function clampGlitchFontSizePercent(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return undefined;
  }

  const stepped = Math.round(value / GLITCH_FONT_SIZE_STEP_PERCENT) * GLITCH_FONT_SIZE_STEP_PERCENT;

  return Math.min(MAX_GLITCH_FONT_SIZE_PERCENT, Math.max(MIN_GLITCH_FONT_SIZE_PERCENT, stepped));
}

export function formatGlitchFontSizePercent(value: number) {
  return `${value}%`;
}

function normalizeMarkdown(value: unknown): GlitchMarkdown | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const markdown = value as GlitchMarkdown;
  const next: GlitchMarkdown = {};

  if (markdown.bold) next.bold = true;
  if (markdown.italic) next.italic = true;
  if (markdown.underline) next.underline = true;
  if (markdown.strikethrough) next.strikethrough = true;

  return Object.keys(next).length > 0 ? next : undefined;
}

const LEGACY_ERROR_TEXT_COLORS = new Set(["#fecdd3"]);

export function normalizeGlitchZoneStyle(value: unknown): GlitchZoneStyle | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const raw = value as GlitchZoneStyle & { backgroundColor?: string };
  const next: GlitchZoneStyle = {};
  const textColor = normalizeColorInput(raw.textColor);
  const underlineColor = normalizeColorInput(raw.underlineColor);
  const strikethroughColor = normalizeColorInput(raw.strikethroughColor);
  const underlineThickness = clampDecorationThicknessPx(raw.underlineThickness);
  const strikethroughThickness = clampDecorationThicknessPx(raw.strikethroughThickness);
  const fontSize = clampGlitchFontSizePercent(raw.fontSize);
  const fontPreset = normalizeGlitchFontPreset(raw.fontPreset);
  const markdown = normalizeMarkdown(raw.markdown);
  const hadLegacyPaint = Boolean(raw.backgroundColor?.trim());
  const isLegacyErrorColor = Boolean(
    textColor && LEGACY_ERROR_TEXT_COLORS.has(textColor.toLowerCase()),
  );

  if (textColor && !hadLegacyPaint && !isLegacyErrorColor) {
    next.textColor = textColor;
  }

  if (underlineColor) {
    next.underlineColor = underlineColor;
  }

  if (strikethroughColor) {
    next.strikethroughColor = strikethroughColor;
  }

  if (underlineThickness) {
    next.underlineThickness = underlineThickness;
  }

  if (strikethroughThickness) {
    next.strikethroughThickness = strikethroughThickness;
  }

  if (fontSize && fontSize !== 100) {
    next.fontSize = fontSize;
  }

  if (fontPreset) {
    next.fontPreset = fontPreset;
  }

  if (markdown) {
    next.markdown = markdown;
  }

  if (raw.storyQuote) {
    next.storyQuote = true;
  }

  return Object.keys(next).length > 0 ? next : undefined;
}

/**
 * 구역에 사용자 지정 글자색이 있는지 확인합니다.
 */
export function glitchZoneHasCustomTextColor(style?: GlitchZoneStyle): boolean {
  return Boolean(normalizeGlitchZoneStyle(style)?.textColor);
}

export function glitchZoneHasCustomFontSize(style?: GlitchZoneStyle): boolean {
  return typeof normalizeGlitchZoneStyle(style)?.fontSize === "number";
}

export function glitchZoneHasCustomFontPreset(style?: GlitchZoneStyle): boolean {
  return Boolean(normalizeGlitchZoneStyle(style)?.fontPreset);
}

export function glitchZoneStyleSignature(style?: GlitchZoneStyle) {
  return JSON.stringify(normalizeGlitchZoneStyle(style) ?? null);
}

export function glitchZoneStylesEqual(left?: GlitchZoneStyle, right?: GlitchZoneStyle) {
  return glitchZoneStyleSignature(left) === glitchZoneStyleSignature(right);
}

export function mergeGlitchZoneStyles(
  zoneStyle?: GlitchZoneStyle,
  defaultStyle?: GlitchZoneStyle,
): GlitchZoneStyle {
  const normalizedZone = normalizeGlitchZoneStyle(zoneStyle);
  const normalizedDefault = normalizeGlitchZoneStyle(defaultStyle);

  if (!normalizedZone && !normalizedDefault) {
    return {};
  }

  if (!normalizedZone) {
    return normalizedDefault ?? {};
  }

  if (!normalizedDefault) {
    return normalizedZone;
  }

  return {
    ...normalizedDefault,
    ...normalizedZone,
    markdown: {
      ...normalizedDefault.markdown,
      ...normalizedZone.markdown,
    },
  };
}

export function resolveGlitchZonePresentation(
  zoneStyle?: GlitchZoneStyle,
  options?: { linkUnderline?: boolean },
) {
  const normalized = normalizeGlitchZoneStyle(zoneStyle);
  const markdown = normalized?.markdown;
  const wantsUnderline = Boolean(markdown?.underline || options?.linkUnderline);

  const inlineStyle: CSSProperties & Record<string, string | number | undefined> = {
    backgroundColor: "transparent",
    background: "none",
    boxShadow: "none",
    textShadow: "none",
    "--glitch-decoration-color": "currentColor",
  };

  if (normalized?.textColor) {
    inlineStyle.color = normalized.textColor;
    inlineStyle["--glitch-text-color"] = normalized.textColor;
    inlineStyle["--glitch-decoration-color"] = normalized.textColor;
  }

  if (normalized?.fontSize) {
    const fontSizeValue = formatGlitchFontSizePercent(normalized.fontSize);
    inlineStyle["--glitch-font-size"] = fontSizeValue;
  }

  const fontFamily = resolveGlitchFontFamily(normalized?.fontPreset);
  if (fontFamily) {
    inlineStyle.fontFamily = fontFamily;
    inlineStyle["--glitch-font-family"] = fontFamily;
  }

  if (markdown?.bold) {
    inlineStyle.fontWeight = 700;
  }

  if (markdown?.italic) {
    inlineStyle.fontStyle = "italic";
  }

  if (wantsUnderline) {
    if (normalized?.underlineColor) {
      inlineStyle["--glitch-underline-color"] = normalized.underlineColor;
      inlineStyle.textDecorationColor = normalized.underlineColor;
    }

    const underlineThickness = normalized?.underlineThickness ?? DEFAULT_DECORATION_THICKNESS_PX;
    inlineStyle["--glitch-underline-thickness"] = formatDecorationThicknessPx(underlineThickness);
    inlineStyle.textDecorationThickness = underlineThickness;
  }

  if (markdown?.strikethrough) {
    if (normalized?.strikethroughColor) {
      inlineStyle["--glitch-strikethrough-color"] = normalized.strikethroughColor;
    }

    const strikethroughThickness =
      normalized?.strikethroughThickness ?? DEFAULT_DECORATION_THICKNESS_PX;
    inlineStyle["--glitch-strikethrough-thickness"] =
      formatDecorationThicknessPx(strikethroughThickness);
  }

  return {
    merged: normalized ?? {},
    inlineStyle,
    decoration: {
      bold: Boolean(markdown?.bold),
      italic: Boolean(markdown?.italic),
      underline: wantsUnderline && !options?.linkUnderline,
      linkUnderline: Boolean(options?.linkUnderline && wantsUnderline),
      strikethrough: Boolean(markdown?.strikethrough),
    },
  };
}

export function glitchScramblePhase(timestamp: number, tickMs?: number) {
  const interval = clampGlitchTickMs(tickMs);
  if (interval <= 0) {
    return 0;
  }

  return Math.floor(timestamp / interval);
}

/** @deprecated Use glitchScramblePhase */
export const glitchScrambleGeneration = glitchScramblePhase;

export function hasGlitchPresentation(style?: GlitchZoneStyle): boolean {
  const normalized = normalizeGlitchZoneStyle(style);
  if (!normalized) {
    return false;
  }

  const markdown = normalized.markdown;
  return Boolean(
    normalized.textColor ||
    normalized.storyQuote ||
    markdown?.bold ||
    markdown?.italic ||
    markdown?.underline ||
    markdown?.strikethrough ||
    normalized.underlineColor ||
    normalized.strikethroughColor ||
    normalized.underlineThickness ||
    normalized.strikethroughThickness ||
    normalized.fontSize ||
    normalized.fontPreset,
  );
}

export function fieldGlitchHasPresentation(
  config?: Pick<FieldGlitchConfig, "zones" | "defaultStyle">,
) {
  if (!config?.zones?.length) {
    return false;
  }

  if (hasGlitchPresentation(config.defaultStyle)) {
    return true;
  }

  return config.zones.some((zone) => hasGlitchPresentation(zone.style));
}

export function fieldGlitchHasScramble(
  config?: Pick<FieldGlitchConfig, "wordPool" | "builtinScramble" | "zones">,
) {
  return fieldConfigHasScrambleAlternation(config);
}

export function isValidFieldGlitchConfig(
  config?: Pick<FieldGlitchConfig, "wordPool" | "builtinScramble" | "zones" | "defaultStyle">,
) {
  return (
    fieldGlitchHasScramble(config) ||
    fieldGlitchHasPresentation(config) ||
    fieldGlitchHasLinks(config)
  );
}
