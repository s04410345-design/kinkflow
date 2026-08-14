import type { DiscussionPost, VoteStats } from '@/lib/types';

export type VoteType = keyof Pick<VoteStats, 'need' | 'like' | 'curious' | 'neutral' | 'nope'>;

export const VOTE_TYPES: VoteType[] = ['need', 'like', 'curious', 'neutral', 'nope'];

export function calculateVoteTotal(stats: Partial<VoteStats> | null | undefined): number {
  if (!stats) return 0;
  return VOTE_TYPES.reduce((total, type) => total + Math.max(0, Number(stats[type] || 0)), 0);
}

export function calculateVotePercent(value: number, stats: Partial<VoteStats> | null | undefined): number {
  const total = calculateVoteTotal(stats);
  if (total === 0) return 0;
  return Math.round((Math.max(0, value) / total) * 100);
}

export function voteSampleLabel(stats: Partial<VoteStats> | null | undefined): string {
  const total = calculateVoteTotal(stats);
  return total < 5 ? '樣本較少' : `${total} 票`;
}

export function discussionActivityScore(post: Pick<DiscussionPost, 'upvotes' | 'replies' | 'timestamp'>): number {
  const replyWeight = (post.replies?.length || 0) * 2;
  const ageHours = Math.max(0, (Date.now() - Number(post.timestamp || Date.now())) / 3_600_000);
  const freshness = Math.max(0, 48 - ageHours) / 48;
  return Math.max(0, Number(post.upvotes || 0)) + replyWeight + freshness;
}

export function sortDiscussionPosts(posts: DiscussionPost[], mode: 'hot' | 'latest'): DiscussionPost[] {
  return [...posts].sort((a, b) => mode === 'latest'
    ? Number(b.timestamp || 0) - Number(a.timestamp || 0)
    : discussionActivityScore(b) - discussionActivityScore(a));
}
