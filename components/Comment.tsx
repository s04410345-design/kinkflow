"use client";

import { useState, useRef, useEffect } from 'react';
import type { DiscussionPost, AppData, EmojiCount } from '@/lib/types';
import { emojiList } from '@/lib/constants';
import { getPostActivityScore } from '@/lib/constants';
import dynamic from 'next/dynamic';
import confetti from 'canvas-confetti';

const ProfileModal = dynamic(() => import('./ProfileModal'), { ssr: false });

// ================= 藍色小鳥認證徽章 =================
export function BlueBirdBadge({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className="inline-block align-middle" style={{ marginBottom: 1 }}>
      <path fill="#1DA1F2" d="M23.643 4.937c-.835.37-1.732.62-2.675.733a4.67 4.67 0 002.048-2.578 9.3 9.3 0 01-2.958 1.13 4.66 4.66 0 00-7.938 4.25 13.229 13.229 0 01-9.602-4.868c-.4.69-.63 1.49-.63 2.342A4.66 4.66 0 003.96 9.824a4.647 4.647 0 01-2.11-.583v.06a4.66 4.66 0 003.737 4.568 4.692 4.692 0 01-2.104.08 4.661 4.661 0 004.352 3.234 9.348 9.348 0 01-5.786 1.995 9.5 9.5 0 01-1.112-.065 13.175 13.175 0 007.14 2.093c8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602a9.47 9.47 0 002.323-2.41z"/>
    </svg>
  );
}

// ================= 作者名稱解析（含徽章） =================
export function AuthorName({ name, onClick, className = '' }: { name: string; onClick?: () => void; className?: string }) {
  const safeName = name || '匿名';
  const isVerified = safeName.includes('☑️');
  const isGuest = safeName.includes('👻');
  const cleanName = safeName.replace(/ ☑️/g, '').replace(/ 👻/g, '').trim();
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span className={onClick ? 'cursor-pointer hover:underline' : ''} onClick={onClick}>{cleanName}</span>
      {isVerified && <BlueBirdBadge size={13} />}
      {isGuest && <span title="訪客">👻</span>}
    </span>
  );
}

