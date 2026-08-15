import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { GraphNode, GraphLink, AppData, DiscussionPost, VoteStats } from '@/lib/types';
import { extractDiscussionContent, parseDiscussionDate } from '@/lib/contentModel';
import { initialAppData, graphNodes as defaultGraphNodes, graphLinks as defaultGraphLinks } from '@/lib/constants';

const INITIALIZATION_FALLBACK_MS = 8_000;

type QueryResult = {
  data: any;
  error: any;
};

async function runQuery(label: string, request: PromiseLike<QueryResult>): Promise<QueryResult> {
  try {
    const result = await request;
    if (result.error) {
      console.warn(`[Supabase] ${label} failed:`, result.error.message || result.error);
    }
    return result;
  } catch (error) {
    console.warn(`[Supabase] ${label} request failed:`, error);
    return { data: null, error };
  }
}

export function useSupabaseSync() {
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
        const [sheetConfigResult, mindmapResult, nodeImagesResult, layoutResult, discussionsResult, nodeVotesResult] = await Promise.all([
          runQuery('google_sheets_config', supabase.from('quiz_content').select('content').eq('key_name', 'google_sheets_config')),
          runQuery('mindmap_data', supabase.from('quiz_content').select('content').eq('key_name', 'mindmap_data')),
          runQuery('node_images', supabase.from('quiz_content').select('content').eq('key_name', 'node_images')),
          runQuery('profile_layout', supabase.from('quiz_content').select('content').eq('key_name', 'profile_layout')),
          runQuery('discussions', supabase.from('discussions').select('*').limit(500)),
          // Only fetch fields needed for public aggregation. Do not expose user_id to the client.
          runQuery('node_votes', supabase.from('node_votes').select('node_id, vote_type').limit(5000)),
        ]);

        if (cancelled) return;

        // Keep this read for compatibility with older configuration records.
        void sheetConfigResult;

        const mindmap = mindmapResult.data?.[0];
        if (Array.isArray(mindmap?.content) && mindmap.content.length > 0) {
          const parsedNodes = mindmap.content as GraphNode[];
          setNodesData(parsedNodes);
          setLinksData(parsedNodes.filter(node => node.parent).map(node => ({
            source: node.parent as string,
            target: node.id,
          })));
        } else {
          applyDefaultMindmap();
        }

        const imgMap = (nodeImagesResult.data?.[0]?.content || {}) as Record<string, { icon?: string; image?: string; kamon?: string; realistic?: string }>;
        const convertGoogleDriveUrl = (url?: string): string | undefined => {
          if (!url) return url;
          const match = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/) || url.match(/id=([a-zA-Z0-9-_]+)/);
          return match?.[1] ? `https://drive.google.com/uc?export=view&id=${match[1]}` : url;
        };

        setNodesData(prev => prev.map(node => {
          const entry = imgMap[node.id] || {};
          const overrideKamon = convertGoogleDriveUrl(entry.kamon || entry.icon);
          const overrideRealistic = convertGoogleDriveUrl(entry.realistic || entry.image);
          return {
            ...node,
            kamonIcon: overrideKamon || `/images/nodes/kamon_${node.id}.png` || node.kamonIcon,
            image: overrideRealistic || `/images/nodes/realistic_${node.id}.png` || node.image,
            icon: overrideKamon || node.icon,
          };
        }));

        setAppData(prev => ({
          ...prev,
          nodeImages: { ...imgMap, ...(prev.nodeImages || {}) },
        }));

        const defaultTheme = layoutResult.data?.[0]?.content?.theme || 'morandi';
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', defaultTheme);
        }

        const dbDiscussions = discussionsResult.data;
        if (Array.isArray(dbDiscussions)) {
          const grouped: Record<string, DiscussionPost[]> = {};
          dbDiscussions.forEach(row => {
            if (!row.node_id) return;
            if (!grouped[row.node_id]) grouped[row.node_id] = [];
            grouped[row.node_id].push({
              id: row.id,
              author: row.author || '匿名會員',
              text: row.text || row.body || '',
              ...extractDiscussionContent(row.text || row.body || '', row.title, row.body, row.media),
              upvotes: Number(row.upvotes || 0),
              timestamp: row.timestamp || row.created_at,
              replies: row.replies || [],
              emojis: row.emojis || [],
            });
          });
          Object.values(grouped).forEach(posts => {
            posts.sort((a, b) => (parseDiscussionDate(a.timestamp)?.getTime() || 0) - (parseDiscussionDate(b.timestamp)?.getTime() || 0));
          });
          setAppData(prev => ({ ...prev, discussions: grouped }));
        }

        const nodeVotes = nodeVotesResult.data;
        if (Array.isArray(nodeVotes) && !nodeVotesResult.error) {
          const globalStats: Record<string, VoteStats> = {};
          nodeVotes.forEach(vote => {
            if (!vote.node_id || !vote.vote_type) return;
            if (!globalStats[vote.node_id]) {
              globalStats[vote.node_id] = { need: 0, like: 0, curious: 0, neutral: 0, nope: 0 };
            }
            if (vote.vote_type in globalStats[vote.node_id]) {
              globalStats[vote.node_id][vote.vote_type as keyof VoteStats] += 1;
            }
          });
          setAppData(prev => ({ ...prev, stats: { ...prev.stats, ...globalStats } }));
        } else {
          // Compatibility fallback for installations before node_votes was deployed.
          const voteLogsResult = await runQuery(
            'legacy_node_vote_logs',
            supabase.from('visitor_logs').select('metadata_json').eq('action_type', 'node_vote').limit(5000),
          );
          if (!cancelled && Array.isArray(voteLogsResult.data)) {
            const globalStats: Record<string, Record<string, number>> = {};
            const latestVotes = new Map<string, Record<string, string>>();
            voteLogsResult.data.forEach(log => {
              const data = log.metadata_json as Record<string, any> | null;
              if (data?.node_id && data.vote_type && data.userName) {
                latestVotes.set(`${data.userName}_${data.node_id}`, data);
              }
            });
            latestVotes.forEach(data => {
              if (!globalStats[data.node_id]) globalStats[data.node_id] = { need: 0, like: 0, curious: 0, neutral: 0, nope: 0 };
              if (data.vote_type in globalStats[data.node_id]) {
                globalStats[data.node_id][data.vote_type] = (globalStats[data.node_id][data.vote_type] || 0) + 1;
              }
            });
            setAppData(prev => ({ ...prev, stats: { ...prev.stats, ...(globalStats as unknown as Record<string, VoteStats>) } }));
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
  }, []);

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
