"use client";

import { cn } from "@/utils/cn";
import { ArchiveMotion } from "@/components/home/ArchiveMotion";
import type { DiaryEntry } from "@/lib/types";

interface DiarySectionProps {
  entries: DiaryEntry[];
  className?: string;
}

export function DiarySection({ entries, className }: DiarySectionProps) {
  return (
    <ArchiveMotion
      as="section"
      variant="scan"
      motionKey="diary"
      className={cn("glass-card p-6 md:p-8", className)}
    >
      <p className="archive-kicker">Private Log</p>
      <h3 className="archive-title mt-2 font-serif text-5xl">다이어리</h3>
      <ArchiveMotion
        variant="stagger"
        motionKey={`diary-entries-${entries.length}`}
        className="mt-5 grid gap-4"
      >
        {entries.length > 0 ? (
          entries.map((entry) => (
            <article key={entry.id} className="archive-panel p-5">
              <p className="archive-kicker">{entry.date}</p>
              <h4 className="mt-2 text-xl font-semibold text-emerald-50">{entry.title}</h4>
              <p className="mt-4 text-sm leading-8 whitespace-pre-line text-emerald-50/78">
                {entry.body}
              </p>
            </article>
          ))
        ) : (
          <p className="archive-panel p-5 text-sm text-emerald-100/60">
            아직 저장된 일기가 없어요.
          </p>
        )}
      </ArchiveMotion>
    </ArchiveMotion>
  );
}
