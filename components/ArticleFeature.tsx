"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GraphNode } from '@/lib/types';
import {
  articleMatchesSearch,
  buildLegacyArticles,
  fetchPublishedArticles,
  formatArticleDate,
  isSafeArticleUrl,
  sortArticles,
  parseArticleDocument,
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

type ArticleFeatureProps = {
  nodesData: GraphNode[];
  initialNodeId?: string | null;
  onBackToNode?: (nodeId: string) => void;
  isMember?: boolean;
};

type ArticleSortMode = 'hot' | 'latest';

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
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [articleSaving, setArticleSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 將已存在的作者申請資料帶入編輯欄位，屬於外部資料同步。
  // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const saveDraftSilently = useCallback(async () => {
    if (!editingId || !title.trim() || !markdown.trim() || articleSaving) return;
    setDraftStatus('saving');
    const result = await updateArticleDraft(editingId, title, excerpt, markdown, selectedNodeId ? [selectedNodeId] : []);
    if (result.ok) {
      setDraftStatus('saved');
      setLastSavedAt(new Date().toISOString());
    } else {
      setDraftStatus('error');
      setNotice(result.message || '自動儲存失敗，請按「儲存草稿」重試。');
    }
  }, [articleSaving, editingId, excerpt, markdown, selectedNodeId, title]);

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
    setEditorOpen(false); setEditingId(null); setTitle(''); setExcerpt(''); setMarkdown(''); setSelectedNodeId(''); setPreviewOpen(false); setDraftStatus('idle'); setLastSavedAt(null);
  };

  const openNewArticle = () => {
    resetEditor(); setSelectedNodeId(nodesData.find((node) => node.level > 0)?.id || ''); setEditorOpen(true); setNotice(null);
  };

  const openArticle = (article: EditableArticle) => {
    const document = parseArticleDocument(article.body_json, 'draft');
    setEditingId(article.id); setTitle(article.title); setExcerpt(article.excerpt); setMarkdown(document.introMarkdown); setSelectedNodeId(article.nodeIds?.[0] || ''); setPreviewOpen(false); setDraftStatus('saved'); setLastSavedAt(article.updated_at || null); setEditorOpen(true); setNotice(null);
  };

  const saveArticle = async () => {
    if (!title.trim() || !markdown.trim()) { setNotice('請至少填寫文章標題與正文。'); return; }
    setArticleSaving(true); setDraftStatus('saving'); setNotice(null);
    const result = editingId ? await updateArticleDraft(editingId, title, excerpt, markdown, selectedNodeId ? [selectedNodeId] : []) : await createArticleDraft(title, excerpt, markdown, selectedNodeId ? [selectedNodeId] : []);
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
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#A27B21]">Author Studio</p><h2 className="mt-1 text-xl font-black">認證作者工作區</h2><p className="mt-2 text-sm leading-6 text-[#4A4238]/70">專題誌適合長篇文章。可以用 Markdown 排版，圖片使用 <code>![圖片](網址)</code>，影片可以貼成 Markdown 連結。</p></div>{verification?.status === 'approved' && <button type="button" onClick={openNewArticle} className="rounded-xl bg-[#1A1612] px-4 py-2 text-sm font-bold text-white">新增長文</button>}</div>
      {notice && <div className="mt-4 rounded-xl border border-[#F4D58D] bg-[#FFF9E8] p-3 text-sm text-[#6B5310]">{notice}</div>}
      {!verification || verification.status === 'none' ? <div className="mt-5"><p className="text-sm leading-6 text-[#4A4238]/75">申請通過後，你可以建立、編輯並發布自己的專題文章。</p><textarea value={applicationText} onChange={(e) => setApplicationText(e.target.value)} maxLength={5000} placeholder="請介紹你想寫的主題、內容方向與社群經驗（至少 30 字）" className="mt-3 min-h-28 w-full rounded-xl border border-[#D1C6B4]/60 bg-white p-3 text-sm outline-none focus:border-[#A27B21]" /><button type="button" onClick={() => void submitApplication()} disabled={applicationSaving} className="mt-3 rounded-xl bg-[#A27B21] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{applicationSaving ? '送出中…' : '申請認證作者'}</button></div>
        : verification.status === 'pending' ? <p className="mt-5 rounded-xl bg-[#FFF9E8] p-4 text-sm text-[#6B5310]">申請審核中。管理員確認後，就能開啟長文編輯器。</p>
          : verification.status === 'rejected' ? <div className="mt-5"><p className="text-sm text-[#9F1239]">這次申請尚未通過{verification.review_note ? `：${verification.review_note}` : '，你可以補充內容後重新申請。'}</p><textarea value={applicationText} onChange={(e) => setApplicationText(e.target.value)} maxLength={5000} className="mt-3 min-h-28 w-full rounded-xl border border-[#D1C6B4]/60 bg-white p-3 text-sm" /><button type="button" onClick={() => void submitApplication()} disabled={applicationSaving} className="mt-3 rounded-xl bg-[#A27B21] px-4 py-2 text-sm font-bold text-white">重新申請</button></div>
            : <div className="mt-5"><p className="mb-3 rounded-xl bg-[#EEF4EA] p-4 text-sm text-[#47633C]">已通過認證。你的文章會先以草稿保存，再由你確認後發布。</p>{editorOpen && <div className="mb-4 rounded-2xl border border-[#D1C6B4]/60 bg-[#FDFBF7] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-black">{editingId ? '編輯文章' : '新增長文'}</h3><div className="flex items-center gap-3"><span aria-live="polite" className={`text-xs font-bold ${draftStatus === 'error' ? 'text-[#B91C1C]' : 'text-[#64748B]'}`}>{draftStatusLabel}</span><button type="button" onClick={resetEditor} className="text-sm font-bold text-[#4A4238]/60">關閉</button></div></div><div className={previewOpen ? 'mt-4 grid gap-4 lg:grid-cols-2' : 'mt-4'}><div><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={180} placeholder="文章標題" className="w-full rounded-xl border border-[#D1C6B4]/60 bg-white p-3 text-sm" /><input value={excerpt} onChange={(e) => setExcerpt(e.target.value)} maxLength={500} placeholder="文章摘要（最多 500 字）" className="mt-3 w-full rounded-xl border border-[#D1C6B4]/60 bg-white p-3 text-sm" /><select value={selectedNodeId} onChange={(e) => setSelectedNodeId(e.target.value)} className="mt-3 w-full rounded-xl border border-[#D1C6B4]/60 bg-white p-3 text-sm"><option value="">不指定 Mind Map 節點</option>{nodesData.filter((node) => node.level > 0).map((node) => <option key={node.id} value={node.id}>{node.label}</option>)}</select><textarea value={markdown} onChange={(e) => setMarkdown(e.target.value)} placeholder={'使用 Markdown 編輯正文\n\n![圖片](https://...)\n\n[觀看影片](https://...)'} className="mt-3 min-h-72 w-full rounded-xl border border-[#D1C6B4]/60 bg-white p-3 font-mono text-sm leading-6" /></div>{previewOpen && <div className="min-h-72 rounded-xl border border-[#D1C6B4]/60 bg-white p-4"><p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-[#A27B21]">Preview / 預覽</p><MarkdownPreview markdown={markdown} /></div>}</div><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => setPreviewOpen((value) => !value)} className="rounded-xl border border-[#A27B21]/60 bg-[#FFF9E8] px-4 py-2 text-sm font-bold text-[#6B5310]">{previewOpen ? '關閉預覽' : '開啟預覽'}</button><button type="button" onClick={() => void saveArticle()} disabled={articleSaving} className="rounded-xl bg-[#1A1612] px-4 py-2 text-sm font-bold text-white">{articleSaving ? '儲存中…' : '儲存草稿'}</button><button type="button" onClick={resetEditor} className="rounded-xl border border-[#D1C6B4]/70 px-4 py-2 text-sm font-bold">取消</button></div><p className="mt-2 text-xs leading-5 text-[#64748B]">編輯既有草稿時，停止輸入約 1.5 秒會自動儲存；新文章第一次仍請按「儲存草稿」建立文章。</p></div>}{<div className="space-y-2">{myArticles.map((article) => <div key={article.id} className="flex flex-col gap-3 rounded-xl border border-[#D1C6B4]/50 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold">{article.title || '未命名文章'}</p><p className="mt-1 text-xs text-[#4A4238]/60">{article.status === 'published' ? '已發布' : '草稿'} · 更新於 {formatArticleDate(article.updated_at) || '日期未提供'}</p></div><div className="flex gap-2"><button type="button" onClick={() => openArticle(article)} className="rounded-lg border border-[#D1C6B4]/70 px-3 py-1.5 text-xs font-bold">編輯</button>{article.status === 'draft' && <button type="button" onClick={() => void publish(article.id)} disabled={articleSaving} className="rounded-lg bg-[#A27B21] px-3 py-1.5 text-xs font-bold text-white">發布</button>}</div></div>)}{myArticles.length === 0 && <p className="rounded-xl border border-dashed border-[#D1C6B4] p-4 text-sm text-[#4A4238]/60">還沒有自己的文章，按右上角「新增長文」開始。</p>}</div>}</div>}
    </div>
  );
}

function ArticleCard({ article, onOpen }: { article: ArticleItem; onOpen: (id: string) => void }) {
  const cover = article.document.cover;
  const hasImageCover = cover?.type === 'image' && isSafeArticleUrl(cover.url);
  return (
    <button type="button" onClick={() => onOpen(article.id)} className="group flex h-full flex-col overflow-hidden rounded-3xl border border-[#D1C6B4]/50 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:border-[#D9B650]/70 hover:shadow-lg">
      <div className="relative h-44 overflow-hidden bg-gradient-to-br from-[#F5EFE6] to-[#FFF9E8]">{hasImageCover ? <><span className="sr-only">文章封面圖片</span>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={cover.url} alt={cover.alt || article.title} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /></> : <div className="flex h-full items-end p-5"><div className="h-2 w-24 rounded-full" style={{ backgroundColor: article.color }} /></div>}<div className="absolute left-4 top-4 flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-white/90 px-3 py-1 text-[#8A6A1F]">{article.label}</span>{article.featured && <span className="rounded-full bg-[#D9B650] px-3 py-1 text-[#1A1612]">熱門</span>}</div></div>
      <div className="flex flex-1 flex-col p-5"><div className="flex items-center justify-between gap-3 text-xs text-[#4A4238]/55"><span>{article.readMinutes} 分鐘閱讀</span><span>{article.commentCount} 則留言</span></div><h2 className="mt-3 text-xl font-black leading-snug text-[#1A1612] group-hover:text-[#8A6A1F]">{article.title}</h2><p className="mt-3 line-clamp-3 text-sm leading-6 text-[#4A4238]/70">{article.excerpt}</p>{article.tags.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{article.tags.slice(0, 3).map((tag) => <span key={tag} className="rounded-full bg-[#F5EFE6] px-2.5 py-1 text-[11px] font-bold text-[#6B5A4A]">#{tag}</span>)}</div>}<span className="mt-auto pt-6 text-sm font-black text-[#1A1612]">閱讀完整專題 →</span></div>
    </button>
  );
}

function ArticleReader({ article, onBack, onBackToNode }: { article: ArticleItem; onBack: () => void; onBackToNode?: (nodeId: string) => void }) {
  const [sectionsOpen, setSectionsOpen] = useState<Record<string, boolean>>({});
  const allOpen = article.document.sections.length > 0 && article.document.sections.every((section) => sectionsOpen[section.id] ?? section.defaultOpen);
  const setAllSections = (open: boolean) => setSectionsOpen(Object.fromEntries(article.document.sections.map((section) => [section.id, open])));
  return (
    <section className="h-full overflow-y-auto bg-[#FDFBF7] text-[#1A1612]"><div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10"><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={onBack} className="rounded-full border border-[#D1C6B4]/70 bg-white px-4 py-2 text-sm font-bold text-[#4A4238]">← 返回專題列表</button>{onBackToNode && article.nodeId && <button type="button" onClick={() => onBackToNode(article.nodeId)} className="rounded-full border border-[#D9B650]/70 bg-[#FFF9E8] px-4 py-2 text-sm font-bold text-[#6B5310]">回到 Mind Map 節點</button>}</div><article className="overflow-hidden rounded-3xl border border-[#D1C6B4]/50 bg-white shadow-sm"><header className="border-b border-[#D1C6B4]/40 bg-gradient-to-br from-white via-[#FFF9F0] to-[#F5EFE6] px-5 py-8 md:px-12 md:py-12"><div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#8A6A1F]"><span className="rounded-full bg-[#FFF4C8] px-3 py-1">專題誌</span><span className="rounded-full bg-[#F5EFE6] px-3 py-1">{article.label}</span>{article.featured && <span className="rounded-full bg-[#D9B650] px-3 py-1 text-[#1A1612]">熱門推薦</span>}</div><h1 className="mt-4 max-w-4xl text-3xl font-black leading-tight md:text-5xl">{article.title}</h1><p className="mt-5 max-w-3xl text-base leading-8 text-[#4A4238]/75">{article.excerpt}</p><div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-[#4A4238]/55"><span>約 {article.readMinutes} 分鐘閱讀</span>{formatArticleDate(article.publishedAt || article.createdAt) && <span>發布於 {formatArticleDate(article.publishedAt || article.createdAt)}</span>}<span>{article.commentCount} 則留言</span></div>{article.tags.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{article.tags.map((tag) => <span key={tag} className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-[#6B5A4A]">#{tag}</span>)}</div>}</header><div className="px-5 py-7 md:px-12 md:py-10">{article.document.cover && <MarkdownPreview markdown="" media={[article.document.cover]} />}<div className="mt-7"><MarkdownPreview markdown={article.document.introMarkdown} media={article.document.media} /></div>{article.document.sections.length > 0 && <div className="mt-10 border-t border-[#D1C6B4]/50 pt-6"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#A27B21]">Contents / 章節</p><h2 className="mt-1 text-xl font-black">依你的節奏閱讀</h2></div><div className="flex gap-2"><button type="button" onClick={() => setAllSections(!allOpen)} className="rounded-lg border border-[#D1C6B4]/70 px-3 py-1.5 text-xs font-bold">{allOpen ? '全部收合' : '全部展開'}</button></div></div><div className="space-y-3">{article.document.sections.map((section, index) => { const isOpen = sectionsOpen[section.id] ?? section.defaultOpen; return <div key={section.id} className="overflow-hidden rounded-2xl border border-[#D1C6B4]/50 bg-[#FDFBF7]"><details open={section.collapsible ? isOpen : true} onToggle={(event) => { if (section.collapsible) setSectionsOpen((current) => ({ ...current, [section.id]: event.currentTarget.open })); }}><summary className={`cursor-pointer list-none px-5 py-4 text-base font-black marker:hidden ${section.collapsible ? '' : 'cursor-default'}`}><span className="mr-3 text-[#A27B21]">{String(index + 1).padStart(2, '0')}</span>{section.heading || `第 ${index + 1} 章`}{section.collapsible && <span className="float-right text-[#A27B21]">{isOpen ? '−' : '+'}</span>}</summary><div className="border-t border-[#D1C6B4]/40 px-5 py-5"><MarkdownPreview markdown={section.markdown} media={section.media} /></div></details></div>; })}</div></div>}</div><footer className="border-t border-[#D1C6B4]/40 bg-[#FDFBF7]/70 px-5 py-5 text-sm leading-6 text-[#4A4238]/65 md:px-12">專題文章與討論留言分開管理；文章內容由後台發布版本提供，閱讀時不會直接讀取草稿。</footer></article></div></section>
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
    return sortArticles(byNode.filter((article) => articleMatchesSearch(article, searchQuery)), sortMode);
  }, [articles, nodeFilter, searchQuery, sortMode]);
  const selectedArticle = articles.find((article) => article.id === selectedArticleId) || null;
  const visibleNodes = showAllNodes ? filterNodes : filterNodes.slice(0, 6);
  const hasActiveFilters = Boolean(searchQuery.trim()) || nodeFilter !== 'all';

  if (selectedArticle) return <ArticleReader article={selectedArticle} onBack={() => setSelectedArticleId(null)} onBackToNode={onBackToNode} />;

  return (
    <section className="h-full overflow-y-auto bg-[#FDFBF7] text-[#1A1612]"><div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10"><header className="mb-6 rounded-3xl border border-[#D1C6B4]/50 bg-gradient-to-br from-white via-[#FFF9F0] to-[#F5EFE6] p-6 shadow-sm md:mb-8 md:p-10"><div className="max-w-4xl"><p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-[#A27B21]">KinkFlow / Deep Reading</p><h1 className="text-3xl font-black md:text-5xl">專題誌</h1><p className="mt-4 text-sm leading-7 text-[#4A4238]/75 md:text-base">把一個主題讀深、讀完整。這裡收錄心理、關係、安全與文化脈絡的長文，搭配圖片、影片與可自由收合的章節，讓你按照自己的節奏探索。</p></div><div className="mt-6 flex flex-wrap gap-3 text-xs font-bold text-[#6B5A4A]"><span className="rounded-full bg-white/80 px-3 py-2">{articles.length} 篇專題</span><span className="rounded-full bg-white/80 px-3 py-2">可搜尋全文</span><span className="rounded-full bg-white/80 px-3 py-2">圖片與影片</span><span className="rounded-full bg-white/80 px-3 py-2">章節收合</span></div></header>
      <div className="mb-6 rounded-2xl border border-[#D1C6B4]/50 bg-white p-4 shadow-sm md:p-5"><div className="flex flex-col gap-3 lg:flex-row lg:items-center"><label className="relative min-w-0 flex-1"><span className="sr-only">搜尋專題</span><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="w-full rounded-xl border border-[#D1C6B4]/70 bg-[#FDFBF7] py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#A27B21]" placeholder="搜尋標題、摘要、章節、標籤或全文內容…" /><span aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A27B21]">⌕</span></label><div className="flex shrink-0 gap-2 rounded-xl bg-[#FDFBF7] p-1"><button type="button" onClick={() => setSortMode('hot')} className={`rounded-lg px-4 py-2 text-sm font-bold ${sortMode === 'hot' ? 'bg-[#1A1612] text-white' : 'text-[#4A4238]/70'}`}>熱門</button><button type="button" onClick={() => setSortMode('latest')} className={`rounded-lg px-4 py-2 text-sm font-bold ${sortMode === 'latest' ? 'bg-[#1A1612] text-white' : 'text-[#4A4238]/70'}`}>最新</button></div></div><div className="mt-4 flex flex-wrap items-center gap-2" aria-label="專題節點篩選"><button type="button" onClick={() => setNodeFilter('all')} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${nodeFilter === 'all' ? 'bg-[#1A1612] text-white' : 'border border-[#D1C6B4]/70 bg-white text-[#4A4238]'}`}>全部主題</button>{visibleNodes.map((node) => <button key={node.id} type="button" onClick={() => setNodeFilter(node.id)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${nodeFilter === node.id ? 'text-white' : 'border border-[#D1C6B4]/70 bg-white text-[#4A4238]'}`} style={nodeFilter === node.id ? { backgroundColor: node.color || '#4A4238' } : undefined}>{node.label}</button>)}{filterNodes.length > 6 && <button type="button" onClick={() => setShowAllNodes((value) => !value)} className="rounded-full border border-dashed border-[#A27B21] px-4 py-2 text-sm font-bold text-[#6B5310]">{showAllNodes ? '收起主題' : `更多主題（${filterNodes.length - 6}）`}</button>}</div></div>
      {isLoading && <div className="mb-5 rounded-2xl border border-[#D1C6B4]/50 bg-white p-4 text-sm text-[#4A4238]/60">正在載入正式專題內容…</div>}
      {hasActiveFilters && <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#FFF9E8] px-4 py-3 text-sm text-[#6B5310]"><span>找到 {filteredArticles.length} 篇符合條件的專題。</span><button type="button" onClick={() => { setSearchQuery(''); setNodeFilter('all'); }} className="font-bold underline underline-offset-4">清除篩選</button></div>}
      {filteredArticles.length === 0 ? <div className="rounded-3xl border border-dashed border-[#D1C6B4] bg-white p-10 text-center text-sm leading-7 text-[#4A4238]/60">目前沒有符合條件的專題。你可以換一個關鍵字、切換排序，或清除節點篩選。</div> : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{filteredArticles.map((article) => <ArticleCard key={article.id} article={article} onOpen={setSelectedArticleId} />)}</div>}
      {liveArticles.length === 0 && !isLoading && <div className="mt-6 rounded-2xl border border-[#D1C6B4]/50 bg-[#FFF9E8]/70 p-4 text-sm leading-6 text-[#6B5310]">目前還沒有管理員發布的正式專題，畫面先保留 Mind Map 的既有內容作為閱讀入口。管理員發布長文後，前台會自動改讀正式版本。</div>}
      <AuthorWorkspace nodesData={nodesData} isMember={isMember} verification={verification} setVerification={setVerification} /></div></section>
  );
}
