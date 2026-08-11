"use client";

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { AXES_INFO, TRAITS_DB } from '@/lib/quizData';

// 軸心中文與色彩映射
const AXES_COLOR_MAP: Record<string, { name: string; color: string }> = {
  'dom_sub': { name: '支配 / 服從 (Dom & Sub)', color: '#D9B650' },
  'rigger_tied': { name: '繩縛 / 被縛 (Rigger & Tied)', color: '#C5D4B6' },
  'sadist_maso': { name: '施痛 / 承受 (Sadist & Maso)', color: '#E08A8A' },
  'roleplay': { name: '角色 / 身份演繹', color: '#B6C4D4' },
  'mind_control': { name: '心智 / 控制與催眠', color: '#9B8265' },
  'sensory': { name: '感官 / 剝奪與剝離', color: '#7F1D1D' },
  'pet': { name: '寵物 / 馴養關係', color: '#E8C5C8' },
  'humiliation': { name: '羞辱 / 精神標記', color: '#0F766E' },
  'fetish': { name: '戀物 / 道具癖好', color: '#1E3A8A' },
  'aftercare': { name: '撫慰 / 餘溫關懷', color: '#4A4238' }
};

// 五大核心屬性配色
const FIVE_CATS = [
  { key: 'Dom', name: 'Dom 支配系', color: '#D9B650', keys: ['dom', 'rigger', 'sadist', 'master', 'top'] },
  { key: 'Sub', name: 'Sub 服從系', color: '#E8C5C8', keys: ['sub', 'tied', 'maso', 'slave', 'bottom', 'prey'] },
  { key: 'Sadist', name: 'Sadist 施痛系', color: '#E08A8A', keys: ['sadist', 'tormentor'] },
  { key: 'Maso', name: 'Maso 承受系', color: '#C5D4B6', keys: ['maso', 'prey'] },
  { key: 'Switch', name: 'Switch 雙向與多元', color: '#B6C4D4', keys: ['switch', 'versatile', 'curious'] }
];

