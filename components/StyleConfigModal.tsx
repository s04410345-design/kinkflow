"use client";

import { useState, useEffect } from 'react';
import {
  fetchUserStyleConfig,
  saveUserStyleConfig,
} from '@/lib/data/adminSettings';

const SUPPORTED_THEMES = ['morandi', 'sakura', 'ukiyo', 'moonlight'] as const;

function isSupportedTheme(value: string): boolean {
  return SUPPORTED_THEMES.includes(value as typeof SUPPORTED_THEMES[number]);
}

interface StyleConfigModalProps {
  userName: string;
  userId?: string | null;
  onClose: () => void;
  onThemeChange?: (theme: string) => void;
}

export default function StyleConfigModal({
  userName,
  userId,
  onClose,
  onThemeChange
}: StyleConfigModalProps) {
  const [currentTheme, setCurrentTheme] = useState('morandi');
  const [profileStyle, setProfileStyle] = useState('morandi-classic');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const applyThemeToDom = (theme: string) => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'moonlight') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      try {
        const userContent = await fetchUserStyleConfig(userName, userId);
        if (cancelled) return;

        if (typeof userContent.theme === 'string' && isSupportedTheme(userContent.theme)) {
          setCurrentTheme(userContent.theme);
          applyThemeToDom(userContent.theme);
        }
        if (typeof userContent.profileStyle === 'string' && userContent.profileStyle.trim()) {
          setProfileStyle(userContent.profileStyle);
        }
      } catch (error) {
        console.error('Failed to load style config', error);
      }
    }

    void loadConfig();
    return () => {
      cancelled = true;
    };
  }, [userName, userId]);

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      await saveUserStyleConfig(userName, { theme: currentTheme, profileStyle }, userId);

      applyThemeToDom(currentTheme);

      setMsg('✨ 個人主題與視覺風格已成功儲存！');
      if (onThemeChange) onThemeChange(currentTheme);
      setTimeout(() => onClose(), 800);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '未知錯誤';
      setMsg('❌ 儲存失敗：' + message + '。請稍後再試。');
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
            <p className="text-[11px] sm:text-xs opacity-70 mt-1">控制個人主題風格；個人資料公開範圍請在個人資料編輯中設定</p>
          </div>
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 dark:bg-white/10 flex items-center justify-center font-bold text-sm cursor-pointer shrink-0">✕</button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
          
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
            {saving ? '儲存中...' : '💾 儲存個人風格'}
          </button>
        </div>

      </div>
    </div>
  );
}
