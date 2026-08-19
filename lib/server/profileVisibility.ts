export const PROFILE_VISIBILITY_KEYS = [
  'cover',
  'bio',
  'identity',
  'stats',
  'hotPosts',
  'latestPosts',
  'quizResult',
  'radar',
  'articles',
  'likes',
] as const;

export type ProfileVisibilityKey = typeof PROFILE_VISIBILITY_KEYS[number];
export type ProfileVisibility = Record<ProfileVisibilityKey, boolean>;

export const DEFAULT_PROFILE_VISIBILITY: ProfileVisibility = {
  cover: true,
  bio: true,
  identity: true,
  stats: true,
  hotPosts: true,
  latestPosts: true,
  quizResult: true,
  radar: true,
  articles: true,
  likes: true,
};

export type ProfileMeta = {
  coverUrl?: string;
  gender?: string;
  bdsmRole?: string;
  searchable?: boolean;
  visibility?: unknown;
  theme?: string;
  profileStyle?: string;
};

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function getProfileMeta(layoutConfig: unknown): ProfileMeta {
  return asRecord(asRecord(layoutConfig).profileMeta) as ProfileMeta;
}

export function normalizeProfileVisibility(value: unknown): ProfileVisibility {
  const record = asRecord(value);
  return PROFILE_VISIBILITY_KEYS.reduce((result, key) => {
    result[key] = typeof record[key] === 'boolean' ? record[key] as boolean : DEFAULT_PROFILE_VISIBILITY[key];
    return result;
  }, { ...DEFAULT_PROFILE_VISIBILITY });
}

export function isProfileSearchable(layoutConfig: unknown): boolean {
  const meta = getProfileMeta(layoutConfig);
  return meta.searchable !== false;
}

export function cleanProfileName(value: string): string {
  return value
    .replace(/ ☑️/g, '')
    .replace(/ 👻/g, '')
    .replace(/ 玩家/g, '')
    .replace(/ 訪客/g, '')
    .replace(/ 守門人/g, '')
    .trim();
}

export function escapeIlike(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}
