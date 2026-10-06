"use client";

import { type FormEvent } from "react";
import type { User } from "firebase/auth";
import { cn } from "@/utils/cn";
import { ArchiveMotion } from "@/components/home/ArchiveMotion";
import type { GuestbookEntry } from "@/lib/types";

type GuestDraft = {
  name: string;
  body: string;
};

interface GuestSectionProps {
  guestbook: GuestbookEntry[];
  guestDraft: GuestDraft;
  onDraftChange: (next: GuestDraft) => void;
  authUser: User | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  className?: string;
}

export function GuestSection({
  guestbook,
  guestDraft,
  onDraftChange,
  authUser,
  onSubmit,
  className,
}: GuestSectionProps) {
  return (
    <ArchiveMotion
      as="section"
      variant="scan"
      motionKey="guest"
      className={cn("glass-card p-6 md:p-8", className)}
    >
      <p className="archive-kicker">Visitor Log</p>
      <h3 className="archive-title mt-2 font-serif text-5xl">방명록</h3>
      <form onSubmit={onSubmit} className="archive-panel mt-5 grid gap-3 p-4">
        <input
          value={guestDraft.name}
          onChange={(event) => onDraftChange({ ...guestDraft, name: event.target.value })}
          placeholder="이름 (비우면 익명)"
          disabled={!authUser}
          className="archive-input px-4 py-3 text-sm outline-none"
        />
        <textarea
          value={guestDraft.body}
          onChange={(event) => onDraftChange({ ...guestDraft, body: event.target.value })}
          placeholder={
            authUser ? "남기고 싶은 말을 적어주세요." : "로그인 후 방명록을 남길 수 있어요."
          }
          disabled={!authUser}
          className="archive-input min-h-24 px-4 py-3 text-sm leading-7 outline-none"
        />
        {!authUser && (
          <p className="text-xs text-stone-300/70">방명록 작성은 로그인 후 가능합니다.</p>
        )}
        <button
          disabled={!authUser}
          className="archive-submit-button justify-self-end px-5 py-2 text-sm font-semibold disabled:opacity-50"
        >
          남기기
        </button>
      </form>
      <ArchiveMotion
        variant="stagger"
        motionKey={`guest-entries-${guestbook.length}`}
        className="mt-6 space-y-4"
      >
        {guestbook.map((guest, index) => (
          <article key={guest.id} className="archive-panel p-5">
            <p className="archive-kicker">
              No.{guestbook.length - index} {guest.name}
            </p>
            <p className="mt-3 text-sm leading-7 text-emerald-50/75">{guest.body}</p>
            {guest.reply && (
              <div className="mt-4 border border-stone-400/15 bg-black/35 p-4 text-sm text-emerald-50/70">
                답글: {guest.reply}
              </div>
            )}
          </article>
        ))}
        {guestbook.length === 0 && (
          <p className="archive-panel p-5 text-sm text-emerald-50/55">
            아직 남겨진 방명록이 없어요.
          </p>
        )}
      </ArchiveMotion>
    </ArchiveMotion>
  );
}
