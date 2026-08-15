import type { DiscussionPost, GraphNode } from '@/lib/types';
import { extractDiscussionContent } from '@/lib/contentModel';
import { supabase } from '@/lib/supabase';

export type ForumItem = DiscussionPost & {
  nodeId: string;
  nodeLabel: string;
  nodeColor: string;
  authorId?: string;
  topicId?: string | null;
  status?: string;
};

export type ForumComment = {
  id: string;
  body_text: string;
  created_at: string;
  author_id: string;
  status?: string;
};

type LiveForumPost = {
  id: string;
  title: string;
  body_text: string;
  created_at: string;
  author_id: string;
  topic_id?: string | null;
  status?: string;
  forum_topics?: { topic_node_links?: { node_id: string }[] }[];
  forum_post_media?: { media_assets?: { storage_path: string; media_type: string }[] }[];
};

function storageUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return supabase.storage.from('quiz-images').getPublicUrl(path).data.publicUrl;
}

function errorMessage(error: { message?: string } | null, fallback: string): string {
  if (!error) return fallback;
  const message = error.message || '';
  if (/permission|row-level security|not authenticated|JWT/i.test(message)) return '目前帳號沒有這項操作權限。';
  if (/duplicate|unique/i.test(message)) return '這筆資料已經存在，請重新整理後再試。';
  return fallback;
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id || null;
}

export function formatForumDate(value: unknown): string {
  if (!value) return '日期未提供';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '日期未提供';
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

export function toLegacyForumItems(nodesData: GraphNode[], discussions: Record<string, DiscussionPost[]>): ForumItem[] {
  const nodes = new Map(nodesData.map((node) => [node.id, node]));
  return Object.entries(discussions).flatMap(([nodeId, posts]) => (posts || []).map((post) => {
    const node = nodes.get(nodeId);
    return {
      ...post,
      ...extractDiscussionContent(post.text, post.title, post.body, post.media),
      nodeId,
      nodeLabel: node?.label || post.nodeName || '未分類主題',
      nodeColor: node?.color || '#D9B650',
    };
  }));
}

export async function fetchPublishedForumPosts(nodesData: GraphNode[]): Promise<ForumItem[]> {
  const { data, error } = await supabase
    .from('forum_posts')
    .select('id,title,body_text,created_at,author_id,topic_id,status,forum_topics(topic_node_links(node_id)),forum_post_media(media_assets(storage_path,media_type))')
    .in('status', ['published', 'locked'])
    .order('created_at', { ascending: false })
    .limit(100);
  if (error || !data?.length) return [];

  const nodes = new Map(nodesData.map((node) => [node.id, node]));
  return (data as LiveForumPost[]).map((post) => {
    const nodeId = post.forum_topics?.[0]?.topic_node_links?.[0]?.node_id || '';
    const topicNode = nodeId ? nodes.get(nodeId) : undefined;
    const media = (post.forum_post_media || []).flatMap((entry) => {
      const asset = entry.media_assets?.[0];
      return asset ? [{ url: storageUrl(asset.storage_path), type: asset.media_type === 'video' ? 'video' : 'image', alt: '討論附件' }] : [];
    });
    return {
      id: post.id,
      nodeId: topicNode?.id || 'all',
      nodeLabel: topicNode?.label || '社群討論',
      nodeColor: topicNode?.color || '#172033',
      title: post.title,
      body: post.body_text,
      text: post.body_text,
      media,
      author: '會員',
      authorId: post.author_id,
      topicId: post.topic_id,
      status: post.status,
      timestamp: post.created_at,
      upvotes: 0,
      replies: [],
      emojis: [],
    } as ForumItem;
  });
}

export async function fetchForumComments(postId: string): Promise<ForumComment[]> {
  const { data } = await supabase
    .from('forum_comments')
    .select('id,body_text,created_at,author_id,status')
    .eq('post_id', postId)
    .eq('status', 'published')
    .order('created_at', { ascending: true })
    .limit(100);
  return (data || []) as ForumComment[];
}

export async function createForumPost(title: string, body: string, nodeIds: string[] = []): Promise<{ ok: boolean; message?: string }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, message: '請先登入會員。' };
  const safeTitle = title.trim();
  const safeBody = body.trim();
  if (!safeTitle || safeTitle.length > 180) return { ok: false, message: '標題必須為 1 至 180 字。' };
  if (!safeBody || safeBody.length > 10000) return { ok: false, message: '文章內容必須為 1 至 10,000 字。' };
  const safeNodeIds = [...new Set(nodeIds.filter(Boolean))].slice(0, 3);
  let topicId: string | undefined;

  if (safeNodeIds.length) {
    const topicResult = await supabase.from('forum_topics').insert({ author_id: userId, title: safeTitle, excerpt: safeBody.slice(0, 240), status: 'published' }).select('id').single();
    if (topicResult.error || !topicResult.data?.id) return { ok: false, message: errorMessage(topicResult.error, '建立討論主題失敗，請稍後再試。') };
    topicId = topicResult.data.id;
    const linksResult = await supabase.from('topic_node_links').insert(safeNodeIds.map((nodeId) => ({ topic_id: topicId, node_id: nodeId, relation_type: 'related' })));
    if (linksResult.error) {
      await supabase.from('forum_topics').delete().eq('id', topicId);
      return { ok: false, message: errorMessage(linksResult.error, '建立主題 Tag 失敗，請稍後再試。') };
    }
  }

  const { error } = await supabase.from('forum_posts').insert({ author_id: userId, topic_id: topicId || null, title: safeTitle, body_text: safeBody, status: 'published' });
  if (error) {
    if (topicId) await supabase.from('forum_topics').delete().eq('id', topicId);
    return { ok: false, message: errorMessage(error, '發文失敗，請稍後再試。') };
  }
  return { ok: true };
}

