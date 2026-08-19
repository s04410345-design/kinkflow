import { NextResponse } from 'next/server';
import { getBearerToken, getServiceClient, requireUser } from '@/lib/serverAuth';

const BUCKET_NAME = 'article-videos';
const SIGNED_URL_SECONDS = 600;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ArticleMediaBinding = {
  article_id: string;
  media_asset_id: string;
  articles: { id: string; author_id: string; status: string } | { id: string; author_id: string; status: string }[] | null;
  media_assets: { id: string; storage_path: string; media_type: string; status: string } | { id: string; storage_path: string; media_type: string; status: string }[] | null;
};

function first<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] || null : value;
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

async function getViewerId(request: Request): Promise<string | null> {
  if (!getBearerToken(request)) return null;
  const auth = await requireUser(request);
  return 'response' in auth ? null : auth.user.id;
}

export async function GET(request: Request, context: { params: Promise<{ assetId: string }> }) {
  const assetId = (await context.params).assetId || '';
  if (!UUID_RE.test(assetId)) return NextResponse.json({ error: '影片不存在。' }, { status: 404 });

  const serviceClient = getServiceClient();
  if (!serviceClient) return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });

  const { data: binding, error: bindingError } = await serviceClient
    .from('article_media_assets')
    .select('article_id,media_asset_id,articles!inner(id,author_id,status),media_assets!inner(id,storage_path,media_type,status)')
    .eq('media_asset_id', assetId)
    .limit(1)
    .maybeSingle<ArticleMediaBinding>();
  if (bindingError || !binding) return NextResponse.json({ error: '影片不存在。' }, { status: 404 });

  const article = first(binding.articles);
  const asset = first(binding.media_assets);
  if (!article || !asset || asset.id !== assetId || asset.media_type !== 'video' || asset.status !== 'active') {
    return NextResponse.json({ error: '影片不存在。' }, { status: 404 });
  }

  if (article.status !== 'published') {
    const viewerId = await getViewerId(request);
    if (!viewerId) return NextResponse.json({ error: '影片不存在。' }, { status: 404 });
    const admin = await isAdmin(serviceClient, viewerId);
    if (viewerId !== article.author_id && !admin) return NextResponse.json({ error: '影片不存在。' }, { status: 404 });
  }

  const { data: signedUrl, error: signedUrlError } = await serviceClient.storage
    .from(BUCKET_NAME)
    .createSignedUrl(asset.storage_path, SIGNED_URL_SECONDS);
  if (signedUrlError || !signedUrl?.signedUrl) return NextResponse.json({ error: '影片連結暫時無法建立。' }, { status: 503 });

  return new NextResponse(null, {
    status: 302,
    headers: {
      Location: signedUrl.signedUrl,
      'Cache-Control': 'private, no-store',
    },
  });
}
