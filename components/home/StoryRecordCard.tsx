"use client";

import { GlitchedText } from "@/components/GlitchedText";
import { StoryFormattedText } from "@/components/StoryFormattedText";
import { resolveStoryExcerpt } from "@/lib/story-text";
import type { FieldGlitchConfig, SettingSection } from "@/lib/types";
import { cn } from "@/utils/cn";

interface StoryRecordCardProps {
  section: SettingSection;
  index: number;
  onOpen: () => void;
  className?: string;
  excerptGlitch?: FieldGlitchConfig;
  titleGlitch?: FieldGlitchConfig;
}

export function StoryRecordCard({
  section,
  index,
  onOpen,
  className,
  excerptGlitch,
  titleGlitch,
}: StoryRecordCardProps) {
  const customExcerpt = section.excerpt?.trim();
  const excerpt = customExcerpt || resolveStoryExcerpt(section);

  return (
    <article className={cn("story-record-card static-record-panel", className)}>
      <div className="story-record-card-head">
        <span className="story-record-card-kicker whitespace-pre-line">
          {section.title ? (
            <GlitchedText text={section.title} glitch={titleGlitch} preserveWhitespace />
          ) : (
            `STORY ${String(index + 1).padStart(2, "0")}`
          )}
        </span>
        <span className="story-record-card-badge">STORY LOG</span>
      </div>

      <p
        className={cn(
          "story-record-card-excerpt",
          customExcerpt && "story-record-card-excerpt-custom",
        )}
      >
        {excerpt ? (
          <StoryFormattedText text={customExcerpt || excerpt} glitch={customExcerpt ? excerptGlitch : undefined} />
        ) : (
          "기록된 서사가 있습니다."
        )}
      </p>

      <button type="button" onClick={onOpen} className="story-record-card-open">
        <span className="story-record-card-open-label">기록 열람</span>
        <span className="story-record-card-open-icon" aria-hidden="true">
          ↗
        </span>
      </button>
    </article>
  );
}
