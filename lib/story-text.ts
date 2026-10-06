import type { SettingSection } from "@/lib/types";

const DOLLAR_CHARS = /[\u0024\uFF04\uFE69]/;
const ALL_DOLLARS = /[\u0024\uFF04\uFE69]/g;

export function normalizeStorySource(text: string): string {
  return text
    .normalize("NFKC")
    .replace(ALL_DOLLARS, "$")
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201C\u201D\u2033]/g, '"')
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/`+/g, "")
    .replace(/\u00A0/g, " ");
}

function normalizeQuoteContent(text: string): string {
  const trimmed = text.trim();

  const wrappedMatch = trimmed.match(/^(['"`])([\s\S]*)\1$/);
  if (wrappedMatch) {
    return wrappedMatch[2].trim();
  }

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function isDollarChar(char: string): boolean {
  return DOLLAR_CHARS.test(char);
}

export type StoryTextSegment =
  | { type: "plain"; text: string }
  | { type: "bold"; text: string }
  | { type: "italic"; text: string }
  | { type: "boldItalic"; text: string }
  | { type: "quote"; text: string }
  | { type: "boldQuote"; text: string };

type MarkupMatch = {
  start: number;
  end: number;
  type: Exclude<StoryTextSegment, { type: "plain" }>["type"];
  text: string;
};

function findEarliestMarkup(source: string, from = 0): MarkupMatch | null {
  let earliest: MarkupMatch | null = null;

  const consider = (candidate: MarkupMatch | null) => {
    if (!candidate) {
      return;
    }

    if (!earliest || candidate.start < earliest.start) {
      earliest = candidate;
    }
  };

  for (let index = from; index < source.length; index += 1) {
    if (source.startsWith("***", index)) {
      const close = source.indexOf("***", index + 3);
      if (close !== -1) {
        consider({
          start: index,
          end: close + 3,
          type: "boldItalic",
          text: source.slice(index + 3, close),
        });
      }
    }

    if (source.startsWith("**", index) && source.startsWith("**$", index)) {
      const close = source.indexOf("$**", index + 3);
      if (close !== -1) {
        consider({
          start: index,
          end: close + 3,
          type: "boldQuote",
          text: normalizeQuoteContent(source.slice(index + 3, close)),
        });
      }
    }

    if (source.startsWith("**", index) && !source.startsWith("**$", index)) {
      const close = source.indexOf("**", index + 2);
      if (close !== -1) {
        consider({
          start: index,
          end: close + 2,
          type: "bold",
          text: source.slice(index + 2, close),
        });
      }
    }

    if (source[index] === "*" && !source.startsWith("**", index)) {
      const close = source.indexOf("*", index + 1);
      if (close !== -1) {
        consider({
          start: index,
          end: close + 1,
          type: "italic",
          text: source.slice(index + 1, close),
        });
      }
    }

    if (isDollarChar(source[index]) && !source.startsWith("**$", index) && !source.startsWith("$**", index)) {
      for (let close = index + 1; close < source.length; close += 1) {
        if (!isDollarChar(source[close])) {
          continue;
        }

        consider({
          start: index,
          end: close + 1,
          type: "quote",
          text: normalizeQuoteContent(source.slice(index + 1, close)),
        });
        break;
      }
    }
  }

  return earliest;
}

function getMarkupDelimiterLengths(type: Exclude<StoryTextSegment, { type: "plain" }>["type"]) {
  switch (type) {
    case "boldItalic":
      return { open: 3, close: 3 };
    case "boldQuote":
      return { open: 3, close: 3 };
    case "bold":
      return { open: 2, close: 2 };
    case "italic":
      return { open: 1, close: 1 };
    case "quote":
      return { open: 1, close: 1 };
    default:
      return { open: 0, close: 0 };
  }
}

export function markupOffsetToStrippedOffset(markupText: string, markupOffset: number): number {
  const source = normalizeStorySource(markupText);
  const target = Math.max(0, Math.min(markupOffset, source.length));

  if (!storyTextHasMarkup(markupText)) {
    return target;
  }

  let stripped = 0;
  let cursor = 0;

  while (cursor < target) {
    const match = findEarliestMarkup(source, cursor);
    if (!match || match.start >= target) {
      stripped += target - cursor;
      break;
    }

    if (match.start > cursor) {
      const plainEnd = Math.min(match.start, target);
      stripped += plainEnd - cursor;
      cursor = plainEnd;
      if (cursor >= target) {
        break;
      }
    }

    const { open } = getMarkupDelimiterLengths(match.type);
    const contentStart = match.start + open;
    const contentEnd = contentStart + match.text.length;

    if (target <= contentStart) {
      break;
    }

    if (target <= contentEnd) {
      stripped += target - contentStart;
      break;
    }

    if (target <= match.end) {
      stripped += match.text.length;
      break;
    }

    stripped += match.text.length;
    cursor = match.end;
  }

  return stripped;
}

