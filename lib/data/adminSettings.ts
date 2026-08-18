import { supabase } from '@/lib/supabase';
import { SafeStorage } from '@/lib/constants';
import { getAuthHeaders } from '@/lib/authHeaders';

export type ProfileModuleColumn = 'left' | 'right' | 'full';

export type ProfileModuleConfig = {
  id: string;
  name: string;
  visible: boolean;
  order: number;
  column?: ProfileModuleColumn;
};

export type ProfileTheme = 'default' | 'glass' | 'dark' | 'minimal' | 'morandi' | 'sakura' | 'ukiyo' | 'moonlight';

export type ProfileLayoutConfig = {
  theme: ProfileTheme;
  modules: ProfileModuleConfig[];
  profileStyle?: string;
};

export const DEFAULT_PROFILE_LAYOUT: ProfileLayoutConfig = {
  theme: 'default',
  modules: [
    { id: 'header', name: '👤 基本資料 (頭像與名稱)', visible: true, order: 0, column: 'left' },
    { id: 'stats', name: '📈 互動數據 (發言與註冊時間)', visible: true, order: 1, column: 'left' },
    { id: 'radar', name: '📊 偏好雷達圖 (即時喜好度)', visible: false, order: 2, column: 'right' },
    { id: 'hot_posts', name: '🔥 最熱門發言', visible: true, order: 3, column: 'right' },
    { id: 'latest_posts', name: '🕒 最新留言', visible: true, order: 4, column: 'right' },
    { id: 'quiz_result', name: '👑 測驗結果 (靈魂印記)', visible: true, order: 5, column: 'right' },
  ],
};

