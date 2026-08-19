import { NextResponse } from 'next/server';
import { getServiceClient, requireUser } from '@/lib/serverAuth';
import { normalizeProfileVisibility } from '@/lib/server/profileVisibility';

type JsonRecord = Record<string, unknown>;

const SUPPORTED_THEMES = new Set(['morandi', 'sakura', 'ukiyo', 'moonlight']);

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
      visibility: normalizeProfileVisibility(meta.visibility),
      searchable: meta.searchable !== false,
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

    const hasProfilePayload = ['targetName', 'bio', 'gender', 'bdsmRole', 'editAvatarUrl', 'editCoverUrl', 'visibility', 'searchable']
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
    const visibility = normalizeProfileVisibility(hasOwn(body, 'visibility') ? body.visibility : currentMeta.visibility);
    const requestedSearchable = typeof body.searchable === 'boolean'
      ? body.searchable
      : currentMeta.searchable !== false;
    let searchable = requestedSearchable;
    if (hasProfilePayload && requestedSearchable) {
      const serviceClient = getServiceClient();
      if (!serviceClient) return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
      const { data: pendingAutoHide, error: autoHideError } = await serviceClient
        .from('report_auto_actions')
        .select('id')
        .eq('target_type', 'profile')
        .eq('target_id', auth.user.id)
        .is('cleared_at', null)
        .maybeSingle();
      if (autoHideError) {
        console.error('[updateProfile] 讀取主頁自動隱藏狀態失敗：', autoHideError.message);
        return NextResponse.json({ error: '無法確認主頁審核狀態' }, { status: 503 });
      }
      if (pendingAutoHide) searchable = false;
    }
    const layoutConfig: JsonRecord = {
      ...currentLayout,
      profileMeta: {
        ...currentMeta,
        ...(hasProfilePayload ? {
          coverUrl: editCoverUrl,
          gender,
          bdsmRole,
          visibility,
          searchable,
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
