"use client";

import { useSyncExternalStore } from "react";
import { collection, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import type { Character } from "@/lib/types";
import { resolveCharacterBgmUrl } from "@/lib/bgm-catalog";
import { normalizeCharacterKind } from "@/lib/character-kind";
import { normalizeTextGlitch } from "@/lib/normalize-text-glitch";
import { normalizeProfileFields } from "@/lib/profile-fields";
import { normalizeRelationshipEntries } from "@/lib/relationship-entries";
import { normalizeCaseFileDetailTheme } from "@/lib/case-file-theme";
import { normalizeSubPages } from "@/lib/sub-pages";
import { resolveMetaFields, migrateLegacyMetaFieldGlitch } from "@/lib/meta-fields";
import { normalizePairMemberIds } from "@/lib/pair-members";
import { normalizeWorldEntries, normalizeWorks } from "@/utils/normalizers";

type CharactersState = {
  data: Character[];
  error: string | null;
};

type Listener = () => void;

const EMPTY_STATE: CharactersState = { data: [], error: null };

let state: CharactersState = EMPTY_STATE;
let unsubscribe: Unsubscribe | null = null;
const listeners = new Set<Listener>();

const emit = (next: CharactersState) => {
  state = next;
  listeners.forEach((listener) => listener());
};

const start = () => {
  if (unsubscribe) return;

  try {
    const db = getFirebaseDb();
    unsubscribe = onSnapshot(
      collection(db, "characters"),
      (snapshot) => {
      const nextData = snapshot.docs.map((characterDoc) => {
        const data = characterDoc.data() as Character & {
          profile?: { age?: string; height?: string; role?: string; keyword?: string };
        };
        const resolvedBgmUrl = resolveCharacterBgmUrl(data.bgmUrl);
        const normalizedDetailTheme = normalizeCaseFileDetailTheme(data.detailTheme);
        const metaFields = resolveMetaFields(data);
        const { bgmUrl: _bgmUrl, profile: legacyProfile, detailTheme: _detailTheme, ...rest } = data;
        return {
          ...rest,
          id: data.id || characterDoc.id,
          kind: normalizeCharacterKind(data.kind),
          metaFields,
          profileFields: normalizeProfileFields(data.profileFields, legacyProfile),
          works: normalizeWorks(data.works),
          settings: Array.isArray(data.settings) ? data.settings : [],
          settingSections: Array.isArray(data.settingSections) ? data.settingSections : [],
          relationships: Array.isArray(data.relationships) ? data.relationships : [],
          relationshipEntries: normalizeRelationshipEntries(data.relationshipEntries, data.relationships),
          images: Array.isArray(data.images) ? data.images : [],
          worldEntries: normalizeWorldEntries(data.worldEntries),
          subPages: normalizeSubPages(data.subPages),
          pairMemberIds: normalizePairMemberIds(data.pairMemberIds),
          textGlitch: migrateLegacyMetaFieldGlitch(normalizeTextGlitch(data.textGlitch), metaFields),
          ...(resolvedBgmUrl ? { bgmUrl: resolvedBgmUrl } : {}),
          ...(normalizedDetailTheme ? { detailTheme: normalizedDetailTheme } : {}),
        };
      });
      emit({ data: nextData, error: null });
    },
    (firestoreError) => {
      emit({ data: state.data, error: `Firestore 불러오기 실패: ${firestoreError.message}` });
    },
  );
  } catch (error) {
    emit({
      data: [],
      error: error instanceof Error ? error.message : "Firebase 연결에 실패했어요.",
    });
  }
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

const getSnapshot = (): CharactersState => state;
const getServerSnapshot = (): CharactersState => EMPTY_STATE;

/**
 * Firestore의 `characters` 컬렉션 싱글톤 구독을 읽습니다.
 * 첫 번째 호출 시 구독을 시작하고, 마지막 구독자가 사라지면 정리합니다.
 * 여러 컴포넌트가 동시에 호출해도 Firestore 구독은 1개만 유지됩니다.
 */
export const useCharacters = (): CharactersState => {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
};
