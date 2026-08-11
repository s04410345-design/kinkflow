"use client";

import { useState, useEffect } from 'react';
import { logToSupabase } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';

export default function AboutModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const { userName, userId, isGuest } = useAuth();
  const [authorNameInput, setAuthorNameInput] = useState('');

  useEffect(() => {
    if (userName) setAuthorNameInput(userName);
  }, [userName]);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!message.trim()) return;
    setIsSending(true);
    try {
      const activeAuthor = authorNameInput.trim() || userName || '匿名訪客';

      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: message.trim(),
          author: activeAuthor,
          userId,
          isGuest
        })
      });

      await logToSupabase('author_message', {
        message: message.trim(),
        userName: activeAuthor,
        userId,
        isGuest
      });
    } catch (e) {
      console.error("Feedback submission error:", e);
    }
    setIsSending(false);
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setMessage('');
    }, 3000);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-0" onClick={onClose}></div>
      <div className="relative bg-white max-w-2xl w-full rounded-2xl shadow-xl border-2 border-[#E8C5C8] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 sm:p-6 border-b border-[#E8C5C8]/30 bg-[#FDFBF7] flex justify-between items-center shrink-0">
          <h2 className="text-xl sm:text-2xl font-bold text-[#E08A8A] metallic-text flex items-center gap-2">
            ℹ️ 關於 KinkFlow / 反饋
          </h2>
          <button onClick={onClose} className="text-[#4A4238]/40 hover:text-[#4A4238] transition-colors p-2 text-xl font-bold rounded-full hover:bg-black/5">
            ✕
          </button>
        </div>
        
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-[#1A1612] text-sm leading-relaxed">
          <section className="bg-[#EFF6FF] p-4 rounded-xl border border-[#BFDBFE] shadow-xs">
            <h3 className="text-[#1E40AF] font-black text-base mb-2 flex items-center gap-2" style={{ color: '#1E40AF' }}>
              <span>🤖</span> AI 輔助建置聲明
            </h3>
            <p className="text-[#1E3A8A] font-bold text-xs leading-relaxed" style={{ color: '#1E3A8A' }}>
              本網站的系統架構、程式碼與部分內容，是由人工智慧 (AI) 輔助建置與生成。雖然我們致力於提供正確的資訊，但無法保證所有內容的絕對正確性。請在實踐任何行為前，務必自行查證並確保安全。
            </p>
          </section>

          <section>
            <h3 className="text-[#E08A8A] font-bold text-lg mb-3">✨ 來源出處與特別感謝</h3>
            <p className="mb-3 font-bold text-[#1A1612]" style={{ color: '#1A1612' }}>本專案的誕生，特別感謝以下協助者：</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a href="https://x.com/lingyang763" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-[#D1C6B4]/30 hover:border-[#E8C5C8] hover:bg-[#FDFBF7] transition-all group">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-lg font-bold shadow-sm">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </div>
                <div>
                  <div className="text-xs text-[#4A4238]/70 font-semibold" style={{ color: '#4A4238' }}>協力者</div>
                  <div className="font-extrabold text-[#1A1612] group-hover:text-blue-500 transition-colors" style={{ color: '#1A1612' }}>@lingyang763</div>
                </div>
              </a>
              <a href="https://x.com/LakeCattt" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-[#D1C6B4]/30 hover:border-[#E8C5C8] hover:bg-[#FDFBF7] transition-all group">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-lg font-bold shadow-sm">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </div>
                <div>
                  <div className="text-xs text-[#4A4238]/70 font-semibold" style={{ color: '#4A4238' }}>協力者</div>
                  <div className="font-extrabold text-[#1A1612] group-hover:text-blue-500 transition-colors" style={{ color: '#1A1612' }}>@LakeCattt</div>
                </div>
              </a>
              <a href="https://x.com/Akitas0608" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-xl border-2 border-[#E8C5C8]/50 hover:border-[#E08A8A] bg-[#FDFBF7] transition-all group sm:col-span-2">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#E08A8A] to-[#D47A7A] flex items-center justify-center text-white text-xl font-bold shadow-sm">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </div>
                <div>
                  <div className="text-xs text-[#E08A8A] font-bold">網站作者</div>
                  <div className="font-extrabold text-lg text-[#1A1612] group-hover:text-[#E08A8A] transition-colors" style={{ color: '#1A1612' }}>@Akitas0608</div>
                  <div className="text-xs text-[#4A4238]/70 font-semibold" style={{ color: '#4A4238' }}>點此前往作者的 Twitter (X) 主頁</div>
                </div>
              </a>
            </div>
          </section>

          <section className="bg-[#FDFBF7] p-5 rounded-xl border border-[#E8C5C8]/40 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#E08A8A]"></div>
            <h3 className="text-[#1A1612] font-black text-lg mb-1" style={{ color: '#1A1612' }}>💌 給作者的話 / 意見回饋</h3>
            <p className="text-[#4A4238] font-bold text-xs mb-3" style={{ color: '#4A4238' }}>有任何建議、發現錯誤，或是想對作者說的話，都可以直接在這裡留言！</p>
            
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-[#D1C6B4]/50">
                <span className="text-xs font-black text-[#1A1612] shrink-0" style={{ color: '#1A1612' }}>👤 您的稱呼 / 暱稱：</span>
                <input
                  type="text"
                  value={authorNameInput}
                  onChange={e => setAuthorNameInput(e.target.value)}
                  placeholder="輸入您的暱稱..."
                  className="w-full text-xs font-bold text-[#1A1612] bg-transparent outline-none"
                  style={{ color: '#1A1612' }}
                />
              </div>

              <textarea 
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="寫下你想對作者說的話..."
                className="w-full h-24 p-3 rounded-lg border border-[#D1C6B4]/50 focus:outline-none focus:border-[#E08A8A] focus:ring-1 focus:ring-[#E08A8A] resize-none text-[#1A1612] font-bold bg-white transition-all text-sm"
                style={{ color: '#1A1612' }}
                disabled={isSending || sent}
              />
              <div className="flex justify-between items-center mt-1">
                <span className={`text-xs font-bold ${sent ? 'text-green-600' : 'text-transparent'}`}>
                  ✓ 留言已成功送出，謝謝您的回饋！
                </span>
                <button 
                  onClick={handleSend}
                  disabled={!message.trim() || isSending || sent}
                  className={`px-5 py-2 rounded-lg font-bold text-xs transition-all shadow-sm ${
                    message.trim() && !isSending && !sent
                      ? 'bg-[#E08A8A] text-white hover:bg-[#D47A7A] active:scale-95' 
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isSending ? '傳送中...' : sent ? '已送出' : '送出留言'}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
