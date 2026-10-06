"use client";

import { useEffect } from "react";
import { StoryFormattedText } from "@/components/StoryFormattedText";
import { playPageTurnSound } from "@/lib/page-turn-sound";
import { cn } from "@/utils/cn";
import { ThumbnailImage } from "@/components/ThumbnailImage";
import { splitStoryParagraphs } from "@/lib/story-text";
import type { GalleryModalItem, ReaderModalItem } from "@/types/home.types";

interface ReaderModalProps {
  item: ReaderModalItem;
  onClose: () => void;
  onOpenGallery: (item: GalleryModalItem) => void;
  className?: string;
}

export function ReaderModal({ item, onClose, onOpenGallery, className }: ReaderModalProps) {
  const paragraphs = splitStoryParagraphs(item.work.body);

  useEffect(() => {
    playPageTurnSound();
  }, []);

  const handleClose = () => {
    playPageTurnSound();
    onClose();
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 grid place-items-center bg-black p-4",
        className,
      )}
      role="dialog"
      aria-modal="true"
      aria-label={`${item.work.title} 이북 보기`}
      onClick={handleClose}
    >
      <div
        className="ebook-reader story-viewer dossier-viewer flex h-[92vh] w-full max-w-3xl flex-col overflow-hidden border !border-stone-700/30 !bg-black !shadow-none"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="story-viewer-header flex items-center justify-between gap-3 border-b border-stone-400/15 bg-black p-4">
          <div>
            <p className="archive-kicker">Ebook Reader / {item.character.name}</p>
            <h3 className="archive-title mt-1 text-2xl">{item.work.title}</h3>
            <p className="mt-1 text-xs text-emerald-100/45">
              {item.work.kind} / {item.work.date}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="archive-submit-button px-3 py-2 text-sm"
          >
            닫기
          </button>
        </div>

        <article className="story-viewer-body min-h-0 flex-1 overflow-y-auto overscroll-contain !bg-black">
          <div className="story-viewer-content px-7 py-8 md:px-12 md:py-10">
            {(item.work.images?.length ?? 0) > 0 && (
              <div className="mb-8 grid gap-3 sm:grid-cols-2">
                {item.work.images?.map((image) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => onOpenGallery({ image, character: item.character })}
                    className="gallery-tile group block text-left"
                  >
                    <div className="aspect-[4/3] overflow-hidden">
                      <ThumbnailImage
                        image={image}
                        src={image.url}
                        alt="첨부 이미지"
                        className="opacity-95 transition group-hover:opacity-100"
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}
            {paragraphs.length > 0 ? (
              paragraphs.map((paragraph, index) => (
                <p key={index} className="story-viewer-paragraph">
                  <StoryFormattedText text={paragraph} preserveWhitespace />
                </p>
              ))
            ) : (
              <p className="story-viewer-paragraph plain-empty-note">내용이 없어요.</p>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
