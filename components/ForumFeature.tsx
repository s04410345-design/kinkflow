'use client';

import { useMemo, useState } from 'react';
import type { DiscussionPost, GraphNode } from '@/lib/types';
import { extractDiscussionContent, formatDiscussionDate, sortDiscussionPosts } from '@/lib/contentModel';

type ForumFeatureProps = {
  nodesData: GraphNode[];
  discussions: Record<string, DiscussionPost[]>;
  isMember?: boolean;
};

type ForumItem = DiscussionPost & {
  nodeId: string;
  nodeLabel: string;
  nodeColor: string;
};

function toForumItems(nodesData: GraphNode[], discussions: Record<string, DiscussionPost[]>): ForumItem[] {
  const nodes = new Map(nodesData.map((node) => [node.id, node]));
  return Object.entries(discussions).flatMap(([nodeId, posts]) => {
    const node = nodes.get(nodeId);
    return (posts || []).map((post) => ({
      ...post,
      ...extractDiscussionContent(post.text, post.title, post.body, post.media),
      nodeId,
      nodeLabel: node?.label || post.nodeName || '未分類主題',
      nodeColor: node?.color || '#D9B650',
    }));
  });
}

function DiscussionMedia({ post }: { post: DiscussionPost }) {
  const content = extractDiscussionContent(post.text, post.title, post.body, post.media);
  if (!content.media?.length) return null;
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2" aria-label="文章圖片">
      {content.media.filter((item) => item.type !== 'video').map((item) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={item.url} src={item.url} alt={item.alt || '討論附件圖片'} loading="lazy" referrerPolicy="no-referrer" className="max-h-80 w-full rounded-2xl border border-[#CBD5E1] bg-[#F8FAFC] object-contain" />
      ))}
    </div>
  );
}

