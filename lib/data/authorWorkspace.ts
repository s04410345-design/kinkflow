import { supabase } from '@/lib/supabase';

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
  body_json: { markdown?: string; [key: string]: unknown };
  status: 'draft' | 'published' | 'archived' | string;
  created_at: string;
  updated_at: string;
  published_at?: string | null;
};

function errorMessage(error: { message?: string } | null, fallback: string): string {
  if (!error) return fallback;
  if (/permission|row-level security|not authenticated|JWT/i.test(error.message || '')) return '目前帳號尚未取得認證作者權限。';
  return fallback;
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
  const { data } = await supabase.from('articles').select('id,title,excerpt,body_json,status,created_at,updated_at,published_at').eq('author_id', userId).order('updated_at', { ascending: false }).limit(50);
  return (data || []) as EditableArticle[];
}

export async function createArticleDraft(title: string, excerpt: string, markdown: string, nodeIds: string[] = []): Promise<{ ok: boolean; articleId?: string; message?: string }> {
  const userId = await getUserId();
  if (!userId) return { ok: false, message: '請先登入會員。' };
  const { data, error } = await supabase.from('articles').insert({ author_id: userId, title: title.trim(), slug: `draft-${crypto.randomUUID()}`, excerpt: excerpt.trim(), body_json: { markdown: markdown.trim() }, status: 'draft' }).select('id').single();
  if (error || !data?.id) return { ok: false, message: errorMessage(error, '建立文章失敗，請稍後再試。') };
  if (nodeIds.length) {
    const links = await supabase.from('article_node_links').insert([...new Set(nodeIds)].slice(0, 3).map((nodeId) => ({ article_id: data.id, node_id: nodeId, relation_type: 'primary' })));
    if (links.error) return { ok: false, message: errorMessage(links.error, '文章建立了，但節點關聯失敗，請稍後從編輯器補上。'), articleId: data.id };
  }
  return { ok: true, articleId: data.id };
}

export async function updateArticleDraft(articleId: string, title: string, excerpt: string, markdown: string): Promise<{ ok: boolean; message?: string }> {
  const userId = await getUserId();
  if (!userId) return { ok: false, message: '請先登入會員。' };
  const { error } = await supabase.from('articles').update({ title: title.trim(), excerpt: excerpt.trim(), body_json: { markdown: markdown.trim() }, updated_at: new Date().toISOString() }).eq('id', articleId).eq('author_id', userId).in('status', ['draft', 'published']);
  return error ? { ok: false, message: errorMessage(error, '儲存文章失敗，請稍後再試。') } : { ok: true };
}

export async function publishArticle(articleId: string): Promise<{ ok: boolean; message?: string }> {
  const userId = await getUserId();
  if (!userId) return { ok: false, message: '請先登入會員。' };
  const { error } = await supabase.from('articles').update({ status: 'published', published_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', articleId).eq('author_id', userId).eq('status', 'draft');
  return error ? { ok: false, message: errorMessage(error, '發布文章失敗，請稍後再試。') } : { ok: true };
}
