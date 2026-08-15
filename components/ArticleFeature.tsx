'use client';

import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { GraphNode } from '@/lib/types';
import { buildLegacyArticles, fetchPublishedArticles, formatArticleDate, type ArticleItem } from '@/lib/data/articles';
import { createArticleDraft, fetchMyArticles, fetchMyAuthorVerification, publishArticle, submitAuthorVerification, updateArticleDraft, type AuthorVerification, type EditableArticle } from '@/lib/data/authorWorkspace';

type ArticleFeatureProps = {
  nodesData: GraphNode[];
  initialNodeId?: string | null;
  onBackToNode?: (nodeId: string) => void;
  isMember?: boolean;
};

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

  useEffect(() => {
    if (verification?.application_text) setApplicationText(verification.application_text);
  }, [verification]);

  useEffect(() => {
    if (verification?.status === 'approved') void fetchMyArticles().then(setMyArticles);
  }, [verification?.status]);

  if (!isMember) return <div className="mt-6 rounded-2xl border border-dashed border-[#D1C6B4] bg-white/80 p-4 text-sm text-[#4A4238]/70">想投稿長篇專題嗎？先登入會員，再提交認證作者申請。</div>;

  const submitApplication = async () => {
    setApplicationSaving(true); setNotice(null);
    const result = await submitAuthorVerification(applicationText);
    if (!result.ok) setNotice(result.message || '申請送出失敗。');
    else { setVerification({ user_id: verification?.user_id || '', status: 'pending', application_text: applicationText.trim() }); setNotice('申請已送出，等待管理員審核。'); }
    setApplicationSaving(false);
  };

  const openNewArticle = () => { setEditingId(null); setTitle(''); setExcerpt(''); setMarkdown(''); setSelectedNodeId(nodesData.find((node) => node.level > 0)?.id || ''); setEditorOpen(true); setNotice(null); };
  const openArticle = (article: EditableArticle) => { setEditingId(article.id); setTitle(article.title); setExcerpt(article.excerpt); setMarkdown(typeof article.body_json?.markdown === 'string' ? article.body_json.markdown : ''); setEditorOpen(true); setNotice(null); };
  const saveArticle = async () => {
    if (!title.trim() || !markdown.trim()) { setNotice('請至少填寫文章標題與正文。'); return; }
    setArticleSaving(true); setNotice(null);
    const result = editingId ? await updateArticleDraft(editingId, title, excerpt, markdown) : await createArticleDraft(title, excerpt, markdown, selectedNodeId ? [selectedNodeId] : []);
    if (!result.ok) setNotice(result.message || '文章儲存失敗。');
    else { setEditorOpen(false); setMyArticles(await fetchMyArticles()); setNotice(editingId ? '文章草稿已更新。' : '文章草稿已建立。'); }
    setArticleSaving(false);
  };
  const publish = async (articleId: string) => {
    setArticleSaving(true); setNotice(null);
    const result = await publishArticle(articleId);
    if (!result.ok) setNotice(result.message || '文章發布失敗。');
    else { setMyArticles(await fetchMyArticles()); setNotice('文章已送出發布。'); }
    setArticleSaving(false);
  };

  return (
    <div className="mt-6 rounded-3xl border border-[#D1C6B4]/50 bg-white/80 p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#A27B21]">Author Studio</p><h2 className="mt-1 text-xl font-black">認證作者工作區</h2><p className="mt-2 text-sm leading-6 text-[#4A4238]/70">專題誌適合長篇文章。可以用 Markdown 排版，圖片使用 <code>![圖片](網址)</code>，影片可以貼成 Markdown 連結。</p></div>{verification?.status === 'approved' && <button type="button" onClick={openNewArticle} className="rounded-xl bg-[#1A1612] px-4 py-2 text-sm font-bold text-white">新增長文</button>}</div>
      {notice && <div className="mt-4 rounded-xl border border-[#F4D58D] bg-[#FFF9E8] p-3 text-sm text-[#6B5310]">{notice}</div>}
      {!verification || verification.status === 'none' ? <div className="mt-5"><p className="text-sm leading-6 text-[#4A4238]/75">申請通過後，你可以建立、編輯並發布自己的專題文章。</p><textarea value={applicationText} onChange={(e) => setApplicationText(e.target.value)} maxLength={5000} placeholder="請介紹你想寫的主題、內容方向與社群經驗（至少 30 字）" className="mt-3 min-h-28 w-full rounded-xl border border-[#D1C6B4]/60 bg-white p-3 text-sm outline-none focus:border-[#A27B21]" /><button type="button" onClick={() => void submitApplication()} disabled={applicationSaving} className="mt-3 rounded-xl bg-[#A27B21] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{applicationSaving ? '送出中…' : '申請認證作者'}</button></div> : verification.status === 'pending' ? <p className="mt-5 rounded-xl bg-[#FFF9E8] p-4 text-sm text-[#6B5310]">申請審核中。管理員確認後，就能開啟長文編輯器。</p> : verification.status === 'rejected' ? <div className="mt-5"><p className="text-sm text-[#9F1239]">這次申請尚未通過{verification.review_note ? `：${verification.review_note}` : '，你可以補充內容後重新申請。'}</p><textarea value={applicationText} onChange={(e) => setApplicationText(e.target.value)} maxLength={5000} className="mt-3 min-h-28 w-full rounded-xl border border-[#D1C6B4]/60 bg-white p-3 text-sm" /><button type="button" onClick={() => void submitApplication()} disabled={applicationSaving} className="mt-3 rounded-xl bg-[#A27B21] px-4 py-2 text-sm font-bold text-white">重新申請</button></div> : <div className="mt-5"><p className="mb-3 rounded-xl bg-[#EEF4EA] p-4 text-sm text-[#47633C]">已通過認證。你的文章會先以草稿保存，再由你確認後發布。</p>{editorOpen && <div className="mb-4 rounded-2xl border border-[#D1C6B4]/60 bg-[#FDFBF7] p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-black">{editingId ? '編輯文章' : '新增長文'}</h3><button type="button" onClick={() => setEditorOpen(false)} className="text-sm font-bold text-[#4A4238]/60">關閉</button></div><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={180} placeholder="文章標題" className="mt-4 w-full rounded-xl border border-[#D1C6B4]/60 bg-white p-3 text-sm" /><input value={excerpt} onChange={(e) => setExcerpt(e.target.value)} maxLength={500} placeholder="文章摘要（最多 500 字）" className="mt-3 w-full rounded-xl border border-[#D1C6B4]/60 bg-white p-3 text-sm" /><select value={selectedNodeId} onChange={(e) => setSelectedNodeId(e.target.value)} className="mt-3 w-full rounded-xl border border-[#D1C6B4]/60 bg-white p-3 text-sm"><option value="">不指定 Mind Map 節點</option>{nodesData.filter((node) => node.level > 0).map((node) => <option key={node.id} value={node.id}>{node.label}</option>)}</select><textarea value={markdown} onChange={(e) => setMarkdown(e.target.value)} placeholder={'使用 Markdown 編輯正文\n\n![圖片](https://...)\n\n[觀看影片](https://...)'} className="mt-3 min-h-72 w-full rounded-xl border border-[#D1C6B4]/60 bg-white p-3 font-mono text-sm leading-6" /><div className="mt-3 flex gap-2"><button type="button" onClick={() => void saveArticle()} disabled={articleSaving} className="rounded-xl bg-[#1A1612] px-4 py-2 text-sm font-bold text-white">{articleSaving ? '儲存中…' : '儲存草稿'}</button><button type="button" onClick={() => setEditorOpen(false)} className="rounded-xl border border-[#D1C6B4]/70 px-4 py-2 text-sm font-bold">取消</button></div></div>}<div className="space-y-2">{myArticles.map((article) => <div key={article.id} className="flex flex-col gap-3 rounded-xl border border-[#D1C6B4]/50 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold">{article.title || '未命名文章'}</p><p className="mt-1 text-xs text-[#4A4238]/60">{article.status === 'published' ? '已發布' : '草稿'} · 更新於 {formatArticleDate(article.updated_at) || '日期未提供'}</p></div><div className="flex gap-2"><button type="button" onClick={() => openArticle(article)} className="rounded-lg border border-[#D1C6B4]/70 px-3 py-1.5 text-xs font-bold">編輯</button>{article.status === 'draft' && <button type="button" onClick={() => void publish(article.id)} disabled={articleSaving} className="rounded-lg bg-[#A27B21] px-3 py-1.5 text-xs font-bold text-white">發布</button>}</div></div>)}{myArticles.length === 0 && <p className="rounded-xl border border-dashed border-[#D1C6B4] p-4 text-sm text-[#4A4238]/60">還沒有自己的文章，按右上角「新增長文」開始。</p>}</div></div>}
    </div>
  );
}

export default function ArticleFeature({ nodesData, initialNodeId = null, onBackToNode, isMember = false }: ArticleFeatureProps) {
  const legacyArticles = useLegacyArticles(nodesData);
  const [liveArticles, setLiveArticles] = useState<ArticleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [nodeFilter, setNodeFilter] = useState<string>(initialNodeId || 'all');
  const [verification, setVerification] = useState<AuthorVerification | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => { setIsLoading(true); const nextArticles = await fetchPublishedArticles(nodesData); if (!active) return; setLiveArticles(nextArticles); setIsLoading(false); };
    void load();
    return () => { active = false; };
  }, [nodesData]);

  useEffect(() => { if (isMember) void fetchMyAuthorVerification().then(setVerification); else setVerification(null); }, [isMember]);

  const articles = liveArticles.length ? liveArticles : legacyArticles;
  const filteredArticles = useMemo(() => nodeFilter === 'all' ? articles : articles.filter((article) => article.nodeId === nodeFilter), [articles, nodeFilter]);
  const selectedArticle = articles.find((article) => article.id === selectedArticleId) || null;

  if (selectedArticle) {
    return <section className="h-full overflow-y-auto bg-[#FDFBF7] text-[#1A1612]"><div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-10"><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={() => setSelectedArticleId(null)} className="rounded-full border border-[#D1C6B4]/70 bg-white px-4 py-2 text-sm font-bold text-[#4A4238]">← 返回專題列表</button>{onBackToNode && selectedArticle.nodeId && <button type="button" onClick={() => onBackToNode(selectedArticle.nodeId)} className="rounded-full border border-[#D9B650]/70 bg-[#FFF9E8] px-4 py-2 text-sm font-bold text-[#6B5310]">回到 Mind Map 節點</button>}</div><article className="overflow-hidden rounded-3xl border border-[#D1C6B4]/50 bg-white shadow-sm"><header className="border-b border-[#D1C6B4]/40 px-5 py-7 md:px-10 md:py-10"><div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold text-[#8A6A1F]"><span className="rounded-full bg-[#FFF4C8] px-3 py-1">專題誌</span><span className="rounded-full bg-[#F5EFE6] px-3 py-1">{selectedArticle.label}</span><span className="rounded-full bg-[#EEF4EA] px-3 py-1">{selectedArticle.source === 'live' ? '正式文章' : '舊資料預覽'}</span></div><h1 className="text-3xl font-black leading-tight md:text-5xl">{selectedArticle.title}</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-[#4A4238]/70">{selectedArticle.excerpt}</p>{formatArticleDate(selectedArticle.createdAt) && <p className="mt-3 text-xs text-[#4A4238]/50">發布於 {formatArticleDate(selectedArticle.createdAt)}</p>}</header><div className="prose prose-stone max-w-none px-5 py-7 md:px-10 md:py-10"><ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedArticle.content || '文章內容準備中。'}</ReactMarkdown></div><footer className="border-t border-[#D1C6B4]/40 bg-[#FDFBF7]/70 px-5 py-5 text-sm text-[#4A4238]/70 md:px-10">專題文章與討論留言分開管理；文章作者可以在工作區維護自己的長文。</footer></article></div></section>;
  }

  const filterNodes = nodesData.filter((node) => node.level > 0 && (node.detail_text || liveArticles.some((article) => article.nodeId === node.id)));
  return <section className="h-full overflow-y-auto bg-[#FDFBF7] text-[#1A1612]"><div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10"><header className="mb-8 rounded-3xl border border-[#D1C6B4]/50 bg-gradient-to-br from-white via-[#FFF9F0] to-[#F5EFE6] p-6 shadow-sm md:p-10"><div className="max-w-3xl"><p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-[#A27B21]">KinkFlow / Deep Reading</p><h1 className="text-3xl font-black md:text-5xl">專題誌</h1><p className="mt-4 text-sm leading-7 text-[#4A4238]/75 md:text-base">從 Mind Map 的主題入口，進入更完整的心理學、關係、安全與文化脈絡文章。長篇內容和交流討論分開管理，讓閱讀更清楚。</p></div></header><div className="mb-6 flex gap-2 overflow-x-auto pb-1" aria-label="專題主題篩選"><button type="button" onClick={() => setNodeFilter('all')} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${nodeFilter === 'all' ? 'bg-[#1A1612] text-white' : 'border border-[#D1C6B4]/70 bg-white text-[#4A4238]'}`}>全部專題</button>{filterNodes.map((node) => <button key={node.id} type="button" onClick={() => setNodeFilter(node.id)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${nodeFilter === node.id ? 'text-white' : 'border border-[#D1C6B4]/70 bg-white text-[#4A4238]'}`} style={nodeFilter === node.id ? { backgroundColor: node.color || '#4A4238' } : undefined}>{node.label}</button>)}</div>{isLoading && <div className="mb-5 rounded-2xl border border-[#D1C6B4]/50 bg-white p-4 text-sm text-[#4A4238]/60">正在載入正式專題；若沒有正式文章，會保留原本 Mind Map 內容。</div>}{filteredArticles.length === 0 ? <div className="rounded-3xl border border-dashed border-[#D1C6B4] bg-white p-10 text-center text-sm text-[#4A4238]/60">目前沒有可閱讀的專題。這裡會顯示認證作者發表的文章。</div> : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{filteredArticles.map((article) => <button key={article.id} type="button" onClick={() => setSelectedArticleId(article.id)} className="group rounded-3xl border border-[#D1C6B4]/50 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#D9B650]/70 hover:shadow-md"><div className="mb-5 h-2 rounded-full" style={{ backgroundColor: article.color }} /><div className="mb-3 flex items-center justify-between gap-3 text-xs font-bold text-[#8A6A1F]"><span>{article.label}</span><span className="rounded-full bg-[#EEF4EA] px-2.5 py-1 text-[#47633C]">專題文章</span></div><h2 className="text-xl font-black leading-snug group-hover:text-[#8A6A1F]">{article.title}</h2><p className="mt-3 line-clamp-3 text-sm leading-6 text-[#4A4238]/70">{article.excerpt}</p><span className="mt-6 inline-flex text-sm font-black text-[#1A1612]">閱讀完整專題 →</span></button>)}</div>}<AuthorWorkspace nodesData={nodesData} isMember={isMember} verification={verification} setVerification={setVerification} /></div></section>;
}
