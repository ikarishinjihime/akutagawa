"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  appHistoryStatesEqual,
  buildAppHistoryUrl,
  createAppHistoryState,
  parseAppHistoryState,
  readAppHistoryStateFromUrl,
} from "@/lib/app-history";
import type { AppHistoryState } from "@/types/home.types";

type UseAppHistoryNavigationOptions = {
  state: AppHistoryState;
  applyState: (state: AppHistoryState) => void;
};

/**
 * SPA 화면 전환을 browser history와 동기화합니다.
 * 뒤로가기(브라우저·앱 버튼) 시 직전 화면으로 복원됩니다.
 */
export const useAppHistoryNavigation = ({ state, applyState }: UseAppHistoryNavigationOptions) => {
  const depthRef = useRef(1);
  const skipPushRef = useRef(false);
  const mountedRef = useRef(false);
  const [canGoBack, setCanGoBack] = useState(false);

  const syncCanGoBack = useCallback(() => {
    setCanGoBack(depthRef.current > 1);
  }, []);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      skipPushRef.current = true;
      depthRef.current = Math.max(1, depthRef.current - 1);
      syncCanGoBack();

      const parsed = parseAppHistoryState(event.state);
      if (parsed) {
        applyState(parsed);
        return;
      }

      applyState(createAppHistoryState({ section: "home" }));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [applyState, syncCanGoBack]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!mountedRef.current) {
      mountedRef.current = true;
      const fromUrl = readAppHistoryStateFromUrl(window.location.search);
      if (fromUrl) {
        skipPushRef.current = true;
        applyState(fromUrl);
        window.history.replaceState(fromUrl, "", buildAppHistoryUrl(fromUrl));
      } else {
        window.history.replaceState(state, "", buildAppHistoryUrl(state));
      }
      syncCanGoBack();
      return;
    }

    if (skipPushRef.current) {
      skipPushRef.current = false;
      return;
    }

    const current = parseAppHistoryState(window.history.state);
    if (current && appHistoryStatesEqual(current, state)) {
      return;
    }

    const url = buildAppHistoryUrl(state);
    window.history.pushState(state, "", url);
    depthRef.current += 1;
    syncCanGoBack();
  }, [state, syncCanGoBack, applyState]);

  const goBack = useCallback(() => {
    if (depthRef.current <= 1) {
      return false;
    }

    window.history.back();
    return true;
  }, []);

  return {
    canGoBack,
    goBack,
  };
};
