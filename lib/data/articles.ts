import type { GraphNode } from '@/lib/types';
import { supabase } from '@/lib/supabase';

export type ArticleItem = {
  id: string;
  nodeId: string;
  title: string;
  excerpt: string;
  content: string;
  label: string;
  color: string;
  createdAt?: string | null;
  source: 'live' | 'legacy';
};

type LiveArticle = {
  id: string;
  title: string;
  excerpt: string | null;
  body_json: unknown;
  created_at: string;
  article_node_links?: { node_id: string }[];
};

export function bodyToMarkdown(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  const record = value as Record<string, unknown>;
  for (const key of ['markdown', 'content', 'text', 'body']) {
    if (typeof record[key] === 'string') return record[key];
  }
  return '';
}

export function formatArticleDate(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('zh-TW');
}

export function buildLegacyArticles(nodesData: GraphNode[]): ArticleItem[] {
  return nodesData
    .filter((node) => node.level > 0 && Boolean(node.detail_text))
    .map((node) => ({
      id: `legacy-${node.id}`,
      nodeId: node.id,
      title: node.label,
      excerpt: node.desc || '本主題的深度心理學與專題筆記。',
      content: node.detail_text || '',
      label: node.label,
      color: node.color || '#D9B650',
      source: 'legacy',
    }));
}

export async function fetchPublishedArticles(nodesData: GraphNode[]): Promise<ArticleItem[]> {
  const { data, error } = await supabase
    .from('articles')
    .select('id,title,excerpt,body_json,created_at,article_node_links(node_id)')
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(100);

  if (error || !data?.length) return [];
  const nodes = new Map(nodesData.map((node) => [node.id, node]));

  return (data as LiveArticle[]).map((article) => {
    const nodeId = article.article_node_links?.[0]?.node_id || '';
    const node = nodes.get(nodeId);
    return {
      id: article.id,
      nodeId,
      title: article.title,
      excerpt: article.excerpt || '認證作者的深度專題文章。',
      content: bodyToMarkdown(article.body_json),
      label: node?.label || '未分類專題',
      color: node?.color || '#8A6A1F',
      createdAt: article.created_at,
      source: 'live',
    };
  });
}
