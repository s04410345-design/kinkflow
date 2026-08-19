"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GraphNode } from '@/lib/types';
import {
  createEmptyArticleDocument,
  formatArticleDate,
  isSafeArticleUrl,
  parseArticleDocument,
  type ArticleDocument,
  type ArticleMedia,
  type ArticleSection,
} from '@/lib/data/articles';
import {
  fetchAdminArticles,
  publishAdminArticle,
  saveAdminArticleDraft,
  setAdminArticleStatus,
  type AdminArticle,
} from '@/lib/data/adminArticles';
import MarkdownPreview from '@/components/MarkdownPreview';

type ArticleContentEditorProps = {
  nodesData: GraphNode[];
  adminLevel: number | null;
  onMessage: (message: string) => void;
};

type MediaTarget = 'cover' | { sectionIndex: number; mediaIndex: number };

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('圖片讀取失敗。'));
    reader.readAsDataURL(file);
  });
}

function emptyMedia(type: ArticleMedia['type'] = 'image'): ArticleMedia {
  return { type, url: '', alt: '', caption: '' };
}

function makeSlug(title: string): string {
  return title.trim().toLocaleLowerCase('en-US').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 220);
}

function statusLabel(status: AdminArticle['status']): string {
  if (status === 'published') return '已發布';
  if (status === 'hidden') return '已隱藏';
  if (status === 'deleted') return '已刪除';
  return '草稿';
}

function statusClass(status: AdminArticle['status']): string {
  if (status === 'published') return 'bg-[#EEF4EA] text-[#47633C]';
  if (status === 'hidden') return 'bg-[#F5EFE6] text-[#6B5A4A]';
  return 'bg-[#FFF9E8] text-[#6B5310]';
}

