import { NextResponse } from 'next/server';
import { getServiceClient, requireUser } from '@/lib/serverAuth';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_ASSET_IDS = 20;

type BindBody = {
  articleId?: unknown;
  assetIds?: unknown;
};

function parseUuid(value: unknown): string | null {
  return typeof value === 'string' && UUID_RE.test(value) ? value : null;
}

function parseAssetIds(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > MAX_ASSET_IDS) return null;
  const ids = value.map(parseUuid);
  if (ids.some((id): id is null => id === null)) return null;
  return [...new Set(ids as string[])];
}

async function isAdmin(serviceClient: NonNullable<ReturnType<typeof getServiceClient>>, userId: string): Promise<boolean> {
  const { data } = await serviceClient
    .from('admin_roles')
    .select('role_level')
    .eq('user_id', userId)
    .lte('role_level', 2)
    .maybeSingle();
  const roleLevel = data?.role_level;
  return typeof roleLevel === 'number' && Number.isInteger(roleLevel) && roleLevel <= 2;
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if ('response' in auth) return auth.response;

  const serviceClient = getServiceClient();
  if (!serviceClient) return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });

  try {
    const body = await request.json() as BindBody;
    const articleId = parseUuid(body.articleId);
    const assetIds = parseAssetIds(body.assetIds);
    if (!articleId || assetIds === null) return NextResponse.json({ error: '文章或影片資產格式錯誤。' }, { status: 400 });

    const { data: article, error: articleError } = await serviceClient
      .from('articles')
      .select('id,author_id,status')
      .eq('id', articleId)
      .maybeSingle<{ id: string; author_id: string; status: string }>();
    if (articleError || !article) return NextResponse.json({ error: '找不到文章。' }, { status: 404 });

    const admin = await isAdmin(serviceClient, auth.user.id);
    if (article.author_id !== auth.user.id && !admin) return NextResponse.json({ error: '沒有綁定這篇文章影片的權限。' }, { status: 403 });
    if (!['draft', 'published'].includes(article.status)) return NextResponse.json({ error: '目前文章狀態不能綁定影片。' }, { status: 409 });

    if (assetIds.length > 0) {
      const { data: assets, error: assetsError } = await serviceClient
        .from('media_assets')
        .select('id,owner_id,media_type,status')
        .in('id', assetIds)
        .eq('media_type', 'video')
        .limit(MAX_ASSET_IDS);
      if (assetsError || !assets || assets.length !== assetIds.length) return NextResponse.json({ error: '影片資產不存在或類型錯誤。' }, { status: 400 });
      if (assets.some((asset) => asset.status !== 'active')) return NextResponse.json({ error: '只有 active 影片資產可以綁定。' }, { status: 409 });
      if (!admin && assets.some((asset) => asset.owner_id !== auth.user.id)) return NextResponse.json({ error: '不能綁定其他使用者的影片。' }, { status: 403 });
    }

    const { error: deleteError } = await serviceClient
      .from('article_media_assets')
      .delete()
      .eq('article_id', articleId);
    if (deleteError) return NextResponse.json({ error: '既有影片關聯清理失敗。' }, { status: 503 });

    if (assetIds.length > 0) {
      const { error: insertError } = await serviceClient
        .from('article_media_assets')
        .insert(assetIds.map((mediaAssetId) => ({ article_id: articleId, media_asset_id: mediaAssetId })));
      if (insertError) return NextResponse.json({ error: '影片關聯儲存失敗。' }, { status: 503 });
    }

    return NextResponse.json({ ok: true, articleId, assetIds });
  } catch {
    return NextResponse.json({ error: '影片關聯請求格式錯誤。' }, { status: 400 });
  }
}
