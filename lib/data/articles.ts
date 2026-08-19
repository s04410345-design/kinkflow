import { supabase } from '@/lib/supabase';
import type { GraphNode } from '@/lib/types';

export type ArticleMediaType = 'image' | 'video';

export type ArticleMedia = {
  type: ArticleMediaType;
  url: string;
  alt: string;
  caption: string;
  posterUrl?: string;
  assetId?: string;
};

export type ArticleSection = {
  id: string;
  heading: string;
  markdown: string;
  media: ArticleMedia[];
  collapsible: boolean;
  defaultOpen: boolean;
};

export type ArticleDocument = {
  version: 2;
  introMarkdown: string;
  cover: ArticleMedia | null;
  media: ArticleMedia[];
  sections: ArticleSection[];
  tags: string[];
  readMinutes: number;
  featured: boolean;
};

export type ArticleItem = {
  id: string;
  nodeId: string;
  nodeIds: string[];
  title: string;
  excerpt: string;
  content: string;
  document: ArticleDocument;
  label: string;
  color: string;
  tags: string[];
  readMinutes: number;
  featured: boolean;
  commentCount: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  publishedAt?: string | null;
  source: 'live' | 'legacy';
};

type LiveArticle = {
  id: string;
  title: string;
  excerpt: string | null;
  body_json: unknown;
  created_at: string;
  updated_at?: string | null;
  published_at?: string | null;
  article_node_links?: unknown;
  article_comments?: unknown;
};

const SAFE_PROTOCOLS = new Set(['http:', 'https:']);
const VIDEO_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'youtu.be', 'vimeo.com', 'www.vimeo.com']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRIVATE_VIDEO_PATH_RE = /^\/api\/article-videos\/[0-9a-f-]+(?:\?.*)?$/i;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function asUuid(value: unknown): string | null {
  return typeof value === 'string' && UUID_RE.test(value) ? value : null;
}

function isPrivateVideoPath(value: string): boolean {
  return PRIVATE_VIDEO_PATH_RE.test(value);
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function toSafeUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2000) return null;
  if (isPrivateVideoPath(value)) return value;
  try {
    const url = new URL(value);
    return SAFE_PROTOCOLS.has(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export function isSafeArticleUrl(value: string | undefined): boolean {
  return Boolean(toSafeUrl(value));
}

export function getArticleVideoEmbedUrl(value: string): string | null {
  if (isPrivateVideoPath(value)) return null;
  const safeUrl = toSafeUrl(value);
  if (!safeUrl) return null;
  const url = new URL(safeUrl);
  const hostname = url.hostname.toLowerCase();
  if (!VIDEO_HOSTS.has(hostname)) return null;
  if (hostname === 'youtu.be') {
    const videoId = url.pathname.replace(/^\//, '').split('/')[0];
    return videoId ? `https://www.youtube.com/embed/${encodeURIComponent(videoId)}` : null;
  }
  if (hostname.includes('youtube.com')) {
    const videoId = url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).pop();
    return videoId ? `https://www.youtube.com/embed/${encodeURIComponent(videoId)}` : null;
  }
  const videoId = url.pathname.split('/').filter(Boolean).pop();
  return videoId ? `https://player.vimeo.com/video/${encodeURIComponent(videoId)}` : null;
}

export function isDirectArticleVideoUrl(value: string): boolean {
  if (isPrivateVideoPath(value)) return true;
  const safeUrl = toSafeUrl(value);
  if (!safeUrl) return false;
  return /\.(mp4|webm|ogg)(?:$|[?#])/i.test(new URL(safeUrl).pathname);
}

function parseMedia(value: unknown): ArticleMedia[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): ArticleMedia[] => {
    const record = asRecord(item);
    const type = record.type === 'video' ? 'video' : 'image';
    const assetId = type === 'video' ? asUuid(record.assetId) : null;
    const rawUrl = asString(record.url);
    const url = assetId ? `/api/article-videos/${assetId}` : toSafeUrl(rawUrl);
    if (!url) return [];
    return [{
      type,
      url,
      alt: asString(record.alt, type === 'image' ? '專題文章圖片' : '專題文章影片'),
      caption: asString(record.caption),
      ...(toSafeUrl(record.posterUrl) ? { posterUrl: toSafeUrl(record.posterUrl) || undefined } : {}),
      ...(assetId ? { assetId } : {}),
    }];
  });
}

function parseSingleMedia(value: unknown): ArticleMedia | null {
  const media = parseMedia([value]);
  return media[0] || null;
}

function buildSection(value: unknown, index: number): ArticleSection | null {
  const record = asRecord(value);
  const heading = asString(record.heading);
  const markdown = asString(record.markdown || record.content || record.text);
  if (!heading && !markdown && parseMedia(record.media).length === 0) return null;
  return {
    id: asString(record.id, `section-${index + 1}`),
    heading: heading || `第 ${index + 1} 節`,
    markdown,
    media: parseMedia(record.media),
    collapsible: asBoolean(record.collapsible, true),
    defaultOpen: asBoolean(record.defaultOpen, index === 0),
  };
}

export function createEmptyArticleDocument(): ArticleDocument {
  return {
    version: 2,
    introMarkdown: '',
    cover: null,
    media: [],
    sections: [],
    tags: [],
    readMinutes: 5,
    featured: false,
  };
}

export type ArticleContentMode = 'published' | 'draft';

export function parseArticleDocument(value: unknown, mode: ArticleContentMode = 'published'): ArticleDocument {
  const record = asRecord(value);
  const publishedDocument = record.published || record.publishedDocument;
  const draftDocument = record.draft || record.draftDocument;
  const selected = mode === 'draft' ? draftDocument || publishedDocument || value : publishedDocument || value;
  const source = asRecord(selected);
  const legacyMarkdown = asString(source.markdown || source.content || source.text);
  const sections = Array.isArray(source.sections)
    ? source.sections.map((section, index) => buildSection(section, index)).filter((section): section is ArticleSection => Boolean(section))
    : [];
  return {
    version: 2,
    introMarkdown: asString(source.introMarkdown, legacyMarkdown),
    cover: parseSingleMedia(source.cover),
    media: parseMedia(source.media),
    sections,
    tags: Array.isArray(source.tags) ? source.tags.filter((tag): tag is string => typeof tag === 'string').map((tag) => tag.trim()).filter(Boolean).slice(0, 20) : [],
    readMinutes: Math.min(999, Math.max(1, Math.round(asNumber(source.readMinutes, 5)))),
    featured: asBoolean(source.featured),
  };
}

export function bodyToMarkdown(value: unknown): string {
  return parseArticleDocument(value, 'published').introMarkdown;
}

export function buildArticleDraftBody(document: ArticleDocument, existingBody: unknown): Record<string, unknown> {
  const current = asRecord(existingBody);
  const publishedDocument = current.published || current.publishedDocument || current;
  return { version: 2, published: publishedDocument, draft: document };
}

export function buildPublishedArticleBody(document: ArticleDocument, existingBody: unknown): Record<string, unknown> {
  const current = asRecord(existingBody);
  return { version: 2, published: document, draft: document, ...(current.cover ? { cover: current.cover } : {}) };
}

export function formatArticleDate(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('zh-TW');
}

function countRelation(value: unknown): number {
  if (!Array.isArray(value) || !value[0] || typeof value[0] !== 'object') return 0;
  const count = (value[0] as Record<string, unknown>).count;
  return typeof count === 'number' ? count : 0;
}

function nodeIdsFromRelation(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const nodeId = asString(asRecord(item).node_id);
    return nodeId ? [nodeId] : [];
  });
}

