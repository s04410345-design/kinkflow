import type { DiscussionPost, EmojiCount, Reply } from '@/lib/types';
import { extractDiscussionContent } from '@/lib/contentModel';

export type DiscussionRow = {
  id?: unknown;
  node_id?: unknown;
  author?: unknown;
  text?: unknown;
  title?: unknown;
  body?: unknown;
  media?: unknown;
  upvotes?: unknown;
  timestamp?: unknown;
  created_at?: unknown;
  replies?: unknown;
  emojis?: unknown;
};

function isId(value: unknown): value is string | number {
  return typeof value === 'string' || typeof value === 'number';
}

function parseTimestamp(value: unknown): string | number | null | undefined {
  return typeof value === 'string' || typeof value === 'number' ? value : null;
}

function parseReplies(value: unknown): Reply[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): Reply[] => {
    if (!item || typeof item !== 'object') return [];
    const candidate = item as Record<string, unknown>;
    if (!isId(candidate.id) || typeof candidate.author !== 'string' || typeof candidate.text !== 'string') return [];
    return [{
      id: candidate.id,
      author: candidate.author,
      text: candidate.text,
      timestamp: typeof candidate.timestamp === 'number' ? candidate.timestamp : undefined,
      upvotes: typeof candidate.upvotes === 'number' ? candidate.upvotes : undefined,
      emojis: parseEmojis(candidate.emojis),
    }];
  });
}

function parseEmojis(value: unknown): EmojiCount[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): EmojiCount[] => {
    if (!item || typeof item !== 'object') return [];
    const candidate = item as Record<string, unknown>;
    if (typeof candidate.char !== 'string' || typeof candidate.count !== 'number') return [];
    return [{ char: candidate.char, count: Math.max(0, candidate.count) }];
  });
}

export function mapDiscussionRow(row: DiscussionRow): DiscussionPost | null {
  if (!isId(row.id) || typeof row.node_id !== 'string') return null;

  const sourceText = typeof row.text === 'string' ? row.text : row.body;
  const content = extractDiscussionContent(sourceText, row.title, row.body, row.media);

  return {
    id: row.id,
    author: typeof row.author === 'string' && row.author.trim() ? row.author : '匿名會員',
    text: typeof sourceText === 'string' ? sourceText : content.body || '這篇討論目前沒有正文。',
    ...content,
    upvotes: Number.isFinite(Number(row.upvotes)) ? Number(row.upvotes) : 0,
    timestamp: parseTimestamp(row.timestamp) ?? parseTimestamp(row.created_at),
    replies: parseReplies(row.replies),
    emojis: parseEmojis(row.emojis),
    nodeId: row.node_id,
  };
}

export function groupDiscussionRows(rows: readonly DiscussionRow[]): Record<string, DiscussionPost[]> {
  const grouped: Record<string, DiscussionPost[]> = {};
  for (const row of rows) {
    const post = mapDiscussionRow(row);
    if (!post || !post.nodeId) continue;
    const nodeId = post.nodeId;
    grouped[nodeId] ??= [];
    grouped[nodeId].push(post);
  }
  return grouped;
}