export default function ArticleContentEditor({ nodesData, adminLevel, onMessage }: ArticleContentEditorProps) {
  const [articles, setArticles] = useState<AdminArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [document, setDocument] = useState<ArticleDocument>(createEmptyArticleDocument());
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [coverMediaId, setCoverMediaId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const canEdit = adminLevel !== null && adminLevel < 3;
  const editableNodes = useMemo(() => nodesData.filter((node) => node.level > 0), [nodesData]);

  const loadArticles = useCallback(async () => {
    setLoading(true);
    try {
      setArticles(await fetchAdminArticles());
    } catch (error) {
      onMessage(error instanceof Error ? `❌ ${error.message}` : '❌ 專題文章載入失敗。');
    } finally {
      setLoading(false);
    }
  }, [onMessage]);

  // 載入外部資料後同步更新後台文章清單，這裡需要保留 effect。
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadArticles();
  }, [loadArticles]);

  const resetEditor = () => {
    setSelectedId(null);
    setEditorOpen(false);
    setTitle('');
    setSlug('');
    setExcerpt('');
    setDocument(createEmptyArticleDocument());
    setSelectedNodeIds([]);
    setCoverMediaId(null);
    setPreviewOpen(false);
  };

  const openNewArticle = () => {
    setSelectedId(null);
    setEditorOpen(true);
    setTitle('');
    setSlug('');
    setExcerpt('');
    setDocument(createEmptyArticleDocument());
    setSelectedNodeIds([editableNodes[0]?.id || ''].filter(Boolean));
    setCoverMediaId(null);
    setPreviewOpen(false);
    onMessage('');
  };

  const openArticle = (article: AdminArticle) => {
    setSelectedId(article.id);
    setEditorOpen(true);
    setTitle(article.title);
    setSlug(article.slug);
    setExcerpt(article.excerpt);
    setDocument(parseArticleDocument(article.bodyJson, 'draft'));
    setSelectedNodeIds(article.nodeIds);
    setCoverMediaId(article.coverMediaId);
    setPreviewOpen(false);
    onMessage('');
  };

  const updateDocument = (patch: Partial<ArticleDocument>) => {
    setDocument((current) => ({ ...current, ...patch }));
  };

  const updateSection = (index: number, patch: Partial<ArticleSection>) => {
    setDocument((current) => ({
      ...current,
      sections: current.sections.map((section, sectionIndex) => sectionIndex === index ? { ...section, ...patch } : section),
    }));
  };

  const addSection = () => {
    setDocument((current) => ({
      ...current,
      sections: [...current.sections, { id: `section-${Date.now()}`, heading: '', markdown: '', media: [], collapsible: true, defaultOpen: true }],
    }));
  };

  const removeSection = (index: number) => {
    setDocument((current) => ({ ...current, sections: current.sections.filter((_, sectionIndex) => sectionIndex !== index) }));
  };

  const updateSectionMedia = (sectionIndex: number, mediaIndex: number, patch: Partial<ArticleMedia>) => {
    setDocument((current) => ({
      ...current,
      sections: current.sections.map((section, index) => index !== sectionIndex ? section : {
        ...section,
        media: section.media.map((media, indexInMedia) => indexInMedia === mediaIndex ? { ...media, ...patch } : media),
      }),
    }));
  };

  const addSectionMedia = (sectionIndex: number, type: ArticleMedia['type']) => {
    setDocument((current) => ({
      ...current,
      sections: current.sections.map((section, index) => index === sectionIndex ? { ...section, media: [...section.media, emptyMedia(type)] } : section),
    }));
  };

  const removeSectionMedia = (sectionIndex: number, mediaIndex: number) => {
    setDocument((current) => ({
      ...current,
      sections: current.sections.map((section, index) => index === sectionIndex ? { ...section, media: section.media.filter((_, indexInMedia) => indexInMedia !== mediaIndex) } : section),
    }));
  };

  const uploadImage = async (file: File, target: MediaTarget) => {
    if (!canEdit) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      onMessage('❌ 圖片只支援 JPG、PNG 或 WebP。');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      onMessage('❌ 圖片不可超過 2 MB，請先壓縮後再上傳。');
      return;
    }
    setSaving(true);
    try {
      const base64 = await readFileAsDataUrl(file);
      const response = await fetch('/api/uploadImage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ base64, fileName: `article-${Date.now()}-${file.name}` }) });
      const payload = await response.json().catch(() => ({})) as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || '圖片上傳失敗。');
      if (target === 'cover') {
        updateDocument({ cover: { ...document.cover, type: 'image', url: payload.url, alt: document.cover?.alt || '', caption: document.cover?.caption || '' } });
      } else {
        setDocument((current) => ({
          ...current,
          sections: current.sections.map((section, sectionIndex) => sectionIndex !== target.sectionIndex ? section : {
            ...section,
            media: section.media.map((media, mediaIndex) => mediaIndex === target.mediaIndex ? { ...media, type: 'image', url: payload.url || '' } : media),
          }),
        }));
      }
      onMessage('✅ 圖片已上傳到媒體儲存，記得儲存草稿。');
    } catch (error) {
      onMessage(error instanceof Error ? `❌ ${error.message}` : '❌ 圖片上傳失敗。');
    } finally {
      setSaving(false);
    }
  };

  const saveDraft = async () => {
    if (!canEdit) return;
    if (!title.trim()) { onMessage('❌ 請先填寫專題標題。'); return; }
    const invalidMedia = [document.cover, ...document.sections.flatMap((section) => section.media)].find((media) => media && media.url && !isSafeArticleUrl(media.url));
    if (invalidMedia) { onMessage('❌ 圖片或影片網址只接受 http／https。'); return; }
    setSaving(true);
    const result = await saveAdminArticleDraft({ id: selectedId || undefined, title, slug: slug || makeSlug(title), excerpt, document, nodeIds: selectedNodeIds, coverMediaId });
    if (result.ok) {
      onMessage('✅ 專題草稿已儲存；前台仍維持目前已發布版本。');
      await loadArticles();
      if (result.articleId) setSelectedId(result.articleId);
    } else onMessage(`❌ ${result.message || '專題草稿儲存失敗。'}`);
    setSaving(false);
  };

  const publish = async () => {
    if (!canEdit || !selectedId) { onMessage('❌ 請先儲存文章草稿，再進行發布。'); return; }
    if (!window.confirm('確定要發布這篇專題嗎？發布後前台會讀取這個版本。')) return;
    setSaving(true);
    const result = await publishAdminArticle(selectedId);
    if (result.ok) {
      onMessage('✅ 專題已發布，前台現在會顯示這個版本。');
      await loadArticles();
    } else onMessage(`❌ ${result.message || '專題發布失敗。'}`);
    setSaving(false);
  };

  const toggleHidden = async (article: AdminArticle) => {
    if (!canEdit) return;
    setSaving(true);
    const nextStatus = article.status === 'hidden' ? 'draft' : 'hidden';
    const result = await setAdminArticleStatus(article.id, nextStatus);
    if (result.ok) {
      onMessage(nextStatus === 'hidden' ? '✅ 專題已隱藏，前台不會顯示。' : '✅ 專題已恢復為草稿。');
      await loadArticles();
    } else onMessage(`❌ ${result.message || '文章狀態更新失敗。'}`);
    setSaving(false);
  };

  return (
    <div className="rounded-3xl border border-[#D1C6B4]/40 bg-white/80 p-5 shadow-sm md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#A27B21]">Article Journal CMS</p>
          <h2 className="mt-1 text-2xl font-black text-[#1A1612]">專題誌內容管理</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4A4238]/70">在這裡統一管理長文、封面、章節圖片、影片網址與替代文字。儲存草稿不會影響前台，只有按下發布後，訪客才會看到新版本。</p>
        </div>
        <button type="button" onClick={openNewArticle} disabled={!canEdit} className="rounded-xl bg-[#1A1612] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#4A4238] disabled:cursor-not-allowed disabled:opacity-40">新增專題</button>
      </div>

      {editorOpen && (
        <div className="mt-6 rounded-2xl border border-[#D9B650]/50 bg-[#FFF9E8]/50 p-4 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#A27B21]">Draft Editor</p><h3 className="mt-1 text-xl font-black">{selectedId ? '編輯專題草稿' : '建立新的長文專題'}</h3></div>
            <button type="button" onClick={resetEditor} className="text-sm font-bold text-[#4A4238]/60">關閉編輯器</button>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <label className="block text-sm font-bold">專題標題<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} className="mt-2 w-full rounded-xl border border-[#D1C6B4]/70 bg-white p-3 font-normal outline-none focus:border-[#A27B21]" placeholder="例如：建立安全而有餘裕的探索關係" /></label>
            <label className="block text-sm font-bold">網址代稱<input value={slug} onChange={(event) => setSlug(event.target.value)} maxLength={240} className="mt-2 w-full rounded-xl border border-[#D1C6B4]/70 bg-white p-3 font-normal outline-none focus:border-[#A27B21]" placeholder="留白會依標題產生英數代稱" /></label>
          </div>
          <label className="mt-4 block text-sm font-bold">文章摘要<textarea value={excerpt} onChange={(event) => setExcerpt(event.target.value)} maxLength={500} className="mt-2 min-h-24 w-full rounded-xl border border-[#D1C6B4]/70 bg-white p-3 font-normal leading-6 outline-none focus:border-[#A27B21]" placeholder="列表卡片與搜尋結果會顯示這段摘要。" /></label>

          <div className="mt-4 rounded-2xl border border-[#D1C6B4]/60 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="font-black">導言正文</h4><p className="mt-1 text-xs leading-5 text-[#4A4238]/60">支援 Markdown；圖片與影片請使用下方媒體欄位，前台會安全渲染。</p></div><span className="text-xs text-[#4A4238]/50">{document.introMarkdown.length} 字</span></div>
            <textarea value={document.introMarkdown} onChange={(event) => updateDocument({ introMarkdown: event.target.value })} className="mt-3 min-h-52 w-full rounded-xl border border-[#D1C6B4]/70 bg-[#FDFBF7] p-3 font-mono text-sm leading-6 outline-none focus:border-[#A27B21]" placeholder={'可以寫完整導言、背景與閱讀提示。\n\n支援 **粗體**、清單、引用與連結。'} />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#D1C6B4]/60 bg-white p-4">
              <div className="flex items-center justify-between gap-3"><div><h4 className="font-black">封面圖片</h4><p className="mt-1 text-xs text-[#4A4238]/60">可貼上既有圖片網址，或上傳 JPG／PNG／WebP。</p></div><label className="cursor-pointer rounded-lg border border-[#D1C6B4]/70 px-3 py-1.5 text-xs font-bold">上傳<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file, 'cover'); event.currentTarget.value = ''; }} /></label></div>
              <input value={document.cover?.url || ''} onChange={(event) => updateDocument({ cover: { ...(document.cover || emptyMedia()), type: 'image', url: event.target.value, alt: document.cover?.alt || '', caption: document.cover?.caption || '' } })} className="mt-3 w-full rounded-xl border border-[#D1C6B4]/70 p-3 text-sm" placeholder="https://.../cover.webp" />
              <input value={document.cover?.alt || ''} onChange={(event) => updateDocument({ cover: document.cover ? { ...document.cover, alt: event.target.value } : { ...emptyMedia(), url: '', alt: event.target.value } })} className="mt-2 w-full rounded-xl border border-[#D1C6B4]/70 p-3 text-sm" placeholder="封面替代文字（alt text）" />
              <input value={document.cover?.caption || ''} onChange={(event) => updateDocument({ cover: document.cover ? { ...document.cover, caption: event.target.value } : { ...emptyMedia(), url: '', caption: event.target.value } })} className="mt-2 w-full rounded-xl border border-[#D1C6B4]/70 p-3 text-sm" placeholder="封面說明（選填）" />
            </div>
            <div className="rounded-2xl border border-[#D1C6B4]/60 bg-white p-4"><h4 className="font-black">閱讀與分類</h4><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold">預估閱讀分鐘<input type="number" min={1} max={999} value={document.readMinutes} onChange={(event) => updateDocument({ readMinutes: Math.min(999, Math.max(1, Number(event.target.value) || 1)) })} className="mt-2 w-full rounded-xl border border-[#D1C6B4]/70 p-3 font-normal" /></label><label className="flex items-end gap-2 pb-3 text-sm font-bold"><input type="checkbox" checked={document.featured} onChange={(event) => updateDocument({ featured: event.target.checked })} className="h-4 w-4 accent-[#A27B21]" />標記為熱門推薦</label></div><label className="mt-3 block text-sm font-bold">標籤<input value={document.tags.join('、')} onChange={(event) => updateDocument({ tags: event.target.value.split(/[、,，]/).map((tag) => tag.trim()).filter(Boolean).slice(0, 20) })} className="mt-2 w-full rounded-xl border border-[#D1C6B4]/70 p-3 font-normal" placeholder="安全、關係、溝通" /></label></div>
          </div>

          <div className="mt-4 rounded-2xl border border-[#D1C6B4]/60 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="font-black">Mind Map 節點關聯</h4><p className="mt-1 text-xs text-[#4A4238]/60">最多選擇 3 個節點，文章會出現在對應節點的專題入口。</p></div><span className="text-xs text-[#4A4238]/50">已選 {selectedNodeIds.length}/3</span></div>
            <div className="mt-3 flex flex-wrap gap-2">{editableNodes.map((node) => { const selected = selectedNodeIds.includes(node.id); return <button key={node.id} type="button" onClick={() => setSelectedNodeIds((current) => selected ? current.filter((id) => id !== node.id) : current.length < 3 ? [...current, node.id] : current)} className={`rounded-full px-3 py-2 text-xs font-bold transition ${selected ? 'text-white' : 'border border-[#D1C6B4]/70 bg-[#FDFBF7] text-[#4A4238]'}`} style={selected ? { backgroundColor: node.color || '#4A4238' } : undefined}>{selected ? '✓ ' : ''}{node.label}</button>; })}</div>
          </div>

          <div className="mt-4 space-y-4">
            {document.sections.map((section, sectionIndex) => (
              <div key={section.id} className="rounded-2xl border border-[#D1C6B4]/60 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3"><h4 className="font-black">第 {sectionIndex + 1} 章</h4><div className="flex items-center gap-3"><label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={section.collapsible} onChange={(event) => updateSection(sectionIndex, { collapsible: event.target.checked })} className="accent-[#A27B21]" />可收合</label><label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={section.defaultOpen} onChange={(event) => updateSection(sectionIndex, { defaultOpen: event.target.checked })} className="accent-[#A27B21]" />預設展開</label><button type="button" onClick={() => removeSection(sectionIndex)} className="text-xs font-bold text-[#9F1239]">刪除本章</button></div></div>
                <input value={section.heading} onChange={(event) => updateSection(sectionIndex, { heading: event.target.value })} className="mt-3 w-full rounded-xl border border-[#D1C6B4]/70 p-3 text-sm font-bold" placeholder="章節標題" />
                <textarea value={section.markdown} onChange={(event) => updateSection(sectionIndex, { markdown: event.target.value })} className="mt-3 min-h-40 w-full rounded-xl border border-[#D1C6B4]/70 bg-[#FDFBF7] p-3 font-mono text-sm leading-6" placeholder="這一章的詳細內容……" />
                <div className="mt-3 rounded-xl bg-[#FDFBF7] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-black">本章媒體</p><p className="mt-1 text-xs text-[#4A4238]/60">圖片可直接上傳；影片請貼上 YouTube、Vimeo 或安全的影片網址。</p></div><div className="flex gap-2"><button type="button" onClick={() => addSectionMedia(sectionIndex, 'image')} className="rounded-lg border border-[#D1C6B4]/70 px-3 py-1.5 text-xs font-bold">＋圖片</button><button type="button" onClick={() => addSectionMedia(sectionIndex, 'video')} className="rounded-lg border border-[#D1C6B4]/70 px-3 py-1.5 text-xs font-bold">＋影片</button></div></div>{section.media.map((media, mediaIndex) => <div key={`${section.id}-media-${mediaIndex}`} className="mt-3 grid gap-2 rounded-xl border border-[#D1C6B4]/50 bg-white p-3 md:grid-cols-[100px_1fr_auto]"><div className="space-y-2"><select value={media.type} onChange={(event) => updateSectionMedia(sectionIndex, mediaIndex, { type: event.target.value === 'video' ? 'video' : 'image' })} className="w-full rounded-lg border border-[#D1C6B4]/70 p-2 text-xs"><option value="image">圖片</option><option value="video">影片</option></select>{media.type === 'image' && <label className="block cursor-pointer rounded-lg border border-[#D1C6B4]/70 px-2 py-1.5 text-center text-xs font-bold text-[#4A4238]"><span>上傳圖片</span><input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file, { sectionIndex, mediaIndex }); event.currentTarget.value = ''; }} /></label>}</div><div className="space-y-2"><input value={media.url} onChange={(event) => updateSectionMedia(sectionIndex, mediaIndex, { url: event.target.value })} className="w-full rounded-lg border border-[#D1C6B4]/70 p-2 text-sm" placeholder={media.type === 'video' ? 'https://www.youtube.com/watch?v=...' : 'https://.../image.webp'} /><input value={media.alt} onChange={(event) => updateSectionMedia(sectionIndex, mediaIndex, { alt: event.target.value })} className="w-full rounded-lg border border-[#D1C6B4]/70 p-2 text-sm" placeholder="替代文字／影片描述" /><input value={media.caption} onChange={(event) => updateSectionMedia(sectionIndex, mediaIndex, { caption: event.target.value })} className="w-full rounded-lg border border-[#D1C6B4]/70 p-2 text-sm" placeholder="媒體說明（選填）" /></div><button type="button" onClick={() => removeSectionMedia(sectionIndex, mediaIndex)} className="self-start text-xs font-bold text-[#9F1239]">移除</button></div>)}</div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addSection} className="mt-4 rounded-xl border border-dashed border-[#A27B21] px-4 py-2 text-sm font-bold text-[#6B5310]">＋新增內容章節</button>

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#D1C6B4]/50 pt-4"><button type="button" onClick={() => setPreviewOpen((value) => !value)} className="rounded-xl border border-[#A27B21]/60 bg-[#FFF9E8] px-4 py-2.5 text-sm font-bold text-[#6B5310]">{previewOpen ? '關閉預覽' : '即時預覽'}</button><button type="button" onClick={() => void saveDraft()} disabled={saving || !canEdit} className="rounded-xl bg-[#1A1612] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? '處理中…' : '儲存草稿'}</button><button type="button" onClick={() => void publish()} disabled={saving || !canEdit || !selectedId} className="rounded-xl bg-[#A27B21] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">發布到前台</button></div>
          {previewOpen && <div className="mt-5 rounded-2xl border border-[#D1C6B4]/60 bg-white p-5"><p className="mb-4 text-xs font-black uppercase tracking-[0.16em] text-[#A27B21]">Preview / 前台預覽</p>{document.cover && document.cover.url && <MarkdownPreview markdown="" media={[document.cover]} />}{<MarkdownPreview markdown={document.introMarkdown} media={document.media} />}{document.sections.map((section) => <div key={`preview-${section.id}`} className="mt-6 border-t border-[#D1C6B4]/50 pt-5"><h4 className="text-xl font-black">{section.heading || '未命名章節'}</h4><div className="mt-3"><MarkdownPreview markdown={section.markdown} media={section.media} /></div></div>)}</div>}
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-[#D1C6B4]/50 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D1C6B4]/40 bg-[#FDFBF7] px-4 py-4"><div><h3 className="font-black">文章清單</h3><p className="mt-1 text-xs text-[#4A4238]/60">管理員可查看所有草稿與已發布版本。</p></div><button type="button" onClick={() => void loadArticles()} className="rounded-lg border border-[#D1C6B4]/70 px-3 py-1.5 text-xs font-bold">重新整理</button></div>
        {loading ? <p className="p-6 text-sm text-[#4A4238]/60">正在載入專題文章…</p> : articles.length === 0 ? <p className="p-6 text-sm text-[#4A4238]/60">目前沒有專題文章。你可以建立第一篇長文。</p> : <div className="divide-y divide-[#D1C6B4]/30">{articles.map((article) => <div key={article.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h4 className="truncate font-bold text-[#1A1612]">{article.title || '未命名專題'}</h4><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClass(article.status)}`}>{statusLabel(article.status)}</span></div><p className="mt-1 text-xs text-[#4A4238]/55">更新於 {formatArticleDate(article.updatedAt) || '日期未提供'} · 節點 {article.nodeIds.length || 0} 個</p></div><div className="flex shrink-0 flex-wrap gap-2"><button type="button" onClick={() => openArticle(article)} className="rounded-lg border border-[#D1C6B4]/70 px-3 py-1.5 text-xs font-bold">編輯</button>{article.status === 'published' && <button type="button" onClick={() => void toggleHidden(article)} disabled={saving} className="rounded-lg border border-[#D1C6B4]/70 px-3 py-1.5 text-xs font-bold">隱藏</button>}{article.status === 'hidden' && <button type="button" onClick={() => void toggleHidden(article)} disabled={saving} className="rounded-lg border border-[#D1C6B4]/70 px-3 py-1.5 text-xs font-bold">恢復草稿</button>}</div></div>)}</div>}
      </div>
    </div>
  );
}
