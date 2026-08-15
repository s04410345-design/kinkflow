import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/serverAuth';
import { clampText, hasOversizedContent, isRecord } from '@/lib/server/rateLimit';

const REPORT_STATUSES = ['open', 'reviewing', 'resolved', 'dismissed'] as const;
const RESOLVED_ACTIONS = ['none', 'warn', 'hide_content', 'delete_content', 'restore_content'] as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ReportStatus = typeof REPORT_STATUSES[number];
type ResolvedAction = typeof RESOLVED_ACTIONS[number];

function isAllowed<T extends readonly string[]>(value: string, values: T): value is T[number] {
  return values.includes(value as T[number]);
}

export async function PATCH(request: Request, context: { params: Promise<{ reportId: string }> }) {
  const auth = await requireAdmin(request);
  if ('response' in auth) return auth.response;
  if (hasOversizedContent(request, 8_000)) return NextResponse.json({ error: '處理備註過大。' }, { status: 413 });

  const { reportId } = await context.params;
  if (!UUID_RE.test(reportId)) return NextResponse.json({ error: '檢舉 ID 不正確。' }, { status: 400 });

  try {
    const body: unknown = await request.json();
    if (!isRecord(body)) return NextResponse.json({ error: '處理格式不正確。' }, { status: 400 });
    const status = clampText(body.status, 20);
    const resolvedAction = clampText(body.resolvedAction, 30);
    const adminNote = clampText(body.adminNote, 2_000).replace(/\u0000/g, '');
    if (!isAllowed(status, REPORT_STATUSES)) return NextResponse.json({ error: '檢舉狀態不正確。' }, { status: 400 });
    if (!isAllowed(resolvedAction, RESOLVED_ACTIONS)) return NextResponse.json({ error: '處理動作不正確。' }, { status: 400 });
    if (status === 'resolved' && resolvedAction === 'none') return NextResponse.json({ error: '完成檢舉處理時請選擇處理動作。' }, { status: 400 });

    const { data: current, error: currentError } = await auth.client.from('reports').select('id,status,target_type,target_id').eq('id', reportId).maybeSingle();
    if (currentError || !current) return NextResponse.json({ error: '找不到這筆檢舉。' }, { status: 404 });
    const previousStatus = String(current.status) as ReportStatus;
    const actionType = status === 'reviewing' ? 'start_review' : status === 'resolved' ? 'resolve' : status === 'dismissed' ? 'dismiss' : 'reopen';
    const now = new Date().toISOString();

    const { data: updated, error: updateError } = await auth.client.from('reports').update({
      status,
      resolved_action: resolvedAction,
      admin_note: adminNote,
      reviewed_by: auth.user.id,
      reviewed_at: status === 'open' ? null : now,
      updated_at: now,
    }).eq('id', reportId).select('id,status,resolved_action,admin_note,reviewed_by,reviewed_at,updated_at').single();
    if (updateError || !updated) return NextResponse.json({ error: '檢舉狀態更新失敗。' }, { status: 503 });

    const { error: eventError } = await auth.client.from('report_events').insert({
      report_id: reportId,
      admin_id: auth.user.id,
      from_status: previousStatus,
      to_status: status,
      action_type: actionType,
      resolved_action: resolvedAction,
      admin_note: adminNote,
    });
    if (eventError) return NextResponse.json({ error: '檢舉已更新，但稽核紀錄寫入失敗。' }, { status: 503 });

    const { error: moderationError } = await auth.client.from('moderation_actions').insert({
      admin_id: auth.user.id,
      target_type: current.target_type,
      target_id: current.target_id,
      action_type: status === 'resolved' ? 'resolve_report' : status === 'dismissed' ? 'reject_report' : 'resolve_report',
      reason: adminNote,
    });
    if (moderationError) return NextResponse.json({ error: '檢舉已更新，但管理稽核紀錄寫入失敗。' }, { status: 503 });

    return NextResponse.json({ ok: true, report: updated });
  } catch (error: unknown) {
    console.error('Report update API error:', error);
    return NextResponse.json({ error: '處理格式不正確。' }, { status: 400 });
  }
}
