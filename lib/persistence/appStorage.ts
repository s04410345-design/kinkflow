import type { AppData, DiscussionPost, Reply } from '@/lib/types';
import { initialAppData, SafeStorage } from '@/lib/constants';

type AppDataUpdater = AppData | ((previous: AppData) => AppData);
type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function parseReply(value: unknown): Reply | null {
  if (!isRecord(value)) return null;
  if ((typeof value.id !== 'string' && typeof value.id !== 'number') || typeof value.author !== 'string' || typeof value.text !== 'string') {
    return null;
  }
  return value as unknown as Reply;
}

function parseDiscussionPost(value: unknown): DiscussionPost | null {
  if (!isRecord(value)) return null;
  if ((typeof value.id !== 'string' && typeof value.id !== 'number') || typeof value.author !== 'string' || typeof value.text !== 'string') {
    return null;
  }
  if (typeof value.upvotes !== 'number') return null;
  return value as unknown as DiscussionPost;
}

function deduplicateReplies(replies: unknown): Reply[] | undefined {
  if (!Array.isArray(replies)) return undefined;

  const seenReplyKeys = new Set<string>();
  const normalizedReplies: Reply[] = [];
  for (const rawReply of replies) {
    const reply = parseReply(rawReply);
    if (!reply) continue;
    const duplicateKey = `${reply.author}_${reply.text}`;
    if (seenReplyKeys.has(duplicateKey)) continue;
    seenReplyKeys.add(duplicateKey);
    normalizedReplies.push(reply);
  }
  return normalizedReplies;
}

function normalizeDiscussionPosts(discussions: unknown): Record<string, DiscussionPost[]> {
  if (!isRecord(discussions)) return {};

  const normalized: Record<string, DiscussionPost[]> = {};
  for (const [nodeId, rawPosts] of Object.entries(discussions)) {
    if (!Array.isArray(rawPosts)) {
      normalized[nodeId] = [];
      continue;
    }

    const seenPostIds = new Set<string | number>();
    const normalizedPosts: DiscussionPost[] = [];
    for (const rawPost of rawPosts) {
      const post = parseDiscussionPost(rawPost);
      if (!post || seenPostIds.has(post.id)) continue;
      seenPostIds.add(post.id);
      const replies = deduplicateReplies(post.replies);
      normalizedPosts.push(replies ? { ...post, replies } : { ...post });
    }
    normalized[nodeId] = normalizedPosts;
  }

  return normalized;
}

export function normalizeCachedAppData(value: unknown): AppData | null {
  if (!isRecord(value)) return null;

  return {
    ...initialAppData,
    ...value,
    discussions: normalizeDiscussionPosts(value.discussions),
  } as AppData;
}

export function loadCachedAppData(): AppData | null {
  return normalizeCachedAppData(SafeStorage.get('kinkflow_data'));
}

export function persistAppData(value: AppData): void {
  SafeStorage.set('kinkflow_data', value);
}

export function updatePersistedAppData(updater: AppDataUpdater): AppData | null {
  const current = loadCachedAppData() ?? initialAppData;
  const next = typeof updater === 'function' ? updater(current) : updater;
  persistAppData(next);
  return next;
}

export function loadCachedGuestName(): string | null {
  const value = SafeStorage.get('kinkflow_user');
  return typeof value === 'string' ? value : null;
}

export function persistGuestName(name: string): void {
  SafeStorage.set('kinkflow_user', name);
}

export function removeGuestName(): void {
  SafeStorage.remove('kinkflow_user');
}