const DEFAULT_SEED_NODES = [
  { id: 'bdsm', level: 0, radius: 45, color: '#E8C5C8', label: 'BDSM大廳', desc: 'BDSM 世界的起點。', crossLinks: [] },
  { id: 'community_safety', level: 1, radius: 35, color: '#F3A6A6', label: '社群與安全防護', desc: '進入實踐前不可或缺的安全基石。', parent: 'bdsm', crossLinks: [] },
  { id: 'bondage', level: 1, radius: 35, color: '#A6C8F3', label: '繩藝與肢體束縛', desc: '日式繩縛 (Shibari)、手銬與限制。', parent: 'bdsm', crossLinks: [] },
  { id: 'ds_main', level: 1, radius: 35, color: '#E8A6F3', label: '支配與臣服動態', desc: 'Dom & Sub 權力交接、稱呼與契約。', parent: 'bdsm', crossLinks: [] },
  { id: 'sm_main', level: 1, radius: 35, color: '#F3C8A6', label: '施虐與痛覺體驗', desc: '鞭打、拍打、滴蠟與身體感官。', parent: 'bdsm', crossLinks: [] },
  { id: 'sensory_deprivation', level: 1, radius: 35, color: '#A6C8F3', label: '感官剝奪與剝離', desc: '眼罩、耳罩白噪音與感覺剝奪。', parent: 'bdsm', crossLinks: [] },
  { id: 'scenario_play', level: 1, radius: 35, color: '#B5C4B1', label: '情境劇本與扮演', desc: '角色扮演、Pet Play 與年齡退行。', parent: 'bdsm', crossLinks: [] },
  { id: 'mental_control', level: 1, radius: 35, color: '#E8A6F3', label: '心理控制與催眠', desc: '催眠引導、心理暗示與精神臣服。', parent: 'bdsm', crossLinks: [] },
  { id: 'consensus_risk', level: 1, radius: 35, color: '#F3A6A6', label: '知情同意與溝通', desc: '安全詞、溝通儀式與事後撫慰 (Aftercare)。', parent: 'bdsm', crossLinks: [] },
  { id: 'diverse_relations', level: 1, radius: 35, color: '#E8A6F3', label: '多元關係與次文化', desc: '多重關係、雙向 Switch 與圈內交流。', parent: 'bdsm', crossLinks: [] },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asColumn(value: unknown, fallback: ProfileModuleColumn): ProfileModuleColumn {
  return value === 'left' || value === 'right' || value === 'full' ? value : fallback;
}

function normalizeProfileLayout(value: unknown): ProfileLayoutConfig {
  const record = isRecord(value) ? value : {};
  const rawModules = Array.isArray(record.modules) ? record.modules : [];
  const modules = DEFAULT_PROFILE_LAYOUT.modules
    .map((defaultModule) => {
      const found = rawModules.find((module) => isRecord(module) && module.id === defaultModule.id);
      if (!isRecord(found)) return defaultModule;
      return {
        ...defaultModule,
        visible: typeof found.visible === 'boolean' ? found.visible : defaultModule.visible,
        order: typeof found.order === 'number' ? found.order : defaultModule.order,
        column: asColumn(found.column, defaultModule.column || 'right'),
      };
    })
    .sort((a, b) => a.order - b.order);

  const theme = record.theme;
  return {
    theme: theme === 'glass' || theme === 'dark' || theme === 'minimal' || theme === 'morandi' || theme === 'sakura' || theme === 'ukiyo' || theme === 'moonlight' ? theme : 'default',
    modules,
    ...(typeof record.profileStyle === 'string' ? { profileStyle: record.profileStyle } : {}),
  };
}

export async function fetchProfileLayout(): Promise<ProfileLayoutConfig> {
  const { data, error } = await supabase.from('quiz_content').select('content').eq('key_name', 'profile_layout').maybeSingle();
  if (error) throw error;
  return data?.content ? normalizeProfileLayout(data.content) : DEFAULT_PROFILE_LAYOUT;
}

export async function saveProfileLayout(config: ProfileLayoutConfig): Promise<void> {
  const normalized = normalizeProfileLayout(config);
  const { error } = await supabase.from('quiz_content').upsert(
    { key_name: 'profile_layout', content: normalized },
    { onConflict: 'key_name' },
  );
  if (error) throw error;
}

export async function seedDefaultWorkspace(config: ProfileLayoutConfig): Promise<void> {
  const defaultProfileLayout: ProfileLayoutConfig = {
    ...normalizeProfileLayout(config),
    theme: 'morandi',
    profileStyle: 'morandi-classic',
  };
  const writes = [
    supabase.from('quiz_content').upsert({ key_name: 'mindmap_data', content: DEFAULT_SEED_NODES }, { onConflict: 'key_name' }),
    supabase.from('quiz_content').upsert({ key_name: 'mindmap_nodes', content: DEFAULT_SEED_NODES }, { onConflict: 'key_name' }),
    supabase.from('quiz_content').upsert({ key_name: 'profile_layout', content: defaultProfileLayout }, { onConflict: 'key_name' }),
  ];
  const results = await Promise.all(writes);
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;
}

export type UserStyleConfig = {
  theme?: string;
  profileStyle?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

function cleanUserName(userName: string): string {
  return userName.replace(/ ☑️/g, '').replace(/ 👻/g, '').trim();
}

function normalizeUserStyleConfig(value: unknown): UserStyleConfig {
  if (!isRecord(value)) return {};
  return {
    ...value,
    ...(typeof value.theme === 'string' ? { theme: value.theme } : {}),
    ...(typeof value.profileStyle === 'string' ? { profileStyle: value.profileStyle } : {}),
    ...(typeof value.updatedAt === 'string' ? { updatedAt: value.updatedAt } : {}),
  };
}

const USER_STYLE_STORAGE_PREFIX = 'kinkflow_user_style_';

function getUserStyleStorageKey(userName: string): string {
  return `${USER_STYLE_STORAGE_PREFIX}${cleanUserName(userName)}`;
}

function getApiErrorMessage(value: unknown, fallback: string): string {
  if (!value || typeof value !== 'object') return fallback;
  const error = (value as { error?: unknown }).error;
  return typeof error === 'string' && error.trim() ? error : fallback;
}

export async function fetchUserStyleConfig(userName: string, userId?: string | null): Promise<UserStyleConfig> {
  if (!userId) {
    return normalizeUserStyleConfig(SafeStorage.get(getUserStyleStorageKey(userName)));
  }

  const response = await fetch('/api/updateProfile', {
    method: 'GET',
    headers: await getAuthHeaders(),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(getApiErrorMessage(payload, '無法讀取個人主題設定。'));
  }
  return normalizeUserStyleConfig(payload);
}

export async function saveUserStyleConfig(
  userName: string,
  patch: Pick<UserStyleConfig, 'theme' | 'profileStyle'>,
  userId?: string | null,
): Promise<void> {
  const current = await fetchUserStyleConfig(userName, userId);
  const next: UserStyleConfig = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  if (!userId) {
    SafeStorage.set(getUserStyleStorageKey(userName), next);
    return;
  }

  const response = await fetch('/api/updateProfile', {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({
      userId,
      theme: next.theme,
      profileStyle: next.profileStyle,
    }),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(getApiErrorMessage(payload, '無法儲存個人主題設定。'));
  }
}

export async function uploadQuizImage(folder: string, prefix: string, file: File): Promise<string> {
  const extension = file.name.split('.').pop() || 'bin';
  const fileName = `${prefix}_${Date.now()}.${extension}`;
  const path = `${folder}/${fileName}`;
  const { error } = await supabase.storage.from('quiz-images').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('quiz-images').getPublicUrl(path);
  return data.publicUrl;
}
