import type { DiscussionPost } from '@/lib/types';
import { formatDiscussionDate, parseDiscussionDate } from '@/lib/contentModel';

export type AdminLogDetails = {
  userName?: string;
  email?: string;
  top_trait?: string;
  node_label?: string;
  node_id?: string;
  vote_type?: string;
  [key: string]: unknown;
};

export type AdminLogEntry = {
  id: string;
  created_at: string;
  action_type: string;
  details: AdminLogDetails;
  device_id?: string | null;
};

export type CommentLogItem = {
  id: string;
  nodeId: string;
  author: string;
  text: string;
  timestamp: string | number;
  type: 'post' | 'reply';
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeAdminLog(value: unknown): AdminLogEntry | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.created_at !== 'string' || typeof value.action_type !== 'string') {
    return null;
  }
  const rawDetails = isRecord(value.details) ? value.details : {};
  return {
    id: value.id,
    created_at: value.created_at,
    action_type: value.action_type,
    details: rawDetails as AdminLogDetails,
    device_id: typeof value.device_id === 'string' ? value.device_id : null,
  };
}

export function buildCommentLogs(discussions: Record<string, DiscussionPost[]>): CommentLogItem[] {
  return Object.entries(discussions)
    .flatMap(([nodeId, posts]) => posts.flatMap((post) => {
      const items: CommentLogItem[] = [{
        id: String(post.id),
        nodeId,
        author: post.author,
        text: post.text,
        timestamp: post.timestamp ?? new Date().toISOString(),
        type: 'post',
      }];
      post.replies?.forEach((reply, index) => {
        items.push({
          id: `${post.id}_reply_${index}`,
          nodeId,
          author: reply.author,
          text: reply.text,
          timestamp: reply.timestamp ?? post.timestamp ?? new Date().toISOString(),
          type: 'reply',
        });
      });
      return items;
    }))
    .sort((a, b) => (parseDiscussionDate(b.timestamp)?.getTime() || 0) - (parseDiscussionDate(a.timestamp)?.getTime() || 0));
}

export function getLogDisplayName(log: AdminLogEntry): string {
  return log.details.userName || log.details.email || '未命名訪客';
}

export function getBaseUserName(name: string): string {
  return name.replace(' ☑️', '').replace(' 👻', '').split('@')[0];
}

export function matchesAdminUser(name: string | undefined, deviceId: string | null | undefined, selectedUser: string | null): boolean {
  if (!selectedUser) return true;
  const targetBase = getBaseUserName(selectedUser);
  return Boolean((name && getBaseUserName(name) === targetBase) || (deviceId && deviceId === selectedUser));
}

export function matchesSearch(value: string, query: string): boolean {
  return !query || value.toLowerCase().includes(query.toLowerCase());
}

export function formatLogDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '未記錄時間' : date.toLocaleString('zh-TW');
}

export function formatCommentLog(item: CommentLogItem, nodeNameMap: Record<string, string>): string {
  return `- **${formatDiscussionDate(item.timestamp)}**: ${item.author} 在 [${nodeNameMap[item.nodeId] || item.nodeId}] 留言: "${item.text}"`;
}
