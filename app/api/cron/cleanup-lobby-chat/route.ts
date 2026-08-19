import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/serverAuth';

export const runtime = 'nodejs';

const BATCH_SIZE = 1000;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization');
  return Boolean(secret && authorization === `Bearer ${secret}`);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: '未授權的排程請求' }, { status: 401 });
  const serviceClient = getServiceClient();
  if (!serviceClient) return NextResponse.json({ error: '伺服器設定錯誤' }, { status: 500 });

  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: expiredRows, error: expiredError } = await serviceClient
    .from('lobby_chat')
    .select('id')
    .lt('created_at', cutoff)
    .limit(BATCH_SIZE);
  if (expiredError) return NextResponse.json({ error: '過期聊天查詢失敗' }, { status: 503 });

  const expiredIds = (expiredRows || []).map((row) => row.id).filter((id): id is string => typeof id === 'string');
  if (!expiredIds.length) return NextResponse.json({ ok: true, deleted: 0, protected: 0 });

  const { data: protectedRows, error: protectedError } = await serviceClient
    .from('reports')
    .select('target_id')
    .eq('target_type', 'realtime_message')
    .in('target_id', expiredIds)
    .in('status', ['open', 'reviewing'])
    .limit(BATCH_SIZE);
  if (protectedError) return NextResponse.json({ error: '檢舉保護查詢失敗' }, { status: 503 });

  const protectedIds = new Set((protectedRows || []).map((row) => row.target_id).filter((id): id is string => typeof id === 'string'));
  const deleteIds = expiredIds.filter((id) => !protectedIds.has(id));
  if (!deleteIds.length) return NextResponse.json({ ok: true, deleted: 0, protected: protectedIds.size });

  const { error: deleteError } = await serviceClient.from('lobby_chat').delete().in('id', deleteIds);
  if (deleteError) return NextResponse.json({ error: '過期聊天清理失敗' }, { status: 503 });
  return NextResponse.json({ ok: true, deleted: deleteIds.length, protected: protectedIds.size });
}
