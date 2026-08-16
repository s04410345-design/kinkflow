"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { graphNodes as defaultGraphNodes, quizQuestions as defaultQuizQuestions } from '@/lib/constants';
import {
  clearNodeDiscussions,
  clearVisitorLogs,
  deleteDiscussion,
  fetchAdminCmsData,
  fetchAdminLogs,
  saveAdminContent,
  publishNodeContent,
  publishQuizContent,
} from '@/lib/data/admin';
import type { AdminNodeImages } from '@/lib/data/admin';
import type { AdminLogEntry } from '@/lib/data/adminLogs';
import type { DiscussionPost } from '@/lib/types';

type VoteBucket = {
  label: string;
  total: number;
  likes: number;
  neutral: number;
  dislikes: number;
};

type VoteLogGroup = {
  id: string;
  userName: string;
  endTime: number;
  startTime: number;
  logs: AdminLogEntry[];
};

type TreeNode = {
  id: string;
  depth: number;
  hasChildren: boolean;
  parentId: string | null;
};

export type AdminWorkspace = {
  quizJson: string;
  setQuizJson: React.Dispatch<React.SetStateAction<string>>;
  mindmapJson: string;
  setMindmapJson: React.Dispatch<React.SetStateAction<string>>;
  sheetConfig: Record<string, unknown>;
  setSheetConfig: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  nodeImages: AdminNodeImages;
  setNodeImages: React.Dispatch<React.SetStateAction<AdminNodeImages>>;
  loading: boolean;
  saving: boolean;
  message: string;
  setMessage: React.Dispatch<React.SetStateAction<string>>;
  uploadingState: Record<string, boolean>;
  nodeNameMap: Record<string, string>;
  nodeParentMap: Record<string, string>;
  nodeLevelMap: Record<string, number>;
  discussions: Record<string, DiscussionPost[]>;
  logs: AdminLogEntry[];
  statsLoading: boolean;
  fetchCmsData: () => Promise<void>;
  fetchStats: () => Promise<void>;
  handleSave: (keyName: string, data: unknown, isJson?: boolean) => Promise<void>;
  publishNodes: () => Promise<void>;
  publishQuiz: () => Promise<void>;
  handleFileUpload: (nodeId: string, type: 'icon' | 'image', file: File) => Promise<void>;
  handleDeletePost: (postId: string | number) => Promise<void>;
  handleClearNodePosts: (nodeId: string) => Promise<void>;
  handleClearAllLogs: () => Promise<void>;
  quizLogs: AdminLogEntry[];
  voteLogs: AdminLogEntry[];
  groupedVoteLogs: VoteLogGroup[];
  uniqueVoteCount: number;
  todayCount: number;
  uniqueQuizCount: number;
  voteStats: Record<string, VoteBucket>;
  top3entries: VoteBucket[];
  mostLiked: VoteBucket[];
  mostDisliked: VoteBucket[];
  treeNodes: TreeNode[];
  dynamicOptions: TreeNode[];
  exportNodeListMd: () => void;
  handleExportMarkdown: () => void;
};

function compressImageFile(file: File, maxSide = 1200, quality = 0.75): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = document.createElement('img');
      img.src = String(event.target?.result || '');
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
        const context = canvas.getContext('2d');
        if (!context) {
          resolve(String(event.target?.result || ''));
          return;
        }
        context.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', quality));
      };
      img.onerror = () => resolve(String(event.target?.result || ''));
    };
    reader.onerror = () => resolve('');
  });
}

function detailString(log: AdminLogEntry, key: string): string {
  const value = log.details[key];
  return typeof value === 'string' ? value : '';
}

