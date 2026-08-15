/**
 * ============================================================
 * 🌸 KinkFlow v1 (秋Day) — 模組架構標籤 (Module Tag)
 * 模組 ID  : 1-1, 1-2 (Wave 1 主介面、頂部導覽列與和風風格切換)
 * 路由路徑 : / (客戶端核心)
 * 核心功能 : 頂部和風導覽列 (風格與佈局設定、安裝APP、性向測驗、關於/反饋)、左下角小精靈快捷鈕、Modal 調度
 * 對應檔案 : app/ClientApp.tsx, components/StyleConfigModal.tsx
 * ============================================================
 */
"use client";
// @ts-nocheck

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Papa from 'papaparse';
import type { GraphNode, GraphLink, AppData, DiscussionPost, VoteStats } from '@/lib/types';
import { quizQuestions, initialAppData, SafeStorage } from '@/lib/constants';
import { graphNodes as defaultGraphNodes, graphLinks as defaultGraphLinks } from '@/lib/constants';
import ErrorBoundary from '@/components/ErrorBoundary';
import AuthModal from '@/components/AuthModal';
import GraphView from '@/components/GraphView';
import QuizView from '@/components/QuizView';
import ArticleFeature from '@/components/ArticleFeature';
import ForumFeature from '@/components/ForumFeature';
import AiChatbot from '@/components/AiChatbot';
import AgreementModal from '@/components/AgreementModal';
import NotificationDropdown from '@/components/NotificationDropdown';
import ProfileModal from '@/components/ProfileModal';
import ArticleModal from '@/components/ArticleModal';
import AboutModal from '@/components/AboutModal';
import { AuthorName } from '@/components/Comment';
import { useAuth } from '@/hooks/useAuth';
import { useSupabaseSync } from '@/hooks/useSupabaseSync';
import { QuizConfigContext } from '@/components/QuizContext';
import StyleConfigModal from '@/components/StyleConfigModal';
import { extractDiscussionContent, parseDiscussionDate } from '@/lib/contentModel';

