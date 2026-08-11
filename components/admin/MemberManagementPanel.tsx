"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { SafeStorage } from '@/lib/constants';
import { AuthorName, BlueBirdBadge } from '../Comment';

const TRAIT_LABELS: Record<string, string> = {
  dom: 'Dom 支配', sub: 'Sub 服從', rigger: 'Rigger 束縛者',
  tied: 'Tied 被縛', sadist: 'Sadist 施痛', maso: 'Maso 承受',
};

interface MemberProfile {
  id: string;
  userName: string;
  avatar_url?: string;
  cover_url?: string;
  bio?: string;
  joinedAt: string;
  isRegistered: boolean;
}

export default function MemberManagementPanel() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'registered' | 'guest'>('all');
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'bio' | 'quiz' | 'activity'>('bio');

  // 會員關聯資料快取
  const [memberQuizMap, setMemberQuizMap] = useState<Record<string, any[]>>({});
  const [memberPostsMap, setMemberPostsMap] = useState<Record<string, any[]>>({});

  useEffect(() => {
    fetchMembersData();
  }, []);

  const fetchMembersData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Users
      const { data: usersData } = await supabase.from('profiles').select('*');
      
      // 2. Fetch Discussions for user post activity
      const { data: discData } = await supabase.from('discussions').select('*');
      
      const postsGrouped: Record<string, any[]> = {};
      (discData || []).forEach(post => {
        const authorKey = post.author || '匿名訪客';
        if (!postsGrouped[authorKey]) postsGrouped[authorKey] = [];
        postsGrouped[authorKey].push(post);
      });
      setMemberPostsMap(postsGrouped);

      const quizData: any[] = [];
      const quizGrouped: Record<string, any[]> = {};
      (quizData || []).forEach(res => {
        const uKey = res.user_name || res.user_id || '訪客';
        if (!quizGrouped[uKey]) quizGrouped[uKey] = [];
        quizGrouped[uKey].push(res);
      });
      setMemberQuizMap(quizGrouped);

      // 4. Fetch quiz_content for User Covers and Avatars
      const { data: userContents } = await supabase.from('quiz_content').select('*').like('key_name', 'user_%');
      const userContentMap: Record<string, any> = {};
      (userContents || []).forEach(uc => {
        const cleanK = uc.key_name.replace('user_', '').trim();
        userContentMap[cleanK] = uc.content;
      });

      // 建立以乾淨名稱為 Key 的唯一 Member 清單，100% 消除重複
      const seenNames = new Set<string>();
      const memberList: MemberProfile[] = [];

      (usersData || []).forEach(u => {
        const rawName = u.username || u.user_name || u.name || u.email?.split('@')[0] || `會員_${(u.id || '').slice(0, 6)}`;
        const cleanName = rawName.replace(/ ☑️/g, '').replace(/ 👻/g, '').trim();
        if (seenNames.has(cleanName)) return;
        seenNames.add(cleanName);

        const uc = userContentMap[cleanName] || {};

        memberList.push({
          id: u.id,
          userName: cleanName + ' ☑️',
          avatar_url: u.avatar_url || uc.avatarUrl,
          cover_url: u.cover_url || uc.coverUrl,
          bio: u.bio || u.intro || uc.bio,
          joinedAt: u.created_at || u.joined_at || new Date().toISOString(),
          isRegistered: true
        });
      });

      // 加入僅有留言紀錄但不在 profiles 的純訪客
      Object.keys(postsGrouped).forEach(authorName => {
        const cleanAuthor = authorName.replace(/ ☑️/g, '').replace(/ 👻/g, '').trim();
        if (seenNames.has(cleanAuthor)) return;
        seenNames.add(cleanAuthor);

        const uc = userContentMap[cleanAuthor] || {};

        memberList.push({
          id: `guest_${authorName}`,
          userName: authorName.includes('👻') ? authorName : authorName + ' 👻',
          avatar_url: uc.avatarUrl,
          cover_url: uc.coverUrl,
          bio: uc.bio,
          joinedAt: postsGrouped[authorName][0]?.created_at || new Date().toISOString(),
          isRegistered: false
        });
      });

      setMembers(memberList);
    } catch (e) {
      console.error("Fetch members failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter(m => {
    const matchSearch = m.userName.toLowerCase().includes(searchTerm.toLowerCase());
    if (filterType === 'registered') return matchSearch && m.isRegistered;
    if (filterType === 'guest') return matchSearch && !m.isRegistered;
    return matchSearch;
  });

  return (
    <div className="space-y-6 text-[#4A4238] animate-fade-in">
      {/* 搜尋與篩選欄 */}
      <div className="bg-white p-4 rounded-2xl border border-[#D1C6B4]/30 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="🔍 搜尋會員名稱..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#D1C6B4]/40 text-sm focus:border-[#E8C5C8] focus:ring-2 focus:ring-[#E8C5C8]/30 outline-none bg-[#FDFBF7]"
          />
          <span className="absolute left-3.5 top-3 text-[#4A4238]/40 text-sm">🔍</span>
        </div>

        <div className="flex gap-2 shrink-0 w-full sm:w-auto">
          {(['all', 'registered', 'guest'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${filterType === type ? 'bg-[#E8C5C8] text-white shadow-sm' : 'bg-[#F5EFE6] text-[#4A4238]/70 hover:bg-[#E8C5C8]/30'}`}
            >
              {type === 'all' ? `全部會員 (${members.length})` : type === 'registered' ? '已註冊會員' : '訪客紀錄'}
            </button>
          ))}
        </div>
      </div>

      {/* 會員卡片列表 (手風琴展開結構) */}
      {loading ? (
        <div className="text-center py-12 text-[#4A4238]/50">資料載入中...</div>
      ) : filteredMembers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-[#D1C6B4]/30 text-[#4A4238]/50">
          查無符合條件的會員紀錄
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMembers.map(member => {
            const isExpanded = expandedMemberId === member.id;
            const memberPosts = memberPostsMap[member.userName] || [];
            const memberQuizzes = memberQuizMap[member.userName] || [];

            return (
              <div
                key={member.id}
                className="bg-white rounded-2xl border border-[#D1C6B4]/30 shadow-sm overflow-hidden transition-all"
              >
                {/* 手風琴 標題卡片 (預設簡潔檢視) */}
                <div
                  onClick={() => setExpandedMemberId(isExpanded ? null : member.id)}
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-[#F5EFE6]/40 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#E8C5C8]/30 border border-[#D1C6B4]/40 flex items-center justify-center font-bold text-lg text-[#4A4238] overflow-hidden shrink-0">
                      {member.avatar_url ? (
                        <img src={member.avatar_url} alt={member.userName} className="w-full h-full object-cover" />
                      ) : (
                        <span>{member.userName.charAt(0).toUpperCase()}</span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <AuthorName name={member.userName} className="font-bold text-base text-[#1A1612]" />
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${member.isRegistered ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                          {member.isRegistered ? '註冊會員' : '測驗訪客'}
                        </span>
                      </div>
                      <div className="text-xs text-[#4A4238]/50 mt-0.5">
                        加入時間：{new Date(member.joinedAt).toLocaleDateString('zh-TW')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex gap-3 text-xs text-[#4A4238]/60">
                      <span className="bg-[#F5EFE6] px-2.5 py-1 rounded-lg">💬 發言: {memberPosts.length}</span>
                      <span className="bg-[#F5EFE6] px-2.5 py-1 rounded-lg">📊 測驗: {memberQuizzes.length}</span>
                    </div>
                    <span className="text-lg text-[#4A4238]/40 transition-transform font-bold">
                      {isExpanded ? '▲ 收合' : '▼ 展開足跡'}
                    </span>
                  </div>
                </div>

                {/* 手風琴 展開細節區塊 */}
                {isExpanded && (
                  <div className="border-t border-[#D1C6B4]/20 p-6 bg-[#FDFBF7] animate-fade-in">
                    {/* 分頁按鈕 */}
                    <div className="flex gap-2 border-b border-[#D1C6B4]/30 pb-3 mb-4">
                      {(['bio', 'quiz', 'activity'] as const).map(tab => (
                        <button
                          key={tab}
                          onClick={() => setActiveSubTab(tab)}
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${activeSubTab === tab ? 'bg-[#D9B650] text-white shadow-sm' : 'bg-white text-[#4A4238]/70 hover:bg-[#F5EFE6]'}`}
                        >
                          {tab === 'bio' ? '📌 個人簡介' : tab === 'quiz' ? `📊 測驗分數 (${memberQuizzes.length})` : `🐾 活動足跡 (${memberPosts.length})`}
                        </button>
                      ))}
                    </div>

                    {/* 分頁內容 一：簡介與視窗照片 */}
                    {activeSubTab === 'bio' && (
                      <div className="space-y-4">
                        {/* 視窗封面照片預覽 */}
                        {member.cover_url && (
                          <div className="bg-white p-3 rounded-xl border border-[#D1C6B4]/20 space-y-2">
                            <span className="text-xs font-bold text-[#4A4238]/60 block">🖼️ 視窗封面照片 (Cover Photo)</span>
                            <div className="h-32 w-full rounded-lg overflow-hidden border border-[#D1C6B4]/30 bg-gray-50">
                              <img src={member.cover_url} alt="Cover Preview" className="w-full h-full object-cover" />
                            </div>
                          </div>
                        )}

                        <div className="bg-white p-4 rounded-xl border border-[#D1C6B4]/20">
                          <span className="text-xs font-bold text-[#4A4238]/50 block mb-1">自訂簡介 (Bio)</span>
                          <p className="text-sm text-[#4A4238] font-medium leading-relaxed">
                            {member.bio || '（該使用者尚未設定個人簡介）'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* 分頁內容 二：測驗歷史紀錄 */}
                    {activeSubTab === 'quiz' && (
                      <div className="space-y-3">
                        {memberQuizzes.length === 0 ? (
                          <div className="text-xs text-[#4A4238]/50 py-4 text-center">無歷史測驗紀錄</div>
                        ) : (
                          memberQuizzes.map((q, idx) => (
                            <div key={q.id || idx} className="bg-white p-4 rounded-xl border border-[#D1C6B4]/20">
                              <div className="flex justify-between items-center text-xs text-[#4A4238]/50 mb-2">
                                <span className="font-bold text-[#D9B650]">測驗紀錄 #{idx + 1}</span>
                                <span>{new Date(q.created_at || q.timestamp).toLocaleString('zh-TW')}</span>
                              </div>
                              {q.top_traits && (
                                <div className="flex flex-wrap gap-1.5">
                                  {q.top_traits.map((t: string) => (
                                    <span key={t} className="bg-[#E8C5C8]/20 text-[#4A4238] text-xs px-2.5 py-1 rounded-md font-bold">
                                      {TRAIT_LABELS[t] || t}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* 分頁內容 三：網站活動足跡 (留言與討論) */}
                    {activeSubTab === 'activity' && (
                      <div className="space-y-3">
                        {memberPosts.length === 0 ? (
                          <div className="text-xs text-[#4A4238]/50 py-4 text-center">無討論版發言紀錄</div>
                        ) : (
                          memberPosts.map((p, idx) => (
                            <div key={p.id || idx} className="bg-white p-4 rounded-xl border border-[#D1C6B4]/20">
                              <div className="flex justify-between items-center text-xs text-[#4A4238]/50 mb-1">
                                <span className="font-bold text-[#4A4238]">位置: {p.node_id}</span>
                                <span>{new Date(p.timestamp || p.created_at).toLocaleString('zh-TW')}</span>
                              </div>
                              <p className="text-sm font-medium text-[#4A4238]">{p.text}</p>
                              <div className="text-[10px] text-[#4A4238]/40 mt-2">👍 獲得按讚: {p.upvotes || 0} 次</div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
