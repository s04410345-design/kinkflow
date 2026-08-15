import { NextResponse } from 'next/server';
import { getServiceClient, requireAdmin } from '@/lib/serverAuth';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ discussionId: string }>;
};

type DiscussionReply = {
  id?: string | number;
  [key: string]: unknown;
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
    const { data: parent, error: readError } = await serviceClient
      .from('discussions')
      .select('replies')
      .eq('id', discussionId)
      .maybeSingle();

    if (readError) {
      return NextResponse.json({ error: 'Unable to read discussion' }, { status: 500 });
    }
    if (!parent) {
      return NextResponse.json({ error: 'Discussion not found' }, { status: 404 });
    }

    const replies = Array.isArray(parent.replies) ? parent.replies as DiscussionReply[] : [];
    const nextReplies = replies.filter((reply) => String(reply.id) !== String(body.replyId));
    if (nextReplies.length === replies.length) {
      return NextResponse.json({ error: 'Reply not found' }, { status: 404 });
    }

    const { error: updateError } = await serviceClient
      .from('discussions')
      .update({ replies: nextReplies })
      .eq('id', discussionId);

    if (updateError) {
      return NextResponse.json({ error: 'Unable to delete reply' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, deleted: { discussionId, replyId: body.replyId } });
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
