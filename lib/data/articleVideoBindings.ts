import { getAuthHeaders } from '@/lib/authHeaders';
import type { ArticleDocument } from '@/lib/data/articles';

function collectAssetIds(document: ArticleDocument): string[] {
  const media = [
    ...(document.cover ? [document.cover] : []),
    ...document.media,
    ...document.sections.flatMap((section) => section.media),
  ];
  return [...new Set(media.filter((item) => item.type === 'video' && item.assetId).map((item) => item.assetId as string))];
}

export async function bindArticleVideoAssets(articleId: string, document: ArticleDocument): Promise<{ ok: boolean; message?: string }> {
  const response = await fetch('/api/article-videos/bind', {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ articleId, assetIds: collectAssetIds(document) }),
  });
  const payload = await response.json().catch(() => ({})) as { error?: string };
  return response.ok ? { ok: true } : { ok: false, message: payload.error || '影片關聯儲存失敗。' };
}
