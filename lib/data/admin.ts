import type { DiscussionPost, GraphNode } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { mapDiscussionRow, type DiscussionRow } from '@/lib/data/discussions';

export type AdminNodeImages = Record<string, { icon?: string; image?: string; kamon?: string; realistic?: string }>;
export type AdminLogEntry = { id: string; created_at: string; action_type: string; details: Record<string, unknown>; device_id?: string | null };
export type AdminUser = { user_id: string; role_level: number; granted_by?: string | null; created_at: string };
export type AuthorApplication = { user_id: string; status: 'pending' | 'approved' | 'rejected' | string; application_text: string; reviewed_by?: string | null; reviewed_at?: string | null; review_note?: string | null; created_at: string; updated_at: string };
export type AdminReport = { id: string; reporter_id?: string | null; guest_key?: string | null; target_type: string; target_id: string; reason: string; category?: string | null; details?: string | null; status: string; resolved_action?: string | null; admin_note?: string | null; reviewed_by?: string | null; reviewed_at?: string | null; created_at: string; updated_at?: string | null };

export type AdminCmsData = {
  mindmapJson: string;
  quizJson: string;
  sheetConfig: Record<string, unknown>;
  nodeImages: AdminNodeImages;
  nodeNameMap: Record<string, string>;
  nodeParentMap: Record<string, string>;
  nodeLevelMap: Record<string, number>;
  discussions: Record<string, DiscussionPost[]>;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asNodes(value: unknown): GraphNode[] {
  return Array.isArray(value) ? value.filter((item): item is GraphNode => Boolean(item && typeof item === 'object' && typeof (item as Record<string, unknown>).id === 'string')) : [];
}

function toDiscussionPost(value: Record<string, unknown>): DiscussionPost | null {
  return mapDiscussionRow(value as DiscussionRow);
}

export async function fetchAdminCmsData(defaultNodes: GraphNode[], defaultQuizQuestions: unknown): Promise<AdminCmsData> {
  const keys = ['mindmap_data', 'mindmap_data_draft', 'quiz_system_config', 'google_sheets_config', 'node_images', 'node_images_draft'];
  const [contentResult, discussionResult] = await Promise.all([
    supabase.from('quiz_content').select('key_name,content').in('key_name', keys),
    supabase.from('discussions').select('id,node_id,author_id,text,media_url,parent_id,is_hidden,reach_score,created_at').limit(2000),
  ]);
  const content = new Map((contentResult.data || []).map((row) => [String(row.key_name), row.content as unknown]));
  // 後台優先載入草稿；前台只讀取正式的 mindmap_data / node_images key。
  const mindmap = asNodes(content.get('mindmap_data_draft') ?? content.get('mindmap_data'));
  const effectiveNodes = mindmap.length >= 10 ? mindmap : defaultNodes;
  const nodeNameMap: Record<string, string> = {};
  const nodeParentMap: Record<string, string> = {};
  const nodeLevelMap: Record<string, number> = {};
  effectiveNodes.forEach((node) => {
    if (node.id && node.label) nodeNameMap[node.id] = node.label;
    if (node.id && node.parent) nodeParentMap[node.id] = node.parent;
    if (node.id && typeof node.level === 'number') nodeLevelMap[node.id] = node.level;
  });
  nodeNameMap.lobby_board = '探索大廳-精華留言';
  nodeNameMap.lobby_chat = '探索大廳-即時聊天';

  const discussions: Record<string, DiscussionPost[]> = {};
  (discussionResult.data || []).forEach((row) => {
    const record = asRecord(row);
    const nodeId = typeof record.node_id === 'string' ? record.node_id : 'unknown';
    const post = toDiscussionPost(record);
    if (post) (discussions[nodeId] ||= []).push(post);
  });

  return {
    mindmapJson: JSON.stringify(effectiveNodes, null, 2),
    quizJson: JSON.stringify(content.get('quiz_system_config') || defaultQuizQuestions, null, 2),
    sheetConfig: asRecord(content.get('google_sheets_config')),
    nodeImages: asRecord(content.get('node_images_draft') ?? content.get('node_images')) as AdminNodeImages,
    nodeNameMap,
    nodeParentMap,
    nodeLevelMap,
    discussions,
  };
}

export async function fetchAdminLogs(limit = 1000): Promise<AdminLogEntry[]> {
  const { data } = await supabase.from('visitor_logs').select('id,created_at,action_type,details,device_id').order('created_at', { ascending: false }).limit(Math.min(Math.max(limit, 1), 2000));
  return (data || []) as AdminLogEntry[];
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const { data } = await supabase.from('admin_roles').select('user_id,role_level,granted_by,created_at').order('role_level', { ascending: true }).limit(100);
  return (data || []) as AdminUser[];
}

export async function fetchAuthorApplications(): Promise<AuthorApplication[]> {
  const { data, error } = await supabase.from('author_verifications').select('user_id,status,application_text,reviewed_by,reviewed_at,review_note,created_at,updated_at').order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  return (data || []) as AuthorApplication[];
}

export async function fetchAdminReports(): Promise<AdminReport[]> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error('管理員登入狀態已失效');
  const response = await fetch('/api/reports', { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' });
  const payload = await response.json().catch(() => ({})) as { reports?: AdminReport[]; error?: string };
  if (!response.ok) throw new Error(payload.error || '檢舉列表載入失敗');
  return payload.reports || [];
}

export async function resolveAdminReport(reportId: string, status: 'resolved' | 'dismissed', resolvedAction: 'none' | 'warn' | 'hide_content' | 'delete_content' | 'restore_content', adminNote: string): Promise<{ ok: boolean; message?: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return { ok: false, message: '管理員登入狀態已失效，請重新登入。' };
  try {
    const response = await fetch(`/api/reports/${encodeURIComponent(reportId)}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, resolvedAction, adminNote }),
    });
    const payload = await response.json().catch(() => ({})) as { error?: string };
    return response.ok ? { ok: true } : { ok: false, message: payload.error || '檢舉處理失敗，請確認管理員權限。' };
  } catch {
    return { ok: false, message: '檢舉服務暫時無法連線，請稍後再試。' };
  }
}

export async function reviewAuthorApplication(userId: string, status: 'approved' | 'rejected', reviewNote: string): Promise<{ ok: boolean; message?: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.user.id) return { ok: false, message: '管理員登入狀態已失效，請重新登入。' };
  const { error } = await supabase.from('author_verifications').update({ status, reviewed_by: sessionData.session.user.id, reviewed_at: new Date().toISOString(), review_note: reviewNote.trim().slice(0, 1000), updated_at: new Date().toISOString() }).eq('user_id', userId);
  return error ? { ok: false, message: '審核寫入失敗，請確認管理員權限與資料庫政策。' } : { ok: true };
}

export async function upsertAdminRole(userId: string, roleLevel: number): Promise<{ ok: boolean; message?: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const { error } = await supabase.from('admin_roles').upsert({ user_id: userId, role_level: roleLevel, granted_by: sessionData.session?.user.id || null });
  return error ? { ok: false, message: error.message } : { ok: true };
}

export async function removeAdminRole(userId: string): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabase.from('admin_roles').delete().eq('user_id', userId);
  return error ? { ok: false, message: error.message } : { ok: true };
}

export async function saveAdminContent(keyName: string, data: unknown, isJson = true): Promise<{ ok: boolean; message?: string }> {
  try {
    const content = isJson ? JSON.parse(String(data)) as unknown : data;
    const { error } = await supabase.from('quiz_content').upsert({ key_name: keyName, content }, { onConflict: 'key_name' });
    return error ? { ok: false, message: error.message } : { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : '資料格式錯誤' };
  }
}

export async function publishQuizContent(quizJson: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const content = JSON.parse(quizJson) as unknown;
    if (!content || typeof content !== 'object' || Array.isArray(content)) return { ok: false, message: '測驗內容格式不可為空。' };
    const { error } = await supabase.from('quiz_content').upsert({ key_name: 'quiz_system_config', content }, { onConflict: 'key_name' });
    return error ? { ok: false, message: error.message } : { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : '測驗發布內容格式錯誤' };
  }
}

export async function publishNodeContent(mindmapJson: string, nodeImages: AdminNodeImages): Promise<{ ok: boolean; message?: string }> {
  try {
    const nodes = JSON.parse(mindmapJson) as unknown;
    if (!Array.isArray(nodes) || nodes.length === 0) return { ok: false, message: '節點內容不可為空。' };
    const { error } = await supabase.from('quiz_content').upsert([
      { key_name: 'mindmap_data', content: nodes },
      { key_name: 'node_images', content: nodeImages },
    ], { onConflict: 'key_name' });
    return error ? { ok: false, message: error.message } : { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : '發布內容格式錯誤' };
  }
}

export type AdminDiscussionItem = {
  id: string | number;
  author: string;
  text: string;
  upvotes: number;
  timestamp: number | string | null | undefined;
  node_id?: string;
  replies?: DiscussionPost['replies'];
  emojis?: DiscussionPost['emojis'];
  replyCount?: number;
  isReply?: boolean;
  parentId?: string | number;
};

export async function fetchAdminDiscussionItems(): Promise<{ posts: AdminDiscussionItem[]; nodeNames: Record<string, string> }> {
  const [{ data: mdArr }, { data, error }, { data: profiles }] = await Promise.all([
    supabase.from('quiz_content').select('content').eq('key_name', 'mindmap_data').limit(1),
    supabase.from('discussions').select('id,node_id,author_id,text,media_url,parent_id,is_hidden,reach_score,created_at').limit(2000),
    supabase.from('profiles').select('id,username').limit(5000),
  ]);
  if (error) throw error;

  const nodeNames: Record<string, string> = { lobby_chat: '即時聊天大廳', lobby_board: '討論交流大廳' };
  const mindmapContent = mdArr?.[0]?.content;
  asNodes(mindmapContent).forEach((node) => {
    if (node.id && node.label) nodeNames[node.id] = node.label;
  });

  const authorNames = new Map((profiles || []).map((profile) => [String(profile.id), typeof profile.username === 'string' ? profile.username : '匿名']));
  const replyCounts = new Map<string, number>();
  (data || []).forEach((row) => {
    const parentId = asRecord(row).parent_id;
    if (typeof parentId === 'string' && parentId) replyCounts.set(parentId, (replyCounts.get(parentId) || 0) + 1);
  });

  const posts: AdminDiscussionItem[] = [];
  (data || []).forEach((row) => {
    const record = asRecord(row);
    const id = typeof record.id === 'number' || typeof record.id === 'string' ? record.id : null;
    if (id === null) return;
    const parentId = typeof record.parent_id === 'string' ? record.parent_id : undefined;
    const authorId = typeof record.author_id === 'string' ? record.author_id : '';
    posts.push({
      id,
      author: authorNames.get(authorId) || (authorId ? `會員 ${authorId.slice(0, 8)}` : '匿名'),
      text: typeof record.text === 'string' ? record.text : '',
      upvotes: typeof record.reach_score === 'number' ? record.reach_score : 0,
      timestamp: typeof record.created_at === 'string' ? record.created_at : null,
      node_id: typeof record.node_id === 'string' ? record.node_id : 'lobby_board',
      replyCount: parentId ? undefined : replyCounts.get(String(id)) || 0,
      isReply: Boolean(parentId),
      parentId,
    });
  });
  return { posts, nodeNames };
}

export async function deleteAdminDiscussion(item: AdminDiscussionItem): Promise<{ ok: boolean; message?: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return { ok: false, message: '管理員登入狀態已失效，請重新登入。' };

  const discussionId = item.isReply && item.parentId !== undefined ? item.parentId : item.id;
  const body = item.isReply ? JSON.stringify({ replyId: item.id }) : undefined;

  try {
    const response = await fetch(`/api/admin/discussions/${encodeURIComponent(String(discussionId))}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body } : {}),
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({})) as { error?: string };
    return response.ok ? { ok: true } : { ok: false, message: payload.error || '刪除失敗，請確認管理員權限。' };
  } catch {
    return { ok: false, message: '刪除服務暫時無法連線，請稍後再試。' };
  }
}

export async function deleteDiscussion(postId: string | number): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabase.from('discussions').delete().eq('id', postId);
  return error ? { ok: false, message: error.message } : { ok: true };
}

export async function clearNodeDiscussions(nodeId: string): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabase.from('discussions').delete().eq('node_id', nodeId);
  return error ? { ok: false, message: error.message } : { ok: true };
}

export async function clearVisitorLogs(): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabase.from('visitor_logs').delete().not('id', 'is', null);
  return error ? { ok: false, message: error.message } : { ok: true };
}
