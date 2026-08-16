import { NextResponse } from 'next/server';
import { getServiceClient, requireAdmin } from '@/lib/serverAuth';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ discussionId: string }>;
};

function isValidDiscussionId(value: string) {
  return value.length > 0 && value.length <= 128 && /^[A-Za-z0-9_-]+$/.test(value);
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = await requireAdmin(request);
  if ('response' in auth) return auth.response;

  const { discussionId } = await params;
  if (!isValidDiscussionId(discussionId)) {
    return NextResponse.json({ error: 'Invalid discussion ID' }, { status: 400 });
  }

  const serviceClient = getServiceClient();
  if (!serviceClient) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const body = await request.json().catch(() => ({})) as { replyId?: string | number };
  const hasReplyId = body.replyId !== undefined && body.replyId !== null;

  if (hasReplyId) {
    const replyId = String(body.replyId);
    if (!isValidDiscussionId(replyId)) {
      return NextResponse.json({ error: 'Invalid reply ID' }, { status: 400 });
    }

    const { data: deletedReply, error: deleteReplyError } = await serviceClient
      .from('discussions')
      .delete()
      .eq('id', replyId)
      .eq('parent_id', discussionId)
      .select('id,parent_id')
      .maybeSingle();

    if (deleteReplyError) {
      return NextResponse.json({ error: 'Unable to delete reply' }, { status: 500 });
    }
    if (!deletedReply) {
      return NextResponse.json({ error: 'Reply not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, deleted: { discussionId, replyId: deletedReply.id } });
  }

  const { data: deleted, error: deleteError } = await serviceClient
    .from('discussions')
    .delete()
    .eq('id', discussionId)
    .select('id,node_id')
    .maybeSingle();

  if (deleteError) {
    return NextResponse.json({ error: 'Unable to delete discussion' }, { status: 500 });
  }
  if (!deleted) {
    return NextResponse.json({ error: 'Discussion not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, deleted: { id: deleted.id, node_id: deleted.node_id } });
}