export async function updateForumPost(postId: string, title: string, body: string): Promise<{ ok: boolean; message?: string }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, message: '請先登入會員。' };
  const safeTitle = title.trim();
  const safeBody = body.trim();
  if (!safeTitle || safeTitle.length > 180) return { ok: false, message: '標題必須為 1 至 180 字。' };
  if (!safeBody || safeBody.length > 10000) return { ok: false, message: '文章內容必須為 1 至 10,000 字。' };
  const { error } = await supabase.from('forum_posts').update({ title: safeTitle, body_text: safeBody, updated_at: new Date().toISOString() }).eq('id', postId).eq('author_id', userId);
  return error ? { ok: false, message: errorMessage(error, '編輯文章失敗，請稍後再試。') } : { ok: true };
}

export async function deleteForumPost(postId: string): Promise<{ ok: boolean; message?: string }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, message: '請先登入會員。' };
  const { error } = await supabase.from('forum_posts').update({ status: 'deleted', updated_at: new Date().toISOString() }).eq('id', postId).eq('author_id', userId);
  return error ? { ok: false, message: errorMessage(error, '刪除文章失敗，請稍後再試。') } : { ok: true };
}

export async function createForumComment(postId: string, body: string): Promise<{ ok: boolean; message?: string }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, message: '請先登入會員。' };
  const safeBody = body.trim();
  if (!safeBody || safeBody.length > 2000) return { ok: false, message: '留言必須為 1 至 2,000 字。' };
  const { error } = await supabase.from('forum_comments').insert({ post_id: postId, author_id: userId, body_text: safeBody, status: 'published' });
  return error ? { ok: false, message: errorMessage(error, '留言失敗，請稍後再試。') } : { ok: true };
}

export async function updateForumComment(commentId: string, body: string): Promise<{ ok: boolean; message?: string }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, message: '請先登入會員。' };
  const safeBody = body.trim();
  if (!safeBody || safeBody.length > 2000) return { ok: false, message: '留言必須為 1 至 2,000 字。' };
  const { error } = await supabase.from('forum_comments').update({ body_text: safeBody, updated_at: new Date().toISOString() }).eq('id', commentId).eq('author_id', userId);
  return error ? { ok: false, message: errorMessage(error, '編輯留言失敗，請稍後再試。') } : { ok: true };
}

export async function deleteForumComment(commentId: string): Promise<{ ok: boolean; message?: string }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, message: '請先登入會員。' };
  const { error } = await supabase.from('forum_comments').update({ status: 'deleted', updated_at: new Date().toISOString() }).eq('id', commentId).eq('author_id', userId);
  return error ? { ok: false, message: errorMessage(error, '刪除留言失敗，請稍後再試。') } : { ok: true };
}

export type ReportCategory = 'spam' | 'harassment' | 'safety' | 'privacy' | 'illegal' | 'hate' | 'self_harm' | 'misinformation' | 'other';

export async function reportForumContent(targetType: 'forum_post' | 'forum_comment', targetId: string, category: ReportCategory, details: string): Promise<{ ok: boolean; message?: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return { ok: false, message: '請先登入會員才能檢舉。' };
  const safeDetails = details.trim();
  if (!safeDetails || safeDetails.length > 2000) return { ok: false, message: '補充說明必須為 1 至 2,000 字。' };

  try {
    const response = await fetch('/api/reports', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetType, targetId, category, details: safeDetails }),
    });
    const payload = await response.json().catch(() => ({})) as { error?: string };
    return response.ok ? { ok: true } : { ok: false, message: payload.error || '檢舉送出失敗，請稍後再試。' };
  } catch {
    return { ok: false, message: '檢舉服務暫時無法連線，請稍後再試。' };
  }
}
