"use client";

import { cn } from "@/utils/cn";
import type { GalleryModalItem } from "@/types/home.types";

interface GalleryModalProps {
  item: GalleryModalItem;
  zoom: number;
  onZoomChange: (next: number) => void;
  onClose: () => void;
  className?: string;
}

export function GalleryModal({ item, zoom, onZoomChange, onClose, className }: GalleryModalProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 grid place-items-center bg-black/82 p-4 backdrop-blur-sm",
        className,
      )}
      role="dialog"
      aria-modal="true"
      aria-label={`${item.character.name} 이미지 확대 보기`}
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
            <h3 className="archive-title mt-1 text-2xl">이미지 확대 보기</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="archive-submit-button px-3 py-2 text-sm"
          >
            닫기
          </button>
        </div>
        <div
          className="max-h-[72vh] overflow-auto overscroll-contain bg-black/40 p-4"
          onWheel={(event) => {
            event.preventDefault();
            event.stopPropagation();
            const currentTarget = event.currentTarget;
            const scrollLeft = currentTarget.scrollLeft;
            const scrollTop = currentTarget.scrollTop;
            onZoomChange(zoom + (event.deltaY < 0 ? 0.12 : -0.12));
            requestAnimationFrame(() => {
              currentTarget.scrollLeft = scrollLeft;
              currentTarget.scrollTop = scrollTop;
            });
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are user uploads and are displayed at original size in the modal. */}
          <img
            src={item.image.url}
            alt={`${item.character.name} 이미지`}
            className="mx-auto h-auto max-w-none object-contain select-none"
            style={{
              width: `${zoom * 100}%`,
            }}
            draggable={false}
          />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-stone-400/15 p-4 text-xs text-emerald-100/60">
          <span className="mr-auto text-emerald-100/50">휠로 확대/축소 가능</span>
          <button
            type="button"
            onClick={() => onZoomChange(zoom - 0.2)}
            className="archive-row px-3 py-2 text-emerald-50"
          >
            축소
          </button>
          <button
            type="button"
            onClick={() => onZoomChange(1)}
            className="archive-row px-3 py-2 text-emerald-50"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() => onZoomChange(zoom + 0.2)}
            className="archive-row px-3 py-2 text-emerald-50"
          >
            확대
          </button>
        </div>
      </div>
    </div>
  );
}
