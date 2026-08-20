import { supabase } from '@/lib/supabase';
import { SafeStorage } from '@/lib/constants';
import { getAuthHeaders } from '@/lib/authHeaders';
import { MINDMAP_V2_NODES } from '@/lib/mindmap';

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

const DEFAULT_SEED_NODES = MINDMAP_V2_NODES;

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