export function useAdminWorkspace(adminLevel: number | null, isAuth: boolean): AdminWorkspace {
  const [quizJson, setQuizJson] = useState('[]');
  const [mindmapJson, setMindmapJson] = useState('');
  const [sheetConfig, setSheetConfig] = useState<Record<string, unknown>>({});
  const [nodeImages, setNodeImages] = useState<AdminNodeImages>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [uploadingState, setUploadingState] = useState<Record<string, boolean>>({});
  const [nodeNameMap, setNodeNameMap] = useState<Record<string, string>>({});
  const [nodeParentMap, setNodeParentMap] = useState<Record<string, string>>({});
  const [nodeLevelMap, setNodeLevelMap] = useState<Record<string, number>>({});
  const [discussions, setDiscussions] = useState<Record<string, DiscussionPost[]>>({});
  const [logs, setLogs] = useState<AdminLogEntry[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchCmsData = useCallback(async () => {
    setLoading(true);
    try {
      const cms = await fetchAdminCmsData(defaultGraphNodes, defaultQuizQuestions);
      setMindmapJson(cms.mindmapJson);
      setQuizJson(cms.quizJson);
      setSheetConfig(cms.sheetConfig);
      setNodeImages(cms.nodeImages);
      setNodeNameMap(cms.nodeNameMap);
      setNodeParentMap(cms.nodeParentMap);
      setNodeLevelMap(cms.nodeLevelMap);
      setDiscussions(cms.discussions);
    } catch (error) {
      console.error('CMS 載入失敗', error);
      setMessage('❌ 後台資料載入失敗');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      setLogs(await fetchAdminLogs());
    } catch (error) {
      console.error('後台紀錄載入失敗', error);
      setMessage('❌ 後台紀錄載入失敗');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 載入 CMS 是登入狀態改變時的外部資料同步；保留在 effect 內避免 render 階段查詢。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isAuth) void fetchCmsData();
  }, [fetchCmsData, isAuth]);

  const handleSave = useCallback(async (keyName: string, data: unknown, isJson = true) => {
    if (adminLevel === 3) {
      alert('您的權限等級為 Level 3 (僅供觀看)，無法儲存修改內容！');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const draftKey = keyName === 'mindmap_data' ? 'mindmap_data_draft' : keyName === 'node_images' ? 'node_images_draft' : keyName === 'quiz_system_config' ? 'quiz_system_config_draft' : keyName;
      const result = await saveAdminContent(draftKey, data, isJson);
      setMessage(result.ok ? '✅ 草稿已儲存；前台仍維持目前已發布版本。' : `❌ 草稿儲存失敗：${result.message || ''}`);
    } finally {
      setSaving(false);
      window.setTimeout(() => setMessage(''), 5000);
    }
  }, [adminLevel]);

  const publishQuiz = useCallback(async () => {
    if (adminLevel === 3) {
      setMessage('❌ Level 3 僅供觀看，無法發布測驗內容。');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const result = await publishQuizContent(quizJson);
      setMessage(result.ok ? '✅ 測驗內容已發布，前台現在會顯示這個版本。' : `❌ 測驗發布失敗：${result.message || ''}`);
    } finally {
      setSaving(false);
    }
  }, [adminLevel, quizJson]);

  const publishNodes = useCallback(async () => {
    if (adminLevel === 3) {
      setMessage('❌ Level 3 僅供觀看，無法發布內容。');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const result = await publishNodeContent(mindmapJson, nodeImages);
      setMessage(result.ok ? '✅ 節點圖片與文本已發布，前台現在會顯示這個版本。' : `❌ 發布失敗：${result.message || ''}`);
    } finally {
      setSaving(false);
    }
  }, [adminLevel, mindmapJson, nodeImages]);

  const handleFileUpload = useCallback(async (nodeId: string, type: 'icon' | 'image', file: File) => {
    if (!file) return;
    const stateKey = `${nodeId}_${type}`;
    setUploadingState((previous) => ({ ...previous, [stateKey]: true }));
    try {
      const base64 = await compressImageFile(file, type === 'icon' ? 600 : 1200, 0.75);
      if (!base64) throw new Error('讀取圖片檔案失敗');
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `node_${nodeId}_${type}_${Date.now()}.${fileExt}`;
      const response = await fetch('/api/uploadImage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64, fileName }),
      });
      const responseText = await response.text();
      let data: { url?: string; error?: string } = {};
      try {
        data = JSON.parse(responseText) as { url?: string; error?: string };
      } catch {
        if (response.status === 413 || responseText.includes('Request Entity Too Large') || responseText.includes('Payload Too Large')) {
          throw new Error('圖片檔案體積過大，請嘗試上傳較小尺寸的圖片');
        }
        throw new Error(`伺服器錯誤 (${response.status})`);
      }
      if (data.error) throw new Error(data.error);
      const uploadedUrl = data.url || base64;
      const current = nodeImages[nodeId] || {};
      const nextImages: AdminNodeImages = {
        ...nodeImages,
        [nodeId]: {
          ...current,
          icon: type === 'icon' ? uploadedUrl : current.icon || current.kamon,
          kamon: type === 'icon' ? uploadedUrl : current.kamon || current.icon,
          image: type === 'image' ? uploadedUrl : current.image || current.realistic,
          realistic: type === 'image' ? uploadedUrl : current.realistic || current.image,
        },
      };
      setNodeImages(nextImages);

      let nextMindmapJson = mindmapJson;
      try {
        const currentNodes = JSON.parse(mindmapJson) as Array<Record<string, unknown>>;
        const updatedNodes = currentNodes.map((node) => node.id === nodeId
          ? type === 'image'
            ? { ...node, image: uploadedUrl }
            : { ...node, icon: uploadedUrl, kamonIcon: uploadedUrl }
          : node);
        nextMindmapJson = JSON.stringify(updatedNodes, null, 2);
        setMindmapJson(nextMindmapJson);
      } catch (error) {
        console.error('Failed to parse mindmapJson:', error);
      }

      await handleSave('node_images', nextImages, false);
      if (nextMindmapJson !== mindmapJson) await handleSave('mindmap_data', nextMindmapJson, false);
      setMessage(`✅ ${type === 'icon' ? '節點家徽' : '視窗情境圖'}照片上傳並同步儲存成功！`);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : '未知錯誤';
      alert(`上傳失敗: ${messageText}`);
    } finally {
      setUploadingState((previous) => ({ ...previous, [stateKey]: false }));
    }
  }, [handleSave, mindmapJson, nodeImages]);

  const handleDeletePost = useCallback(async (postId: string | number) => {
    if (!confirm('確定要刪除這筆留言嗎？這將會連同底下的回覆一起刪除。')) return;
    const result = await deleteDiscussion(postId);
    if (result.ok) {
      alert('刪除成功');
      await fetchCmsData();
    } else {
      alert(`刪除失敗：${result.message || ''}`);
    }
  }, [fetchCmsData]);

  const handleClearNodePosts = useCallback(async (nodeId: string) => {
    if (!confirm(`確定要清空「${nodeNameMap[nodeId] || nodeId}」的所有留言嗎？此操作無法復原！`)) return;
    const result = await clearNodeDiscussions(nodeId);
    if (result.ok) {
      alert('清空成功');
      await fetchCmsData();
    } else {
      alert(`清空失敗：${result.message || ''}`);
    }
  }, [fetchCmsData, nodeNameMap]);

  const handleClearAllLogs = useCallback(async () => {
    if (!confirm('警告：確定要清空所有的訪客測驗與互動紀錄嗎？（不含留言）此操作無法復原！')) return;
    const result = await clearVisitorLogs();
    if (result.ok) {
      alert('紀錄清空成功');
      await fetchStats();
    } else {
      alert(`清空失敗：${result.message || ''}`);
    }
  }, [fetchStats]);

  const quizLogs = useMemo(() => logs.filter((log) => log.action_type === 'quiz_complete'), [logs]);
  const voteLogs = useMemo(() => logs.filter((log) => log.action_type === 'node_vote'), [logs]);

  const groupedVoteLogs = useMemo(() => {
    const groups: VoteLogGroup[] = [];
    let current: VoteLogGroup | null = null;
    voteLogs.forEach((log) => {
      const time = new Date(log.created_at).getTime();
      const userName = detailString(log, 'userName') || log.device_id?.slice(0, 8) || '匿名訪客';
      if (!current || current.userName !== userName || current.startTime - time >= 30 * 60 * 1000) {
        if (current) groups.push(current);
        current = { id: log.id, userName, endTime: time, startTime: time, logs: [log] };
      } else {
        current.logs.push(log);
        current.startTime = time;
      }
    });
    if (current) groups.push(current);
    return groups;
  }, [voteLogs]);

  const uniqueVoteCount = useMemo(() => new Set(voteLogs.map((log) => `${log.device_id}_${detailString(log, 'node_id')}`)).size, [voteLogs]);
  const todayCount = useMemo(() => {
    const today = new Date().toDateString();
    return new Set(logs
      .filter((log) => new Date(log.created_at).toDateString() === today)
      .map((log) => `${log.action_type}_${log.device_id}_${detailString(log, 'node_id')}_${detailString(log, 'userName')}`)).size;
  }, [logs]);
  const uniqueQuizCount = useMemo(() => new Set(quizLogs.map((log) => log.device_id)).size, [quizLogs]);

  const voteStats = useMemo(() => {
    const stats: Record<string, VoteBucket> = {};
    const seen = new Set<string>();
    voteLogs.forEach((log) => {
      const nodeId = detailString(log, 'node_id');
      const key = `${log.device_id}_${nodeId}`;
      if (!nodeId || seen.has(key)) return;
      seen.add(key);
      const voteType = detailString(log, 'vote_type');
      const bucket = stats[nodeId] || {
        label: detailString(log, 'node_label') || nodeNameMap[nodeId] || nodeId,
        total: 0,
        likes: 0,
        neutral: 0,
        dislikes: 0,
      };
      bucket.total += 1;
      if (voteType === 'like' || voteType === 'need') bucket.likes += 1;
      else if (voteType === 'nope') bucket.dislikes += 1;
      else bucket.neutral += 1;
      stats[nodeId] = bucket;
    });
    return stats;
  }, [nodeNameMap, voteLogs]);

  const allEntries = useMemo(() => Object.values(voteStats).sort((a, b) => b.total - a.total), [voteStats]);
  const top3entries = useMemo(() => allEntries.slice(0, Math.max(Math.ceil(allEntries.length / 3), 3)), [allEntries]);
  const mostLiked = useMemo(() => [...top3entries].sort((a, b) => b.likes / Math.max(b.total, 1) - a.likes / Math.max(a.total, 1)).slice(0, 10), [top3entries]);
  const mostDisliked = useMemo(() => [...top3entries].sort((a, b) => b.dislikes / Math.max(b.total, 1) - a.dislikes / Math.max(a.total, 1)).slice(0, 10), [top3entries]);

  const treeNodes = useMemo(() => {
    const ids = Object.keys(voteStats);
    const result: TreeNode[] = [];
    const visited = new Set<string>();
    const walk = (id: string, depth: number, parentId: string | null) => {
      if (visited.has(id)) return;
      visited.add(id);
      const children = ids.filter((childId) => nodeParentMap[childId] === id);
      result.push({ id, depth, hasChildren: children.length > 0, parentId });
      children.forEach((childId) => walk(childId, depth + 1, id));
    };
    ids.filter((id) => !nodeParentMap[id] || !ids.includes(nodeParentMap[id])).forEach((id) => walk(id, 0, null));
    return result;
  }, [nodeParentMap, voteStats]);

  const exportNodeListMd = useCallback(() => {
    let markdown = '# KinkFlow 節點喜好度清單\n\n';
    markdown += `匯出時間：${new Date().toLocaleString('zh-TW')}\n\n`;
    markdown += '| 節點名稱 | 層級 | 喜愛 | 普通 | 排斥 | 總票數 |\n|---|---|---|---|---|---|\n';
    treeNodes.forEach(({ id, depth }) => {
      const item = voteStats[id];
      if (!item) return;
      const percentage = (value: number) => Math.round((value / Math.max(item.total, 1)) * 100);
      const prefix = depth > 0 ? '　'.repeat(depth) + '└ ' : '';
      markdown += `| ${prefix}${item.label} | Lv.${nodeLevelMap[id] ?? '-'} | ${percentage(item.likes)}% | ${percentage(item.neutral)}% | ${percentage(item.dislikes)}% | ${item.total} |\n`;
    });
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `KinkFlow_節點清單_${new Date().toISOString().split('T')[0]}.md`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }, [nodeLevelMap, treeNodes, voteStats]);

  const handleExportMarkdown = useCallback(() => {
    let markdown = '# KinkFlow 留言板統整紀錄\n\n';
    markdown += `匯出時間：${new Date().toLocaleString('zh-TW')}\n\n`;
    Object.entries(discussions).forEach(([nodeId, posts]) => {
      if (!posts.length) return;
      const title = nodeNameMap[nodeId] || (nodeId === 'lobby_chat' ? '大廳即時聊天' : nodeId === 'lobby_board' ? '大廳精華留言板' : nodeId);
      markdown += `## 節點：${title}\n\n`;
      posts.forEach((post) => {
        markdown += `### ${post.author} (讚 ${post.upvotes} | ${new Date(post.timestamp || 0).toLocaleString('zh-TW')})\n`;
        markdown += `> ${post.text.replace(/\n/g, '\n> ')}\n\n`;
        post.replies?.forEach((reply) => { markdown += `- **${reply.author}**: ${reply.text}\n`; });
        markdown += '\n';
      });
      markdown += '---\n\n';
    });
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `KinkFlow_留言紀錄_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(anchor.href);
  }, [discussions, nodeNameMap]);

  return {
    quizJson,
    setQuizJson,
    mindmapJson,
    setMindmapJson,
    sheetConfig,
    setSheetConfig,
    nodeImages,
    setNodeImages,
    loading,
    saving,
    message,
    setMessage,
    uploadingState,
    nodeNameMap,
    nodeParentMap,
    nodeLevelMap,
    discussions,
    logs,
    statsLoading,
    fetchCmsData,
    fetchStats,
    handleSave,
    publishNodes,
    publishQuiz,
    handleFileUpload,
    handleDeletePost,
    handleClearNodePosts,
    handleClearAllLogs,
    quizLogs,
    voteLogs,
    groupedVoteLogs,
    uniqueVoteCount,
    todayCount,
    uniqueQuizCount,
    voteStats,
    top3entries,
    mostLiked,
    mostDisliked,
    treeNodes,
    dynamicOptions: treeNodes,
    exportNodeListMd,
    handleExportMarkdown,
  };
}