// ================= 投票模組 =================
export function VoteModule({ nodeId, stats, myVote, onVote }: {
  nodeId: string;
  stats: { need: number; like: number; curious: number; neutral: number; nope: number } | undefined;
  myVote: string | undefined;
  onVote: (voteType: string) => void;
}) {
  const s = stats || { need: 0, like: 0, curious: 0, neutral: 0, nope: 0 };
  const total = (s.need || 0) + (s.like || 0) + (s.curious || 0) + (s.neutral || 0) + (s.nope || 0) + ((s as any).dislike || 0);
  const getPct = (val: number) => total === 0 ? 0 : Math.round(((val || 0) / total) * 100);

  const opts = [
    { id: 'need',    icon: '🔥', label: '絕對需要',   baseColor: '#E08A8A', color: 'border-[#E08A8A] text-[#1A1612] font-black hover:bg-[#E08A8A]/10',  active: 'bg-[#E08A8A] text-[#1A1612] border-[#E08A8A]' },
    { id: 'like',    icon: '✨', label: '喜歡',       baseColor: '#E8C5C8', color: 'border-[#E8C5C8] text-[#1A1612] font-black hover:bg-[#E8C5C8]/10',  active: 'bg-[#E8C5C8] text-[#1A1612] border-[#E8C5C8]' },
    { id: 'curious', icon: '👀', label: '好奇/觀望', baseColor: '#D9B650', color: 'border-[#D9B650] text-[#1A1612] font-black hover:bg-[#D9B650]/10',  active: 'bg-[#D9B650] text-[#1A1612] border-[#D9B650]' },
    { id: 'neutral', icon: '💭', label: '沒感覺',     baseColor: '#C5D4B6', color: 'border-[#C5D4B6] text-[#1A1612] font-black hover:bg-[#C5D4B6]/10',  active: 'bg-[#C5D4B6] text-[#1A1612] border-[#C5D4B6]' },
    { id: 'nope',    icon: '🙅', label: '絕對不要',   baseColor: '#D1C6B4', color: 'border-[#D1C6B4] text-[#1A1612] font-black hover:bg-[#D1C6B4]/10',  active: 'bg-[#D1C6B4] text-[#1A1612] border-[#D1C6B4]' },
  ];

  return (
    <div className="bg-white dark:bg-black/20 dark:border-[#4A4238] dark:bg-white/5 dark:border-white/10 p-5 rounded-2xl border border-[#D1C6B4]/40 shadow-sm text-[#4A4238] dark:text-[#E5DCD0]">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold flex items-center gap-2">📊 你的喜好是？</h3>
        <span className="text-xs bg-[#FDFBF7] border border-[#D1C6B4]/60 px-2.5 py-1 rounded-full text-[#4A4238] font-bold shadow-sm">共 {total} 票</span>
      </div>
      <div className="flex flex-col gap-2.5">
        {opts.map(opt => {
          const isActive = myVote === opt.id;
          const pct = getPct(s[opt.id as keyof typeof s]); 
          return (
            <button key={opt.id} onClick={(e) => {
                if (!isActive) {
                  confetti({
                    particleCount: 50,
                    spread: 60,
                    origin: { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight },
                    colors: [opt.baseColor]
                  });
                }
                onVote(opt.id);
              }}
              className={`vote-btn btn-dark-text relative w-full py-2.5 px-4 rounded-xl text-sm transition-all border-2 font-bold overflow-hidden group ${isActive ? `border-[${opt.baseColor}] shadow-md` : `border-[${opt.baseColor}]`} ${myVote && !isActive ? 'opacity-70 hover:opacity-100' : ''}`}
              style={{ backgroundColor: isActive ? opt.baseColor : undefined, color: '#1A1612' }}>
              
              {/* 進度條背景 */}
              {total > 0 && (
                <div 
                  className={`absolute left-0 top-0 bottom-0 transition-all duration-700 ease-out z-0`} 
                  style={{ width: `${pct}%`, backgroundColor: `${opt.baseColor}30` }} 
                />
              )}
              
              <div className="relative flex justify-between items-center z-10 font-black text-[#1A1612]" style={{ color: '#1A1612' }}>
                <span className="flex items-center gap-2 tracking-wide font-black text-[#1A1612]" style={{ color: '#1A1612' }}>
                  <span>{opt.icon}</span>
                  {opt.label}
                </span>
                <span className="text-xs tracking-wider font-black text-[#1A1612]" style={{ color: '#1A1612' }}>{pct}%</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ================= 留言卡片 =================
export function Comment({ post, hideActions, hideReplies, nodeColor, allowReply, onReply, onUpvote, onEmoji, hasUpvoted, userEmojis, onReplyUpvote, onReplyEmoji, onDelete, currentUserName, isAdmin, theme = 'system' }: {
  post: DiscussionPost;
  hideActions?: boolean;
  hideReplies?: boolean;
  nodeColor?: string;
  allowReply?: boolean;
  onReply?: (text: string) => void;
  onUpvote?: () => void;
  onEmoji?: (emoji: string) => void;
  hasUpvoted?: boolean;
  userEmojis?: Record<string, boolean>;
  onReplyUpvote?: (postId: string | number, replyId: string | number) => void;
  onReplyEmoji?: (postId: string | number, replyId: string | number, emoji: string) => void;
  onDelete?: (postId: string | number, replyId?: string | number) => void;
  currentUserName?: string;
  isAdmin?: boolean;
  theme?: 'dark' | 'light' | 'system';
}) {
  const [showEmoji, setShowEmoji] = useState(false);
  const [showProfile, setShowProfile] = useState<string | null>(null);
  const [isReplying, setIsReplying] = useState(false);
  const [replyInput, setReplyInput] = useState('');
  const [timeLeftStr, setTimeLeftStr] = useState('');
  const [replyEmojiId, setReplyEmojiId] = useState<number | null>(null);
  const [showLightboxImg, setShowLightboxImg] = useState<string | null>(null);
  const lastReplySubmitRef = useRef(0);

  // 計算留言保留時間
  useEffect(() => {
    if (!hideActions) {
      const now = Date.now();
      const pTime = post.timestamp || now;
      const diff = (pTime + (24 * 3600000) + (getPostActivityScore(post) * 600000)) - now;
      const calculatedStr = diff <= 0
        ? (post.isHot ? '永久精華' : '即將隱藏')
        : `剩餘 ${Math.floor(diff / 3600000)}h ${Math.floor((diff % 3600000) / 60000)}m`;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTimeLeftStr(calculatedStr);
    }
  }, [hideActions, post, post.timestamp, post.upvotes, post.isHot]);

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(replyInput.trim() && onReply) {
      if (Date.now() - lastReplySubmitRef.current < 500) return;
      lastReplySubmitRef.current = Date.now();
      onReply(replyInput);
      setReplyInput('');
      setIsReplying(false);
    }
  };

  const [isExpanded, setIsExpanded] = useState(false);
  const lines = post.text.split('\n');
  const isTooLong = post.text.length > 150 || lines.length > 5;
  let displayText = post.text;
  if (!isExpanded && isTooLong) {
    let truncated = post.text;
    if (lines.length > 5) {
      truncated = lines.slice(0, 5).join('\n');
    }
    if (truncated.length > 150) {
      truncated = truncated.slice(0, 150);
    }
    displayText = truncated + '...';
  }

  const isDark = theme === 'dark';
  const baseBgClass = isDark 
    ? 'bg-[#1E232A] text-[#F8FAFC] border-[#3F4652] shadow-sm' 
    : 'bg-[#FDFBF7] text-[#1A1612] border border-[#D1C6B4]/60 shadow-xs';
  
  const textColorClass = isDark ? 'text-[#F8FAFC]' : 'text-[#1A1612]';
  const subTextColorClass = isDark ? 'text-[#94A3B8]' : 'text-[#4A4238]';

  return (
    <div 
      id={`comment-${post.id}`} 
      className={`${baseBgClass} p-4 rounded-xl text-sm border relative shadow-sm transition-all hover:shadow-md`} 
      style={nodeColor ? { 
        backgroundColor: isDark ? `${nodeColor}25` : `${nodeColor}18`, 
        borderLeft: `5px solid ${nodeColor}`,
        borderColor: `${nodeColor}50`
      } : {}}
    >
      {post.isHot && <span className="absolute -top-2.5 -right-2 text-xs bg-[#E08A8A] text-white px-2 py-0.5 rounded-full shadow font-bold tracking-wider z-10">HOT🔥</span>}
      <div className="flex justify-between items-center mb-1">
        <div className="text-xs font-bold flex items-center gap-2 flex-wrap">
          <AuthorName name={post.author} onClick={() => setShowProfile(post.author)} className={isDark ? "text-[#FDFBF7] font-black text-sm" : "text-[#1A1612] font-black text-sm"} />
          {hideActions && post.nodeName && (
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs" style={nodeColor ? { backgroundColor: isDark ? `${nodeColor}40` : `${nodeColor}30`, borderColor: `${nodeColor}60`, color: isDark ? '#FDFBF7' : '#334155' } : {}}>
              📍 來自：{post.nodeName}
            </span>
          )}
          <span className={`text-[11px] font-bold tracking-wide ${subTextColorClass}`}>
            {new Date(post.timestamp).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}
          </span>
        </div>
        {!hideActions && (
          <div className="flex items-center gap-2">
            {(isAdmin || (currentUserName && post.author.startsWith(currentUserName))) && onDelete && (
              <button onClick={() => { if(confirm('確定要刪除這則留言嗎？')) onDelete(post.id); }} className="text-[#E08A8A] hover:underline text-xs font-bold">刪除</button>
            )}
            <div className={`text-[10px] font-bold ${timeLeftStr.includes('剩餘') ? subTextColorClass : 'text-[#E08A8A]'}`}>{timeLeftStr}</div>
          </div>
        )}
      </div>
      {/* 解析並渲染圖片附件 */}
      {(() => {
        const imgMatch = post.text.match(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/) || post.text.match(/(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp))/i);
        const imageUrl = imgMatch ? imgMatch[1] : null;
        if (!imageUrl) return null;

        return (
          <div className="my-2 max-w-sm rounded-xl overflow-hidden border border-[#D1C6B4]/40 shadow-sm cursor-zoom-in group relative" onClick={() => setShowLightboxImg(imageUrl)}>
            <img src={imageUrl} alt="附加圖片" className="w-full max-h-56 object-cover group-hover:scale-102 transition-transform" />
            <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur-sm font-bold">📷 點擊放大觀看</div>
          </div>
        );
      })()}

      <p className={`text-sm font-bold ${textColorClass} mb-2 leading-relaxed whitespace-pre-wrap break-words break-all`}>
        {displayText.replace(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/g, '').replace(/(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp))/gi, '').trim()}
      </p>
      {isTooLong && (
        <button onClick={() => setIsExpanded(!isExpanded)} className="text-xs text-[#E08A8A] hover:text-[#D47A7A] font-bold mb-3 block">
          {isExpanded ? '收起 ▲' : '繼續閱讀 ▼'}
        </button>
      )}
      
      {((post.emojis && post.emojis.length > 0) || (hideActions && post.upvotes > 0)) && (
        <div className="flex gap-1.5 mb-2 flex-wrap items-center">
          {hideActions && post.upvotes > 0 && <span className="text-[10px] bg-[#FDFBF7] border border-[#D1C6B4]/30 px-2 py-0.5 rounded-full text-[#1A1612] font-bold shadow-sm btn-dark-text" style={{ color: '#1A1612' }}>👍 {post.upvotes}</span>}
          {post.emojis?.map((e: EmojiCount) => (
            <button 
              key={e.char} 
              onClick={() => !hideActions && onEmoji && onEmoji(e.char)}
              className={`btn-dark-text text-[10px] bg-[#FDFBF7] border px-2 py-0.5 rounded-full shadow-sm transition-colors flex items-center gap-1 ${!hideActions ? 'cursor-pointer hover:bg-gray-100' : 'cursor-default'} ${userEmojis && userEmojis[`${post.id}_${e.char}`] ? 'border-[#C5D4B6] bg-[#C5D4B6]/10 text-[#1A1612] font-bold' : 'border-[#D1C6B4]/30 text-[#1A1612]'}`}
              style={{ color: '#1A1612' }}
            >
              {e.char} {e.count}
            </button>
          ))}
        </div>
      )}

      {!hideActions && (
        <div className="flex gap-2 relative mt-2 border-t border-[#D1C6B4]/10 pt-2">
          <button onClick={(e) => {
              if (!hasUpvoted) {
                 confetti({
                   particleCount: 40,
                   spread: 40,
                   origin: { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight },
                   colors: ['#E08A8A', '#C5D4B6']
                 });
              }
              if (onUpvote) onUpvote();
            }} 
            className={`btn-dark-text flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors border ${hasUpvoted ? 'bg-[#C5D4B6] text-[#1A1612] border-[#C5D4B6] font-bold shadow-inner' : 'bg-[#FDFBF7] border-[#D1C6B4]/40 hover:bg-gray-100 text-[#1A1612] font-bold'}`}
            style={{ color: '#1A1612' }}>
            👍 {post.upvotes > 0 && post.upvotes}
          </button>
          
          <div className="relative">
            <button onClick={() => setShowEmoji(!showEmoji)} className="btn-dark-text flex items-center gap-1 text-xs px-2 py-1 rounded border bg-[#FDFBF7] border-[#D1C6B4]/40 hover:bg-gray-100 text-[#1A1612] font-bold" style={{ color: '#1A1612' }}>😀</button>
            {showEmoji && (
              <div className="absolute top-full left-0 mt-1 w-[220px] bg-white border border-[#D1C6B4]/40 shadow-xl rounded-xl p-2 z-20 grid grid-cols-5 gap-1 animate-fade-in">
                {emojiList.map(em => <button type="button" key={em} onClick={() => { if (onEmoji) onEmoji(em); setShowEmoji(false); }} className="text-lg hover:bg-gray-100 p-1 rounded text-center select-none">{em}</button>)}
              </div>
            )}
          </div>
          {allowReply && <button onClick={() => setIsReplying(!isReplying)} className="btn-dark-text flex items-center gap-1 text-xs px-2 py-1 rounded border bg-[#FDFBF7] border-[#D1C6B4]/40 hover:bg-gray-100 text-[#1A1612] font-bold ml-auto" style={{ color: '#1A1612' }}>💬 回覆</button>}
        </div>
      )}

      {!hideReplies && post.replies && post.replies.length > 0 && (
        <div className="mt-3 pl-3 border-l-2 border-[#D1C6B4]/30 space-y-2">
          {post.replies.map((reply) => (
            <div key={reply.id} id={`comment-${reply.id}`} className="text-xs bg-[#FDFBF7]/50 p-2.5 rounded-lg border border-[#D1C6B4]/20 relative group">
              <div className="flex justify-between items-center mb-1">
                <AuthorName name={reply.author} onClick={() => setShowProfile(reply.author)} className="font-bold text-[#C5D4B6]" />
                <div className="flex items-center gap-2">
                  {(isAdmin || (currentUserName && reply.author.startsWith(currentUserName))) && onDelete && (
                    <button onClick={() => { if(confirm('確定要刪除這則回覆嗎？')) onDelete(post.id, reply.id); }} className="text-[#E08A8A]/70 hover:text-[#E08A8A] text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">刪除</button>
                  )}
                  <span className="text-[10px] text-[#4A4238]/60">{reply.timestamp ? new Date(reply.timestamp).toLocaleString('zh-TW', {month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}) : ''}</span>
                </div>
              </div>
              <p className="text-[#1A1612] mb-2 leading-relaxed whitespace-pre-wrap break-words break-all font-medium">{reply.text}</p>
              {!hideActions && (
                <div className="flex gap-1.5 flex-wrap">
                  <button onClick={() => onReplyUpvote && onReplyUpvote(post.id, reply.id)}
                    className={`btn-dark-text flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                      userEmojis && userEmojis[`reply_up_${reply.id}`]
                        ? 'bg-[#C5D4B6] text-[#1A1612] border-[#C5D4B6] font-bold'
                        : 'bg-white border-[#D1C6B4]/40 text-[#1A1612] font-bold hover:bg-gray-50'
                    }`}
                    style={{ color: '#1A1612' }}>
                    👍 {(reply.upvotes ?? 0) > 0 ? reply.upvotes : ''}
                  </button>
                  {reply.emojis?.map((e: EmojiCount) => (
                    <button key={e.char}
                      onClick={() => onReplyEmoji && onReplyEmoji(post.id, reply.id, e.char)}
                      className={`btn-dark-text text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                        userEmojis && userEmojis[`reply_emoji_${reply.id}_${e.char}`]
                          ? 'bg-[#C5D4B6]/20 border-[#C5D4B6] text-[#1A1612] font-bold'
                          : 'bg-white border-[#D1C6B4]/40 text-[#1A1612] font-bold hover:bg-gray-50'
                      }`}
                      style={{ color: '#1A1612' }}>
                      {e.char} {e.count}
                    </button>
                  ))}
                  <button onClick={() => onReplyEmoji && setReplyEmojiId(reply.id as number)}
                    className="btn-dark-text text-[10px] px-2 py-0.5 rounded-full border bg-white border-[#D1C6B4]/40 text-[#1A1612] font-bold hover:bg-gray-50"
                    style={{ color: '#1A1612' }}>😀</button>
                  {replyEmojiId === reply.id && (
                    <div className="absolute left-0 mt-1 w-[220px] bg-white border border-[#D1C6B4]/40 shadow-xl rounded-xl p-2 z-30 grid grid-cols-5 gap-1 animate-fade-in">
                      {emojiList.map(em => <button type="button" key={em} onClick={() => { if (onReplyEmoji) onReplyEmoji(post.id, reply.id, em); setReplyEmojiId(null); }} className="text-lg hover:bg-gray-100 p-1 rounded text-center select-none">{em}</button>)}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {isReplying && (
        <form onSubmit={handleReplySubmit} className="mt-3 flex gap-2 animate-slide-up items-end">
            <textarea 
              value={replyInput} 
              onChange={e => {
                setReplyInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }} 
              rows={1}
              placeholder="回覆..." 
              autoFocus 
              className="flex-1 bg-[#FDFBF7] border border-[#D1C6B4]/60 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[#C5D4B6] resize-none min-h-[30px] max-h-[120px] scrollbar-thin" 
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                }
              }}
            />
            <button type="submit" className="bg-[#4A4238] h-[30px] text-white px-3 rounded-xl text-xs font-bold hover:bg-[#4A4238]/80 shrink-0 whitespace-nowrap">送出</button>
          </form>
      )}
      {/* 個人檔案彈窗 */}
      {showProfile && <ProfileModal userName={showProfile} onClose={() => setShowProfile(null)} />}

      {/* 圖片大圖 Lightbox */}
      {showLightboxImg && (
        <div 
          onClick={() => setShowLightboxImg(null)}
          className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-fade-in"
        >
          <button 
            onClick={() => setShowLightboxImg(null)}
            className="absolute top-6 right-6 text-white bg-white/20 hover:bg-white/40 w-12 h-12 rounded-full font-bold text-2xl flex items-center justify-center transition-colors"
          >
            ✕
          </button>
          <img 
            src={showLightboxImg} 
            alt="大圖預覽" 
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl transition-transform duration-300 hover:scale-105"
            crossOrigin="anonymous"
          />
        </div>
      )}
    </div>
  );
}