export default function ForumFeature({ nodesData, discussions, isMember = false }: ForumFeatureProps) {
  const [activeNodeId, setActiveNodeId] = useState('all');
  const [sortMode, setSortMode] = useState<'hot' | 'latest'>('hot');
  const [selectedPostId, setSelectedPostId] = useState<string | number | null>(null);
  const items = useMemo(() => toForumItems(nodesData, discussions), [nodesData, discussions]);

  const visibleItems = useMemo(() => {
    const filtered = activeNodeId === 'all' ? items : items.filter((item) => item.nodeId === activeNodeId);
    return sortDiscussionPosts(filtered, sortMode);
  }, [activeNodeId, items, sortMode]);

  const selectedPost = items.find((post) => String(post.id) === String(selectedPostId)) || null;

  if (selectedPost) {
    const content = extractDiscussionContent(selectedPost.text, selectedPost.title, selectedPost.body, selectedPost.media);
    return (
      <section className="h-full overflow-y-auto bg-[#F8FAFC] text-[#172033]">
        <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-10">
          <button type="button" onClick={() => setSelectedPostId(null)} className="mb-6 rounded-full border border-[#CBD5E1] bg-white px-4 py-2 text-sm font-bold text-[#334155] hover:bg-[#F1F5F9]">
            ← 返回討論版
          </button>
          <article className="overflow-hidden rounded-3xl border border-[#CBD5E1] bg-white shadow-sm">
            <header className="border-b border-[#E2E8F0] px-5 py-7 md:px-10">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className="rounded-full px-3 py-1 text-white" style={{ backgroundColor: selectedPost.nodeColor }}>{selectedPost.nodeLabel}</span>
                <span className="rounded-full bg-[#F1F5F9] px-3 py-1 text-[#475569]">會員討論</span>
              </div>
              <h1 className="text-2xl font-black leading-tight md:text-4xl">{content.title}</h1>
              <p className="mt-3 text-sm text-[#64748B]">作者：{selectedPost.author || '匿名會員'}　·　{formatDiscussionDate(selectedPost.timestamp)}</p>
            </header>
            <div className="px-5 py-7 text-base leading-8 text-[#263449] md:px-10 md:py-10">
              <p className="whitespace-pre-wrap">{content.body}</p>
              <DiscussionMedia post={selectedPost} />
            </div>
            <div className="flex flex-wrap gap-2 border-t border-[#E2E8F0] px-5 py-5 text-sm font-bold text-[#475569] md:px-10">
              <span className="rounded-full bg-[#F8FAFC] px-3 py-1">👍 {selectedPost.upvotes || 0}</span>
              <span className="rounded-full bg-[#F8FAFC] px-3 py-1">回覆 {selectedPost.replies?.length || 0}</span>
              <span className="rounded-full bg-[#FEF3C7] px-3 py-1 text-[#92400E]">第一階段預覽</span>
            </div>
            <section className="border-t border-[#E2E8F0] bg-[#F8FAFC] px-5 py-6 md:px-10">
              <h2 className="text-lg font-black">留言討論</h2>
              <p className="mt-2 text-sm leading-6 text-[#64748B]">正式版本會在這裡讀取 `forum_comments`，並依照權限提供會員留言、檢舉和管理員處理。</p>
              {isMember ? (
                <button type="button" className="mt-4 rounded-xl bg-[#172033] px-4 py-2 text-sm font-bold text-white hover:bg-[#334155]">撰寫留言（下一階段）</button>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-[#CBD5E1] bg-white p-4 text-sm text-[#64748B]">登入會員後即可參與討論。</div>
              )}
            </section>
          </article>
        </div>
      </section>
    );
  }

  return (
    <section className="h-full overflow-y-auto bg-[#F8FAFC] text-[#172033]">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
        <header className="mb-7 rounded-3xl bg-[#172033] p-6 text-white shadow-sm md:p-10">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-[#FCD34D]">KinkFlow / Community</p>
          <h1 className="text-3xl font-black md:text-5xl">討論版</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 md:text-base">會員可以針對主題發文、分享經驗和提問。文章可以貼上多個節點 Tag，但所有討論仍在同一個社群裡流動。</p>
        </header>

        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="討論節點篩選">
            <button type="button" onClick={() => setActiveNodeId('all')} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${activeNodeId === 'all' ? 'bg-[#172033] text-white' : 'border border-[#CBD5E1] bg-white text-[#475569]'}`}>全部討論</button>
            {nodesData.filter((node) => node.level > 0).map((node) => (
              <button key={node.id} type="button" onClick={() => setActiveNodeId(node.id)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${activeNodeId === node.id ? 'text-white' : 'border border-[#CBD5E1] bg-white text-[#475569]'}`} style={activeNodeId === node.id ? { backgroundColor: node.color || '#172033' } : undefined}>{node.label}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setSortMode('hot')} className={`rounded-lg px-3 py-2 text-xs font-bold ${sortMode === 'hot' ? 'bg-[#FEF3C7] text-[#92400E]' : 'bg-white text-[#64748B]'}`}>熱門</button>
            <button type="button" onClick={() => setSortMode('latest')} className={`rounded-lg px-3 py-2 text-xs font-bold ${sortMode === 'latest' ? 'bg-[#DBEAFE] text-[#1D4ED8]' : 'bg-white text-[#64748B]'}`}>最新</button>
          </div>
        </div>

        <div className="mb-5 flex items-center justify-between rounded-2xl border border-[#CBD5E1] bg-white px-4 py-3 text-sm">
          <span className="font-bold text-[#334155]">共有 {visibleItems.length} 篇可顯示討論</span>
          {isMember ? <button type="button" className="rounded-xl bg-[#172033] px-4 py-2 text-xs font-bold text-white">發表新主題（下一階段）</button> : <span className="text-[#64748B]">登入後可以發文</span>}
        </div>

        {visibleItems.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#CBD5E1] bg-white p-12 text-center text-sm text-[#64748B]">目前還沒有討論。可以先從心智圖節點開始探索。</div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {visibleItems.map((post) => {
              const content = extractDiscussionContent(post.text, post.title, post.body, post.media);
              return (
                <button key={String(post.id)} type="button" onClick={() => setSelectedPostId(post.id)} className="rounded-2xl border border-[#CBD5E1] bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#94A3B8] hover:shadow-md">
                  <div className="mb-3 flex items-center justify-between gap-3 text-xs font-bold text-[#64748B]"><span className="rounded-full px-3 py-1 text-white" style={{ backgroundColor: post.nodeColor }}>{post.nodeLabel}</span><span>{formatDiscussionDate(post.timestamp)}</span></div>
                  <h2 className="text-lg font-black leading-snug text-[#172033]">{content.title}</h2>
                  <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-sm leading-6 text-[#64748B]">{content.body}</p>
                  {content.media?.length ? <p className="mt-2 text-xs font-bold text-[#475569]">附有 {content.media.length} 個媒體附件</p> : null}
                  <div className="mt-4 flex gap-3 text-xs font-bold text-[#64748B]"><span>作者 {post.author || '匿名會員'}</span><span>👍 {post.upvotes || 0}</span><span>回覆 {post.replies?.length || 0}</span></div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
