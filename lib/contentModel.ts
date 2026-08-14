import type { DiscussionMedia, DiscussionPost, VoteStats } from './types';

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
  const timestamp = parseDiscussionDate(post.timestamp)?.getTime() || Date.now();
  const ageHours = Math.max(0, (Date.now() - timestamp) / 3600000);
  const freshness = Math.max(0, 48 - ageHours) / 48;
  return Math.max(0, Number(post.upvotes || 0)) + replyWeight + freshness;
}

export function sortDiscussionPosts<T extends Pick<DiscussionPost, 'upvotes' | 'replies' | 'timestamp'>>(posts: T[], mode: 'hot' | 'latest'): T[] {
  return [...posts].sort((a, b) => mode === 'latest'
    ? (parseDiscussionDate(b.timestamp)?.getTime() || 0) - (parseDiscussionDate(a.timestamp)?.getTime() || 0)
    : discussionActivityScore(b) - discussionActivityScore(a));
}


const SAFE_MEDIA_PROTOCOLS = new Set(['http:', 'https:']);

export function parseDiscussionDate(value: DiscussionPost['timestamp']): Date | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' || (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value))) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    const milliseconds = numeric < 10_000_000_000 ? numeric * 1000 : numeric;
    const date = new Date(milliseconds);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDiscussionDate(value: DiscussionPost['timestamp']): string {
  const date = parseDiscussionDate(value);
  if (!date) return '日期未提供';
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
}

export function safeDiscussionMediaUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2_000) return null;
  try {
    const url = new URL(value);
    return SAFE_MEDIA_PROTOCOLS.has(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export function extractDiscussionContent(text: unknown, rawTitle?: unknown, rawBody?: unknown, rawMedia?: unknown): Pick<DiscussionPost, 'title' | 'body' | 'media'> {
  const source = typeof text === 'string' ? text.trim() : '';
  const titleFromRow = typeof rawTitle === 'string' ? rawTitle.trim() : '';
  const bodyFromRow = typeof rawBody === 'string' ? rawBody.trim() : '';
  const mediaFromRow = Array.isArray(rawMedia) ? rawMedia : [];
  const markdownImages = [...source.matchAll(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/gi)];
  const media: DiscussionMedia[] = mediaFromRow.flatMap((item): DiscussionMedia[] => {
    if (typeof item === 'string') {
      const url = safeDiscussionMediaUrl(item);
      return url ? [{ type: 'image' as const, url }] : [];
    }
    if (!item || typeof item !== 'object') return [];
    const candidate = item as { url?: unknown; type?: unknown; alt?: unknown };
    const url = safeDiscussionMediaUrl(candidate.url);
    if (!url) return [];
    const type = candidate.type === 'gif' || candidate.type === 'video' ? candidate.type : 'image';
    return [{ type: type as DiscussionMedia['type'], url, alt: typeof candidate.alt === 'string' ? candidate.alt : undefined }];
  });
  markdownImages.forEach(([alt, url]) => {
    const safeUrl = safeDiscussionMediaUrl(url);
    if (safeUrl && !media.some((item) => item.url === safeUrl)) media.push({ type: 'image', url: safeUrl, alt });
  });
  const withoutImages = source.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/gi, '').replace(/\n{3,}/g, '\n\n').trim();
  const title = titleFromRow || withoutImages.split('\n')[0]?.slice(0, 120) || '未命名討論';
  const body = bodyFromRow || withoutImages || '這篇討論目前沒有正文。';
  return { title, body, media };
}
