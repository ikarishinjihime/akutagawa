"use client";

import { useMemo } from "react";
import { cn } from "@/utils/cn";
import { ArchiveMotion } from "@/components/home/ArchiveMotion";
import { TextGlitch } from "@/components/TextGlitch";
import type { Character, GuestbookEntry, HomeContent } from "@/lib/types";

type HomeRecentItem = {
  characterId: string;
  title: string;
  meta: string;
  date: string;
};

interface HomeSectionProps {
  homeContent: HomeContent;
  characters: Character[];
  guestbook: GuestbookEntry[];
  onNavigateToGuest: () => void;
  onNavigateToCharacterWorks: (characterId: string) => void;
  onNavigateToCharacterDetail: (characterId: string) => void;
  className?: string;
}

export function HomeSection({
  homeContent,
  characters,
  guestbook,
  onNavigateToGuest,
  onNavigateToCharacterWorks,
  onNavigateToCharacterDetail,
  className,
}: HomeSectionProps) {
  const allWorks = useMemo(
    () =>
      characters.flatMap((character) =>
        character.works.map((work) => ({
          character,
          work,
        })),
      ),
    [characters],
  );

  const recentItems = useMemo<HomeRecentItem[]>(
    () => [
      ...allWorks.map(({ character, work }) => ({
        characterId: character.id,
        title: `${character.name} - ${work.title}`,
        meta: work.kind,
        date: work.date,
      })),
      ...guestbook.slice(0, 2).map((guest) => ({
        characterId: "",
        title: `방명록 - ${guest.name}`,
        meta: "comment",
        date: "new",
      })),
    ],
    [allWorks, guestbook],
  );

  return (
    <div className={cn("space-y-4", className)}>
      <ArchiveMotion
        as="section"
        variant="enter"
        motionKey="home-intro"
        className="glass-card p-5 md:p-7"
      >
        <p className="archive-kicker">
          <TextGlitch text={homeContent.eyebrow} />
        </p>
        <h2 className="archive-title site-logo-title mt-4 text-3xl md:text-5xl">
          <TextGlitch text={homeContent.title} />
        </h2>
        <p className="mt-5 max-w-3xl border-l border-stone-400/25 bg-white/[0.04] px-4 py-3 text-sm leading-8 whitespace-pre-line text-emerald-50/82 md:text-base">
          {homeContent.body}
        </p>
      </ArchiveMotion>

      <ArchiveMotion
        as="section"
        variant="stagger"
        motionKey="home-boards"
        className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]"
      >
        <div className="glass-card p-5">
          <h3 className="board-title">
            <TextGlitch text="최근 갱신된 글" />
          </h3>
          <ArchiveMotion
            variant="stagger"
            motionKey={`home-recent-${recentItems.length}`}
            className="mt-4 space-y-2"
          >
            {recentItems.slice(0, 6).map((item) => (
              <button
                key={`${item.title}-${item.date}`}
                type="button"
                onClick={() => {
                  if (item.meta === "comment") {
                    onNavigateToGuest();
                    return;
                  }
                  onNavigateToCharacterWorks(item.characterId);
                }}
                className="archive-row flex w-full items-center justify-between px-4 py-2.5 text-left"
              >
                <span>
                  <TextGlitch className="block text-sm font-semibold" text={item.title} />
                  <TextGlitch className="text-xs text-emerald-100/50" text={item.meta} />
                </span>
                <TextGlitch className="text-xs text-emerald-100/60" text={item.date} />
              </button>
            ))}
          </ArchiveMotion>
        </div>

        <div className="glass-card p-5">
          <h3 className="board-title">
            <TextGlitch text="OC Files" />
          </h3>
          <ArchiveMotion
            variant="stagger"
            motionKey={`home-oc-${characters.length}`}
            className="mt-4 grid gap-2"
          >
            {characters.map((character) => (
              <button
                key={character.id}
                type="button"
                onClick={() => onNavigateToCharacterDetail(character.id)}
                className="archive-row flex w-full items-end gap-2 px-4 py-3 text-left"
              >
                <TextGlitch className="font-serif text-base font-semibold" text={character.name} />
                <TextGlitch
                  className="translate-y-0.5 text-[9px] tracking-[0.22em] text-emerald-100/45 uppercase"
                  text={character.id}
                />
              </button>
            ))}
          </ArchiveMotion>
        </div>
      </ArchiveMotion>
    </div>
  );
}
