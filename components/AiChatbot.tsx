"use client";

import { useState, useEffect, useRef } from 'react';

import { SafeStorage } from '@/lib/constants';

// ================= 小精靈 =================
export default function AiChatbot({ userName, currentNode, isLarge, onToggleSize, onClose }: { userName: string; currentNode?: string; isLarge?: boolean; onToggleSize?: () => void; onClose?: () => void }) {
  const nodeContext = currentNode ? `你目前正在瀏覽「${currentNode}」這個節點。` : '';
  const cleanName = userName.replace(/ ☑️/g, '').replace(/ 👻/g, '').trim();
  
  const PERSONAS = ['溫柔前輩', '傲嬌貓貓', '忠心狗狗', '理性無口', '毒舌屬性', '自訂'];
  const [persona, setPersona] = useState('溫柔前輩');
  const [customPersona, setCustomPersona] = useState('');
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);

  const storageKey = `kinkflow_ai_chat_${cleanName}`;
  const [messages, setMessages] = useState<Array<{role: string, text: string}>>(() => {
    const cached = SafeStorage.get(storageKey) as Array<{role: string, text: string}> | null;
    if (cached && cached.length > 0) return cached;
    return [{ role: 'model', text: `嘿囉 ${cleanName}！我是小精靈 ✨。這裡是一個絕對安全、私密的發問空間。關於 BDSM 文化、安全詞設定或是心理調適，有任何疑惑都歡迎隨時發問。` }];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    SafeStorage.set(storageKey, messages);
  }, [messages, storageKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const userMsg = input.trim();
    setInput(''); 
    const newMsgs = [...messages, { role: 'user', text: userMsg }];
    setMessages(newMsgs);
    setIsLoading(true);

    try {
      const activePersona = persona === '自訂' ? (customPersona || '溫柔前輩') : persona;
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: newMsgs.slice(-4), // 只傳送最近 4 則以節省 token
          userName: cleanName,
          nodeContext,
          persona: activePersona
        })
      });
      const data = await res.json();
      if (data.reply) setMessages(prev => [...prev, { role: 'model', text: data.reply }]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'model', text: "API 連線失敗，請檢查金鑰或網路連線。" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (confirm('確定要清除與小精靈的對話紀錄嗎？')) {
      const initMsg = [{ role: 'model', text: `嘿囉 ${cleanName}！我是小精靈 ✨。這裡是一個絕對安全、私密的發問空間。關於 BDSM 文化、安全詞設定或是心理調適，有任何疑惑都歡迎隨時發問。` }];
      setMessages(initMsg);
      SafeStorage.set(storageKey, initMsg);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative min-h-[300px] overflow-hidden">
      <div className="bg-[#4A4238] text-white p-3 flex justify-between items-center shrink-0 shadow-md z-20">
        <div className="flex items-center gap-2">
          <span className="font-bold tracking-widest text-sm flex items-center gap-1">✨ 小精靈</span>
          <button onClick={() => setShowPersonaMenu(!showPersonaMenu)} className="bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded text-[10px] transition-colors flex items-center gap-1 border border-white/20">
            個性: {persona} <span className="text-[8px] opacity-70">▼</span>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleClearHistory} title="清除紀錄" className="hover:text-[#E8C5C8] transition-colors text-xs opacity-70 hover:opacity-100">🗑️ 清除</button>
          {onToggleSize && (
            <button onClick={onToggleSize} title="切換大小" className="hover:text-[#E8C5C8] transition-colors opacity-70 hover:opacity-100 flex items-center justify-center">
              {isLarge ? (
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
              )}
            </button>
          )}
          {onClose && <button onClick={onClose} title="關閉" className="hover:text-[#E08A8A] transition-colors text-sm ml-2 opacity-70 hover:opacity-100 flex items-center justify-center">✕</button>}
        </div>
      </div>
      
      {showPersonaMenu && (
        <div className="absolute top-12 left-2 right-2 bg-white border border-[#D1C6B4]/50 shadow-xl rounded-xl p-4 z-30 animate-slide-down">
          <div className="text-xs font-bold text-[#4A4238] mb-3">設定小精靈的說話風格：</div>
          <div className="flex flex-wrap gap-2 mb-3">
            {PERSONAS.map(p => (
              <button key={p} type="button" onClick={() => { setPersona(p); if (p !== '自訂') setShowPersonaMenu(false); }} className={`px-2.5 py-1.5 text-xs rounded-md border transition-colors ${persona === p ? 'bg-[#E8C5C8] border-[#E8C5C8] text-white font-bold' : 'bg-white border-[#D1C6B4] text-[#4A4238] hover:border-[#E8C5C8]'}`}>
                {p}
              </button>
            ))}
          </div>
          {persona === '自訂' && (
            <div className="flex gap-2 mt-2">
              <input type="text" value={customPersona} onChange={e => setCustomPersona(e.target.value)} placeholder="例如：傲嬌的大小姐..." className="flex-1 text-xs px-3 py-2 border border-[#D1C6B4] rounded-lg focus:outline-none focus:border-[#E8C5C8]" />
              <button type="button" onClick={() => setShowPersonaMenu(false)} className="bg-[#4A4238] hover:bg-[#4A4238]/80 text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors">確認</button>
            </div>
          )}
        </div>
      )}

      <div className="bg-[#E8C5C8]/10 text-[#E8C5C8] p-1.5 text-[10px] text-center border-b border-[#E8C5C8]/20 shrink-0">
        由 Gemini 驅動，嚴守 SSC 原則。對話紀錄僅保留於您的裝置中。
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-[#D1C6B4] scrollbar-track-transparent bg-[#FDFBF7]/50 pb-4 relative z-0">
        {/* 點擊背景關閉選單 */}
        {showPersonaMenu && <div className="absolute inset-0 z-20" onClick={() => setShowPersonaMenu(false)}></div>}
        
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex relative z-10 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-[#4A4238] text-white rounded-tr-sm' : 'bg-white border border-[#D1C6B4]/30 text-[#4A4238] shadow-sm rounded-tl-sm'}`}>
              {msg.text.split('\n').map((line, i) => (<span key={i}>{line}<br/></span>))}
            </div>
          </div>
        ))}
        {isLoading && <div className="text-[#E8C5C8] animate-pulse text-xs pl-2 relative z-10">思考中...</div>}
        <div ref={chatEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="w-full p-3 bg-white border-t border-[#D1C6B4]/20 flex gap-2 shrink-0 z-20">
        <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="安全發問..." className="flex-1 bg-[#FDFBF7] border border-[#D1C6B4]/40 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#E8C5C8] transition-colors" disabled={isLoading} />
        <button type="submit" disabled={isLoading} className="bg-[#E8C5C8] text-white px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-[#E8C5C8]/80 shrink-0 whitespace-nowrap transition-colors">傳送</button>
      </form>
    </div>
  );
}
