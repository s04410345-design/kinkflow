"use client";

import { useState, useMemo } from 'react';
import { formatDiscussionDate } from '@/lib/contentModel';
import {
  buildCommentLogs,
  formatCommentLog,
  formatLogDate,
  getLogDisplayName,
  matchesAdminUser,
  matchesSearch,
  type AdminLogEntry,
  type CommentLogItem,
} from '@/lib/data/adminLogs';
import type { DiscussionPost } from '@/lib/types';

type LogEntry = AdminLogEntry;

export default function VisitorLogsPanel({ logs, discussions, nodeNameMap, onRefresh }: {
  logs: LogEntry[];
  discussions: Record<string, DiscussionPost[]>;
  nodeNameMap: Record<string, string>;
  onRefresh: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [activeListTab, setActiveListTab] = useState<'registers' | 'quizzes' | 'comments' | 'votes'>('registers');

  const registerLogs = useMemo(() => logs.filter(l => l.action_type === 'user_register'), [logs]);
  const quizLogs = useMemo(() => logs.filter(l => l.action_type === 'quiz_complete'), [logs]);
  const voteLogs = useMemo(() => logs.filter(l => l.action_type === 'node_vote'), [logs]);
  const commentLogs = useMemo(() => buildCommentLogs(discussions), [discussions]);

  const filteredRegisters = registerLogs.filter(l => {
    const name = getLogDisplayName(l);
    const device = l.device_id || '無裝置紀錄';
    return matchesSearch(name + device, searchQuery) && matchesAdminUser(name, l.device_id, selectedUser);
  });

  const filteredQuizzes = quizLogs.filter(l => {
    const name = l.details.userName || '未知';
    const device = l.device_id || '';
    return matchesSearch(name + device, searchQuery) && matchesAdminUser(name, l.device_id, selectedUser);
  });

  const filteredVotes = voteLogs.filter(l => {
    const name = l.details.userName || '未知';
    const device = l.device_id || '';
    const nodeLabel = l.details.node_label || (typeof l.details.node_id === 'string' ? nodeNameMap[l.details.node_id] : '') || '';
    return matchesSearch(name + device + nodeLabel, searchQuery) && matchesAdminUser(name, l.device_id, selectedUser);
  });

  const filteredComments = commentLogs.filter((c: CommentLogItem) => {
    const nodeLabel = nodeNameMap[c.nodeId] || c.nodeId;
    return matchesSearch(c.author + c.text + nodeLabel, searchQuery) && matchesAdminUser(c.author, null, selectedUser);
  });

  const exportMarkdown = (title: string, data: string) => {
    const blob = new Blob([data], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${title}_${new Date().toISOString().slice(0, 10)}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatRegisters = () => filteredRegisters.map(l => `- **${formatLogDate(l.created_at)}**: ${getLogDisplayName(l)} - 裝置: ${l.device_id?.slice(0, 8) || '無裝置紀錄'}`).join('\n');
  const formatQuizzes = () => filteredQuizzes.map(l => `- **${formatLogDate(l.created_at)}**: ${l.details.userName || '未命名訪客'} 完成測驗 (最高特質: ${l.details.top_trait || '未知'})`).join('\n');
  const formatVotes = () => filteredVotes.map(l => `- **${formatLogDate(l.created_at)}**: ${l.details.userName || '未知'} 投票 [${l.details.node_label || (typeof l.details.node_id === 'string' ? nodeNameMap[l.details.node_id] : '') || '未知節點'}] -> ${l.details.vote_type || '未知'}`).join('\n');
  const formatComments = () => filteredComments.map(c => formatCommentLog(c, nodeNameMap)).join('\n');

  const exportAll = () => {
    const md = `# 訪客與行為管理總匯出\n\n## 註冊列表\n${formatRegisters() || '無紀錄'}\n\n## 測驗列表\n${formatQuizzes() || '無紀錄'}\n\n## 留言列表\n${formatComments() || '無紀錄'}\n\n## 投票列表\n${formatVotes() || '無紀錄'}\n`;
    exportMarkdown('VisitorLogs_All', md);
  };

  const renderTabButton = (id: typeof activeListTab, label: string, count: number, colorClass: string) => (
    <button 
      onClick={() => setActiveListTab(id)}
      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${activeListTab === id ? `${colorClass} shadow-md` : 'bg-white/60 text-[#4A4238]/60 border-[#D1C6B4]/40 hover:bg-white/90 hover:text-[#4A4238]'}`}
    >
      {label} ({count})
    </button>
  );

  return (
    <div className="bg-white/70 rounded-2xl p-6 border border-[#D1C6B4]/30 shadow-sm overflow-hidden flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl font-bold text-[#4A4238]">👥 訪客與行為管理</h2>
        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          {selectedUser && (
            <div className="text-xs bg-[#E8C5C8] text-white px-3 py-1.5 rounded-full font-bold flex items-center gap-2">
              過濾: {selectedUser}
              <button onClick={() => setSelectedUser(null)} className="hover:text-black/50">✕</button>
            </div>
          )}
          <input
            type="text"
            placeholder="搜尋關鍵字或使用者..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 rounded-xl border border-[#D1C6B4]/40 text-sm flex-1 md:w-64 bg-[#FDFBF7]"
          />
          <button onClick={exportAll} className="bg-[#4A4238] text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-[#4A4238]/80 transition-colors shrink-0">
            📥 全部匯出
          </button>
          <button onClick={onRefresh} className="text-xs text-[#4A4238]/40 hover:text-[#4A4238] transition-colors shrink-0">🔄 重新整理</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[#D1C6B4]/30 pb-4">
        {renderTabButton('registers', '📝 註冊列表', filteredRegisters.length, 'bg-[#4A7238] text-white border-[#4A7238]')}
        {renderTabButton('quizzes', '🧪 測驗列表', filteredQuizzes.length, 'bg-[#C5D4B6] text-[#4A7238] border-[#C5D4B6]')}
        {renderTabButton('comments', '💬 留言列表', filteredComments.length, 'bg-[#4A4238] text-white border-[#4A4238]')}
        {renderTabButton('votes', '🗳️ 投票列表', filteredVotes.length, 'bg-[#D9B650] text-[#8A7000] border-[#D9B650]')}
      </div>

      <div className="bg-[#FDFBF7] rounded-xl border border-[#D1C6B4]/20 p-4 shadow-sm flex flex-col min-h-[500px]">
        {/* 1. 註冊列表 */}
        {activeListTab === 'registers' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-[#4A7238] text-lg">📝 註冊列表紀錄</h3>
              <button onClick={() => exportMarkdown('Registers', formatRegisters())} className="text-sm bg-[#4A7238]/10 text-[#4A7238] px-3 py-1.5 rounded-lg hover:bg-[#4A7238]/20 transition-colors font-bold">匯出清單</button>
            </div>
            <div className="overflow-y-auto flex-1 no-scrollbar pr-2 space-y-3">
              {filteredRegisters.length === 0 && <div className="text-center text-sm text-gray-400 mt-10">無相關紀錄</div>}
              {filteredRegisters.map(l => (
                <div key={l.id} className="p-4 rounded-xl border border-[#D1C6B4]/10 bg-white hover:border-[#D1C6B4]/40 hover:shadow-sm transition-all cursor-pointer" onClick={() => setSelectedUser(l.details.userName || l.details.email || l.device_id || null)}>
                  <div className="text-[#4A4238]/50 mb-1 text-xs font-mono">{formatLogDate(l.created_at)}</div>
                  <div className="flex justify-between items-center text-[#4A4238]">
                     <span className="font-bold text-base">{l.details?.email || (l.details?.userName ? '會員' : '匿名遊客')}</span>
                     <span className="text-[#4A4238]/70 font-medium text-sm">{l.details?.userName || l.device_id?.slice(0, 8)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 2. 測驗列表 */}
        {activeListTab === 'quizzes' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-[#4A7238] text-lg">🧪 測驗完成紀錄</h3>
              <button onClick={() => exportMarkdown('Quizzes', formatQuizzes())} className="text-sm bg-[#C5D4B6]/30 text-[#4A7238] px-3 py-1.5 rounded-lg hover:bg-[#C5D4B6]/50 transition-colors font-bold">匯出清單</button>
            </div>
            <div className="overflow-y-auto flex-1 no-scrollbar pr-2 space-y-3">
              {filteredQuizzes.length === 0 && <div className="text-center text-sm text-gray-400 mt-10">無相關紀錄</div>}
              {filteredQuizzes.map(l => (
                <div key={l.id} className="p-4 rounded-xl border border-[#D1C6B4]/10 bg-white hover:border-[#D1C6B4]/40 hover:shadow-sm transition-all cursor-pointer flex justify-between items-center" onClick={() => setSelectedUser(l.details.userName || l.device_id || null)}>
                  <div>
                    <div className="text-[#4A4238]/50 mb-1 text-xs font-mono">{formatLogDate(l.created_at)}</div>
                    <div className="font-bold text-[#4A4238] text-base">{l.details?.userName || '未知'}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[#4A4238]/70 text-sm font-bold bg-[#C5D4B6]/20 px-3 py-1 rounded-full">最高特質: {l.details?.top_trait || '無'}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 3. 留言列表 */}
        {activeListTab === 'comments' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-[#4A4238] text-lg">💬 所有留言紀錄</h3>
              <button onClick={() => exportMarkdown('Comments', formatComments())} className="text-sm bg-gray-200 text-[#4A4238] px-3 py-1.5 rounded-lg hover:bg-gray-300 transition-colors font-bold">匯出清單</button>
            </div>
            <div className="overflow-y-auto flex-1 no-scrollbar pr-2 space-y-3">
              {filteredComments.length === 0 && <div className="text-center text-sm text-gray-400 mt-10">無相關紀錄</div>}
              {filteredComments.map(c => (
                <div key={c.id} className="p-4 rounded-xl border border-[#D1C6B4]/10 bg-white hover:border-[#D1C6B4]/40 hover:shadow-sm transition-all cursor-pointer" onClick={() => setSelectedUser(c.author)}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-[#4A4238] text-base" onClick={(e) => { e.stopPropagation(); setSelectedUser(c.author); }}>{c.author}</span>
                    <span className="bg-[#E8C5C8]/20 text-[#4A4238] font-bold px-3 py-1 rounded-full text-xs">{nodeNameMap[c.nodeId] || c.nodeId}</span>
                  </div>
                  <div className="text-[#4A4238]/50 mb-2 text-xs font-mono">{formatDiscussionDate(c.timestamp)}</div>
                  <div className="text-[#4A4238]/90 text-sm leading-relaxed whitespace-pre-wrap">{c.text}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 4. 投票列表 */}
        {activeListTab === 'votes' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-[#8A7000] text-lg">🗳️ 節點投票紀錄</h3>
              <button onClick={() => exportMarkdown('Votes', formatVotes())} className="text-sm bg-[#D9B650]/20 text-[#8A7000] px-3 py-1.5 rounded-lg hover:bg-[#D9B650]/30 transition-colors font-bold">匯出清單</button>
            </div>
            <div className="overflow-y-auto flex-1 no-scrollbar pr-2 space-y-3">
              {filteredVotes.length === 0 && <div className="text-center text-sm text-gray-400 mt-10">無相關紀錄</div>}
              {filteredVotes.map(l => (
                <div key={l.id} className="p-4 rounded-xl border border-[#D1C6B4]/10 bg-white hover:border-[#D1C6B4]/40 hover:shadow-sm transition-all cursor-pointer flex justify-between items-center" onClick={() => setSelectedUser(l.details.userName || l.device_id || null)}>
                  <div>
                    <div className="flex gap-2 items-center mb-1">
                      <span className="text-[#4A4238]/50 text-xs font-mono">{formatLogDate(l.created_at)}</span>
                      <span className="bg-[#D1C6B4]/30 px-2 py-0.5 rounded text-xs text-[#4A4238] font-bold">{l.details.node_label || (typeof l.details.node_id === 'string' ? nodeNameMap[l.details.node_id] : '') || ''}</span>
                    </div>
                    <div className="font-bold text-[#4A4238] text-base">{l.details?.userName || '未知'}</div>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${l.details?.vote_type === 'need' ? 'bg-[#E08A8A]/20 text-[#E08A8A]' : l.details?.vote_type === 'like' ? 'bg-[#C5D4B6]/40 text-[#4A7238]' : l.details?.vote_type === 'curious' ? 'bg-[#D9B650]/20 text-[#8A7000]' : l.details?.vote_type === 'nope' ? 'bg-gray-100 text-gray-600' : 'bg-gray-100 text-gray-400'}`}>
                      {l.details?.vote_type === 'need' ? '🔥 絕對需要' : l.details?.vote_type === 'like' ? '🟢 喜歡' : l.details?.vote_type === 'curious' ? '🟡 觀望中' : l.details?.vote_type === 'nope' ? '🔴 絕對不要' : l.details?.vote_type === 'neutral' ? '⚪ 沒感覺' : l.details?.vote_type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
