"use client";

import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { graphNodes } from '@/lib/constants';
import type { AdminNodeImages } from '@/lib/data/admin';

type EditableNode = {
  id: string;
  label?: string;
  level?: number | string;
  radius?: number | string;
  parent?: string;
  color?: string;
  shape?: string;
  image?: string;
  icon?: string;
  kamonIcon?: string;
  desc?: string;
  intro?: string;
  practice?: string;
  hazard?: string;
  first_aid?: string;
  detail_text?: string;
  [key: string]: unknown;
};

type EditableField =
  | 'id'
  | 'label'
  | 'level'
  | 'radius'
  | 'parent'
  | 'color'
  | 'shape'
  | 'image'
  | 'icon'
  | 'kamonIcon'
  | 'intro'
  | 'practice'
  | 'hazard'
  | 'first_aid'
  | 'detail_text';

type ImageKind = 'icon' | 'image';
type ImageLoadStatus = 'checking' | 'loaded' | 'error';

interface NodeContentEditorProps {
  mindmapJson: string;
  setMindmapJson: Dispatch<SetStateAction<string>>;
  onSave: (keyName: string, data: string | object, isJson?: boolean) => Promise<void>;
  onPublish: () => Promise<void>;
  saving: boolean;
  nodeImages: AdminNodeImages;
  setNodeImages: Dispatch<SetStateAction<AdminNodeImages>>;
  uploadingState: Record<string, boolean>;
  handleFileUpload: (nodeId: string, type: ImageKind, file: File) => Promise<void>;
  preferredNodeId?: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function isEditableNode(value: unknown): value is EditableNode {
  return typeof asRecord(value).id === 'string';
}

function parseNodes(json: string): EditableNode[] {
  try {
    const parsed = JSON.parse(json) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isEditableNode) : [];
  } catch {
    return [];
  }
}

function textValue(value: unknown): string {
  return typeof value === 'string' ? value : value === null || value === undefined ? '' : String(value);
}

