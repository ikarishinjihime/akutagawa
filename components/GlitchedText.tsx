"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GlitchZoneMark } from "@/components/GlitchZoneMark";
import { TextGlitch } from "@/components/TextGlitch";
import { glitchConfigSignature, reanchorGlitchConfig } from "@/lib/glitch-fields";
import {
  DEFAULT_GLITCH_TICK_MS,
  glitchScramblePhase,
  mergeGlitchZoneStyles,
} from "@/lib/glitch-style";
import {
  fieldConfigHasScrambleAlternation,
  resolveZoneScrambleOptions,
} from "@/lib/glitch-scramble-options";
import { getGlitchPulseSnapshot, subscribeGlitchPulse } from "@/lib/glitch-ticker";
import { buildZoneDisplayText, composeTextSegments } from "@/lib/text-scramble";
import { sanitizePlainText } from "@/lib/glitch-display";
import type { FieldGlitchConfig, ZoneLinkTarget } from "@/lib/types";
import { cn } from "@/utils/cn";
import { resolveZoneLink, type CharacterDetailSection } from "@/lib/zone-links";

/**
 * 펄스(100ms)마다 위상이 실제로 바뀌는지 검사하기 위한 서명 —
 * 구간별 tickMs(기본 800ms)가 넘어갈 때만 값이 달라집니다.
 */
function computePhaseSignature(zones: FieldGlitchConfig["zones"], config: FieldGlitchConfig, pulse: number) {
  let signature = "";
  for (const zone of zones) {
    const tickMs =
      resolveZoneScrambleOptions(zone, config).tickMs ?? config.tickMs ?? DEFAULT_GLITCH_TICK_MS;
    signature += `${glitchScramblePhase(pulse, tickMs)}|`;
  }
  return signature;
}

interface GlitchedTextProps {
  text: string;
  glitch?: FieldGlitchConfig;
  className?: string;
  glitchClassName?: string;
  preserveWhitespace?: boolean;
  useCssGlitchFallback?: boolean;
  /** false면 관리자 미리보기처럼 번갈아 바뀌지 않고 고정 표시 */
  animate?: boolean;
  onZoneLinkClick?: (target: ZoneLinkTarget) => void;
  linkContext?: {
    section: CharacterDetailSection;
    characterId: string;
  };
}

interface GlitchedTextLiveProps {
  text: string;
  glitch: FieldGlitchConfig;
  className?: string;
  glitchClassName?: string;
  preserveWhitespace?: boolean;
  animate?: boolean;
  onZoneLinkClick?: (target: ZoneLinkTarget) => void;
  linkContext?: {
    section: CharacterDetailSection;
    characterId: string;
  };
}

function GlitchedTextLive({
  text,
  glitch,
  className,
  glitchClassName,
  preserveWhitespace = false,
  animate = true,
  onZoneLinkClick,
  linkContext,
}: GlitchedTextLiveProps) {
  const usesErrorAlternation = fieldConfigHasScrambleAlternation(glitch);
  const zones = glitch.zones;

  /* 공용 펄스는 100ms마다 오지만, 구간 위상이 넘어갈 때만 setState 합니다 —
     그 사이 틱은 문자열 비교 한 번으로 끝나 리렌더가 일어나지 않습니다.
     초기값 0은 서버 스냅숏과 같아 hydration 이 어긋나지 않습니다. */
  const [pulse, setPulse] = useState(0);
  const phaseSignatureRef = useRef("");

  useEffect(() => {
    if (!animate || !usesErrorAlternation) {
      return;
    }

    const syncPulse = () => {
      const nextPulse = getGlitchPulseSnapshot();
      const nextSignature = computePhaseSignature(zones, glitch, nextPulse);
      if (nextSignature === phaseSignatureRef.current) {
        return;
      }
      phaseSignatureRef.current = nextSignature;
      setPulse(nextPulse);
    };

    syncPulse();
    return subscribeGlitchPulse(syncPulse);
  }, [animate, glitch, usesErrorAlternation, zones]);

  const displayByZone = useMemo(() => {
    if (!usesErrorAlternation) {
      return buildZoneDisplayText(zones, glitch, { fixedPhase: 0 });
    }

    if (!animate) {
      return buildZoneDisplayText(zones, glitch, { fixedPhase: 1 });
    }

    return buildZoneDisplayText(zones, glitch, { pulse });
  }, [animate, glitch, pulse, usesErrorAlternation, zones]);

  const segments = useMemo(
    () => composeTextSegments(text, zones, displayByZone),
    [displayByZone, text, zones],
  );

  const zoneStyleById = useMemo(
    () =>
      Object.fromEntries(
        zones.map((zone) => [zone.id, mergeGlitchZoneStyles(zone.style, glitch.defaultStyle)]),
      ),
    [glitch.defaultStyle, zones],
  );
  const zoneLinkById = useMemo(
    () =>
      Object.fromEntries(
        zones
          .map((zone) => {
            const target = resolveZoneLink(zone, linkContext);
            return target ? ([zone.id, target] as const) : null;
          })
          .filter((entry): entry is readonly [string, ZoneLinkTarget] => entry !== null),
      ),
    [linkContext, zones],
  );

  return (
    <span
      className={cn(className, preserveWhitespace && "whitespace-pre-line")}
      data-text-corruptor-ignore
    >
      {segments.map((segment, index) =>
        segment.type === "plain" ? (
          <span key={`plain-${index}`}>{segment.text}</span>
        ) : (
          <GlitchZoneMark
            key={segment.zoneId}
            text={segment.text}
            original={segment.original}
            zoneStyle={zoneStyleById[segment.zoneId]}
            linkTarget={zoneLinkById[segment.zoneId]}
            onLinkClick={onZoneLinkClick}
            className={glitchClassName}
          />
        ),
      )}
    </span>
  );
}

export function GlitchedText({
  text,
  glitch,
  className,
  glitchClassName,
  preserveWhitespace = false,
  useCssGlitchFallback = false,
  animate = true,
  onZoneLinkClick,
  linkContext,
}: GlitchedTextProps) {
  const safeText = useMemo(() => sanitizePlainText(text), [text]);
  const loopSignature = glitchConfigSignature(safeText, glitch);

  const resolvedGlitch = useMemo(
    () => (loopSignature ? reanchorGlitchConfig(safeText, glitch) : undefined),
    [glitch, loopSignature, safeText],
  );

  const hasLiveGlitch = Boolean(loopSignature && resolvedGlitch && resolvedGlitch.zones.length > 0);

  if (!hasLiveGlitch || !resolvedGlitch) {
    if (useCssGlitchFallback) {
      return <TextGlitch className={cn(className, glitchClassName)} text={safeText} />;
    }

    return (
      <span className={cn(className, preserveWhitespace && "whitespace-pre-line")}>{safeText}</span>
    );
  }

  return (
    <GlitchedTextLive
      text={safeText}
      glitch={resolvedGlitch}
      className={className}
      glitchClassName={glitchClassName}
      preserveWhitespace={preserveWhitespace}
      animate={animate}
      onZoneLinkClick={onZoneLinkClick}
      linkContext={linkContext}
    />
  );
}
