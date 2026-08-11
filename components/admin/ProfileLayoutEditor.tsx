"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface ProfileModuleConfig {
  id: string;
  name: string;
  visible: boolean;
  order: number;
  column?: 'left' | 'right' | 'full';
}

export interface ProfileLayoutConfig {
  theme: 'default' | 'glass' | 'dark' | 'minimal';
  modules: ProfileModuleConfig[];
}

const DEFAULT_CONFIG: ProfileLayoutConfig = {
  theme: 'default',
  modules: [
    { id: 'header', name: '👤 基本資料 (頭像與名稱)', visible: true, order: 0, column: 'left' },
    { id: 'stats', name: '📈 互動數據 (發言與註冊時間)', visible: true, order: 1, column: 'left' },
    { id: 'radar', name: '📊 偏好雷達圖 (即時喜好度)', visible: false, order: 2, column: 'right' },
    { id: 'hot_posts', name: '🔥 最熱門發言', visible: true, order: 3, column: 'right' },
    { id: 'latest_posts', name: '🕒 最新留言', visible: true, order: 4, column: 'right' },
    { id: 'quiz_result', name: '👑 測驗結果 (靈魂印記)', visible: true, order: 5, column: 'right' },
  ]
};

export default function ProfileLayoutEditor() {
  const [config, setConfig] = useState<ProfileLayoutConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const { data: dataArray, error } = await supabase.from('quiz_content').select('content').eq('key_name', 'profile_layout');
      const data = dataArray?.[0];
      if (error && error.code !== 'PGRST116') throw error;
      
      if (data?.content) {
        // Merge with default config to ensure all modules exist
        const mergedModules = DEFAULT_CONFIG.modules.map(defMod => {
          const found = data.content.modules.find((m: any) => m.id === defMod.id);
          let col = found?.column;
          if (!col) col = defMod.column || 'right';
          return found ? { ...defMod, visible: found.visible, order: found.order ?? defMod.order, column: col as 'left' | 'right' } : defMod;
        }).sort((a, b) => a.order - b.order);

        setConfig({
          theme: data.content.theme || 'default',
          modules: mergedModules
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const { error } = await supabase.from('quiz_content').upsert({
        key_name: 'profile_layout',
        content: config
      }, { onConflict: 'key_name' });
      if (error) throw error;
      setMessage('✅ 個人簡介版型已成功儲存與發布！');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`❌ 儲存失敗：${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const toggleModule = (id: string) => {
    setConfig(prev => ({
      ...prev,
      modules: prev.modules.map(m => m.id === id ? { ...m, visible: !m.visible } : m)
    }));
  };

  const toggleColumn = (id: string) => {
    setConfig(prev => ({
      ...prev,
      modules: prev.modules.map(m => {
        if (m.id === id) {
          const nextCol = m.column === 'left' ? 'right' : m.column === 'right' ? 'full' : 'left';
          return { ...m, column: nextCol };
        }
        return m;
      })
    }));
  };

  const moveModule = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === config.modules.length - 1)) return;
    
    const newModules = [...config.modules];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap order values
    const tempOrder = newModules[index].order;
    newModules[index].order = newModules[swapIndex].order;
    newModules[swapIndex].order = tempOrder;
    
    // Sort by new order
    newModules.sort((a, b) => a.order - b.order);
    
    setConfig(prev => ({ ...prev, modules: newModules }));
  };

  if (loading) return <div className="py-20 text-center text-[#4A4238]/50">讀取版型設定中...</div>;

  return (
    <div className="flex flex-col md:flex-row gap-8">
      {/* Settings Form */}
      <div className="flex-1 space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#D1C6B4]/30">
          <div className="flex justify-between items-center mb-4 border-b border-[#D1C6B4]/30 pb-4">
            <h3 className="font-bold text-lg text-[#4A4238]">排版模組設定</h3>
            <div className="flex gap-2">
              <button 
                onClick={async () => {
                  if (!confirm('確定要全自動設定 Supabase 後台嗎？這將會一次性寫入【10 大精簡節點】與【莫蘭迪和風預設主題】至資料庫，讓前台即時連動！')) return;
                  setSaving(true);
                  try {
                    const tenNodes = [
                      { "id": "bdsm", "level": 0, "radius": 45, "color": "#E8C5C8", "label": "BDSM大廳", "desc": "BDSM 世界的起點。", "crossLinks": [] },
                      { "id": "community_safety", "level": 1, "radius": 35, "color": "#F3A6A6", "label": "社群與安全防護", "desc": "進入實踐前不可或缺的安全基石。", "parent": "bdsm", "crossLinks": [] },
                      { "id": "bondage", "level": 1, "radius": 35, "color": "#A6C8F3", "label": "繩藝與肢體束縛", "desc": "日式繩縛 (Shibari)、手銬與限制。", "parent": "bdsm", "crossLinks": [] },
                      { "id": "ds_main", "level": 1, "radius": 35, "color": "#E8A6F3", "label": "支配與臣服動態", "desc": "Dom & Sub 權力交接、稱呼與契約。", "parent": "bdsm", "crossLinks": [] },
                      { "id": "sm_main", "level": 1, "radius": 35, "color": "#F3C8A6", "label": "施虐與痛覺體驗", "desc": "鞭打、拍打、滴蠟與身體感官。", "parent": "bdsm", "crossLinks": [] },
                      { "id": "sensory_deprivation", "level": 1, "radius": 35, "color": "#A6C8F3", "label": "感官剝奪與剝離", "desc": "眼罩、耳罩白噪音與感覺剝奪。", "parent": "bdsm", "crossLinks": [] },
                      { "id": "scenario_play", "level": 1, "radius": 35, "color": "#B5C4B1", "label": "情境劇本與扮演", "desc": "角色扮演、Pet Play 與年齡退行。", "parent": "bdsm", "crossLinks": [] },
                      { "id": "mental_control", "level": 1, "radius": 35, "color": "#E8A6F3", "label": "心理控制與催眠", "desc": "催眠引導、心理暗示與精神臣服。", "parent": "bdsm", "crossLinks": [] },
                      { "id": "consensus_risk", "level": 1, "radius": 35, "color": "#F3A6A6", "label": "知情同意與溝通", "desc": "安全詞、溝通儀式與事後撫慰 (Aftercare)。", "parent": "bdsm", "crossLinks": [] },
                      { "id": "diverse_relations", "level": 1, "radius": 35, "color": "#E8A6F3", "label": "多元關係與次文化", "desc": "多重關係、雙向 Switch 與圈內交流。", "parent": "bdsm", "crossLinks": [] }
                    ];
                    const defaultProfileLayout = {
                      theme: "morandi",
                      profileStyle: "morandi-classic",
                      modules: config.modules
                    };
                    await supabase.from('quiz_content').upsert({ key_name: 'mindmap_data', content: tenNodes }, { onConflict: 'key_name' });
                    await supabase.from('quiz_content').upsert({ key_name: 'mindmap_nodes', content: tenNodes }, { onConflict: 'key_name' });
                    await supabase.from('quiz_content').upsert({ key_name: 'profile_layout', content: defaultProfileLayout }, { onConflict: 'key_name' });
                    setMessage('🎉 成功！已為您將 10 大精簡節點與莫蘭迪和風主題全自動寫入資料庫！前台重整即可連動生效！');
                  } catch (e: any) {
                    setMessage(`❌ 自動寫入失敗：${e.message}`);
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
                className="px-4 py-2 bg-[#C5D4B6]/50 hover:bg-[#C5D4B6] text-[#362E25] font-bold rounded-xl border border-[#B5C4B1] transition-all disabled:opacity-50 text-xs shadow-2xs cursor-pointer"
              >
                🚀 一鍵自動寫入 10 大節點與主題
              </button>
              <button 
                onClick={handleSave} 
                disabled={saving}
                className="px-5 py-2 bg-[#4A4238] text-white font-bold rounded-xl hover:bg-[#4A4238]/80 transition-all disabled:opacity-50 text-sm shadow-sm cursor-pointer"
              >
                {saving ? '儲存中...' : '💾 儲存佈局'}
              </button>
            </div>
          </div>
          
          {message && (
            <div className={`mb-4 p-3 rounded-lg text-sm font-bold ${message.startsWith('✅') ? 'bg-[#C5D4B6]/30 text-[#4A7238]' : 'bg-[#E8C5C8]/30 text-[#A04040]'}`}>
              {message}
            </div>
          )}

          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#F5EFE6] border border-[#D1C6B4]/40 flex items-center justify-between">
              <div>
                <span className="font-bold text-sm block">🎨 全站預設視覺風格與個人簡介佈局</span>
                <span className="text-xs opacity-60">設定預設浮世繪紋路風格與個人簡介模組顯示順序 (100% 同步前台)</span>
              </div>
              <button
                onClick={() => {
                  const event = new CustomEvent('open_style_config_modal');
                  window.dispatchEvent(event);
                }}
                className="px-4 py-2 bg-[#4A4238] text-white rounded-xl text-xs font-bold shadow-sm hover:opacity-90 cursor-pointer"
              >
                ⚙️ 開啟風格與佈局編輯器
              </button>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-bold text-[#4A4238]/70 mb-3">模組顯示與排序 (拖拉排序暫未支援，請使用箭頭)</label>
              <div className="space-y-2">
                {config.modules.map((mod, index) => (
                  <div key={mod.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${mod.visible ? 'bg-white border-[#C5D4B6] shadow-sm' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => toggleModule(mod.id)}
                        className={`w-12 h-6 rounded-full relative transition-colors ${mod.visible ? 'bg-[#C5D4B6]' : 'bg-gray-300'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${mod.visible ? 'left-7' : 'left-1'}`} />
                      </button>
                      <span className={`font-bold ${mod.visible ? 'text-[#4A4238]' : 'text-gray-500'}`}>{mod.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <button onClick={() => toggleColumn(mod.id)} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold text-[#4A4238] whitespace-nowrap transition-colors">
                        {mod.column === 'left' ? '👈 左欄' : mod.column === 'right' ? '右欄 👉' : '寬版 ↔️'}
                      </button>
                      <div className="flex flex-col gap-1">
                        <button onClick={() => moveModule(index, 'up')} disabled={index === 0} className="text-gray-400 hover:text-[#4A4238] disabled:opacity-30">▲</button>
                        <button onClick={() => moveModule(index, 'down')} disabled={index === config.modules.length - 1} className="text-gray-400 hover:text-[#4A4238] disabled:opacity-30">▼</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Preview (Static mock) */}
      <div className="flex-1">
        <h3 className="font-bold text-lg text-[#4A4238] mb-4">預覽 (示意圖)</h3>
        <div className={`p-6 rounded-3xl border ${config.theme === 'dark' ? 'bg-[#2A2420] text-[#E5DCD0] border-[#4A4238]' : config.theme === 'glass' ? 'bg-white/40 backdrop-blur-xl border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.05)]' : config.theme === 'minimal' ? 'bg-white border-gray-100 shadow-sm' : 'bg-[#E8C5C8]/10 border-[#E8C5C8]/40 shadow-xl'}`}>
          <div className="flex flex-col gap-4 pointer-events-none w-full">
            {(() => {
              const elements: any[] = [];
              let currentColumns: any = { left: [], right: [] };
              
              config.modules.forEach(mod => {
                if (!mod.visible) return;
                if (mod.column === 'full') {
                  if (currentColumns.left.length || currentColumns.right.length) {
                    elements.push({...currentColumns});
                    currentColumns = { left: [], right: [] };
                  }
                  elements.push(mod);
                } else if (mod.column === 'left') {
                  currentColumns.left.push(mod);
                } else {
                  currentColumns.right.push(mod);
                }
              });
              if (currentColumns.left.length || currentColumns.right.length) {
                elements.push({...currentColumns});
              }

              return elements.map((el, i) => {
                if (el.id) {
                  return (
                    <div key={el.id} className={`p-4 rounded-2xl flex items-center justify-center border-dashed border-2 font-bold text-sm w-full ${config.theme === 'dark' ? 'bg-[#3A322C] border-[#4A4238] text-[#D1C6B4]' : 'bg-white/60 border-[#D1C6B4]/50 text-[#4A4238]/60'}`}>
                      {el.name}
                    </div>
                  );
                }
                return (
                  <div key={i} className="flex flex-col md:flex-row gap-4 w-full">
                    <div className="flex-1 space-y-4">
                      {el.left.map((mod: any) => (
                         <div key={mod.id} className={`p-4 rounded-2xl flex items-center justify-center border-dashed border-2 font-bold text-sm ${config.theme === 'dark' ? 'bg-[#3A322C] border-[#4A4238] text-[#D1C6B4]' : 'bg-white/60 border-[#D1C6B4]/50 text-[#4A4238]/60'}`}>
                          {mod.name}
                        </div>
                      ))}
                    </div>
                    <div className="flex-[1.5] space-y-4">
                      {el.right.map((mod: any) => (
                         <div key={mod.id} className={`p-4 rounded-2xl flex items-center justify-center border-dashed border-2 font-bold text-sm ${config.theme === 'dark' ? 'bg-[#3A322C] border-[#4A4238] text-[#D1C6B4]' : 'bg-white/60 border-[#D1C6B4]/50 text-[#4A4238]/60'}`}>
                          {mod.name}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
