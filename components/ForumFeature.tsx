"use client";

import { useEffect, useMemo, useState } from 'react';
import type { DiscussionPost, GraphNode } from '@/lib/types';
import { extractDiscussionContent, sortDiscussionPosts } from '@/lib/contentModel';
import { createForumComment, createForumPost, fetchForumComments, fetchPublishedForumPosts, formatForumDate, toLegacyForumItems, type ForumComment, type ForumItem } from '@/lib/data/forum';

type ForumFeatureProps = { nodesData: GraphNode[]; discussions: Record<string, DiscussionPost[]>; isMember?: boolean };

function DiscussionMedia({ post }: { post: DiscussionPost }) {
  const media = extractDiscussionContent(post.text, post.title, post.body, post.media).media;
  if (!media?.length) return null;
  return <div className="mt-5 grid gap-3 sm:grid-cols-2" aria-label="文章圖片">{media.filter((item) => item.type !== 'video').map((item) => <img key={item.url} src={item.url} alt={item.alt || '討論附件圖片'} loading="lazy" referrerPolicy="no-referrer" className="max-h-80 w-full rounded-2xl border border-[#CBD5E1] bg-[#F8FAFC] object-contain" />)}</div>;
}

export default function ForumFeature({ nodesData, discussions, isMember = false }: ForumFeatureProps) {
  const [activeNodeId, setActiveNodeId] = useState('all');
  const [livePosts, setLivePosts] = useState<ForumItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortMode, setSortMode] = useState<'hot' | 'latest'>('latest');
  const [selectedPostId, setSelectedPostId] = useState<string | number | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [postFormOpen, setPostFormOpen] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const loadPosts = async () => {
    setIsLoading(true);
          setLivePosts(await fetchPublishedForumPosts(nodesData));

    setIsLoading(false);
  };

  useEffect(() => { void loadPosts(); }, [nodesData]);

  const legacyItems = useMemo(() => toLegacyForumItems(nodesData, discussions), [nodesData, discussions]);
  const items = livePosts.length ? livePosts : legacyItems;
  const visibleItems = useMemo(() => sortDiscussionPosts(activeNodeId === 'all' ? items : items.filter((item) => item.nodeId === activeNodeId), sortMode), [activeNodeId, items, sortMode]);
  const selectedPost = items.find((post) => String(post.id) === String(selectedPostId)) || null;

  useEffect(() => {
    if (!selectedPost || typeof selectedPost.id !== 'string' || selectedPost.id.startsWith('legacy')) { setComments([]); return; }
    void fetchForumComments(selectedPost.id).then(setComments);
  }, [selectedPost]);

  const submitPost = async () => {
    const title = postTitle.trim(); const body = postBody.trim();
    if (!title || !body) { setNotice('請填寫標題與內容。'); return; }
    setSaving(true); setNotice(null);
    const result = await createForumPost(title, body);
    if (!result.ok) setNotice(result.message || '發文失敗，請稍後再試。');
    else { setPostTitle(''); setPostBody(''); setPostFormOpen(false); await loadPosts(); setNotice('已成功發表主題。'); }
    setSaving(false);
  };

  const submitComment = async () => {
    const body = commentText.trim();
    if (!body || !selectedPost || typeof selectedPost.id !== 'string') return;
    setSaving(true); setNotice(null);
    const result = await createForumComment(selectedPost.id, body);
    if (!result.ok) setNotice(result.message || '留言失敗，請稍後再試。');
    else { setCommentText(''); setComments(await fetchForumComments(selectedPost.id)); }
    setSaving(false);
  };

  if (selectedPost) {
    const content = extractDiscussionContent(selectedPost.text, selectedPost.title, selectedPost.body, selectedPost.media);
    return <section className="h-full overflow-y-auto bg-[#F8FAFC] text-[#172033]"><div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-10"><button type="button" onClick={() => setSelectedPostId(null)} className="mb-6 rounded-full border border-[#CBD5E1] bg-white px-4 py-2 text-sm font-bold text-[#334155]">← 返回討論版</button><article className="overflow-hidden rounded-3xl border border-[#CBD5E1] bg-white shadow-sm"><header className="border-b border-[#E2E8F0] px-5 py-7 md:px-10"><div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold"><span className="rounded-full px-3 py-1 text-white" style={{ backgroundColor: selectedPost.nodeColor }}>{selectedPost.nodeLabel}</span><span className="rounded-full bg-[#F1F5F9] px-3 py-1 text-[#475569]">會員討論</span></div><h1 className="text-2xl font-black leading-tight md:text-4xl">{content.title}</h1><p className="mt-3 text-sm text-[#64748B]">作者：{selectedPost.author || '匿名會員'}　·　{formatForumDate(selectedPost.timestamp)}</p></header><div className="px-5 py-7 text-base leading-8 text-[#263449] md:px-10 md:py-10"><p className="whitespace-pre-wrap">{content.body}</p><DiscussionMedia post={selectedPost} /></div><section className="border-t border-[#E2E8F0] bg-[#F8FAFC] px-5 py-6 md:px-10"><h2 className="text-lg font-black">留言討論（{comments.length}）</h2><div className="mt-4 space-y-3">{comments.map((comment) => <div key={comment.id} className="rounded-2xl bg-white p-4"><p className="whitespace-pre-wrap text-sm leading-6 text-[#334155]">{comment.body_text}</p><p className="mt-2 text-xs text-[#94A3B8]">{formatForumDate(comment.created_at)}</p></div>)}{comments.length === 0 && <p className="text-sm text-[#64748B]">目前還沒有留言。</p>}</div>{isMember ? <div className="mt-5 flex flex-col gap-2 sm:flex-row"><textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} maxLength={3000} placeholder="寫下你的留言…" className="min-h-24 flex-1 rounded-xl border border-[#CBD5E1] bg-white p-3 text-sm outline-none focus:border-[#172033]" /><button type="button" disabled={saving} onClick={submitComment} className="rounded-xl bg-[#172033] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? '送出中…' : '送出留言'}</button></div> : <div className="mt-4 rounded-xl border border-dashed border-[#CBD5E1] bg-white p-4 text-sm text-[#64748B]">登入會員後即可參與討論。</div>}</section></article></div></section>;
  }

  return <section className="h-full overflow-y-auto bg-[#F8FAFC] text-[#172033]"><div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10"><header className="mb-7 rounded-3xl bg-[#172033] p-6 text-white shadow-sm md:p-10"><p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-[#FCD34D]">KinkFlow / Community</p><h1 className="text-3xl font-black md:text-5xl">討論版</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 md:text-base">會員可以針對主題發文、分享經驗和提問。文章可以貼上多個節點 Tag，但所有討論仍在同一個社群裡流動。</p></header><div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div className="flex gap-2 overflow-x-auto pb-1" aria-label="討論節點篩選"><button type="button" onClick={() => setActiveNodeId('all')} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${activeNodeId === 'all' ? 'bg-[#172033] text-white' : 'border border-[#CBD5E1] bg-white text-[#475569]'}`}>全部討論</button>{nodesData.filter((node) => node.level > 0).map((node) => <button key={node.id} type="button" onClick={() => setActiveNodeId(node.id)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${activeNodeId === node.id ? 'text-white' : 'border border-[#CBD5E1] bg-white text-[#475569]'}`} style={activeNodeId === node.id ? { backgroundColor: node.color || '#172033' } : undefined}>{node.label}</button>)}</div><div className="flex gap-2"><button type="button" onClick={() => setSortMode('hot')} className={`rounded-lg px-3 py-2 text-xs font-bold ${sortMode === 'hot' ? 'bg-[#FEF3C7] text-[#92400E]' : 'bg-white text-[#64748B]'}`}>熱門</button><button type="button" onClick={() => setSortMode('latest')} className={`rounded-lg px-3 py-2 text-xs font-bold ${sortMode === 'latest' ? 'bg-[#DBEAFE] text-[#1D4ED8]' : 'bg-white text-[#64748B]'}`}>最新</button></div></div>{notice && <div className="mb-4 rounded-xl border border-[#FCD34D] bg-[#FFFBEB] p-3 text-sm text-[#92400E]">{notice}</div>}{isMember && postFormOpen && <div className="mb-5 rounded-2xl border border-[#CBD5E1] bg-white p-5"><h2 className="text-lg font-black">發表新主題</h2><input value={postTitle} onChange={(e) => setPostTitle(e.target.value)} maxLength={160} placeholder="標題（最多 160 字）" className="mt-4 w-full rounded-xl border border-[#CBD5E1] p-3 text-sm outline-none focus:border-[#172033]" /><textarea value={postBody} onChange={(e) => setPostBody(e.target.value)} maxLength={10000} placeholder="內容（最多 10,000 字）" className="mt-3 min-h-36 w-full rounded-xl border border-[#CBD5E1] p-3 text-sm outline-none focus:border-[#172033]" /><div className="mt-3 flex gap-2"><button type="button" disabled={saving} onClick={submitPost} className="rounded-xl bg-[#172033] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? '發表中…' : '發表'}</button><button type="button" onClick={() => setPostFormOpen(false)} className="rounded-xl border border-[#CBD5E1] px-4 py-2 text-sm font-bold">取消</button></div></div>}<div className="mb-5 flex items-center justify-between rounded-2xl border border-[#CBD5E1] bg-white px-4 py-3 text-sm"><span className="font-bold text-[#334155]">共有 {visibleItems.length} 篇可顯示討論</span>{isMember ? <button type="button" onClick={() => setPostFormOpen((open) => !open)} className="rounded-xl bg-[#172033] px-4 py-2 text-xs font-bold text-white">{postFormOpen ? '收起發文' : '發表新主題'}</button> : <span className="text-[#64748B]">登入後可以發文</span>}</div>{isLoading && <div className="mb-5 rounded-2xl border border-[#CBD5E1] bg-white p-4 text-sm text-[#64748B]">正在載入正式討論…</div>}{visibleItems.length === 0 ? <div className="rounded-3xl border border-dashed border-[#CBD5E1] bg-white p-12 text-center text-sm text-[#64748B]">目前還沒有討論。可以先從心智圖節點開始探索。</div> : <div className="grid gap-4 lg:grid-cols-2">{visibleItems.map((post) => { const content = extractDiscussionContent(post.text, post.title, post.body, post.media); return <button key={String(post.id)} type="button" onClick={() => setSelectedPostId(post.id)} className="rounded-2xl border border-[#CBD5E1] bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#94A3B8] hover:shadow-md"><div className="mb-3 flex items-center justify-between gap-3 text-xs font-bold text-[#64748B]"><span className="rounded-full px-3 py-1 text-white" style={{ backgroundColor: post.nodeColor }}>{post.nodeLabel}</span><span>{formatForumDate(post.timestamp)}</span></div><h2 className="text-lg font-black leading-snug text-[#172033]">{content.title}</h2><p className="mt-2 line-clamp-2 whitespace-pre-wrap text-sm leading-6 text-[#64748B]">{content.body}</p>{content.media?.length ? <p className="mt-2 text-xs font-bold text-[#475569]">附有 {content.media.length} 個媒體附件</p> : null}<div className="mt-4 flex gap-3 text-xs font-bold text-[#64748B]"><span>作者 {post.author || '匿名會員'}</span><span>👍 {post.upvotes || 0}</span><span>回覆 {post.replies?.length || 0}</span></div></button>; })}</div>}</div></section>;
}
