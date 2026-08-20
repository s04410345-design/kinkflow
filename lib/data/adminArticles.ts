import { supabase } from '@/lib/supabase';
import type { GraphNode } from '@/lib/types';
import {
  buildArticleDraftBody,
  buildPublishedArticleBody,
  createEmptyArticleDocument,
  parseArticleDocument,
  type ArticleDocument,
} from '@/lib/data/articles';
import { filterValidTopicNodeIds } from '@/lib/mindmap';

export type AdminArticleStatus = 'draft' | 'published' | 'hidden' | 'deleted';

export type AdminArticle = {
  id: string;
  authorId: string;
  title: string;
  slug: string;
  excerpt: string;
  bodyJson: Record<string, unknown>;
  coverMediaId: string | null;
  status: AdminArticleStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  nodeIds: string[];
};

export type SaveAdminArticleInput = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  document: ArticleDocument;
  nodeIds: string[];
  nodesData: GraphNode[];
  coverMediaId?: string | null;
};

type ArticleRow = {
  id: string;
  author_id: string;
  title: string;
  slug: string;
  excerpt: string;
  body_json: unknown;
  cover_media_id: string | null;
  status: AdminArticleStatus;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function errorMessage(error: { message?: string } | null, fallback: string): string {
  if (!error) return fallback;
  if (/permission|row-level security|not authenticated|JWT/i.test(error.message || '')) return '目前帳號沒有管理員專題誌權限。';
  return fallback;
}

function normalizeSlug(value: string): string {
  const normalized = value.trim().toLocaleLowerCase('en-US').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 220);
  return normalized || `article-${crypto.randomUUID()}`;
}

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id || null;
}

async function fetchNodeIds(articleIds: string[]): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  if (!articleIds.length) return result;
  const { data } = await supabase.from('article_node_links').select('article_id,node_id').in('article_id', articleIds).limit(Math.min(articleIds.length * 3, 300));
  (data || []).forEach((row) => {
    const articleId = typeof row.article_id === 'string' ? row.article_id : '';
    const nodeId = typeof row.node_id === 'string' ? row.node_id : '';
    if (!articleId || !nodeId) return;
    const current = result.get(articleId) || [];
    current.push(nodeId);
    result.set(articleId, current);
  });
  return result;
}

function mapArticle(row: ArticleRow, nodeIds: Map<string, string[]>): AdminArticle {
  return {
    id: row.id,
    authorId: row.author_id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt || '',
    bodyJson: asRecord(row.body_json),
    coverMediaId: row.cover_media_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    nodeIds: nodeIds.get(row.id) || [],
  };
}

export async function fetchAdminArticles(): Promise<AdminArticle[]> {
  const userId = await getUserId();
  if (!userId) return [];
  const { data, error } = await supabase
    .from('articles')
    .select('id,author_id,title,slug,excerpt,body_json,cover_media_id,status,created_at,updated_at,published_at')
    .in('status', ['draft', 'published', 'hidden'])
    .order('updated_at', { ascending: false })
    .limit(200);
  if (error) throw new Error(errorMessage(error, '專題文章載入失敗。'));
  const rows = (data || []) as ArticleRow[];
  const nodeIds = await fetchNodeIds(rows.map((row) => row.id));
  return rows.map((row) => mapArticle(row, nodeIds));
}

