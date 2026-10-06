"use client";

import { type FormEvent, useMemo } from "react";
import { Explora } from "next/font/google";
import { cn } from "@/utils/cn";
import { ArchiveMotion } from "@/components/home/ArchiveMotion";
import { GlitchedText } from "@/components/GlitchedText";
import { TextGlitch } from "@/components/TextGlitch";
import { characterPaletteStyle } from "@/lib/character-palette";
import { ThumbnailImage } from "@/components/ThumbnailImage";
import { normalizeWorldEntries } from "@/utils/normalizers";
import type { Character, CharacterWorldEntry, UploadedImage, World, ZoneLinkTarget } from "@/lib/types";
import type { ExpressionModalItem, GalleryModalItem, ReaderModalItem } from "@/types/home.types";

const worldFileMarkFont = Explora({
  subsets: ["latin"],
  weight: "400",
});

const imageCreditName = (image: UploadedImage) => image.name?.trim() ?? "";

/**
 * 세계관 카드/파일에 표시할 분류 상태를 계산합니다.
 * 비밀번호가 없으면 공개(OPEN), 잠겨 있으면 해제 여부에 따라 OPEN/CLASSIFIED.
 */
const resolveWorldClassification = (world: World, unlocked: boolean) => {
  const isLocked = Boolean(world.password?.trim());
  if (!isLocked) {
    return { code: "OPEN" as const, label: "공개 기록", locked: false };
  }
  return unlocked
    ? { code: "DECRYPTED" as const, label: "열람 가능", locked: true }
    : { code: "CLASSIFIED" as const, label: "기밀", locked: true };
};

interface WorldsSectionProps {
  worlds: World[];
  activeWorldId: string;
  setActiveWorldId: (id: string) => void;
  characters: Character[];
  worldPasswordDrafts: Record<string, string>;
  onWorldPasswordChange: (worldId: string, value: string) => void;
  unlockedWorldIds: Record<string, boolean>;
  canUnlockWorlds: boolean;
  onUnlockWorld: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onRequireAuth: () => void;
  onViewParticipant: (characterId: string, worldId: string) => void;
  onOpenGallery: (item: GalleryModalItem) => void;
  onOpenExpression: (item: ExpressionModalItem) => void;
  onOpenReader: (item: ReaderModalItem) => void;
  onZoneLinkNavigate?: (target: ZoneLinkTarget) => void;
  className?: string;
}

