"use client";

import { useSyncExternalStore } from "react";
import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import type { HomeContent } from "@/lib/types";

type SiteContentRaw = Partial<HomeContent>;

type SiteContentState = {
  data: SiteContentRaw;
  error: string | null;
};

type Listener = () => void;

const EMPTY_STATE: SiteContentState = { data: {}, error: null };

const createSiteContentStore = (docName: "home" | "archive", errorLabel: string) => {
  let state: SiteContentState = EMPTY_STATE;
  let unsubscribe: Unsubscribe | null = null;
  const listeners = new Set<Listener>();

  const emit = (next: SiteContentState) => {
    state = next;
    listeners.forEach((listener) => listener());
  };

  const start = () => {
    if (unsubscribe) return;
    const db = getFirebaseDb();
    unsubscribe = onSnapshot(
      doc(db, "site", docName),
      (snapshot) => {
        const data = (snapshot.data() as SiteContentRaw | undefined) ?? {};
        emit({ data, error: null });
      },
      (firestoreError) => {
        emit({ data: state.data, error: `${errorLabel} 불러오기 실패: ${firestoreError.message}` });
      },
    );
  };

  const stop = () => {
    unsubscribe?.();
    unsubscribe = null;
    state = EMPTY_STATE;
  };

  const subscribe = (listener: Listener) => {
    listeners.add(listener);
    if (listeners.size === 1) start();

    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) stop();
    };
  };

  return {
    subscribe,
    getSnapshot: () => state,
    getServerSnapshot: () => EMPTY_STATE,
  };
};

const homeStore = createSiteContentStore("home", "홈 문구");
const archiveStore = createSiteContentStore("archive", "보관소 문구");

type SiteContentResult = {
  content: HomeContent;
  error: string | null;
};

const withFallback = (state: SiteContentState, fallback: HomeContent): SiteContentResult => ({
  content: {
    eyebrow: state.data.eyebrow || fallback.eyebrow,
    title: state.data.title || fallback.title,
    body: state.data.body || fallback.body,
  },
  error: state.error,
});

/**
 * Firestore의 `site/home` 문서 싱글톤 구독을 읽습니다.
 * 비어 있는 필드는 호출 시점에 fallback 값으로 대체됩니다.
 */
export const useHomeContent = (fallback: HomeContent): SiteContentResult => {
  const state = useSyncExternalStore(
    homeStore.subscribe,
    homeStore.getSnapshot,
    homeStore.getServerSnapshot,
  );
  return withFallback(state, fallback);
};

/**
 * Firestore의 `site/archive` 문서 싱글톤 구독을 읽습니다.
 * 비어 있는 필드는 호출 시점에 fallback 값으로 대체됩니다.
 */
export const useArchiveContent = (fallback: HomeContent): SiteContentResult => {
  const state = useSyncExternalStore(
    archiveStore.subscribe,
    archiveStore.getSnapshot,
    archiveStore.getServerSnapshot,
  );
  return withFallback(state, fallback);
};
