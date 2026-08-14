"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getAuthHeaders } from '@/lib/authHeaders';
import { Comment, BlueBirdBadge } from '@/components/Comment';
import { getPostActivityScore, getWafuColor } from '@/lib/constants';
import type { DiscussionPost } from '@/lib/types';
import { useSupabaseSync } from '@/hooks/useSupabaseSync';
import { QuizResultPhase } from './quiz/QuizResultPhase';
import { useQuizConfig } from './QuizContext';
import { parseDiscussionDate } from '@/lib/contentModel';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, PolarRadiusAxis } from 'recharts';

interface UserProfile {
  userName: string;
  joinedAt: string;
  topTrait: string;
  totalComments: number;
  totalUpvotes: number;
  hotPosts: DiscussionPost[];
  latestPosts: DiscussionPost[];
  quizScores?: any;
  quizAiAnalysis?: string;
  avatarUrl?: string;
  coverUrl?: string;
}

export default function ProfileModal({ 
  userName, 
  userId,
  isGuest,
  onClose,
  onJump,
  onNameChange
}: { 
  userName: string; 
  userId?: string | null;
  isGuest?: boolean;
  onClose: () => void;
  onJump?: (nodeId: string, postId: string) => void;
  onNameChange?: (newName: string) => void;
}) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayUserName, setDisplayUserName] = useState(userName);
  const [bio, setBio] = useState('');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [layoutConfig, setLayoutConfig] = useState<any>(null);
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editCoverUrl, setEditCoverUrl] = useState('');
  const [editUserName, setEditUserName] = useState('');
  const [gender, setGender] = useState('secret');
  const [bdsmRole, setBdsmRole] = useState('Switch');
  const { nodesData } = useSupabaseSync();
  const { traits, axes } = useQuizConfig();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const cleanName = displayUserName
          .replace(/ ☑️/g, '')
          .replace(/ 👻/g, '')
          .replace(/ 玩家/g, '')
          .replace(/ 訪客/g, '')
          .replace(/ 守門人/g, '')
          .trim();
        
        const safeQueryKey = cleanName ? `user_${cleanName}` : 'user_guest';
        const { data: quizDataArray } = await supabase.from('quiz_content').select('content').eq('key_name', safeQueryKey);
        const quizData = quizDataArray?.[0];
        
        // 兼容各種名稱變體，使用 PostgREST .in 安全過濾，避免 400 錯誤
        const candidateNames = Array.from(new Set([
          displayUserName,
          cleanName,
          `${cleanName} ☑️`,
          `${cleanName} 👻`,
          `${cleanName} 玩家`,
          `${cleanName} 訪客`
        ])).filter(Boolean);

        const { data: profileDatas } = await supabase
          .from('profiles')
          .select('*')
          .in('username', candidateNames);
          
        const profileData = profileDatas?.[0];

        let fetchedBio = '';
        let fetchedAvatarUrl = '';
        let fetchedCoverUrl = '';
        let fetchedGender = 'secret';
        let fetchedBdsmRole = 'Switch';
        let joinedAt = '';

        if (profileData) {
          fetchedBio = profileData.bio || '';
          fetchedAvatarUrl = profileData.avatar_url || '';
          // 從 profiles 表讀取 gender 和 bdsm_role
          if (profileData.gender) fetchedGender = profileData.gender;
          if (profileData.bdsm_role) fetchedBdsmRole = profileData.bdsm_role;
        }

        if (!fetchedBio && quizData?.content?.bio) fetchedBio = quizData.content.bio;
        if (!fetchedAvatarUrl && quizData?.content?.avatarUrl) fetchedAvatarUrl = quizData.content.avatarUrl;
        if (!fetchedCoverUrl && quizData?.content?.coverUrl) fetchedCoverUrl = quizData.content.coverUrl;
        // 備用從 quiz_content 讀取 gender/bdsmRole
        if (fetchedGender === 'secret' && quizData?.content?.gender) fetchedGender = quizData.content.gender;
        if (fetchedBdsmRole === 'Switch' && quizData?.content?.bdsmRole) fetchedBdsmRole = quizData.content.bdsmRole;

        setBio(fetchedBio);
        setEditAvatarUrl(fetchedAvatarUrl);
        setEditCoverUrl(fetchedCoverUrl);
        setGender(fetchedGender);
        setBdsmRole(fetchedBdsmRole);
        
        // 優先從 profiles 的 created_at 獲取加入時間，格式化為 zh-TW
        const rawDate = profileData?.created_at || quizData?.content?.joinedAt;
        joinedAt = rawDate ? new Date(rawDate).toLocaleDateString('zh-TW') : new Date().toLocaleDateString('zh-TW');

        let topTrait = quizData?.content?.top_trait || '尚未測驗';
        let quizScores = quizData?.content?.scores || null;
        let quizAiAnalysis = quizData?.content?.aiAnalysis || '';

        // 查發言/留言 (使用 .in 安全查詢)
        const { data: dbComments } = await supabase
          .from('discussions')
          .select('*')
          .in('author', candidateNames);
        
        let totalUpvotes = 0;
        let posts: DiscussionPost[] = [];
        
        if (dbComments) {
          posts = dbComments.map(d => {
            const n = nodesData.find(gn => gn.id === d.node_id);
            let nodeName = n?.label || '未知節點';
            let nodeColor = n?.color || '#E8C5C8';
            if (d.node_id === 'lobby_chat') {
              nodeName = '即時聊天';
            } else if (d.node_id === 'lobby_board') {
              nodeName = '討論交流';
            }
            return {
              id: d.id, author: d.author, text: d.text, upvotes: d.upvotes || 0, timestamp: Number(d.timestamp),
              replies: d.replies || [], emojis: d.emojis || [],
              nodeId: d.node_id, nodeName, nodeColor: getWafuColor(nodeColor)
            };
          });
          totalUpvotes = dbComments.reduce((acc, c) => acc + (c.upvotes || 0), 0);
        }
        
        const totalComments = posts.length;
        const latestPosts = [...posts].sort((a, b) => (parseDiscussionDate(b.timestamp)?.getTime() || 0) - (parseDiscussionDate(a.timestamp)?.getTime() || 0)).slice(0, 5);
        const hotPosts = [...posts].sort((a, b) => getPostActivityScore(b) - getPostActivityScore(a) || (parseDiscussionDate(b.timestamp)?.getTime() || 0) - (parseDiscussionDate(a.timestamp)?.getTime() || 0)).slice(0, 5);

        setProfile({
          userName: cleanName,
          joinedAt,
          topTrait,
          totalComments,
          totalUpvotes,
          hotPosts,
          latestPosts,
          quizScores,
          quizAiAnalysis,
          avatarUrl: fetchedAvatarUrl,
          coverUrl: fetchedCoverUrl
        });
        
        // 優先讀取使用者專屬設定的 layout mode
        const { data: userConfigArray } = await supabase.from('quiz_content').select('content').eq('key_name', `user_${cleanName}`);
        const userContent = userConfigArray?.[0]?.content as any;
        const userLayoutMode = userContent?.layout || 'two-column';

        // 完全 100% 讀取與同步後台在「視覺佈局編輯」所設定、儲存的模組順序與可見度
        const { data: layoutDataArray } = await supabase.from('quiz_content').select('content').eq('key_name', 'profile_layout');
        const layoutData = layoutDataArray?.[0];
        if (layoutData?.content) {
          setLayoutConfig(layoutData.content);
        }

      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (nodesData.length > 0) {
      fetchProfile();
    }
  }, [userName, nodesData]);

  useEffect(() => {
    if (isEditingBio && profile) {
      setEditAvatarUrl(profile.avatarUrl || '');
      setEditCoverUrl(profile.coverUrl || '');
    }
  }, [isEditingBio, profile]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      // 將圖片轉為 base64，透過我們自己的 API 上傳，繞過 RLS 限制
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target?.result as string;
        const res = await fetch('/api/uploadImage', {
          method: 'POST',
          headers: await getAuthHeaders(),
          body: JSON.stringify({ 
            base64, 
            fileName: `${(userId || userName.replace(/[^a-zA-Z0-9]/g, '_'))}-${Date.now()}.${file.name.split('.').pop()}` 
          })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || '上傳失敗');
        }
        const { url } = await res.json();
        if (type === 'avatar') setEditAvatarUrl(url);
        if (type === 'cover') setEditCoverUrl(url);
      };
      reader.onerror = () => { alert('讀取檔案失敗'); };
      reader.readAsDataURL(file);
    } catch(err: any) {
      alert("上傳失敗: " + err.message);
    }
  };

  const handleSaveBio = async () => {
    if (!userName) return; // 只要有名字就讓客人也可以改
    setIsEditingBio(false);
    
    const oldName = userName;
    let baseNewName = editUserName.trim();
    if (!baseNewName) baseNewName = oldName.replace(' ☑️', '').replace(' 👻', '').trim();
    const newNameWithSuffix = baseNewName + (oldName.includes('☑️') ? ' ☑️' : ' 👻');
    
    const targetName = (baseNewName && newNameWithSuffix !== oldName) ? newNameWithSuffix : userName;
    
    // If name changed, rename globally first
    if (targetName !== oldName) {
      try {
        // 登入用戶也更新 Supabase Auth 的 display_name
        if (!isGuest && userId) {
          await supabase.auth.updateUser({ data: { display_name: baseNewName } });
        }
        const res = await fetch('/api/renameUser', {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify({ oldName, newName: targetName })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          alert('修改名稱失敗：' + (errData?.error || '請稍後再試或重新整理網頁。'));
          return;
        }
        // 更新 localStorage（訪客和登入用戶都要更新）
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('kinkflow_user', targetName);
        }
        if (onNameChange) {
            onNameChange(targetName);
        }
      } catch (err: any) {
        console.error('Failed to rename user:', err);
        alert('修改名稱發生錯誤：' + err.message);
        return;
      }
    }

    // Save bio, avatar and cover to profiles and quiz_content via API
    try {
      const updateRes = await fetch('/api/updateProfile', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ userId, targetName, bio, editAvatarUrl, editCoverUrl, gender, bdsmRole })
      });
      if (!updateRes.ok) {
        const errorText = await updateRes.text();
        throw new Error(errorText);
      }
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      alert('更新個人資料發生錯誤：' + err.message + '\n\n請聯絡管理員確認 RLS (資料庫權限) 或 Service Key 設定。');
      return;
    }
    
    // Update local profile & trigger refetch
    setDisplayUserName(targetName);
    const cleanTargetName = targetName.replace(' ☑️', '').replace(' 👻', '').trim();
    setProfile(prev => prev ? { ...prev, userName: cleanTargetName, avatarUrl: editAvatarUrl, coverUrl: editCoverUrl } : prev);
  };

  const traitNode = nodesData.find(n => n.id === profile?.topTrait);
  const themeColor = traitNode?.color || '#E8C5C8';
  
  const theme = layoutConfig?.theme || 'default';
  const pStyle = layoutConfig?.profileStyle || 'morandi-classic';
  
  let containerStyle = {};
  let containerClass = "rounded-[2.5rem] w-full max-w-4xl shadow-2xl relative animate-slide-up border-2 transition-all flex flex-col overflow-hidden";
  
  if (pStyle === 'moonlight-gold') {
    // 月映波濤柔黑 (柔和黑金夜月)
    containerClass += " bg-[#262B33] text-[#F3F4F6] border-[#D9B650]/80 shadow-[0_0_40px_rgba(217,182,80,0.2)]";
  } else if (pStyle === 'sakura-wave') {
    // 櫻吹雪浮世雲煙
    containerClass += " bg-[#FFF5F7] text-[#831843] border-[#F472B6]/60 shadow-[0_0_30px_rgba(244,114,182,0.15)]";
  } else if (pStyle === 'ukiyo-wave') {
    // 浮世青海雙波
    containerClass += " bg-[#F1F5F9] text-[#1E3A8A] border-[#3B82F6]/50 shadow-[0_0_30px_rgba(59,130,246,0.15)]";
  } else {
    // 莫蘭迪和風印記 (預設)
    containerClass += " bg-[#FDFBF7] text-[#4A4238] border-[#B5C4B1] shadow-2xl";
  }

  return (
    <>
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm animate-fade-in overflow-y-auto" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center p-4 md:p-8">
        <div className={containerClass} style={containerStyle} onClick={e => e.stopPropagation()}>

        
        {(() => {
          const renderModule = (mod: any) => {
            if (mod.id === 'header') {
              const currentCover = isEditingBio ? editCoverUrl : (profile?.coverUrl || '');
              const currentAvatar = isEditingBio ? editAvatarUrl : (profile?.avatarUrl || '');
              
              const isDarkStyle = pStyle === 'moonlight-gold';
              return (
                <div key={mod.id} className="relative w-full">
                  {/* Cover Photo */}
                  <div className="h-48 md:h-64 w-full relative bg-gradient-to-br from-[#D9B650] via-[#E8C5C8] to-[#C5D4B6] overflow-hidden">
                    {currentCover && (
                      <img 
                        src={currentCover} 
                        alt="Cover" 
                        className="w-full h-full object-cover" 
                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                    )}
                    {isEditingBio && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <label className="cursor-pointer bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-4 py-2 rounded-xl font-bold transition-all">
                          📸 更換視窗照片
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'cover')} />
                        </label>
                      </div>
                    )}
                  </div>
                  
                  {/* Avatar & Info */}
                  <div className="px-6 md:px-8 pb-4 relative">
                    <div className="flex items-end -mt-12 mb-4 relative z-20 gap-4">
                      {/* Avatar (Bottom left) */}
                      <div className="relative group shrink-0">
                        <div className={`w-24 h-24 md:w-32 md:h-32 bg-white dark:bg-black/20 dark:border-[#4A4238] dark:bg-white/5 dark:border-white/10 rounded-full flex items-center justify-center text-5xl border-4 shadow-xl overflow-hidden`} style={{ borderColor: themeColor }}>
                          {currentAvatar ? (
                            <img 
                              src={currentAvatar} 
                              alt="Avatar" 
                              className="w-full h-full object-cover" 
                              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                            />
                          ) : (
                            <span className="drop-shadow-sm">{(userName || '').includes('☑️') ? '👤' : '👻'}</span>
                          )}
                        </div>
                        {isEditingBio && (
                          <label className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white text-xs font-bold text-center">更換<br/>頭像</span>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'avatar')} />
                          </label>
                        )}
                      </div>
                      
                      <div className="flex-1 pb-2 min-w-0">
                        {isEditingBio ? (
                          <div className="flex items-center gap-2 mb-1">
                            <input
                              type="text"
                              value={editUserName}
                              onChange={(e) => setEditUserName(e.target.value)}
                              placeholder="您的稱呼"
                              className="px-3 py-1.5 rounded-lg border border-[#D1C6B4]/50 focus:border-[#C5D4B6] outline-none text-[#4A4238] dark:text-[#E5DCD0] font-bold text-xl bg-white/60 dark:bg-black/40 w-full shadow-sm"
                            />
                          </div>
                        ) : (
                          <h2 className={`text-xl sm:text-2xl font-black flex items-center gap-2 drop-shadow-md whitespace-nowrap flex-wrap ${isDarkStyle ? 'text-[#FDFBF7]' : 'text-[#1A1612]'}`}>
                            <span>{profile?.userName || userName}</span>
                            {userId && !isGuest && (
                              <button onClick={() => { setEditUserName((profile?.userName || userName).replace(' ☑️', '').replace(' 👻', '').trim()); setIsEditingBio(true); }} className="text-xs px-2.5 py-1 bg-[#D9B650] text-[#1A1612] font-black rounded-full hover:scale-105 transition-transform flex items-center gap-1 shadow-xs shrink-0">
                                <span>✏️</span><span>編輯</span>
                              </button>
                            )}
                          </h2>
                        )}
                         {profile?.joinedAt && (
                           <p className="text-xs sm:text-sm text-[#1A1612] font-black mt-1 whitespace-nowrap bg-[#D9B650] px-3 py-1 rounded-full inline-block shadow-xs">加入時間：{profile.joinedAt}</p>
                         )}
                      </div>
                    </div>
                    
                  {/* Bio & Identity Tags */}
                  <div className="mt-3">
                    {isEditingBio ? (
                      <div className="space-y-3 bg-white/40 dark:bg-black/30 p-4 rounded-2xl border border-[#D1C6B4]/40">
                        <div>
                          <label className="text-xs font-black text-[#1A1612] dark:text-[#E5DCD0] mb-1.5 block">🚻 性別 / 性向標籤：</label>
                          <div className="flex gap-2 flex-wrap">
                            {[
                              { id: 'male', label: '♂️ 男性' },
                              { id: 'female', label: '♀️ 女性' },
                              { id: 'nonbinary', label: '⚧️ 非二元/跨性別' },
                              { id: 'secret', label: '🔒 不透漏' }
                            ].map(g => (
                              <button
                                key={g.id}
                                type="button"
                                onClick={() => setGender(g.id)}
                                className={`px-3 py-1 rounded-full text-xs font-black transition-all border ${gender === g.id ? 'bg-[#1A1612] text-white border-[#1A1612] shadow-xs' : 'bg-white text-[#4A4238] border-[#D1C6B4]/60'}`}
                              >
                                {g.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-black text-[#1A1612] dark:text-[#E5DCD0] mb-1.5 block">⚡ BDSM 屬性身份：</label>
                          <div className="flex gap-2 flex-wrap">
                            {[
                              { id: 'S', label: '👑 S / 支配者' },
                              { id: 'D', label: '♟️ D / 領導者' },
                              { id: 'Sub', label: '🧎 Sub / 臣服者' },
                              { id: 'Maso', label: '🥀 M / 承受者' },
                              { id: 'Switch', label: '☯️ Switch / 雙向' },
                              { id: 'Observer', label: '👁️ Observer / 觀測' }
                            ].map(r => (
                              <button
                                key={r.id}
                                type="button"
                                onClick={() => setBdsmRole(r.id)}
                                className={`px-3 py-1 rounded-full text-xs font-black transition-all border ${bdsmRole === r.id ? 'bg-[#D9B650] text-[#1A1612] border-[#D9B650] shadow-xs' : 'bg-white text-[#4A4238] border-[#D1C6B4]/60'}`}
                              >
                                {r.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <textarea
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          className="w-full p-3 rounded-xl border border-[#D1C6B4] bg-white/70 focus:bg-white dark:bg-black/40 text-[#1A1612] dark:text-[#E5DCD0] font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#D9B650] resize-none h-24"
                          placeholder="寫些什麼來介紹自己吧..."
                        />
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => { setIsEditingBio(false); setBio((profile as any)?.bio || ''); }} className="px-4 py-2 text-[#4A4238]/60 dark:text-[#E5DCD0]/60 font-bold hover:bg-black/5 rounded-xl transition-colors">
                            取消
                          </button>
                          <button onClick={handleSaveBio} className="px-6 py-2 bg-[#4A4238] text-white rounded-xl font-bold hover:bg-[#5a5248] transition-all shadow-sm flex items-center gap-2">
                            💾 儲存名片設定
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* 顯示身份標籤 */}
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="px-3 py-1 rounded-full text-xs font-black bg-[#1A1612] text-[#FDFBF7] shadow-xs border border-[#1A1612]">
                            {gender === 'male' ? '♂️ 男性' : gender === 'female' ? '♀️ 女性' : gender === 'nonbinary' ? '⚧️ 非二元' : '🔒 不透漏'}
                          </span>
                          <span className="px-3 py-1 rounded-full text-xs font-black bg-[#D9B650] text-[#1A1612] shadow-xs border border-[#D9B650]">
                            {bdsmRole === 'S' ? '👑 S / 支配者' : bdsmRole === 'D' ? '♟️ D / 領導者' : bdsmRole === 'Sub' ? '🧎 Sub / 臣服者' : bdsmRole === 'Maso' ? '🥀 M / 承受者' : bdsmRole === 'Switch' ? '☯️ Switch / 雙向' : '👁️ 觀測者'}
                          </span>
                        </div>

                        <p className={`whitespace-pre-wrap leading-relaxed font-bold text-sm sm:text-base ${isDarkStyle ? 'text-[#FDFBF7]' : 'text-[#1A1612]'}`}>
                          {bio || <span className="opacity-60 italic">尚未填寫個人簡介</span>}
                        </p>
                      </div>
                    )}
                  </div>
                  </div>
                </div>
              );
            }

            if (mod.id === 'stats') {
              const isDarkStyle = pStyle === 'moonlight-gold';
              const cardBg = isDarkStyle ? 'bg-[#1E232A] border-[#3F4652]' : 'bg-white/70 border-[#D1C6B4]/40';
              const subText = isDarkStyle ? 'text-[#94A3B8]' : 'text-[#4A4238]/70';
              const valText = isDarkStyle ? 'text-[#F3F4F6]' : 'text-[#362E25]';
              return (
                <div key={mod.id} className="space-y-3">
                  <div className={`p-3.5 rounded-2xl flex justify-between items-center border shadow-2xs ${cardBg}`}>
                    <span className={`text-xs font-bold ${subText}`}>註冊時間</span>
                    <span className={`font-black text-sm ${valText}`}>{profile?.joinedAt}</span>
                  </div>
                  <div className={`p-3.5 rounded-2xl flex justify-between items-center border shadow-2xs ${cardBg}`}>
                    <span className={`text-xs font-bold ${subText}`}>最高傾向特質</span>
                    <span className="font-black text-sm text-[#D9B650]">{profile?.topTrait}</span>
                  </div>
                  <div className="flex gap-3">
                    <div className={`p-3.5 rounded-2xl flex-1 text-center border shadow-2xs ${cardBg}`}>
                      <div className="text-2xl font-black text-[#D9B650]">{profile?.totalComments}</div>
                      <div className={`text-[11px] font-bold mt-0.5 ${subText}`}>累積發言</div>
                    </div>
                    <div className={`p-3.5 rounded-2xl flex-1 text-center border shadow-2xs ${cardBg}`}>
                      <div className="text-2xl font-black text-[#D9B650]">{profile?.totalUpvotes}</div>
                      <div className={`text-[11px] font-bold mt-0.5 ${subText}`}>獲得讚數</div>
                    </div>
                  </div>
                </div>
              );
            }

            if (mod.id === 'hot_posts' && profile && profile.hotPosts.length > 0) {
              return (
                <div key={mod.id} className="pt-2">
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5"><span className="text-[#E08A8A]">🔥</span> 最熱門發言 (Top 5)</h3>
                  <div className="space-y-3">
                    {profile.hotPosts.map((p, i) => (
                      <div key={`hot_${p.id}_${i}`} className="relative group">
                        <div className="absolute -left-1 top-3 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold z-10 bg-gradient-to-br from-[#D9B650] to-[#E8C5C8] text-white shadow-sm">{i+1}</div>
                        <div className="pl-7">
                          <Comment post={p} hideActions={true} hideReplies={true} nodeColor={(p as any).nodeColor} currentUserName={userName} theme={pStyle === 'moonlight-gold' ? 'dark' : 'light'} />
                          <button onClick={() => { onClose(); if (onJump && p.nodeId) onJump(p.nodeId, p.id.toString()); }} className="absolute bottom-3 right-3 text-[10px] bg-[#E8C5C8] text-white font-bold px-3 py-1.5 rounded-full shadow-sm hover:bg-[#D47A7A] opacity-90 group-hover:opacity-100 transition-opacity">前往參與 ➔</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            if (mod.id === 'latest_posts' && profile && profile.latestPosts.length > 0) {
              return (
                <div key={mod.id} className="mt-4 pt-4 border-t border-[#D1C6B4]/30">
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5"><span className="text-[#89A090]">🕒</span> 最新留言 (Top 5)</h3>
                  <div className="space-y-3">
                    {profile.latestPosts.map((p, i) => (
                      <div key={`latest_${p.id}_${i}`} className="relative group">
                        <Comment post={p} hideActions={true} hideReplies={true} nodeColor={(p as any).nodeColor} currentUserName={userName} theme={pStyle === 'moonlight-gold' ? 'dark' : 'light'} />
                        <button onClick={() => { onClose(); if (onJump && p.nodeId) onJump(p.nodeId, p.id.toString()); }} className="absolute bottom-3 right-3 text-[10px] bg-[#E8C5C8] text-white font-bold px-3 py-1.5 rounded-full shadow-sm hover:bg-[#D47A7A] opacity-90 group-hover:opacity-100 transition-opacity">前往參與 ➔</button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            if (mod.id === 'quiz_result' && profile?.quizScores) {
              return (
                <div key={mod.id} className="mt-6 pt-4 border-t border-[#D1C6B4]/30 flex justify-center">
                  <button
                    onClick={() => setShowResult(true)}
                    className="w-full bg-[#4A4238] text-white py-3 rounded-xl font-bold hover:bg-[#5a5248] transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    📊 查看測驗結果
                  </button>
                </div>
              );
            }

            if (mod.id === 'radar') {
              const hasScores = profile?.quizScores && Object.keys(profile.quizScores).length > 0;
              const radarData = axes.map((axis: any) => {
                let total = 0;
                let count = 0;
                const axisTraits = Object.entries(traits).filter(([_, v]: [string, any]) => v.axis === axis.id).map(([k]) => k);
                axisTraits.forEach(k => {
                  if (profile?.quizScores?.[k] !== undefined) {
                    total += profile.quizScores[k];
                    count++;
                  }
                });
                const avg = count > 0 ? total / count : 0;
                return {
                  subject: axis.name,
                  A: hasScores ? Math.round(avg) : 50,
                  fullMark: 100,
                };
              });

              return (
                <div key={mod.id} className="mt-4 pt-4 border-t border-[#D1C6B4]/30">
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5"><span className="text-[#89A090]">📊</span> 偏好雷達圖 (10大屬性分析)</h3>
                  <div className="h-[250px] w-full bg-[#FDFBF7] rounded-2xl border border-[#D1C6B4]/60 p-2 relative overflow-hidden shadow-xs">
                    {!hasScores && (
                      <div className="absolute inset-0 bg-[#1A1612]/85 backdrop-blur-xs z-20 flex flex-col items-center justify-center p-4 text-center">
                        <span className="text-3xl mb-2">📊</span>
                        <p className="text-sm font-black text-white">尚未進行 BDSM 屬性測驗</p>
                        <p className="text-xs text-white/90 font-medium mt-1.5 mb-4">測驗後將解鎖您的專屬 10 大屬性雷達分析圖！</p>
                        <button
                          onClick={() => {
                            onClose();
                            // 標準安全 DOM 尋找，防止 SyntaxError 語法錯誤
                            const allBtns = Array.from(document.querySelectorAll('button'));
                            const quizBtn = allBtns.find(b => b.textContent?.includes('開始測驗') || b.textContent?.includes('性向測驗')) as HTMLElement;
                            if (quizBtn) {
                              quizBtn.click();
                            } else {
                              window.dispatchEvent(new CustomEvent('open_quiz_modal'));
                            }
                          }}
                          className="px-4 py-2 bg-[#E8C5C8] hover:bg-[#D47A7A] text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
                        >
                          👑 立即開始測驗
                        </button>
                      </div>
                    )}
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                        <PolarGrid stroke="#D1C6B4" strokeDasharray="3 3" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#4A4238', fontSize: 10, fontWeight: 'bold' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="Score" dataKey="A" stroke={themeColor} fill={themeColor} fillOpacity={hasScores ? 0.4 : 0.15} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            }

            return null;
          };

          // 100% 忠實呈現後台「視覺佈局編輯」所設定、儲存的模組順序與可見度
          let modulesToRender = layoutConfig?.modules;

          if (!modulesToRender || modulesToRender.length === 0) {
            modulesToRender = [
              { id: 'header', column: 'full', visible: true, order: 0 },
              { id: 'stats', column: 'left', visible: true, order: 1 },
              { id: 'radar', column: 'left', visible: true, order: 2 },
              { id: 'hot_posts', column: 'right', visible: true, order: 3 },
              { id: 'latest_posts', column: 'right', visible: true, order: 4 },
              { id: 'quiz_result', column: 'right', visible: true, order: 5 }
            ];
          }

          const elements: any[] = [];
          let currentColumns: any = { left: [], right: [] };
          
          modulesToRender.sort((a: any, b: any) => a.order - b.order).forEach((mod: any) => {
            if (!mod.visible) return;
            // header 始終強制全寬滿版
            if (mod.id === 'header' || mod.column === 'full') {
              if (currentColumns.left.length || currentColumns.right.length) {
                elements.push({...currentColumns});
                currentColumns = { left: [], right: [] };
              }
              elements.push({ ...mod, column: 'full' });
            } else if (mod.column === 'left') {
              currentColumns.left.push(mod);
            } else {
              currentColumns.right.push(mod);
            }
          });
          if (currentColumns.left.length || currentColumns.right.length) {
            elements.push({...currentColumns});
          }

          return (
            <div className="flex flex-col w-full relative z-10 pb-8">
              <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full font-bold z-[60] backdrop-blur-sm transition-all w-8 h-8 flex items-center justify-center shadow-sm border border-white/20">✕</button>
              
              {loading ? (
                <div className="flex justify-center p-12 relative z-10"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: themeColor, borderTopColor: 'transparent' }}></div></div>
              ) : (
                <div className="flex flex-col gap-6 w-full">
                  {elements.map((el, i) => {
                    if (el.id) {
                      return (
                        <div key={el.id} className="w-full relative z-10 overflow-hidden">
                          {renderModule(el)}
                        </div>
                      );
                    }
                    
                    // 檢查右欄是否有可渲染的有效模組
                    const hasRightContent = el.right.some((m: any) => {
                      if (m.id === 'latest_posts') return profile && profile.latestPosts.length > 0;
                      if (m.id === 'hot_posts') return profile && profile.hotPosts.length > 0;
                      if (m.id === 'quiz_result') return profile && profile.quizScores;
                      if (m.id === 'radar') return true; // 雷達圖無數據時也會呈現解鎖佔位符，常駐顯示
                      return false;
                    });

                    return (
                      <div key={i} className="flex flex-col md:flex-row gap-6 w-full px-6 md:px-8">
                        <div className={`w-full space-y-6 relative z-10 ${hasRightContent ? 'flex-1' : 'w-full'}`}>
                          {el.left.map((m: any) => renderModule(m))}
                        </div>
                        {hasRightContent && (
                          <div className="flex-[1.5] w-full space-y-6 relative z-10">
                            {el.right.map((m: any) => renderModule(m))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
        </div>
      </div>
    </div>
    {showResult && profile?.quizScores && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto" onClick={(e) => { e.stopPropagation(); setShowResult(false); }}>
          <div className="bg-[#FDFBF7] rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative shadow-2xl my-8" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowResult(false)} className="absolute top-4 right-4 p-2 bg-black/5 hover:bg-black/10 text-[#4A4238] dark:text-[#E5DCD0] rounded-full font-bold z-50 transition-colors">✕</button>
            <div className="p-4 sm:p-8">
              <h2 className="text-2xl font-bold text-center mb-6">{profile.userName} 的靈魂印記</h2>
              <div className="pointer-events-none">
                <QuizResultPhase 
                  scores={profile.quizScores}
                  aiAnalysis={profile.quizAiAnalysis || '無分析紀錄'}
                  isAiLoading={false}
                  onRestart={() => {}}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
