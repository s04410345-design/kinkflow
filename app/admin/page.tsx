/**
 * ============================================================
 * 🌸 KinkFlow v1 (秋Day) — 模組架構標籤 (Module Tag)
 * 模組 ID  : 4-1, 4-2 (Wave 4 全站直觀視覺化編輯後台)
 * 路由路徑 : /admin (管理員後台)
 * 核心功能 : 直觀編輯全站排版 (Layout)、文本 (Text)、家紋圖案 (Kamon/Icons)、題庫權重、寫手審核與檢舉處理
 * 對應檔案 : app/admin/page.tsx, components/admin/*
 * ============================================================
 */
"use client";
// @ts-nocheck

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import Chart from 'chart.js/auto';
import Papa from 'papaparse';
import VisitorLogsPanel from '@/components/admin/VisitorLogsPanel';
import NodeContentEditor from '@/components/admin/NodeContentEditor';
import QuizContentEditor from '@/components/admin/QuizContentEditor';
import MemberManagementPanel from '@/components/admin/MemberManagementPanel';
import DiscussionManagementPanel from '@/components/admin/DiscussionManagementPanel';
import AnalyticsDashboardPanel from '@/components/admin/AnalyticsDashboardPanel';
import AuthModal from '@/components/AuthModal';
import StyleConfigModal from '@/components/StyleConfigModal';
import GraphView from '@/components/GraphView';
import type { GraphNode, GraphLink } from '@/lib/types';
import { graphNodes as defaultGraphNodes, quizQuestions as defaultQuizQuestions } from '@/lib/constants';

interface LogEntry {
  id: string;
  created_at: string;
  action_type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: any;
  device_id?: string;
}

const TRAIT_LABELS: Record<string, string> = {
  dom: 'Dom 支配', sub: 'Sub 服從', rigger: 'Rigger 束縛者',
  tied: 'Tied 被縛', sadist: 'Sadist 施痛', maso: 'Maso 承受',
};
const VOTE_LABELS: Record<string, string> = {
  need: '🔥 絕對需要', like: '🟢 喜歡', curious: '🟡 觀望中', neutral: '⚪ 沒感覺', nope: '🔴 絕對不要',
};
const SCATTER_AXES = [
  { label: 'Dom / Sub', x: 'dom', y: 'sub' },
  { label: 'Sadist / Maso', x: 'sadist', y: 'maso' },
  { label: 'Rigger / Tied', x: 'rigger', y: 'tied' },
  { label: 'Dom / Sadist', x: 'dom', y: 'sadist' },
  { label: 'Sub / Maso', x: 'sub', y: 'maso' },
];

