import { NextResponse } from 'next/server';
import { getServiceClient, requireAdmin, requireUser } from '@/lib/serverAuth';
import { checkRateLimit, clampText, hasOversizedContent, isRecord, rateLimitResponse } from '@/lib/server/rateLimit';

const MAX_BODY_BYTES = 8_000;
const REPORT_CATEGORIES = ['spam', 'harassment', 'safety', 'privacy', 'illegal', 'hate', 'self_harm', 'misinformation', 'other'] as const;
const TARGET_TYPES = ['article', 'forum_post', 'forum_comment', 'realtime_message', 'profile'] as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isAllowed<T extends readonly string[]>(value: string, values: T): value is T[number] {
  return values.includes(value as T[number]);
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, { namespace: 'reports:create', limit: 5, windowMs: 10 * 60 * 1000 });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds, '檢舉送出太頻繁，請稍後再試。');
  if (hasOversizedContent(request, MAX_BODY_BYTES)) return NextResponse.json({ error: '檢舉內容過大。' }, { status: 413 });

  const auth = await requireUser(request);
  if ('response' in auth) return auth.response;

  try {
    const body: unknown = await request.json();
    if (!isRecord(body)) return NextResponse.json({ error: '檢舉格式不正確。' }, { status: 400 });

    const targetType = clampText(body.targetType, 40);
    const targetId = clampText(body.targetId, 80);
    const category = clampText(body.category, 40);
    const details = clampText(body.details, 2_000).replace(/\u0000/g, '');

    if (!isAllowed(targetType, TARGET_TYPES) || !UUID_RE.test(targetId)) return NextResponse.json({ error: '檢舉對象不正確。' }, { status: 400 });
    if (!isAllowed(category, REPORT_CATEGORIES)) return NextResponse.json({ error: '檢舉分類不正確。' }, { status: 400 });
    if (!details) return NextResponse.json({ error: '請填寫檢舉補充說明。' }, { status: 400 });

    const profileLookupClient = targetType === 'profile' ? getServiceClient() : null;
    if (targetType === 'profile' && !profileLookupClient) return NextResponse.json({ error: '伺服器設定錯誤。' }, { status: 500 });
    let targetQuery;
    if (targetType === 'article') {
      targetQuery = auth.client.from('articles').select('id,author_id,status').eq('id', targetId).eq('status', 'published').maybeSingle();
    } else if (targetType === 'forum_post') {
      targetQuery = auth.client.from('forum_posts').select('id,author_id,status').eq('id', targetId).eq('status', 'published').maybeSingle();
    } else if (targetType === 'forum_comment') {
      targetQuery = auth.client.from('forum_comments').select('id,author_id,status').eq('id', targetId).eq('status', 'published').maybeSingle();
    } else if (targetType === 'realtime_message') {
      targetQuery = auth.client.from('lobby_chat').select('id,author_id,is_hidden').eq('id', targetId).eq('is_hidden', false).maybeSingle();
    } else {
      targetQuery = profileLookupClient!.from('profiles').select('id').eq('id', targetId).maybeSingle();
    }
    const { data: target, error: targetError } = await targetQuery;
    if (targetError || !target) return NextResponse.json({ error: '找不到可檢舉的公開內容。' }, { status: 404 });
    const targetOwnerId = 'author_id' in target ? target.author_id : targetType === 'profile' ? target.id : null;
    if (targetOwnerId === auth.user.id) return NextResponse.json({ error: '不能檢舉自己的內容。' }, { status: 400 });

    const { error } = await auth.client.from('reports').insert({
      reporter_id: auth.user.id,
      target_type: targetType,
      target_id: targetId,
      reason: category,
      category,
      details,
      status: 'open',
      updated_at: new Date().toISOString(),
    });

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: '你已經檢舉過這個內容，請等待管理員處理。' }, { status: 409 });
      console.error('建立檢舉錯誤:', error);
      return NextResponse.json({ error: '檢舉暫時無法送出，請稍後再試。' }, { status: 503 });
    }

    return NextResponse.json({ ok: true, message: '檢舉已送出。' }, { status: 201 });
  } catch (error: unknown) {
    console.error('建立檢舉 API 錯誤:', error);
    return NextResponse.json({ error: '檢舉格式不正確。' }, { status: 400 });
  }
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ('response' in auth) return auth.response;

  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 50), 1), 100);
  const offset = Math.max(Number(url.searchParams.get('offset') || 0), 0);
  let query = auth.client.from('reports').select('id,reporter_id,target_type,target_id,reason,category,details,status,resolved_action,admin_note,reviewed_by,reviewed_at,created_at,updated_at').order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  if (status && ['open', 'reviewing', 'resolved', 'dismissed'].includes(status)) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: '檢舉列表暫時無法載入。' }, { status: 503 });
  return NextResponse.json({ reports: data || [], limit, offset });
}
