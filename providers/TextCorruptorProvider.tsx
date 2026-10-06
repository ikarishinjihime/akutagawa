"use client";

import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useRef } from "react";
import { TEXT_CORRUPTOR_CHARS } from "@/lib/glitch-display";

interface TextCorruptorProviderProps {
  children: ReactNode;
}

type CorruptCandidate =
  | {
      type: "text";
      node: Text;
      value: string;
    }
  | {
      type: "attribute";
      element: HTMLElement;
      attribute: "data-character-id";
      value: string;
    };

type RestoreAction = () => void;

const DEFAULT_GLITCH_CHARS = [...TEXT_CORRUPTOR_CHARS];
const CORRUPT_INTERVALS_MS = [4000, 5000, 6000, 7000, 8000];
const CORRUPT_VISIBLE_MS = 520;
const CORRUPT_COUNT = 5;
const CORRUPT_CHARS_PER_NODE = 2;

function getRandomItem<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Fisher–Yates 셔플로 앞쪽 k개를 균등 무작위로 뽑는다.
 * Array.sort(() => Math.random() - 0.5) 방식은 분포가 편향되어 초반 항목만 자주 선택되는 문제가 있어 사용하지 않는다.
 */
function pickRandomSample<T>(items: T[], count: number) {
  const copy = [...items];
  const sampleSize = Math.min(count, copy.length);

  for (let i = 0; i < sampleSize; i += 1) {
    const swapIndex = i + Math.floor(Math.random() * (copy.length - i));
    [copy[i], copy[swapIndex]] = [copy[swapIndex], copy[i]];
  }

  return copy.slice(0, sampleSize);
}

/**
 * 후보 인덱스 중 이미 선택된 인덱스와 인접하지 않은 것을 우선해서 count개를 뽑는다.
 * 인접한 글자가 동시에 손상되면 한 단어가 한꺼번에 무너져 보이므로 이를 피한다.
 */
function pickNonAdjacentSample(items: number[], count: number) {
  const shuffled = pickRandomSample(items, items.length);
  const picked: number[] = [];

  for (const index of shuffled) {
    if (picked.length >= count) break;
    if (picked.some((p) => Math.abs(p - index) <= 1)) continue;
    picked.push(index);
  }

  return picked;
}

/**
 * 텍스트에서 무작위로 최대 maxCorruptChars개의 글자를 글리치 문자로 치환한다.
 * 공백이 아닌 글자가 있어야 하며, preserveFirstLetter가 true면 첫 글자는 보존한다.
 * 선택되는 인덱스끼리는 서로 붙어있지 않도록 한다.
 */
function corruptText(text: string, preserveFirstLetter = false) {
  const characters = text.split("");
  const startIndex = preserveFirstLetter ? 1 : 0;
  const eligibleIndexes: number[] = [];

  for (let i = startIndex; i < characters.length; i += 1) {
    if (characters[i].trim()) {
      eligibleIndexes.push(i);
    }
  }

  if (eligibleIndexes.length === 0) {
    return text;
  }

  const targetIndexes = pickNonAdjacentSample(eligibleIndexes, CORRUPT_CHARS_PER_NODE);
  for (const targetIndex of targetIndexes) {
    characters[targetIndex] = getRandomItem(DEFAULT_GLITCH_CHARS);
  }

  return characters.join("");
}

function isCorruptableElement(element: Element) {
  if (
    element.closest(
      "script, style, noscript, textarea, select, option, [data-text-corruptor-ignore], .case-file-intro-text, .case-file-voice-text, .case-file-name, .archive-card-intro",
    )
  ) {
    return false;
  }

  /* checkVisibility 는 getComputedStyle 객체 생성 + getClientRects 강제 레이아웃보다
     훨씬 싸게 같은 판정을 내립니다 — 이 함수는 페이지의 모든 텍스트 노드마다 불립니다. */
  if (typeof element.checkVisibility === "function") {
    return element.checkVisibility({ checkVisibilityCSS: true });
  }

  const style = window.getComputedStyle(element);
  return (
    style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0
  );
}

function collectCorruptCandidates() {
  const candidates: CorruptCandidate[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      const value = node.nodeValue?.trim() ?? "";

      if (!parent || value.length < 2 || !isCorruptableElement(parent)) {
        return NodeFilter.FILTER_REJECT;
      }

      return NodeFilter.FILTER_ACCEPT;
    },
  });

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    candidates.push({ type: "text", node, value: node.nodeValue ?? "" });
  }

  document.querySelectorAll<HTMLElement>("[data-character-id]").forEach((element) => {
    const value = element.getAttribute("data-character-id") ?? "";

    if (value.length >= 2 && isCorruptableElement(element)) {
      candidates.push({ type: "attribute", element, attribute: "data-character-id", value });
    }
  });

  return candidates;
}

function applyCorruption(candidates: CorruptCandidate[]) {
  return candidates.map<RestoreAction>((candidate) => {
    if (candidate.type === "attribute") {
      candidate.element.setAttribute(candidate.attribute, corruptText(candidate.value, true));

      return () => {
        if (candidate.element.isConnected) {
          candidate.element.setAttribute(candidate.attribute, candidate.value);
        }
      };
    }

    candidate.node.nodeValue = corruptText(candidate.value);

    return () => {
      if (candidate.node.isConnected) {
        candidate.node.nodeValue = candidate.value;
      }
    };
  });
}

export function TextCorruptorProvider({ children }: TextCorruptorProviderProps) {
  const pathname = usePathname();
  const enabled = !pathname.startsWith("/admin");
  const restoreActionsRef = useRef<RestoreAction[]>([]);

  useEffect(() => {
    if (!enabled) {
      restoreActionsRef.current.forEach((restore) => restore());
      restoreActionsRef.current = [];
      return;
    }

    let corruptTimer: number | undefined;
    let clearTimer: number | undefined;
    let idleHandle: number | undefined;

    const restoreTexts = () => {
      restoreActionsRef.current.forEach((restore) => restore());
      restoreActionsRef.current = [];
    };

    /* DOM 전체 순회는 프레임 사이 여유 시간에 돌립니다 — 페이지 넘김 같은
       애니메이션 프레임과 겹치면 그 한 프레임이 통째로 밀립니다. */
    const runWhenIdle = (work: () => void) => {
      if ("requestIdleCallback" in window) {
        idleHandle = window.requestIdleCallback(() => work(), { timeout: 1500 });
        return;
      }
      work();
    };

    const scheduleNextCorruption = () => {
      corruptTimer = window.setTimeout(() => {
        // 안 보이는 탭에서는 손상을 걸지 않고 다음 차례로 넘어갑니다.
        if (document.hidden) {
          scheduleNextCorruption();
          return;
        }

        runWhenIdle(() => {
          restoreTexts();

          const candidates = collectCorruptCandidates();
          const selectedCandidates = pickRandomSample(candidates, CORRUPT_COUNT);

          restoreActionsRef.current = applyCorruption(selectedCandidates);
          clearTimer = window.setTimeout(() => {
            restoreTexts();
            scheduleNextCorruption();
          }, CORRUPT_VISIBLE_MS);
        });
      }, getRandomItem(CORRUPT_INTERVALS_MS));
    };

    scheduleNextCorruption();

    return () => {
      if (corruptTimer) window.clearTimeout(corruptTimer);
      if (clearTimer) window.clearTimeout(clearTimer);
      if (idleHandle !== undefined && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleHandle);
      }
      restoreTexts();
    };
  }, [enabled]);

  return <>{children}</>;
}
