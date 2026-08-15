import { supabase } from '@/lib/supabase';
import type { DiscussionPost } from '@/lib/types';

export type LobbyChatMessage = {
  id: string;
  author_id: string | null;
  text: string;
  media_url: string | null;
  parent_id: string | null;
  is_hidden: boolean;
  created_at: string;
};

export async function fetchLobbyChat(limit = 100): Promise<LobbyChatMessage[]> {
  const { data, error } = await supabase
    .from('lobby_chat')
    .select('id,author_id,text,media_url,parent_id,is_hidden,created_at')
    .eq('is_hidden', false)
    .order('created_at', { ascending: true })
    .limit(Math.min(Math.max(limit, 1), 200));
  if (error) return [];
  return (data || []) as LobbyChatMessage[];
}

export function lobbyChatToDiscussionPost(message: LobbyChatMessage): DiscussionPost {
  return {
    id: message.id,
    author: message.author_id ? `會員 ${message.author_id.slice(0, 8)}` : '訪客',
    text: message.text,
    media: message.media_url ? [{ type: 'image', url: message.media_url }] : [],
    upvotes: 0,
    timestamp: message.created_at,
    replies: [],
    emojis: [],
    nodeId: 'lobby_chat',
    nodeName: '即時聊天',
  };
}

export async function createLobbyChatMessage(text: string, mediaUrl?: string | null): Promise<{ ok: boolean; message?: string }> {
  const normalized = text.trim();
  if (!normalized || normalized.length > 240) return { ok: false, message: '聊天內容必須為 1 至 240 字。' };

  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from('lobby_chat').insert({
    author_id: userData.user?.id || null,
    text: normalized,
    media_url: mediaUrl || null,
  });
  if (error) {
    if (error.message.toLowerCase().includes('rate limit')) return { ok: false, message: '發送太快了，請稍後再試。' };
    return { ok: false, message: '聊天訊息發送失敗，請稍後再試。' };
  }
  return { ok: true };
}
