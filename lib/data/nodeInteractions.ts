import { supabase } from '@/lib/supabase';
import type { DiscussionPost, VoteStats } from '@/lib/types';

export async function updateDiscussion(postId: string | number, updates: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from('discussions').update(updates).eq('id', postId);
  if (error) throw error;
}

export async function createDiscussion(nodeId: string, author: string, text: string): Promise<DiscussionPost> {
  const { data, error } = await supabase.from('discussions').insert({ node_id: nodeId, author, text, timestamp: Date.now() }).select().single();
  if (error || !data) throw error || new Error('資料未返回');
  const row = data as unknown as { id: string | number; timestamp?: number | string };
  return { id: row.id, author, text, upvotes: 0, timestamp: Number(row.timestamp || Date.now()), replies: [], emojis: [] };
}

export async function deleteDiscussionById(postId: string | number): Promise<void> {
  const { error } = await supabase.from('discussions').delete().eq('id', postId);
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

const EMPTY_VOTE_STATS: VoteStats = { need: 0, like: 0, curious: 0, neutral: 0, nope: 0 };

function normaliseVoteStats(value: unknown): VoteStats {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    need: Number(record.need || 0),
    like: Number(record.like || 0),
    curious: Number(record.curious || 0),
    neutral: Number(record.neutral || 0),
    nope: Number(record.nope || 0),
  };
}

export async function persistNodeVote(userId: string, nodeId: string, voteType: keyof VoteStats): Promise<{ stats: VoteStats; oldVote?: keyof VoteStats }> {
  const { data: oldVoteRow } = await supabase.from('node_votes').select('vote_type').eq('user_id', userId).eq('node_id', nodeId).maybeSingle();
  const oldVote = oldVoteRow?.vote_type as keyof VoteStats | undefined;
  if (oldVote === voteType) {
    const { error } = await supabase.from('node_votes').delete().eq('user_id', userId).eq('node_id', nodeId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('node_votes').upsert({ user_id: userId, node_id: nodeId, vote_type: voteType, updated_at: new Date().toISOString() }, { onConflict: 'user_id,node_id' });
    if (error) throw error;
  }

  const { data: votes } = await supabase.from('node_votes').select('vote_type').eq('node_id', nodeId);
  const stats: VoteStats = { ...EMPTY_VOTE_STATS };
  (votes || []).forEach((vote) => {
    const key = vote.vote_type as keyof VoteStats;
    if (key in stats) stats[key] += 1;
  });

  const { data: statsArr } = await supabase.from('quiz_content').select('content').eq('key_name', 'quiz_node_stats').limit(1);
  const currentStats = statsArr?.[0]?.content && typeof statsArr[0].content === 'object' ? statsArr[0].content as Record<string, unknown> : {};
  currentStats[nodeId] = normaliseVoteStats(stats);
  const { error: statsError } = await supabase.from('quiz_content').upsert({ key_name: 'quiz_node_stats', content: currentStats }, { onConflict: 'key_name' });
  if (statsError) throw statsError;
  return { stats, oldVote };
}
