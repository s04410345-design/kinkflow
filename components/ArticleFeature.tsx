"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import type { GraphNode } from '@/lib/types';
import {
  articleMatchesSearch,
  buildLegacyArticles,
  fetchPublishedArticles,
  formatArticleDate,
  isSafeArticleUrl,
  sortArticles,
  parseArticleDocument,
  createEmptyArticleDocument,
  type ArticleDocument,
  type ArticleItem,
} from '@/lib/data/articles';
import {
  createArticleDraft,
  fetchMyArticles,
  fetchMyAuthorVerification,
  publishArticle,
  submitAuthorVerification,
  updateArticleDraft,
  type AuthorVerification,
  type EditableArticle,
} from '@/lib/data/authorWorkspace';
import MarkdownPreview from '@/components/MarkdownPreview';
import { reportForumContent, type ReportCategory } from '@/lib/data/forum';
import { getAuthHeaders } from '@/lib/authHeaders';

type ArticleFeatureProps = {
  nodesData: GraphNode[];
  initialNodeId?: string | null;
  onBackToNode?: (nodeId: string) => void;
  isMember?: boolean;
};

type ArticleSortMode = 'hot' | 'latest';

function hasAsciiToken(bytes: Uint8Array, token: string): boolean {
  const target = Array.from(token).map((character) => character.charCodeAt(0));
  for (let index = 0; index <= bytes.length - target.length; index += 1) {
    let matches = true;
    for (let offset = 0; offset < target.length; offset += 1) {
      if (bytes[index + offset] !== target[offset]) { matches = false; break; }
    }
    if (matches) return true;
  }
  return false;
}

function readAuthorVideoMetadata(file: File): Promise<{ width: number; height: number; durationSeconds: number; hasH264: boolean; hasAac: boolean }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);
    video.preload = 'metadata';
    video.onloadedmetadata = async () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        resolve({ width: video.videoWidth, height: video.videoHeight, durationSeconds: video.duration, hasH264: hasAsciiToken(bytes, 'avc1') || hasAsciiToken(bytes, 'avc3'), hasAac: hasAsciiToken(bytes, 'mp4a') });
      } catch {
        reject(new Error('影片 metadata 讀取失敗。'));
      }
    };
    video.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('影片無法讀取，請確認檔案是可播放的 MP4。')); };
    video.src = objectUrl;
  });
}

function useLegacyArticles(nodesData: GraphNode[]): ArticleItem[] {
  return useMemo(() => buildLegacyArticles(nodesData), [nodesData]);
}