export function mapStoryMarkupSelectionToStripped(
  markupText: string,
  selection: { start: number; end: number; text: string },
) {
  const strippedText = stripStoryMarkupPreserveLayout(markupText);
  const start = markupOffsetToStrippedOffset(markupText, selection.start);
  const end = markupOffsetToStrippedOffset(markupText, selection.end);

  return {
    start,
    end,
    text: strippedText.slice(start, end),
  };
}

export function stripStoryMarkup(text: string): string {
  const segments = parseStoryMarkup(text);
  return segments
    .map((segment) => segment.text)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveStoryExcerpt(section: Pick<SettingSection, "body" | "excerpt">, maxLength = 148): string {
  const custom = section.excerpt?.trim();
  const source = custom || section.body.trim().replace(/\n+/g, " ");
  const plain = stripStoryMarkup(source);

  if (plain.length <= maxLength) {
    return plain;
  }

  const clipped = plain.slice(0, maxLength).trimEnd();
  const lastSpace = clipped.lastIndexOf(" ");
  const safeClip = lastSpace > maxLength * 0.55 ? clipped.slice(0, lastSpace) : clipped;

  return `${safeClip}…`;
}

export function stripStoryMarkupPreserveLayout(text: string): string {
  return parseStoryMarkup(text)
    .map((segment) => segment.text)
    .join("");
}

export type StoryMarkupRange = StoryTextSegment & {
  strippedStart: number;
  strippedEnd: number;
};

export function parseStoryMarkupRanges(text: string): StoryMarkupRange[] {
  const source = normalizeStorySource(text);
  const ranges: StoryMarkupRange[] = [];
  let cursor = 0;
  let strippedCursor = 0;

  while (cursor < source.length) {
    const match = findEarliestMarkup(source, cursor);

    if (!match || match.start > source.length) {
      const tail = source.slice(cursor);
      if (tail) {
        ranges.push({
          type: "plain",
          text: tail,
          strippedStart: strippedCursor,
          strippedEnd: strippedCursor + tail.length,
        });
      }
      break;
    }

    if (match.start > cursor) {
      const plain = source.slice(cursor, match.start);
      ranges.push({
        type: "plain",
        text: plain,
        strippedStart: strippedCursor,
        strippedEnd: strippedCursor + plain.length,
      });
      strippedCursor += plain.length;
    }

    ranges.push({
      type: match.type,
      text: match.text,
      strippedStart: strippedCursor,
      strippedEnd: strippedCursor + match.text.length,
    });
    strippedCursor += match.text.length;
    cursor = match.end;
  }

  return ranges.length > 0
    ? ranges
    : [{ type: "plain", text: source, strippedStart: 0, strippedEnd: source.length }];
}

export type StoryMarkupSourceRange = StoryTextSegment & {
  sourceStart: number;
  sourceEnd: number;
};

export function parseStoryMarkupSourceRanges(text: string): StoryMarkupSourceRange[] {
  const source = normalizeStorySource(text);
  const ranges: StoryMarkupSourceRange[] = [];
  let cursor = 0;

  while (cursor < source.length) {
    const match = findEarliestMarkup(source, cursor);

    if (!match || match.start > source.length) {
      if (cursor < source.length) {
        ranges.push({
          type: "plain",
          text: source.slice(cursor),
          sourceStart: cursor,
          sourceEnd: source.length,
        });
      }
      break;
    }

    if (match.start > cursor) {
      ranges.push({
        type: "plain",
        text: source.slice(cursor, match.start),
        sourceStart: cursor,
        sourceEnd: match.start,
      });
    }

    ranges.push({
      type: match.type,
      text: match.text,
      sourceStart: match.start,
      sourceEnd: match.end,
    });
    cursor = match.end;
  }

  return ranges.length > 0
    ? ranges
    : [{ type: "plain", text: source, sourceStart: 0, sourceEnd: source.length }];
}

export function parseStoryMarkup(text: string): StoryTextSegment[] {
  const source = normalizeStorySource(text);
  const segments: StoryTextSegment[] = [];
  let cursor = 0;

  while (cursor < source.length) {
    const match = findEarliestMarkup(source, cursor);

    if (!match || match.start > source.length) {
      if (cursor < source.length) {
        segments.push({ type: "plain", text: source.slice(cursor) });
      }
      break;
    }

    if (match.start > cursor) {
      segments.push({ type: "plain", text: source.slice(cursor, match.start) });
    }

    segments.push({ type: match.type, text: match.text });
    cursor = match.end;
  }

  return segments.length > 0 ? segments : [{ type: "plain", text: source }];
}

export function splitStoryParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function storyTextHasMarkup(text: string): boolean {
  const source = normalizeStorySource(text);
  return findEarliestMarkup(source) !== null;
}
