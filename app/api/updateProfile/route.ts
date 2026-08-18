import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/serverAuth';

type JsonRecord = Record<string, unknown>;

const SUPPORTED_THEMES = new Set(['morandi', 'sakura', 'ukiyo', 'moonlight']);
const visibilityKeys = ['cover', 'bio', 'identity', 'stats', 'hotPosts', 'latestPosts', 'quizResult', 'radar'] as const;
type VisibilityKey = typeof visibilityKeys[number];

type ProfileRow = {
  id: string;
  username?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  layout_config?: unknown;
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
}

function hasOwn(record: JsonRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function normalizeVisibility(value: unknown, fallback: JsonRecord = {}): Record<VisibilityKey, boolean> {
  const incoming = asRecord(value);
  return visibilityKeys.reduce((result, key) => {
    const incomingValue = incoming[key];
    const fallbackValue = fallback[key];
    result[key] = typeof incomingValue === 'boolean'
      ? incomingValue
      : typeof fallbackValue === 'boolean'
        ? fallbackValue
        : true;
    return result;
  }, {} as Record<VisibilityKey, boolean>);
}

function getProfileMeta(profile: ProfileRow): JsonRecord {
  return asRecord(asRecord(profile.layout_config).profileMeta);
}

export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    if ('response' in auth) return auth.response;

    const { data, error } = await auth.client
      .from('profiles')
      .select('id,layout_config')
      .eq('id', auth.user.id)
      .maybeSingle<Pick<ProfileRow, 'id' | 'layout_config'>>();

    if (error) {
      console.error('[updateProfile] 讀取主題設定失敗：', error.message);
      return NextResponse.json({ error: '無法讀取個人主題設定' }, { status: 400 });
    }
    if (!data?.id) {
      return NextResponse.json({ error: '個人資料不存在' }, { status: 404 });
    }

    const meta = getProfileMeta(data);
    return NextResponse.json({
      ...(typeof meta.theme === 'string' ? { theme: meta.theme } : {}),
      ...(typeof meta.profileStyle === 'string' ? { profileStyle: meta.profileStyle } : {}),
      ...(typeof meta.updatedAt === 'string' ? { updatedAt: meta.updatedAt } : {}),
    });
  } catch (error) {
    console.error('[updateProfile] 讀取主題設定時發生未預期錯誤：', error);
    return NextResponse.json({ error: '無法讀取個人主題設定' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    if ('response' in auth) return auth.response;

    const rawBody: unknown = await req.json().catch(() => ({}));
    const body = asRecord(rawBody);
    const requestedUserId = typeof body.userId === 'string' ? body.userId : auth.user.id;
    if (requestedUserId !== auth.user.id) {
      return NextResponse.json({ error: '只能修改自己的個人資料' }, { status: 403 });
    }

    const hasProfilePayload = ['targetName', 'bio', 'gender', 'bdsmRole', 'editAvatarUrl', 'editCoverUrl', 'visibility']
      .some(key => hasOwn(body, key));
    const requestedTheme = typeof body.theme === 'string' && body.theme.trim()
      ? body.theme.trim().slice(0, 40)
      : null;
    const requestedProfileStyle = typeof body.profileStyle === 'string' && body.profileStyle.trim()
      ? body.profileStyle.trim().slice(0, 80)
      : null;
    const hasStylePayload = requestedTheme !== null || requestedProfileStyle !== null;

    if (!hasProfilePayload && !hasStylePayload) {
      return NextResponse.json({ error: '沒有可更新的個人設定' }, { status: 400 });
    }
    if (requestedTheme !== null && !SUPPORTED_THEMES.has(requestedTheme)) {
      return NextResponse.json({ error: '不支援的主題設定' }, { status: 400 });
    }

    const targetName = typeof body.targetName === 'string' ? body.targetName.trim() : '';
    const bio = typeof body.bio === 'string' ? body.bio.slice(0, 2000) : '';
    const gender = typeof body.gender === 'string' ? body.gender.slice(0, 40) : null;
    const bdsmRole = typeof body.bdsmRole === 'string' ? body.bdsmRole.slice(0, 80) : null;
    const editAvatarUrl = typeof body.editAvatarUrl === 'string' ? body.editAvatarUrl.slice(0, 2048) : null;
    const editCoverUrl = typeof body.editCoverUrl === 'string' ? body.editCoverUrl.slice(0, 2048) : null;

    const { data: currentProfile, error: readError } = await auth.client
      .from('profiles')
      .select('id,username,bio,avatar_url,layout_config')
      .eq('id', auth.user.id)
      .maybeSingle<ProfileRow>();
    if (readError) {
      console.error('[updateProfile] 讀取個人資料失敗：', readError.message);
      return NextResponse.json({ error: '無法讀取個人資料' }, { status: 400 });
    }
    if (!currentProfile?.id) {
      return NextResponse.json({ error: '個人資料不存在' }, { status: 404 });
    }

    if (hasProfilePayload && (!targetName || targetName.length > 80)) {
      return NextResponse.json({ error: '名稱必須介於 1 到 80 個字元' }, { status: 400 });
    }

    const currentLayout = asRecord(currentProfile.layout_config);
    const currentMeta = getProfileMeta(currentProfile);
    const visibility = normalizeVisibility(body.visibility, asRecord(currentMeta.visibility));
    const layoutConfig: JsonRecord = {
      ...currentLayout,
      profileMeta: {
        ...currentMeta,
        ...(hasProfilePayload ? {
          coverUrl: editCoverUrl,
          gender,
          bdsmRole,
          visibility,
        } : {}),
        ...(requestedTheme !== null ? { theme: requestedTheme } : {}),
        ...(requestedProfileStyle !== null ? { profileStyle: requestedProfileStyle } : {}),
        ...(hasStylePayload ? { updatedAt: new Date().toISOString() } : {}),
      },
    };

    const updates: JsonRecord = { layout_config: layoutConfig };
    if (hasProfilePayload) {
      updates.username = targetName.replace(/ ☑️/g, '').replace(/ 👻/g, '').trim();
      updates.bio = bio;
      updates.avatar_url = editAvatarUrl;
    }

    const { data: updatedProfile, error } = await auth.client
      .from('profiles')
      .update(updates)
      .eq('id', auth.user.id)
      .select('id')
      .maybeSingle<{ id: string }>();

    if (error) {
      console.error('[updateProfile] 儲存個人資料失敗：', error.message);
      return NextResponse.json({ error: '無法儲存個人設定' }, { status: 400 });
    }
    if (!updatedProfile?.id) {
      return NextResponse.json({ error: '個人資料沒有更新' }, { status: 409 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[updateProfile] 更新個人資料時發生未預期錯誤：', error);
    return NextResponse.json({ error: '無法更新個人設定' }, { status: 500 });
  }
}
