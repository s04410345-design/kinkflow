"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AuthorName } from '@/components/Comment';
import { Search, Trash2, RefreshCw, MessageSquare, ThumbsUp } from 'lucide-react';

interface PostItem {
  id: string | number;
  author: string;
  text: string;
  upvotes: number;
  timestamp: number;
  node_id?: string;
  replies?: any[];
  emojis?: any[];
  isReply?: boolean;
  parentId?: string | number;
}

export default function DiscussionManagementPanel() {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [nodeFilter, setNodeFilter] = useState<string>('all');
  const [nodeNames, setNodeNames] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchDiscussions();
  }, []);

  const fetchDiscussions = async () => {
    setLoading(true);
    try {
      // 1. Fetch mindmap node names
      const { data: mdArr } = await supabase.from('quiz_content').select('content').eq('key_name', 'mindmap_data');
      const md = mdArr?.[0];
      const nMap: Record<string, string> = {
        'lobby_chat': '即時聊天大廳',
        'lobby_board': '討論交流大廳'
      };
      if (md?.content && Array.isArray(md.content)) {
        md.content.forEach((n: any) => {
          if (n.id && n.label) nMap[n.id] = n.label;
        });
      }
      setNodeNames(nMap);

      // 2. Fetch all discussions
      const { data, error } = await supabase
        .from('discussions')
        .select('*');

      if (error) throw error;

      if (data) {
        const flattenedList: PostItem[] = [];
        data.forEach((item: any) => {
          const mainPost: PostItem = {
            id: item.id,
            author: item.author || '匿名',
            text: item.text || '',
            upvotes: item.upvotes || 0,
            timestamp: Number(item.timestamp) || Date.now(),
            node_id: item.node_id || 'lobby_board',
            replies: item.replies || [],
            emojis: item.emojis || []
          };
          flattenedList.push(mainPost);

          // Flatten sub-replies as well so admin can manage any reply directly
          if (Array.isArray(item.replies)) {
            item.replies.forEach((reply: any) => {
              flattenedList.push({
                id: reply.id,
                author: reply.author || '匿名',
                text: reply.text || '',
                upvotes: reply.upvotes || 0,
                timestamp: Number(reply.timestamp) || Date.now(),
                node_id: item.node_id || 'lobby_board',
                isReply: true,
                parentId: item.id
              });
            });
          }
        });
        setPosts(flattenedList);
      }
    } catch (err: any) {
      console.error('Failed to fetch discussions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (post: PostItem) => {
    if (!window.confirm(`確定要刪除 ${post.author} 的這條${post.isReply ? '回覆' : '主貼文'}嗎？`)) return;

    try {
      if (post.isReply && post.parentId) {
        // Delete sub-reply: fetch parent, filter out reply, update
        const { data: parent } = await supabase.from('discussions').select('replies').eq('id', post.parentId).single();
        if (parent) {
          const newReplies = (parent.replies || []).filter((r: any) => String(r.id) !== String(post.id));
          await supabase.from('discussions').update({ replies: newReplies }).eq('id', post.parentId);
        }
      } else {
        // Delete main post
        await supabase.from('discussions').delete().eq('id', post.id);
      }
      setPosts(prev => prev.filter(p => String(p.id) !== String(post.id)));
      alert('刪除成功！');
    } catch (err: any) {
      alert('刪除失敗: ' + err.message);
    }
  };

  const filteredPosts = posts.filter(p => {
    const matchesSearch = 
      p.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (nodeNames[p.node_id || ''] || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesNode = nodeFilter === 'all' || p.node_id === nodeFilter;
    return matchesSearch && matchesNode;
  });

  const exportDiscussionsMd = () => {
    let md = `# KinkFlow 討論區留言總紀錄\n\n`;
    md += `匯出時間：${new Date().toLocaleString('zh-TW')}\n\n`;
    filteredPosts.forEach(p => {
      const location = nodeNames[p.node_id || ''] || p.node_id || '未知位置';
      md += `### [${location}] 👤 ${p.author} (👍 ${p.upvotes} | 🕒 ${new Date(p.timestamp).toLocaleString('zh-TW')})\n`;
      md += `> ${p.text.replace(/\n/g, '\n> ')}\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `KinkFlow_留言紀錄_${Date.now()}.md`;
    a.click();
  };

  return (
    <div className="bg-white/90 rounded-2xl border border-[#D1C6B4]/30 shadow-sm flex flex-col min-h-screen">
      {/* Header */}
      <div className="p-6 border-b border-[#D1C6B4]/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#4A4238] flex items-center gap-2">
            💬 討論區與留言管理
          </h2>
          <p className="text-xs text-[#4A4238]/60 mt-1">
            即時呈現與管理大廳、討論交流區及各心智圖節點的使用者留言與回覆。
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button 
            onClick={fetchDiscussions}
            disabled={loading}
            className="px-3.5 py-2 bg-[#F5EFE6] hover:bg-[#E8C5C8]/30 text-[#4A4238] rounded-xl text-xs font-bold transition-all border border-[#D1C6B4]/40 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            重新整理
          </button>

          <button 
            onClick={exportDiscussionsMd}
            className="px-3.5 py-2 bg-[#D9B650] hover:bg-[#c5a342] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            📥 匯出 MD (.md)
          </button>

          <button 
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-[#4A4238] hover:bg-[#38322a] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            📄 匯出 PDF (.pdf)
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 border-b border-[#D1C6B4]/30 bg-[#FDFBF7] flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#4A4238]/40" />
          <input 
            type="text" 
            placeholder="搜尋作者、留言關鍵字..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#D1C6B4]/50 text-sm bg-white focus:border-[#E8C5C8] outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-[#4A4238]/60 shrink-0">篩選位置：</span>
          <select 
            value={nodeFilter} 
            onChange={e => setNodeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#D1C6B4]/50 text-sm bg-white focus:border-[#E8C5C8] outline-none w-full sm:w-auto"
          >
            <option value="all">全部位置 ({posts.length})</option>
            <option value="lobby_board">討論交流大廳</option>
            <option value="lobby_chat">即時聊天大廳</option>
            {Object.entries(nodeNames)
              .filter(([k]) => !['lobby_board', 'lobby_chat'].includes(k))
              .map(([k, name]) => (
                <option key={k} value={k}>{name} ({k})</option>
              ))}
          </select>
        </div>
      </div>

      {/* Posts List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {loading ? (
          <div className="text-center text-[#4A4238]/60 py-12 flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-[#D9B650]" />
            <span>載入留言數據中...</span>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center text-[#4A4238]/60 py-12 bg-white/50 rounded-2xl border border-dashed border-[#D1C6B4]/50">
            查無符合條件的留言
          </div>
        ) : (
          filteredPosts.map(p => {
            const locationName = nodeNames[p.node_id || ''] || p.node_id || '未知區塊';
            return (
              <div 
                key={`${p.isReply ? 'reply' : 'main'}_${p.id}`} 
                className={`bg-white p-4 rounded-xl border transition-all hover:border-[#E8C5C8] shadow-sm flex flex-col gap-3 ${
                  p.isReply ? 'ml-6 border-l-4 border-l-[#E8C5C8] bg-[#FDFBF7]/50' : 'border-[#D1C6B4]/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AuthorName name={p.author} className="font-bold text-[#4A4238]" />
                    {p.isReply && (
                      <span className="text-[10px] bg-[#E8C5C8]/30 text-[#4A4238] px-2 py-0.5 rounded-full font-bold">
                        💬 回覆留言
                      </span>
                    )}
                    <span className="text-xs text-[#4A4238]/50 bg-[#F5EFE6] px-2.5 py-0.5 rounded-full font-semibold">
                      來自：{locationName}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#4A4238]/40">
                      {p.timestamp ? new Date(p.timestamp).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                    <button 
                      onClick={() => handleDeletePost(p)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="刪除這條留言"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <p className="text-sm text-[#4A4238] leading-relaxed bg-[#FDFBF7] p-3 rounded-lg border border-[#D1C6B4]/20 whitespace-pre-wrap">
                  {p.text}
                </p>

                {/* Footer Metrics */}
                <div className="flex items-center gap-4 text-xs text-[#4A4238]/60 font-medium">
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="w-3.5 h-3.5 text-[#D9B650]" />
                    {p.upvotes || 0} 個讚
                  </span>
                  {!p.isReply && (
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5 text-[#E8C5C8]" />
                      {p.replies?.length || 0} 則回覆
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