function numberValue(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function firstImageValue(values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function defaultKamonPath(nodeId: string): string {
  return nodeId === 'bdsm' ? '/images/nodes/kamon_bdsm.png' : `/images/nodes/kamon_${nodeId}.png`;
}

function defaultRealisticPath(nodeId: string): string {
  return nodeId === 'bdsm' ? '/images/nodes/realistic_bdsm.png' : `/images/nodes/realistic_${nodeId}.png`;
}

function safePreviewColor(value: unknown): string {
  const color = textValue(value);
  return /^#[0-9a-f]{6}$/i.test(color) ? color : '#E8C5C8';
}

function imageSource(node: EditableNode, nodeImages: AdminNodeImages, kind: ImageKind): string {
  const assets = nodeImages[node.id] || {};
  if (kind === 'icon') {
    return firstImageValue([
      assets.kamon,
      assets.icon,
      node.id === 'bdsm' ? defaultKamonPath(node.id) : node.kamonIcon,
      defaultKamonPath(node.id),
    ]);
  }
  return firstImageValue([
    assets.realistic,
    assets.image,
    node.id === 'bdsm' ? defaultRealisticPath(node.id) : node.image,
    defaultRealisticPath(node.id),
  ]);
}

function imageAlt(node: EditableNode, nodeImages: AdminNodeImages, kind: ImageKind): string {
  const assets = nodeImages[node.id] || {};
  const configuredAlt = kind === 'icon' ? assets.iconAlt : assets.imageAlt;
  const label = textValue(node.label) || node.id;
  return textValue(configuredAlt).trim() || (kind === 'icon' ? `${label}家徽圖` : `${label}情境圖`);
}

function imageAltInputValue(node: EditableNode, nodeImages: AdminNodeImages, kind: ImageKind): string {
  const assets = nodeImages[node.id] || {};
  return textValue(kind === 'icon' ? assets.iconAlt : assets.imageAlt);
}

function ImageValidation({ src }: { src: string }) {
  const [status, setStatus] = useState<ImageLoadStatus>('checking');

  useEffect(() => {
    let cancelled = false;
    if (!src.trim()) {
      setStatus('error');
      return () => {
        cancelled = true;
      };
    }

    setStatus('checking');
    const probe = new Image();
    probe.onload = () => {
      if (!cancelled) setStatus('loaded');
    };
    probe.onerror = () => {
      if (!cancelled) setStatus('error');
    };
    probe.src = src;

    return () => {
      cancelled = true;
      probe.onload = null;
      probe.onerror = null;
    };
  }, [src]);

  const statusText = status === 'loaded' ? '圖片可正常載入' : status === 'checking' ? '正在檢查圖片...' : '圖片無法載入，請確認路徑或權限';
  const statusClass = status === 'loaded' ? 'text-emerald-700' : status === 'checking' ? 'text-[#B48B28]' : 'text-red-600';

  return <p className={`mt-1 text-[11px] ${statusClass}`} aria-live="polite">{status === 'loaded' ? '✓' : status === 'checking' ? '⋯' : '!'} {statusText}</p>;
}

function PreviewAsset({ src, alt, className }: { src: string; alt: string; className: string }) {
  const [status, setStatus] = useState<ImageLoadStatus>('checking');

  useEffect(() => {
    setStatus('checking');
  }, [src]);

  return (
    <div className={`relative overflow-hidden bg-[#F5EFE6] ${className}`}>
      {status === 'error' ? (
        <div className="flex h-full min-h-20 items-center justify-center px-3 text-center text-xs font-semibold text-red-600">圖片無法載入</div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          className={`h-full w-full object-cover transition-opacity ${status === 'loaded' ? 'opacity-100' : 'opacity-40'}`}
        />
      )}
      {status === 'checking' && <span className="absolute inset-x-0 bottom-0 bg-black/45 px-2 py-1 text-center text-[10px] text-white">載入中...</span>}
    </div>
  );
}

export default function NodeContentEditor({
  mindmapJson,
  setMindmapJson,
  onSave,
  onPublish,
  saving,
  nodeImages,
  setNodeImages,
  uploadingState,
  handleFileUpload,
  preferredNodeId = 'bdsm',
}: NodeContentEditorProps) {
  const [selectedId, setSelectedId] = useState(preferredNodeId);
  const nodes = useMemo(() => parseNodes(mindmapJson), [mindmapJson]);

  const currentNode = useMemo(
    () => nodes.find((node) => node.id === selectedId) || null,
    [nodes, selectedId],
  );

  useEffect(() => {
    if (nodes.length === 0) return;
    if (nodes.some((node) => node.id === selectedId)) return;
    const preferredId = nodes.some((node) => node.id === 'bdsm') ? 'bdsm' : nodes[0].id;
    setSelectedId(preferredId);
  }, [nodes, selectedId]);

  const handleFieldChange = (field: EditableField, value: unknown) => {
    if (!currentNode) return;
    const updatedNodes = nodes.map((node) => node.id === selectedId ? { ...node, [field]: value } : node);
    setMindmapJson(JSON.stringify(updatedNodes, null, 2));
  };

  const updateImageAsset = (kind: ImageKind, value: string) => {
    if (!currentNode) return;
    setNodeImages((previous) => ({
      ...previous,
      [currentNode.id]: {
        ...(previous[currentNode.id] || {}),
        ...(kind === 'icon' ? { kamon: value, icon: value } : { realistic: value, image: value }),
      },
    }));
    handleFieldChange(kind === 'icon' ? 'kamonIcon' : 'image', value);
  };

  const updateImageAlt = (kind: ImageKind, value: string) => {
    if (!currentNode) return;
    setNodeImages((previous) => ({
      ...previous,
      [currentNode.id]: {
        ...(previous[currentNode.id] || {}),
        ...(kind === 'icon' ? { iconAlt: value } : { imageAlt: value }),
      },
    }));
  };

  const handleSaveAll = async () => {
    await onSave('node_images', nodeImages, false);
    await onSave('mindmap_data', mindmapJson, true);
  };

  const handleAddNode = () => {
    const newNodeId = `new_node_${Date.now()}`;
    const newNode: EditableNode = {
      id: newNodeId,
      label: '新增節點',
      level: currentNode ? numberValue(currentNode.level, 0) + 1 : 1,
      parent: currentNode?.id || '',
      intro: '',
      practice: '',
      hazard: '',
      first_aid: '',
      detail_text: '',
      color: '#A0F766',
      shape: '',
    };

    setMindmapJson(JSON.stringify([...nodes, newNode], null, 2));
    setSelectedId(newNodeId);
  };

  const handleDeleteNode = () => {
    if (!currentNode) return;
    const label = textValue(currentNode.label) || currentNode.id;
    if (!confirm(`確定要刪除「${label}」嗎？這也會影響相依的子節點連線。`)) return;
    const updatedNodes = nodes.filter((node) => node.id !== currentNode.id);
    setMindmapJson(JSON.stringify(updatedNodes, null, 2));
    setSelectedId(updatedNodes.some((node) => node.id === 'bdsm') ? 'bdsm' : updatedNodes[0]?.id || '');
  };

  if (nodes.length === 0) {
    return (
      <div className="rounded-2xl border border-[#D1C6B4]/30 bg-white/70 py-10 text-center">
        <p className="text-[#4A4238]/60">沒有找到節點資料。請確認 JSON 欄位是否正確。</p>
      </div>
    );
  }

  const iconSrc = currentNode ? imageSource(currentNode, nodeImages, 'icon') : '';
  const drawerSrc = currentNode ? imageSource(currentNode, nodeImages, 'image') : '';
  const iconAlt = currentNode ? imageAlt(currentNode, nodeImages, 'icon') : '';
  const drawerAlt = currentNode ? imageAlt(currentNode, nodeImages, 'image') : '';
  const selectedIsTemplate = currentNode?.id === preferredNodeId;
  const templateLabel = preferredNodeId === 'community_safety' ? 'community_safety 第二節點樣板' : 'BDSM 大廳樣板';

  return (
    <div className="rounded-2xl border border-[#D1C6B4]/30 bg-white/90 p-4 shadow-sm sm:p-6">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-[#362E25]">節點內容視覺化編輯器</h2>
          <p className="mt-1 text-xs text-[#4A4238]/60">先儲存草稿，確認右側預覽與圖片狀態正確後，再發布到前台。</p>
        </div>
        <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() => {
              if (confirm('確定要載入標準的【10 大精簡版節點結構】嗎？這將會替換目前的編輯器內容，請記得儲存草稿。')) {
                setMindmapJson(JSON.stringify(graphNodes, null, 2));
                setSelectedId('bdsm');
              }
            }}
            className="rounded-xl border border-[#B5C4B1] bg-[#C5D4B6]/50 px-4 py-2 text-xs font-bold text-[#362E25] shadow-2xs transition-all hover:bg-[#C5D4B6]"
          >
            載入完整 10 大節點與文本
          </button>
          <button
            type="button"
            onClick={() => void handleSaveAll()}
            disabled={saving}
            className="rounded-xl border border-[#D1C6B4] bg-white px-4 py-2.5 text-sm font-bold text-[#4A4238] shadow-sm transition-all hover:bg-[#F5EFE6] disabled:opacity-50"
          >
            {saving ? '儲存中...' : '儲存草稿'}
          </button>
          <button
            type="button"
            onClick={async () => {
              if (confirm('確定要把目前的節點圖片與文本發布到前台嗎？')) await onPublish();
            }}
            disabled={saving}
            className="rounded-xl bg-[#4A4238] px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-[#4A4238]/80 disabled:opacity-50"
          >
            {saving ? '處理中...' : '發布到前台'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        <div className="flex w-full shrink-0 flex-col gap-2 md:w-64">
          <div className="max-h-[600px] space-y-2 overflow-y-auto pr-2">
            {nodes.map((node) => (
              <button
                key={node.id}
                type="button"
                onClick={() => setSelectedId(node.id)}
                className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-all ${selectedId === node.id ? 'border-[#E8C5C8] bg-[#E8C5C8]/40 text-[#4A4238] shadow-sm' : 'border-[#D1C6B4]/30 bg-white text-[#4A4238]/70 hover:border-[#D1C6B4] hover:bg-[#F5EFE6]'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{textValue(node.label) || node.id}</span>
                  <span className="shrink-0 rounded-full border border-black/5 bg-white/50 px-2 py-0.5 text-[10px]">Lv.{textValue(node.level) || '-'}</span>
                </div>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleAddNode}
            className="mt-2 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#D1C6B4] py-3 text-sm font-bold text-[#4A4238]/60 transition-all hover:border-[#4A4238]/50 hover:bg-[#F5EFE6] hover:text-[#4A4238]"
          >
            <span>+</span> 新增節點
          </button>
        </div>

        <div className="min-w-0 flex-1 space-y-5 rounded-xl border border-[#D1C6B4]/30 bg-[#FDFBF7] p-4 sm:p-6">
          {currentNode ? (
            <>
              {selectedIsTemplate && (
                <div className="rounded-xl border border-[#E8C5C8] bg-[#E8C5C8]/20 px-4 py-3 text-sm text-[#4A4238]">
                  <strong>{templateLabel}</strong>：目前節點會沿用通用圖片、Alt text、即時預覽與草稿／發布流程；前台只會讀取已發布版本。
                </div>
              )}

              <div className="border-b border-[#D1C6B4]/30 pb-5">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <label className="mb-1 block text-xs font-bold text-[#4A4238]">節點名稱（Label）</label>
                    <input type="text" value={textValue(currentNode.label)} onChange={(event) => handleFieldChange('label', event.target.value)} className="w-full border-b border-transparent bg-transparent px-1 py-1 text-2xl font-black text-[#4A4238] outline-none transition-colors hover:border-[#D1C6B4] focus:border-[#E8C5C8]" />
                  </div>
                  <button type="button" onClick={handleDeleteNode} className="shrink-0 rounded-lg border border-transparent px-3 py-1.5 text-xs font-bold text-red-500 transition-colors hover:border-red-200 hover:bg-red-50">刪除節點</button>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-bold text-[#4A4238]">英文代號（ID）— 需唯一</label>
                    <input type="text" value={currentNode.id} onChange={(event) => handleFieldChange('id', event.target.value)} className="w-full rounded-lg border border-[#D1C6B4]/50 bg-white px-3 py-2 text-xs font-mono text-[#4A4238]/80 outline-none focus:border-[#E8C5C8]" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-[#4A4238]">層級（Level）</label>
                    <input type="number" value={textValue(currentNode.level) || '1'} onChange={(event) => handleFieldChange('level', event.target.value)} className="w-full rounded-lg border border-[#D1C6B4]/50 bg-white px-3 py-2 text-xs text-[#4A4238] outline-none focus:border-[#E8C5C8]" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-[#4A4238]">大小半徑（Radius）</label>
                    <input type="number" value={textValue(currentNode.radius)} onChange={(event) => handleFieldChange('radius', event.target.value ? Number(event.target.value) : undefined)} placeholder="預設 40" className="w-full rounded-lg border border-[#D1C6B4]/50 bg-white px-3 py-2 text-xs text-[#4A4238] outline-none focus:border-[#E8C5C8]" />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-[#4A4238]">父節點（Parent）</label>
                    <select value={textValue(currentNode.parent)} onChange={(event) => handleFieldChange('parent', event.target.value)} className="w-full rounded-lg border border-[#D1C6B4]/50 bg-white px-3 py-2 text-xs text-[#4A4238] outline-none focus:border-[#E8C5C8]">
                      <option value="">無（根節點）</option>
                      {nodes.filter((node) => node.id !== currentNode.id).map((node) => <option key={node.id} value={node.id}>{textValue(node.label) || node.id}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-[#4A4238]">節點形狀（Shape）</label>
                    <select value={textValue(currentNode.shape)} onChange={(event) => handleFieldChange('shape', event.target.value)} className="w-full rounded-lg border border-[#D1C6B4]/50 bg-white px-3 py-2 text-xs text-[#4A4238] outline-none focus:border-[#E8C5C8]">
                      <option value="">自動（根據分支決定）</option>
                      <option value="circle">圓形</option>
                      <option value="hexagon">六邊形</option>
                      <option value="octagon">八邊形</option>
                      <option value="diamond">菱形</option>
                      <option value="drop">水滴／扇形</option>
                      <option value="plaque">繪馬／匾額</option>
                      <option value="triangle">三角形</option>
                      <option value="square">正方形</option>
                      <option value="star">星形</option>
                      <option value="heart">愛心</option>
                      <option value="cloud">雲朵</option>
                      <option value="cross">十字</option>
                      <option value="badge">徽章</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="mb-1 block text-xs font-bold text-[#4A4238]">主題顏色</label>
                  <p className="mb-2 text-[10px] text-[#4A4238]/60">此顏色將套用於節點本身、節點視窗背景與專屬留言板。</p>
                  <div className="flex items-center gap-2">
                    <input type="color" value={safePreviewColor(currentNode.color)} onChange={(event) => handleFieldChange('color', event.target.value)} className="h-8 w-8 cursor-pointer rounded border-none p-0" />
                    <input type="text" value={textValue(currentNode.color)} placeholder="#E8C5C8" onChange={(event) => handleFieldChange('color', event.target.value)} className="flex-1 rounded-lg border border-[#D1C6B4]/50 bg-white px-3 py-2 text-xs text-[#4A4238] outline-none focus:border-[#E8C5C8]" />
                  </div>
                </div>
              </div>

              <div className="space-y-5 rounded-xl border border-[#D1C6B4]/40 bg-[#F5EFE6] p-4">
                <ImageEditorBlock kind="icon" label="節點家徽（Icon）" description="顯示在心智圖上的圓形標誌，建議使用極簡日式家徽風格。" src={iconSrc} alt={iconAlt} altValue={imageAltInputValue(currentNode, nodeImages, 'icon')} nodeId={currentNode.id} uploading={Boolean(uploadingState[`${currentNode.id}_icon`])} onImageChange={(value) => updateImageAsset('icon', value)} onAltChange={(value) => updateImageAlt('icon', value)} onUpload={(file) => void handleFileUpload(currentNode.id, 'icon', file)} previewClassName="h-20 w-20 shrink-0 rounded-xl border border-[#D1C6B4]/50 bg-white p-1 shadow-sm" />
                <ImageEditorBlock kind="image" label="視窗情境圖（Drawer）" description="點擊節點後在側邊欄上方顯示的情境圖。" src={drawerSrc} alt={drawerAlt} altValue={imageAltInputValue(currentNode, nodeImages, 'image')} nodeId={currentNode.id} uploading={Boolean(uploadingState[`${currentNode.id}_image`])} onImageChange={(value) => updateImageAsset('image', value)} onAltChange={(value) => updateImageAlt('image', value)} onUpload={(file) => void handleFileUpload(currentNode.id, 'image', file)} previewClassName="h-20 w-28 shrink-0 rounded-xl border border-[#D1C6B4]/50 bg-white p-1 shadow-sm" />
              </div>

              <EditorField label="簡介（Intro）" value={textValue(currentNode.intro)} onChange={(value) => handleFieldChange('intro', value)} rows={3} placeholder="輸入該節點的核心概念簡介..." />
              <EditorField label="實踐方式（Practice）" value={textValue(currentNode.practice)} onChange={(value) => handleFieldChange('practice', value)} rows={4} placeholder="說明這個玩法具體如何進行..." />
              <EditorField label="危險與風險（Hazard）" value={textValue(currentNode.hazard)} onChange={(value) => handleFieldChange('hazard', value)} rows={4} placeholder="描述可能發生的生理或心理風險..." />
              <EditorField label="安全與急救（First Aid）" value={textValue(currentNode.first_aid)} onChange={(value) => handleFieldChange('first_aid', value)} rows={4} placeholder="發生意外時該如何處理與預防..." />
              <EditorField label="深度探討（Detail Text）" value={textValue(currentNode.detail_text)} onChange={(value) => handleFieldChange('detail_text', value)} rows={10} placeholder="詳細探討其背後的哲學與心理學意義，支援 Markdown 排版。" />
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-[#4A4238]/40">請從左側選擇一個節點來編輯</div>
          )}
        </div>
      </div>

      {currentNode && <NodePreview node={currentNode} iconSrc={iconSrc} drawerSrc={drawerSrc} iconAlt={iconAlt} drawerAlt={drawerAlt} />}
    </div>
  );
}

function ImageEditorBlock({
  kind,
  label,
  description,
  src,
  alt,
  altValue,
  nodeId,
  uploading,
  onImageChange,
  onAltChange,
  onUpload,
  previewClassName,
}: {
  kind: ImageKind;
  label: string;
  description: string;
  src: string;
  alt: string;
  altValue: string;
  nodeId: string;
  uploading: boolean;
  onImageChange: (value: string) => void;
  onAltChange: (value: string) => void;
  onUpload: (file: File) => void;
  previewClassName: string;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <PreviewAsset src={src} alt={alt} className={previewClassName} />
      <div className="min-w-0 flex-1">
        <label className="mb-1 block text-xs font-bold text-[#4A4238]">{label}</label>
        <p className="mb-2 text-[10px] text-[#4A4238]/60">{description}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input type="text" value={src} onChange={(event) => onImageChange(event.target.value)} placeholder={kind === 'icon' ? `/images/nodes/kamon_${nodeId}.png` : `/images/nodes/realistic_${nodeId}.png`} className="min-w-0 flex-1 rounded-lg border border-[#D1C6B4]/50 bg-white px-3 py-1.5 text-xs outline-none focus:border-[#E8C5C8]" />
          <label className="flex shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[#D1C6B4]/50 bg-white px-3 py-1.5 text-xs font-bold text-[#4A4238] transition-colors hover:bg-[#E8C5C8]/30">
            {uploading ? '上傳中...' : '上傳圖片'}
            <input type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(file); }} disabled={uploading} />
          </label>
        </div>
        <ImageValidation src={src} />
        <label className="mt-3 block text-xs font-bold text-[#4A4238]">圖片替代文字（Alt text）</label>
        <input type="text" value={altValue} onChange={(event) => onAltChange(event.target.value)} placeholder={kind === 'icon' ? '例如：BDSM 大廳家徽圖' : '例如：BDSM 大廳情境圖'} className="mt-1 w-full rounded-lg border border-[#D1C6B4]/50 bg-white px-3 py-1.5 text-xs outline-none focus:border-[#E8C5C8]" />
        <p className="mt-1 text-[10px] text-[#4A4238]/60">留白時會使用節點名稱作為前台替代文字。</p>
      </div>
    </div>
  );
}

function NodePreview({ node, iconSrc, drawerSrc, iconAlt, drawerAlt }: { node: EditableNode; iconSrc: string; drawerSrc: string; iconAlt: string; drawerAlt: string }) {
  const label = textValue(node.label) || node.id;
  const previewDiameter = Math.max(112, Math.min(190, numberValue(node.radius, 50) * 2.2));
  const color = safePreviewColor(node.color);

  return (
    <section className="mt-6 rounded-2xl border border-[#D1C6B4]/40 bg-[#F5EFE6] p-4 sm:p-6" aria-labelledby="node-preview-title">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 id="node-preview-title" className="text-lg font-black text-[#362E25]">前台效果預覽</h3>
          <p className="text-xs text-[#4A4238]/60">此處預覽的是目前編輯中的資料；儲存草稿不會改變前台，發布後才會生效。</p>
        </div>
        <span className="w-fit rounded-full border border-[#D1C6B4]/50 bg-white/70 px-3 py-1 text-[11px] font-bold text-[#4A4238]">目前節點：{label}</span>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)]">
        <div className="rounded-xl border border-[#D1C6B4]/30 bg-white/80 p-5">
          <p className="mb-4 text-xs font-bold tracking-wide text-[#B48B28]">心智圖節點</p>
          <div className="flex min-h-56 flex-col items-center justify-center gap-4">
            <div className="flex items-center justify-center rounded-full border-4 border-white shadow-lg" style={{ width: previewDiameter, height: previewDiameter, backgroundColor: color }}>
              <PreviewAsset src={iconSrc} alt={iconAlt} className="h-[72%] w-[72%] rounded-full bg-white/60 p-2" />
            </div>
            <div className="max-w-full rounded-full px-4 py-2 text-center text-sm font-black text-[#362E25]" style={{ backgroundColor: `${color}99` }}>{label}</div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#D1C6B4]/30 bg-white/80">
          <div className="h-40 sm:h-52"><PreviewAsset src={drawerSrc} alt={drawerAlt} className="h-full w-full" /></div>
          <div className="space-y-3 p-5">
            <p className="text-xs font-black tracking-wide text-[#B48B28]">節點抽屜</p>
            <h4 className="text-2xl font-black text-[#1A1612]">{label}</h4>
            {textValue(node.desc) && <p className="text-sm font-medium leading-relaxed text-[#2C251E]">{textValue(node.desc)}</p>}
            <PreviewText label="簡介" value={textValue(node.intro)} />
            <PreviewText label="實踐方式" value={textValue(node.practice)} />
            <PreviewText label="危險與風險" value={textValue(node.hazard)} />
            <PreviewText label="安全與急救" value={textValue(node.first_aid)} />
          </div>
        </div>
      </div>
    </section>
  );
}

function PreviewText({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <div className="border-t border-[#D1C6B4]/30 pt-3">
      <p className="mb-1 text-xs font-bold text-[#4A4238]">{label}</p>
      <p className="line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-[#4A4238]/80">{value}</p>
    </div>
  );
}

function EditorField({ label, value, onChange, rows, placeholder }: { label: string; value: string; onChange: (value: string) => void; rows: number; placeholder: string }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-[#4A4238]">{label}</label>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} placeholder={placeholder} spellCheck={false} className="w-full resize-y rounded-xl border border-[#D1C6B4]/50 bg-white px-4 py-3 text-sm leading-relaxed outline-none placeholder:text-gray-300 focus:border-[#E8C5C8] focus:ring-2 focus:ring-[#E8C5C8]/30" />
    </div>
  );
}
