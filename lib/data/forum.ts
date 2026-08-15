import type { DiscussionPost, GraphNode } from '@/lib/types';
import { extractDiscussionContent } from '@/lib/contentModel';
import { supabase } from '@/lib/supabase';

export type ForumItem = DiscussionPost & {
  nodeId: string;
  nodeLabel: string;
  nodeColor: string;
  authorId?: string;
};

export type ForumComment = {
  id: string;
  body_text: string;
  created_at: string;
  author_id: string;
};

type LiveForumPost = {
  id: string;
  title: string;
  body_text: string;
  created_at: string;
  author_id: string;
  topic_id?: string | null;
  forum_topics?: { topic_node_links?: { node_id: string }[] }[];
  forum_post_media?: { media_assets?: { storage_path: string; media_type: string }[] }[];
};

function storageUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return supabase.storage.from('quiz-images').getPublicUrl(path).data.publicUrl;
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
    .select('id,title,body_text,created_at,author_id,topic_id,forum_topics(topic_node_links(node_id)),forum_post_media(media_assets(storage_path,media_type))')
    .eq('status', 'published')
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
    .select('id,body_text,created_at,author_id')
    .eq('post_id', postId)
    .eq('status', 'published')
    .order('created_at', { ascending: true })
    .limit(100);
  return (data || []) as ForumComment[];
}

export async function createForumPost(title: string, body: string): Promise<{ ok: boolean; message?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, message: '請先登入會員。' };
  const { error } = await supabase.from('forum_posts').insert({ author_id: userData.user.id, title, body_text: body, status: 'published' });
  if (error) return { ok: false, message: error.message.includes('permission') ? '目前帳號沒有發文權限。' : '發文失敗，請稍後再試。' };
  return { ok: true };
}

export async function createForumComment(postId: string, body: string): Promise<{ ok: boolean; message?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, message: '請先登入會員。' };
  const { error } = await supabase.from('forum_comments').insert({ post_id: postId, author_id: userData.user.id, body_text: body, status: 'published' });
  if (error) return { ok: false, message: error.message.includes('permission') ? '目前帳號沒有留言權限。' : '留言失敗，請稍後再試。' };
  return { ok: true };
}
