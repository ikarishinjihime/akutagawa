"use client";

import { cn } from "@/utils/cn";
import { ArchiveMotion } from "@/components/home/ArchiveMotion";
import { ThumbnailImage } from "@/components/ThumbnailImage";
import type { PersonalHomeBanner } from "@/lib/types";

interface ExtractSectionProps {
  banners: PersonalHomeBanner[];
  className?: string;
}

function bannerOpensInNewTab(linkUrl: string) {
  return !linkUrl.startsWith("/") || linkUrl.startsWith("//");
}

export function ExtractSection({ banners, className }: ExtractSectionProps) {
  return (
    <ArchiveMotion
      as="section"
      variant="scan"
      motionKey="extract"
      className={cn("glass-card p-6 md:p-8", className)}
    >
      <p className="archive-kicker">BANNER</p>
      <h3 className="archive-title mt-3 font-serif text-5xl">Banner</h3>

      <ArchiveMotion
        variant="stagger"
        motionKey={`extract-banners-${banners.length}`}
        className="mt-5 flex flex-col gap-3"
      >
        {banners.length > 0 ? (
          banners.map((banner) => (
            <a
              key={banner.id}
              href={banner.linkUrl}
              target={bannerOpensInNewTab(banner.linkUrl) ? "_blank" : undefined}
              rel={bannerOpensInNewTab(banner.linkUrl) ? "noopener noreferrer" : undefined}
              title={banner.label || undefined}
              className="extract-banner-link group"
            >
              <ThumbnailImage
                image={banner.image}
                src={banner.image.url}
                alt={banner.label || "Banner"}
                className="extract-banner-image"
              />
            </a>
          ))
        ) : (
          <p className="archive-panel p-5 text-sm text-emerald-100/60">
            아직 등록된 배너가 없어요.
          </p>
        )}
      </ArchiveMotion>
    </ArchiveMotion>
  );
}