function toArticleItem(article: LiveArticle, nodes: Map<string, GraphNode>): ArticleItem {
  const document = parseArticleDocument(article.body_json);
  const nodeIds = nodeIdsFromRelation(article.article_node_links);
  const nodeId = nodeIds[0] || '';
  const node = nodes.get(nodeId);
  return {
    id: article.id,
    nodeId,
    nodeIds,
    title: article.title,
    excerpt: article.excerpt || '認證作者的深度專題文章。',
    content: document.introMarkdown,
    document,
    label: node?.label || '未分類專題',
    color: node?.color || '#8A6A1F',
    tags: document.tags,
    readMinutes: document.readMinutes,
    featured: document.featured,
    commentCount: countRelation(article.article_comments),
    createdAt: article.created_at,
    updatedAt: article.updated_at,
    publishedAt: article.published_at,
    source: 'live',
  };
}

export function buildLegacyArticles(nodesData: GraphNode[]): ArticleItem[] {
  return nodesData
    .filter((node) => node.level > 0 && Boolean(node.detail_text))
    .map((node) => {
      const document: ArticleDocument = {
        ...createEmptyArticleDocument(),
        introMarkdown: node.detail_text || '',
        readMinutes: 3,
      };
      return {
        id: `legacy-${node.id}`,
        nodeId: node.id,
        nodeIds: [node.id],
        title: node.label,
        excerpt: node.desc || '本主題的深度心理學與專題筆記。',
        content: node.detail_text || '',
        document,
        label: node.label,
        color: node.color || '#D9B650',
        tags: [],
        readMinutes: 3,
        featured: false,
        commentCount: 0,
        createdAt: null,
        updatedAt: null,
        publishedAt: null,
        source: 'legacy',
      };
    });
}

export async function fetchPublishedArticles(nodesData: GraphNode[]): Promise<ArticleItem[]> {
  const { data, error } = await supabase
    .from('articles')
    .select('id,title,excerpt,body_json,created_at,updated_at,published_at,article_node_links(node_id),article_comments(count)')
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(100);

  if (error || !data?.length) return [];
  const nodes = new Map(nodesData.map((node) => [node.id, node]));
  return (data as LiveArticle[]).map((article) => toArticleItem(article, nodes));
}

export function articleMatchesSearch(article: ArticleItem, query: string): boolean {
  const normalizedQuery = query.trim().toLocaleLowerCase('zh-TW');
  if (!normalizedQuery) return true;
  const searchable = [
    article.title,
    article.excerpt,
    article.label,
    ...article.tags,
    article.document.introMarkdown,
    ...article.document.sections.map((section) => `${section.heading} ${section.markdown}`),
  ].join(' ').toLocaleLowerCase('zh-TW');
  return searchable.includes(normalizedQuery);
}

export function sortArticles(articles: ArticleItem[], mode: 'hot' | 'latest'): ArticleItem[] {
  return [...articles].sort((left, right) => {
    if (mode === 'latest') {
      const leftTime = new Date(left.publishedAt || left.createdAt || 0).getTime();
      const rightTime = new Date(right.publishedAt || right.createdAt || 0).getTime();
      return rightTime - leftTime;
    }
    const leftTime = new Date(left.publishedAt || left.createdAt || 0).getTime();
    const rightTime = new Date(right.publishedAt || right.createdAt || 0).getTime();
    const leftFreshness = Number.isFinite(leftTime) ? Math.max(0, 30 - (Date.now() - leftTime) / 86400000) : 0;
    const rightFreshness = Number.isFinite(rightTime) ? Math.max(0, 30 - (Date.now() - rightTime) / 86400000) : 0;
    const leftScore = (left.featured ? 1000 : 0) + left.commentCount * 12 + leftFreshness;
    const rightScore = (right.featured ? 1000 : 0) + right.commentCount * 12 + rightFreshness;
    return rightScore - leftScore;
  });
}
