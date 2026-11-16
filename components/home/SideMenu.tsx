"use client";

import {
  type CSSProperties,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { User } from "firebase/auth";
import { cn } from "@/utils/cn";
import { ADMIN_LOGIN_ID, displayLoginId } from "@/lib/auth-helpers";
import { sections, archiveSubSections, type ArchiveSubSectionId, type SectionId } from "@/constants/home";
import type { HomeContent } from "@/lib/types";

type AuthMode = "login" | "signup";

type AuthDraft = {
  loginId: string;
  password: string;
};

interface SideMenuAuthApi {
  authUser: User | null;
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
  authDraft: AuthDraft;
  setAuthDraft: Dispatch<SetStateAction<AuthDraft>>;
  showPassword: boolean;
  setShowPassword: Dispatch<SetStateAction<boolean>>;
  authPanelOpen: boolean;
  setAuthPanelOpen: Dispatch<SetStateAction<boolean>>;
  isAuthLoading: boolean;
  submitAuth: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  logout: () => void | Promise<void>;
}

interface SideMenuProps {
  menuOpen: boolean;
  setMenuOpen: Dispatch<SetStateAction<boolean>>;
  archiveContent: HomeContent;
  activeSection: SectionId;
  activeArchiveSub: ArchiveSubSectionId;
  onSelectSection: (section: SectionId) => void;
  onSelectArchiveSub: (sub: ArchiveSubSectionId) => void;
  auth: SideMenuAuthApi;
  isAdmin: boolean;
  authNotice: string;
  className?: string;
}

export function SideMenu({
  menuOpen,
  setMenuOpen,
  archiveContent,
  activeSection,
  activeArchiveSub,
  onSelectSection,
  onSelectArchiveSub,
  auth,
  isAdmin,
  authNotice,
  className,
}: SideMenuProps) {
  const {
    authUser,
    authMode,
    setAuthMode,
    authDraft,
    setAuthDraft,
    showPassword,
    setShowPassword,
    authPanelOpen,
    setAuthPanelOpen,
    isAuthLoading,
    submitAuth,
    logout,
  } = auth;

  const [archiveSubMenuOpen, setArchiveSubMenuOpen] = useState(false);
  const archiveSubMenuInnerRef = useRef<HTMLDivElement>(null);
  const [archiveSubMenuHeight, setArchiveSubMenuHeight] = useState(0);

  const syncArchiveSubMenuHeight = useCallback(() => {
    const inner = archiveSubMenuInnerRef.current;
    if (!inner) {
      return;
    }

    if (!archiveSubMenuOpen) {
      setArchiveSubMenuHeight(0);
      return;
    }

    setArchiveSubMenuHeight(0);
    requestAnimationFrame(() => {
      setArchiveSubMenuHeight(inner.scrollHeight);
    });
  }, [archiveSubMenuOpen]);

  useLayoutEffect(() => {
    syncArchiveSubMenuHeight();
  }, [syncArchiveSubMenuHeight, archiveSubSections.length]);

  useEffect(() => {
    if (!archiveSubMenuOpen) {
      return;
    }

    const inner = archiveSubMenuInnerRef.current;
    if (!inner || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      setArchiveSubMenuHeight(inner.scrollHeight);
    });
    observer.observe(inner);
    return () => observer.disconnect();
  }, [archiveSubMenuOpen]);

  return (
    <aside
      className={cn(
        "side-menu fixed top-5 left-5 z-30 backdrop-blur-xl",
        menuOpen ? "is-open" : "is-collapsed",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setMenuOpen((value) => !value)}
        className="side-menu-trigger"
        aria-expanded={menuOpen}
        aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
      >
        ☰
      </button>

      <div className="side-menu-content" aria-hidden={!menuOpen}>
        <div className="archive-panel mb-3 p-3">
          <p className="archive-kicker">
            {archiveContent.eyebrow}
          </p>
          <h1 className="archive-title site-logo-title mt-2 text-3xl">{archiveContent.title}</h1>
          <p className="mt-2 text-xs leading-5 text-emerald-100/60">{archiveContent.body}</p>
        </div>

        <nav className="space-y-2">
          {sections.map((section) => {
            if (section.id === "archive") {
              return (
                <div key={section.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setArchiveSubMenuOpen((open) => !open)}
                    aria-expanded={archiveSubMenuOpen}
                    className={`archive-row group flex w-full items-center justify-between px-4 py-2.5 text-left text-sm ${
                      activeSection === "archive"
                        ? "border-stone-400/35 bg-stone-800/20 text-stone-100"
                        : "text-emerald-50/75 hover:text-white"
                    }`}
                  >
                    <span>{section.label}</span>
                    <span
                      className={`archive-submenu-mark text-xs opacity-60 ${archiveSubMenuOpen ? "is-open" : ""}`}
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </button>
                  <div
                    className={`archive-submenu ${archiveSubMenuOpen ? "is-open" : "is-collapsed"}`}
                    style={{ maxHeight: archiveSubMenuHeight }}
                    aria-hidden={!archiveSubMenuOpen}
                  >
                    <div
                      ref={archiveSubMenuInnerRef}
                      className="archive-submenu-inner space-y-1 border-l border-stone-400/15 pl-3"
                    >
                      {archiveSubSections.map((sub, index) => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => onSelectArchiveSub(sub.id)}
                          className={`archive-row archive-submenu-item flex w-full items-center justify-between px-3 py-2 text-left text-xs ${
                            activeSection === "archive" && activeArchiveSub === sub.id
                              ? "border-stone-400/30 bg-stone-800/15 text-stone-100"
                              : "text-emerald-50/65 hover:text-white"
                          }`}
                          style={{ "--archive-submenu-delay": `${index * 45}ms` } as CSSProperties}
                        >
                          <span>{sub.label}</span>
                          <span className="text-[10px] opacity-50">›</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => onSelectSection(section.id)}
                className={`archive-row group flex w-full items-center justify-between px-4 py-2.5 text-left text-sm ${
                  activeSection === section.id
                    ? "border-stone-400/35 bg-stone-800/20 text-stone-100"
                    : "text-emerald-50/75 hover:text-white"
                }`}
              >
                <span>{section.label}</span>
                <span className="text-xs opacity-60">›</span>
              </button>
            );
          })}
        </nav>

        <section
          className={`auth-panel archive-panel mt-3 ${authPanelOpen ? "is-open" : "is-collapsed"}`}
        >
          <button
            type="button"
            onClick={() => setAuthPanelOpen((value) => !value)}
            className="auth-panel-trigger"
            aria-expanded={authPanelOpen}
            aria-label={authPanelOpen ? "로그인 창 닫기" : "로그인 창 열기"}
          >
            <span className="auth-panel-dot" />
            <span>{authUser ? "USER" : "LOGIN"}</span>
            <span className="auth-panel-trigger-mark">{authPanelOpen ? "×" : "+"}</span>
          </button>
          {authPanelOpen && (
            <div className="auth-panel-content">
              <p className="mb-3 text-[10px] tracking-[0.28em] text-stone-300/65 uppercase">
                {authUser ? "Account" : authMode === "signup" ? "Sign Up" : "Login"}
              </p>

              {authUser ? (
                <div className="space-y-2 text-xs">
                  <p className="text-emerald-100/60">{isAdmin ? "관리자 로그인됨" : "로그인됨"}</p>
                  <p className="break-all text-emerald-50">
                    {isAdmin ? ADMIN_LOGIN_ID : displayLoginId(authUser.email)}
                  </p>
                  {isAdmin && (
                    <a
                      href="/admin"
                      className="block border border-stone-400/25 bg-stone-900/30 p-2 text-center text-stone-200"
                    >
                      수정 페이지로 이동
                    </a>
                  )}
                  {isAdmin && (
                    <a
                      href="/yomi"
                      className="block border border-stone-400/25 bg-stone-900/30 p-2 text-center text-stone-200"
                    >
                      가사 한글 발음
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={logout}
                      className="archive-row w-full py-2 text-emerald-50"
                  >
                    로그아웃
                  </button>
                </div>
              ) : (
                <form onSubmit={submitAuth} className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setAuthMode("signup")}
                      className={`py-1.5 ${
                        authMode === "signup"
                          ? "bg-stone-700/35 text-stone-100"
                          : "border border-stone-400/15 text-emerald-100/65"
                      }`}
                    >
                      회원가입
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode("login")}
                      className={`py-1.5 ${
                        authMode === "login"
                          ? "bg-stone-700/35 text-stone-100"
                          : "border border-stone-400/15 text-emerald-100/65"
                      }`}
                    >
                      로그인
                    </button>
                  </div>
                  <input
                    value={authDraft.loginId}
                    onChange={(event) =>
                      setAuthDraft((current) => ({ ...current, loginId: event.target.value }))
                    }
                    placeholder="아이디"
                    type="text"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className="auth-input auth-input-compact"
                  />
                  <div className="grid grid-cols-[1fr_auto] gap-1.5">
                    <input
                      value={authDraft.password}
                      onChange={(event) =>
                        setAuthDraft((current) => ({ ...current, password: event.target.value }))
                      }
                      placeholder="비밀번호"
                      type={showPassword ? "text" : "password"}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      className="auth-input auth-input-compact"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="border border-stone-400/18 px-2 text-[11px] text-emerald-100/70"
                    >
                      {showPassword ? "숨김" : "보기"}
                    </button>
                  </div>
                  <button
                    disabled={isAuthLoading}
                    className="w-full bg-stone-700/35 py-2 text-[11px] font-semibold text-stone-100 disabled:opacity-60"
                  >
                    {isAuthLoading
                      ? "확인 중..."
                      : authMode === "signup"
                        ? "가입하기"
                        : "로그인하기"}
                  </button>
                </form>
              )}

              {authNotice && (
                <p className="mt-2 border border-stone-400/20 bg-stone-900/20 p-2 text-xs leading-5 text-stone-200/80">
                  {authNotice}
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}
