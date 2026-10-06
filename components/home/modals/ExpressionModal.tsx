"use client";

import { cn } from "@/utils/cn";
import { ThumbnailImage } from "@/components/ThumbnailImage";
import type { ExpressionModalItem, GalleryModalItem } from "@/types/home.types";

interface ExpressionModalProps {
  item: ExpressionModalItem;
  onClose: () => void;
  onOpenGallery: (item: GalleryModalItem) => void;
  className?: string;
}

export function ExpressionModal({ item, onClose, onOpenGallery, className }: ExpressionModalProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 grid place-items-center bg-black/86 p-4 backdrop-blur-sm",
        className,
      )}
      role="dialog"
      aria-modal="true"
      aria-label={`${item.character.name} 스탠딩 표정 보기`}
      onClick={onClose}
    >
      <div
        className="dossier-viewer max-h-[92vh] w-full max-w-5xl overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-stone-400/15 p-4">
          <div>
            <p className="archive-kicker">
              {item.character.name}
            </p>
            <h3 className="archive-title mt-1 text-2xl">스탠딩 표정 모음</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="archive-submit-button px-3 py-2 text-sm"
          >
            닫기
          </button>
        </div>
        <div className="max-h-[76vh] overflow-y-auto p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {item.images.map((image) => (
              <article key={image.id} className="gallery-tile">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenGallery({ image, character: item.character });
                  }}
                  className="block w-full text-left"
                >
                  <div className="aspect-[3/4] overflow-hidden bg-black">
                    <ThumbnailImage
                      image={image}
                      src={image.url}
                      alt="스탠딩 이미지"
                    />
                  </div>
                </button>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
