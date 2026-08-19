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
import { useQuizConfig } from '@/components/QuizContext';
import { useDrawerActions } from '@/hooks/useDrawerActions';
import { fetchPublishedForumPosts, sortForumItems, type ForumItem } from '@/lib/data/forum';

// ================= 節點熱門主題預覽 =================
type ForumTopicPreviewProps = {
  node: GraphNode;
  rankingNode: GraphNode;
  nodesData: GraphNode[];
  onOpenForumPost?: (postId: string) => void;
  onOpenForum?: () => void;
};

function ForumTopicPreview({ node, rankingNode, nodesData, onOpenForumPost, onOpenForum }: ForumTopicPreviewProps) {
  const [topics, setTopics] = useState<ForumItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const rankingNodeIds = useMemo(() => {
    const ids = new Set<string>([rankingNode.id]);
    let changed = true;
    while (changed) {
      changed = false;
      nodesData.forEach((candidate) => {
        if (candidate.parent && ids.has(candidate.parent) && !ids.has(candidate.id)) {
          ids.add(candidate.id);
          changed = true;
        }
      });
    }
    return ids;
  }, [nodesData, rankingNode.id]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void fetchPublishedForumPosts(nodesData)
      .then((items) => {
        if (!active) return;
        setTopics(sortForumItems(items.filter((item) => item.nodeId && rankingNodeIds.has(item.nodeId)), 'hot').slice(0, 3));
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setTopics([]);
        setLoadError(error instanceof Error ? error.message : '熱門主題暫時無法載入。');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
      }, [nodesData, rankingNodeIds]);

  return (
    <section className="animate-fade-in rounded-2xl border border-[#D1C6B4]/60 bg-white p-5 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-[#1A1612]">🗣️ {rankingNode.label}熱門主題（前 3）</h3>
          <p className="mt-1 text-xs text-[#4A4238]/60">{node.id === rankingNode.id ? '本節點' : `本節點排行統一連結至「${rankingNode.label}」`}的正式討論文章，依留言與新鮮度排序。</p>
        </div>
        <button type="button" onClick={onOpenForum} className="shrink-0 rounded-full border border-[#172033]/20 px-3 py-1.5 text-[10px] font-black text-[#172033] transition hover:bg-[#172033] hover:text-white">發表主題</button>
      </div>
      {loading && <p className="mt-5 text-center text-xs font-semibold text-[#4A4238]/50">載入熱門主題中…</p>}
      {loadError && <p className="mt-5 rounded-xl border border-[#FCD34D] bg-[#FFFBEB] p-3 text-xs font-semibold text-[#92400E]" role="alert">{loadError}</p>}
      {!loading && !loadError && topics.length === 0 && <p className="mt-5 rounded-xl border border-dashed border-[#D1C6B4]/60 bg-[#FDFBF7] p-5 text-center text-xs font-semibold text-[#4A4238]/55">目前還沒有本節點的正式主題。</p>}
      {!loading && !loadError && topics.length > 0 && (
        <div className="mt-4 space-y-3">
          {topics.map((topic, index) => {
            const title = topic.title || topic.body || topic.text || '未命名主題';
            return (
              <button key={String(topic.id)} type="button" onClick={() => onOpenForumPost?.(String(topic.id))} className="w-full rounded-xl border border-[#D1C6B4]/35 bg-[#FDFBF7] p-3 text-left transition hover:-translate-y-0.5 hover:border-[#172033]/40 hover:shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#172033] text-[10px] font-black text-white">{index + 1}</span>
                  <span className="min-w-0 flex-1">
                    <strong className="line-clamp-2 block text-sm font-black leading-snug text-[#1A1612]">{title}</strong>
                    <span className="mt-1 block text-[10px] font-semibold text-[#4A4238]/55">💬 {topic.commentCount} 則留言 · 點擊閱讀完整文章 →</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ================= 資訊抽屜 =================
export default function DrawerContent({ node, closeDrawer, userName, isGuest, appData, setAppData, onJump, showToast, onOpenIframe, targetPostId, onOpenArticle, onOpenForumPost, onOpenForum, nodesData, goBack, canGoBack, initialLobbyTab }: {
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
  onOpenForumPost?: (postId: string) => void;
  onOpenForum?: () => void;
  nodesData: GraphNode[];
  goBack?: () => void;
  canGoBack?: boolean;
  initialLobbyTab?: 'info' | 'hot' | 'stats' | 'board';
}) {
  const { globalAssets } = useQuizConfig();
  const nodeDictAssets = appData?.nodeImages?.[node.id];
  const nodeDictImage = nodeDictAssets?.realistic || nodeDictAssets?.image;
  const nodeImageAlt = nodeDictAssets?.imageAlt || `${node.label}情境圖`;
  const staticFallback = node.id === 'bdsm' ? '/images/nodes/realistic_bdsm.png' : `/images/nodes/realistic_${node.id}.png`;
  const nodeImageToShow = (node.image && typeof node.image === 'string' && node.image.trim()) 
    ? node.image 
    : (nodeDictImage || staticFallback);
  const [lobbyTab, setLobbyTab] = useState<'info' | 'hot' | 'stats' | 'board'>(initialLobbyTab || 'info');
  const [nodeTab, setNodeTab] = useState<'info' | 'stats' | 'topics'>('info');
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
  
  const dbKey = node.level === 0 ? 'lobby_board' : node.id;
  const rawPosts = (appData && appData.discussions && appData.discussions[dbKey]) || [];
  
  // 大廳熱門留言固定取前 10，節點專題則改由正式 forum_posts 顯示。
  const hotLimit = node.level === 0 ? 10 : node.level === 1 ? 5 : 3;
  const sortedPostsForHot = [...rawPosts].sort((a, b) => getPostActivityScore(b) - getPostActivityScore(a) || (parseDiscussionDate(b.timestamp)?.getTime() || 0) - (parseDiscussionDate(a.timestamp)?.getTime() || 0));
  const hotPostIds = new Set(sortedPostsForHot.slice(0, hotLimit).map(p => p.id));

  const [now] = useState(() => Date.now());
  const posts = rawPosts.map(p => ({ ...p, isHot: hotPostIds.has(p.id) })).filter(p => {
      if (p.isHot) return true;
      const pTime = parseDiscussionDate(p.timestamp)?.getTime() || now;
      const diff = (pTime + (24 * 3600000) + (getPostActivityScore(p) * 600000)) - now;
      return diff > 0;
  });

  const childNodes = nodesData.filter(n => n.parent === node.id);
  const nodeById = useMemo(() => new Map(nodesData.map(item => [item.id, item])), [nodesData]);
  const rankingRootNode = useMemo(() => {
    if (node.level === 0) return node;
    let current = node;
    while (current.parent) {
      const parent = nodeById.get(current.parent);
      if (!parent || Number(parent.level) <= 1) return parent || current;
      current = parent;
    }
    return current;
  }, [node, nodeById]);

  const globalStatsSummary = useMemo(() => {
    return (nodesData || []).map(n => {
      const s = (appData && appData.stats && appData.stats[n.id]) || { need: 0, like: 0, curious: 0, neutral: 0, nope: 0 };
      const positive = (s.need || 0) + (s.like || 0) + (s.curious || 0);
      const negative = typeof s.nope === 'number' ? s.nope : (s.dislike || 0);
      const total = positive + (s.neutral || 0) + negative;
      return { id: n.id, label: n.label, positive, total, stats: s };
    }).sort((a, b) => b.total - a.total || b.positive - a.positive);
  }, [appData.stats, nodesData]);

  const prevPostsLengthRef = useRef(posts.length);
  const lastSubmitRef = useRef(0);
  // 自動捲動到最新留言
  useEffect(() => {
    if (chatEndRef.current && node.level === 0 && lobbyTab === 'board') {
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
        if (node.level > 0) setNodeTab('topics');
        if (node.level === 0) setLobbyTab('board');
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

  const { castVote, handleDeletePost } = useDrawerActions({
    node,
    dbKey,
    posts,
    userName,
    isGuest,
    lobbyTab,
    setAppData,
    showToast,
  });

  const getDescendantNodes = (startNodeId: string): GraphNode[] => {
    let result: GraphNode[] = [];
    const children = nodesData.filter(n => n.parent === startNodeId);
    result = [...children];
    children.forEach(child => {
      result = [...result, ...getDescendantNodes(child.id)];
    });
    return result;
  };

  // 排行統一歸屬於一階節點；根節點仍代表全站排行。
  const rankingScopeNodes = [rankingRootNode, ...getDescendantNodes(rankingRootNode.id)];
  const hotPostsLimit = rankingRootNode.level === 0 ? 10 : 10;

  const allHotPosts = rankingScopeNodes.flatMap(n => {
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
                alt={nodeImageAlt}
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
                  alt={nodeImageAlt}
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
            <button onClick={() => setLobbyTab('hot')} className={`pb-2 text-sm font-bold flex items-center gap-1 shrink-0 ${lobbyTab === 'hot' ? 'text-[#D9B650] border-b-2 border-[#D9B650]' : 'text-[#4A4238]/70 hover:text-[#D9B650]'}`}>🔥 熱門排行</button>
            <button onClick={() => setLobbyTab('stats')} className={`pb-2 text-sm font-bold flex items-center gap-1 shrink-0 ${lobbyTab === 'stats' ? 'text-[#15803D] border-b-2 border-[#15803D]' : 'text-[#4A4238]/70 hover:text-[#15803D]'}`}>📊 全站喜好統計</button>
          </div>
        )}

        {node.level > 0 && (
          <div className="flex gap-4 mt-4 border-b border-[#D1C6B4]/40 overflow-x-auto no-scrollbar">
            <button onClick={() => setNodeTab('info')} className={`pb-2 text-sm font-bold flex items-center gap-1.5 shrink-0 ${nodeTab === 'info' ? 'text-[#1A1612] border-b-2 border-[#1A1612]' : 'text-[#4A4238]/70 hover:text-[#1A1612]'}`}>📖 知識百科</button>
            <button onClick={() => setNodeTab('stats')} className={`pb-2 text-sm font-bold flex items-center gap-1.5 shrink-0 ${nodeTab === 'stats' ? 'text-[#15803D] border-b-2 border-[#15803D]' : 'text-[#4A4238]/70 hover:text-[#15803D]'}`}>📊 喜好投票</button>
            <button onClick={() => setNodeTab('topics')} className={`pb-2 text-sm font-bold flex items-center gap-1.5 shrink-0 ${nodeTab === 'topics' ? 'text-[#1A1612] border-b-2 border-[#1A1612]' : 'text-[#4A4238]/70 hover:text-[#1A1612]'}`}>🗣️ 熱門主題</button>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#FDFBF7]/50 p-4 pb-6 relative flex flex-col sm:p-6">
        {/* 大廳熱門排行：獨立渲染，不走 space-y-6 容器 */}
        {(node.level === 0 && lobbyTab === 'hot') && (
          <div className="animate-fade-in">
            <h3 className="text-sm font-bold mb-4 mt-2">🔥 {rankingRootNode.level === 0 ? '全平台' : rankingRootNode.label}熱門討論排行（前{hotPostsLimit}名）</h3>
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

            {node.level > 0 && nodeTab === 'topics' && (
              <ForumTopicPreview
                node={node}
                rankingNode={rankingRootNode}
                nodesData={nodesData}
                onOpenForumPost={onOpenForumPost}
                onOpenForum={onOpenForum}
              />
            )}
          </div>
        )}
      </div>


    </div>
  );
}
