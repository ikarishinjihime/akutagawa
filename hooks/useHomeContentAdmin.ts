"use client";

import { type Dispatch, type FormEvent, type SetStateAction, useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useHomeContent } from "@/hooks/useSiteContent";
import { getFirebaseDb } from "@/lib/firebase";
import type { HomeContent } from "@/lib/types";

/**
 * 관리자 폼 초기값 — 공개 페이지용 `defaultHomeContent`(constants/home)와 달리 필드는 빈 문자열입니다.
 */
const emptyHomeContent: HomeContent = {
  eyebrow: "",
  title: "",
  body: "",
  notice: "",
};

type UseHomeContentAdminOptions = {
  isAdmin: boolean;
};

/**
 * 관리자 홈 상단 문구 편집 상태입니다.
 * 읽기는 useHomeContent 싱글톤 구독을 재사용하고, 편집 중일 때만 로컬 override를 둡니다.
 * (effect로 스냅샷→draft를 복사하지 않아 입력 중 덮어쓰기·set-state-in-effect를 피합니다.)
 */
export const useHomeContentAdmin = ({ isAdmin }: UseHomeContentAdminOptions) => {
  const { content: remoteContent, error: homeError } = useHomeContent(emptyHomeContent);
  const [draftOverride, setDraftOverride] = useState<HomeContent | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState("");

  const homeContent = draftOverride ?? remoteContent;

  const setHomeContent: Dispatch<SetStateAction<HomeContent>> = (updater) => {
    setDraftOverride((current) => {
      const base = current ?? remoteContent;
      return typeof updater === "function" ? updater(base) : updater;
    });
  };

  const saveHomeContent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isAdmin) {
      setSaveNotice("관리자만 홈 문구를 저장할 수 있어요.");
      return;
    }

    try {
      setIsSaving(true);
      const noticeText = (homeContent.notice ?? "").trim().slice(0, 1000);
      const next: HomeContent = {
        eyebrow: homeContent.eyebrow.trim() || emptyHomeContent.eyebrow,
        title: homeContent.title.trim() || emptyHomeContent.title,
        body: homeContent.body.trim() || emptyHomeContent.body,
        notice: noticeText,
      };
      await setDoc(
        doc(getFirebaseDb(), "site", "home"),
        {
          ...next,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      setDraftOverride(next);
      setSaveNotice("홈 문구를 저장했어요.");
    } catch (error) {
      setSaveNotice(error instanceof Error ? error.message : "홈 문구 저장에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  return {
    homeContent,
    setHomeContent,
    isSaving,
    notice: homeError || saveNotice,
    saveHomeContent,
  };
};
