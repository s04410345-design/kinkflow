"use client";

import { useState, useMemo, useEffect } from 'react';
import { graphNodes } from '@/lib/constants';
import type { AdminNodeImages } from '@/lib/data/admin';

interface NodeContentEditorProps {
  mindmapJson: string;
  setMindmapJson: (json: string) => void;
  onSave: (keyName: string, data: string | object, isJson?: boolean) => Promise<void>;
  saving: boolean;
  nodeImages: AdminNodeImages;
  setNodeImages: React.Dispatch<React.SetStateAction<AdminNodeImages>>;
  uploadingState: Record<string, boolean>;
  handleFileUpload: (nodeId: string, type: 'icon' | 'image', file: File) => Promise<void>;
}

export default function NodeContentEditor({ 
  mindmapJson, setMindmapJson, onSave, saving, 
  nodeImages, setNodeImages, uploadingState, handleFileUpload 
}: NodeContentEditorProps) {
  const [selectedId, setSelectedId] = useState<string>('');
  
  // Parse nodes safely
  const nodes = useMemo(() => {
    try {
      return JSON.parse(mindmapJson) || [];
    } catch(e) {
      return [];
    }
  }, [mindmapJson]);

  // Find currently selected node
  const currentNode = useMemo(() => {
    return nodes.find((n: any) => n.id === selectedId) || null;
  }, [nodes, selectedId]);

  // Handle initialization
  useEffect(() => {
    if (nodes.length > 0 && !selectedId) {
      setSelectedId(nodes[0].id);
    }
  }, [nodes, selectedId]);

  const handleFieldChange = (field: string, value: any) => {
    if (!currentNode) return;
    
    // Update the specific node in the array
    const updatedNodes = nodes.map((n: any) => {
      if (n.id === selectedId) {
        return { ...n, [field]: value };
      }
      return n;
    });
    
    // Convert back to string and update parent state
    setMindmapJson(JSON.stringify(updatedNodes, null, 2));
  };

  const handleSaveAll = async () => {
    await onSave('mindmap_data', mindmapJson, false);
  };

  const handleAddNode = () => {
    const newNodeId = `new_node_${Date.now()}`;
    const newNode = {
      id: newNodeId,
      label: '新增節點',
      level: 1, // 預設層級
      parent: '', // 預設沒有父節點
      intro: '',
      practice: '',
      hazard: '',
      first_aid: '',
      detail_text: '',
      color: '#A0F766', // 預設顏色
      shape: '' // 預設形狀
    };
    
    // 如果目前有選取的節點，將新節點的父節點設為它，並自動判斷層級
    if (currentNode) {
      newNode.parent = currentNode.id;
      newNode.level = (currentNode.level || 0) + 1;
    }

    const updatedNodes = [...nodes, newNode];
    setMindmapJson(JSON.stringify(updatedNodes, null, 2));
    setSelectedId(newNodeId);
  };

  const handleDeleteNode = () => {
    if (!currentNode) return;
    if (confirm(`確定要刪除「${currentNode.label || currentNode.id}」嗎？這也會影響相依的子節點連線。`)) {
      const updatedNodes = nodes.filter((n: any) => n.id !== currentNode.id);
      setMindmapJson(JSON.stringify(updatedNodes, null, 2));
      setSelectedId(updatedNodes[0]?.id || '');
    }
  };

  if (!nodes || nodes.length === 0) {
    return (
      <div className="text-center py-10 bg-white/70 rounded-2xl border border-[#D1C6B4]/30">
        <p className="text-[#4A4238]/60">沒有找到節點資料。請確認 JSON 欄位是否正確。</p>
      </div>
    );
  }

  return (
    <div className="bg-white/90 rounded-2xl p-6 border border-[#D1C6B4]/30 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold">✍️ 節點內容視覺化編輯器</h2>
          <p className="text-xs text-[#4A4238]/60 mt-1">
            直接選擇下方節點並修改內容，這會自動同步更新右側的 JSON。修改完成後請點擊「儲存所有變更」。
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (confirm('確定要載入標準的【10 大精簡版節點結構】嗎？這將會替換目前的編輯器內容，請記得點擊右側儲存。')) {
                setMindmapJson(JSON.stringify(graphNodes, null, 2));
                setSelectedId('bdsm');
              }
            }}
            className="bg-[#C5D4B6]/50 hover:bg-[#C5D4B6] text-[#362E25] font-bold px-4 py-2 rounded-xl text-xs border border-[#B5C4B1] transition-all cursor-pointer shadow-2xs"
          >
            ✨ 載入完整 10 大絕美和風節點與文本
          </button>
          <button 
            onClick={async () => {
              await onSave('node_images', nodeImages, false);
              await onSave('mindmap_data', mindmapJson, true);
            }} 
            disabled={saving}
            className="shrink-0 bg-[#4A4238] text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-[#4A4238]/80 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {saving ? '儲存中...' : '💾 儲存所有變更至資料庫'}
          </button>
        </div>
        </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar: Node List */}
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          {nodes.map((node: any) => (
            <button
              key={node.id}
              onClick={() => setSelectedId(node.id)}
              className={`text-left px-4 py-3 rounded-xl transition-all border text-sm font-semibold
                ${selectedId === node.id 
                  ? 'bg-[#E8C5C8]/40 border-[#E8C5C8] text-[#4A4238] shadow-sm' 
                  : 'bg-white border-[#D1C6B4]/30 text-[#4A4238]/70 hover:bg-[#F5EFE6] hover:border-[#D1C6B4]'}
              `}
            >
              <div className="flex items-center justify-between">
                <span>{node.label || node.id}</span>
                <span className="text-[10px] bg-white/50 px-2 py-0.5 rounded-full border border-black/5">Lv.{node.level ?? '-'}</span>
              </div>
            </button>
          ))}
          <button
            onClick={handleAddNode}
            className="mt-2 border-2 border-dashed border-[#D1C6B4] text-[#4A4238]/60 hover:text-[#4A4238] hover:border-[#4A4238]/50 hover:bg-[#F5EFE6] py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
          >
            <span>+</span> 新增節點
          </button>
        </div>

        {/* Main Content: Editor Fields */}
        <div className="flex-1 space-y-5 bg-[#FDFBF7] p-6 rounded-xl border border-[#D1C6B4]/30 max-h-[600px] overflow-y-auto custom-scrollbar">
          {currentNode ? (
            <>
              <div className="border-b border-[#D1C6B4]/30 pb-4 mb-6">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 mr-4">
                    <label className="block text-xs font-bold text-[#4A4238] mb-1">節點名稱 (Label)</label>
                    <input 
                      type="text" 
                      value={currentNode.label || ''} 
                      onChange={(e) => handleFieldChange('label', e.target.value)}
                      className="w-full text-2xl font-black text-[#4A4238] bg-transparent border-b border-transparent hover:border-[#D1C6B4] focus:border-[#E8C5C8] outline-none px-1 py-1 transition-colors"
                    />
                  </div>
                  <button onClick={handleDeleteNode} className="shrink-0 text-red-500 hover:bg-red-50 border border-transparent hover:border-red-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                    🗑️ 刪除節點
                  </button>
                </div>
                <div className="flex gap-4">
                  <div className="w-1/2">
                    <label className="block text-xs font-bold text-[#4A4238] mb-1">英文代號 (ID) - 需唯一</label>
                    <input 
                      type="text" 
                      value={currentNode.id} 
                      onChange={(e) => handleFieldChange('id', e.target.value)}
                      className="w-full text-xs font-mono text-[#4A4238]/80 bg-white border border-[#D1C6B4]/50 rounded-lg px-3 py-2 outline-none focus:border-[#E8C5C8]"
                    />
                  </div>
                  <div className="w-1/4">
                    <label className="block text-xs font-bold text-[#4A4238] mb-1">層級 (Level)</label>
                    <input 
                      type="number" 
                      value={currentNode.level ?? 1} 
                      onChange={(e) => handleFieldChange('level', e.target.value)}
                      className="w-full text-xs text-[#4A4238] bg-white border border-[#D1C6B4]/50 rounded-lg px-3 py-2 outline-none focus:border-[#E8C5C8]"
                    />
                  </div>
                  <div className="w-1/4">
                    <label className="block text-xs font-bold text-[#4A4238] mb-1">大小半徑 (Radius)</label>
                    <input 
                      type="number" 
                      value={currentNode.radius ?? ''} 
                      onChange={(e) => handleFieldChange('radius', e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="預設 40"
                      className="w-full text-xs text-[#4A4238] bg-white border border-[#D1C6B4]/50 rounded-lg px-3 py-2 outline-none focus:border-[#E8C5C8]"
                    />
                  </div>
                </div>
                <div className="flex gap-4 mt-4">
                  <div className="w-1/2">
                    <label className="block text-xs font-bold text-[#4A4238] mb-1">父節點 (Parent)</label>
                    <select 
                      value={currentNode.parent || ''} 
                      onChange={(e) => handleFieldChange('parent', e.target.value)}
                      className="w-full text-xs text-[#4A4238] bg-white border border-[#D1C6B4]/50 rounded-lg px-3 py-2 outline-none focus:border-[#E8C5C8]"
                    >
                      <option value="">無 (根節點)</option>
                      {nodes.filter((n: any) => n.id !== currentNode.id).map((n: any) => (
                        <option key={n.id} value={n.id}>{n.label || n.id}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 mt-4">
                  <div className="w-1/2">
                    <label className="block text-xs font-bold text-[#4A4238] mb-1">主題顏色 (Theme Color)</label>
                    <p className="text-[10px] text-[#4A4238]/60 mb-2">此顏色將套用於：節點本身、節點視窗(Drawer)背景、以及專屬留言板(自動變透明/較淺)。</p>
                    <div className="flex gap-2 items-center">
                      <input 
                        type="color" 
                        value={currentNode.color || '#A0F766'} 
                        onChange={(e) => handleFieldChange('color', e.target.value)}
                        className="w-8 h-8 rounded border-none p-0 cursor-pointer"
                      />
                      <input 
                        type="text" 
                        value={currentNode.color || ''} 
                        placeholder="#A0F766"
                        onChange={(e) => handleFieldChange('color', e.target.value)}
                        className="flex-1 text-xs text-[#4A4238] bg-white border border-[#D1C6B4]/50 rounded-lg px-3 py-2 outline-none focus:border-[#E8C5C8]"
                      />
                    </div>
                  </div>
                  <div className="w-1/2">
                    <label className="block text-xs font-bold text-[#4A4238] mb-1">節點形狀 (Shape)</label>
                    <p className="text-[10px] text-[#4A4238]/60 mb-2">若選「自動」，將由上層主幹分支決定其圖形。</p>
                    <select 
                      value={currentNode.shape || ''} 
                      onChange={(e) => handleFieldChange('shape', e.target.value)}
                      className="w-full text-xs text-[#4A4238] bg-white border border-[#D1C6B4]/50 rounded-lg px-3 py-[9px] outline-none focus:border-[#E8C5C8]"
                    >
                      <option value="">✨ 自動 (根據分支決定)</option>
                      <option value="circle">⚪ 圓形 (Circle)</option>
                      <option value="hexagon">⬡ 六邊形 (Hexagon)</option>
                      <option value="octagon">⯃ 八邊形 (Octagon)</option>
                      <option value="diamond">◇ 菱形 (Diamond)</option>
                      <option value="drop">💧 水滴/扇形 (Drop)</option>
                      <option value="plaque">⛩️ 繪馬/匾額 (Plaque)</option>
                      <option value="triangle">△ 三角形 (Triangle)</option>
                      <option value="square">□ 正方形 (Square)</option>
                      <option value="star">⭐ 星形 (Star)</option>
                      <option value="heart">❤️ 愛心 (Heart)</option>
                      <option value="cloud">☁️ 雲朵 (Cloud)</option>
                      <option value="cross">✝️ 十字 (Cross)</option>
                      <option value="badge">🛡️ 徽章 (Badge)</option>
                    </select>
                  </div>
                </div>
              </div>
                
                {/* 圖片管理區塊 */}
                <div className="bg-[#F5EFE6] p-4 rounded-xl border border-[#D1C6B4]/40 flex flex-col xl:flex-row gap-6">
                  {/* Icon */}
                  <div className="flex-1 flex gap-4 items-start">
                    <div className="w-16 h-16 shrink-0 bg-white rounded-xl border border-[#D1C6B4]/50 overflow-hidden flex items-center justify-center p-1 shadow-sm">
                      <img 
                        src={(nodeImages[currentNode.id] as any)?.kamon || nodeImages[currentNode.id]?.icon || `/images/nodes/kamon_${currentNode.id}.png`} 
                        alt="icon" 
                        className="w-full h-full object-contain" 
                        onError={(e) => { e.currentTarget.src = '/images/logo.png'; }}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-[#4A4238] mb-1">節點家徽 (Icon)</label>
                      <p className="text-[10px] text-[#4A4238]/60 mb-2">顯示在心智圖上的圓形標誌，需為極簡日式家徽風格。</p>
                      <div className="flex gap-2">
                        <input type="text" value={(nodeImages[currentNode.id] as any)?.kamon || nodeImages[currentNode.id]?.icon || `/images/nodes/kamon_${currentNode.id}.png`} placeholder={`/images/nodes/kamon_${currentNode.id}.png`}
                          onChange={e => setNodeImages(prev => ({ ...prev, [currentNode.id]: { ...(prev[currentNode.id] as any), kamon: e.target.value, icon: e.target.value } }))}
                          className="flex-1 w-full px-3 py-1.5 rounded-lg border border-[#D1C6B4]/50 focus:border-[#E8C5C8] outline-none text-xs bg-white font-mono" />
                        <label className="shrink-0 cursor-pointer bg-white border border-[#D1C6B4]/50 px-3 py-1.5 rounded-lg text-xs font-bold text-[#4A4238] hover:bg-[#E8C5C8]/30 transition-colors flex items-center">
                          {uploadingState[`${currentNode.id}_icon`] ? '⏳' : '上傳'}
                          <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files && handleFileUpload(currentNode.id, 'icon', e.target.files[0])} disabled={uploadingState[`${currentNode.id}_icon`]} />
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  {/* Drawer Image */}
                  <div className="flex-1 flex gap-4 items-start">
                    <div className="w-24 h-16 shrink-0 bg-white rounded-xl border border-[#D1C6B4]/50 overflow-hidden flex items-center justify-center p-1 shadow-sm">
                      <img 
                        src={(nodeImages[currentNode.id] as any)?.realistic || nodeImages[currentNode.id]?.image || currentNode.image || `/images/nodes/realistic_${currentNode.id}.png`} 
                        alt="drawer" 
                        className="w-full h-full object-cover rounded-lg" 
                        onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlZWVlZWUiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0iIzk5OTk5OSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7nhKHlnJY8L3RleHQ+PC9zdmc+' }}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-[#4A4238] mb-1">視窗情境圖 (Drawer)</label>
                      <p className="text-[10px] text-[#4A4238]/60 mb-2">點擊節點後在側邊欄上方顯示的繪本風格情境圖。</p>
                      <div className="flex gap-2">
                        <input type="text" value={(nodeImages[currentNode.id] as any)?.realistic || nodeImages[currentNode.id]?.image || `/images/nodes/realistic_${currentNode.id}.png`} placeholder={`/images/nodes/realistic_${currentNode.id}.png`}
                          onChange={e => {
                            const val = e.target.value;
                            setNodeImages(prev => ({ ...prev, [currentNode.id]: { ...prev[currentNode.id], realistic: val, image: val } }));
                            handleFieldChange('image', val);
                          }}
                          className="flex-1 w-full px-3 py-1.5 rounded-lg border border-[#D1C6B4]/50 focus:border-[#E8C5C8] outline-none text-xs bg-white" />
                        <label className="shrink-0 cursor-pointer bg-white border border-[#D1C6B4]/50 px-3 py-1.5 rounded-lg text-xs font-bold text-[#4A4238] hover:bg-[#E8C5C8]/30 transition-colors flex items-center">
                          {uploadingState[`${currentNode.id}_image`] ? '⏳' : '上傳'}
                          <input type="file" accept="image/*" className="hidden" onChange={e => {
                            if (e.target.files && e.target.files[0]) {
                              handleFileUpload(currentNode.id, 'image', e.target.files[0]);
                            }
                          }} disabled={uploadingState[`${currentNode.id}_image`]} />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              {/* End of border-b div replacing the old header */}
              
              <EditorField 
                label="簡介 (Intro)" 
                value={currentNode.intro || ''} 
                onChange={(val) => handleFieldChange('intro', val)} 
                rows={3}
                placeholder="輸入該節點的核心概念簡介..."
              />
              
              <EditorField 
                label="實踐方式 (Practice)" 
                value={currentNode.practice || ''} 
                onChange={(val) => handleFieldChange('practice', val)} 
                rows={4}
                placeholder="說明這個玩法具體如何進行..."
              />

              <EditorField 
                label="危險與風險 (Hazard)" 
                value={currentNode.hazard || ''} 
                onChange={(val) => handleFieldChange('hazard', val)} 
                rows={4}
                placeholder="描述可能發生的生理或心理風險..."
              />

              <EditorField 
                label="安全與急救 (First Aid)" 
                value={currentNode.first_aid || ''} 
                onChange={(val) => handleFieldChange('first_aid', val)} 
                rows={4}
                placeholder="發生意外時該如何處理與預防..."
              />

              <EditorField 
                label="深度探討 (Detail Text)" 
                value={currentNode.detail_text || ''} 
                onChange={(val) => handleFieldChange('detail_text', val)} 
                rows={10}
                placeholder="詳細探討其背後的哲學與心理學意義，支援 Markdown 排版。"
              />
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-[#4A4238]/40">
              請從左側選擇一個節點來編輯
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EditorField({ label, value, onChange, rows, placeholder }: { label: string; value: string; onChange: (v: string) => void; rows: number; placeholder: string }) {
  return (
    <div>
      <label className="block text-sm font-bold text-[#4A4238] mb-2">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        spellCheck={false}
        className="w-full px-4 py-3 rounded-xl border border-[#D1C6B4]/50 focus:border-[#E8C5C8] focus:ring-2 focus:ring-[#E8C5C8]/30 outline-none text-sm bg-white placeholder:text-gray-300 resize-y leading-relaxed"
      />
    </div>
  );
}
