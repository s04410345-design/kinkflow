"use client";

import { useState, useMemo } from 'react';
import ScoringAnalyzer from './ScoringAnalyzer';
import { uploadQuizImage } from '@/lib/data/adminSettings';

interface QuizContentEditorProps {
  quizJson: string;
  setQuizJson: (val: string) => void;
  onSave: (key: string, data: string, isJson?: boolean) => Promise<void>;
  saving: boolean;
}

import { SCENARIO_GRAPH, CARDS, TRAITS_DB, ENDINGS_DB } from '@/lib/quizData';

export default function QuizContentEditor({ quizJson, setQuizJson, onSave, saving }: QuizContentEditorProps) {
  const [activeTab, setActiveTab] = useState<'intro' | 'scenarios' | 'cards' | 'traits' | 'endings' | 'result' | 'assets' | 'analyzer'>('intro');
  
  // 選擇的項目 ID
  const [selectedScenarioId, setSelectedScenarioId] = useState('');
  const [selectedCardIdx, setSelectedCardIdx] = useState(0);
  const [selectedTraitId, setSelectedTraitId] = useState('');
  const [selectedEndingIdx, setSelectedEndingIdx] = useState(0);

  const config = useMemo(() => {
    try {
      const parsed = typeof quizJson === 'string' ? JSON.parse(quizJson) : quizJson;
      if (!parsed || Array.isArray(parsed) || Object.keys(parsed).length === 0 || !parsed.scenarioGraph) {
        return {
          scenarioGraph: SCENARIO_GRAPH,
          cards: CARDS,
          traits: TRAITS_DB,
          endings: ENDINGS_DB,
          introPage: {},
          globalAssets: {},
          resultPage: {}
        };
      }
      return parsed;
    } catch(e) {
      return {
        scenarioGraph: SCENARIO_GRAPH,
        cards: CARDS,
        traits: TRAITS_DB,
        endings: ENDINGS_DB,
        introPage: {},
        globalAssets: {},
        resultPage: {}
      };
    }
  }, [quizJson]);

  const updateConfig = (newConfig: any) => {
    setQuizJson(JSON.stringify(newConfig, null, 2));
  };

  // =============== Intro Page & Global Assets ================
  const introPage = config.introPage || {};
  const updateIntroPage = (field: string, value: any) => {
    updateConfig({ ...config, introPage: { ...introPage, [field]: value } });
  };

  const globalAssets = config.globalAssets || {};
  const updateGlobalAssets = (field: string, value: any) => {
    updateConfig({ ...config, globalAssets: { ...globalAssets, [field]: value } });
  };

  const handleSaveAll = async () => {
    await onSave('quiz_system_config', quizJson, true);
  };

  // =============== Scenarios ================
  const scenarios = Object.values(config.scenarioGraph || {}) as any[];
  const currentScenario = scenarios.find(s => s.id === selectedScenarioId) || scenarios[0];

  const updateCurrentScenario = (field: string, value: any) => {
    if (!currentScenario) return;
    const newGraph = { ...config.scenarioGraph, [currentScenario.id]: { ...currentScenario, [field]: value } };
    updateConfig({ ...config, scenarioGraph: newGraph });
  };

  const updateScenarioOption = (optIdx: number, field: string, value: any) => {
    if (!currentScenario) return;
    const newOptions = [...(currentScenario.options || [])];
    newOptions[optIdx] = { ...newOptions[optIdx], [field]: value };
    updateCurrentScenario('options', newOptions);
  };

  const updateScenarioOptionScore = (optIdx: number, axis: string, value: number) => {
    if (!currentScenario) return;
    const newOptions = [...(currentScenario.options || [])];
    const newScores = { ...(newOptions[optIdx].scores || {}), [axis]: value };
    newOptions[optIdx] = { ...newOptions[optIdx], scores: newScores };
    updateCurrentScenario('options', newOptions);
  };

  const addScenarioOption = () => {
    if (!currentScenario) return;
    const newOptions = [...(currentScenario.options || []), { text: '新選項', scores: {}, nextScenarioId: '' }];
    updateCurrentScenario('options', newOptions);
  };

  const removeScenarioOption = (optIdx: number) => {
    if (!currentScenario) return;
    const newOptions = currentScenario.options.filter((_: any, i: number) => i !== optIdx);
    updateCurrentScenario('options', newOptions);
  };

  // =============== Cards ================
  const cards = config.cards || [];
  const currentCard = cards[selectedCardIdx] || cards[0];
  
  const updateCurrentCard = (field: string, value: any) => {
    if (!currentCard) return;
    const newCards = [...cards];
    newCards[selectedCardIdx] = { ...currentCard, [field]: value };
    updateConfig({ ...config, cards: newCards });
  };

  // =============== Traits ================
  const traitsEntries = Object.entries(config.traits || {});
  const currentTraitEntry = traitsEntries.find(([id]) => id === selectedTraitId) || traitsEntries[0];
  const currentTraitId = currentTraitEntry?.[0];
  const currentTrait = currentTraitEntry?.[1] as any;

  const updateCurrentTrait = (field: string, value: any) => {
    if (!currentTraitId) return;
    const newTraits = { ...config.traits, [currentTraitId]: { ...currentTrait, [field]: value } };
    updateConfig({ ...config, traits: newTraits });
  };

  // =============== Endings ================
  const endings = config.endings || [];
  const currentEnding = endings[selectedEndingIdx] || endings[0];

  const updateCurrentEnding = (field: string, value: any) => {
    if (!currentEnding) return;
    const newEndings = [...endings];
    newEndings[selectedEndingIdx] = { ...currentEnding, [field]: value };
    updateConfig({ ...config, endings: newEndings });
  };

  // =============== ResultPage ================
  const resultPage = config.resultPage || {};
  const updateResultPage = (field: string, value: any) => {
    updateConfig({ ...config, resultPage: { ...resultPage, [field]: value } });
  };

  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (folder: string, prefix: string, file: File, callback: (url: string) => void) => {
    if (!file) return;
    setUploading(true);
    try {
      const publicUrl = await uploadQuizImage(folder, prefix, file);
      callback(publicUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : '未知錯誤';
      alert('圖片上傳失敗: ' + message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white/90 rounded-2xl border border-[#D1C6B4]/30 shadow-sm flex flex-col max-h-[85vh]">
      {/* Header */}
      <div className="p-6 border-b border-[#D1C6B4]/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold">📝 測驗系統視覺化編輯器</h2>
          <p className="text-xs text-[#4A4238]/60 mt-1">
            這裡可以編輯測驗的每一夜情境、角色卡片、測驗特質與最終結局。修改後請務必儲存。
          </p>
        </div>
        <button 
          onClick={handleSaveAll} 
          disabled={saving}
          className="shrink-0 bg-[#4A4238] text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-[#4A4238]/80 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? '儲存中...' : '💾 儲存測驗設定'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-4 bg-[#F5EFE6] border-b border-[#D1C6B4]/30 overflow-x-auto">
        {[
          { id: 'intro', label: '🏠 測驗首頁' },
          { id: 'scenarios', label: '📖 情境題目' },
          { id: 'cards', label: '🎴 角色卡片' },
          { id: 'traits', label: '✨ 特質定義' },
          { id: 'endings', label: '👑 結局設定' },
          { id: 'result', label: '🏆 測驗結果' },
          { id: 'assets', label: '🎨 預設圖片' },
          { id: 'analyzer', label: '📊 算分分析' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 rounded-t-xl text-sm font-bold transition-all -mb-px ${activeTab === tab.id ? 'bg-[#FDFBF7] text-[#4A4238] border border-[#D1C6B4]/30 border-b-transparent shadow-[0_-4px_10px_rgba(0,0,0,0.02)]' : 'text-[#4A4238]/50 hover:text-[#4A4238] hover:bg-white/50 border border-transparent'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden bg-[#FDFBF7]">
        
        {/* Sidebar */}
        <div className="w-64 border-r border-[#D1C6B4]/30 overflow-y-auto p-4 flex flex-col gap-2 custom-scrollbar">
          {activeTab === 'scenarios' && scenarios.map(s => (
            <SidebarBtn 
              key={s.id || Math.random().toString()} 
              active={selectedScenarioId === s.id || (!selectedScenarioId && s.id === scenarios[0]?.id)} 
              onClick={() => setSelectedScenarioId(s.id)}
              label={s.title ? s.title : `題 ${(s.id || '').replace('scene', '')}`}
              subLabel={(s.desc || s.text || '').substring(0, 15) + '...'}
            />
          ))}
          {activeTab === 'cards' && cards.map((c: any, i: number) => (
            <SidebarBtn 
              key={i} 
              active={selectedCardIdx === i} 
              onClick={() => setSelectedCardIdx(i)}
              label={c.title}
              subLabel={c.id}
            />
          ))}
          {activeTab === 'traits' && traitsEntries.map(([id, t]: any) => (
            <SidebarBtn 
              key={id} 
              active={selectedTraitId === id || (!selectedTraitId && id === currentTraitId)} 
              onClick={() => setSelectedTraitId(id)}
              label={t.name}
              subLabel={id}
              iconUrl={t.icon}
            />
          ))}
          {activeTab === 'endings' && endings.map((e: any, i: number) => (
            <SidebarBtn 
              key={i} 
              active={selectedEndingIdx === i} 
              onClick={() => setSelectedEndingIdx(i)}
              label={e.title}
              subLabel={e.id}
            />
          ))}
          {/* result tab 沒有左側列表 */}
        </div>

        {/* Editor Main */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">

          {/* ==================== Intro Page 設定 ==================== */}
          {activeTab === 'intro' && (
            <div className="space-y-6 animate-fade-in max-w-3xl">
              <h3 className="text-2xl font-black">🏠 測驗首頁與簡介設定</h3>
              <p className="text-sm text-[#4A4238]/60">這裡可以修改訪客第一次進入測驗時看到的首頁標題、故事背景、封面圖片與按鈕文字。</p>

              <div className="bg-white p-6 rounded-2xl border border-[#D1C6B4]/50 shadow-sm space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#4A4238] mb-1">首頁大標題 (title)</label>
                  <input type="text" value={introPage.title || ''} onChange={e => updateIntroPage('title', e.target.value)} placeholder="KinkFlow 潛意識性向探索" className="w-full px-4 py-2 rounded-xl border border-[#D1C6B4]/50 text-sm bg-white focus:border-[#E8C5C8] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#4A4238] mb-1">副標題 / 標語 (subtitle)</label>
                  <input type="text" value={introPage.subtitle || ''} onChange={e => updateIntroPage('subtitle', e.target.value)} placeholder="探索深層慾望與靈魂特質" className="w-full px-4 py-2 rounded-xl border border-[#D1C6B4]/50 text-sm bg-white focus:border-[#E8C5C8] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#4A4238] mb-1">故事引言描述 (description)</label>
                  <textarea value={introPage.description || ''} onChange={e => updateIntroPage('description', e.target.value)} rows={4} placeholder="歡迎來到性向潛意識引導測驗..." className="w-full px-4 py-3 rounded-xl border border-[#D1C6B4]/50 text-sm bg-white focus:border-[#E8C5C8] outline-none leading-relaxed" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#4A4238] mb-1">開始測驗按鈕文字 (buttonText)</label>
                  <input type="text" value={introPage.buttonText || ''} onChange={e => updateIntroPage('buttonText', e.target.value)} placeholder="開始探索潛意識" className="w-full px-4 py-2 rounded-xl border border-[#D1C6B4]/50 text-sm bg-white focus:border-[#E8C5C8] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#4A4238] mb-1">首頁封面視覺圖 (coverImage)</label>
                  <div className="flex gap-2">
                    <input type="text" value={introPage.coverImage || ''} onChange={e => updateIntroPage('coverImage', e.target.value)} placeholder="圖片 URL 或點擊上傳" className="flex-1 px-4 py-2 rounded-xl border border-[#D1C6B4]/50 text-sm bg-white focus:border-[#E8C5C8] outline-none" />
                    <label className="shrink-0 cursor-pointer px-4 py-2 bg-[#E8C5C8]/30 hover:bg-[#E8C5C8]/50 text-[#4A4238] text-sm font-bold rounded-xl transition-colors flex items-center gap-1">
                      {uploading ? '上傳中...' : '📤 上傳'}
                      <input type="file" accept="image/*" className="hidden" disabled={uploading}
                        onChange={e => { const f = e.target.files?.[0]; if(f) handleImageUpload('intro', 'cover', f, url => updateIntroPage('coverImage', url)); }} />
                    </label>
                  </div>
                  {introPage.coverImage && (
                    <img src={introPage.coverImage} alt="cover" className="mt-2 h-40 w-full object-cover rounded-xl border border-[#D1C6B4]/30" />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==================== Assets 全域預設圖片設定 ==================== */}
          {activeTab === 'assets' && (
            <div className="space-y-6 animate-fade-in max-w-3xl">
              <h3 className="text-2xl font-black">🎨 全域品牌與預設 Fallback 圖片</h3>
              <p className="text-sm text-[#4A4238]/60">當個別題目、卡片或結局沒有設定特定圖片時，系統會自動使用這裡上傳的預設圖片，確保視覺絕不破圖。</p>

              <div className="bg-white p-6 rounded-2xl border border-[#D1C6B4]/50 shadow-sm space-y-5">
                {[
                  { key: 'siteLogoUrl', label: '👑 全域 網站 Logo (siteLogoUrl)', placeholder: '網站頂部與導航 Logo' },
                  { key: 'defaultNodeIcon', label: '🛡️ 預設 家徽 / 卡片圖騰 (defaultNodeIcon)', placeholder: '刷卡題預設家徽' },
                  { key: 'defaultScenarioBg', label: '📸 預設 情境背景圖 (defaultScenarioBg)', placeholder: '情境題預設背景' },
                  { key: 'defaultEndingImg', label: '🌌 預設 結局意象圖 (defaultEndingImg)', placeholder: '故事結局預設圖片' },
                  { key: 'mindmapBgUrl', label: '📜 探索網絡 背景畫卷 (mindmapBgUrl)', placeholder: '心智圖全景背景' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key} className="border-b border-[#D1C6B4]/20 pb-4 last:border-b-0">
                    <label className="block text-xs font-bold text-[#4A4238] mb-2">{label}</label>
                    <div className="flex gap-2 mb-2">
                      <input 
                        type="text" 
                        value={globalAssets[key] || ''} 
                        onChange={e => updateGlobalAssets(key, e.target.value)} 
                        placeholder={placeholder} 
                        className="flex-1 px-4 py-2 rounded-xl border border-[#D1C6B4]/50 text-sm bg-white focus:border-[#E8C5C8] outline-none" 
                      />
                      <label className="shrink-0 cursor-pointer px-4 py-2 bg-[#E8C5C8]/30 hover:bg-[#E8C5C8]/50 text-[#4A4238] text-sm font-bold rounded-xl transition-colors flex items-center gap-1">
                        {uploading ? '上傳中...' : '📤 上傳'}
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          disabled={uploading}
                          onChange={e => { 
                            const f = e.target.files?.[0]; 
                            if(f) handleImageUpload('assets', key, f, url => updateGlobalAssets(key, url)); 
                          }} 
                        />
                      </label>
                    </div>
                    {globalAssets[key] && (
                      <img src={globalAssets[key]} alt="preview" className="h-20 object-contain rounded-lg border border-[#D1C6B4]/30 bg-[#FDFBF7] p-1" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================== Analyzer (Full Width) ==================== */}
          {activeTab === 'analyzer' && (
            <ScoringAnalyzer config={config} />
          )}
          
          {/* ==================== Scenarios ==================== */}
          {activeTab === 'scenarios' && currentScenario && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-2xl font-black">{currentScenario.id} 設定</h3>
              
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-bold text-[#4A4238] mb-2">情境描述文字 (desc)</label>
                  <textarea
                    value={currentScenario.desc || currentScenario.text || ''}
                    onChange={e => {
                      updateCurrentScenario('desc', e.target.value);
                      updateCurrentScenario('text', e.target.value);
                    }}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-[#D1C6B4]/50 focus:border-[#E8C5C8] focus:ring-2 focus:ring-[#E8C5C8]/30 outline-none text-sm bg-white resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#4A4238] mb-2">📸 情境背景圖片 <span className="font-normal text-xs text-[#4A4238]/50">顯示在情境題目的背景</span></label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={currentScenario.backgroundImage || ''}
                      onChange={e => updateCurrentScenario('backgroundImage', e.target.value)}
                      placeholder="圖片 URL 或點擊上傳"
                      className="flex-1 px-4 py-2 rounded-xl border border-[#D1C6B4]/50 focus:border-[#E8C5C8] outline-none text-sm bg-white"
                    />
                    <label className="shrink-0 cursor-pointer px-4 py-2 bg-[#E8C5C8]/30 hover:bg-[#E8C5C8]/50 text-[#4A4238] text-sm font-bold rounded-xl transition-colors flex items-center gap-1">
                      {uploading ? '上傳中...' : '📤 上傳'}
                      <input type="file" accept="image/*" className="hidden" disabled={uploading}
                        onChange={e => { const f = e.target.files?.[0]; if(f) handleImageUpload('scenarios', currentScenario.id, f, url => updateCurrentScenario('backgroundImage', url)); }} />
                    </label>
                  </div>
                  {currentScenario.backgroundImage && (
                    <img src={currentScenario.backgroundImage} alt="bg preview" className="mt-2 h-32 w-full rounded-lg object-cover shadow-sm border border-[#D1C6B4]/30" />
                  )}
                </div>
              </div>

              <div className="mt-8">
                <div className="flex justify-between items-center mb-4 border-b border-[#D1C6B4]/30 pb-2">
                  <h4 className="text-lg font-bold">選項設定 ({currentScenario.options?.length || 0})</h4>
                  <button onClick={addScenarioOption} className="text-xs bg-[#4A4238] text-white px-3 py-1.5 rounded-lg hover:bg-[#4A4238]/80 font-bold">+ 新增選項</button>
                </div>
                
                <div className="space-y-6">
                  {currentScenario.options?.map((opt: any, idx: number) => (
                    <div key={idx} className="bg-white p-5 rounded-2xl border border-[#D1C6B4]/50 shadow-sm relative group">
                      <button onClick={() => removeScenarioOption(idx)} className="absolute top-4 right-4 text-red-500 hover:bg-red-50 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">🗑️</button>
                      
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-bold text-[#4A4238] mb-1">選項文字</label>
                          <input type="text" value={opt.text || ''} onChange={e => updateScenarioOption(idx, 'text', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[#D1C6B4]/50 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#4A4238] mb-1">跳轉至下一題 (nextScenarioId)</label>
                          <select value={opt.nextScenarioId || ''} onChange={e => updateScenarioOption(idx, 'nextScenarioId', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[#D1C6B4]/50 text-sm bg-white font-medium">
                            <option value="">➡️ 自動進入下一題</option>
                            <option value="swipe">🎴 SWIPE (進入刷卡階段)</option>
                            <option value="ending">👑 ENDING (進入故事結局)</option>
                            {scenarios.map((s, sIdx) => {
                              const sTitle = s.desc || s.text || s.id;
                              const shortTitle = sTitle.length > 15 ? sTitle.substring(0, 15) + '...' : sTitle;
                              return (
                                <option key={s.id} value={s.id}>
                                  第 {sIdx + 1} 題: {shortTitle} ({s.id})
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#4A4238] mb-2 border-b border-[#D1C6B4]/20 pb-1">
                          選項評分計分 (Score Impacts)
                          <span className="ml-2 font-normal text-[#4A4238]/40">點擊特質即可加/減分數，或直接輸入</span>
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                          {Object.entries(config.traits || {}).map(([traitId, traitInfo]: any) => {
                            const val = opt.impacts?.[traitId] || 0;
                            return (
                              <div key={traitId} className={`flex items-center gap-1.5 p-2 rounded-lg border transition-colors ${val > 0 ? 'bg-green-50 border-green-200' : val < 0 ? 'bg-red-50 border-red-200' : 'bg-[#F5EFE6] border-[#D1C6B4]/30'}`}>
                                <span className="text-sm shrink-0">
                                  {traitInfo.icon?.startsWith('http') ? (
                                    <img src={traitInfo.icon} alt={traitInfo.name} className="w-5 h-5 object-contain rounded" />
                                  ) : traitInfo.icon}
                                </span>
                                <span className={`text-[10px] font-bold truncate flex-1 ${val > 0 ? 'text-green-700' : val < 0 ? 'text-red-700' : 'text-[#4A4238]/70'}`}>{traitInfo.name}</span>
                                <input
                                  type="number"
                                  value={val}
                                  onChange={e => {
                                    const newOpts = [...(currentScenario.options || [])];
                                    const newImpacts = { ...(newOpts[idx].impacts || {}) };
                                    const v = parseInt(e.target.value) || 0;
                                    if (v === 0) delete newImpacts[traitId];
                                    else newImpacts[traitId] = v;
                                    newOpts[idx] = { ...newOpts[idx], impacts: newImpacts };
                                    updateCurrentScenario('options', newOpts);
                                  }}
                                  className="w-12 text-center py-0.5 text-xs rounded border border-[#D1C6B4]/50 bg-white"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==================== Cards ==================== */}
          {activeTab === 'cards' && currentCard && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-2xl font-black">{currentCard.title} ({currentCard.id})</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Active Side */}
                <div className="bg-[#E8C5C8]/10 p-5 rounded-2xl border border-[#E8C5C8]/40">
                  <h4 className="font-bold text-[#4A4238] mb-4 flex items-center gap-2"><span className="text-xl">🔥</span> 主動方 (Active)</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-[#4A4238] mb-1">主動標題</label>
                      <input type="text" value={currentCard.actTitle || ''} onChange={e => updateCurrentCard('actTitle', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[#D1C6B4]/50 text-sm bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#4A4238] mb-1">主動家徽 (Icon) <span className="font-normal text-[#4A4238]/50">— 顯示在前台刷卡結果的主動方徽章</span></label>
                      <div className="flex gap-2 mb-2">
                        <input type="text" value={currentCard.actKamon || ''} onChange={e => updateCurrentCard('actKamon', e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-[#D1C6B4]/50 text-sm bg-white" placeholder="圖片 URL 或點擊上傳" />
                        <label className="shrink-0 cursor-pointer px-3 py-2 bg-[#E8C5C8]/30 hover:bg-[#E8C5C8]/50 text-[#4A4238] text-xs font-bold rounded-lg transition-colors flex items-center gap-1">
                          {uploading ? '…' : '📤'}
                          <input type="file" accept="image/*" className="hidden" disabled={uploading}
                            onChange={e => { const f = e.target.files?.[0]; if(f) handleImageUpload('cards', `${currentCard.id}_act_kamon`, f, url => updateCurrentCard('actKamon', url)); }} />
                        </label>
                      </div>
                      {currentCard.actKamon && (
                        <div className="mt-2 p-2 bg-white rounded-xl border border-[#D1C6B4]/30 inline-block shadow-sm">
                          <img src={currentCard.actKamon} alt="kamon" className="w-20 h-20 sm:w-24 sm:h-24 object-contain" />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#4A4238] mb-1">主動加分特質 <span className="font-normal text-[#4A4238]/40">（勾選即加分）</span></label>
                      <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                        {Object.entries(config.traits || {}).map(([traitId, t]: any) => {
                          const isChecked = (currentCard.actImpact || []).includes(traitId);
                          return (
                            <label key={traitId} className={`flex items-center gap-1.5 p-1.5 rounded-lg cursor-pointer border transition-colors ${isChecked ? 'bg-[#E8C5C8]/30 border-[#E8C5C8] font-bold' : 'bg-white border-[#D1C6B4]/30 hover:bg-[#F5EFE6]'}`}>
                              <input type="checkbox" checked={isChecked} className="accent-[#E8C5C8]" onChange={() => {
                                const cur = currentCard.actImpact || [];
                                updateCurrentCard('actImpact', isChecked ? cur.filter((x: string) => x !== traitId) : [...cur, traitId]);
                              }} />
                              <span className="text-sm">{t.icon?.startsWith('http') ? <img src={t.icon} className="w-4 h-4 object-contain inline" alt="" /> : t.icon}</span>
                              <span className="text-xs truncate">{t.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Passive Side */}
                <div className="bg-[#C5D4B6]/10 p-5 rounded-2xl border border-[#C5D4B6]/40">
                  <h4 className="font-bold text-[#4A4238] mb-4 flex items-center gap-2"><span className="text-xl">💧</span> 被動方 (Passive)</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-[#4A4238] mb-1">被動標題</label>
                      <input type="text" value={currentCard.passTitle || ''} onChange={e => updateCurrentCard('passTitle', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[#D1C6B4]/50 text-sm bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#4A4238] mb-1">被動家徽 (Icon) <span className="font-normal text-[#4A4238]/50">— 顯示在前台刷卡結果的被動方徽章</span></label>
                      <div className="flex gap-2 mb-2">
                        <input type="text" value={currentCard.passKamon || ''} onChange={e => updateCurrentCard('passKamon', e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-[#D1C6B4]/50 text-sm bg-white" placeholder="圖片 URL 或點擊上傳" />
                        <label className="shrink-0 cursor-pointer px-3 py-2 bg-[#C5D4B6]/30 hover:bg-[#C5D4B6]/50 text-[#4A4238] text-xs font-bold rounded-lg transition-colors flex items-center gap-1">
                          {uploading ? '…' : '📤'}
                          <input type="file" accept="image/*" className="hidden" disabled={uploading}
                            onChange={e => { const f = e.target.files?.[0]; if(f) handleImageUpload('cards', `${currentCard.id}_pass_kamon`, f, url => updateCurrentCard('passKamon', url)); }} />
                        </label>
                      </div>
                      {currentCard.passKamon && (
                        <div className="mt-2 p-2 bg-white rounded-xl border border-[#D1C6B4]/30 inline-block shadow-sm">
                          <img src={currentCard.passKamon} alt="kamon" className="w-20 h-20 sm:w-24 sm:h-24 object-contain" />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#4A4238] mb-1">被動加分特質 <span className="font-normal text-[#4A4238]/40">（勾選即加分）</span></label>
                      <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                        {Object.entries(config.traits || {}).map(([traitId, t]: any) => {
                          const isChecked = (currentCard.passImpact || []).includes(traitId);
                          return (
                            <label key={traitId} className={`flex items-center gap-1.5 p-1.5 rounded-lg cursor-pointer border transition-colors ${isChecked ? 'bg-[#C5D4B6]/30 border-[#C5D4B6] font-bold' : 'bg-white border-[#D1C6B4]/30 hover:bg-[#F5EFE6]'}`}>
                              <input type="checkbox" checked={isChecked} className="accent-[#C5D4B6]" onChange={() => {
                                const cur = currentCard.passImpact || [];
                                updateCurrentCard('passImpact', isChecked ? cur.filter((x: string) => x !== traitId) : [...cur, traitId]);
                              }} />
                              <span className="text-sm">{t.icon?.startsWith('http') ? <img src={t.icon} className="w-4 h-4 object-contain inline" alt="" /> : t.icon}</span>
                              <span className="text-xs truncate">{t.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Cover Image */}
              <div className="bg-white p-5 rounded-2xl border border-[#D1C6B4]/50 shadow-sm">
                <h4 className="font-bold text-[#4A4238] mb-3 text-sm">🖼️ 卡片封面圖片</h4>
                <div className="flex gap-2">
                  <input type="text" value={currentCard.image || currentCard.bgImage || ''}
                    onChange={e => { updateCurrentCard('image', e.target.value); updateCurrentCard('bgImage', e.target.value); }}
                    placeholder="圖片 URL 或點擊上傳"
                    className="flex-1 px-3 py-2 rounded-xl border border-[#D1C6B4]/50 text-sm bg-white focus:border-[#E8C5C8] outline-none" />
                  <label className="shrink-0 cursor-pointer px-4 py-2 bg-[#E8C5C8]/30 hover:bg-[#E8C5C8]/50 text-[#4A4238] text-sm font-bold rounded-xl transition-colors flex items-center gap-1">
                    {uploading ? '上傳中...' : '📤 上傳'}
                    <input type="file" accept="image/*" className="hidden" disabled={uploading}
                      onChange={e => { const f = e.target.files?.[0]; if(f) handleImageUpload('cards', currentCard.id, f, url => { updateCurrentCard('image', url); updateCurrentCard('bgImage', url); }); }} />
                  </label>
                </div>
                {(currentCard.image || currentCard.bgImage) && (
                  <img src={currentCard.image || currentCard.bgImage} alt="cover" className="mt-2 h-32 w-full object-cover rounded-xl border border-[#D1C6B4]/30" />
                )}
              </div>
            </div>
          )}

          {/* ==================== Traits ==================== */}
          {activeTab === 'traits' && currentTrait && (
            <div className="space-y-6 animate-fade-in max-w-xl">
              <h3 className="text-2xl font-black flex items-center gap-3">
                {currentTrait.icon?.startsWith('http') ? (
                  <img src={currentTrait.icon} alt={currentTrait.name} className="w-10 h-10 object-contain rounded-lg border border-[#D1C6B4]/30 bg-[#FDFBF7] p-0.5" />
                ) : (
                  <span className="text-4xl drop-shadow-sm">{currentTrait.icon}</span>
                )}
                {currentTrait.name}
                <span className="text-sm font-mono text-[#4A4238]/50 bg-[#D1C6B4]/20 px-2 py-1 rounded-md">ID: {currentTraitId}</span>
              </h3>
              
              <div className="bg-white p-6 rounded-2xl border border-[#D1C6B4]/50 shadow-sm space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#4A4238] mb-1">特質名稱</label>
                  <input type="text" value={currentTrait.name || ''} onChange={e => updateCurrentTrait('name', e.target.value)} className="w-full px-4 py-2 rounded-xl border border-[#D1C6B4]/50 text-sm bg-white focus:border-[#E8C5C8] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#4A4238] mb-1">代表 Emoji 或圖片 URL</label>
                  <div className="flex gap-2">
                    <input type="text" value={currentTrait.icon || ''} onChange={e => updateCurrentTrait('icon', e.target.value)} className="flex-1 px-4 py-2 rounded-xl border border-[#D1C6B4]/50 text-sm bg-white focus:border-[#E8C5C8] outline-none" />
                    <label className="shrink-0 cursor-pointer px-4 py-2 bg-[#E8C5C8]/30 hover:bg-[#E8C5C8]/50 text-[#4A4238] text-sm font-bold rounded-xl transition-colors flex items-center justify-center">
                      {uploading ? '上傳中...' : '📤 上傳圖片'}
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        disabled={uploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload('traits', currentTraitId, file, (url) => updateCurrentTrait('icon', url));
                        }} 
                      />
                    </label>
                  </div>
                  {currentTrait.icon && currentTrait.icon.startsWith('http') && (
                    <img src={currentTrait.icon} alt="trait" className="mt-2 h-16 w-16 object-contain rounded shadow-sm border border-[#D1C6B4]/30 bg-[#FDFBF7]" />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#4A4238] mb-1">
                    🖼️ TOP 5 專屬展示大圖 (top5_image)
                    <span className="ml-2 font-normal text-[#4A4238]/50">— 專供測驗結果頁 TOP 5 印記大圖展示，與小 icon 分開</span>
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={currentTrait.top5_image || currentTrait.top5Image || ''} 
                      onChange={e => { updateCurrentTrait('top5_image', e.target.value); updateCurrentTrait('top5Image', e.target.value); }} 
                      placeholder="圖片 URL 或點擊右側上傳"
                      className="flex-1 px-4 py-2 rounded-xl border border-[#D1C6B4]/50 text-sm bg-white focus:border-[#E8C5C8] outline-none" 
                    />
                    <label className="shrink-0 cursor-pointer px-4 py-2 bg-[#E8C5C8]/30 hover:bg-[#E8C5C8]/50 text-[#4A4238] text-sm font-bold rounded-xl transition-colors flex items-center justify-center">
                      {uploading ? '上傳中...' : '📤 上傳專屬大圖'}
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        disabled={uploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload('traits', `${currentTraitId}_top5`, file, (url) => {
                            updateCurrentTrait('top5_image', url);
                            updateCurrentTrait('top5Image', url);
                          });
                        }} 
                      />
                    </label>
                  </div>
                  {(currentTrait.top5_image || currentTrait.top5Image) && (
                    <div className="mt-2 p-2 bg-white rounded-xl border border-[#D1C6B4]/30 inline-block shadow-sm">
                      <img src={currentTrait.top5_image || currentTrait.top5Image} alt="top5" className="h-24 w-24 object-cover rounded-lg" />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#4A4238] mb-1">歸屬軸心 (Axis)</label>
                  <select value={currentTrait.axis || ''} onChange={e => updateCurrentTrait('axis', e.target.value)} className="w-full px-4 py-2 rounded-xl border border-[#D1C6B4]/50 text-sm bg-white focus:border-[#E8C5C8] outline-none">
                    <option value="dom">支配統御 (dom)</option>
                    <option value="sub">臣服侍奉 (sub)</option>
                    <option value="sadism">施虐破壞 (sadism)</option>
                    <option value="maso">受虐承受 (maso)</option>
                    <option value="control">掌控束縛 (control)</option>
                    <option value="tied">拘束受縛 (tied)</option>
                    <option value="care">照顧保護 (care)</option>
                    <option value="spoiled">撒嬌依賴 (spoiled)</option>
                    <option value="emotional">情緒共感 (emotional)</option>
                    <option value="diverse">多樣探索 (diverse)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ==================== Endings ==================== */}
          {activeTab === 'endings' && currentEnding && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-2xl font-black">{currentEnding.title} <span className="text-sm font-mono text-[#4A4238]/50 ml-2">ID: {currentEnding.id}</span></h3>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Form */}
                <div className="space-y-4 bg-white p-6 rounded-2xl border border-[#D1C6B4]/50 shadow-sm">
                  <div>
                    <label className="block text-xs font-bold text-[#4A4238] mb-1">主標題</label>
                    <input type="text" value={currentEnding.title || ''} onChange={e => updateCurrentEnding('title', e.target.value)} className="w-full px-4 py-2 rounded-xl border border-[#D1C6B4]/50 text-lg font-bold bg-white focus:border-[#E8C5C8] outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#4A4238] mb-1">副標題 (英文)</label>
                    <input type="text" value={currentEnding.subtitle || ''} onChange={e => updateCurrentEnding('subtitle', e.target.value)} className="w-full px-4 py-2 rounded-xl border border-[#D1C6B4]/50 text-sm bg-white focus:border-[#E8C5C8] outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#4A4238] mb-2">
                      觸發特質 <span className="font-normal text-[#4A4238]/40">— 勾選的特質分數最高時，觸發此結局</span>
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto border border-[#D1C6B4]/30 rounded-xl p-2 bg-[#FDFBF7]">
                      {Object.entries(config.traits || {}).map(([traitId, t]: any) => {
                        const isChecked = (currentEnding.triggerTraits || []).includes(traitId);
                        return (
                          <label key={traitId} className={`flex items-center gap-1.5 p-1.5 rounded-lg cursor-pointer border text-xs transition-colors ${
                            isChecked ? 'bg-[#D9B650]/20 border-[#D9B650] font-bold' : 'bg-white border-[#D1C6B4]/30 hover:bg-[#F5EFE6]'
                          }`}>
                            <input type="checkbox" checked={isChecked} className="accent-[#D9B650]" onChange={() => {
                              const cur = currentEnding.triggerTraits || [];
                              updateCurrentEnding('triggerTraits', isChecked
                                ? cur.filter((x: string) => x !== traitId)
                                : [...cur, traitId]
                              );
                            }} />
                            <span className="shrink-0">{t.icon?.startsWith('http') ? <img src={t.icon} className="w-4 h-4 object-contain inline" alt="" /> : t.icon}</span>
                            <span className="truncate">{t.name}</span>
                          </label>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-[#4A4238]/40 mt-1">目前已勾選: {(currentEnding.triggerTraits || []).join(', ') || '(未設定)'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#4A4238] mb-1">意象圖片</label>
                    <div className="flex gap-2">
                      <input type="text" value={currentEnding.image || ''} onChange={e => updateCurrentEnding('image', e.target.value)} className="flex-1 px-4 py-2 rounded-xl border border-[#D1C6B4]/50 text-sm bg-white focus:border-[#E8C5C8] outline-none" placeholder="/images/endings/xxx.png" />
                      <label className="shrink-0 cursor-pointer px-4 py-2 bg-[#E8C5C8]/30 hover:bg-[#E8C5C8]/50 text-[#4A4238] text-sm font-bold rounded-xl transition-colors flex items-center">
                        {uploading ? '上傳中...' : '📤 上傳'}
                        <input type="file" accept="image/*" className="hidden" disabled={uploading}
                          onChange={e => { const f = e.target.files?.[0]; if(f) handleImageUpload('endings', currentEnding.id, f, url => updateCurrentEnding('image', url)); }} />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#4A4238] mb-1">繼續按鈕文字</label>
                    <input type="text" value={currentEnding.ctaText || ''} onChange={e => updateCurrentEnding('ctaText', e.target.value)} placeholder="閉上雙眼，進入潛意識深處" className="w-full px-4 py-2 rounded-xl border border-[#D1C6B4]/50 text-sm bg-white focus:border-[#E8C5C8] outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#4A4238] mb-1">詩意評語 (Commentary) — AI 未生成時顯示</label>
                    <textarea value={currentEnding.commentary || ''} onChange={e => updateCurrentEnding('commentary', e.target.value)} rows={4} className="w-full px-4 py-3 rounded-xl border border-[#D1C6B4]/50 text-sm bg-white focus:border-[#E8C5C8] outline-none leading-relaxed" />
                  </div>
                </div>

                {/* Live Preview */}
                <div className="sticky top-4">
                  <p className="text-xs font-bold text-[#4A4238]/50 mb-3 tracking-widest">👁️ 即時預覽</p>
                  <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 border-2 border-[#D1C6B4]/50 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#D9B650]/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    <span className="text-[#D9B650] font-bold text-xs tracking-[0.3em] mb-3 block">第一幕 終局</span>
                    <h2 className="text-2xl font-black text-[#4A4238] tracking-widest mb-1">{currentEnding.title || '標題'}</h2>
                    <div className="text-[#4A4238]/50 text-xs tracking-widest uppercase mb-4 font-semibold">{currentEnding.subtitle || 'Subtitle'}</div>
                    {currentEnding.image ? (
                      <div className="w-full aspect-video relative mb-4 rounded-xl overflow-hidden shadow-md">
                        <img src={currentEnding.image} alt={currentEnding.title} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-full aspect-video bg-[#F5EFE6] rounded-xl mb-4 flex items-center justify-center text-[#4A4238]/20 text-sm">尚未設定圖片</div>
                    )}
                    <div className="w-12 h-1 bg-[#D9B650] rounded-full mb-4" />
                    <p className="text-[#4A4238]/70 text-sm leading-relaxed italic mb-6">{currentEnding.commentary || '詩意評語將顯示在這裡...'}</p>
                    <button className="w-full py-3 bg-[#4A4238] text-white rounded-full font-bold text-sm tracking-widest">
                      {currentEnding.ctaText || '閉上雙眼，進入潛意識深處'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== Result Page 設定 ==================== */}
          {activeTab === 'result' && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-2xl font-black">🏆 測驗結果頁面設定</h3>
              <p className="text-sm text-[#4A4238]/60">設定「分享我的印記報告」截圖的視覺內容，下載的截圖底部會顯示品牌引流資訊。</p>
              
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* 設定表單 */}
                <div className="space-y-5 bg-white p-6 rounded-2xl border border-[#D1C6B4]/50 shadow-sm">
                  <div>
                    <label className="block text-sm font-bold text-[#4A4238] mb-1">📸 網站 Logo 圖片 <span className="text-xs font-normal text-[#4A4238]/50">截圖底部左側顯示</span></label>
                    <div className="flex gap-2">
                      <input type="text" value={resultPage.logoUrl || ''} onChange={e => updateResultPage('logoUrl', e.target.value)}
                        placeholder="圖片 URL 或點擊上傳"
                        className="flex-1 px-4 py-2 rounded-xl border border-[#D1C6B4]/50 text-sm bg-white focus:border-[#E8C5C8] outline-none" />
                      <label className="shrink-0 cursor-pointer px-4 py-2 bg-[#E8C5C8]/30 hover:bg-[#E8C5C8]/50 text-[#4A4238] text-sm font-bold rounded-xl transition-colors flex items-center">
                        {uploading ? '上傳中...' : '📤 上傳'}
                        <input type="file" accept="image/*" className="hidden" disabled={uploading}
                          onChange={e => { const f = e.target.files?.[0]; if(f) handleImageUpload('result', 'logo', f, url => updateResultPage('logoUrl', url)); }} />
                      </label>
                    </div>
                    {resultPage.logoUrl && <img src={resultPage.logoUrl} alt="logo" className="mt-2 h-10 object-contain rounded border border-[#D1C6B4]/30 bg-white p-1" />}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[#4A4238] mb-1">📝 引流文字 <span className="text-xs font-normal text-[#4A4238]/50">截圖底部小標語</span></label>
                    <input type="text" value={resultPage.footerText || ''} onChange={e => updateResultPage('footerText', e.target.value)}
                      placeholder="探索你的潛意識傾向"
                      className="w-full px-4 py-2 rounded-xl border border-[#D1C6B4]/50 text-sm bg-white focus:border-[#E8C5C8] outline-none" />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[#4A4238] mb-1">🌐 網站地址 <span className="text-xs font-normal text-[#4A4238]/50">截圖底部黑金將高亮顯示</span></label>
                    <input type="text" value={resultPage.siteUrl || ''} onChange={e => updateResultPage('siteUrl', e.target.value)}
                      placeholder="KINKFLOW.COM"
                      className="w-full px-4 py-2 rounded-xl border border-[#D1C6B4]/50 text-sm bg-white font-mono focus:border-[#E8C5C8] outline-none" />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[#4A4238] mb-1">👑 結果頁面大標題 <span className="text-xs font-normal text-[#4A4238]/50">顯示在結果頁面最頂部</span></label>
                    <input type="text" value={resultPage.pageTitle || ''} onChange={e => updateResultPage('pageTitle', e.target.value)}
                      placeholder="你的靈魂印記"
                      className="w-full px-4 py-2 rounded-xl border border-[#D1C6B4]/50 text-sm bg-white focus:border-[#E8C5C8] outline-none" />
                  </div>

                  {/* 頁面文字標籤設定 */}
                  <div className="space-y-3 bg-[#F5EFE6] p-5 rounded-2xl border border-[#D1C6B4]/30 mt-4">
                    <h5 className="font-bold text-sm text-[#4A4238]">✏️ 頁面文字標籤自訂</h5>
                    {[
                      { key: 'top5Title', label: '核心驅動力區塊標題', placeholder: '核心驅動力 (Top 5)' },
                      { key: 'traitBadgeTitle', label: '特質印記區塊標題', placeholder: '【 你的 TOP 5 靈魂印記 】' },
                      { key: 'remainingTitle', label: '其餘特質區塊標題', placeholder: '其餘潛意識碎片與隱藏特質' },
                      { key: 'shareBtn', label: '分享按鈕文字', placeholder: '分享我的印記報告' },
                      { key: 'restartBtn', label: '重新開始按鈕文字', placeholder: '重新探索' },
                      { key: 'aiLoadingText', label: 'AI 解析中提示文字', placeholder: '解析印記中...' },
                    ].map(({ key, label, placeholder }) => (
                      <div key={key}>
                        <label className="block text-xs font-bold text-[#4A4238] mb-1">{label}</label>
                        <input type="text"
                          value={resultPage.labels?.[key] || ''}
                          onChange={e => updateResultPage('labels', { ...(resultPage.labels || {}), [key]: e.target.value })}
                          placeholder={placeholder}
                          className="w-full px-3 py-2 rounded-xl border border-[#D1C6B4]/50 text-sm bg-white focus:border-[#E8C5C8] outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* 截圖預覽 */}
                <div className="sticky top-4">
                  <p className="text-xs font-bold text-[#4A4238]/50 mb-3 tracking-widest">👁️ 截圖底部预覽</p>
                  <div className="bg-[#FDFBF7] rounded-3xl border-2 border-[#4A4238] overflow-hidden shadow-xl">
                    {/* 頂部裝飾條 */}
                    <div className="h-3 bg-[#4A4238] w-full" />
                    <div className="p-6">
                      <p className="text-xs font-bold text-[#4A4238]/40 tracking-widest text-center mb-3">{resultPage.pageTitle || '你的靈魂印記'}</p>
                      {/* 特質組模擬 */}
                      <div className="grid grid-cols-5 gap-1 mb-4">
                        {['TOP 1','TOP 2','TOP 3','TOP 4','TOP 5'].map((t, i) => (
                          <div key={i} className={`rounded-2xl border-2 border-[#E8C5C8] bg-[#E8C5C8]/10 flex items-center justify-center py-3 text-[10px] font-bold text-[#4A4238]/40 ${i === 0 ? 'col-span-2 row-span-2' : ''}`}>
                            {t}
                          </div>
                        ))}
                      </div>
                      {/* 截圖底部品牌預覽 */}
                      <div className="mt-4 pt-4 border-t border-[#D1C6B4]/20 flex items-center justify-center gap-3">
                        {resultPage.logoUrl && (
                          <img src={resultPage.logoUrl} alt="logo" className="h-6 object-contain" />
                        )}
                        <div className="text-center">
                          <p className="text-[10px] font-black text-[#4A4238]/60 tracking-[0.3em] uppercase">
                            {resultPage.footerText || '探索你的潛意識傾向'}
                          </p>
                          <p className="text-[9px] font-bold text-[#D9B650] tracking-[0.2em] mt-0.5">
                            {resultPage.siteUrl || 'KINKFLOW.COM'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-[#4A4238]/40 mt-2 text-center">實際截圖包含特質印記、雷達圖與底部品牌區域</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function SidebarBtn({ active, onClick, label, subLabel, iconUrl }: { active: boolean; onClick: () => void; label: string; subLabel: string; iconUrl?: string }) {
  return (
    <button
      onClick={onClick}
      className={`text-left px-3 py-2.5 rounded-xl transition-all border text-sm flex items-center gap-2
        ${active 
          ? 'bg-[#E8C5C8]/40 border-[#E8C5C8] text-[#4A4238] shadow-sm font-bold' 
          : 'bg-white border-[#D1C6B4]/30 text-[#4A4238]/70 hover:bg-[#F5EFE6] hover:border-[#D1C6B4] font-medium'}
      `}
    >
      {iconUrl && (
        iconUrl.startsWith('http') ? (
          <img src={iconUrl} alt="" className="w-6 h-6 object-contain rounded shrink-0" />
        ) : (
          <span className="text-base shrink-0">{iconUrl}</span>
        )
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate">{label}</div>
        <div className="text-[10px] opacity-60 font-mono truncate mt-0.5">{subLabel}</div>
      </div>
    </button>
  );
}
