"use client";

import { type ComponentPropsWithoutRef, type ElementType, type ReactNode } from "react";
import { cn } from "@/utils/cn";

type ArchiveMotionVariant = "enter" | "scan" | "stagger";

type ArchiveMotionProps<T extends ElementType = "div"> = {
  children: ReactNode;
  className?: string;
  motionKey?: string | number;
  variant?: ArchiveMotionVariant;
  as?: T;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

/**
 * 섹션 래퍼. 진입 시 opacity/transform 애니메이션은 사용하지 않는다.
 * (페이지 로드마다 텍스트가 흐려졌다가 선명해지는 현상을 방지)
 */
export function ArchiveMotion<T extends ElementType = "div">({
  children,
  className,
  motionKey: _motionKey,
  variant = "enter",
  as,
  style,
  ...rest
}: ArchiveMotionProps<T>) {
  const Tag = (as ?? "div") as ElementType;

  return (
    <Tag
      className={cn(
        variant === "stagger" ? "archive-motion-stagger" : "archive-motion-host",
        className,
      )}
      style={style}
      {...rest}
    >
      {children}
    </Tag>
  );
}
