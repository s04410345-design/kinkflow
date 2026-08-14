/**
 * ============================================================
 * 🌸 KinkFlow v1 (秋Day) — 模組架構標籤 (Module Tag)
 * 模組 ID  : 3-3, 3-4, 3-5, 3-6 (Wave 3 和風抽屜面板與社群互動)
 * 路由路徑 : / (右側抽屜組件)
 * 核心功能 : 節點知識百科、5 階喜好投票、reach_score 社群討論板、全站喜好分布統計、視窗縮放控制
 * 對應檔案 : components/DrawerContent.tsx
 * ============================================================
 */
"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { GraphNode, AppData, DiscussionPost } from '@/lib/types';
import { logToSupabase, getPostActivityScore, getWafuColor } from '@/lib/constants';
import { VOTE_TYPES, type VoteType } from '@/lib/contentModel';
import { VoteModule, Comment } from '@/components/Comment';
import AiChatbot from '@/components/AiChatbot';
import { useQuizConfig } from '@/components/QuizContext';

// ================= 資訊抽屜 =================
export default function DrawerContent({ node, closeDrawer, userName, isGuest, appData, setAppData, onJump, showToast, onOpenIframe, targetPostId, onOpenArticle, nodesData, goBack, canGoBack }: {
  node: GraphNode;
  closeDrawer: () => void;
  userName: string;
  isGuest: boolean;
  appData: AppData;
  setAppData: (updater: AppData | ((prev: AppData) => AppData)) => void;
  onJump: (id: string, postId?: string) => void;
  showToast: (msg: string) => void;
  onOpenIframe: (url: string) => void;
  targetPostId?: string | null;
  onOpenArticle?: (title: string, content: string) => void;
  nodesData: GraphNode[];
  goBack?: () => void;
  canGoBack?: boolean;
}) {
  const { globalAssets } = useQuizConfig();
  const nodeDictImage = appData?.nodeImages?.[node.id]?.realistic || appData?.nodeImages?.[node.id]?.image;
  const staticFallback = `/images/nodes/realistic_${node.id}.png`;
  const nodeImageToShow = (node.image && typeof node.image === 'string' && node.image.trim()) 
    ? node.image 
    : (nodeDictImage || staticFallback);
  const [lobbyTab, setLobbyTab] = useState<'info' | 'chat' | 'hot' | 'stats' | 'board'>('info');
  const [nodeTab, setNodeTab] = useState<'info' | 'hot' | 'stats' | 'chat'>('info');
  const [isImgShrunk, setIsImgShrunk] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setImgLoaded(false);
  }, [node.image]);
  
  const dbKey = node.level === 0 ? (lobbyTab === 'chat' ? 'lobby_chat' : 'lobby_board') : node.id;
  const rawPosts = (appData && appData.discussions && appData.discussions[dbKey]) || [];
  
  // 計算保留機制與熱門
  const hotLimit = node.level === 0 ? 10 : node.level === 1 ? 5 : 3;
  const isChatLobby = node.level === 0 && lobbyTab === 'chat';
  const sortedPostsForHot = isChatLobby ? [] : [...rawPosts].sort((a, b) => getPostActivityScore(b) - getPostActivityScore(a) || b.timestamp - a.timestamp);
  const hotPostIds = new Set(sortedPostsForHot.slice(0, hotLimit).map(p => p.id));

  const [now] = useState(() => Date.now());
  const posts = rawPosts.map(p => ({ ...p, isHot: hotPostIds.has(p.id) })).filter(p => {
      if (p.isHot) return true;
      const pTime = p.timestamp || now;
      const diff = (pTime + (24 * 3600000) + (getPostActivityScore(p) * 600000)) - now;
      return diff > 0;
  });

  const childNodes = nodesData.filter(n => n.parent === node.id);

  const globalStatsSummary = useMemo(() => {
    return (nodesData || []).map(n => {
      const s = (appData && appData.stats && appData.stats[n.id]) || { need: 0, like: 0, curious: 0, neutral: 0, dislike: 0 };
      const positive = (s.need || 0) + (s.like || 0) + (s.curious || 0);
      const total = positive + (s.neutral || 0) + (s.dislike || 0);
      return { id: n.id, label: n.label, positive, total, stats: s };
    }).sort((a, b) => b.total - a.total || b.positive - a.positive);
  }, [appData.stats, nodesData]);

  const prevPostsLengthRef = useRef(posts.length);
  const lastSubmitRef = useRef(0);
  // 自動捲動到最新留言
  useEffect(() => {
    if (chatEndRef.current && ((node.level > 0 && nodeTab === 'chat') || (node.level === 0 && (lobbyTab === 'chat' || lobbyTab === 'board')))) {
      requestAnimationFrame(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      });
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100);
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
      }, 500); // 確保在載入後能滑動到底部
    }
  }, [posts.length, lobbyTab, nodeTab, node.id, rawPosts.length]);

  const [hasScrolled, setHasScrolled] = useState(false);

  const [prevTargetPostId, setPrevTargetPostId] = useState(targetPostId);
  if (targetPostId !== prevTargetPostId) {
    setPrevTargetPostId(targetPostId);
    setHasScrolled(false);
  }

  // 跳轉並滾動到指定留言
  useEffect(() => {
    if (targetPostId && !hasScrolled) {
      setTimeout(() => {
        if (nodeTab !== 'chat') setNodeTab('chat');
        if (lobbyTab !== 'chat' && node.level === 0) setLobbyTab('chat');
      }, 0);
      
      const timer = setTimeout(() => {
        const el = document.getElementById(`comment-${targetPostId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "nearest" });
          el.classList.add('bg-[#E8C5C8]/40', 'animate-pulse', 'ring-4', 'ring-[#E8C5C8]/50', 'transition-all', 'duration-500');
          setHasScrolled(true);
          setTimeout(() => {
            el.classList.remove('bg-[#E8C5C8]/40', 'animate-pulse', 'ring-4', 'ring-[#E8C5C8]/50');
          }, 4000);
        }
      }, 300); // 確保渲染完成
      return () => clearTimeout(timer);
    }
  }, [targetPostId, nodeTab, lobbyTab, node.level, hasScrolled]);

  const addPost = async (text: string) => {
    if (Date.now() - lastSubmitRef.current < 500) return; // 防止連點造成重複發布
    
    // 限制訪客只能在即時聊天室發言
    if (isGuest && !(node.level === 0 && lobbyTab === 'chat')) {
      showToast("🔒 訪客僅能在即時聊天室發言，註冊完整帳號即可建立討論版！");
      return;
    }
    
    lastSubmitRef.current = Date.now();
    
    showToast("防洗版偵測中...");

    try {
      const res = await fetch('/api/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, author: userName })
      });
      const data = await res.json();

      if (data.action === 'BLOCK') {
        showToast(data.message || "含有違規內容，已阻擋發布。");
        return;
      }
    } catch (e) {
      console.error("Moderation error:", e);
    }

    const { data: inserted, error: insertErr } = await supabase.from('discussions').insert({
      node_id: dbKey,
      author: userName,
      text,
      timestamp: Date.now()
    }).select().single();

    if (insertErr) {
      showToast("❌ 發布失敗：" + insertErr.message);
      return;
    }

    const newPost: DiscussionPost = { id: inserted.id, author: userName, text, upvotes: 0, timestamp: Number(inserted.timestamp), replies: [] };
    setAppData((prev: AppData) => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next.discussions[dbKey]) next.discussions[dbKey] = [];
      next.discussions[dbKey].push(newPost);
      return next;
    });
  };

  const updatePostInDb = (postId: string | number, updates: Record<string, unknown>) => {
    supabase.from('discussions').update(updates).eq('id', postId).then(({error})=> { if(error) console.error(error) });
  };

  const handleDeletePost = async (postId: string | number, replyId?: string | number) => {
    try {
      if (replyId) {
        // 刪除回覆
        const post = posts.find(p => p.id === postId);
        if (!post) return;
        const newReplies = post.replies?.filter((r: any) => r.id !== replyId) || [];
        updatePostInDb(postId, { replies: newReplies });
        setAppData((prev: AppData) => {
          const next = JSON.parse(JSON.stringify(prev));
          const pIdx = next.discussions[dbKey]?.findIndex((p: DiscussionPost) => p.id === postId);
          if (pIdx > -1) {
            next.discussions[dbKey][pIdx].replies = newReplies;
          }
          return next;
        });
      } else {
        // 刪除整則留言
        await supabase.from('discussions').delete().eq('id', postId);
        setAppData((prev: AppData) => {
          const next = JSON.parse(JSON.stringify(prev));
          next.discussions[dbKey] = next.discussions[dbKey]?.filter((p: DiscussionPost) => p.id !== postId) || [];
          return next;
        });
      }
      showToast("🗑️ 留言已刪除");
    } catch (e) {
      console.error(e);
      showToast("❌ 刪除失敗");
    }
  };

  const addReply = (postId: string | number, text: string) => {
    // eslint-disable-next-line react-hooks/purity
    if (Date.now() - lastSubmitRef.current < 500) return;
    
    // 限制訪客只能在即時聊天室回覆
    if (isGuest && !(node.level === 0 && lobbyTab === 'chat')) {
      showToast("🔒 訪客僅能在即時聊天室發言，註冊完整帳號即可回覆討論版！");
      return;
    }
    
    // eslint-disable-next-line react-hooks/purity
    lastSubmitRef.current = Date.now();
    setAppData((prev: AppData) => {
      const next = JSON.parse(JSON.stringify(prev));
      if (next.discussions[dbKey]) {
        const p = next.discussions[dbKey].find((x: DiscussionPost) => x.id === postId);
        if (p) {
          p.replies = p.replies || [];
          p.replies.push({ id: Date.now() + Math.random(), author: userName, text, timestamp: Date.now(), upvotes: 0, emojis: [] });
          updatePostInDb(postId, { replies: p.replies });

          // 🔔 觸發小鈴鐺通知給被回覆的貼文作者
          const targetAuthorName = p.author.replace(/ ☑️/g, '').replace(/ 👻/g, '').trim();
          const cleanCurrentName = userName.replace(/ ☑️/g, '').replace(/ 👻/g, '').trim();
          
          if (targetAuthorName && targetAuthorName !== cleanCurrentName) {
            supabase
              .from('profiles')
              .select('id')
              .or(`username.eq.${targetAuthorName},username.eq.${targetAuthorName} ☑️`)
              .then(({ data: profilesArr }) => {
                const targetProfile = profilesArr?.[0];
                if (targetProfile?.id) {
                  supabase.from('notifications').insert({
                    user_id: targetProfile.id,
                    type: 'reply',
                    content: `💬 【${cleanCurrentName}】回覆了您的留言：「${text.slice(0, 30)}...」`,
                    link_node: node.id,
                    is_read: false
                  }).then(() => {});
                }
              });
          }
        }
      }
      return next;
    });
  };

  const toggleReplyUpvote = (postId: string | number, replyId: string | number) => {
    setAppData((prev: AppData) => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next.userEmojis) next.userEmojis = {};
      const key = `reply_up_${replyId}`;
      const hasVoted = next.userEmojis[key];
      if (hasVoted) delete next.userEmojis[key];
      else next.userEmojis[key] = true;
      for (const k in next.discussions) {
        next.discussions[k] = next.discussions[k].map((p: DiscussionPost) => {
          if (p.id !== postId) return p;
          const replies = (p.replies || []).map((r: { id: string | number; upvotes?: number }) => {
            if (r.id !== replyId) return r;
            return { ...r, upvotes: Math.max(0, (r.upvotes||0) + (hasVoted ? -1 : 1)) };
          });
          updatePostInDb(postId, { replies });
          return { ...p, replies };
        });
      }
      return next;
    });
  };

  const addReplyEmoji = (postId: string | number, replyId: string | number, emoji: string) => {
    setAppData((prev: AppData) => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next.userEmojis) next.userEmojis = {};
      const key = `reply_emoji_${replyId}_${emoji}`;
      const hasReacted = next.userEmojis[key];
      if (hasReacted) delete next.userEmojis[key];
      else next.userEmojis[key] = true;
      for (const k in next.discussions) {
        next.discussions[k] = next.discussions[k].map((p: DiscussionPost) => {
          if (p.id !== postId) return p;
          const replies = (p.replies || []).map((r: { id: string | number; emojis?: { char: string; count: number }[] }) => {
            if (r.id !== replyId) return r;
            const emojis = r.emojis || [];
            const exist = emojis.find((e: { char: string }) => e.char === emoji);
            if (hasReacted) { if (exist) exist.count = Math.max(0, exist.count - 1); }
            else { if (exist) exist.count++; else emojis.push({ char: emoji, count: 1 }); }
            return { ...r, emojis: emojis.filter((e: { count: number }) => e.count > 0) };
          });
          updatePostInDb(postId, { replies });
          return { ...p, replies };
        });
      }
      return next;
    });
  };

  const toggleUpvote = (postId: string | number) => {
    setAppData((prev: AppData) => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next.userUpvotes) next.userUpvotes = {};
      
      const hasVoted = next.userUpvotes[postId];
      if (hasVoted) delete next.userUpvotes[postId];
      else next.userUpvotes[postId] = true;
      
      for(const key in next.discussions) {
        next.discussions[key] = next.discussions[key].map((p: DiscussionPost) => {
          if (p.id === postId) {
            const newUpvotes = Math.max(0, p.upvotes + (hasVoted ? -1 : 1));
            updatePostInDb(postId, { upvotes: newUpvotes });
            return {...p, upvotes: newUpvotes};
          }
          return p;
        });
      }
      return next;
    });
  };

  const addEmoji = (postId: string | number, emoji: string) => {
    setAppData((prev: AppData) => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next.userEmojis) next.userEmojis = {};
      const userEmojiKey = `${postId}_${emoji}`;
      const hasReacted = next.userEmojis[userEmojiKey];
      
      if (hasReacted) delete next.userEmojis[userEmojiKey];
      else next.userEmojis[userEmojiKey] = true;

      for(const key in next.discussions) {
        next.discussions[key] = next.discussions[key].map((p: DiscussionPost) => {
          if(p.id !== postId) return p;
          const emojis = p.emojis || [];
          const exist = emojis.find((e: { char: string }) => e.char === emoji);
          
          if (hasReacted) {
             if (exist) exist.count = Math.max(0, exist.count - 1);
          } else {
             if(exist) exist.count++; else emojis.push({char: emoji, count: 1});
          }
          const finalEmojis = emojis.filter((e: { count: number }) => e.count > 0);
          updatePostInDb(postId, { emojis: finalEmojis });
          return {...p, emojis: finalEmojis};
        });
      }
      return next;
    });
  };

  const castVote = async (voteType: string) => {
    if (!VOTE_TYPES.includes(voteType as VoteType)) {
      showToast('投票選項無效，請重新選擇。');
      return;
    }
    if (isGuest) {
      showToast("🔒 請註冊完整帳號以參與節點喜好投票！");
      return;
    }

    setAppData((prev: AppData) => {
      const nextStats = JSON.parse(JSON.stringify(prev.stats));
      const nextUserVotes = { ...prev.userVotes };

      if (!nextStats[node.id]) nextStats[node.id] = { need:0, like:0, curious:0, neutral:0, nope:0 };
      
      const oldVote = nextUserVotes[node.id];
      // 點相同選項 → 取消投票
      if (oldVote === voteType) {
        nextStats[node.id][oldVote] = Math.max(0, nextStats[node.id][oldVote] - 1);
        delete nextUserVotes[node.id];
        return { ...prev, stats: nextStats, userVotes: nextUserVotes };
      }

      // 換票：減舊票
      if (oldVote) {
        nextStats[node.id][oldVote] = Math.max(0, nextStats[node.id][oldVote] - 1);
      }
      
      nextUserVotes[node.id] = voteType;
      nextStats[node.id][voteType]++;

      return { ...prev, stats: nextStats, userVotes: nextUserVotes };
    });

    // ── Supabase：UPSERT 到 node_votes（user + node 唯一一筆，取最新）──
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const oldVoteBefore = appData.userVotes[node.id];
      const isCancelling = oldVoteBefore === voteType;

      // UPSERT：若存在就更新，若不存在就插入（on_conflict: user_id, node_id）
      if (isCancelling) {
        // 取消投票 → 刪除該筆記錄
        await supabase.from('node_votes')
          .delete()
          .eq('user_id', user.id)
          .eq('node_id', node.id);
      } else {
        const { error: voteError } = await supabase.from('node_votes')
          .upsert(
            { user_id: user.id, node_id: node.id, vote_type: voteType, updated_at: new Date().toISOString() },
            { onConflict: 'user_id,node_id' }
          );
        if (voteError) {
          console.error('node vote write failed', voteError);
          showToast('投票尚未寫入，請稍後再試。');
          return;
        }
      }

      // 寫入完成後才重新計算全網統計，避免讀到舊資料
      const { data: votes } = await supabase.from('node_votes')
        .select('vote_type')
        .eq('node_id', node.id);
      if (!votes) return;
      const fresh = { need: 0, like: 0, curious: 0, neutral: 0, nope: 0 } as Record<string, number>;
      votes.forEach((vote) => {
        if (vote.vote_type && fresh[vote.vote_type] !== undefined) fresh[vote.vote_type]++;
      });
      // 更新 quiz_content 的全網統計；顯示層仍以 node_votes 為準，這裡只保留相容快取。
      const { data: statsArr } = await supabase
        .from('quiz_content')
        .select('content')
        .eq('key_name', 'quiz_node_stats');
      const curStats = ((statsArr?.[0]?.content) || {}) as Record<string, Record<string, number>>;
      curStats[node.id] = fresh;
      await supabase
        .from('quiz_content')
        .upsert({ key_name: 'quiz_node_stats', content: curStats }, { onConflict: 'key_name' });
    }

    logToSupabase('node_vote', { node_id: node.id, node_label: node.label, vote_type: voteType, userName });
    showToast('投票狀態已更新！');

  };

  const lobbyPosts = node.level === 0 ? [
    ...(appData.discussions['lobby_chat']||[]).map((p: DiscussionPost) => ({...p, nodeName: '即時聊天', nodeId: 'lobby_chat'})),
    ...(appData.discussions['lobby_board']||[]).map((p: DiscussionPost) => ({...p, nodeName: '討論交流', nodeId: 'lobby_board'}))
  ] : posts.map((p: DiscussionPost) => ({...p, nodeName: node.label, nodeId: dbKey}));

  const getDescendantNodes = (startNodeId: string): GraphNode[] => {
    let result: GraphNode[] = [];
    const children = nodesData.filter(n => n.parent === startNodeId);
    result = [...children];
    children.forEach(child => {
      result = [...result, ...getDescendantNodes(child.id)];
    });
    return result;
  };

  const currentAndDescendantNodes = [node, ...getDescendantNodes(node.id)];
  const hotPostsLimit = node.level === 0 ? 20 : node.level === 1 ? 10 : node.level === 2 ? 5 : 3;

  const allHotPosts = currentAndDescendantNodes.flatMap(n => {
    const key = n.level === 0 ? 'lobby_board' : n.id;
    return (appData.discussions[key] || []).map((p: DiscussionPost) => ({
      ...p,
      nodeName: n.level === 0 ? '大廳討論' : n.label,
      nodeId: key,
      nodeColor: getWafuColor(n.color)
    }));
  }).sort((a,b) => getPostActivityScore(b) - getPostActivityScore(a) || b.timestamp - a.timestamp)
    .slice(0, hotPostsLimit)
    .map(p => ({ ...p, isHot: true }));

  return (
    <div className="drawer-panel drawer-container flex flex-col h-full relative text-inherit overflow-y-auto overscroll-none scrollbar-thin scrollbar-thumb-[#D1C6B4] scrollbar-track-transparent">
      <div className="p-6 pb-4 border-b border-[#D1C6B4]/20 bg-white/80 shrink-0 relative">
        <button onClick={closeDrawer} className="absolute top-5 right-5 p-3 bg-[#E8C5C8]/90 text-white rounded-full hover:bg-[#D9B650] shadow-md transition-transform hover:scale-110 active:scale-95 font-bold z-50 text-lg flex items-center justify-center w-10 h-10">✕</button>
        
        {canGoBack && goBack && (
          <button onClick={goBack} className="absolute top-5 right-16 p-2 bg-white/80 text-[#4A4238] dark:text-[#E5DCD0] border border-[#D1C6B4]/30 rounded-full hover:bg-white dark:bg-black/20 dark:border-[#4A4238] dark:bg-white/5 dark:border-white/10 shadow-sm transition-transform hover:scale-105 active:scale-95 font-bold z-50 flex items-center justify-center h-10 px-4 text-xs gap-1">
            <span>← 返回上一步</span>
          </button>
        )}

        {nodeImageToShow ? (
          <>
            <div 
              onClick={() => setIsLightboxOpen(true)}
              className={`w-full ${isImgShrunk ? 'h-16' : 'h-48 md:h-64'} mb-4 rounded-xl overflow-hidden shadow-sm relative group transition-all duration-300 bg-[#D1C6B4]/20 cursor-zoom-in ${!imgLoaded ? 'animate-pulse' : ''}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                key={nodeImageToShow}
                src={nodeImageToShow} 
                alt={node.label} 
                onLoad={() => setImgLoaded(true)}
                className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-105 ${imgLoaded ? 'opacity-100' : 'opacity-100'}`} 
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?q=80&w=1200&auto=format&fit=crop';
                }}
              />
              <div className="absolute top-2 left-2 bg-black/40 text-white/90 px-2.5 py-1 rounded-md text-[10px] font-bold backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                🔍 點擊放大檢視圖片
              </div>
              <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none transition-opacity duration-700 opacity-100`}></div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsImgShrunk(!isImgShrunk);
                }}
                className="absolute bottom-2 right-2 bg-black/40 hover:bg-black/70 text-white/90 px-3 py-1.5 rounded-lg text-xs font-bold z-10 backdrop-blur-sm transition-colors border border-white/20 shadow-sm"
              >
                {isImgShrunk ? '⤡ 展開視窗' : '⤢ 縮小視窗'}
              </button>
            </div>

            {/* 全螢幕大圖 Lightbox */}
            {isLightboxOpen && (
              <div 
                onClick={() => setIsLightboxOpen(false)}
                className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-fade-in"
              >
                <button 
                  onClick={() => setIsLightboxOpen(false)}
                  className="absolute top-6 right-6 text-white bg-white/20 hover:bg-white/40 w-12 h-12 rounded-full font-bold text-2xl flex items-center justify-center transition-colors"
                >
                  ✕
                </button>
                <img 
                  src={nodeImageToShow} 
                  alt={node.label} 
                  className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl transition-transform duration-300 hover:scale-105"
                  crossOrigin="anonymous"
                />
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-24 mb-4 rounded-xl bg-gradient-to-br from-[#F5EFE6] to-[#E8C5C8]/30 border border-[#D1C6B4]/30 flex items-center justify-center text-[#4A4238]/40 font-bold text-sm">
            <span>⛩️ {node.label}</span>
          </div>
        )}
        <div className="text-xs text-[#B48B28] font-black tracking-widest uppercase mb-1">
          {node.level === 0 ? '中心地帶' : childNodes.length > 0 ? `分類層級 ${node.level}` : '專案細節與交流'}
        </div>
        <h2 className="text-3xl font-black text-[#1A1612]">{node.label}</h2>
        {node.desc && <p className="text-sm text-[#2C251E] font-medium mt-2 leading-relaxed">{node.desc}</p>}

        
        {node.level === 0 && (
          <div className="flex gap-3 mt-4 border-b border-[#D1C6B4]/40 overflow-x-auto no-scrollbar">
            <button onClick={() => setLobbyTab('info')} className={`pb-2 text-sm font-bold flex items-center gap-1 shrink-0 ${lobbyTab === 'info' ? 'text-[#1A1612] border-b-2 border-[#1A1612]' : 'text-[#4A4238]/70 hover:text-[#1A1612]'}`}>📖 知識百科</button>
            <button onClick={() => setLobbyTab('chat')} className={`pb-2 text-sm font-bold flex items-center gap-1 shrink-0 ${lobbyTab === 'chat' ? 'text-[#1A1612] border-b-2 border-[#1A1612]' : 'text-[#4A4238]/70 hover:text-[#1A1612]'}`}>💬 即時聊天</button>
            <button onClick={() => setLobbyTab('hot')} className={`pb-2 text-sm font-bold flex items-center gap-1 shrink-0 ${lobbyTab === 'hot' ? 'text-[#D9B650] border-b-2 border-[#D9B650]' : 'text-[#4A4238]/70 hover:text-[#D9B650]'}`}>🔥 熱門排行</button>
            <button onClick={() => setLobbyTab('stats')} className={`pb-2 text-sm font-bold flex items-center gap-1 shrink-0 ${lobbyTab === 'stats' ? 'text-[#15803D] border-b-2 border-[#15803D]' : 'text-[#4A4238]/70 hover:text-[#15803D]'}`}>📊 全站喜好統計</button>
          </div>
        )}

        {node.level > 0 && (
          <div className="flex gap-4 mt-4 border-b border-[#D1C6B4]/40 overflow-x-auto no-scrollbar">
            <button onClick={() => setNodeTab('info')} className={`pb-2 text-sm font-bold flex items-center gap-1.5 shrink-0 ${nodeTab === 'info' ? 'text-[#1A1612] border-b-2 border-[#1A1612]' : 'text-[#4A4238]/70 hover:text-[#1A1612]'}`}>📖 知識百科</button>
            <button onClick={() => setNodeTab('stats')} className={`pb-2 text-sm font-bold flex items-center gap-1.5 shrink-0 ${nodeTab === 'stats' ? 'text-[#15803D] border-b-2 border-[#15803D]' : 'text-[#4A4238]/70 hover:text-[#15803D]'}`}>📊 喜好投票</button>
            <button onClick={() => setNodeTab('chat')} className={`pb-2 text-sm font-bold flex items-center gap-1.5 shrink-0 ${nodeTab === 'chat' ? 'text-[#1A1612] border-b-2 border-[#1A1612]' : 'text-[#4A4238]/70 hover:text-[#1A1612]'}`}>💬 討論交流</button>
          </div>
        )}
      </div>

      <div className="flex-1 p-6 bg-[#FDFBF7]/50 relative flex flex-col">
        {/* 大廳熱門排行：獨立渲染，不走 space-y-6 容器 */}
        {(node.level === 0 && lobbyTab === 'hot') && (
          <div className="animate-fade-in">
            <h3 className="text-sm font-bold mb-4 mt-2">🔥 全平台熱門討論排行（前{hotPostsLimit}名）</h3>
            {allHotPosts.length === 0 ? (
              <div className="text-center text-sm text-[#4A4238]/40 dark:text-[#E5DCD0]/40 py-12 border border-dashed border-[#D1C6B4]/40 rounded-xl bg-white">
                目前還沒有熱門討論，快來第一個留言吧！
              </div>
            ) : (
              <div className="space-y-4">
                {allHotPosts.map((hp, idx) => (
                  <div key={hp.id} className="relative group">
                    <div className="absolute -left-1 top-3 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold z-10 bg-gradient-to-br from-[#D9B650] to-[#E8C5C8] text-white shadow-sm">
                      {idx + 1}
                    </div>
                    <div className="pl-7">
                      <Comment 
                        post={hp as DiscussionPost} 
                        hideActions={true}
                        hideReplies={true}
                        nodeColor={(hp as any).nodeColor}
                        onDelete={handleDeletePost} 
                        currentUserName={userName} 
                      />
                    </div>
                    <button onClick={() => onJump(hp.nodeId!, hp.id.toString())} className="absolute bottom-3 right-3 text-[10px] bg-[#E8C5C8] text-white font-bold px-3 py-1.5 rounded-full shadow-sm hover:bg-[#D47A7A] opacity-90 group-hover:opacity-100 transition-opacity">前往參與 ➤</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!(node.level === 0 && lobbyTab === 'hot') && (
          <div className="space-y-6">

            {/* 所有節點共用：簡單介紹、實際操作、危險預防、急救措施 */}
            {((node.level > 0 && nodeTab === 'info') || (node.level === 0 && lobbyTab === 'info')) && (node.intro || node.practice) && (
              <div className="bg-[#FDFBF7] p-5 rounded-2xl border border-[#D1C6B4]/60 shadow-xs space-y-4 animate-fade-in">
                {node.intro && (
                  <div>
                    <h3 className="text-sm font-black text-[#1A1612] mb-1.5 flex items-center gap-2">💡 簡單介紹</h3>
                    <p className="text-sm text-[#1A1612] font-medium leading-relaxed whitespace-pre-wrap">{node.intro}</p>
                  </div>
                )}
                {node.intro && node.practice && <div className="h-px bg-[#D1C6B4]/40 w-full"></div>}
                {node.practice && (
                  <div>
                    <h3 className="text-sm font-black text-[#1A1612] mb-1.5 flex items-center gap-2">🎯 實際操作</h3>
                    <p className="text-sm text-[#1A1612] font-medium leading-relaxed whitespace-pre-wrap">{node.practice}</p>
                  </div>
                )}
              </div>
            )}

            {node.level > 0 && nodeTab === 'info' && (node.hazard || node.first_aid || node.safety) && (
              <div className="bg-[#FFF5F5] rounded-2xl p-5 border border-[#E08A8A]/50 shadow-xs space-y-4 animate-fade-in">
                {(node.hazard || node.safety) && (
                  <div>
                    <h3 className="text-sm font-black text-[#991B1B] mb-1.5 flex items-center gap-2">⚠️ 危險預防</h3>
                    <p className="text-sm text-[#1A1612] font-medium leading-relaxed whitespace-pre-wrap">{node.hazard || node.safety}</p>
                  </div>
                )}
                {(node.hazard || node.safety) && node.first_aid && <div className="h-px bg-[#E08A8A]/30 w-full"></div>}
                {node.first_aid && (
                  <div>
                    <h3 className="text-sm font-black text-[#991B1B] mb-1.5 flex items-center gap-2">🚑 急救措施</h3>
                    <p className="text-sm text-[#1A1612] font-medium leading-relaxed whitespace-pre-wrap">{node.first_aid}</p>
                  </div>
                )}
              </div>
            )}

            {node.level > 0 && nodeTab === 'info' && node.detail_text && onOpenArticle && (
              <div className="bg-[#FDFBF7] p-5 rounded-2xl border border-[#D9B650]/60 shadow-xs space-y-3 animate-fade-in">
                <h3 className="text-sm font-black text-[#1A1612] flex items-center gap-2">📚 深度心理學與專題筆記</h3>
                <p className="text-xs text-[#4A4238]/80 leading-relaxed">內含本單元的深度心理學解析、信任轉化與歷史脈絡筆記。</p>
                <button 
                  onClick={() => onOpenArticle(node.label, node.detail_text!)} 
                  className="w-full bg-[#1A1612] border border-[#D9B650] hover:bg-[#2A241F] text-[#FDFBF7] py-2.5 rounded-xl text-xs font-black transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>📖 開啟完整專題筆記</span>
                  <span>➔</span>
                </button>
              </div>
            )}

            {/* 子節點喜好投票按鈕 */}
            {node.level > 0 && nodeTab === 'stats' && (
              <div className="animate-fade-in">
                <VoteModule nodeId={node.id} stats={appData.stats[node.id]} myVote={appData.userVotes[node.id]} onVote={castVote} />
              </div>
            )}

            {/* 大廳全站喜好分布統計與排行榜 */}
            {node.level === 0 && lobbyTab === 'stats' && (
              <div className="bg-[#FDFBF7] p-5 rounded-2xl border border-[#D1C6B4]/60 shadow-xs space-y-4 animate-fade-in">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-black text-[#1A1612] flex items-center gap-2">📊 全站喜好分布與熱門特質排行榜</h3>
                  <span className="text-xs bg-white border border-[#D1C6B4]/60 px-2.5 py-1 rounded-full text-[#4A4238] font-bold shadow-sm">共計 {globalStatsSummary.reduce((acc, curr) => acc + curr.total, 0)} 次投票</span>
                </div>
                {globalStatsSummary.length === 0 ? (
                  <div className="text-center text-sm text-[#4A4238]/50 py-8 border border-dashed border-[#D1C6B4]/60 rounded-xl">目前尚無投票統計數據，快去各子節點投下第一票吧！</div>
                ) : (
                  <div className="space-y-3">
                    {globalStatsSummary.slice(0, 15).map((item, idx) => {
                      const totalVotes = item.total;
                      const posPct = totalVotes > 0 ? Math.round((item.positive / totalVotes) * 100) : 0;
                      return (
                        <div key={item.id} className="bg-white p-3 rounded-xl border border-[#D1C6B4]/40 shadow-xs flex flex-col gap-1.5 cursor-pointer hover:border-[#B48B28] transition-colors" onClick={() => onJump(item.id)}>
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-black text-[#1A1612] flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-[#1A1612] text-white flex items-center justify-center text-[10px]">{idx + 1}</span>
                              {item.label}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[#15803D]">偏好率 {posPct}% ({totalVotes} 票)</span>
                              <button 
                                onClick={(e) => { e.stopPropagation(); onJump(item.id); }} 
                                className="text-[10px] bg-[#1A1612] text-white font-bold px-2.5 py-1 rounded-full hover:bg-[#332C25] transition-colors shrink-0 shadow-xs"
                              >
                                🚀 傳送至此節點
                              </button>
                            </div>
                          </div>
                          <div className="w-full bg-[#E6DFD5]/40 h-2 rounded-full overflow-hidden flex">
                            <div className="bg-[#E08A8A] h-full" style={{ width: `${(((item as any).need || 0) / totalVotes) * 100}%` }} title={`絕對需要 ${(item as any).need || 0}`} />
                            <div className="bg-[#E8C5C8] h-full" style={{ width: `${(((item as any).like || 0) / totalVotes) * 100}%` }} title={`喜歡 ${(item as any).like || 0}`} />
                            <div className="bg-[#D9B650] h-full" style={{ width: `${(((item as any).curious || 0) / totalVotes) * 100}%` }} title={`好奇 ${(item as any).curious || 0}`} />
                            <div className="bg-[#C5D4B6] h-full" style={{ width: `${(((item as any).neutral || 0) / totalVotes) * 100}%` }} title={`沒感覺 ${(item as any).neutral || 0}`} />
                            <div className="bg-[#D1C6B4] h-full" style={{ width: `${(((item as any).nope || 0) / totalVotes) * 100}%` }} title={`絕對不要 ${(item as any).nope || 0}`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 討論板：子節點與大廳聊天/討論 */}
            {((node.level > 0 && nodeTab === 'chat') || (node.level === 0 && (lobbyTab === 'chat' || lobbyTab === 'board'))) && (
              <div className="flex flex-col flex-1 h-full animate-fade-in">
                <div className="flex items-center gap-2 mb-4 mt-2 shrink-0">
                  <h3 className="text-sm font-bold">{node.level === 0 ? (lobbyTab === 'chat' ? '💬 即時聊天' : '🗣️ 討論交流') : '💬 討論交流'}</h3>
                  <span className="text-[10px] bg-[#E8C5C8]/20 border border-[#E8C5C8]/40 text-[#4A4238] font-semibold px-2 py-0.5 rounded-full">活躍留言將延長保留時間</span>
                </div>
                <div className="space-y-4">
                  {posts.length === 0 ? (
                    <div className="text-center text-sm text-[#4A4238] font-semibold py-8 border border-dashed border-[#D1C6B4]/60 rounded-xl bg-white/80">來當第一個分享的人吧！</div>
                  ) : (
                    posts.map((post: DiscussionPost) => (
                      <Comment 
                        key={post.id} post={post} 
                        hasUpvoted={appData.userUpvotes && appData.userUpvotes[post.id]}
                        userEmojis={appData.userEmojis || {}}
                        allowReply={!(node.level === 0 && lobbyTab === 'chat')}
                        onReply={(text: string) => addReply(post.id, text)}
                        onUpvote={() => toggleUpvote(post.id)}
                        onEmoji={(emoji: string) => addEmoji(post.id, emoji)}
                        onReplyUpvote={(postId: string | number, replyId: string | number) => toggleReplyUpvote(postId, replyId)}
                        onReplyEmoji={(postId: string | number, replyId: string | number, emoji: string) => addReplyEmoji(postId, replyId, emoji)}
                        onDelete={handleDeletePost}
                        currentUserName={userName}
                      />
                    ))
                  )}
                  <div ref={chatEndRef} className="h-1" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {((node.level > 0 && nodeTab === 'chat') || (node.level === 0 && (lobbyTab === 'chat' || lobbyTab === 'board'))) && (
        <div className="shrink-0 p-4 bg-white border-t border-[#D1C6B4]/20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] animate-slide-up">
          <form onSubmit={(e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); const form = e.currentTarget; const input = form.elements.namedItem('msg') as HTMLTextAreaElement; const v = input.value.trim(); if(v){ addPost(v); input.value=''; input.style.height = 'auto'; } }} className="flex gap-2 items-end">
            <button 
              type="button" 
              onClick={() => {
                const imgUrl = prompt("請輸入欲夾帶的圖片網址 (Image URL)：");
                if (imgUrl && imgUrl.trim()) {
                  const form = document.querySelector('form textarea[name="msg"]') as HTMLTextAreaElement;
                  if (form) {
                    form.value = (form.value ? form.value + '\n' : '') + `![圖片](${imgUrl.trim()})`;
                    form.focus();
                  }
                }
              }}
              className="bg-[#FDFBF7] border border-[#D1C6B4]/60 h-[40px] text-[#4A4238] font-bold px-3 rounded-xl text-xs hover:bg-[#E8C5C8]/20 transition-all shrink-0 flex items-center gap-1 shadow-xs"
              title="插入圖片"
            >
              📷 圖片
            </button>
            <textarea 
              name="msg" 
              rows={1}
              placeholder={node.level===0 ? '發言...' : '發表避雷、心得或夾帶圖片...'} 
              className="flex-1 bg-[#FDFBF7] border border-[#D1C6B4]/60 rounded-xl px-4 py-2 text-sm text-[#1A1612] font-medium focus:outline-none focus:border-[#C5D4B6] focus:ring-1 focus:ring-[#C5D4B6] transition-all resize-none min-h-[40px] max-h-[120px] scrollbar-thin"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                }
              }}
              onChange={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
            />
            <button type="submit" className="bg-[#4A4238] h-[40px] text-white px-5 rounded-xl text-sm font-bold hover:bg-[#4A4238]/80 hover:-translate-y-0.5 hover:shadow-md active:scale-95 transition-all shadow-sm shrink-0 whitespace-nowrap">✈️ 發送</button>
          </form>
        </div>
      )}
    </div>
  );
}
