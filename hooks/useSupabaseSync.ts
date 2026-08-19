import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { GraphNode, GraphLink, AppData, VoteStats } from '@/lib/types';
import { parseDiscussionDate, VOTE_TYPES, type VoteType } from '@/lib/contentModel';
import { groupDiscussionRows, type DiscussionRow } from '@/lib/data/discussions';
import { fetchLobbyChat, lobbyChatToDiscussionPost } from '@/lib/data/lobbyChat';
import { fetchUserStyleConfig } from '@/lib/data/adminSettings';
import { initialAppData, graphNodes as defaultGraphNodes, graphLinks as defaultGraphLinks } from '@/lib/constants';

const INITIALIZATION_FALLBACK_MS = 8_000;
const SUPPORTED_THEMES = new Set(['morandi', 'sakura', 'ukiyo', 'moonlight']);

type QueryResult<T> = {
  data: T | null;
  error: unknown;
};

type ContentRow = {
  content?: unknown;
};

type VoteRow = {
  node_id?: unknown;
  vote_type?: unknown;
};

type VoteLogRow = {
  metadata_json?: unknown;
};

type LegacyVoteRecord = {
  node_id: string;
  vote_type: VoteType;
  userName: string;
};

function getErrorMessage(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const message = (error as { message?: unknown }).message;
  return typeof message === 'string' ? message : null;
}

function isVoteType(value: unknown): value is VoteType {
  return typeof value === 'string' && VOTE_TYPES.includes(value as VoteType);
}

function parseLegacyVoteRecord(value: unknown): LegacyVoteRecord | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (typeof record.node_id !== 'string' || typeof record.userName !== 'string' || !isVoteType(record.vote_type)) return null;
  return { node_id: record.node_id, vote_type: record.vote_type, userName: record.userName };
}

async function runQuery<T>(label: string, request: PromiseLike<QueryResult<T>>): Promise<QueryResult<T>> {
  try {
    const result = await request;
    if (result.error) {
      console.warn(`[Supabase] ${label} failed:`, getErrorMessage(result.error) || result.error);
    }
    return result;
  } catch (error) {
    console.warn(`[Supabase] ${label} request failed:`, error);
    return { data: null, error };
  }
}

