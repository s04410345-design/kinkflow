import type { DiscussionPost, EmojiCount, Reply } from '@/lib/types';
import { extractDiscussionContent } from '@/lib/contentModel';

export type DiscussionRow = {
  id?: unknown;
  node_id?: unknown;
  author?: unknown;
  author_id?: unknown;
  text?: unknown;
  title?: unknown;
  body?: unknown;
  media?: unknown;
  media_url?: unknown;
  upvotes?: unknown;
  timestamp?: unknown;
  created_at?: unknown;
  replies?: unknown;
  emojis?: unknown;
  parent_id?: unknown;
  is_hidden?: unknown;
  reach_score?: unknown;
};

function isId(value: unknown): value is string | number {
  return typeof value === 'string' || typeof value === 'number';
}

function idKey(value: unknown): string | null {
  return isId(value) ? String(value) : null;
}

function parseTimestamp(value: unknown): string | number | null | undefined {
  return typeof value === 'string' || typeof value === 'number' ? value : null;
}

function authorName(row: DiscussionRow): string {
  if (typeof row.author === 'string' && row.author.trim()) return row.author.trim();
  if (typeof row.author_id === 'string' && row.author_id) return `會員 ${row.author_id.slice(0, 8)}`;
  return '匿名會員';
}

function sourceText(row: DiscussionRow): string {
  if (typeof row.text === 'string') return row.text;
  if (typeof row.body === 'string') return row.body;
  return '';
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

function parseMedia(row: DiscussionRow): unknown {
  if (Array.isArray(row.media)) return row.media;
  if (typeof row.media_url === 'string' && row.media_url) return [{ url: row.media_url, type: 'image', alt: '討論附件' }];
  return undefined;
}

function isReplyRow(row: DiscussionRow): boolean {
  return idKey(row.parent_id) !== null;
}

export function mapDiscussionRow(row: DiscussionRow): DiscussionPost | null {
  if (!isId(row.id) || typeof row.node_id !== 'string') return null;

  const text = sourceText(row);
  const content = extractDiscussionContent(text, row.title, row.body, parseMedia(row));
  const reachScore = Number(row.reach_score);
  const legacyUpvotes = Number(row.upvotes);

  return {
    id: row.id,
    author: authorName(row),
    text: text || content.body || '這篇討論目前沒有正文。',
    ...content,
    upvotes: Number.isFinite(legacyUpvotes) ? legacyUpvotes : Number.isFinite(reachScore) ? reachScore : 0,
    timestamp: parseTimestamp(row.timestamp) ?? parseTimestamp(row.created_at),
    replies: parseReplies(row.replies),
    emojis: parseEmojis(row.emojis),
    nodeId: row.node_id,
  };
}

function mapReplyRow(row: DiscussionRow): Reply | null {
  if (!isId(row.id)) return null;
  const text = sourceText(row);
  if (!text.trim()) return null;
  const reachScore = Number(row.reach_score);
  return {
    id: row.id,
    author: authorName(row),
    text,
    timestamp: parseTimestamp(row.created_at) === null ? undefined : Number(new Date(String(row.created_at)).getTime()),
    upvotes: Number.isFinite(reachScore) ? reachScore : 0,
    emojis: parseEmojis(row.emojis),
  };
}

export function groupDiscussionRows(rows: readonly DiscussionRow[]): Record<string, DiscussionPost[]> {
  const grouped: Record<string, DiscussionPost[]> = {};
  const postsById = new Map<string, DiscussionPost>();

  for (const row of rows) {
    if (isReplyRow(row)) continue;
    const post = mapDiscussionRow(row);
    if (!post || !post.nodeId) continue;
    const nodeId = post.nodeId;
    grouped[nodeId] ??= [];
    grouped[nodeId].push(post);
    postsById.set(String(post.id), post);
  }

  for (const row of rows) {
    const parentId = idKey(row.parent_id);
    if (!parentId) continue;
    const reply = mapReplyRow(row);
    const parent = postsById.get(parentId);
    if (reply && parent) parent.replies = [...(parent.replies || []), reply];
  }

  return grouped;
}