export async function saveAdminArticleDraft(input: SaveAdminArticleInput): Promise<{ ok: boolean; articleId?: string; message?: string }> {
  const userId = await getUserId();
  if (!userId) return { ok: false, message: '管理員登入狀態已失效，請重新登入。' };
  const title = input.title.trim();
  const excerpt = input.excerpt.trim();
  if (!title) return { ok: false, message: '請填寫專題標題。' };
  if (!input.document.introMarkdown.trim() && input.document.sections.length === 0) return { ok: false, message: '請至少填寫導言或一個內容章節。' };
  const requestedNodeIds = [...new Set(input.nodeIds)].filter(Boolean);
  if (requestedNodeIds.length > 3) return { ok: false, message: '最多只能選擇 3 個主題標籤。' };
  const uniqueNodeIds = filterValidTopicNodeIds(input.nodesData, requestedNodeIds);
  if (requestedNodeIds.length > 0 && uniqueNodeIds.length !== requestedNodeIds.length) return { ok: false, message: '專題標籤只能選擇第 2 或第 3 階節點，請重新選擇。' };
  const slug = normalizeSlug(input.slug || title);
  let articleId = input.id;
  let existingBody: unknown = { published: createEmptyArticleDocument() };

  if (articleId) {
    const { data: current, error: currentError } = await supabase.from('articles').select('body_json').eq('id', articleId).maybeSingle();
    if (currentError || !current) return { ok: false, message: errorMessage(currentError, '找不到要編輯的專題文章。') };
    existingBody = current.body_json;
    const { error } = await supabase.from('articles').update({
      title,
      slug,
      excerpt,
      body_json: buildArticleDraftBody(input.document, existingBody),
      cover_media_id: input.coverMediaId || null,
      updated_at: new Date().toISOString(),
    }).eq('id', articleId);
    if (error) return { ok: false, message: errorMessage(error, '專題草稿儲存失敗。') };
  } else {
    const { data, error } = await supabase.from('articles').insert({
      author_id: userId,
      title,
      slug: `${slug}-${crypto.randomUUID().slice(0, 8)}`,
      excerpt,
      body_json: buildArticleDraftBody(input.document, existingBody),
      cover_media_id: input.coverMediaId || null,
      status: 'draft',
    }).select('id').single();
    if (error || !data?.id) return { ok: false, message: errorMessage(error, '專題草稿建立失敗。') };
    articleId = data.id;
  }

  const { error: deleteLinksError } = await supabase.from('article_node_links').delete().eq('article_id', articleId);
  if (deleteLinksError) return { ok: false, articleId, message: errorMessage(deleteLinksError, '文章已保存，但節點關聯更新失敗。') };
  if (uniqueNodeIds.length) {
    const { error: insertLinksError } = await supabase.from('article_node_links').insert(uniqueNodeIds.map((nodeId) => ({ article_id: articleId, node_id: nodeId, relation_type: 'primary' })));
    if (insertLinksError) return { ok: false, articleId, message: errorMessage(insertLinksError, '文章已保存，但節點關聯更新失敗。') };
  }
  return { ok: true, articleId };
}

export async function publishAdminArticle(articleId: string): Promise<{ ok: boolean; message?: string }> {
  const userId = await getUserId();
  if (!userId) return { ok: false, message: '管理員登入狀態已失效，請重新登入。' };
  const { data: current, error: currentError } = await supabase.from('articles').select('body_json').eq('id', articleId).maybeSingle();
  if (currentError || !current) return { ok: false, message: errorMessage(currentError, '找不到要發布的專題文章。') };
  const body = asRecord(current.body_json);
  const document = parseArticleDocument(body, 'draft');
  if (!document.introMarkdown.trim() && document.sections.length === 0) return { ok: false, message: '文章沒有可發布的正文內容。' };
  const { error } = await supabase.from('articles').update({
    body_json: buildPublishedArticleBody(document, body),
    status: 'published',
    published_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', articleId);
  return error ? { ok: false, message: errorMessage(error, '專題發布失敗。') } : { ok: true };
}

export async function setAdminArticleStatus(articleId: string, status: 'hidden' | 'draft'): Promise<{ ok: boolean; message?: string }> {
  const userId = await getUserId();
  if (!userId) return { ok: false, message: '管理員登入狀態已失效，請重新登入。' };
  const { error } = await supabase.from('articles').update({ status, updated_at: new Date().toISOString() }).eq('id', articleId);
  return error ? { ok: false, message: errorMessage(error, '文章狀態更新失敗。') } : { ok: true };
}
