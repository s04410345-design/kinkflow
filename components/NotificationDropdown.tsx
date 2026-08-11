"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

type Notification = {
  id: string;
  type: 'reply' | 'hot' | 'system';
  content: string;
  link_node?: string;
  is_read: boolean;
  created_at: string;
};

export default function NotificationDropdown({ userId, onJump }: { userId?: string | null, onJump?: (nodeId: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
        
      if (!error && data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    };

    fetchNotifications();

    fetchNotifications();

    // ===== Supabase Realtime 關閉，改用輪詢避免 Vercel 報錯 =====
    /*
    const channel = supabase
      .channel(`notifications_${userId}_${Math.random().toString(36).substr(2, 9)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload) => {
        const newNotif = payload.new as Notification;
        setNotifications(prev => [newNotif, ...prev].slice(0, 20));
        setUnreadCount(prev => prev + 1);
      })
      .subscribe();
    */

    const fallbackInterval = setInterval(() => {
      fetchNotifications();
    }, 10000); // 10秒輪詢一次通知

    return () => {
      // supabase.removeChannel(channel);
      clearInterval(fallbackInterval);
    };
  }, [userId]);

  const markAsRead = async (id: string) => {
    const notif = notifications.find(n => n.id === id);
    if (!notif || notif.is_read) return;

    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));

    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
  };

  if (!userId) return null; // 訪客沒有通知鈴鐺

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="p-2 rounded-full hover:bg-gray-100 transition-colors relative"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-[#E08A8A] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-sm animate-bounce">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-72 sm:w-80 bg-white border border-[#D1C6B4]/30 shadow-xl rounded-xl z-50 animate-fade-in overflow-hidden">
          <div className="flex justify-between items-center p-3 border-b border-[#D1C6B4]/20 bg-[#FDFBF7]">
            <h3 className="font-bold text-sm text-[#4A4238]">通知中心</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs text-[#E08A8A] hover:underline">
                全部標示為已讀
              </button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto no-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#4A4238]/40">
                目前沒有新通知
              </div>
            ) : (
              <div className="flex flex-col">
                {notifications.map(notif => (
                  <button 
                    key={notif.id}
                    onClick={() => {
                      markAsRead(notif.id);
                      if (notif.link_node && onJump) onJump(notif.link_node);
                      setIsOpen(false);
                    }}
                    className={`text-left p-3 border-b border-[#D1C6B4]/10 transition-colors hover:bg-gray-50 flex gap-3 ${!notif.is_read ? 'bg-[#E8C5C8]/5' : 'bg-white'}`}
                  >
                    <div className="text-xl shrink-0 mt-0.5">
                      {notif.type === 'reply' ? '💬' : notif.type === 'hot' ? '🔥' : '⚙️'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm text-[#4A4238] line-clamp-2 leading-relaxed ${!notif.is_read ? 'font-bold' : ''}`}>
                        {notif.content}
                      </p>
                      <span className="text-[10px] text-[#4A4238]/40 mt-1 block">
                        {new Date(notif.created_at).toLocaleString('zh-TW', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}
                      </span>
                    </div>
                    {!notif.is_read && (
                      <div className="w-2 h-2 rounded-full bg-[#E08A8A] shrink-0 mt-2"></div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
