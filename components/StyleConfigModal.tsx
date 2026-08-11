"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface StyleConfigModalProps {
  userName: string;
  userId?: string | null;
  onClose: () => void;
  onThemeChange?: (theme: string) => void;
  onLayoutChange?: (layout: string) => void;
}

interface LayoutModule {
  id: string;
  name: string;
  visible: boolean;
  order: number;
  column: 'left' | 'right' | 'full';
}

const DEFAULT_MODULES: LayoutModule[] = [
  { id: 'header', name: '用戶基本資料卡 (Header)', visible: true, order: 0, column: 'full' },
  { id: 'stats', name: '個人數據統計 (Stats)', visible: true, order: 1, column: 'left' },
  { id: 'radar', name: '10大屬性雷達圖 (Radar Chart)', visible: true, order: 2, column: 'left' },
  { id: 'hot_posts', name: '最熱門發言 (Top 5 Hot Posts)', visible: true, order: 3, column: 'right' },
  { id: 'latest_posts', name: '最新留言紀錄 (Top 5 Latest)', visible: true, order: 4, column: 'right' },
  { id: 'quiz_result', name: '查看測驗結果按鈕 (Quiz Result)', visible: true, order: 5, column: 'right' }
];

export default function StyleConfigModal({
  userName,
  onClose,
  onThemeChange,
  onLayoutChange
}: StyleConfigModalProps) {
  const [activeTab, setActiveTab] = useState<'theme' | 'layout'>('theme');
  const [currentTheme, setCurrentTheme] = useState('morandi');
  const [profileStyle, setProfileStyle] = useState('morandi-classic');
  const [modules, setModules] = useState<LayoutModule[]>(DEFAULT_MODULES);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const cleanName = userName.replace(/ ☑️/g, '').replace(/ 👻/g, '').trim();

  useEffect(() => {
    // 讀取既有 profile_layout 設定 (包含個人簡介風格 profileStyle)
    async function loadConfig() {
      try {
        const { data: layoutDataArray } = await supabase.from('quiz_content').select('content').eq('key_name', 'profile_layout');
        const layoutData = layoutDataArray?.[0]?.content as any;
        if (layoutData) {
          if (layoutData.profileStyle) setProfileStyle(layoutData.profileStyle);
          if (layoutData.modules) {
            const merged = DEFAULT_MODULES.map(defMod => {
              const found = layoutData.modules.find((m: any) => m.id === defMod.id);
              return found ? { ...defMod, visible: found.visible, order: found.order ?? defMod.order, column: found.column || defMod.column } : defMod;
            }).sort((a, b) => a.order - b.order);
            setModules(merged);
          }
        }

        const { data: userConfigArray } = await supabase.from('quiz_content').select('content').eq('key_name', `user_${cleanName}`);
        const userContent = userConfigArray?.[0]?.content as any;
        if (userContent?.theme) setCurrentTheme(userContent.theme);
        if (userContent?.profileStyle) setProfileStyle(userContent.profileStyle);
      } catch (e) {
        console.error(e);
      }
    }
    loadConfig();
  }, [cleanName]);

  const applyThemeToDom = (theme: string) => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'gothic' || theme === 'midnight') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggleModule = (id: string) => {
    setModules(prev => prev.map(m => m.id === id ? { ...m, visible: !m.visible } : m));
  };

  const toggleColumn = (id: string) => {
    setModules(prev => prev.map(m => {
      if (m.id === id) {
        const nextCol = m.column === 'left' ? 'right' : m.column === 'right' ? 'full' : 'left';
        return { ...m, column: nextCol as any };
      }
      return m;
    }));
  };

  const moveModule = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === modules.length - 1)) return;
    const newModules = [...modules];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    
    const tempOrder = newModules[index].order;
    newModules[index].order = newModules[swapIndex].order;
    newModules[swapIndex].order = tempOrder;
    
    newModules.sort((a, b) => a.order - b.order);
    setModules(newModules);
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      // 100% 寫入全局 profile_layout，使前台個人簡介排版與簡介風格 100% 與後台同步！
      await supabase.from('quiz_content').upsert({
        key_name: 'profile_layout',
        content: {
          theme: currentTheme,
          profileStyle: profileStyle,
          modules: modules
        }
      }, { onConflict: 'key_name' });

      // 讀取個人設定再合併主題與簡介風格
      const { data: existingArr } = await supabase.from('quiz_content').select('content').eq('key_name', `user_${cleanName}`);
      const existing = existingArr?.[0]?.content || {};

      await supabase.from('quiz_content').upsert({
        key_name: `user_${cleanName}`,
        content: { ...existing, theme: currentTheme, profileStyle: profileStyle, updatedAt: new Date().toISOString() }
      }, { onConflict: 'key_name' });

      applyThemeToDom(currentTheme);

      setMsg('✨ 個人簡介視覺排版已成功儲存！');
      if (onThemeChange) onThemeChange(currentTheme);
      setTimeout(() => onClose(), 800);
    } catch (err: any) {
      setMsg('❌ 儲存失敗：' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-[#FDFBF7] dark:bg-[#1A1816] text-[#4A4238] dark:text-[#E5DCD0] w-full max-w-2xl rounded-3xl border-2 border-[#D1C6B4]/50 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-[#D1C6B4]/30 flex justify-between items-center bg-[#F5EFE6] dark:bg-black/20 pr-12 relative">
          <div>
            <h2 className="text-base sm:text-xl font-black flex items-center gap-2 flex-wrap">
              <span>🎨</span> 風格與視覺佈局
            </h2>
            <p className="text-[11px] sm:text-xs opacity-70 mt-1">控制主題配色與個人簡介模組排版</p>
          </div>
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 dark:bg-white/10 flex items-center justify-center font-bold text-sm cursor-pointer shrink-0">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#D1C6B4]/30 px-4 sm:px-6 pt-3 bg-[#F5EFE6]/50 dark:bg-black/10 gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'theme', label: '🎨 網站主題配色' },
            { id: 'layout', label: '📐 個人簡介模組排版' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-4 sm:px-5 py-2.5 sm:py-3 rounded-t-xl text-xs sm:text-sm font-black transition-all -mb-px border-2 cursor-pointer shrink-0 ${
                activeTab === t.id
                  ? 'bg-[#1A1612] text-[#FDFBF7] border-[#D9B650] border-b-transparent shadow-md'
                  : 'bg-[#E5DCD0] text-[#1A1612] border-[#D1C6B4] hover:bg-[#D9B650]/20'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
          
          {/* Tab 1: 主題配色 */}
          {activeTab === 'theme' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold opacity-80 mb-3">1. 選擇全站主視覺配色主題：</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'morandi', name: '🍵 莫蘭迪抹茶和風', color: '#B5C4B1', bg: '#E6DFD5', desc: '和風竹編織紋 + 宣紙和紙' },
                    { id: 'sakura', name: '🌸 櫻吹海浪和風', color: '#F472B6', bg: '#FDF2F4', desc: '櫻吹雪與青海波浪 (參考圖1&4)' },
                    { id: 'ukiyo', name: '🌊 浮世繪青浪', color: '#3B82F6', bg: '#DCE5F0', desc: '經典魚鱗青海波 (參考圖2&3)' },
                    { id: 'moonlight', name: '🌙 月映波濤柔黑', color: '#D9B650', bg: '#1E232A', desc: '高質感月華金波 (柔和深色)' }
                  ].map(t => (
                    <div
                      key={t.id}
                      onClick={() => {
                        setCurrentTheme(t.id);
                        applyThemeToDom(t.id);
                      }}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                        currentTheme === t.id ? 'border-[#4A4238] dark:border-white shadow-md scale-[1.02]' : 'border-[#D1C6B4]/30 opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: t.bg }}
                    >
                      <div className="w-8 h-8 rounded-full border-2 border-white/60 shrink-0 shadow-sm" style={{ backgroundColor: t.color }} />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-black block" style={{ color: t.id === 'moonlight' ? '#FFFFFF' : '#1A1612' }}>{t.name}</span>
                        <span className="text-[10px] block truncate font-medium" style={{ color: t.id === 'moonlight' ? 'rgba(255,255,255,0.8)' : 'rgba(26,22,18,0.75)' }}>{t.desc}</span>
                      </div>
                      {currentTheme === t.id && <span className="text-xs text-green-600 font-black">✓</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-[#D1C6B4]/30">
                <h3 className="text-sm font-bold opacity-80 mb-3">2. 選擇個人簡介彈窗的專屬視覺風格 (即時預覽配色)：</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'morandi-classic', name: '🍵 莫蘭迪和風印記', color: '#B5C4B1', bg: '#FDFBF7', desc: '雙線抹茶邊框與溫潤典雅' },
                    { id: 'sakura-wave', name: '🌸 櫻吹雪浮世雲煙', color: '#F472B6', bg: '#FFF5F7', desc: '柔美櫻粉與波浪邊框' },
                    { id: 'ukiyo-wave', name: '🌊 浮世青海雙波', color: '#3B82F6', bg: '#F1F5F9', desc: '經典魚鱗波紋與墨藍邊框' },
                    { id: 'moonlight-gold', name: '🌙 月映波濤柔黑', color: '#D9B650', bg: '#262B33', desc: '柔和黑金月華與雙圈漆封' }
                  ].map(ps => (
                    <div
                      key={ps.id}
                      onClick={() => setProfileStyle(ps.id)}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                        profileStyle === ps.id ? 'border-[#4A4238] dark:border-white shadow-md scale-[1.02]' : 'border-[#D1C6B4]/50 hover:border-[#4A4238]'
                      }`}
                      style={{ 
                        backgroundColor: ps.bg, 
                        color: ps.id === 'moonlight-gold' ? '#FFFFFF' : '#1A1612' 
                      }}
                    >
                      <div className="w-8 h-8 rounded-full border-2 border-white/60 shrink-0 shadow-sm flex items-center justify-center font-bold text-xs" style={{ backgroundColor: ps.color }}>
                        ✨
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-black block" style={{ color: ps.id === 'moonlight-gold' ? '#FFFFFF' : '#1A1612' }}>{ps.name}</span>
                        <span className="text-[10px] block truncate font-medium" style={{ color: ps.id === 'moonlight-gold' ? 'rgba(255,255,255,0.8)' : 'rgba(26,22,18,0.75)' }}>{ps.desc}</span>
                      </div>
                      {profileStyle === ps.id && <span className="text-xs text-green-600 font-black">✓</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: 個人簡介模組排版 (後台 100% 同款編輯介面) */}
          {activeTab === 'layout' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold opacity-80">調整個人簡介中的各個功能模組與順序：</h3>
                <span className="text-[10px] bg-[#D1C6B4]/30 px-2.5 py-1 rounded-full font-bold">與後台視覺佈局同步</span>
              </div>

              <div className="space-y-2.5">
                {modules.map((m, idx) => (
                  <div 
                    key={m.id}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                      m.visible 
                        ? 'bg-white dark:bg-black/30 border-[#D1C6B4]/50 shadow-xs' 
                        : 'bg-gray-100 dark:bg-white/5 border-gray-200 opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* 順序按鈕 */}
                      <div className="flex flex-col gap-0.5">
                        <button 
                          onClick={() => moveModule(idx, 'up')}
                          disabled={idx === 0}
                          className="text-[10px] leading-none p-1 rounded bg-[#D1C6B4]/20 hover:bg-[#D1C6B4]/50 disabled:opacity-20 cursor-pointer"
                        >
                          ▲
                        </button>
                        <button 
                          onClick={() => moveModule(idx, 'down')}
                          disabled={idx === modules.length - 1}
                          className="text-[10px] leading-none p-1 rounded bg-[#D1C6B4]/20 hover:bg-[#D1C6B4]/50 disabled:opacity-20 cursor-pointer"
                        >
                          ▼
                        </button>
                      </div>

                      <div>
                        <span className="text-xs font-bold block">{m.name}</span>
                        <span className="text-[10px] opacity-60">
                          {m.column === 'left' ? '⬅️ 置左顯示' : m.column === 'right' ? '➡️ 置右顯示' : '↔️ 滿版呈現'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* 位置切換按鈕 */}
                      {m.id !== 'header' && (
                        <button
                          onClick={() => toggleColumn(m.id)}
                          className="text-[11px] px-2.5 py-1 rounded-lg border border-[#D1C6B4]/40 bg-[#F5EFE6] dark:bg-white/10 font-bold hover:bg-[#D1C6B4]/30 cursor-pointer"
                        >
                          {m.column === 'left' ? '⬅️ 置左' : m.column === 'right' ? '➡️ 置右' : '↔️ 滿版'}
                        </button>
                      )}

                      {/* 顯示開關 */}
                      <button
                        onClick={() => toggleModule(m.id)}
                        className={`text-[11px] px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          m.visible 
                            ? 'bg-[#4A4238] text-white' 
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {m.visible ? '👁️ 顯示' : '🙈 隱藏'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {msg && (
            <div className={`p-3 rounded-xl text-xs font-bold text-center ${msg.includes('❌') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {msg}
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#D1C6B4]/30 bg-[#F5EFE6] dark:bg-black/20 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 rounded-xl text-xs font-bold opacity-70 hover:opacity-100 cursor-pointer">
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-[#4A4238] dark:bg-[#E5DCD0] text-white dark:text-[#1A1816] rounded-xl text-xs font-bold shadow-md hover:opacity-90 transition-all cursor-pointer"
          >
            {saving ? '儲存中...' : '💾 儲存排版與風格'}
          </button>
        </div>

      </div>
    </div>
  );
}
