import { supabase } from '@/lib/supabase';
import {
  buildArticleDraftBody,
  buildPublishedArticleBody,
  createEmptyArticleDocument,
  parseArticleDocument,
  type ArticleDocument,
} from '@/lib/data/articles';
import { bindArticleVideoAssets } from '@/lib/data/articleVideoBindings';

export type AuthorVerificationStatus = 'pending' | 'approved' | 'rejected' | 'none';

export type AuthorVerification = {
  user_id: string;
  status: AuthorVerificationStatus;
  application_text: string;
  review_note?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type EditableArticle = {
  id: string;
  title: string;
  excerpt: string;
  body_json: Record<string, unknown>;
  status: 'draft' | 'published' | 'archived' | string;
  created_at: string;
  updated_at: string;
  published_at?: string | null;
  nodeIds?: string[];
};

function errorMessage(error: { message?: string } | null, fallback: string): string {
  if (!error) return fallback;
  if (/permission|row-level security|not authenticated|JWT/i.test(error.message || '')) return '目前帳號尚未取得認證作者權限。';
  return fallback;
}

function toDocument(value: ArticleDocument | string): ArticleDocument {
  if (typeof value === 'string') return { ...createEmptyArticleDocument(), introMarkdown: value.trim() };
  return value;
}

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id || null;
}

export async function fetchMyAuthorVerification(): Promise<AuthorVerification | null> {
  const userId = await getUserId();
  if (!userId) return null;
  const { data } = await supabase.from('author_verifications').select('user_id,status,application_text,review_note,created_at,updated_at').eq('user_id', userId).maybeSingle();
  return data ? data as AuthorVerification : null;
}

export async function submitAuthorVerification(applicationText: string): Promise<{ ok: boolean; message?: string }> {
  const userId = await getUserId();
  if (!userId) return { ok: false, message: '請先登入會員。' };
  const text = applicationText.trim();
  if (text.length < 30) return { ok: false, message: '申請說明至少需要 30 個字，讓管理員了解你的發文計畫。' };
  if (text.length > 5000) return { ok: false, message: '申請說明最多 5,000 個字。' };
  const { error } = await supabase.from('author_verifications').upsert({ user_id: userId, status: 'pending', application_text: text, review_note: null, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  return error ? { ok: false, message: errorMessage(error, '申請送出失敗，請稍後再試。') } : { ok: true };
}

export async function fetchMyArticles(): Promise<EditableArticle[]> {
  const userId = await getUserId();
  if (!userId) return [];
  const { data, error } = await supabase.from('articles').select('id,title,excerpt,body_json,status,created_at,updated_at,published_at').eq('author_id', userId).order('updated_at', { ascending: false }).limit(50);
  if (error) return [];
  const articles = (data || []) as EditableArticle[];
  if (!articles.length) return articles;
  const { data: links } = await supabase.from('article_node_links').select('article_id,node_id').in('article_id', articles.map((article) => article.id)).limit(150);
  const nodesByArticle = new Map<string, string[]>();
  (links || []).forEach((link) => {
    const current = nodesByArticle.get(String(link.article_id)) || [];
    current.push(String(link.node_id));
    nodesByArticle.set(String(link.article_id), current);
  });
  return articles.map((article) => ({ ...article, nodeIds: nodesByArticle.get(article.id) || [] }));
}

export async function createArticleDraft(title: string, excerpt: string, documentOrMarkdown: ArticleDocument | string, nodeIds: string[] = [], coverMediaId?: string | null): Promise<{ ok: boolean; articleId?: string; message?: string }> {
  const userId = await getUserId();
  if (!userId) return { ok: false, message: '請先登入會員。' };
  const document = toDocument(documentOrMarkdown);
  const { data, error } = await supabase.from('articles').insert({ author_id: userId, title: title.trim(), slug: `draft-${crypto.randomUUID()}`, excerpt: excerpt.trim(), body_json: buildArticleDraftBody(document, { published: createEmptyArticleDocument() }), cover_media_id: coverMediaId || null, status: 'draft' }).select('id').single();
  if (error || !data?.id) return { ok: false, message: errorMessage(error, '建立文章失敗，請稍後再試。') };
  const uniqueNodeIds = [...new Set(nodeIds)].filter(Boolean).slice(0, 3);
  if (uniqueNodeIds.length) {
    const links = await supabase.from('article_node_links').insert(uniqueNodeIds.map((nodeId) => ({ article_id: data.id, node_id: nodeId, relation_type: 'primary' })));
    if (links.error) return { ok: false, message: errorMessage(links.error, '文章建立了，但節點關聯失敗，請稍後從編輯器補上。'), articleId: data.id };
  }
  const binding = await bindArticleVideoAssets(data.id, document);
  if (!binding.ok) return { ok: false, articleId: data.id, message: binding.message };
  return { ok: true, articleId: data.id };
}

export async function updateArticleDraft(articleId: string, title: string, excerpt: string, documentOrMarkdown: ArticleDocument | string, nodeIds: string[] = [], coverMediaId?: string | null): Promise<{ ok: boolean; articleId?: string; message?: string }> {
  const userId = await getUserId();
  if (!userId) return { ok: false, message: '請先登入會員。' };
  const { data: current, error: currentError } = await supabase.from('articles').select('body_json').eq('id', articleId).eq('author_id', userId).maybeSingle();
  if (currentError || !current) return { ok: false, message: errorMessage(currentError, '找不到要儲存的文章。') };
  const document = toDocument(documentOrMarkdown);
  const { error } = await supabase.from('articles').update({ title: title.trim(), excerpt: excerpt.trim(), body_json: buildArticleDraftBody(document, current.body_json), cover_media_id: coverMediaId || null, updated_at: new Date().toISOString() }).eq('id', articleId).eq('author_id', userId).in('status', ['draft', 'published']);
  if (error) return { ok: false, message: errorMessage(error, '儲存文章失敗，請稍後再試。') };

  const uniqueNodeIds = [...new Set(nodeIds)].filter(Boolean).slice(0, 3);
  const { error: deleteLinksError } = await supabase.from('article_node_links').delete().eq('article_id', articleId);
  if (deleteLinksError) return { ok: false, message: errorMessage(deleteLinksError, '文章已儲存，但節點關聯更新失敗。') };
  if (uniqueNodeIds.length) {
    const { error: insertLinksError } = await supabase.from('article_node_links').insert(uniqueNodeIds.map((nodeId) => ({ article_id: articleId, node_id: nodeId, relation_type: 'primary' })));
    if (insertLinksError) return { ok: false, message: errorMessage(insertLinksError, '文章已儲存，但節點關聯更新失敗。') };
  }
  const binding = await bindArticleVideoAssets(articleId, document);
  if (!binding.ok) return { ok: false, message: binding.message };
  return { ok: true, articleId };
}

export async function publishArticle(articleId: string): Promise<{ ok: boolean; message?: string }> {
  const userId = await getUserId();
  if (!userId) return { ok: false, message: '請先登入會員。' };
  const { data: current, error: currentError } = await supabase.from('articles').select('body_json').eq('id', articleId).eq('author_id', userId).maybeSingle();
  if (currentError || !current) return { ok: false, message: errorMessage(currentError, '找不到要發布的文章。') };
  const document = parseArticleDocument(current.body_json, 'draft');
  const { error } = await supabase.from('articles').update({ body_json: buildPublishedArticleBody(document, current.body_json), status: 'published', published_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', articleId).eq('author_id', userId).eq('status', 'draft');
  return error ? { ok: false, message: errorMessage(error, '發布文章失敗，請稍後再試。') } : { ok: true };
}
