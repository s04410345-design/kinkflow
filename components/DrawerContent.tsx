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
import type { GraphNode, AppData, DiscussionPost } from '@/lib/types';
import { getPostActivityScore, getWafuColor } from '@/lib/constants';
import { parseDiscussionDate } from '@/lib/contentModel';
import { VoteModule, Comment } from '@/components/Comment';
import AiChatbot from '@/components/AiChatbot';
import { useQuizConfig } from '@/components/QuizContext';
import { useDrawerActions } from '@/hooks/useDrawerActions';

// ================= 資訊抽屜 =================
export default function DrawerContent({ node, closeDrawer, userName, isGuest, appData, setAppData, onJump, showToast, onOpenIframe, targetPostId, onOpenArticle, nodesData, goBack, canGoBack, initialLobbyTab }: {
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
  initialLobbyTab?: 'info' | 'chat' | 'hot' | 'stats' | 'board';
}) {
  const { globalAssets } = useQuizConfig();
  const nodeDictImage = appData?.nodeImages?.[node.id]?.realistic || appData?.nodeImages?.[node.id]?.image;
  const staticFallback = `/images/nodes/realistic_${node.id}.png`;
  const nodeImageToShow = (node.image && typeof node.image === 'string' && node.image.trim()) 
    ? node.image 
    : (nodeDictImage || staticFallback);
  const [lobbyTab, setLobbyTab] = useState<'info' | 'chat' | 'hot' | 'stats' | 'board'>(initialLobbyTab || 'info');
  const [nodeTab, setNodeTab] = useState<'info' | 'hot' | 'stats' | 'chat'>('info');
  const [isImgShrunk, setIsImgShrunk] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setImgLoaded(false);
  }, [node.image]);

  useEffect(() => {
    if (node.level === 0 && initialLobbyTab) setLobbyTab(initialLobbyTab);
  }, [initialLobbyTab, node.level]);
  
  const dbKey = node.level === 0 ? (lobbyTab === 'chat' ? 'lobby_chat' : 'lobby_board') : node.id;
  const rawPosts = (appData && appData.discussions && appData.discussions[dbKey]) || [];
  
  // 計算保留機制與熱門
  const hotLimit = node.level === 0 ? 10 : node.level === 1 ? 5 : 3;
  const isChatLobby = node.level === 0 && lobbyTab === 'chat';
  const sortedPostsForHot = isChatLobby ? [] : [...rawPosts].sort((a, b) => getPostActivityScore(b) - getPostActivityScore(a) || (parseDiscussionDate(b.timestamp)?.getTime() || 0) - (parseDiscussionDate(a.timestamp)?.getTime() || 0));
  const hotPostIds = new Set(sortedPostsForHot.slice(0, hotLimit).map(p => p.id));

  const [now] = useState(() => Date.now());
  const posts = rawPosts.map(p => ({ ...p, isHot: hotPostIds.has(p.id) })).filter(p => {
      if (p.isHot) return true;
      const pTime = parseDiscussionDate(p.timestamp)?.getTime() || now;
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

  const {
    addPost,
    handleDeletePost,
    addReply,
    toggleReplyUpvote,
    addReplyEmoji,
    toggleUpvote,
    addEmoji,
    castVote,
  } = useDrawerActions({
    node,
    dbKey,
    posts,
    userName,
    isGuest,
    lobbyTab,
    setAppData,
    showToast,
  });

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
  }).sort((a, b) => getPostActivityScore(b) - getPostActivityScore(a) || (parseDiscussionDate(b.timestamp)?.getTime() || 0) - (parseDiscussionDate(a.timestamp)?.getTime() || 0))
    .slice(0, hotPostsLimit)
    .map(p => ({ ...p, isHot: true }));

  return (
    <div className="drawer-panel drawer-container flex h-full min-h-0 max-h-[100dvh] flex-col relative text-inherit overflow-hidden overscroll-none scrollbar-thin scrollbar-thumb-[#D1C6B4] scrollbar-track-transparent">
      <div className="shrink-0 border-b border-[#D1C6B4]/20 bg-white/80 p-4 pb-3 relative sm:p-6 sm:pb-4">
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

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#FDFBF7]/50 p-4 pb-6 relative flex flex-col sm:p-6">
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
        <div className="shrink-0 border-t border-[#D1C6B4]/20 bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] animate-slide-up sm:p-4">
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
