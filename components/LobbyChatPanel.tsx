"use client";

import { useCallback, useEffect, useState } from 'react';
import {
  createLobbyChatMessage,
  fetchLobbyChat,
  type LobbyChatMessage,
} from '@/lib/data/lobbyChat';

function formatMessageTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '剛剛';
  return new Intl.DateTimeFormat('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

type LobbyChatPanelProps = {
  onClose: () => void;
};

export default function LobbyChatPanel({ onClose }: LobbyChatPanelProps) {
  const [messages, setMessages] = useState<LobbyChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      setMessages(await fetchLobbyChat(100));
      setNotice(null);
    } catch (error: unknown) {
      setNotice(error instanceof Error ? error.message : '即時聊天暫時無法載入。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMessages();
    const refreshTimer = window.setInterval(() => {
      if (document.visibilityState !== 'hidden') void loadMessages();
    }, 15000);
    return () => window.clearInterval(refreshTimer);
  }, [loadMessages]);

  const submitMessage = async () => {
    const text = messageText.trim();
    if (!text || sending) return;
    setSending(true);
    setNotice(null);
    const result = await createLobbyChatMessage(text);
    if (!result.ok) {
      setNotice(result.message || '聊天訊息發送失敗，請稍後再試。');
    } else {
      setMessageText('');
      await loadMessages();
    }
    setSending(false);
  };

  return (
    <section
      aria-label="大廳即時聊天"
      className="fixed bottom-20 left-4 z-40 flex h-[min(70vh,560px)] w-[min(92vw,380px)] flex-col overflow-hidden rounded-2xl border border-[#D1C6B4]/30 bg-white shadow-2xl animate-fade-in"
    >
      <header className="flex shrink-0 items-center justify-between bg-[#172033] px-4 py-3 text-white">
        <div>
          <h2 className="text-sm font-black">大廳即時聊天</h2>
          <p className="mt-0.5 text-[10px] text-white/70">全站成員都可以在這裡交流</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-2.5 py-1 text-sm font-bold text-white/80 transition hover:bg-white/15 hover:text-white"
          aria-label="關閉大廳即時聊天"
        >
          ✕
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#FDFBF7] p-3">
        {notice && (
          <div className="mb-3 rounded-xl border border-[#FCD34D] bg-[#FFFBEB] p-2.5 text-xs font-semibold text-[#92400E]" role="status">
            {notice}
          </div>
        )}
        {loading ? (
          <p className="py-10 text-center text-xs font-semibold text-[#4A4238]/50">載入聊天內容中…</p>
        ) : messages.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#D1C6B4]/60 bg-white/70 px-4 py-10 text-center text-xs font-semibold text-[#4A4238]/55">目前還沒有聊天訊息，歡迎開始第一句話。</p>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <article key={message.id} className="rounded-xl border border-[#D1C6B4]/35 bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <strong className="truncate text-xs font-black text-[#362E25]">{message.author_id ? `會員 ${message.author_id.slice(0, 8)}` : '訪客'}</strong>
                  <time className="shrink-0 text-[10px] text-[#4A4238]/45" dateTime={message.created_at}>{formatMessageTime(message.created_at)}</time>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#2C251E]">{message.text}</p>
              </article>
            ))}
          </div>
        )}
      </div>

      <form
        className="shrink-0 border-t border-[#D1C6B4]/25 bg-white p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submitMessage();
        }}
      >
        <textarea
          value={messageText}
          onChange={(event) => setMessageText(event.target.value)}
          maxLength={240}
          rows={2}
          placeholder="輸入聊天內容（最多 240 字）"
          className="w-full resize-none rounded-xl border border-[#D1C6B4]/50 bg-[#FDFBF7] p-2.5 text-xs text-[#362E25] outline-none transition focus:border-[#172033]"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[10px] text-[#4A4238]/45">{messageText.length}/240</span>
          <button
            type="submit"
            disabled={sending || !messageText.trim()}
            className="rounded-xl bg-[#172033] px-4 py-2 text-xs font-black text-white transition hover:bg-[#334155] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {sending ? '發送中…' : '發送'}
          </button>
        </div>
      </form>
    </section>
  );
}