// ===== 可收合 Section =====
function Collapsible({ title, subtitle, count, defaultOpen = false, accent, children }: { title: string; subtitle?: string; count?: number | string; defaultOpen?: boolean; accent?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white/70 rounded-2xl border border-[#D1C6B4]/30 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((o: boolean) => !o)}
        className={`w-full px-6 py-4 flex items-center justify-between text-left transition-colors hover:bg-[#F5EFE6]/30 ${open ? 'border-b border-[#D1C6B4]/20' : ''}`}
      >
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full shrink-0 ${accent || 'bg-[#D1C6B4]'}`}></span>
          <div>
            <div className="font-bold text-[#4A4238] text-sm">{title}</div>
            {subtitle && <div className="text-xs text-[#4A4238]/50 mt-0.5">{subtitle}</div>}
          </div>
          {count !== undefined && (
            <span className="ml-1 text-xs bg-[#E8C5C8]/30 text-[#4A4238] px-2 py-0.5 rounded-full font-mono">{count}</span>
          )}
        </div>
        <span className={`text-[#4A4238]/40 transition-transform duration-200 ${open ? 'rotate-180' : ''} text-lg`}>▾</span>
      </button>
      {open && <div className="p-6">{children}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const [isAuth, setIsAuth] = useState(false);
  const [adminLevel, setAdminLevel] = useState<number | null>(null);
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authError, setAuthError] = useState('');

  const [activeTab, setActiveTab] = useState<'analytics' | 'cms_nodes' | 'cms_quiz' | 'users' | 'discussions' | 'comments' | 'admins'>('analytics');
  const [quizJson, setQuizJson] = useState('[]');
  const [mindmapJson, setMindmapJson] = useState('');
  const [sheetConfig, setSheetConfig] = useState<any>({});
  const [nodeImages, setNodeImages] = useState<Record<string, { icon?: string, image?: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showStyleConfigModal, setShowStyleConfigModal] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [discussions, setDiscussions] = useState<Record<string, {id: string | number; author: string; text: string; timestamp: number; upvotes: number; replies: {author: string; text: string}[]; emojis: {char: string; count: number}[]}[]>>({});
  const [nodeNameMap, setNodeNameMap] = useState<Record<string, string>>({});
  const [nodeParentMap, setNodeParentMap] = useState<Record<string, string>>({});  // id → parentId
  const [nodeLevelMap, setNodeLevelMap] = useState<Record<string, number>>({});   // id → level
  const [statsLoading, setStatsLoading] = useState(false);

  // 管理員設定
  const [adminUsers, setAdminUsers] = useState<{user_id: string, role_level: number, granted_by?: string | null, created_at: string}[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminLevel, setNewAdminLevel] = useState(2);
  const [adminLoading, setAdminLoading] = useState(false);

  // 散佈圖
  const [scatterAxisIdx, setScatterAxisIdx] = useState(0);
  const scatterChartRef = useRef<HTMLCanvasElement | null>(null);
  const scatterChartInst = useRef<Chart | null>(null);

  // 動態直方圖 - 下拉展開
  const [dynamicOpen, setDynamicOpen] = useState(false);
  const [dynamicParentId, setDynamicParentId] = useState<string>('');
  const dynamicChartRef = useRef<HTMLCanvasElement | null>(null);
  const dynamicChartInst = useRef<Chart | null>(null);

  // 用戶紀錄 - 投票區塊展開控制
  const [voteLogOpen, setVoteLogOpen] = useState(false);
  const [quizLogOpen, setQuizLogOpen] = useState(false);
  const [commentOpenMap, setCommentOpenMap] = useState<Record<string, boolean>>({});
  const [listExpandedNodes, setListExpandedNodes] = useState<Record<string, boolean>>({});
  const [uploadingState, setUploadingState] = useState<Record<string, boolean>>({});

  // 智慧前端圖片壓縮，避開 Vercel 4.5MB Payload 限制
  const compressImageFile = (file: File, maxSide = 1200, quality = 0.75): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = document.createElement('img');
        img.src = event.target?.result as string;
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxSide || height > maxSide) {
            if (width > height) {
              height = Math.round((height * maxSide) / width);
              width = maxSide;
            } else {
              width = Math.round((width * maxSide) / height);
              height = maxSide;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(event.target?.result as string);
          ctx.drawImage(img, 0, 0, width, height);
          const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          const dataUrl = canvas.toDataURL(outputType, quality);
          resolve(dataUrl);
        };
        img.onerror = () => resolve(event.target?.result as string);
      };
      reader.onerror = () => resolve('');
    });
  };

  const handleFileUpload = async (nodeId: string, type: 'icon' | 'image', file: File) => {
    if (!file) return;
    const stateKey = `${nodeId}_${type}`;
    setUploadingState(prev => ({ ...prev, [stateKey]: true }));
    try {
      // 智慧高精細超輕量壓縮圖片
      const base64 = await compressImageFile(file, type === 'icon' ? 600 : 1200, 0.75);
      if (!base64) throw new Error('讀取圖片檔案失敗');

      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `node_${nodeId}_${type}_${Date.now()}.${fileExt}`;

      const res = await fetch('/api/uploadImage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64, fileName }),
      });

      const resText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(resText);
      } catch (e) {
        if (res.status === 413 || resText.includes('Request Entity Too Large') || resText.includes('Payload Too Large')) {
          throw new Error('圖片檔案體積過大 (超過 Server 限制)，請嘗試上傳較小尺寸的圖片');
        } else {
          throw new Error(`伺服器錯誤 (${res.status})`);
        }
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const uploadedUrl = data.url || base64;

      // 1. 更新 nodeImages 字典
      const currentDict = nodeImages[nodeId] || {};
      const newImages = {
        ...nodeImages,
        [nodeId]: {
          ...currentDict,
          kamon: type === 'icon' ? uploadedUrl : ((currentDict as any).kamon || (currentDict as any).icon),
          icon: type === 'icon' ? uploadedUrl : ((currentDict as any).icon || (currentDict as any).kamon),
          realistic: type === 'image' ? uploadedUrl : ((currentDict as any).realistic || (currentDict as any).image),
          image: type === 'image' ? uploadedUrl : ((currentDict as any).image || (currentDict as any).realistic),
        }
      };
      setNodeImages(newImages);

      // 2. 更新 mindmapJson
      let updatedMindmapJson = mindmapJson;
      try {
        const currentNodes = JSON.parse(mindmapJson) || [];
        const updatedNodes = currentNodes.map((n: any) => {
          if (n.id === nodeId) {
            if (type === 'image') {
              return { ...n, image: uploadedUrl };
            } else if (type === 'icon') {
              return { ...n, icon: uploadedUrl, kamonIcon: uploadedUrl };
            }
          }
          return n;
        });
        updatedMindmapJson = JSON.stringify(updatedNodes, null, 2);
        setMindmapJson(updatedMindmapJson);
      } catch (e) {
        console.error("Failed to parse mindmapJson:", e);
      }

      // 3. 自動寫入 Supabase 儲存資料庫
      await handleSave('node_images', newImages, false);
      if (updatedMindmapJson !== mindmapJson) {
        await handleSave('mindmap_data', updatedMindmapJson, false);
      }

      setMessage(`✅ ${type === 'icon' ? '節點家徽' : '視窗情境圖'} 照片上傳並同步儲存成功！`);
    } catch (err: any) {
      alert('上傳失敗: ' + err.message);
    } finally {
      setUploadingState(prev => ({ ...prev, [stateKey]: false }));
    }
  };

  const fetchCmsData = async () => {
    setLoading(true);
    const { data: mdArr } = await supabase.from('quiz_content').select('content').eq('key_name', 'mindmap_data');
    const md = mdArr?.[0];
    if (md?.content && Array.isArray(md.content) && md.content.length >= 10) {
      setMindmapJson(JSON.stringify(md.content, null, 2));
    } else {
      setMindmapJson(JSON.stringify(defaultGraphNodes, null, 2));
    }
    
    const { data: qdArr } = await supabase.from('quiz_content').select('content').eq('key_name', 'quiz_system_config');
    const qd = qdArr?.[0];
    if (qd?.content) {
      setQuizJson(JSON.stringify(qd.content, null, 2));
    } else {
      setQuizJson(JSON.stringify(defaultQuizQuestions, null, 2));
    }
    const { data: scArr } = await supabase.from('quiz_content').select('content').eq('key_name', 'google_sheets_config');
    const sc = scArr?.[0];
    if (sc) setSheetConfig(sc.content);

    const { data: niArr } = await supabase.from('quiz_content').select('content').eq('key_name', 'node_images');
    const ni = niArr?.[0];
    if (ni && ni.content) setNodeImages(ni.content as Record<string, { icon?: string, image?: string }>);

    const nameMap: Record<string, string> = {};
    const parentMap: Record<string, string> = {};
    const levelMap: Record<string, number> = {};

    if (md && md.content) {
      md.content.forEach((n: any) => {
        if (n.id && n.label) nameMap[n.id] = n.label;
        if (n.id && n.parent) parentMap[n.id] = n.parent;
        if (n.id && n.level !== undefined) levelMap[n.id] = n.level;
      });
    }
    
    nameMap['lobby_board'] = '探索大廳-精華留言';
    nameMap['lobby_chat'] = '探索大廳-即時聊天';
    if (sc && sc.content?.mindmap) {
      try {
        const res = await fetch(`/api/sheet?url=${encodeURIComponent(sc.content.mindmap)}`);
        let csvData = await res.text();
        if (csvData.charCodeAt(0) === 0xFEFF) csvData = csvData.substring(1);
        const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
        parsed.data.forEach((row: any) => {
          const newRow: Record<string, string | number> = {};
          for (const key in row) {
            newRow[key.trim()] = row[key];
          }
          const id = (typeof newRow['代號'] === 'string' ? newRow['代號'] : typeof newRow.id === 'string' ? newRow.id : '').trim();
          const label = (typeof newRow['名稱'] === 'string' ? newRow['名稱'] : typeof newRow.label === 'string' ? newRow.label : '').trim();
          const parent = (typeof newRow['父節點'] === 'string' ? newRow['父節點'] : typeof newRow.parent === 'string' ? newRow.parent : '').trim();
          const level = parseInt(typeof newRow['階層'] === 'string' ? newRow['階層'] : typeof newRow['層級'] === 'string' ? newRow['層級'] : typeof newRow.level === 'string' ? newRow.level : '0');
          if (id && label) nameMap[id] = label;
          if (id && parent) parentMap[id] = parent;
          if (id) levelMap[id] = level;
        });
      } catch (err) { console.error("Failed to fetch sheet:", err); }
    }
    setNodeNameMap(nameMap);
    setNodeParentMap(parentMap);
    setNodeLevelMap(levelMap);

    const { data: discData } = await supabase.from('discussions').select('*');
    if (discData) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const grouped: Record<string, any[]> = {};
      discData.forEach(d => {
        if (!grouped[d.node_id]) grouped[d.node_id] = [];
        grouped[d.node_id].push(d);
      });
      setDiscussions(grouped);
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    const { data } = await supabase.from('visitor_logs').select('*').order('created_at', { ascending: false }).limit(1000);
    if (data) setLogs(data as LogEntry[]);
    setStatsLoading(false);
  };

  useEffect(() => { 
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isAuth) fetchCmsData(); 
  }, [isAuth]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isAuth && ((activeTab as string) === 'stats' || activeTab === 'comments')) fetchStats();
    if (isAuth && activeTab === 'admins' && adminLevel === 1) fetchAdmins();
  }, [activeTab, isAuth, adminLevel]);

  const fetchAdmins = async () => {
    setAdminLoading(true);
    const { data } = await supabase.from('admin_roles').select('user_id, role_level, granted_by, created_at').order('role_level', { ascending: true });
    if (data) setAdminUsers(data);
    setAdminLoading(false);
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim()) return;
    setAdminLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const { error } = await supabase.from('admin_roles').upsert({ user_id: newAdminEmail.trim(), role_level: newAdminLevel, granted_by: sessionData.session?.user.id || null });
      if (error) throw error;
      setNewAdminEmail('');
      setNewAdminLevel(2);
      fetchAdmins();
      setMessage('✅ 管理員權限更新成功');
    } catch (err) {
      setMessage('❌ 新增管理員失敗');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleRemoveAdmin = async (email: string) => {
    if (email === adminEmail) {
      alert('您不能移除自己的權限！');
      return;
    }
    if (!confirm(`確定要移除 ${email} 的管理員權限嗎？`)) return;
    setAdminLoading(true);
    try {
      const { error } = await supabase.from('admin_roles').delete().eq('user_id', email);
      if (error) throw error;
      fetchAdmins();
      setMessage('✅ 管理員權限已移除');
    } catch (err) {
      setMessage('❌ 移除管理員失敗');
    } finally {
      setAdminLoading(false);
    }
  };

  // ===== Supabase Realtime 即時訂閱關閉，避免 Vercel 報錯 =====
  useEffect(() => {
    if (!isAuth) return;
    // const channel = supabase
    //   .channel('admin-discussions')
    //   .on(
    //     'postgres_changes',
    //     { event: '*', schema: 'public', table: 'discussions' },
    //     () => {
    //       fetchCmsData(); // Re-fetch the discussions and nodes
    //     }
    //   )
    //   .subscribe();
    // return () => { supabase.removeChannel(channel); };
  }, [isAuth]);

  const checkAdminRole = async (user: any) => {
    if (!user || !user.email) return;
    try {
      const { data, error } = await supabase.from('admin_roles').select('role_level').eq('user_id', user.id).single();
      if (error || !data) {
        setAuthError('❌ 此帳號無管理員權限');
        await supabase.auth.signOut();
        setIsAuth(false);
        setAdminLevel(null);
      } else {
        setAdminEmail(user.id);
        setAdminLevel(data.role_level);
        setIsAuth(true);
        setAuthError('');
      }
    } catch (err) {
      setAuthError('❌ 權限驗證失敗');
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        checkAdminRole(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        checkAdminRole(session.user);
      } else {
        setIsAuth(false);
        setAdminLevel(null);
      }
    });
    const handleOpenModal = () => setShowStyleConfigModal(true);
    window.addEventListener('open_style_config_modal', handleOpenModal);

    return () => { 
      subscription.unsubscribe();
      window.removeEventListener('open_style_config_modal', handleOpenModal);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };



  // ===== 散佈圖 =====
  useEffect(() => {
    if ((activeTab as string) !== 'stats' || statsLoading || !scatterChartRef.current) return;
    const quizLogs = logs.filter(l => l.action_type === 'quiz_complete');
    if (scatterChartInst.current) scatterChartInst.current.destroy();
    const ax = SCATTER_AXES[scatterAxisIdx];
    const pts = quizLogs.map(l => ({
      x: l.details.scores ? Number(l.details.scores[ax.x] || 0) : 0,
      y: l.details.scores ? Number(l.details.scores[ax.y] || 0) : 0,
      label: l.details.userName || '匿名',
    }));
    scatterChartInst.current = new Chart(scatterChartRef.current, {
      type: 'scatter',
      data: { datasets: [{ label: '訪客', data: pts, backgroundColor: 'rgba(232,197,200,0.8)', borderColor: '#E08A8A', pointRadius: 7, pointHoverRadius: 11 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => { const raw = ctx.raw as {label: string; x: number; y: number}; return `${raw.label} → ${TRAIT_LABELS[ax.x]||ax.x}: ${raw.x} / ${TRAIT_LABELS[ax.y]||ax.y}: ${raw.y}`; } } }
        },
        scales: {
          x: { title: { display: true, text: TRAIT_LABELS[ax.x] || ax.x, color: '#4A4238', font: { weight: 'bold' } }, ticks: { display: true, color: '#4A4238', callback: (v) => `${v}%` }, beginAtZero: true, grid: { color: '#D1C6B4/30' } },
          y: { title: { display: false }, ticks: { display: true, color: '#4A4238', callback: (v) => `${v}%` }, beginAtZero: true, grid: { color: '#D1C6B4/30' } },
        }
      }
    });
  }, [logs, activeTab, statsLoading, scatterAxisIdx]);

  // ===== 動態直方圖 - 僅顯示直接子節點 =====
  useEffect(() => {
    if (!dynamicParentId || !dynamicChartRef.current) return;
    const voteLogs = logs.filter(l => l.action_type === 'node_vote');

    let targetIds: string[] | null = null;
    if (dynamicParentId !== '__all__') {
      targetIds = Object.keys(nodeParentMap).filter(id => nodeParentMap[id] === dynamicParentId);
      if (targetIds.length === 0) {
        // 如果是末端節點，沒有子項目，就只顯示自己
        targetIds = [dynamicParentId];
      }
    } else {
      // 選擇 __all__ 時，只顯示第 0 層大分類（Root 節點）
      const allVotedIds = Array.from(new Set(voteLogs.map(l => l.details.node_id)));
      targetIds = allVotedIds.filter(id => !nodeParentMap[id] || !allVotedIds.includes(nodeParentMap[id]));
    }

    const nc: Record<string, { label: string, total: number, likes: number, neutral: number, dislikes: number }> = {};
    const uniqueVotes = new Map<string, any>();
    voteLogs.forEach(l => {
      const key = `${l.device_id}_${l.details.node_id}`;
      if (uniqueVotes.has(key)) return;
      uniqueVotes.set(key, l);
      const nodeId = l.details.node_id;
      if (targetIds && !targetIds.includes(nodeId)) return;
      const nodeLabel = l.details.node_label || nodeNameMap[nodeId] || nodeId || '?';
      if (!nc[nodeId]) nc[nodeId] = { label: nodeLabel, total: 0, likes: 0, neutral: 0, dislikes: 0 };
      nc[nodeId].total++;
      if (l.details.vote_type === 'like' || l.details.vote_type === 'need') nc[nodeId].likes++;
      else if (l.details.vote_type === 'nope') nc[nodeId].dislikes++;
      else nc[nodeId].neutral++;
    });

    const entries = Object.entries(nc).sort((a, b) => b[1].total - a[1].total).slice(0, 20);
    if (dynamicChartInst.current) dynamicChartInst.current.destroy();
    if (entries.length === 0) return;

    dynamicChartInst.current = new Chart(dynamicChartRef.current, {
      type: 'bar',
      data: {
        labels: entries.map(([, v]) => v.label),
        datasets: [
          { label: '喜歡', data: entries.map(([, v]) => v.likes), backgroundColor: 'rgba(197,212,182,0.85)', borderRadius: 4 },
          { label: '普通', data: entries.map(([, v]) => v.neutral), backgroundColor: 'rgba(217,182,80,0.6)', borderRadius: 4 },
          { label: '反感', data: entries.map(([, v]) => v.dislikes), backgroundColor: 'rgba(224,138,138,0.85)', borderRadius: 4 },
        ]
      },
      options: {
        indexAxis: 'y',
        plugins: { legend: { position: 'bottom' } },
        scales: {
          x: { stacked: true, beginAtZero: true, max: 1, ticks: { color: '#4A4238', callback: (v) => `${Math.round((v as number)*100)}%` } },
          y: { stacked: true, ticks: { color: '#4A4238' } }
        }
      }
    });
  }, [dynamicParentId, logs, nodeNameMap, nodeParentMap]);

  const handleDeletePost = async (postId: string | number) => {
    if (!confirm('確定要刪除這筆留言嗎？這將會連同底下的回覆一起刪除。')) return;
    try {
      const { error } = await supabase.from('discussions').delete().eq('id', postId);
      if (error) throw error;
      alert('刪除成功');
      fetchCmsData();
    } catch (err) {
      console.error('刪除失敗', err);
      alert('刪除失敗');
    }
  };

  const handleClearNodePosts = async (nodeId: string) => {
    if (!confirm(`確定要清空「${nodeNameMap[nodeId] || nodeId}」的所有留言嗎？此操作無法復原！`)) return;
    try {
      const { error } = await supabase.from('discussions').delete().eq('node_id', nodeId);
      if (error) throw error;
      alert('清空成功');
      fetchCmsData();
    } catch (err) {
      console.error('清空失敗', err);
      alert('清空失敗');
    }
  };

  const handleClearAllLogs = async () => {
    if (!confirm('警告：確定要清空所有的訪客測驗與互動紀錄嗎？（不含留言）此操作無法復原！')) return;
    try {
      // 修正：Supabase 無法用 neq('id', 0) 刪除 uuid，改用不等於無效值
      const { error } = await supabase.from('visitor_logs').delete().not('id', 'is', null);
      if (error) throw error;
      alert('紀錄清空成功');
      fetchStats();
    } catch (err) {
      console.error('清空失敗', err);
      alert('清空失敗');
    }
  };

  const handleSave = async (keyName: string, data: unknown, isJson = true) => {
    if (adminLevel === 3) {
      alert('您的權限等級為 Level 3 (僅供觀看)，無法儲存修改內容！');
      return;
    }
    setSaving(true); setMessage('');
    try {
      const parsed = isJson ? JSON.parse(data as string) : data;
      const { error } = await supabase.from('quiz_content').upsert({ key_name: keyName, content: parsed }, { onConflict: 'key_name' });
      if (error) throw error;
      setMessage('✅ 儲存成功！前台網站已同步更新。');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setMessage(`❌ 儲存失敗：${err.message}`);
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  // ===== 計算統計 =====
  const quizLogs = logs.filter(l => l.action_type === 'quiz_complete');
  const voteLogs = logs.filter(l => l.action_type === 'node_vote');
  
  const groupedVoteLogs = (() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const groups: {id: string; userName: string; endTime: number; startTime: number; logs: any[]}[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let currentGroup: {id: string; userName: string; endTime: number; startTime: number; logs: any[]} | null = null;
    voteLogs.forEach(log => {
      const time = new Date(log.created_at).getTime();
      const uName = log.details.userName || (log.device_id ? log.device_id.slice(0,8) : null) || '匿名訪客';
      if (!currentGroup) {
        currentGroup = { id: log.id, userName: uName as string, endTime: time, startTime: time, logs: [log] };
      } else {
        if (currentGroup.userName === uName && (currentGroup.startTime - time) < 30 * 60 * 1000) {
          currentGroup.logs.push(log);
          currentGroup.startTime = time;
        } else {
          groups.push(currentGroup);
          currentGroup = { id: log.id, userName: uName as string, endTime: time, startTime: time, logs: [log] };
        }
      }
    });
    if (currentGroup) groups.push(currentGroup);
    return groups;
  })();
  
  // 去重：每個 device 對每個 node 只計一次
  const uniqueVoteSet = new Set(voteLogs.map(l => `${l.device_id}_${l.details.node_id}`));
  const uniqueVoteCount = uniqueVoteSet.size;
  // 今日互動（去重）
  const todayStr = new Date().toDateString();
  const uniqueTodaySet = new Set(
    logs.filter(l => new Date(l.created_at).toDateString() === todayStr)
      .map(l => `${l.action_type}_${l.device_id}_${l.details.node_id || l.details.userName || ''}`)
  );
  const todayCount = uniqueTodaySet.size;
  // 測驗去重（每個 device 最多計一次）
  const uniqueQuizSet = new Set(quizLogs.map(l => l.device_id));
  const uniqueQuizCount = uniqueQuizSet.size;

  // ===== 投票彙整（去重）=====
  const voteStats = (() => {
    const nc: Record<string, { label: string, total: number, likes: number, neutral: number, dislikes: number }> = {};
    const seen = new Map<string, unknown>();
    voteLogs.forEach(l => {
      const key = `${l.device_id}_${l.details.node_id}`;
      if (seen.has(key)) return;
      seen.set(key, l);
      const nodeId = l.details.node_id as string;
      const nodeLabel = (l.details.node_label as string) || nodeNameMap[nodeId] || nodeId || '?';
      if (!nc[nodeId]) nc[nodeId] = { label: nodeLabel, total: 0, likes: 0, neutral: 0, dislikes: 0 };
      nc[nodeId].total++;
      if (l.details.vote_type === 'like' || l.details.vote_type === 'need') nc[nodeId].likes++;
      else if (l.details.vote_type === 'nope') nc[nodeId].dislikes++;
      else nc[nodeId].neutral++;
    });
    return nc;
  })();

  const allEntries = Object.values(voteStats).sort((a, b) => b.total - a.total);
  const top3count = Math.ceil(allEntries.length / 3);
  const top3entries = allEntries.slice(0, Math.max(top3count, 3));
  const mostLiked = [...top3entries].sort((a, b) => (b.likes / Math.max(b.total,1)) - (a.likes / Math.max(a.total,1))).slice(0, 10);
  const mostDisliked = [...top3entries].sort((a, b) => (b.dislikes / Math.max(b.total,1)) - (a.dislikes / Math.max(a.total,1))).slice(0, 10);

  // ===== 節點清單（樹狀結構）=====
  const treeNodes = (() => {
    const ids = Object.keys(voteStats);
    const result: { id: string; depth: number; hasChildren: boolean; parentId: string | null }[] = [];
    const visited = new Set<string>();

    const dfs = (id: string, depth: number, effectiveParentId: string | null) => {
      if (visited.has(id)) return;
      visited.add(id);
      const children = ids.filter(childId => nodeParentMap[childId] === id);
      result.push({ id, depth, hasChildren: children.length > 0, parentId: effectiveParentId });
      children.forEach(c => dfs(c, depth + 1, id));
    };

    ids.filter(id => !nodeParentMap[id] || !ids.includes(nodeParentMap[id])).forEach(r => dfs(r, 0, null));
    return result;
  })();

  // ===== 動態直方圖節點選項 =====
  // 顯示所有節點的樹狀清單
  const dynamicOptions = treeNodes;

  // ===== MD 匯出（節點清單）=====
  const exportNodeListMd = () => {
    let md = '# KinkFlow 節點喜好度清單\n\n';
    md += `匯出時間：${new Date().toLocaleString('zh-TW')}\n\n`;
    md += '| 節點名稱 | 層級 | 💚 喜愛 | 💛 普通 | ❤️ 排斥 | 總票數 |\n';
    md += '|---|---|---|---|---|---|\n';
    treeNodes.forEach(({ id, depth }) => {
      const item = voteStats[id];
      const level = nodeLevelMap[id] ?? '-';
      const likePct = Math.round((item.likes / Math.max(item.total, 1)) * 100);
      const neutPct = Math.round((item.neutral / Math.max(item.total, 1)) * 100);
      const nopePct = Math.round((item.dislikes / Math.max(item.total, 1)) * 100);
      const prefix = depth > 0 ? '　'.repeat(depth) + '└ ' : '';
      md += `| ${prefix}${item.label} | Lv.${level} | ${likePct}% | ${neutPct}% | ${nopePct}% | ${item.total} |\n`;
    });
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `KinkFlow_節點清單_${new Date().toISOString().split('T')[0]}.md`;
    a.click();
  };

  // ===== MD 匯出（留言紀錄）=====
  const handleExportMarkdown = () => {
    let md = '# KinkFlow 留言板統整紀錄\n\n';
    md += `匯出時間：${new Date().toLocaleString('zh-TW')}\n\n`;
    for (const [nodeId, posts] of Object.entries(discussions)) {
      if (!posts || posts.length === 0) continue;
      const nodeTitle = nodeNameMap[nodeId] || (nodeId === 'lobby_chat' ? '大廳即時聊天' : (nodeId === 'lobby_board' ? '大廳精華留言板' : nodeId));
      md += `## 📍 節點：${nodeTitle}\n\n`;
      posts.forEach(p => {
        md += `### 👤 ${p.author} (👍 ${p.upvotes} | 🕒 ${new Date(p.timestamp).toLocaleString('zh-TW')})\n`;
        md += `> ${p.text.replace(/\n/g, '\n> ')}\n\n`;
        if (p.replies?.length > 0) { p.replies.forEach((r: {author: string; text: string}) => { md += `- **${r.author}**: ${r.text}\n`; }); md += '\n'; }
      });
      md += '---\n\n';
    }
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.setAttribute('download', `KinkFlow_留言紀錄_${new Date().toISOString().split('T')[0]}.md`);
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const tabBtn = (id: typeof activeTab, label: string) => (
    <button onClick={() => setActiveTab(id)}
      className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all ${activeTab === id ? 'bg-[#4A4238] text-white border-[#4A4238] shadow-md' : 'bg-white/60 text-[#4A4238] border-[#D1C6B4]/40 hover:border-[#4A4238]/40'}`}>
      {label}
    </button>
  );

  if (!isAuth) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center p-6" style={{ background: '#FDFBF7', color: '#4A4238' }}>
        <div className="bg-white p-10 rounded-3xl shadow-xl border border-[#D1C6B4]/30 max-w-md w-full text-center">
          <h1 className="text-3xl font-bold mb-2">後台管理登入</h1>
          <p className="text-[#4A4238]/60 text-sm mb-8">請使用具備管理員權限的帳號登入</p>
          <button onClick={() => setAuthModalOpen(true)} className="w-full py-3 bg-[#4A4238] text-white font-bold rounded-xl hover:bg-[#4A4238]/80 transition-all shadow-md">
            會員登入
          </button>
          {authError && <p className="text-[#E08A8A] text-sm mt-4 font-bold">{authError}</p>}
        </div>
        {authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} defaultMode="login" />}
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans" style={{ background: '#FDFBF7', color: '#4A4238' }}>
      <div className="sticky top-0 z-20 border-b border-[#D1C6B4]/30 bg-[#FDFBF7]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">⚙️ KinkFlow 管理後台</h1>
            <p className="text-xs text-[#4A4238]/50 mt-0.5 flex items-center gap-2">
              內容管理 · 數據分析 · 用戶紀錄
              <span className="bg-[#C5D4B6]/30 text-[#4A7238] px-2 py-0.5 rounded-full text-[10px] font-bold">Level {adminLevel}</span>
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <button onClick={handleLogout} className="px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg font-bold border border-transparent hover:border-red-100 transition-colors mr-2">登出</button>
            {tabBtn('analytics', '📊 統計數據中心')}
            {tabBtn('cms_nodes', '📝 節點內容編輯')}
            {tabBtn('cms_quiz', '📝 測驗系統編輯')}
            {tabBtn('users', '👥 會員管理')}
            {tabBtn('discussions', '💬 討論區與留言管理')}
            {adminLevel === 1 && tabBtn('admins', '🔑 管理員設定')}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {message && (
          <div className={`mb-6 p-4 rounded-xl text-center text-sm font-medium border ${message.startsWith('✅') ? 'bg-[#C5D4B6]/20 border-[#C5D4B6]' : 'bg-[#E8C5C8]/20 border-[#E8C5C8]'}`}>{message}</div>
        )}

        {activeTab === 'analytics' && (
          <AnalyticsDashboardPanel />
        )}



        {/* ===== CMS Nodes (Visual Editor) ===== */}
        {activeTab === 'cms_nodes' && (loading ? <div className="text-center py-20 text-[#4A4238]/40">讀取資料中...</div> : (
          <NodeContentEditor 
            mindmapJson={mindmapJson} 
            setMindmapJson={setMindmapJson} 
            onSave={handleSave} 
            saving={saving} 
            nodeImages={nodeImages}
            setNodeImages={setNodeImages}
            uploadingState={uploadingState}
            handleFileUpload={handleFileUpload}
          />
        ))}

        {/* ===== CMS Quiz (Quiz Visual Editor) ===== */}
        {activeTab === 'cms_quiz' && (loading ? <div className="text-center py-20 text-[#4A4238]/40">讀取資料中...</div> : (
          <QuizContentEditor 
            quizJson={quizJson}
            setQuizJson={setQuizJson}
            onSave={handleSave}
            saving={saving}
          />
        ))}

        {/* ===== 討論區與留言管理 ===== */}
        {activeTab === 'discussions' && (
          <DiscussionManagementPanel />
        )}

        {/* ===== 會員管理 ===== */}
        {activeTab === 'users' && (
          <MemberManagementPanel />
        )}

        {/* ===== 管理員設定 (僅 Level 1) ===== */}
        {activeTab === 'admins' && adminLevel === 1 && (
          <div className="bg-white/70 rounded-2xl border border-[#D1C6B4]/30 shadow-sm p-6 max-w-4xl mx-auto">
            <h2 className="text-xl font-bold mb-2">🔑 管理員權限設定 (RBAC)</h2>
            <p className="text-sm text-[#4A4238]/60 mb-6">新增或移除管理員，並設定其權限等級。Level 1 擁有最高權限，Level 2 負責內容編輯，Level 3 僅能觀看無法儲存。</p>
            
            <form onSubmit={handleAddAdmin} className="flex flex-col sm:flex-row gap-4 items-end mb-8 bg-[#FDFBF7] p-4 rounded-xl border border-[#D1C6B4]/30">
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold mb-1">User ID（UUID）</label>
                <input type="text" required value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} placeholder="新管理員 User ID（UUID）" className="w-full px-4 py-2.5 rounded-xl border border-[#D1C6B4]/50 focus:border-[#C5D4B6] focus:ring-1 focus:ring-[#C5D4B6] outline-none text-sm bg-white" />
              </div>
              <div className="w-full sm:w-32 shrink-0">
                <label className="block text-xs font-bold mb-1">權限等級</label>
                <select value={newAdminLevel} onChange={e => setNewAdminLevel(Number(e.target.value))} className="w-full px-4 py-2.5 rounded-xl border border-[#D1C6B4]/50 focus:border-[#C5D4B6] focus:ring-1 focus:ring-[#C5D4B6] outline-none text-sm bg-white">
                  <option value={1}>Level 1 (最高)</option>
                  <option value={2}>Level 2 (編輯)</option>
                  <option value={3}>Level 3 (觀看)</option>
                </select>
              </div>
              <button type="submit" disabled={adminLoading} className="w-full sm:w-auto px-6 py-2.5 bg-[#4A4238] text-white font-bold rounded-xl hover:bg-[#4A4238]/80 transition-colors disabled:opacity-50">
                {adminLoading ? '處理中...' : '+ 新增/更新'}
              </button>
            </form>

            {adminLoading && adminUsers.length === 0 ? (
              <div className="text-center py-10 text-[#4A4238]/40">讀取中...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#D1C6B4]/30">
                      <th className="pb-3 text-sm font-bold text-[#4A4238]/70">管理員 Email</th>
                      <th className="pb-3 text-sm font-bold text-[#4A4238]/70">等級</th>
                      <th className="pb-3 text-sm font-bold text-[#4A4238]/70">加入時間</th>
                      <th className="pb-3 text-sm font-bold text-[#4A4238]/70 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D1C6B4]/10">
                    {adminUsers.map(user => (
                      <tr key={user.user_id} className="hover:bg-[#FDFBF7]">
                        <td className="py-3 text-sm font-medium">{user.user_id} {user.user_id === adminEmail && <span className="text-[10px] bg-[#E8C5C8]/30 px-2 py-0.5 rounded-full ml-2">You</span>}</td>
                        <td className="py-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${user.role_level === 1 ? 'bg-[#E8C5C8]/30 text-[#E08A8A]' : user.role_level === 2 ? 'bg-[#C5D4B6]/30 text-[#4A7238]' : 'bg-[#B6C4D4]/30 text-[#4A4238]'}`}>
                            Level {user.role_level}
                          </span>
                        </td>
                        <td className="py-3 text-xs text-[#4A4238]/50">{new Date(user.created_at).toLocaleString('zh-TW')}</td>
                        <td className="py-3 text-right">
                          {user.user_id !== adminEmail && (
                            <button onClick={() => handleRemoveAdmin(user.user_id)} disabled={adminLoading} className="text-xs text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-xl transition-colors border border-red-100 disabled:opacity-50">
                              移除權限
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      {/* Style & Layout Config Center Modal */}
      {showStyleConfigModal && (
        <StyleConfigModal
          userName="管理員"
          onClose={() => setShowStyleConfigModal(false)}
        />
      )}
      </div>
    </div>
  );
}
