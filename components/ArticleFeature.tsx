'use client';

import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { GraphNode } from '@/lib/types';

type ArticleFeatureProps = {
  nodesData: GraphNode[];
  initialNodeId?: string | null;
  onBackToNode?: (nodeId: string) => void;
};

type LegacyArticle = {
  id: string;
  nodeId: string;
  title: string;
  excerpt: string;
  content: string;
  label: string;
  color: string;
};

/**
 * 第一階段專題誌：唯讀 UI 骨架。
 * 資料暫時來自 Mind Map node.detail_text，未來只需替換 useLegacyArticles
 * 為 article.repository，不需要重寫列表和閱讀器。
 */
function useLegacyArticles(nodesData: GraphNode[]): LegacyArticle[] {
  return useMemo(() => nodesData
    .filter((node) => node.level > 0 && Boolean(node.detail_text))
    .map((node) => ({
      id: `legacy-${node.id}`,
      nodeId: node.id,
      title: node.label,
      excerpt: node.desc || '本主題的深度心理學與專題筆記。',
      content: node.detail_text || '',
      label: node.label,
      color: node.color || '#D9B650',
    })), [nodesData]);
}

export default function ArticleFeature({ nodesData, initialNodeId = null, onBackToNode }: ArticleFeatureProps) {
  const articles = useLegacyArticles(nodesData);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [nodeFilter, setNodeFilter] = useState<string>(initialNodeId || 'all');

  const filteredArticles = useMemo(() => {
    if (nodeFilter === 'all') return articles;
    return articles.filter((article) => article.nodeId === nodeFilter);
  }, [articles, nodeFilter]);

  const selectedArticle = articles.find((article) => article.id === selectedArticleId) || null;

  const openArticle = (article: LegacyArticle) => setSelectedArticleId(article.id);
  const closeArticle = () => setSelectedArticleId(null);

  if (selectedArticle) {
    return (
      <section className="h-full overflow-y-auto bg-[#FDFBF7] text-[#1A1612]">
        <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-10">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={closeArticle}
              className="rounded-full border border-[#D1C6B4]/70 bg-white px-4 py-2 text-sm font-bold text-[#4A4238] transition hover:bg-[#F5EFE6]"
            >
              ← 返回專題列表
            </button>
            {onBackToNode && (
              <button
                type="button"
                onClick={() => onBackToNode(selectedArticle.nodeId)}
                className="rounded-full border border-[#D9B650]/70 bg-[#FFF9E8] px-4 py-2 text-sm font-bold text-[#6B5310] transition hover:bg-[#F9EFC6]"
              >
                回到 Mind Map 節點
              </button>
            )}
          </div>

          <article className="overflow-hidden rounded-3xl border border-[#D1C6B4]/50 bg-white shadow-sm">
            <header className="border-b border-[#D1C6B4]/40 px-5 py-7 md:px-10 md:py-10">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold text-[#8A6A1F]">
                <span className="rounded-full bg-[#FFF4C8] px-3 py-1">專題誌</span>
                <span className="rounded-full bg-[#F5EFE6] px-3 py-1">{selectedArticle.label}</span>
                <span className="rounded-full bg-[#EEF4EA] px-3 py-1">Legacy 唯讀預覽</span>
              </div>
              <h1 className="text-3xl font-black leading-tight md:text-5xl">{selectedArticle.title}</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#4A4238]/70">{selectedArticle.excerpt}</p>
            </header>

            <div className="prose prose-stone max-w-none px-5 py-7 md:px-10 md:py-10">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedArticle.content}</ReactMarkdown>
            </div>

            <footer className="border-t border-[#D1C6B4]/40 bg-[#FDFBF7]/70 px-5 py-5 text-sm text-[#4A4238]/70 md:px-10">
              這是第一階段唯讀骨架。正式版本會在此處加入作者資訊、收藏、檢舉、相關討論與留言入口。
            </footer>
          </article>
        </div>
      </section>
    );
  }

  return (
    <section className="h-full overflow-y-auto bg-[#FDFBF7] text-[#1A1612]">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
        <header className="mb-8 rounded-3xl border border-[#D1C6B4]/50 bg-gradient-to-br from-white via-[#FFF9F0] to-[#F5EFE6] p-6 shadow-sm md:p-10">
          <div className="max-w-3xl">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-[#A27B21]">KinkFlow / Deep Reading</p>
            <h1 className="text-3xl font-black md:text-5xl">專題誌</h1>
            <p className="mt-4 text-sm leading-7 text-[#4A4238]/75 md:text-base">
              從 Mind Map 的主題入口，進入更完整的心理學、關係、安全與文化脈絡文章。長篇內容和留言討論會分開管理，讓閱讀與交流都更清楚。
            </p>
          </div>
        </header>

        <div className="mb-6 flex gap-2 overflow-x-auto pb-1" aria-label="專題主題篩選">
          <button
            type="button"
            onClick={() => setNodeFilter('all')}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${nodeFilter === 'all' ? 'bg-[#1A1612] text-white' : 'border border-[#D1C6B4]/70 bg-white text-[#4A4238] hover:bg-[#F5EFE6]'}`}
          >
            全部專題
          </button>
          {nodesData.filter((node) => node.level > 0 && node.detail_text).map((node) => (
            <button
              key={node.id}
              type="button"
              onClick={() => setNodeFilter(node.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${nodeFilter === node.id ? 'text-white' : 'border border-[#D1C6B4]/70 bg-white text-[#4A4238] hover:bg-[#F5EFE6]'}`}
              style={nodeFilter === node.id ? { backgroundColor: node.color || '#4A4238' } : undefined}
            >
              {node.label}
            </button>
          ))}
        </div>

        {filteredArticles.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#D1C6B4] bg-white p-10 text-center text-sm text-[#4A4238]/60">
            目前沒有可閱讀的專題。這裡之後會顯示認證作者發表的文章。
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredArticles.map((article) => (
              <button
                key={article.id}
                type="button"
                onClick={() => openArticle(article)}
                className="group rounded-3xl border border-[#D1C6B4]/50 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#D9B650]/70 hover:shadow-md"
              >
                <div className="mb-5 h-2 rounded-full" style={{ backgroundColor: article.color }} />
                <div className="mb-3 flex items-center justify-between gap-3 text-xs font-bold text-[#8A6A1F]">
                  <span>{article.label}</span>
                  <span className="rounded-full bg-[#EEF4EA] px-2.5 py-1 text-[#47633C]">專題文章</span>
                </div>
                <h2 className="text-xl font-black leading-snug group-hover:text-[#8A6A1F]">{article.title}</h2>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#4A4238]/70">{article.excerpt}</p>
                <span className="mt-6 inline-flex text-sm font-black text-[#1A1612]">閱讀完整專題 →</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