export function useSupabaseSync(userId?: string | null, userName?: string | null) {
  const [appData, setAppData] = useState<AppData>(initialAppData);
  const [nodesData, setNodesData] = useState<GraphNode[]>(defaultGraphNodes);
  const [linksData, setLinksData] = useState<GraphLink[]>(defaultGraphLinks);
  const [dbLoaded, setDbLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let fallbackTimer: number | undefined;

    const finishInitialization = () => {
      if (!cancelled) setDbLoaded(true);
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
    };

    const applyDefaultMindmap = () => {
      if (cancelled) return;
      setNodesData(defaultGraphNodes);
      setLinksData(defaultGraphLinks);
    };

    const fetchDb = async () => {
      if (!isSupabaseConfigured) {
        console.warn('[Supabase] Missing public environment variables; using local fallback data.');
        finishInitialization();
        return;
      }

      try {
        // These reads are independent. Running them together prevents one slow table
        // from serially delaying every other part of the first paint.
        const [sheetConfigResult, mindmapResult, nodeImagesResult, layoutResult, discussionsResult, nodeVotesResult, lobbyChatRows] = await Promise.all([
          runQuery<ContentRow[]>('google_sheets_config', supabase.from('quiz_content').select('content').eq('key_name', 'google_sheets_config')),
          runQuery<ContentRow[]>('mindmap_data', supabase.from('quiz_content').select('content').eq('key_name', 'mindmap_data')),
          runQuery<ContentRow[]>('node_images', supabase.from('quiz_content').select('content').eq('key_name', 'node_images')),
          runQuery<ContentRow[]>('profile_layout', supabase.from('quiz_content').select('content').eq('key_name', 'profile_layout')),
          runQuery<DiscussionRow[]>('discussions', supabase.from('discussions').select('*').limit(500)),
          // Only fetch fields needed for public aggregation. Do not expose user_id to the client.
          runQuery<VoteRow[]>('node_votes', supabase.from('node_votes').select('node_id, vote_type').limit(5000)),
          fetchLobbyChat(200),
        ]);

        if (cancelled) return;

        // Keep this read for compatibility with older configuration records.
        void sheetConfigResult;

        const mindmap = mindmapResult.data?.[0];
        if (Array.isArray(mindmap?.content) && mindmap.content.length > 0) {
          // CMS 可能只保存部分欄位；不可讓稀疏資料覆蓋 constants 內完整的設計資產與文本。
          const defaultsById = new Map(defaultGraphNodes.map(node => [node.id, node]));
          const parsedNodes = (mindmap.content as GraphNode[]).map(node => {
            const fallback = defaultsById.get(node.id);
            return {
              ...fallback,
              ...node,
              label: node.label || fallback?.label,
              desc: node.desc || fallback?.desc,
              intro: node.intro || fallback?.intro,
              practice: node.practice || fallback?.practice,
              hazard: node.hazard || fallback?.hazard,
              first_aid: node.first_aid || fallback?.first_aid,
              detail_text: node.detail_text || fallback?.detail_text,
              image: node.image || fallback?.image,
              kamonIcon: node.kamonIcon || fallback?.kamonIcon,
              icon: node.icon || fallback?.icon,
            } as GraphNode;
          });
          setNodesData(parsedNodes);
          setLinksData(parsedNodes.filter(node => node.parent).map(node => ({
            source: node.parent as string,
            target: node.id,
          })));
        } else {
          applyDefaultMindmap();
        }

        const imgMap = (nodeImagesResult.data?.[0]?.content || {}) as Record<string, { icon?: string; image?: string; kamon?: string; realistic?: string; iconAlt?: string; imageAlt?: string }>;
        const convertGoogleDriveUrl = (url?: string): string | undefined => {
          if (!url) return url;
          const match = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/) || url.match(/id=([a-zA-Z0-9-_]+)/);
          return match?.[1] ? `https://drive.google.com/uc?export=view&id=${match[1]}` : url;
        };

        setNodesData(prev => prev.map(node => {
          const entry = imgMap[node.id] || {};
          const overrideKamon = convertGoogleDriveUrl(entry.kamon || entry.icon);
          const overrideRealistic = convertGoogleDriveUrl(entry.realistic || entry.image);
          // 優先使用後台明確設定；沒有設定時保留節點原有設計資產，
          // 不再用一個永遠 truthy 的通用路徑覆蓋 constants 內的專屬圖片。
          const defaultKamon = node.kamonIcon || `/images/nodes/kamon_${node.id}.png`;
          const defaultRealistic = node.image || `/images/nodes/realistic_${node.id}.png`;
          return {
            ...node,
            kamonIcon: overrideKamon || defaultKamon,
            image: overrideRealistic || defaultRealistic,
            icon: overrideKamon || node.icon,
          };
        }));

        setAppData(prev => ({
          ...prev,
          nodeImages: { ...imgMap, ...(prev.nodeImages || {}) },
        }));

        const layoutContent = layoutResult.data?.[0]?.content;
        const globalTheme = layoutContent && typeof layoutContent === 'object' && typeof (layoutContent as { theme?: unknown }).theme === 'string'
          ? (layoutContent as { theme: string }).theme
          : 'morandi';
        let activeTheme = globalTheme;
        if (userName) {
          try {
            const userStyle = await fetchUserStyleConfig(userName, userId);
            if (typeof userStyle.theme === 'string' && SUPPORTED_THEMES.has(userStyle.theme)) {
              activeTheme = userStyle.theme;
            }
          } catch (error) {
            console.warn('[主題] 讀取個人主題失敗，沿用全域主題：', error);
          }
        }
        if (!cancelled && typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', activeTheme);
          document.documentElement.classList.toggle('dark', activeTheme === 'moonlight');
        }

        const dbDiscussions = discussionsResult.data;
        if (Array.isArray(dbDiscussions)) {
          const grouped = groupDiscussionRows(dbDiscussions);
          if (lobbyChatRows.length > 0) grouped.lobby_chat = lobbyChatRows.map(lobbyChatToDiscussionPost);
          Object.values(grouped).forEach(posts => {
            posts.sort((a, b) => (parseDiscussionDate(a.timestamp)?.getTime() || 0) - (parseDiscussionDate(b.timestamp)?.getTime() || 0));
          });
          setAppData(prev => ({ ...prev, discussions: grouped }));
        }

        const nodeVotes = nodeVotesResult.data;
        if (Array.isArray(nodeVotes) && !nodeVotesResult.error) {
          const globalStats: Record<string, VoteStats> = {};
          nodeVotes.forEach(vote => {
            const nodeId = typeof vote.node_id === 'string' ? vote.node_id : null;
            const voteType = isVoteType(vote.vote_type) ? vote.vote_type : null;
            if (!nodeId || !voteType) return;
            if (!globalStats[nodeId]) {
              globalStats[nodeId] = { need: 0, like: 0, curious: 0, neutral: 0, nope: 0 };
            }
            globalStats[nodeId][voteType] += 1;
          });
          setAppData(prev => ({ ...prev, stats: { ...prev.stats, ...globalStats } }));
        } else {
          // Compatibility fallback for installations before node_votes was deployed.
          const voteLogsResult = await runQuery<VoteLogRow[]>(
            'legacy_node_vote_logs',
            supabase.from('visitor_logs').select('metadata_json').eq('action_type', 'node_vote').limit(5000),
          );
          if (!cancelled && Array.isArray(voteLogsResult.data)) {
            const globalStats: Record<string, VoteStats> = {};
            const latestVotes = new Map<string, LegacyVoteRecord>();
            voteLogsResult.data.forEach(log => {
              const data = parseLegacyVoteRecord(log.metadata_json);
              if (data) {
                latestVotes.set(`${data.userName}_${data.node_id}`, data);
              }
            });
            latestVotes.forEach(data => {
              if (!globalStats[data.node_id]) globalStats[data.node_id] = { need: 0, like: 0, curious: 0, neutral: 0, nope: 0 };
              globalStats[data.node_id][data.vote_type] += 1;
            });
            setAppData(prev => ({ ...prev, stats: { ...prev.stats, ...globalStats } }));
          }
        }
      } catch (error) {
        console.error('[Supabase] Initial data load failed; continuing with local fallback data.', error);
      } finally {
        finishInitialization();
      }
    };

    // Never leave the whole app behind a spinner because a remote request is slow.
    fallbackTimer = window.setTimeout(() => {
      if (!cancelled) {
        console.warn(`[Supabase] Initialization exceeded ${INITIALIZATION_FALLBACK_MS}ms; showing fallback UI.`);
        setDbLoaded(true);
      }
    }, INITIALIZATION_FALLBACK_MS);

    void fetchDb();
    return () => {
      cancelled = true;
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
    };
  }, [userId, userName]);

  return {
    appData,
    setAppData,
    nodesData,
    setNodesData,
    linksData,
    setLinksData,
    dbLoaded,
    setDbLoaded,
  };
}