export default function AnalyticsDashboardPanel() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [quizResults, setQuizResults] = useState<any[]>([]);
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [nodeStatsContent, setNodeStatsContent] = useState<Record<string, any>>({});
  const [mindmapNodes, setMindmapNodes] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  // 區塊收合狀態
  const [openSectionQuiz, setOpenSectionQuiz] = useState(true);
  const [openSectionVote, setOpenSectionVote] = useState(true);
  const [openSectionFeedback, setOpenSectionFeedback] = useState(true);
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Record<string, boolean>>({});

  // 網站活動時段選單狀態 (今日 / 本周 / 歷史總計)
  const [activityTimeframe, setActivityTimeframe] = useState<'today' | 'week' | 'all'>('today');

  // 圖表分頁模式 (4種切換)
  const [chartTab, setChartTab] = useState<'five_cats' | 'top_10' | 'bottom_10' | 'axes_10'>('five_cats');

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    setRefreshing(true);
    try {
      const { data: logData } = await supabase.from('visitor_logs').select('*').order('created_at', { ascending: false });
      if (logData) setLogs(logData);

      const finalQuizResults = (logData || [])
        .filter((l: any) => l.action_type === 'quiz_ai_analysis' || l.action_type === 'quiz_result')
        .map((l: any) => ({
          id: l.id,
          user_name: l.details?.userName || '訪客',
          scores: l.details?.scores || {},
          top_traits: [l.details?.top_trait || 'dom'],
          created_at: l.created_at
        }));
      setQuizResults(finalQuizResults);

      const { data: contentData } = await supabase.from('quiz_content').select('*');
      const nStatsObj: Record<string, any> = {};

      (contentData || []).forEach((item: any) => {
        if (item.key_name === 'quiz_node_stats' || item.key_name === 'node_stats') {
          Object.assign(nStatsObj, item.content || {});
        }
        if (item.key_name === 'mindmap_data' && Array.isArray(item.content)) {
          setMindmapNodes(item.content);
        }
      });
      setNodeStatsContent(nStatsObj);

      const { data: discData } = await supabase.from('discussions').select('*').order('timestamp', { ascending: false });
      if (discData) setDiscussions(discData);

      const logFeedbacks = (logData || [])
        .filter((l: any) => (l.action_type === 'author_message' || l.action_type === 'feedback') && (l.details?.message || l.details?.content))
        .map((l: any) => ({
          id: l.id,
          author: l.details?.userName || l.details?.author || '匿名訪客',
          content: l.details.message || l.details.content,
          created_at: l.created_at
        }));

      const discFeedbacks = (discData || [])
        .filter((d: any) => d.node_id === 'author_feedback' || d.node_id === 'author_message' || d.text?.startsWith('【給作者的話】'))
        .map((d: any) => ({
          id: d.id,
          author: d.author || '匿名訪客',
          content: d.text.replace('【給作者的話】', ''),
          created_at: new Date(d.timestamp).toISOString()
        }));

      const fbData: any[] = [];
      const combinedFeedbacks = [...fbData, ...logFeedbacks, ...discFeedbacks].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      const uniqueFeedbacks: any[] = [];
      const seenContent = new Set<string>();
      
      // 建立時間戳記到特質/訪客名稱的快捷對照字典
      const timeToUserMap: Record<number, string> = {};
      (logData || []).forEach((l: any) => {
        const uName = l.details?.userName || l.details?.author || l.user_name;
        if (uName && uName !== '匿名訪客') {
          const t = new Date(l.created_at).getTime();
          timeToUserMap[t] = uName;
        }
      });

      combinedFeedbacks.forEach(item => {
        const textKey = (item.content || '').trim();
        if (textKey && !seenContent.has(textKey)) {
          seenContent.add(textKey);

          // 智慧解析真實姓名：過慮掉 '匿名訪客'、'匿名'、'null'、'undefined'
          let resolvedName = [item.author, item.user_name, item.userName, item.details?.userName]
            .find(n => n && n !== '匿名訪客' && n !== '匿名' && n !== 'null' && n !== 'undefined');

          // 若為匿名，嘗試依據時間前後 5 分鐘進行歷史 log 匹配
          if (!resolvedName) {
            const itemTime = new Date(item.created_at).getTime();
            const matchedTime = Object.keys(timeToUserMap).find(t => Math.abs(Number(t) - itemTime) < 5 * 60 * 1000);
            if (matchedTime) {
              resolvedName = timeToUserMap[Number(matchedTime)];
            }
          }

          uniqueFeedbacks.push({
            ...item,
            authorName: resolvedName || '匿名訪客'
          });
        }
      });

      setFeedbackList(uniqueFeedbacks);
    } catch (e) {
      console.error("Fetch analytics failed:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ===== 1. 測驗數據：4 種圖表數據計算 =====
  const { fiveCategoriesData, top10Popular, bottom10Unpopular, tenAxesData } = useMemo(() => {
    const traitScores: Record<string, number> = {};
    const axisScores: Record<string, number> = {};
    let totalSum = 0;

    quizResults.forEach(r => {
      if (r.scores && typeof r.scores === 'object') {
        Object.entries(r.scores).forEach(([tId, score]) => {
          const val = Number(score) || 0;
          if (val > 0) {
            traitScores[tId] = (traitScores[tId] || 0) + val;
            totalSum += val;

            const traitMeta = TRAITS_DB[tId] || {};
            const axisId = traitMeta.axis || tId.split('_')[0] || 'other';
            axisScores[axisId] = (axisScores[axisId] || 0) + val;
          }
        });
      }
    });

    const fiveCatValues: Record<string, number> = { Dom: 0, Sub: 0, Sadist: 0, Maso: 0, Switch: 0 };
    Object.entries(traitScores).forEach(([tId, sum]) => {
      let matched = false;
      FIVE_CATS.forEach(c => {
        if (c.keys.some(k => tId.toLowerCase().includes(k))) {
          fiveCatValues[c.key] += sum;
          matched = true;
        }
      });
      if (!matched) fiveCatValues['Switch'] += sum;
    });

    const fiveCatChart = FIVE_CATS.map(c => ({
      name: c.name,
      value: fiveCatValues[c.key],
      percentage: totalSum > 0 ? Number(((fiveCatValues[c.key] / totalSum) * 100).toFixed(1)) : 0,
      color: c.color
    }));

    const traitList = Object.entries(traitScores).map(([id, sum]) => {
      const meta = TRAITS_DB[id] || {};
      const axisMeta = AXES_COLOR_MAP[meta.axis || ''] || { name: id, color: '#D9B650' };
      return {
        id,
        name: meta.name || id,
        scoreSum: sum,
        percentage: totalSum > 0 ? Number(((sum / totalSum) * 100).toFixed(1)) : 0,
        color: axisMeta.color,
        icon: meta.icon || '✨'
      };
    }).sort((a, b) => b.scoreSum - a.scoreSum);

    const top10 = traitList.slice(0, 10);
    const bottom10 = [...traitList].reverse().slice(0, 10);

    const axesChart = (AXES_INFO || []).map(a => {
      const val = axisScores[a.id] || 0;
      const meta = AXES_COLOR_MAP[a.id] || { name: a.name, color: a.color || '#D9B650' };
      return {
        id: a.id,
        name: a.name,
        scoreSum: val,
        percentage: totalSum > 0 ? Number(((val / totalSum) * 100).toFixed(1)) : 0,
        color: meta.color
      };
    }).sort((a, b) => b.scoreSum - a.scoreSum);

    return {
      fiveCategoriesData: fiveCatChart,
      top10Popular: top10,
      bottom10Unpopular: bottom10,
      tenAxesData: axesChart
    };
  }, [quizResults]);

  // ===== 2. 投票統計：樹狀結構 + DFS 排序 =====
  const treeVoteData = useMemo(() => {
    const rawMap: Record<string, { need: number; like: number; curious: number; neutral: number; nope: number }> = {};
    
    Object.entries(nodeStatsContent).forEach(([nId, s]: [string, any]) => {
      rawMap[nId] = {
        need: Number(s?.need) || 0,
        like: Number(s?.like) || 0,
        curious: Number(s?.curious) || 0,
        neutral: Number(s?.neutral) || 0,
        nope: Number(s?.nope) || 0
      };
    });

    const seenLog = new Set<string>();
    logs.forEach(l => {
      if ((l.action_type === 'vote' || l.action_type === 'node_vote') && l.details?.node_id) {
        const uKey = `${l.device_id || l.details?.userName || 'guest'}_${l.details.node_id}`;
        if (seenLog.has(uKey)) return;
        seenLog.add(uKey);

        const nId = l.details.node_id;
        const vType = l.details.vote_type || 'like';
        if (!rawMap[nId]) rawMap[nId] = { need: 0, like: 0, curious: 0, neutral: 0, nope: 0 };
        if (vType === 'need') rawMap[nId].need += 1;
        else if (vType === 'like') rawMap[nId].like += 1;
        else if (vType === 'curious') rawMap[nId].curious += 1;
        else if (vType === 'nope') rawMap[nId].nope += 1;
        else rawMap[nId].neutral += 1;
      }
    });

    const nodesList = mindmapNodes.length > 0 ? mindmapNodes : [
      { id: 'bdsm', label: 'BDSM 大廳', parent: null, level: 0 },
      { id: 'bondage', label: '繩縛與束縛', parent: 'bdsm', level: 1 },
      { id: 'spanking', label: '打屁股與體罰', parent: 'bdsm', level: 1 },
      { id: 'domination', label: '支配與服從', parent: 'bdsm', level: 1 }
    ];

    const dfsResult: any[] = [];
    const childrenMap: Record<string, any[]> = {};
    const rootNodes: any[] = [];

    nodesList.forEach(n => {
      if (!n.parent) {
        rootNodes.push(n);
      } else {
        if (!childrenMap[n.parent]) childrenMap[n.parent] = [];
        childrenMap[n.parent].push(n);
      }
    });

    const traverse = (node: any, currentLevel: number) => {
      const s = rawMap[node.id] || { need: 0, like: 0, curious: 0, neutral: 0, nope: 0 };
      const likeCount = s.need + s.like;
      const neutralCount = s.curious + s.neutral;
      const nopeCount = s.nope;
      const total = likeCount + neutralCount + nopeCount;

      dfsResult.push({
        id: node.id,
        label: node.label || node.id,
        parent: node.parent,
        level: currentLevel,
        likeCount,
        neutralCount,
        nopeCount,
        total,
        likePct: total > 0 ? Math.round((likeCount / total) * 100) : 0,
        neutralPct: total > 0 ? Math.round((neutralCount / total) * 100) : 0,
        nopePct: total > 0 ? Math.round((nopeCount / total) * 100) : 0
      });

      const children = childrenMap[node.id] || [];
      children.forEach(child => traverse(child, currentLevel + 1));
    };

    rootNodes.forEach(r => traverse(r, 0));

    const visitedIds = new Set(dfsResult.map(d => d.id));
    nodesList.forEach(n => {
      if (!visitedIds.has(n.id)) {
        traverse(n, 1);
      }
    });

    return dfsResult;
  }, [nodeStatsContent, logs, mindmapNodes]);

  // ===== 3. 計算「今日 / 本周 / 歷史總計」活動數據 =====
  const filteredActivityStats = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek).getTime();

    const isTargetTime = (dateStrOrMs: any) => {
      if (!dateStrOrMs) return false;
      const t = typeof dateStrOrMs === 'number' ? dateStrOrMs : new Date(dateStrOrMs).getTime();
      if (activityTimeframe === 'today') return t >= startOfToday;
      if (activityTimeframe === 'week') return t >= startOfWeek;
      return true;
    };

    const visitorSet = new Set<string>();
    logs.filter(l => isTargetTime(l.created_at)).forEach(l => {
      const uId = l.details?.userName || l.device_id || l.user_id;
      if (uId) visitorSet.add(uId);
    });

    const commentCount = discussions.filter(d => isTargetTime(d.timestamp)).length;
    const voteCount = logs.filter(l => isTargetTime(l.created_at) && (l.action_type === 'vote' || l.action_type === 'node_vote')).length;
    const quizCount = quizResults.filter(q => isTargetTime(q.created_at)).length;

    return {
      visitors: visitorSet.size || (activityTimeframe === 'all' ? 1 : 0),
      comments: commentCount,
      votes: voteCount,
      quizzes: quizCount
    };
  }, [logs, discussions, quizResults, activityTimeframe]);

  // ===== 匯出工具函式 =====
  const downloadTextFile = (filename: string, text: string) => {
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  };

  const exportQuizMd = () => {
    let md = `# 測驗大數據統計報告\n\n`;
    md += `匯出時間：${new Date().toLocaleString('zh-TW')}\n`;
    md += `累積測驗總人數：${quizResults.length} 人次\n\n`;
    md += `## 🔥 熱門特質 TOP 10\n`;
    top10Popular.forEach((t, i) => md += `| #${i+1} | ${t.name} | ${t.percentage}% |\n`);
    downloadTextFile(`KinkFlow_測驗數據_${Date.now()}.md`, md);
  };

  const exportVoteMd = () => {
    let md = `# 節點喜好度投票統計報告\n\n`;
    md += `| 節點名稱 | 🟢 喜好 | 🟡 普通 | 🔴 排斥 | 總投票數 |\n|---|---|---|---|---|\n`;
    treeVoteData.forEach(v => {
      const indent = '　'.repeat(v.level) + (v.level > 0 ? '└ ' : '');
      md += `| ${indent}${v.label} | ${v.likePct}% (${v.likeCount}) | ${v.neutralPct}% (${v.neutralCount}) | ${v.nopePct}% (${v.nopeCount}) | ${v.total} |\n`;
    });
    downloadTextFile(`KinkFlow_投票數據_${Date.now()}.md`, md);
  };

  const exportFeedbackMd = () => {
    let md = `# 作者回饋訊息總覽\n\n`;
    feedbackList.forEach(fb => {
      md += `### 👤 來自：${fb.authorName} (${new Date(fb.created_at).toLocaleString('zh-TW')})\n> ${fb.content}\n\n`;
    });
    downloadTextFile(`KinkFlow_作者回饋_${Date.now()}.md`, md);
  };

  return (
    <div className="space-y-8 animate-fade-in text-[#4A4238]">
      {/* 頂部 Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-[#D1C6B4]/30 shadow-sm">
        <div>
          <h2 className="text-2xl font-black">📊 統計數據中心</h2>
          <p className="text-xs text-[#4A4238]/60 mt-1">即時整合 Supabase 測驗、節點喜好度與作者意見回饋</p>
        </div>

        <button
          onClick={fetchAnalyticsData}
          disabled={refreshing}
          className="px-4 py-2.5 bg-[#F5EFE6] hover:bg-[#E8C5C8]/30 text-[#4A4238] font-bold rounded-xl text-xs transition-all border border-[#D1C6B4]/40 flex items-center gap-1.5"
        >
          <span className={refreshing ? 'animate-spin' : ''}>🔄</span> {refreshing ? '刷新中...' : '重新整理全站數據'}
        </button>
      </div>

      {/* 📅 網站活躍趨勢監控 (今日 / 本周 / 歷史總計) */}
      <div className="bg-white p-6 rounded-2xl border border-[#D1C6B4]/30 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#D1C6B4]/20 pb-3">
          <div>
            <h3 className="text-base font-black flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#4A7238]"></span>
              📅 網站活躍趨勢監控
            </h3>
            <p className="text-xs text-[#4A4238]/50 mt-0.5">可切換檢視「今日」、「本周」或「歷史總計」活動數據</p>
          </div>

          <div className="flex bg-[#F5EFE6] p-1 rounded-xl shrink-0">
            <button
              onClick={() => setActivityTimeframe('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activityTimeframe === 'today' ? 'bg-[#4A7238] text-white shadow-sm' : 'text-[#4A4238]/60'}`}
            >
              📅 今日 (Today)
            </button>
            <button
              onClick={() => setActivityTimeframe('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activityTimeframe === 'week' ? 'bg-[#4A7238] text-white shadow-sm' : 'text-[#4A4238]/60'}`}
            >
              🗓️ 本周 (This Week)
            </button>
            <button
              onClick={() => setActivityTimeframe('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activityTimeframe === 'all' ? 'bg-[#4A7238] text-white shadow-sm' : 'text-[#4A4238]/60'}`}
            >
              ♾️ 歷史總計 (All Time)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#FDFBF7] p-4 rounded-xl border border-[#D1C6B4]/30">
            <span className="text-xs font-bold text-[#4A4238]/60 block mb-1">👥 訪客人數</span>
            <div className="text-2xl font-black font-mono text-[#D9B650]">{filteredActivityStats.visitors} <span className="text-xs font-normal text-[#4A4238]/50">人</span></div>
          </div>
          <div className="bg-[#FDFBF7] p-4 rounded-xl border border-[#D1C6B4]/30">
            <span className="text-xs font-bold text-[#4A4238]/60 block mb-1">💬 留言互動次數</span>
            <div className="text-2xl font-black font-mono text-[#E8C5C8]">{filteredActivityStats.comments} <span className="text-xs font-normal text-[#4A4238]/50">次</span></div>
          </div>
          <div className="bg-[#FDFBF7] p-4 rounded-xl border border-[#D1C6B4]/30">
            <span className="text-xs font-bold text-[#4A4238]/60 block mb-1">🗳️ 喜好投票次數</span>
            <div className="text-2xl font-black font-mono text-[#4A7238]">{filteredActivityStats.votes} <span className="text-xs font-normal text-[#4A4238]/50">次</span></div>
          </div>
          <div className="bg-[#FDFBF7] p-4 rounded-xl border border-[#D1C6B4]/30">
            <span className="text-xs font-bold text-[#4A4238]/60 block mb-1">📝 完成測驗次數</span>
            <div className="text-2xl font-black font-mono text-[#B6C4D4]">{filteredActivityStats.quizzes} <span className="text-xs font-normal text-[#4A4238]/50">次</span></div>
          </div>
        </div>
      </div>

      {/* 視窗一：📊 測驗大數據視覺化 (4 種圖表切換 + 收合 + 獨立匯出) */}
      <div className="bg-white rounded-2xl border border-[#D1C6B4]/30 shadow-sm overflow-hidden">
        <div 
          onClick={() => setOpenSectionQuiz(!openSectionQuiz)}
          className="p-6 bg-[#FDFBF7] border-b border-[#D1C6B4]/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer hover:bg-[#F5EFE6]/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">{openSectionQuiz ? '▼' : '▶'}</span>
            <div>
              <h3 className="text-lg font-black flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D9B650]"></span>
                📊 測驗大數據分析 (累積 {quizResults.length} 人次)
              </h3>
              <p className="text-xs text-[#4A4238]/50 mt-0.5">點擊標題可展開/收合此視窗</p>
            </div>
          </div>

          <div className="flex gap-2 print:hidden" onClick={e => e.stopPropagation()}>
            <button onClick={exportQuizMd} className="px-3 py-1.5 bg-[#D9B650] text-white text-xs font-bold rounded-lg shadow-sm hover:bg-[#c5a342]">
              📥 匯出 MD
            </button>
            <button onClick={() => window.print()} className="px-3 py-1.5 bg-[#4A4238] text-white text-xs font-bold rounded-lg shadow-sm hover:bg-[#38322a]">
              📄 匯出 PDF
            </button>
          </div>
        </div>

        {openSectionQuiz && (
          <div className="p-6 space-y-6">
            <div className="flex bg-[#F5EFE6] p-1.5 rounded-xl gap-1 flex-wrap">
              <button
                onClick={() => setChartTab('five_cats')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${chartTab === 'five_cats' ? 'bg-[#4A4238] text-white shadow-sm' : 'text-[#4A4238]/60 hover:bg-white/50'}`}
              >
                📊 S / M / Dom / Sub 五大屬性
              </button>
              <button
                onClick={() => setChartTab('top_10')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${chartTab === 'top_10' ? 'bg-[#D9B650] text-white shadow-sm' : 'text-[#4A4238]/60 hover:bg-white/50'}`}
              >
                🔥 熱門特質 TOP 10
              </button>
              <button
                onClick={() => setChartTab('bottom_10')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${chartTab === 'bottom_10' ? 'bg-[#E8C5C8] text-[#4A4238] shadow-sm' : 'text-[#4A4238]/60 hover:bg-white/50'}`}
              >
                ❄️ 潛在特質 BOTTOM 10
              </button>
              <button
                onClick={() => setChartTab('axes_10')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${chartTab === 'axes_10' ? 'bg-[#C5D4B6] text-[#4A7238] shadow-sm' : 'text-[#4A4238]/60 hover:bg-white/50'}`}
              >
                🌌 10 大心力軸向排行 (雷達趨勢)
              </button>
            </div>

            {chartTab === 'five_cats' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={fiveCategoriesData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45} paddingAngle={4} label={({ name, percentage }: any) => `${name} ${percentage}%`}>
                        {fiveCategoriesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: any) => [`${val} 分`, '得分總和']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {fiveCategoriesData.map(c => (
                    <div key={c.name} className="bg-[#FDFBF7] p-4 rounded-xl border border-[#D1C6B4]/30 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: c.color }}></span>
                        <span className="font-bold text-sm">{c.name}</span>
                      </div>
                      <span className="font-mono font-bold text-sm">{c.percentage}% ({c.value}分)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {chartTab === 'top_10' && (
              <div className="space-y-4">
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={top10Popular}>
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#4A4238' }} />
                      <YAxis unit="%" tick={{ fontSize: 12, fill: '#4A4238' }} />
                      <Tooltip formatter={(val: any) => [`${val}%`, '得分佔比']} />
                      <Bar dataKey="percentage" radius={[6, 6, 0, 0]}>
                        {top10Popular.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {top10Popular.map((t, idx) => (
                    <div key={t.id} className="bg-[#FDFBF7] p-3 rounded-xl border border-[#D1C6B4]/30 text-center" style={{ borderTop: `4px solid ${t.color}` }}>
                      <span className="text-xs font-mono font-bold text-[#D9B650]">TOP {idx + 1}</span>
                      <div className="font-bold text-sm text-[#4A4238] mt-1 flex items-center justify-center gap-1">
                        <span>{t.icon}</span> <span>{t.name}</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-[#4A4238]/60 mt-1 block">{t.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {chartTab === 'bottom_10' && (
              <div className="space-y-4">
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bottom10Unpopular}>
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#4A4238' }} />
                      <YAxis unit="%" tick={{ fontSize: 12, fill: '#4A4238' }} />
                      <Tooltip formatter={(val: any) => [`${val}%`, '得分佔比']} />
                      <Bar dataKey="percentage" radius={[6, 6, 0, 0]}>
                        {bottom10Unpopular.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {bottom10Unpopular.map((t, idx) => (
                    <div key={t.id} className="bg-[#FDFBF7] p-3 rounded-xl border border-[#D1C6B4]/30 text-center" style={{ borderTop: `4px solid ${t.color}` }}>
                      <span className="text-xs font-mono font-bold text-[#E8C5C8]">潛在 #{idx + 1}</span>
                      <div className="font-bold text-sm text-[#4A4238] mt-1 flex items-center justify-center gap-1">
                        <span>{t.icon}</span> <span>{t.name}</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-[#4A4238]/60 mt-1 block">{t.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {chartTab === 'axes_10' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={tenAxesData} dataKey="scoreSum" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={35} paddingAngle={3} label={({ name, percentage }: any) => `${name} ${percentage}%`}>
                        {tenAxesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: any) => [`${val} 分`, '全站得分']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {tenAxesData.map(a => (
                    <div key={a.name} className="bg-[#FDFBF7] p-3 rounded-xl border border-[#D1C6B4]/30 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: a.color }}></span>
                        <span className="font-bold text-sm">{a.name}</span>
                      </div>
                      <span className="font-mono font-bold text-sm">{a.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 視窗二：🗳️ 各節點喜好度投票統計 (心智圖樹狀縮排 + 3色長條圖 + 收合 + 獨立匯出) */}
      <div className="bg-white rounded-2xl border border-[#D1C6B4]/30 shadow-sm overflow-hidden">
        <div 
          onClick={() => setOpenSectionVote(!openSectionVote)}
          className="p-6 bg-[#FDFBF7] border-b border-[#D1C6B4]/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer hover:bg-[#F5EFE6]/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">{openSectionVote ? '▼' : '▶'}</span>
            <div>
              <h3 className="text-lg font-black flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C5D4B6]"></span>
                🗳️ 各節點喜好度投票統計 (心智圖樹狀排列)
              </h3>
              <p className="text-xs text-[#4A4238]/50 mt-0.5">🟢 喜好 (絕對需要+喜歡) | 🟡 普通 (觀望+中立) | 🔴 排斥</p>
            </div>
          </div>

          <div className="flex gap-2 print:hidden" onClick={e => e.stopPropagation()}>
            <button onClick={exportVoteMd} className="px-3 py-1.5 bg-[#D9B650] text-white text-xs font-bold rounded-lg shadow-sm hover:bg-[#c5a342]">
              📥 匯出 MD
            </button>
            <button onClick={() => window.print()} className="px-3 py-1.5 bg-[#4A4238] text-white text-xs font-bold rounded-lg shadow-sm hover:bg-[#38322a]">
              📄 匯出 PDF
            </button>
          </div>
        </div>

        {openSectionVote && (
          <div className="p-6 space-y-3">
            {treeVoteData.map(node => {
              let isHidden = false;
              let currParent = node.parent;
              while (currParent) {
                if (collapsedNodeIds[currParent]) {
                  isHidden = true;
                  break;
                }
                const parentObj = treeVoteData.find(n => n.id === currParent);
                currParent = parentObj?.parent;
              }

              if (isHidden) return null;

              const hasChildren = treeVoteData.some(n => n.parent === node.id);
              const isCollapsed = collapsedNodeIds[node.id];
              const indentClass = node.level === 0 ? 'font-black text-base' : node.level === 1 ? 'ml-6 font-bold text-sm' : 'ml-12 text-xs font-medium';

              return (
                <div key={node.id} className={`p-4 rounded-xl border transition-all ${node.level === 0 ? 'bg-[#F5EFE6]/70 border-[#D1C6B4]/60' : 'bg-[#FDFBF7] border-[#D1C6B4]/30'}`}>
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div 
                      className={`flex items-center gap-2 ${indentClass} ${hasChildren ? 'cursor-pointer hover:text-[#D9B650] transition-colors' : ''}`}
                      onClick={() => {
                        if (hasChildren) {
                          setCollapsedNodeIds(prev => ({ ...prev, [node.id]: !prev[node.id] }));
                        }
                      }}
                    >
                      {hasChildren ? (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-[#4A4238]/10 font-mono text-[#4A4238]">
                          {isCollapsed ? '▶ 展開' : '▼ 收合'}
                        </span>
                      ) : (
                        <span>{node.level > 0 ? '└ ' : '⛩️ '}</span>
                      )}
                      <span>{node.label}</span>
                    </div>

                    <div className="flex items-center gap-4 flex-1 max-w-xl">
                      <div className="flex-1 h-3.5 bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
                        <div className="bg-[#4A7238] h-full transition-all" style={{ width: `${node.likePct}%` }} title={`喜好 ${node.likePct}%`} />
                        <div className="bg-[#D9B650] h-full transition-all" style={{ width: `${node.neutralPct}%` }} title={`普通 ${node.neutralPct}%`} />
                        <div className="bg-[#E08A8A] h-full transition-all" style={{ width: `${node.nopePct}%` }} title={`排斥 ${node.nopePct}%`} />
                      </div>

                      <div className="flex gap-2 text-xs font-mono shrink-0">
                        <span className="text-[#4A7238] font-bold">🟢 {node.likePct}%</span>
                        <span className="text-[#D9B650] font-bold">🟡 {node.neutralPct}%</span>
                        <span className="text-[#E08A8A] font-bold">🔴 {node.nopePct}%</span>
                      </div>

                      <div className="text-xs font-mono font-black text-[#4A4238] shrink-0 bg-white px-2.5 py-1 rounded-lg border border-[#D1C6B4]/30">
                        總計: {node.total} 票
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 視窗三：💌 最新給作者的回饋訊息 (收合 + 獨立匯出) */}
      <div className="bg-white rounded-2xl border border-[#D1C6B4]/30 shadow-sm overflow-hidden">
        <div 
          onClick={() => setOpenSectionFeedback(!openSectionFeedback)}
          className="p-6 bg-[#FDFBF7] border-b border-[#D1C6B4]/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer hover:bg-[#F5EFE6]/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">{openSectionFeedback ? '▼' : '▶'}</span>
            <div>
              <h3 className="text-lg font-black flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E08A8A]"></span>
                💌 最新給作者的回饋訊息 ({feedbackList.length} 則)
              </h3>
              <p className="text-xs text-[#4A4238]/50 mt-0.5">點擊標題可展開/收合此視窗</p>
            </div>
          </div>

          <div className="flex gap-2 print:hidden" onClick={e => e.stopPropagation()}>
            <button onClick={exportFeedbackMd} className="px-3 py-1.5 bg-[#D9B650] text-white text-xs font-bold rounded-lg shadow-sm hover:bg-[#c5a342]">
              📥 匯出 MD
            </button>
            <button onClick={() => window.print()} className="px-3 py-1.5 bg-[#4A4238] text-white text-xs font-bold rounded-lg shadow-sm hover:bg-[#38322a]">
              📄 匯出 PDF
            </button>
          </div>
        </div>

        {openSectionFeedback && (
          <div className="p-6 space-y-3">
            {feedbackList.length === 0 ? (
              <div className="text-center py-10 text-sm text-[#4A4238]/40 border-2 border-dashed border-[#D1C6B4]/30 rounded-xl">
                暫無給作者的回饋訊息
              </div>
            ) : (
              feedbackList.map((fb, idx) => {
                const nameStr = String(fb.authorName || '匿名訪客');
                const isCertified = nameStr.includes('☑️');
                const isGhost = nameStr.includes('👻');
                const cleanName = nameStr.replace(/ ☑️/g, '').replace(/ 👻/g, '').trim();

                return (
                  <div key={fb.id || idx} className="p-4 rounded-xl bg-[#FDFBF7] border border-[#D1C6B4]/30 hover:border-[#E8C5C8] transition-all shadow-sm">
                    <div className="flex items-center justify-between text-xs text-[#4A4238]/60 mb-2 border-b border-[#D1C6B4]/20 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-[#4A4238] text-sm">👤 來自：{cleanName}</span>
                        {isCertified && <span className="px-2 py-0.5 rounded-md bg-[#D9B650]/20 text-[#D9B650] text-[10px] font-bold">☑️ 註冊會員</span>}
                        {isGhost && <span className="px-2 py-0.5 rounded-md bg-[#4A4238]/10 text-[#4A4238]/60 text-[10px] font-bold">👻 訪客</span>}
                        {!isCertified && !isGhost && <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 text-[10px] font-bold">訪客</span>}
                      </div>
                      <span className="font-mono text-[#4A4238]/40">{new Date(fb.created_at).toLocaleString('zh-TW')}</span>
                    </div>
                    <p className="text-sm font-medium text-[#4A4238] leading-relaxed pl-1">{fb.content}</p>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