export function WorldsSection({
  worlds,
  activeWorldId,
  setActiveWorldId,
  characters,
  worldPasswordDrafts,
  onWorldPasswordChange,
  unlockedWorldIds,
  canUnlockWorlds,
  onUnlockWorld,
  onRequireAuth,
  onViewParticipant,
  onOpenGallery,
  onOpenExpression,
  onOpenReader,
  onZoneLinkNavigate,
  className,
}: WorldsSectionProps) {
  const activeWorld = useMemo(
    () => worlds.find((world) => world.id === activeWorldId) ?? worlds[0],
    [activeWorldId, worlds],
  );
  const activeWorldIndex = useMemo(
    () => (activeWorld ? worlds.findIndex((world) => world.id === activeWorld.id) : -1),
    [activeWorld, worlds],
  );
  const activeWorldParticipants = useMemo(
    () =>
      activeWorld
        ? characters
            .map((character) => ({
              character,
              entry: normalizeWorldEntries(character.worldEntries).find(
                (worldEntry) => worldEntry.worldId === activeWorld.id,
              ),
            }))
            .filter((item): item is { character: Character; entry: CharacterWorldEntry } =>
              Boolean(item.entry),
            )
        : [],
    [activeWorld, characters],
  );
  const activeWorldPassword = activeWorld?.password?.trim() ?? "";
  const isActiveWorldUnlocked = Boolean(
    activeWorld && (!activeWorldPassword || unlockedWorldIds[activeWorld.id]),
  );
  const activeClassification = activeWorld
    ? resolveWorldClassification(activeWorld, isActiveWorldUnlocked)
    : null;

  const participantListContent = activeWorld ? (
    <>
      {activeWorldParticipants.map(({ character, entry }, participantIndex) => {
        const worldIllustrations = entry.images.filter((image) => image.category !== "standing");
        const worldStandings = entry.images.filter((image) => image.category === "standing");
        const worldMainIllustration = worldIllustrations[0] ?? entry.images[0];

        return (
          <article key={`${activeWorld.id}-${character.id}`} className="world-file-record">
            <header className="world-file-record-head">
              <span className="world-file-record-code">
                SUBJECT {String(participantIndex + 1).padStart(2, "0")}
              </span>
              <div className="world-file-record-name-row">
                <h4 className="world-file-record-name">{character.name}</h4>
                <span className="world-file-record-id">{character.id}</span>
              </div>
              {character.subtitle ? (
                <p className="world-file-record-subtitle">{character.subtitle}</p>
              ) : null}
            </header>

            <div className="world-file-record-layout">
              <div className="world-file-record-settings">
                <p className="case-file-intro-label">Field Notes</p>
                {entry.settings.length > 0 ? (
                  entry.settings.map((setting) => (
                    <p key={setting} className="case-setting-note">
                      {setting}
                    </p>
                  ))
                ) : (
                  <p className="plain-empty-note">등록된 세계관 설정이 없어요.</p>
                )}
              </div>

              <div className="world-file-record-visual">
                <p className="case-file-intro-label">Attached Plate</p>
                <button
                  type="button"
                  onClick={() =>
                    worldMainIllustration &&
                    onOpenGallery({ image: worldMainIllustration, character })
                  }
                  className="gallery-tile group block w-full text-left"
                  disabled={!worldMainIllustration}
                >
                  <div className="world-file-plate relative overflow-hidden">
                    {worldMainIllustration ? (
                      <ThumbnailImage
                        image={worldMainIllustration}
                        src={worldMainIllustration.url}
                        alt={`${character.name} ${activeWorld.title} 일러스트`}
                        className="opacity-95 transition group-hover:opacity-100"
                      />
                    ) : (
                      <div
                        className="character-palette-surface h-full w-full"
                        style={characterPaletteStyle(character.palette)}
                      />
                    )}
                    {worldMainIllustration && imageCreditName(worldMainIllustration) && (
                      <span className="image-credit-label image-credit-label-large">
                        {imageCreditName(worldMainIllustration)}
                      </span>
                    )}
                  </div>
                  <p className="truncate p-3 text-xs text-emerald-50">세계관 일러스트</p>
                </button>
              </div>
            </div>

            {(worldStandings.length > 0 || entry.works.length > 0) && (
              <div className="world-file-record-extra">
                {worldStandings.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onOpenExpression({ character, images: worldStandings })}
                    className="case-setting-note text-left"
                  >
                    <p className="case-file-intro-label">Standing Plates</p>
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {worldStandings.slice(0, 4).map((image) => (
                        <div
                          key={image.id}
                          className="aspect-square overflow-hidden border border-stone-400/15 bg-black"
                        >
                          <ThumbnailImage image={image} src={image.url} alt="스탠딩 이미지" />
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-sm text-emerald-50/75">
                      세계관 스탠딩 표정 {worldStandings.length}장 보기
                    </p>
                  </button>
                )}
                {entry.works.length > 0 && (
                  <div className="space-y-3">
                    {entry.works.map((work, index) => (
                      <button
                        key={`${work.title}-${work.date}-${index}`}
                        type="button"
                        onClick={() => onOpenReader({ character, work })}
                        className="case-setting-note text-left"
                      >
                        <p className="text-xs text-emerald-100/45">
                          {work.kind} / {work.date}
                        </p>
                        <h5 className="mt-2 text-lg font-semibold">{work.title}</h5>
                        {(work.images?.length ?? 0) > 0 && (
                          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                            {work.images?.slice(0, 5).map((image) => (
                              <div
                                key={image.id}
                                className="aspect-square overflow-hidden border border-stone-400/15 bg-black"
                              >
                                <ThumbnailImage
                                  image={image}
                                  src={image.url}
                                  alt="첨부 이미지"
                                  className="opacity-90"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => onViewParticipant(character.id, entry.worldId)}
              className="archive-submit-button world-file-record-link px-4 py-2 text-sm"
            >
              자캐 상세로 보기
            </button>
          </article>
        );
      })}
      {activeWorldParticipants.length === 0 && (
        <p className="archive-panel p-5 text-sm text-emerald-100/60">
          이 세계관에 연결된 자캐 자료가 아직 없어요.
        </p>
      )}
    </>
  ) : null;

  return (
    <section className={cn("world-archive-section space-y-6", className)}>
      <section className="glass-card world-index-panel p-6 md:p-8">
        <div className="world-index-header">
          <p className="character-index-blue-text text-xs tracking-[0.45em] uppercase">
            <TextGlitch className="character-index-blue-text" text="World Archive" />
          </p>
          <TextGlitch
            className="character-index-blue-text"
            text={`${String(worlds.length).padStart(2, "0")} Files`}
          />
        </div>

        <p className="world-index-note mt-5 max-w-2xl text-sm leading-7 text-emerald-100/65">
          어떤 세계가 있는지는 볼 수 있지만, 세계관 기록은 비밀번호를 입력해야 열립니다.
        </p>

        {worlds.length === 0 ? (
          <div className="archive-panel mt-6 p-5 text-sm leading-7 text-emerald-100/65">
            아직 등록된 세계관이 없어요.
          </div>
        ) : (
          <ArchiveMotion variant="stagger" motionKey="world-list" className="world-file-grid">
            {worlds.map((world, index) => {
              const classification = resolveWorldClassification(
                world,
                !world.password?.trim() || Boolean(unlockedWorldIds[world.id]),
              );

              return (
                <button
                  key={world.id}
                  type="button"
                  onClick={() => setActiveWorldId(world.id)}
                  className={`world-file-card ${activeWorld?.id === world.id ? "is-active" : ""}`}
                  data-state={classification.code.toLowerCase()}
                >
                  <span className="world-file-card-tab">FILE</span>
                  <div className="world-file-card-head">
                    <span className="world-file-card-code">{world.id}</span>
                    <span className="world-file-card-stamp">{classification.code}</span>
                  </div>
                  <div className="world-file-card-body">
                    <p className="world-file-card-kicker">World Record</p>
                    <h4 className="world-file-card-title">
                      <GlitchedText
                        text={world.title}
                        glitch={world.textGlitch?.title}
                        className="block w-full"
                        onZoneLinkClick={onZoneLinkNavigate}
                      />
                    </h4>
                    <p className="world-file-card-summary blue-emphasis">
                      <GlitchedText
                        text={world.subtitle}
                        glitch={world.textGlitch?.subtitle}
                        className="block w-full"
                        onZoneLinkClick={onZoneLinkNavigate}
                      />
                    </p>
                  </div>
                  <div className="world-file-card-foot">
                    <span>NO. {String(index + 1).padStart(2, "0")}</span>
                    <span className="world-file-card-access">
                      {classification.locked && !classification.code.startsWith("DEC")
                        ? "ENTER ▸"
                        : "OPEN ▸"}
                    </span>
                  </div>
                </button>
              );
            })}
          </ArchiveMotion>
        )}
      </section>

      {activeWorld && activeClassification && (
        <ArchiveMotion
          as="section"
          motionKey={activeWorld.id}
          variant="scan"
          className="glass-card world-file-detail dossier-viewer overflow-hidden"
        >
          <div className="world-file-doc">
            <div className="world-file-doc-grid" aria-hidden="true" />
            <span
              className={cn("world-file-doc-watermark", worldFileMarkFont.className)}
              aria-hidden="true"
            >
              {activeWorld.title}
            </span>
            <div className="world-file-doc-headline">
              <p className="case-file-kicker">
                Classified World File / NO. {String(activeWorldIndex + 1).padStart(2, "0")}
              </p>
              <h3 className="case-file-name world-file-doc-name">
                <GlitchedText
                  text={activeWorld.title}
                  glitch={activeWorld.textGlitch?.title}
                  className="block w-full"
                  onZoneLinkClick={onZoneLinkNavigate}
                />
              </h3>
              <div className="world-file-doc-tags">
                <span className="world-file-tag">ID · {activeWorld.id}</span>
                <span className="world-file-tag" data-state={activeClassification.code.toLowerCase()}>
                  {activeClassification.label}
                </span>
                {isActiveWorldUnlocked && (
                  <span className="world-file-tag">참가 자캐 {activeWorldParticipants.length}명</span>
                )}
              </div>
            </div>
          </div>

          <div className="dossier-body world-file-doc-body">
            {activeWorld.subtitle ? (
              <section className="case-file-intro world-file-doc-section">
                <p className="case-file-intro-label">World Summary</p>
                <div className="case-file-intro-text">
                  <GlitchedText
                    text={activeWorld.subtitle}
                    glitch={activeWorld.textGlitch?.subtitle}
                    className="block w-full"
                    onZoneLinkClick={onZoneLinkNavigate}
                  />
                </div>
              </section>
            ) : null}

            {activeWorld.description ? (
              <section className="case-file-intro world-file-doc-section">
                <p className="case-file-intro-label">World Description</p>
                <div className="case-file-intro-text whitespace-pre-line">
                  <GlitchedText
                    text={activeWorld.description}
                    glitch={activeWorld.textGlitch?.description}
                    preserveWhitespace
                    className="block w-full"
                    onZoneLinkClick={onZoneLinkNavigate}
                  />
                </div>
              </section>
            ) : null}

            {!isActiveWorldUnlocked ? (
              <form onSubmit={onUnlockWorld} className="world-file-lock world-file-doc-section">
                <header className="world-file-lock-head">
                  <p className="case-file-intro-label">Access Control</p>
                  <span className="world-file-lock-stamp">RESTRICTED</span>
                </header>
                <p className="world-file-lock-message">
                  {canUnlockWorlds
                    ? "이 세계관의 참가 자캐 기록, 그림, 로그를 보려면 관리자 페이지에서 설정한 비밀번호를 입력해주세요."
                    : "세계관 비밀번호는 회원가입 또는 로그인 후 입력할 수 있어요."}
                </p>
                <div className="world-file-lock-actions">
                  <input
                    type="password"
                    value={worldPasswordDrafts[activeWorld.id] ?? ""}
                    onChange={(event) => onWorldPasswordChange(activeWorld.id, event.target.value)}
                    placeholder={canUnlockWorlds ? "World password" : "회원가입 또는 로그인 필요"}
                    className="auth-input auth-input-compact"
                    disabled={!canUnlockWorlds}
                  />
                  <button
                    type={canUnlockWorlds ? "submit" : "button"}
                    onClick={canUnlockWorlds ? undefined : onRequireAuth}
                    className="archive-submit-button px-5 py-2 text-sm"
                  >
                    {canUnlockWorlds ? "기록 열기" : "로그인 창 열기"}
                  </button>
                </div>
              </form>
            ) : (
              <ArchiveMotion
                variant="stagger"
                motionKey={`${activeWorld.id}-participants`}
                className="world-file-record-list world-file-doc-section"
              >
                <p className="case-file-intro-label world-file-roster-label">
                  Linked Subjects / {activeWorldParticipants.length}
                </p>
                {participantListContent}
              </ArchiveMotion>
            )}
          </div>
        </ArchiveMotion>
      )}
    </section>
  );
}
