export const SITE_BGM_PLAYLIST = [
  "/audio/les-murmures-des-flots-lullaby.mp3",
  "/audio/compass.mp3",
  "/audio/old-doll.mp3",
  "/audio/fontaine-musicbox.mp3",
] as const;

/** 사이트 기본 플레이리스트에는 없고, 캐릭터 상세 전용으로만 쓰는 곡 */
export const CHARACTER_ONLY_BGM_PLAYLIST = ["/audio/izumi theme.mp3", "/audio/sabbath.mp3"] as const;

export type SiteBgmUrl = (typeof SITE_BGM_PLAYLIST)[number];
export type CharacterOnlyBgmUrl = (typeof CHARACTER_ONLY_BGM_PLAYLIST)[number];
export type CharacterBgmUrl = SiteBgmUrl | CharacterOnlyBgmUrl;

export const SITE_BGM_OPTIONS: Array<{ label: string; url: SiteBgmUrl }> = [
  { label: "Les Murmures des Flots (Lullaby)", url: "/audio/les-murmures-des-flots-lullaby.mp3" },
  { label: "Compass", url: "/audio/compass.mp3" },
  { label: "Old Doll", url: "/audio/old-doll.mp3" },
  { label: "Fontaine Musicbox", url: "/audio/fontaine-musicbox.mp3" },
];

export const CHARACTER_ONLY_BGM_OPTIONS: Array<{ label: string; url: CharacterOnlyBgmUrl }> = [
  { label: "Izumi Theme", url: "/audio/izumi theme.mp3" },
  { label: "SABBATH", url: "/audio/sabbath.mp3" },
];

export const CHARACTER_BGM_OPTIONS: Array<{ label: string; url: CharacterBgmUrl }> = [
  ...SITE_BGM_OPTIONS,
  ...CHARACTER_ONLY_BGM_OPTIONS,
];

export function isSiteBgmUrl(value: string): value is SiteBgmUrl {
  return SITE_BGM_PLAYLIST.includes(value as SiteBgmUrl);
}

export function isCharacterOnlyBgmUrl(value: string): value is CharacterOnlyBgmUrl {
  return CHARACTER_ONLY_BGM_PLAYLIST.includes(value as CharacterOnlyBgmUrl);
}

export function isCharacterBgmUrl(value: string): value is CharacterBgmUrl {
  return isSiteBgmUrl(value) || isCharacterOnlyBgmUrl(value);
}

export { resolveCharacterBgmUrl } from "@/lib/bgm-catalog";
