import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Papa from 'papaparse';
import type { GraphNode, GraphLink, AppData, DiscussionPost, VoteStats } from '@/lib/types';
import { initialAppData, graphNodes as defaultGraphNodes, graphLinks as defaultGraphLinks } from '@/lib/constants';

export function useSupabaseSync() {
  const [appData, setAppData] = useState<AppData>(initialAppData);
  const [nodesData, setNodesData] = useState<GraphNode[]>(defaultGraphNodes);
  const [linksData, setLinksData] = useState<GraphLink[]>(defaultGraphLinks);
  const [dbLoaded, setDbLoaded] = useState(false);

  useEffect(() => {
    async function fetchDb() {
      try {
        const { data: sheetConfigArr } = await supabase.from('quiz_content').select('content').eq('key_name', 'google_sheets_config');
        const sheetConfigObj = sheetConfigArr?.[0];
        const sheetConfig = sheetConfigObj?.content || {};

        let loadedMindmap = false;
        try {
          const { data: mindmapArr } = await supabase.from('quiz_content').select('content').eq('key_name', 'mindmap_data');
          const mindmap = mindmapArr?.[0];
          if (mindmap?.content && Array.isArray(mindmap.content) && mindmap.content.length > 0) {
            const parsedNodes = mindmap.content as GraphNode[];
            setNodesData(parsedNodes);
            const parsedLinks: GraphLink[] = [];
            parsedNodes.filter(n => n.parent).forEach(n => parsedLinks.push({ source: n.parent as string, target: n.id }));
            setLinksData(parsedLinks);
            loadedMindmap = true;
          }
        } catch (err) {
          console.warn("No valid mindmap_data found in Supabase.", err);
        }

        if (!loadedMindmap) {
          setNodesData(defaultGraphNodes);
          const parsedLinks: GraphLink[] = [];
          defaultGraphNodes.filter(n => n.parent).forEach(n => parsedLinks.push({ source: n.parent as string, target: n.id }));
          setLinksData(parsedLinks);
        }

        const { data: nodeImagesArr } = await supabase.from('quiz_content').select('content').eq('key_name', 'node_images');
        const nodeImagesObj = nodeImagesArr?.[0];
        const imgMap = (nodeImagesObj?.content || {}) as Record<string, { icon?: string, image?: string, kamon?: string, realistic?: string }>;
        
        const convertGoogleDriveUrl = (url?: string): string | undefined => {
          if (!url) return url;
          const match = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/) || url.match(/id=([a-zA-Z0-9-_]+)/);
          if (match && match[1]) {
            return `https://drive.google.com/uc?export=view&id=${match[1]}`;
          }
          return url;
        };

        setNodesData(prev => prev.map(n => {
          const entry = imgMap[n.id] || {};
          const overrideKamon = convertGoogleDriveUrl(entry.kamon || entry.icon);
          const overrideRealistic = convertGoogleDriveUrl(entry.realistic || entry.image);
          
          // 預設靜態庫備份
          const staticKamon = `/images/nodes/kamon_${n.id}.png`;
          const staticRealistic = `/images/nodes/realistic_${n.id}.png`;

          return {
            ...n,
            kamonIcon: overrideKamon || staticKamon || n.kamonIcon,
            image: overrideRealistic || staticRealistic || n.image,
            icon: overrideKamon || n.icon
          };
        }));

        setAppData(prev => ({
          ...prev,
          nodeImages: {
            ...imgMap,
            ...(prev.nodeImages || {})
          }
        }));

        // 讀取後台設定的全站預設風格並套用至 DOM
        const { data: layoutDataArr } = await supabase.from('quiz_content').select('content').eq('key_name', 'profile_layout');
        const defaultTheme = layoutDataArr?.[0]?.content?.theme || 'morandi';
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', defaultTheme);
        }

        const { data: dbDiscs } = await supabase.from('discussions').select('*');
        if (dbDiscs) {
          const grouped: Record<string, DiscussionPost[]> = {};
          dbDiscs.forEach(row => {
            if (!grouped[row.node_id]) grouped[row.node_id] = [];
            grouped[row.node_id].push({
              id: row.id,
              author: row.author,
              text: row.text,
              upvotes: row.upvotes,
              timestamp: Number(row.timestamp),
              replies: row.replies || [],
              emojis: row.emojis || []
            });
          });
          for (const key in grouped) {
            grouped[key].sort((a, b) => a.timestamp - b.timestamp);
          }
          setAppData(prev => ({ ...prev, discussions: grouped }));
        }

        const { data: voteLogs } = await supabase.from('visitor_logs').select('details').eq('action_type', 'node_vote');
        if (voteLogs) {
          const globalStats: Record<string, Record<string, number>> = {};
          const latestVotes = new Map<string, Record<string, string>>();
          voteLogs.forEach(log => {
            const d = log.details;
            if (d && d.node_id && d.vote_type && d.userName) {
               latestVotes.set(`${d.userName}_${d.node_id}`, d);
            }
          });
          latestVotes.forEach(d => {
             if (!globalStats[d.node_id]) globalStats[d.node_id] = { need: 0, like: 0, curious: 0, neutral: 0, nope: 0 };
             globalStats[d.node_id][d.vote_type] = (globalStats[d.node_id][d.vote_type] || 0) + 1;
          });
          setAppData(prev => ({ ...prev, stats: { ...prev.stats, ...(globalStats as unknown as Record<string, VoteStats>) } }));
        }
      } catch (e) {
        console.error("資料庫載入錯誤:", e);
      }
      setDbLoaded(true);
    }
    fetchDb();
  }, []);

  return {
    appData,
    setAppData,
    nodesData,
    setNodesData,
    linksData,
    setLinksData,
    dbLoaded,
    setDbLoaded
  };
}
