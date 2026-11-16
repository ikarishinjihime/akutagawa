"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { getFirebaseDb } from "@/lib/firebase";
import { convertToYomi } from "@/lib/yomi-convert";

const KEY_STORAGE = "yomi-gemini-key";

type SavedYomi = {
  id: string;
  title: string;
  source: string;
  result: string;
};

type Status = { text: string; isError: boolean };

/** 저장본은 로그인한 계정 아래(users/{uid}/yomi)에 둡니다. 쓰기는 관리자만 됩니다. */
function yomiCollection(uid: string) {
  return collection(getFirebaseDb(), "users", uid, "yomi");
}

function YomiWorkspace({ uid }: { uid: string }) {
  // 로그인 뒤에만 마운트되므로(서버 렌더 없음) 초기값에서 바로 읽습니다.
  const [apiKey, setApiKey] = useState(() => window.localStorage.getItem(KEY_STORAGE) ?? "");
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [result, setResult] = useState("");
  const [showSource, setShowSource] = useState(true);
  const [status, setStatus] = useState<Status>({ text: "", isError: false });
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState<SavedYomi[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const aborterRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return onSnapshot(
      query(yomiCollection(uid), orderBy("updatedAt", "desc")),
      (snapshot) => {
        setSaved(
          snapshot.docs.map((entry) => ({
            id: entry.id,
            title: String(entry.data().title ?? ""),
            source: String(entry.data().source ?? ""),
            result: String(entry.data().result ?? ""),
          })),
        );
      },
      () => {
        setStatus({
          text: "저장 목록을 불러오지 못했어요. Firestore 규칙을 확인해주세요.",
          isError: true,
        });
      },
    );
  }, [uid]);

  const sourceLines = source.replace(/\r/g, "").split("\n");
  const resultLines = result ? result.split("\n") : [];

  const editLine = (index: number, value: string) => {
    setResult(resultLines.map((line, i) => (i === index ? value : line)).join("\n"));
  };

  const run = async () => {
    const key = apiKey.trim();
    const lyrics = source.replace(/\r/g, "").trim();

    if (!key) {
      setStatus({ text: "Gemini API 키를 입력해주세요.", isError: true });
      return;
    }
    if (!lyrics) {
      setStatus({ text: "가사를 붙여넣어주세요.", isError: true });
      return;
    }

    // 줄 번호가 결과와 맞도록 앞뒤 공백을 정리한 원문으로 맞춥니다.
    setSource(lyrics);
    setResult("");
    setIsEditing(false);
    setIsRunning(true);
    setStatus({ text: "변환 중…", isError: false });
    aborterRef.current = new AbortController();

    try {
      const text = await convertToYomi({
        apiKey: key,
        lyrics,
        signal: aborterRef.current.signal,
        onText: setResult,
        onRetry: (attempt, total) =>
          setStatus({ text: `서버가 혼잡해 다시 시도 중… (${attempt}/${total})`, isError: false }),
      });
      setResult(text);

      if (text.split("\n").length !== lyrics.split("\n").length) {
        setStatus({
          text: "완료. 줄 수가 원문과 달라 원문 대응이 어긋날 수 있어요.",
          isError: true,
        });
      } else {
        setStatus({ text: "완료", isError: false });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setStatus({ text: "중지했어요.", isError: false });
      } else if (error instanceof TypeError) {
        setStatus({ text: "API에 연결하지 못했어요. 네트워크를 확인해주세요.", isError: true });
      } else {
        setStatus({ text: error instanceof Error ? error.message : String(error), isError: true });
      }
    } finally {
      aborterRef.current = null;
      setIsRunning(false);
    }
  };

  const save = async () => {
    if (!result.trim()) {
      setStatus({ text: "저장할 변환 결과가 없어요.", isError: true });
      return;
    }

    const payload = {
      title: title.trim() || sourceLines.find((line) => line.trim())?.trim() || "제목 없음",
      source,
      result,
      updatedAt: serverTimestamp(),
    };

    try {
      setIsSaving(true);
      if (activeId) {
        await setDoc(doc(yomiCollection(uid), activeId), payload, { merge: true });
      } else {
        const created = await addDoc(yomiCollection(uid), payload);
        setActiveId(created.id);
      }
      setTitle(payload.title);
      setIsEditing(false);
      setStatus({ text: "저장했어요.", isError: false });
    } catch {
      setStatus({ text: "저장하지 못했어요. Firestore 규칙을 확인해주세요.", isError: true });
    } finally {
      setIsSaving(false);
    }
  };

  const open = (entry: SavedYomi) => {
    setActiveId(entry.id);
    setTitle(entry.title);
    setSource(entry.source);
    setResult(entry.result);
    setIsEditing(false);
    setStatus({ text: "", isError: false });
  };

  const startNew = () => {
    setActiveId(null);
    setTitle("");
    setSource("");
    setResult("");
    setIsEditing(false);
    setStatus({ text: "", isError: false });
  };

  const remove = async (entry: SavedYomi) => {
    if (!window.confirm(`"${entry.title}" 저장본을 삭제할까요? 되돌릴 수 없어요.`)) return;

    try {
      await deleteDoc(doc(yomiCollection(uid), entry.id));
      if (activeId === entry.id) startNew();
    } catch {
      setStatus({ text: "삭제하지 못했어요.", isError: true });
    }
  };

  const copyResult = async () => {
    await navigator.clipboard.writeText(result);
    setStatus({ text: "발음을 복사했어요.", isError: false });
  };

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[19rem_minmax(0,1fr)]">
      <aside className="glass-card grid gap-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="board-title">저장한 가사</h2>
          <button type="button" onClick={startNew} className="admin-ghost-btn text-xs">
            새로 만들기
          </button>
        </div>
        {saved.map((entry) => (
          <div
            key={entry.id}
            className={`flex items-center gap-2 border p-2 ${
              entry.id === activeId ? "border-emerald-200/60" : "border-emerald-100/10"
            } bg-black/30`}
          >
            <button
              type="button"
              onClick={() => open(entry)}
              className="min-w-0 flex-1 truncate text-left text-sm text-emerald-50"
            >
              {entry.title}
            </button>
            <button
              type="button"
              onClick={() => remove(entry)}
              className="shrink-0 border border-stone-400/35 px-2 py-1 text-xs text-stone-200"
            >
              삭제
            </button>
          </div>
        ))}
        {saved.length === 0 && (
          <p className="text-sm text-emerald-100/55">아직 저장한 가사가 없어요.</p>
        )}
      </aside>

      <section className="grid min-w-0 gap-5">
        <div className="glass-card grid gap-4 p-5 md:p-6">
          <label className="grid gap-2 text-sm text-emerald-100/75">
            Gemini API 키 (이 브라우저에만 저장돼요)
            <input
              type="password"
              value={apiKey}
              onChange={(event) => {
                setApiKey(event.target.value);
                window.localStorage.setItem(KEY_STORAGE, event.target.value.trim());
              }}
              autoComplete="off"
              className="auth-input"
            />
          </label>
          <label className="grid gap-2 text-sm text-emerald-100/75">
            제목
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="비워 두면 첫 줄이 제목이 돼요"
              className="auth-input"
            />
          </label>
          <label className="grid gap-2 text-sm text-emerald-100/75">
            일본어 가사
            <textarea
              value={source}
              onChange={(event) => setSource(event.target.value)}
              placeholder="가사를 붙여넣어주세요."
              className="auth-input min-h-72"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={run}
              disabled={isRunning}
              className="bg-emerald-200 px-5 py-2 text-sm font-semibold text-emerald-950 disabled:opacity-60"
            >
              변환
            </button>
            <button
              type="button"
              onClick={() => aborterRef.current?.abort()}
              disabled={!isRunning}
              className="admin-ghost-btn text-sm disabled:opacity-60"
            >
              중지
            </button>
            {status.text && (
              <p className={`text-sm ${status.isError ? "text-red-300" : "text-emerald-100/75"}`}>
                {status.text}
              </p>
            )}
          </div>
        </div>

        <div className="glass-card grid gap-4 p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="board-title">한글 발음</h2>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-emerald-100/75">
                <input
                  type="checkbox"
                  checked={showSource}
                  onChange={(event) => setShowSource(event.target.checked)}
                />
                원문 같이 보기
              </label>
              <button
                type="button"
                onClick={copyResult}
                disabled={!result.trim()}
                className="admin-ghost-btn text-sm disabled:opacity-60"
              >
                발음만 복사
              </button>
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  disabled={isRunning || !result.trim()}
                  className="admin-ghost-btn text-sm disabled:opacity-60"
                >
                  수정
                </button>
              )}
              <button
                type="button"
                onClick={save}
                disabled={isRunning || isSaving || !result.trim()}
                className="bg-emerald-200 px-5 py-2 text-sm font-semibold text-emerald-950 disabled:opacity-60"
              >
                {activeId ? "덮어써서 저장" : "저장"}
              </button>
            </div>
          </div>

          {resultLines.length === 0 ? (
            <p className="text-sm text-emerald-100/55">
              변환 결과가 여기에 줄 단위로 표시돼요. 수정을 누르면 줄마다 고칠 수 있어요.
            </p>
          ) : (
            <div className="grid gap-2">
              {resultLines.map((line, index) =>
                // 줄을 다 지워도 다시 쓸 수 있게, 원문이 있는 줄은 자리를 유지합니다.
                line.trim() || sourceLines[index]?.trim() ? (
                  <div key={index}>
                    {showSource && sourceLines[index]?.trim() && (
                      <p className="text-xs text-emerald-100/45">{sourceLines[index]}</p>
                    )}
                    {isEditing ? (
                      <input
                        value={line}
                        onChange={(event) => editLine(index, event.target.value)}
                        aria-label={`${index + 1}번째 줄 발음`}
                        className="auth-input w-full text-base"
                      />
                    ) : (
                      <p className="text-base text-emerald-50">{line}</p>
                    )}
                  </div>
                ) : (
                  <div key={index} className="h-3" />
                ),
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function YomiPage() {
  const { authUser, isAdmin } = useAdminAuth();

  return (
    <main className="admin-page min-h-screen bg-black px-5 py-8 text-emerald-50 md:px-8">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(180deg,#0a0c12_0%,#080a10_78%,#070910_100%)]" />
      <div className="noise-layer" aria-hidden="true" />

      <section className="relative z-10 mx-auto grid w-full max-w-[1500px] gap-5">
        <header className="admin-topbar">
          <div className="min-w-0">
            <p className="adm-label">Lyrics Reading</p>
            <h1 className="admin-topbar-title">가사 한글 발음</h1>
          </div>
          <div className="admin-topbar-actions">
            <Link href="/" className="admin-ghost-btn text-sm">
              본 페이지로 돌아가기
            </Link>
          </div>
        </header>

        {isAdmin && authUser ? <YomiWorkspace uid={authUser.uid} /> : <AdminLoginForm />}
      </section>
    </main>
  );
}