// ================= 主要元件 =================
export default function ClientApp({ quizConfig }: { quizConfig: any }) {
  const { userName, setUserName, userId, setUserId, isGuest, setIsGuest, authMode, setAuthMode, showAuthModal, setShowAuthModal } = useAuth();
  const { appData, setAppData, nodesData, setNodesData, linksData, setLinksData, dbLoaded, setDbLoaded } = useSupabaseSync();

  const [showAboutModal, setShowAboutModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'graph' | 'quiz' | 'articles' | 'forum'>('graph');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [nodeHistory, setNodeHistory] = useState<GraphNode[]>([]);
  const [targetPostId, setTargetPostId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [articleModal, setArticleModal] = useState<{title: string, content: string} | null>(null);
  const [hasAgreed18, setHasAgreed18] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showStyleConfigModal, setShowStyleConfigModal] = useState(false);
  const [showPwaModal, setShowPwaModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [openLobbyChat, setOpenLobbyChat] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    const handleOpenQuiz = () => {
      setActiveTab('quiz');
      setShowProfileModal(false);
    };
    window.addEventListener('open_quiz_modal', handleOpenQuiz);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('open_quiz_modal', handleOpenQuiz);
    };
  }, []);
  
  // 0=hidden, 1=small, 2=large
  const [spriteMode, setSpriteMode] = useState<0|1|2>(0);

  const handleNodeClick = useCallback((node: GraphNode | null, postId?: string) => {
    setSelectedNode(prev => {
      if (node && prev && prev.id !== node.id) {
        setNodeHistory(h => [...h, prev]);
      }
      if (!node) {
        setNodeHistory([]); // Clear history on close
      }
      return node;
    });
    setTargetPostId(postId || null);
    if (node) {
      window.history.pushState({ drawer: true }, '', '#drawer');
    } else {
      if (window.location.hash === '#drawer') {
        window.history.back();
      }
    }
  }, []);

  const goBackNode = useCallback(() => {
    setNodeHistory(prev => {
      if (prev.length === 0) return prev;
      const newHistory = [...prev];
      const prevNode = newHistory.pop();
      if (prevNode) {
        setSelectedNode(prevNode);
      }
      return newHistory;
    });
  }, []);

  const closeDrawer = useCallback(() => {
    setOpenLobbyChat(false);
    handleNodeClick(null);
  }, [handleNodeClick]);

  const openLobbyChatDrawer = useCallback(() => {
    const lobbyNode = nodesData.find((node) => node.id === 'bdsm') || defaultGraphNodes.find((node) => node.id === 'bdsm');
    if (!lobbyNode) return;
    setActiveTab('graph');
    setOpenLobbyChat(true);
    handleNodeClick(lobbyNode);
  }, [handleNodeClick, nodesData]);

  // 處理手機實體返回鍵 (History API)
  useEffect(() => {
    if (selectedNode) {
      window.history.pushState({ drawer: true }, '', '#drawer');
    } else {
      if (window.location.hash === '#drawer') {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    }
  }, [selectedNode]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (selectedNode) {
        handleNodeClick(null);
      }
    };
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!selectedNode && activeTab === 'graph') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [selectedNode, activeTab, handleNodeClick]);

  // ===== Toast =====
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // ===== 預載 html2canvas =====
  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as Window & { html2canvas?: unknown }).html2canvas) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  // ===== Supabase Realtime 即時聊天訂閱 (已關閉以避免連線數上限與 Vercel 紅框報錯) =====
  useEffect(() => {
    /*
    const channel = supabase
      .channel(`discussions-realtime_${Math.random().toString(36).substr(2, 9)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'discussions' },
        (payload) => { ... }
      )
      .subscribe((status) => { ... });
    */

    // ===== 備用方案：如果 WebSocket 被阻擋，定期拉取最新資料 =====
    // Use a slower, visibility-aware poll so a stalled tab cannot create request pressure.
    const fallbackInterval = setInterval(async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const { data: dbDiscussions } = await supabase.from('discussions').select('*').limit(500);
        if (dbDiscussions) {
          setAppData(prev => {
            const next = { ...prev, discussions: { ...prev.discussions } };
            const cleanedDiscussions: Record<string, DiscussionPost[]> = {};
            
            dbDiscussions.forEach(d => {
              const k = d.node_id;
              if (!cleanedDiscussions[k]) cleanedDiscussions[k] = [];
              cleanedDiscussions[k].push({
                id: d.id,
                author: d.author || '匿名會員',
                text: d.text || d.body || '',
                ...extractDiscussionContent(d.text || d.body || '', d.title, d.body, d.media),
                upvotes: Number(d.upvotes || 0),
                timestamp: d.timestamp,
                replies: d.replies || [],
                emojis: d.emojis || []
              });
            });

            // Merge safely to preserve local state like optimistic updates
            for (const k in next.discussions) {
              const optimistics = next.discussions[k].filter(p => typeof p.id === 'string' && String(p.id).startsWith('temp_'));
              const fromDb = cleanedDiscussions[k] || [];
              next.discussions[k] = [...fromDb, ...optimistics].sort((a, b) => (parseDiscussionDate(a.timestamp)?.getTime() || 0) - (parseDiscussionDate(b.timestamp)?.getTime() || 0));
              delete cleanedDiscussions[k];
            }
            
            // Add any newly discovered nodes
            for (const k in cleanedDiscussions) {
              next.discussions[k] = cleanedDiscussions[k].sort((a, b) => (parseDiscussionDate(a.timestamp)?.getTime() || 0) - (parseDiscussionDate(b.timestamp)?.getTime() || 0));
            }
            
            return next;
          });
        }
      } catch (e) {
        console.error('Fallback polling error:', e);
      }
    }, 15000);

    return () => {
      // supabase.removeChannel(channel);
      clearInterval(fallbackInterval);
    };
  }, []);

  useEffect(() => {
    const openNodeHandler = (e: any) => {
      const nodeId = e.detail || e;
      const n = (nodesData && nodesData.length > 0 ? nodesData : defaultGraphNodes).find((x: any) => x.id === nodeId)
             || defaultGraphNodes.find((x: any) => x.id === nodeId);
      if (n) setSelectedNode(n);
    };
    window.addEventListener('kinkflow_open_node', openNodeHandler);
    (window as any).__openNodeForTest = (nodeId: string) => {
      window.dispatchEvent(new CustomEvent('kinkflow_open_node', { detail: nodeId }));
    };
    return () => {
      window.removeEventListener('kinkflow_open_node', openNodeHandler);
    };
  }, [nodesData]);

  // ===== Client mount & 快取讀取 =====
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
    const cachedData = SafeStorage.get('kinkflow_data') as AppData | null;
    if (cachedData) {
      // 自動修復被舊版 Bug 弄壞的重複資料
      const cleanedDiscussions: Record<string, DiscussionPost[]> = {};
      for (const [key, posts] of Object.entries(cachedData.discussions || {})) {
        const seenPostIds = new Set<string | number>();
        cleanedDiscussions[key] = (posts as DiscussionPost[]).filter(p => {
          if (seenPostIds.has(p.id)) return false;
          seenPostIds.add(p.id);
          if (p.replies) {
             const seenReplyKeys = new Set<string>();
             p.replies = p.replies.filter(r => {
                const dupKey = `${r.author}_${r.text}`;
                if (seenReplyKeys.has(dupKey)) return false;
                seenReplyKeys.add(dupKey);
                return true;
             });
          }
          return true;
        });
      }
      setAppData({ ...initialAppData, ...cachedData, discussions: cleanedDiscussions });
    }
    const cachedUser = SafeStorage.get('kinkflow_user') as string | null;
    if (cachedUser) setUserName(cachedUser);
  }, []);

  const saveAppData = (newData: AppData | ((prev: AppData) => AppData)) => {
    setAppData((prev) => {
      const resolved = typeof newData === 'function' ? newData(prev) : newData;
      SafeStorage.set('kinkflow_data', resolved);
      return resolved;
    });
  };

  // ===== 訪客登入 =====
  const handleLogin = async (name: string) => {
    const cleanName = name.replace(/ ☑️/g, '').replace(/ 👻/g, '').trim();
    const finalName = cleanName + ' 👻';
    setUserName(finalName);
    SafeStorage.set('kinkflow_user', finalName);
    setIsGuest(true);

    (async () => {
      let deviceId = SafeStorage.get('kinkflow_device_id') as string | null;
      if (!deviceId) {
        deviceId = Math.random().toString(36).substring(2, 15);
        SafeStorage.set('kinkflow_device_id', deviceId);
      }

      try {
        const { data: userConfigArr } = await supabase.from('quiz_content').select('content').eq('key_name', `user_${name}`);
        const data = userConfigArr?.[0];
        if (data && data.content && typeof data.content === 'object') {
          if ((data.content as Record<string, string>).device_id !== deviceId) {
            showToast("⚠️ 這個暱稱已被其他人使用，請換一個！");
          }
        } else if (!data) {
          await supabase.from('quiz_content').insert({ 
            key_name: `user_${name}`, 
            content: { device_id: deviceId, joinedAt: Date.now() } 
          });
          await supabase.from('visitor_logs').insert({
            action_type: 'user_register',
            device_id: deviceId,
            details: {
              userName: name,
              created_at: new Date().toISOString()
            }
          });
        }
      } catch (e) {
        console.error("登入檢查錯誤", e);
      }
    })();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserName(null);
    setUserId(null);
    SafeStorage.remove('kinkflow_user');
  };

  // ===== 載入畫面 =====
  if (!isMounted || !dbLoaded) {
    return (
      <div className="h-screen w-screen bg-[#FDFBF7] flex flex-col items-center justify-center relative overflow-hidden">
        <div className="w-20 h-20 border-4 border-[#E8C5C8]/30 border-t-[#E8C5C8] rounded-full animate-spin"></div>
        <div className="mt-8 text-[#4A4238]/60 font-bold tracking-widest text-sm animate-pulse">正在為您準備專屬空間...</div>
      </div>
    );
  }

  // ===== 登入/註冊畫面 =====
  if (!userName) {
    return (
      <div className="h-screen w-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-4 md:p-6 relative overflow-hidden text-[#4A4238]">
        <div className="absolute top-10 left-10 w-32 h-32 bg-[#E8C5C8]/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-48 h-48 bg-[#C5D4B6]/20 rounded-full blur-3xl"></div>
        
        <div className="bg-white/80 backdrop-blur-md p-6 md:p-10 rounded-3xl shadow-xl border border-[#D1C6B4]/30 max-w-md w-full z-10 animate-slide-up text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">KinkFlow</h1>
          <p className="text-[#4A4238]/60 mb-6 md:mb-8 text-sm">BDSM 探索與教學互動平台</p>
          
          <form onSubmit={(e) => { e.preventDefault(); if(loginInput.trim()) handleLogin(loginInput.trim()); }}>
            <input 
              type="text" 
              value={loginInput}
              onChange={(e) => setLoginInput(e.target.value)}
              placeholder="請輸入您的專屬 ID (如: 秋田)" 
              className="w-full px-4 py-3 rounded-xl border border-[#D1C6B4]/40 focus:border-[#E8C5C8] focus:ring-1 focus:ring-[#E8C5C8] outline-none mb-4 text-sm bg-white" 
            />
            <button type="submit" className="w-full py-3 bg-[#4A4238] text-white font-bold rounded-xl hover:bg-[#4A4238]/80 hover:scale-[1.02] active:scale-95 transition-all shadow-md">🚀 訪客快速登入</button>
          </form>
          
          <div className="mt-5 mb-5 flex items-center justify-between">
            <div className="h-px bg-[#D1C6B4]/30 flex-1"></div>
            <span className="text-xs text-[#4A4238]/50 px-3 font-bold tracking-widest">OR</span>
            <div className="h-px bg-[#D1C6B4]/30 flex-1"></div>
          </div>
          
          <button onClick={() => setShowAuthModal(true)} className="w-full py-3 bg-[#E8C5C8] text-white font-bold rounded-xl hover:bg-[#E8C5C8]/80 hover:scale-[1.02] active:scale-95 transition-all shadow-md">
            🔐 使用社群帳號 / ID 登入
          </button>
          
          <div className="mt-8 text-[10px] text-[#4A4238]/60 text-left bg-gray-100/50 p-3 rounded-lg border border-[#D1C6B4]/20 leading-relaxed">
            <p>ℹ️ <strong>訪客權限：</strong>可自由瀏覽、對留言按讚與表情，及在「即時聊天室」發言。</p>
            <p className="mt-1">🔒 若想「參與節點喜好投票」或「建立專屬討論版」，請使用完整帳號登入。</p>
          </div>
        </div>

        {showAuthModal && <AuthModal onClose={() => { setShowAuthModal(false); setAuthMode('login'); }} onLoginSuccess={() => setShowAuthModal(false)} defaultMode={authMode} />}
      </div>
    );
  }

  // ===== 主介面 =====
  return (
    <QuizConfigContext.Provider value={quizConfig}>
    <div className="h-screen w-screen flex flex-col font-sans text-[#4A4238] bg-transparent">
      {!hasAgreed18 && <AgreementModal onAgree={() => setHasAgreed18(true)} />}
      
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-[#4A4238] text-white px-5 py-2.5 rounded-full text-sm z-50 shadow-lg animate-slide-up">
          {toastMsg}
        </div>
      )}

      {/* 頂部導覽列 */}
      <nav className="h-14 md:h-16 border-b border-[#D1C6B4]/30 flex items-center justify-between px-4 md:px-8 bg-white/50 backdrop-blur-md z-20 shrink-0 shadow-sm relative">
        <div className="font-bold tracking-wider flex items-center gap-3 text-sm md:text-base">
          <span className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
            <img src="/images/logo_transparent.png" alt="logo" className="w-10 h-10 md:w-11 md:h-11 aspect-square rounded-full object-cover shrink-0 drop-shadow-sm" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <span className="font-extrabold tracking-wide text-base md:text-lg bg-gradient-to-r from-[#4A4238] via-[#B8860B] to-[#4A4238] bg-clip-text text-transparent">秋Day</span>
            <span className="text-[10px] bg-[#E8C5C8]/40 border border-[#E8C5C8]/60 px-2 py-0.5 rounded-full text-[#4A4238] font-bold hidden sm:inline-block">ChillDay Kink Flow</span>
          </span>

          {/* 風格設定按鈕 (桌面版顯示) */}
          <button 
            onClick={() => setShowStyleConfigModal(true)}
            className="hidden md:flex text-xs px-3 py-1.5 rounded-full bg-[#E8C5C8]/30 hover:bg-[#E8C5C8]/60 text-[#4A4238] border border-[#E8C5C8]/50 font-bold transition-all items-center gap-1 shadow-xs"
          >
            <span>🎨</span><span>風格與佈局設定</span>
          </button>
          
          <button 
            onClick={() => {
              if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then(() => setDeferredPrompt(null));
              } else {
                setShowPwaModal(true);
              }
            }}
            className="text-xs px-3 py-1.5 rounded-full bg-[#C5D4B6]/40 hover:bg-[#C5D4B6]/80 text-[#1A1612] border border-[#C5D4B6]/60 font-bold transition-all flex items-center gap-1 shadow-xs shrink-0"
            title="點擊安裝至手機桌面 App"
          >
            <span>📱</span><span>安裝 APP</span>
          </button>
        </div>

        {/* 桌面版導覽 */}
        <div className="hidden md:flex gap-6">
          <button onClick={() => { setActiveTab('graph'); closeDrawer(); }} className={`font-bold transition-colors flex items-center gap-1.5 ${activeTab === 'graph' ? 'text-[#4A4238] border-b-2 border-[#E8C5C8]' : 'text-[#4A4238]/40 hover:text-[#4A4238]/80'}`}>
            <span className="text-sm">🌐</span> 探索網絡
          </button>
          <button onClick={() => setActiveTab('quiz')} className={`font-bold transition-colors flex items-center gap-1.5 ${activeTab === 'quiz' ? 'text-[#4A4238] border-b-2 border-[#E8C5C8]' : 'text-[#4A4238]/40 hover:text-[#4A4238]/80'}`}>
            <span className="text-sm">📝</span> 性向測驗
          </button>
          <button onClick={() => { setActiveTab('articles'); closeDrawer(); }} className={`font-bold transition-colors flex items-center gap-1.5 ${activeTab === 'articles' ? 'text-[#4A4238] border-b-2 border-[#D9B650]' : 'text-[#4A4238]/40 hover:text-[#4A4238]/80'}`}>
            <span className="text-sm">📚</span> 專題誌
          </button>
          <button onClick={() => { setActiveTab('forum'); closeDrawer(); }} className={`font-bold transition-colors flex items-center gap-1.5 ${activeTab === 'forum' ? 'text-[#172033] border-b-2 border-[#172033]' : 'text-[#4A4238]/40 hover:text-[#4A4238]/80'}`}>
            <span className="text-sm">💬</span> 討論版
          </button>
          
          <button 
            className="font-bold transition-colors flex items-center gap-1.5 text-[#4A4238]/40 hover:text-[#4A4238]/80 ml-2"
            onClick={() => setShowAboutModal(true)}
          >
            <span className="text-sm">ℹ️</span> 關於/反饋
          </button>

          <div className="flex items-center gap-3 ml-4 pl-4 border-l border-[#D1C6B4]/30">
            <NotificationDropdown userId={userId} onJump={(id) => {
              const actualNodeId = (id === 'lobby_chat' || id === 'lobby_board') ? 'BDSM' : id;
              handleNodeClick(nodesData.find(n => n.id === actualNodeId) || null);
            }} />
            <span className="text-xs bg-[#D1C6B4]/20 px-3 py-1 rounded-full font-bold flex items-center gap-1 cursor-pointer hover:bg-[#D1C6B4]/40" onClick={() => setShowProfileModal(true)}>
              <AuthorName name={userName!} />
            </span>
            <button onClick={handleLogout} className="text-xs text-[#4A4238]/40 hover:text-red-400 underline">登出</button>
          </div>
        </div>

        {/* 手機版：使用者名稱 + 漢堡按鈕 */}
        <div className="flex md:hidden items-center gap-3">
          <NotificationDropdown userId={userId} onJump={(id) => {
            const actualNodeId = (id === 'lobby_chat' || id === 'lobby_board') ? 'BDSM' : id;
            handleNodeClick(nodesData.find(n => n.id === actualNodeId) || null);
          }} />
          <span className="text-xs bg-[#D1C6B4]/20 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 max-w-[120px] truncate cursor-pointer hover:bg-[#D1C6B4]/40" onClick={() => setShowProfileModal(true)}>
            <AuthorName name={userName!} />
          </span>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" aria-label="開啟選單">
            <svg className="w-5 h-5 text-[#4A4238]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>

        {/* 手機版下拉選單 */}
        {mobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-[#FDFBF7] border-b border-[#D1C6B4]/60 shadow-xl animate-slide-up md:hidden z-30">
            <div className="flex flex-col p-4 gap-1.5">
              <button onClick={() => { setActiveTab('graph'); closeDrawer(); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-xl font-black transition-colors flex items-center gap-2 ${activeTab === 'graph' ? 'bg-[#E8C5C8]/40 text-[#1A1612]' : 'text-[#1A1612] hover:bg-[#E8C5C8]/20'}`}>
                <span>🌐</span> 探索網絡
              </button>
              <button onClick={() => { setActiveTab('quiz'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-xl font-black transition-colors flex items-center gap-2 ${activeTab === 'quiz' ? 'bg-[#E8C5C8]/40 text-[#1A1612]' : 'text-[#1A1612] hover:bg-[#E8C5C8]/20'}`}>
                <span>📝</span> 性向測驗
              </button>
              <button onClick={() => { setActiveTab('articles'); closeDrawer(); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-xl font-black transition-colors flex items-center gap-2 ${activeTab === 'articles' ? 'bg-[#FFF4C8] text-[#1A1612]' : 'text-[#1A1612] hover:bg-[#E8C5C8]/20'}`}>
                <span>📚</span> 專題誌
              </button>
              <button onClick={() => { setActiveTab('forum'); closeDrawer(); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-xl font-black transition-colors flex items-center gap-2 ${activeTab === 'forum' ? 'bg-[#E2E8F0] text-[#172033]' : 'text-[#1A1612] hover:bg-[#E8C5C8]/20'}`}>
                <span>💬</span> 討論版
              </button>
              
              <button onClick={() => { 
                setMobileMenuOpen(false);
                setShowStyleConfigModal(true);
              }} className="w-full text-left px-4 py-3 rounded-xl font-black transition-colors text-[#1A1612] hover:bg-[#E8C5C8]/20 flex items-center gap-2">
                <span>🎨</span> 風格與佈局設定
              </button>

              <button onClick={() => { 
                setMobileMenuOpen(false);
                setShowAboutModal(true);
              }} className="w-full text-left px-4 py-3 rounded-xl font-black transition-colors text-[#1A1612] hover:bg-[#E8C5C8]/20 flex items-center gap-2">
                <span>ℹ️</span> 關於/反饋
              </button>

              <div className="h-px bg-[#D1C6B4]/20 my-2"></div>
              <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                className="w-full text-left px-4 py-3 rounded-xl font-bold text-red-400/70 hover:bg-red-50 transition-colors">
                🚪 登出
              </button>
            </div>
          </div>
        )}
      </nav>
      
      {/* 主內容區 */}
      <div className="flex-1 relative overflow-hidden">
        {activeTab === 'graph' && (
          <ErrorBoundary moduleName="網路圖探索">
            <GraphView 
              onNodeClick={handleNodeClick}
              selectedNode={selectedNode}
              closeDrawer={closeDrawer}
              userName={userName!}
              isGuest={isGuest}
              appData={appData}
              setAppData={setAppData}
              showToast={showToast}
              onOpenIframe={setIframeUrl}
              targetPostId={targetPostId}
              onOpenArticle={(title, content) => setArticleModal({title, content})}
              nodesData={nodesData}
              linksData={linksData}
              goBack={goBackNode}
              canGoBack={nodeHistory.length > 0}
              initialLobbyTab={openLobbyChat ? 'chat' : undefined}
            />
          </ErrorBoundary>
        )}
        {activeTab === 'quiz' && (
          <ErrorBoundary moduleName="性向測驗">
            <QuizView showToast={showToast} userName={userName} onCancel={() => setActiveTab('graph')} quizConfig={quizConfig} />
          </ErrorBoundary>
        )}
        {activeTab === 'articles' && (
          <ErrorBoundary moduleName="專題誌">
            <ArticleFeature
              nodesData={nodesData.length > 0 ? nodesData : defaultGraphNodes}
              onBackToNode={(nodeId) => {
                setActiveTab('graph');
                const node = (nodesData.length > 0 ? nodesData : defaultGraphNodes).find((item) => item.id === nodeId);
                if (node) handleNodeClick(node);
              }}
            />
          </ErrorBoundary>
        )}
        {activeTab === 'forum' && (
          <ErrorBoundary moduleName="討論版">
            <ForumFeature
              nodesData={nodesData.length > 0 ? nodesData : defaultGraphNodes}
              discussions={appData.discussions}
              isMember={!isGuest && Boolean(userId)}
            />
          </ErrorBoundary>
        )}
      </div>

      {/* Iframe Modal for Detailed Links */}
      {iframeUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 animate-fade-in">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIframeUrl(null)}></div>
          <div className="relative w-full max-w-5xl h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-[#4A4238] text-white px-4 py-3 flex justify-between items-center shrink-0">
              <span className="font-bold text-sm tracking-widest">📖 詳細教學與說明</span>
              <button onClick={() => setIframeUrl(null)} className="hover:bg-white/20 p-1.5 rounded-full transition-colors font-bold">✕</button>
            </div>
            <iframe src={iframeUrl} className="w-full flex-1 bg-[#FDFBF7]" title="Tutorial"></iframe>
          </div>
        </div>
      )}

      {/* Article Modal */}
      <ArticleModal 
        isOpen={!!articleModal} 
        onClose={() => setArticleModal(null)} 
        title={articleModal?.title || ''} 
        markdownContent={articleModal?.content || ''} 
      />

      {/* About & Feedback Modal */}
      <AboutModal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)} />

      {/* Agreement Modal */}
      <AgreementModal onAgree={() => {}} />

      {/* Auth Modal */}
      {showAuthModal && <AuthModal onClose={() => { setShowAuthModal(false); setAuthMode('login'); }} onLoginSuccess={() => setShowAuthModal(false)} defaultMode={authMode} />}

      {/* Profile Modal */}
      {showProfileModal && <ProfileModal userName={userName!} userId={userId} isGuest={isGuest} onNameChange={setUserName} onClose={() => setShowProfileModal(false)} onJump={(nodeId, postId) => {
        const actualNodeId = (nodeId === 'lobby_chat' || nodeId === 'lobby_board') ? 'BDSM' : nodeId;
        handleNodeClick(nodesData.find(n => n.id === actualNodeId) || null, postId);
      }} />}

      {/* Style & Layout Config Center Modal */}
      {showStyleConfigModal && (
        <StyleConfigModal
          userName={userName!}
          userId={userId}
          onClose={() => setShowStyleConfigModal(false)}
        />
      )}

      {/* About & Feedback Modal */}
      {showAboutModal && (
        <AboutModal
          isOpen={showAboutModal}
          onClose={() => setShowAboutModal(false)}
        />
      )}

      {/* PWA 手機 APP 安裝指南 Modal */}
      {showPwaModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowPwaModal(false)}>
          <div className="bg-[#FDFBF7] p-6 rounded-3xl max-w-md w-full border-2 border-[#D1C6B4]/50 shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowPwaModal(false)} className="absolute top-4 right-4 p-2 bg-[#E8C5C8]/30 hover:bg-[#E8C5C8] text-[#4A4238] rounded-full text-xs font-bold transition-colors">✕</button>
            <h3 className="text-xl font-black text-[#4A4238] mb-2 flex items-center gap-2">📱 將 KinkFlow 新增至手機桌面 App</h3>
            <p className="text-xs text-[#4A4238]/70 mb-4">不用到 App Store 免費快速安裝！全螢幕體驗、絲滑流暢、零網址列：</p>
            
            <div className="space-y-3 text-xs bg-white p-4 rounded-2xl border border-[#D1C6B4]/30">
              <div className="border-b border-[#D1C6B4]/20 pb-2">
                <div className="font-bold text-[#E8C5C8] mb-1">🍎 iOS (iPhone / iPad Safari)</div>
                <ol className="list-decimal list-inside space-y-1 text-[#4A4238]">
                  <li>點擊 Safari 底部工具列的 <strong>「分享」 (⬆️) 按鈕</strong></li>
                  <li>向下滑動點選 <strong>「加入主畫面」</strong> (Add to Home Screen)</li>
                  <li>點擊右上角「新增」，桌面即可出現 KinkFlow App！</li>
                </ol>
              </div>
              <div>
                <div className="font-bold text-[#5C9EAD] mb-1">🤖 Android (Chrome)</div>
                <ol className="list-decimal list-inside space-y-1 text-[#4A4238]">
                  <li>點擊 Chrome 右上角選單 <strong>「⋮」 按鈕</strong></li>
                  <li>點選 <strong>「安裝應用程式」</strong> 或 <strong>「新增至主畫面」</strong></li>
                  <li>確認後即可在手機桌面直接開啟使用！</li>
                </ol>
              </div>
            </div>

            <button onClick={() => setShowPwaModal(false)} className="mt-5 w-full py-3 bg-[#4A4238] text-white text-xs font-bold rounded-xl hover:bg-[#4A4238]/80 transition-colors shadow-md">
              我知道了，開始探索 🚀
            </button>
          </div>
        </div>
      )}

      {/* 穩定的大廳聊天固定入口：不依賴 SVG 節點座標或動畫元素 */}
      <button
        type="button"
        onClick={openLobbyChatDrawer}
        className="fixed bottom-4 right-4 z-40 rounded-full border-2 border-white bg-[#172033] px-4 py-3 text-sm font-black text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-[#334155] active:scale-95"
        aria-label="開啟大廳即時聊天"
      >
        💬 大廳聊天
      </button>

      {/* 小精靈懸浮按鈕 + 聊天面板 */}
      {userName && (
        <>
          {/* 聊天面板 */}
          {spriteMode > 0 && (
            <div className={`fixed bottom-20 left-4 z-50 rounded-2xl shadow-2xl border border-[#D1C6B4]/30 overflow-hidden animate-fade-in bg-white transition-all duration-300 flex flex-col ${spriteMode === 2 ? 'w-[92vw] md:w-[60vw] max-w-[800px] h-[85vh]' : 'w-[340px] max-w-[90vw] h-[420px]'}`}>
              <ErrorBoundary moduleName="AI 小精靈">
                <AiChatbot userName={userName} currentNode={selectedNode?.label || 'BDSM 探索大廳'} isLarge={spriteMode === 2} onToggleSize={() => setSpriteMode(spriteMode === 1 ? 2 : 1)} onClose={() => setSpriteMode(0)} />
              </ErrorBoundary>
            </div>
          )}
          {/* 懸浮按鈕 */}
          <button
            onClick={() => setSpriteMode(spriteMode === 0 ? 1 : 0)}
            className={`fixed bottom-4 left-4 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl transition-all hover:scale-110 active:scale-95 ${spriteMode > 0 ? 'bg-[#4A4238] text-white rotate-45' : 'bg-gradient-to-br from-[#E8C5C8] to-[#C5D4B6] text-white'}`}
            title="小精靈"
          >
            {spriteMode > 0 ? '✕' : '✨'}
          </button>
        </>
      )}
    </div>
    </QuizConfigContext.Provider>
  );
}