function AuthorWorkspace({ nodesData, isMember, verification, setVerification }: { nodesData: GraphNode[]; isMember: boolean; verification: AuthorVerification | null; setVerification: (value: AuthorVerification | null) => void }) {
  const [applicationText, setApplicationText] = useState('');
  const [applicationSaving, setApplicationSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [myArticles, setMyArticles] = useState<EditableArticle[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [markdown, setMarkdown] = useState('');
  const [articleDocument, setArticleDocument] = useState<ArticleDocument>(createEmptyArticleDocument());
  const [videoUrl, setVideoUrl] = useState('');
  const [videoAssetId, setVideoAssetId] = useState<string | null>(null);
  const [videoSaving, setVideoSaving] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [articleSaving, setArticleSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 將已存在的作者申請資料帶入編輯欄位，屬於外部資料同步。
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (verification?.application_text) setApplicationText(verification.application_text);
  }, [verification]);

  useEffect(() => {
    if (verification?.status === 'approved') void fetchMyArticles().then(setMyArticles);
  }, [verification?.status]);

  useEffect(() => () => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
  }, []);

  const buildCurrentDocument = useCallback((): ArticleDocument => ({
    ...articleDocument,
    introMarkdown: markdown,
    media: [
      ...articleDocument.media.filter((media) => media.type !== 'video'),
      ...(videoUrl.trim() ? [{ type: 'video' as const, url: videoUrl.trim(), assetId: videoAssetId || undefined, alt: '專題文章影片', caption: '' }] : []),
    ],
  }), [articleDocument, markdown, videoAssetId, videoUrl]);

  const saveDraftSilently = useCallback(async () => {
    if (!editingId || !title.trim() || !markdown.trim() || articleSaving) return;
    setDraftStatus('saving');
    const result = await updateArticleDraft(editingId, title, excerpt, buildCurrentDocument(), selectedNodeId ? [selectedNodeId] : []);
    if (result.ok) {
      setDraftStatus('saved');
      setLastSavedAt(new Date().toISOString());
    } else {
      setDraftStatus('error');
      setNotice(result.message || '自動儲存失敗，請按「儲存草稿」重試。');
    }
  }, [articleSaving, buildCurrentDocument, editingId, excerpt, markdown, selectedNodeId, title]);

  useEffect(() => {
    if (!editorOpen || !editingId || !title.trim() || !markdown.trim()) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => { void saveDraftSilently(); }, 1500);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [editorOpen, editingId, title, excerpt, markdown, selectedNodeId, saveDraftSilently]);

  if (!isMember) return <div className="mt-8 rounded-2xl border border-dashed border-[#D1C6B4] bg-white/80 p-4 text-sm text-[#4A4238]/70">想投稿長篇專題嗎？先登入會員，再提交認證作者申請。</div>;

  const submitApplication = async () => {
    setApplicationSaving(true); setNotice(null);
    const result = await submitAuthorVerification(applicationText);
    if (!result.ok) setNotice(result.message || '申請送出失敗。');
    else { setVerification({ user_id: verification?.user_id || '', status: 'pending', application_text: applicationText.trim() }); setNotice('申請已送出，等待管理員審核。'); }
    setApplicationSaving(false);
  };

  const resetEditor = () => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    setEditorOpen(false); setEditingId(null); setTitle(''); setExcerpt(''); setMarkdown(''); setArticleDocument(createEmptyArticleDocument()); setVideoUrl(''); setVideoAssetId(null); setSelectedNodeId(''); setPreviewOpen(false); setDraftStatus('idle'); setLastSavedAt(null);
  };

  const openNewArticle = () => {
    resetEditor(); setSelectedNodeId(nodesData.find((node) => node.level > 0)?.id || ''); setEditorOpen(true); setNotice(null);
  };

  const openArticle = (article: EditableArticle) => {
    const document = parseArticleDocument(article.body_json, 'draft');
    const video = document.media.find((media) => media.type === 'video');
    setEditingId(article.id); setTitle(article.title); setExcerpt(article.excerpt); setMarkdown(document.introMarkdown); setArticleDocument(document); setVideoUrl(video?.url || ''); setVideoAssetId(video?.assetId || null); setSelectedNodeId(article.nodeIds?.[0] || ''); setPreviewOpen(false); setDraftStatus('saved'); setLastSavedAt(article.updated_at || null); setEditorOpen(true); setNotice(null);
  };

  const uploadAuthorVideo = async (file: File) => {
    if (file.type !== 'video/mp4' || !file.name.toLowerCase().endsWith('.mp4')) { setNotice('只支援 MP4 影片。'); return; }
    if (file.size > 50 * 1024 * 1024) { setNotice('單支影片不可超過 50 MB。'); return; }
    setVideoSaving(true); setNotice(null);
    try {
      const metadata = await readAuthorVideoMetadata(file);
      if (!metadata.width || !metadata.height || metadata.width > 1280 || metadata.height > 720) throw new Error('影片尺寸不可超過 1280×720（720p）。');
      if (!Number.isFinite(metadata.durationSeconds) || metadata.durationSeconds <= 0 || metadata.durationSeconds > 300) throw new Error('單支影片長度不可超過 5 分鐘。');
      if (!metadata.hasH264 || !metadata.hasAac) throw new Error('無法確認影片同時使用 H.264 影像與 AAC 音訊；請重新輸出為 MP4/H.264/AAC。');
      const initResponse = await fetch('/api/uploadVideo', { method: 'POST', headers: { ...(await getAuthHeaders()), 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName: file.name, mimeType: file.type, byteSize: file.size, width: metadata.width, height: metadata.height, durationSeconds: metadata.durationSeconds }) });
      const initPayload = await initResponse.json().catch(() => ({})) as { uploadId?: string; signedUrl?: string; error?: string };
      if (!initResponse.ok || !initPayload.uploadId || !initPayload.signedUrl) throw new Error(initPayload.error || '影片上傳連結建立失敗。');
      const storageResponse = await fetch(initPayload.signedUrl, { method: 'PUT', headers: { 'Content-Type': 'video/mp4', 'x-upsert': 'false' }, body: file });
      if (!storageResponse.ok) throw new Error('影片檔案直傳失敗，請重新嘗試。');
      const confirmResponse = await fetch('/api/uploadVideo/confirm', { method: 'POST', headers: { ...(await getAuthHeaders()), 'Content-Type': 'application/json' }, body: JSON.stringify({ uploadId: initPayload.uploadId }) });
      const confirmPayload = await confirmResponse.json().catch(() => ({})) as { assetId?: string; url?: string; error?: string };
      if (!confirmResponse.ok || !confirmPayload.url || !confirmPayload.assetId) throw new Error(confirmPayload.error || '影片確認失敗。');
      setVideoUrl(`/api/article-videos/${confirmPayload.assetId}`);
      setVideoAssetId(confirmPayload.assetId);
      setArticleDocument((current) => ({ ...current, media: [...current.media.filter((media) => media.type !== 'video'), { type: 'video', url: `/api/article-videos/${confirmPayload.assetId}`, assetId: confirmPayload.assetId, alt: '專題文章影片', caption: '' }] }));
      setNotice('影片已上傳並完成驗證，記得儲存草稿。');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '影片上傳失敗。');
    } finally {
      setVideoSaving(false);
    }
  };

  const saveArticle = async () => {
    if (!title.trim() || !markdown.trim()) { setNotice('請至少填寫文章標題與正文。'); return; }
    setArticleSaving(true); setDraftStatus('saving'); setNotice(null);
    const currentDocument = buildCurrentDocument();
    const result = editingId ? await updateArticleDraft(editingId, title, excerpt, currentDocument, selectedNodeId ? [selectedNodeId] : []) : await createArticleDraft(title, excerpt, currentDocument, selectedNodeId ? [selectedNodeId] : []);
    if (!result.ok) {
      setDraftStatus('error'); setNotice(result.message || '文章儲存失敗。');
    } else {
      setDraftStatus('saved'); setLastSavedAt(new Date().toISOString()); setEditingId(result.articleId || editingId); setEditorOpen(false); setMyArticles(await fetchMyArticles()); setNotice(editingId ? '文章草稿已更新。' : '文章草稿已建立。');
    }
    setArticleSaving(false);
  };

  const publish = async (articleId: string) => {
    setArticleSaving(true); setNotice(null);
    const result = await publishArticle(articleId);
    if (!result.ok) setNotice(result.message || '文章發布失敗。');
    else { setMyArticles(await fetchMyArticles()); setNotice('文章已送出發布。'); }
    setArticleSaving(false);
  };

  const draftStatusLabel = draftStatus === 'saving' ? '自動儲存中…' : draftStatus === 'error' ? '自動儲存失敗' : lastSavedAt ? `已儲存 ${formatArticleDate(lastSavedAt) || '剛剛'}` : '尚未儲存';

  return (
    <div className="mt-10 rounded-3xl border border-[#D1C6B4]/50 bg-white/80 p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#A27B21]">Author Studio</p><h2 className="mt-1 text-xl font-black">認證作者工作區</h2><p className="mt-2 text-sm leading-6 text-[#4A4238]/70">專題誌適合長篇文章。可以用 Markdown 排版，圖片可貼網址；影片可貼 YouTube URL，或上傳 MP4／H.264/AAC／720p／5 分鐘／50 MB 內的自有影片。</p></div>{verification?.status === 'approved' && <button type="button" onClick={openNewArticle} className="rounded-xl bg-[#1A1612] px-4 py-2 text-sm font-bold text-white">新增長文</button>}</div>
      {notice && <div className="mt-4 rounded-xl border border-[#F4D58D] bg-[#FFF9E8] p-3 text-sm text-[#6B5310]">{notice}</div>}
      {!verification || verification.status === 'none' ? <div className="mt-5"><p className="text-sm leading-6 text-[#4A4238]/75">申請通過後，你可以建立、編輯並發布自己的專題文章。</p><textarea value={applicationText} onChange={(e) => setApplicationText(e.target.value)} maxLength={5000} placeholder="請介紹你想寫的主題、內容方向與社群經驗（至少 30 字）" className="mt-3 min-h-28 w-full rounded-xl border border-[#D1C6B4]/60 bg-white p-3 text-sm outline-none focus:border-[#A27B21]" /><button type="button" onClick={() => void submitApplication()} disabled={applicationSaving} className="mt-3 rounded-xl bg-[#A27B21] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{applicationSaving ? '送出中…' : '申請認證作者'}</button></div>
        : verification.status === 'pending' ? <p className="mt-5 rounded-xl bg-[#FFF9E8] p-4 text-sm text-[#6B5310]">申請審核中。管理員確認後，就能開啟長文編輯器。</p>
          : verification.status === 'rejected' ? <div className="mt-5"><p className="text-sm text-[#9F1239]">這次申請尚未通過{verification.review_note ? `：${verification.review_note}` : '，你可以補充內容後重新申請。'}</p><textarea value={applicationText} onChange={(e) => setApplicationText(e.target.value)} maxLength={5000} className="mt-3 min-h-28 w-full rounded-xl border border-[#D1C6B4]/60 bg-white p-3 text-sm" /><button type="button" onClick={() => void submitApplication()} disabled={applicationSaving} className="mt-3 rounded-xl bg-[#A27B21] px-4 py-2 text-sm font-bold text-white">重新申請</button></div>
            : <div className="mt-5"><p className="mb-3 rounded-xl bg-[#EEF4EA] p-4 text-sm text-[#47633C]">已通過認證。你的文章會先以草稿保存，再由你確認後發布。</p>{editorOpen && <div className="mb-4 rounded-2xl border border-[#D1C6B4]/60 bg-[#FDFBF7] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-black">{editingId ? '編輯文章' : '新增長文'}</h3><div className="flex items-center gap-3"><span aria-live="polite" className={`text-xs font-bold ${draftStatus === 'error' ? 'text-[#B91C1C]' : 'text-[#64748B]'}`}>{draftStatusLabel}</span><button type="button" onClick={resetEditor} className="text-sm font-bold text-[#4A4238]/60">關閉</button></div></div><div className={previewOpen ? 'mt-4 grid gap-4 lg:grid-cols-2' : 'mt-4'}><div><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={180} placeholder="文章標題" className="w-full rounded-xl border border-[#D1C6B4]/60 bg-white p-3 text-sm" /><input value={excerpt} onChange={(e) => setExcerpt(e.target.value)} maxLength={500} placeholder="文章摘要（最多 500 字）" className="mt-3 w-full rounded-xl border border-[#D1C6B4]/60 bg-white p-3 text-sm" /><select value={selectedNodeId} onChange={(e) => setSelectedNodeId(e.target.value)} className="mt-3 w-full rounded-xl border border-[#D1C6B4]/60 bg-white p-3 text-sm"><option value="">不指定 Mind Map 節點</option>{nodesData.filter((node) => node.level > 0).map((node) => <option key={node.id} value={node.id}>{node.label}</option>)}</select><div className="mt-3 rounded-xl border border-[#D1C6B4]/60 bg-[#FFF9E8]/60 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-black">文章影片</p><p className="mt-1 text-xs text-[#6B5310]/80">可貼 YouTube URL，或上傳一支符合限制的 MP4。</p></div><label className="cursor-pointer rounded-lg bg-[#A27B21] px-3 py-1.5 text-xs font-bold text-white"><span>{videoSaving ? '上傳中…' : '上傳 MP4'}</span><input type="file" accept="video/mp4,.mp4" className="sr-only" disabled={videoSaving} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAuthorVideo(file); event.currentTarget.value = ''; }} /></label></div><input value={videoUrl} onChange={(event) => { setVideoUrl(event.target.value); setVideoAssetId(null); }} className="mt-3 w-full rounded-xl border border-[#D1C6B4]/70 bg-white p-3 text-sm" placeholder="https://www.youtube.com/watch?v=... 或已上傳影片 URL" /></div><textarea value={markdown} onChange={(e) => setMarkdown(e.target.value)} placeholder={'使用 Markdown 編輯正文\n\n![圖片](https://...)\n\n[觀看影片](https://...)'} className="mt-3 min-h-72 w-full rounded-xl border border-[#D1C6B4]/60 bg-white p-3 font-mono text-sm leading-6" /></div>{previewOpen && <div className="min-h-72 rounded-xl border border-[#D1C6B4]/60 bg-white p-4"><p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-[#A27B21]">Preview / 預覽</p><MarkdownPreview markdown={markdown} media={buildCurrentDocument().media} /></div>}</div><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => setPreviewOpen((value) => !value)} className="rounded-xl border border-[#A27B21]/60 bg-[#FFF9E8] px-4 py-2 text-sm font-bold text-[#6B5310]">{previewOpen ? '關閉預覽' : '開啟預覽'}</button><button type="button" onClick={() => void saveArticle()} disabled={articleSaving} className="rounded-xl bg-[#1A1612] px-4 py-2 text-sm font-bold text-white">{articleSaving ? '儲存中…' : '儲存草稿'}</button><button type="button" onClick={resetEditor} className="rounded-xl border border-[#D1C6B4]/70 px-4 py-2 text-sm font-bold">取消</button></div><p className="mt-2 text-xs leading-5 text-[#64748B]">編輯既有草稿時，停止輸入約 1.5 秒會自動儲存；新文章第一次仍請按「儲存草稿」建立文章。</p></div>}{<div className="space-y-2">{myArticles.map((article) => <div key={article.id} className="flex flex-col gap-3 rounded-xl border border-[#D1C6B4]/50 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold">{article.title || '未命名文章'}</p><p className="mt-1 text-xs text-[#4A4238]/60">{article.status === 'published' ? '已發布' : '草稿'} · 更新於 {formatArticleDate(article.updated_at) || '日期未提供'}</p></div><div className="flex gap-2"><button type="button" onClick={() => openArticle(article)} className="rounded-lg border border-[#D1C6B4]/70 px-3 py-1.5 text-xs font-bold">編輯</button>{article.status === 'draft' && <button type="button" onClick={() => void publish(article.id)} disabled={articleSaving} className="rounded-lg bg-[#A27B21] px-3 py-1.5 text-xs font-bold text-white">發布</button>}</div></div>)}{myArticles.length === 0 && <p className="rounded-xl border border-dashed border-[#D1C6B4] p-4 text-sm text-[#4A4238]/60">還沒有自己的文章，按右上角「新增長文」開始。</p>}</div>}</div>}
    </div>
  );
}

function ArticleCard({ article, onOpen }: { article: ArticleItem; onOpen: (id: string) => void }) {
  const cover = article.document.cover;
  const hasImageCover = cover?.type === 'image' && isSafeArticleUrl(cover.url);
  return (
    <button type="button" onClick={() => onOpen(article.id)} className="group flex h-full flex-col overflow-hidden rounded-3xl border border-[#D1C6B4]/50 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:border-[#D9B650]/70 hover:shadow-lg">
      <div className="relative h-44 overflow-hidden bg-gradient-to-br from-[#F5EFE6] to-[#FFF9E8]">{hasImageCover ? <><span className="sr-only">文章封面圖片</span><img src={cover.url} alt={cover.alt || article.title} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /></> : <div className="flex h-full items-end p-5"><div className="h-2 w-24 rounded-full" style={{ backgroundColor: article.color }} /></div>}<div className="absolute left-4 top-4 flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-white/90 px-3 py-1 text-[#8A6A1F]">{article.label}</span>{article.featured && <span className="rounded-full bg-[#D9B650] px-3 py-1 text-[#1A1612]">熱門</span>}</div></div>
      <div className="flex flex-1 flex-col p-5"><div className="flex items-center justify-between gap-3 text-xs text-[#4A4238]/55"><span>{article.readMinutes} 分鐘閱讀</span><span>{article.commentCount} 則留言</span></div><h2 className="mt-3 text-xl font-black leading-snug text-[#1A1612] group-hover:text-[#8A6A1F]">{article.title}</h2><p className="mt-3 line-clamp-3 text-sm leading-6 text-[#4A4238]/70">{article.excerpt}</p>{article.tags.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{article.tags.slice(0, 3).map((tag) => <span key={tag} className="rounded-full bg-[#F5EFE6] px-2.5 py-1 text-[11px] font-bold text-[#6B5A4A]">#{tag}</span>)}</div>}<span className="mt-auto pt-6 text-sm font-black text-[#1A1612]">閱讀完整專題 →</span></div>
    </button>
  );
}

function ArticleReader({ article, onBack, onBackToNode, isMember }: { article: ArticleItem; onBack: () => void; onBackToNode?: (nodeId: string) => void; isMember: boolean }) {
  const [sectionsOpen, setSectionsOpen] = useState<Record<string, boolean>>({});
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState<ReportCategory>('other');
  const [reportDetails, setReportDetails] = useState('');
  const [reportNotice, setReportNotice] = useState<string | null>(null);
  const [reportSaving, setReportSaving] = useState(false);
  const allOpen = article.document.sections.length > 0 && article.document.sections.every((section) => sectionsOpen[section.id] ?? section.defaultOpen);
  const setAllSections = (open: boolean) => setSectionsOpen(Object.fromEntries(article.document.sections.map((section) => [section.id, open])));
  const submitArticleReport = async () => {
    if (!isMember || article.source !== 'live' || !reportDetails.trim()) return;
    setReportSaving(true);
    setReportNotice(null);
    const result = await reportForumContent('article', article.id, reportCategory, reportDetails);
    setReportNotice(result.ok ? '檢舉已送出，管理員會進行查看。' : (result.message || '檢舉送出失敗。'));
    if (result.ok) { setReportOpen(false); setReportDetails(''); }
    setReportSaving(false);
  };

  return (
    <section className="h-full overflow-y-auto bg-[#FDFBF7] text-[#1A1612]">
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={onBack} className="rounded-full border border-[#D1C6B4]/70 bg-white px-4 py-2 text-sm font-bold text-[#4A4238] transition-colors duration-200 hover:border-[#A27B21] hover:text-[#8A6A1F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A27B21] focus-visible:ring-offset-2">← 返回專題列表</button>
          {onBackToNode && article.nodeId && <button type="button" onClick={() => onBackToNode(article.nodeId)} className="rounded-full border border-[#D9B650]/70 bg-[#FFF9E8] px-4 py-2 text-sm font-bold text-[#6B5310] transition-colors duration-200 hover:bg-[#FFF4C8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A27B21] focus-visible:ring-offset-2">回到 Mind Map 節點</button>}
        </div>
        <article className="overflow-hidden rounded-3xl border border-[#D1C6B4]/50 bg-white shadow-sm">
          <header className="border-b border-[#D1C6B4]/40 bg-gradient-to-br from-white via-[#FFF9F0] to-[#F5EFE6] px-5 py-8 md:px-12 md:py-12">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#8A6A1F]"><span className="rounded-full bg-[#FFF4C8] px-3 py-1">專題誌</span><span className="rounded-full bg-[#F5EFE6] px-3 py-1">{article.label}</span>{article.featured && <span className="rounded-full bg-[#D9B650] px-3 py-1 text-[#1A1612]">熱門推薦</span>}</div>
            <h1 className="mt-4 max-w-4xl text-3xl font-black leading-tight md:text-5xl">{article.title}</h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[#4A4238]/75">{article.excerpt}</p>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-[#4A4238]/55"><span>約 {article.readMinutes} 分鐘閱讀</span>{formatArticleDate(article.publishedAt || article.createdAt) && <span>發布於 {formatArticleDate(article.publishedAt || article.createdAt)}</span>}<span>{article.commentCount} 則留言</span></div>
            {article.tags.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{article.tags.map((tag) => <span key={tag} className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-[#6B5A4A]">#{tag}</span>)}</div>}
            {isMember && article.source === 'live' && <div className="mt-5"><button type="button" onClick={() => { setReportOpen((value) => !value); setReportNotice(null); }} className="rounded-full border border-[#F4B8C4] bg-[#FFF5F7] px-3 py-1.5 text-xs font-bold text-[#9D174D]">⚑ 檢舉文章</button>{reportNotice && <p className="mt-2 text-xs font-bold text-[#92400E]">{reportNotice}</p>}{reportOpen && <div className="mt-3 rounded-2xl border border-[#FCD34D] bg-[#FFFBEB] p-4"><select value={reportCategory} onChange={(event) => setReportCategory(event.target.value as ReportCategory)} className="w-full rounded-xl border border-[#FCD34D] bg-white p-3 text-sm"><option value="spam">垃圾訊息或廣告</option><option value="harassment">騷擾或霸凌</option><option value="safety">安全風險或危險內容</option><option value="privacy">侵犯隱私</option><option value="illegal">違法內容</option><option value="hate">仇恨或歧視</option><option value="self_harm">自傷相關風險</option><option value="misinformation">明顯錯誤資訊</option><option value="other">其他</option></select><textarea value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} maxLength={2000} placeholder="補充說明（最多 2,000 字）" className="mt-3 min-h-20 w-full rounded-xl border border-[#FCD34D] bg-white p-3 text-sm" /><div className="mt-3 flex gap-2"><button type="button" onClick={() => void submitArticleReport()} disabled={reportSaving || !reportDetails.trim()} className="rounded-xl bg-[#92400E] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{reportSaving ? '送出中…' : '送出檢舉'}</button><button type="button" onClick={() => setReportOpen(false)} disabled={reportSaving} className="rounded-xl border border-[#FCD34D] px-4 py-2 text-xs font-bold text-[#92400E]">取消</button></div></div>}</div>}
          </header>
          <div className="px-5 py-7 md:px-12 md:py-10">
            {article.document.cover && <MarkdownPreview markdown="" media={[article.document.cover]} />}
            <div className="mt-7"><MarkdownPreview markdown={article.document.introMarkdown} media={article.document.media} /></div>
            {article.document.sections.length > 0 && <div className="mt-10 border-t border-[#D1C6B4]/50 pt-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#A27B21]">Contents / 章節</p><h2 className="mt-1 text-xl font-black">依你的節奏閱讀</h2></div>
                <button type="button" onClick={() => setAllSections(!allOpen)} aria-label={allOpen ? '全部收合章節' : '全部展開章節'} className="rounded-lg border border-[#D1C6B4]/70 px-3 py-1.5 text-xs font-bold transition-colors duration-200 hover:border-[#A27B21] hover:bg-[#FFF9E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A27B21] focus-visible:ring-offset-2">{allOpen ? '全部收合' : '全部展開'}</button>
              </div>
              <div className="space-y-3">
                {article.document.sections.map((section, index) => {
                  const isOpen = sectionsOpen[section.id] ?? section.defaultOpen;
                  const contentId = `article-section-${article.id}-${section.id}`;
                  return <div key={section.id} className="overflow-hidden rounded-2xl border border-[#D1C6B4]/50 bg-[#FDFBF7]">
                    <button type="button" disabled={!section.collapsible} aria-expanded={section.collapsible ? isOpen : true} aria-controls={contentId} onClick={() => { if (section.collapsible) setSectionsOpen((current) => ({ ...current, [section.id]: !isOpen })); }} className={`flex w-full items-center gap-3 px-5 py-4 text-left text-base font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#A27B21] ${section.collapsible ? 'cursor-pointer transition-colors duration-200 hover:bg-[#FFF9E8]' : 'cursor-default'}`}>
                      <span className="text-[#A27B21]">{String(index + 1).padStart(2, '0')}</span><span className="min-w-0 flex-1">{section.heading || `第 ${index + 1} 章`}</span>{section.collapsible && <span aria-hidden="true" className={`text-xl leading-none text-[#A27B21] transition-transform duration-300 ease-out motion-reduce:transition-none ${isOpen ? 'rotate-180' : 'rotate-0'}`}>⌄</span>}
                    </button>
                    <div id={contentId} aria-hidden={section.collapsible ? !isOpen : false} className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${section.collapsible && !isOpen ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'}`}>
                      <div className="min-h-0 overflow-hidden"><div className="border-t border-[#D1C6B4]/40 px-5 py-5"><MarkdownPreview markdown={section.markdown} media={section.media} /></div></div>
                    </div>
                  </div>;
                })}
              </div>
            </div>}
          </div>
          <footer className="border-t border-[#D1C6B4]/40 bg-[#FDFBF7]/70 px-5 py-5 text-sm leading-6 text-[#4A4238]/65 md:px-12">專題文章與討論留言分開管理；文章內容由後台發布版本提供，閱讀時不會直接讀取草稿。</footer>
        </article>
      </div>
    </section>
  );
}

export default function ArticleFeature({ nodesData, initialNodeId = null, onBackToNode, isMember = false }: ArticleFeatureProps) {
  const legacyArticles = useLegacyArticles(nodesData);
  const [liveArticles, setLiveArticles] = useState<ArticleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [nodeFilter, setNodeFilter] = useState<string>(initialNodeId || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<ArticleSortMode>('hot');
  const [showAllNodes, setShowAllNodes] = useState(false);
  const [verification, setVerification] = useState<AuthorVerification | null>(null);
  const [isFilterTransitionPending, startFilterTransition] = useTransition();
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // deep link 改變時需要同步目前的節點篩選。
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (initialNodeId) setNodeFilter(initialNodeId); }, [initialNodeId]);
  useEffect(() => {
    let active = true;
    const load = async () => { setIsLoading(true); const nextArticles = await fetchPublishedArticles(nodesData); if (!active) return; setLiveArticles(nextArticles); setIsLoading(false); };
    void load();
    return () => { active = false; };
  }, [nodesData]);
  // 會員狀態改變時重新讀取作者資格；登出時清除上一位會員的資料。
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (isMember) void fetchMyAuthorVerification().then(setVerification); else setVerification(null); }, [isMember]);

  const articles = liveArticles.length ? liveArticles : legacyArticles;
  const filterNodes = useMemo(() => nodesData.filter((node) => node.level > 0 && articles.some((article) => article.nodeIds.includes(node.id))), [articles, nodesData]);
  const filteredArticles = useMemo(() => {
    const byNode = nodeFilter === 'all' ? articles : articles.filter((article) => article.nodeIds.includes(nodeFilter));
    return sortArticles(byNode.filter((article) => articleMatchesSearch(article, deferredSearchQuery)), sortMode);
  }, [articles, deferredSearchQuery, nodeFilter, sortMode]);
  const selectedArticle = articles.find((article) => article.id === selectedArticleId) || null;
  const visibleNodes = showAllNodes ? filterNodes : filterNodes.slice(0, 6);
  const hasActiveFilters = Boolean(searchQuery.trim()) || nodeFilter !== 'all';
  const isResultsPending = isFilterTransitionPending || searchQuery !== deferredSearchQuery;

  const updateSortMode = (mode: ArticleSortMode) => startFilterTransition(() => setSortMode(mode));
  const updateNodeFilter = (nodeId: string) => startFilterTransition(() => setNodeFilter(nodeId));
  const clearFilters = () => { setSearchQuery(''); startFilterTransition(() => setNodeFilter('all')); };

  if (selectedArticle) return <ArticleReader article={selectedArticle} onBack={() => setSelectedArticleId(null)} onBackToNode={onBackToNode} isMember={isMember} />;

  return (
    <section className="h-full overflow-y-auto bg-[#FDFBF7] text-[#1A1612]"><div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10"><header className="mb-6 rounded-3xl border border-[#D1C6B4]/50 bg-gradient-to-br from-white via-[#FFF9F0] to-[#F5EFE6] p-6 shadow-sm md:mb-8 md:p-10"><div className="max-w-4xl"><p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-[#A27B21]">KinkFlow / Deep Reading</p><h1 className="text-3xl font-black md:text-5xl">專題誌</h1><p className="mt-4 text-sm leading-7 text-[#4A4238]/75 md:text-base">把一個主題讀深、讀完整。這裡收錄心理、關係、安全與文化脈絡的長文，搭配圖片、影片與可自由收合的章節，讓你按照自己的節奏探索。</p></div><div className="mt-6 flex flex-wrap gap-3 text-xs font-bold text-[#6B5A4A]"><span className="rounded-full bg-white/80 px-3 py-2">{articles.length} 篇專題</span><span className="rounded-full bg-white/80 px-3 py-2">可搜尋全文</span><span className="rounded-full bg-white/80 px-3 py-2">圖片與影片</span><span className="rounded-full bg-white/80 px-3 py-2">章節收合</span></div></header>
      <div className="mb-6 rounded-2xl border border-[#D1C6B4]/50 bg-white p-4 shadow-sm md:p-5"><div className="flex flex-col gap-3 lg:flex-row lg:items-center"><label className="relative min-w-0 flex-1"><span className="sr-only">搜尋專題</span><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} aria-describedby="article-search-status" className="w-full rounded-xl border border-[#D1C6B4]/70 bg-[#FDFBF7] py-3 pl-11 pr-12 text-sm outline-none transition-colors duration-200 focus:border-[#A27B21] focus:ring-2 focus:ring-[#A27B21]/20" placeholder="搜尋標題、摘要、章節、標籤或全文內容…" /><span aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A27B21]">⌕</span>{searchQuery && <button type="button" onClick={() => setSearchQuery('')} aria-label="清除搜尋" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-base font-bold text-[#8A6A1F] transition-colors duration-200 hover:bg-[#FFF4C8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A27B21]">×</button>}</label><div className="flex shrink-0 items-center gap-2 rounded-xl bg-[#FDFBF7] p-1" aria-label="專題排序"><span className="px-2 text-xs font-bold text-[#6B5A4A]/70">排序</span><button type="button" onClick={() => updateSortMode('hot')} aria-pressed={sortMode === 'hot'} className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A27B21] ${sortMode === 'hot' ? 'bg-[#1A1612] text-white shadow-sm' : 'text-[#4A4238]/70 hover:bg-white hover:text-[#1A1612]'}`}>熱門</button><button type="button" onClick={() => updateSortMode('latest')} aria-pressed={sortMode === 'latest'} className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A27B21] ${sortMode === 'latest' ? 'bg-[#1A1612] text-white shadow-sm' : 'text-[#4A4238]/70 hover:bg-white hover:text-[#1A1612]'}`}>最新</button></div></div><div className="mt-4 flex flex-wrap items-center gap-2" aria-label="專題節點篩選"><button type="button" onClick={() => updateNodeFilter('all')} aria-pressed={nodeFilter === 'all'} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A27B21] ${nodeFilter === 'all' ? 'bg-[#1A1612] text-white shadow-sm' : 'border border-[#D1C6B4]/70 bg-white text-[#4A4238] hover:border-[#A27B21]'}`}>全部主題</button>{visibleNodes.map((node) => <button key={node.id} type="button" onClick={() => updateNodeFilter(node.id)} aria-pressed={nodeFilter === node.id} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A27B21] ${nodeFilter === node.id ? 'text-white shadow-sm' : 'border border-[#D1C6B4]/70 bg-white text-[#4A4238] hover:border-[#A27B21]'}`} style={nodeFilter === node.id ? { backgroundColor: node.color || '#4A4238' } : undefined}>{node.label}</button>)}{filterNodes.length > 6 && <button type="button" onClick={() => setShowAllNodes((value) => !value)} aria-expanded={showAllNodes} className="rounded-full border border-dashed border-[#A27B21] px-4 py-2 text-sm font-bold text-[#6B5310] transition-colors duration-200 hover:bg-[#FFF9E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A27B21]">{showAllNodes ? '收起主題' : `更多主題（${filterNodes.length - 6}）`}</button>}</div></div>
      <div id="article-search-status" aria-live="polite" className="sr-only">{isResultsPending ? '正在更新專題結果…' : `目前顯示 ${filteredArticles.length} 篇專題`}</div>
      {isLoading && <div className="mb-5 rounded-2xl border border-[#D1C6B4]/50 bg-white p-4 text-sm text-[#4A4238]/60">正在載入正式專題內容…</div>}
      {hasActiveFilters && <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#FFF9E8] px-4 py-3 text-sm text-[#6B5310]"><span>找到 {filteredArticles.length} 篇符合條件的專題。</span><button type="button" onClick={clearFilters} className="font-bold underline underline-offset-4 transition-colors hover:text-[#1A1612]">清除篩選</button></div>}
      <div className={`transition-opacity duration-200 ease-out motion-reduce:transition-none ${isResultsPending ? 'opacity-60' : 'opacity-100'}`} aria-busy={isResultsPending}>{filteredArticles.length === 0 ? <div className="rounded-3xl border border-dashed border-[#D1C6B4] bg-white p-10 text-center text-sm leading-7 text-[#4A4238]/60">目前沒有符合條件的專題。你可以換一個關鍵字、切換排序，或清除節點篩選。</div> : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{filteredArticles.map((article) => <ArticleCard key={article.id} article={article} onOpen={setSelectedArticleId} />)}</div>}</div>
      {liveArticles.length === 0 && !isLoading && <div className="mt-6 rounded-2xl border border-[#D1C6B4]/50 bg-[#FFF9E8]/70 p-4 text-sm leading-6 text-[#6B5310]">目前還沒有管理員發布的正式專題，畫面先保留 Mind Map 的既有內容作為閱讀入口。管理員發布長文後，前台會自動改讀正式版本。</div>}
      <AuthorWorkspace nodesData={nodesData} isMember={isMember} verification={verification} setVerification={setVerification} /></div></section>
  );
}
