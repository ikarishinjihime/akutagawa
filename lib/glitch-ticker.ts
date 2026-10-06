import { GLITCH_TICK_PULSE_MS } from "@/lib/glitch-style";

type GlitchPulseListener = () => void;

let timerId: number | null = null;
const listeners = new Set<GlitchPulseListener>();
let pulseSnapshot = 0;

function touchPulseSnapshot() {
  pulseSnapshot = typeof window !== "undefined" ? Date.now() : 0;
}

function runPulse() {
  // 백그라운드 탭에서는 글리치 위상을 돌릴 필요가 없습니다 — 깨어나면 다음 틱에 따라잡습니다.
  if (typeof document !== "undefined" && document.hidden) {
    return;
  }

  touchPulseSnapshot();
  listeners.forEach((listener) => {
    listener();
  });
}

export function subscribeGlitchPulse(listener: GlitchPulseListener) {
  listeners.add(listener);

  if (pulseSnapshot === 0) {
    touchPulseSnapshot();
  }

  if (timerId === null && typeof window !== "undefined") {
    timerId = window.setInterval(runPulse, GLITCH_TICK_PULSE_MS);
  }

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0 && timerId !== null) {
      window.clearInterval(timerId);
      timerId = null;
    }
  };
}

/** 구독 틱마다 갱신되는 캐시 값. getSnapshot은 동일 틱 내 항상 같은 참조를 반환해야 합니다. */
export function getGlitchPulseSnapshot() {
  if (pulseSnapshot === 0) {
    touchPulseSnapshot();
  }

  return pulseSnapshot;
}

export function getGlitchPulseServerSnapshot() {
  return 0;
}

/** @deprecated Use subscribeGlitchPulse */
export const subscribeGlitchTick = subscribeGlitchPulse;

/** @deprecated Use getGlitchPulseSnapshot */
export const getGlitchTickSnapshot = getGlitchPulseSnapshot;

/** @deprecated Use getGlitchPulseServerSnapshot */
export const getGlitchTickServerSnapshot = getGlitchPulseServerSnapshot;
