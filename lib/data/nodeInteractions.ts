import { supabase } from '@/lib/supabase';
import type { DiscussionPost, Reply, VoteStats } from '@/lib/types';
import { VOTE_TYPES, type VoteType } from '@/lib/contentModel';
import { mapDiscussionRow } from '@/lib/data/discussions';

const DISCUSSION_UPDATE_FIELDS = ['text', 'media_url', 'is_hidden', 'reach_score'] as const;
type DiscussionUpdate = Partial<Record<(typeof DISCUSSION_UPDATE_FIELDS)[number], string | number | boolean | null>>;

type DiscussionDbRow = {
  id: string;
  node_id: string;
  author_id: string | null;
  text: string;
  media_url: string | null;
  parent_id: string | null;
  is_hidden: boolean;
  reach_score: number;
  created_at: string;
};

function isVoteType(value: unknown): value is VoteType {
  return typeof value === 'string' && VOTE_TYPES.includes(value as VoteType);
}

function toDiscussionPost(row: DiscussionDbRow, authorName: string): DiscussionPost {
  const post = mapDiscussionRow({ ...row, author: authorName });
  if (!post) throw new Error('討論資料格式無效。');
  return post;
}

function toReply(row: DiscussionDbRow, authorName: string): Reply {
  return {
    id: row.id,
    author: authorName,
    text: row.text,
    timestamp: new Date(row.created_at).getTime(),
    upvotes: row.reach_score || 0,
    emojis: [],
  };
}

export async function updateDiscussion(postId: string | number, updates: DiscussionUpdate): Promise<void> {
  const safeUpdates = Object.fromEntries(
    Object.entries(updates).filter(([key]) => DISCUSSION_UPDATE_FIELDS.includes(key as (typeof DISCUSSION_UPDATE_FIELDS)[number])),
  );
  if (Object.keys(safeUpdates).length === 0) return;
  const { error } = await supabase.from('discussions').update(safeUpdates).eq('id', String(postId));
  if (error) throw error;
}

export async function createDiscussion(nodeId: string, authorId: string, authorName: string, text: string): Promise<DiscussionPost> {
  const safeText = text.trim();
  if (!safeText || safeText.length > 1000) throw new Error('討論內容必須為 1 至 1,000 字。');

  const { data, error } = await supabase
    .from('discussions')
    .insert({ node_id: nodeId, author_id: authorId, text: safeText })
    .select('id,node_id,author_id,text,media_url,parent_id,is_hidden,reach_score,created_at')
    .single();
  if (error || !data) throw error || new Error('討論資料未返回。');
  return toDiscussionPost(data as DiscussionDbRow, authorName);
}

export async function createDiscussionReply(nodeId: string, parentId: string, authorId: string, authorName: string, text: string): Promise<Reply> {
  const safeText = text.trim();
  if (!safeText || safeText.length > 1000) throw new Error('回覆內容必須為 1 至 1,000 字。');

  const { data, error } = await supabase
    .from('discussions')
    .insert({ node_id: nodeId, parent_id: parentId, author_id: authorId, text: safeText })
    .select('id,node_id,author_id,text,media_url,parent_id,is_hidden,reach_score,created_at')
    .single();
  if (error || !data) throw error || new Error('回覆資料未返回。');
  return toReply(data as DiscussionDbRow, authorName);
}

export async function deleteDiscussionById(postId: string | number): Promise<void> {
  const { error } = await supabase.from('discussions').delete().eq('id', String(postId));
  if (error) throw error;
}

export async function deleteDiscussionReplyById(replyId: string | number): Promise<void> {
  const { error } = await supabase.from('discussions').delete().eq('id', String(replyId));
  if (error) throw error;
}

export async function notifyReply(targetAuthorName: string, currentAuthorName: string, text: string, nodeId: string): Promise<void> {
  if (!targetAuthorName || targetAuthorName === currentAuthorName) return;
  const { data: profiles } = await supabase.from('profiles').select('id').or(`username.eq.${targetAuthorName},username.eq.${targetAuthorName} ☑️`).limit(1);
  const targetProfile = profiles?.[0] as { id?: string } | undefined;
  if (!targetProfile?.id) return;
  await supabase.from('notifications').insert({
    user_id: targetProfile.id,
    type: 'reply',
    content: `💬 【${currentAuthorName}】回覆了您的留言：「${text.slice(0, 30)}...」`,
    link_node: nodeId,
    is_read: false,
  });
}

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id || null;
}

export async function persistDiscussionLike(userId: string, postId: string | number): Promise<{ count: number; liked: boolean }> {
  const safePostId = String(postId);
  const { data: existing, error: readError } = await supabase
    .from('discussion_bookmarks')
    .select('id,is_like')
    .eq('user_id', userId)
    .eq('post_id', safePostId)
    .maybeSingle();
  if (readError) throw readError;

  let liked = true;
  if (existing?.id) {
    liked = !Boolean(existing.is_like);
    const { error } = await supabase
      .from('discussion_bookmarks')
      .update({ is_like: liked })
      .eq('id', existing.id)
      .eq('user_id', userId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('discussion_bookmarks')
      .insert({ user_id: userId, post_id: safePostId, is_like: true, is_bookmark: false });
    if (error) throw error;
  }

  const { count, error: countError } = await supabase
    .from('discussion_bookmarks')
    .select('id', { count: 'exact', head: true })
    .eq('post_id', safePostId)
    .eq('is_like', true);
  if (countError) throw countError;
  return { count: count || 0, liked };
}

const EMPTY_VOTE_STATS: VoteStats = { need: 0, like: 0, curious: 0, neutral: 0, nope: 0 };

export async function persistNodeVote(userId: string, nodeId: string, voteType: VoteType): Promise<{ stats: VoteStats; oldVote?: VoteType }> {
  const { data: oldVoteRow, error: oldVoteError } = await supabase
    .from('node_votes')
    .select('vote_type')
    .eq('user_id', userId)
    .eq('node_id', nodeId)
    .maybeSingle();
  if (oldVoteError) throw oldVoteError;

  const oldVote = isVoteType(oldVoteRow?.vote_type) ? oldVoteRow.vote_type : undefined;
  if (oldVote === voteType) {
    const { error } = await supabase.from('node_votes').delete().eq('user_id', userId).eq('node_id', nodeId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('node_votes')
      .upsert({ user_id: userId, node_id: nodeId, vote_type: voteType, updated_at: new Date().toISOString() }, { onConflict: 'node_id,user_id' });
    if (error) throw error;
  }

  const { data: votes, error: statsError } = await supabase
    .from('node_votes')
    .select('vote_type')
    .eq('node_id', nodeId)
    .limit(5000);
  if (statsError) throw statsError;

  const stats: VoteStats = { ...EMPTY_VOTE_STATS };
  (votes || []).forEach((vote) => {
    if (isVoteType(vote.vote_type)) stats[vote.vote_type] += 1;
  });
  return { stats, oldVote };
}
