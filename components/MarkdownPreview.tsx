import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getArticleVideoEmbedUrl, isDirectArticleVideoUrl, type ArticleMedia } from '@/lib/data/articles';

function isSafeUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value, 'https://kinkflow.local');
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function ArticleMediaBlock({ media }: { media: ArticleMedia }) {
  const videoUrl = media.assetId ? `/api/article-videos/${encodeURIComponent(media.assetId)}` : media.url;
  if (media.type === 'image' && !isSafeUrl(media.url)) return null;
  if (media.type === 'image') {
    return (
      <figure className="my-6 overflow-hidden rounded-2xl border border-[#D1C6B4]/50 bg-[#FDFBF7]">
        <img src={media.url} alt={media.alt || '文章圖片'} loading="lazy" referrerPolicy="no-referrer" className="max-h-[680px] w-full object-cover" />
        {media.caption && <figcaption className="border-t border-[#D1C6B4]/40 px-4 py-3 text-sm leading-6 text-[#4A4238]/65">{media.caption}</figcaption>}
      </figure>
    );
  }

  const embedUrl = media.assetId ? null : getArticleVideoEmbedUrl(media.url);
  return (
    <figure className="my-6 overflow-hidden rounded-2xl border border-[#D1C6B4]/50 bg-[#1A1612]">
      {embedUrl ? (
        <div className="aspect-video w-full">
          <iframe
            src={embedUrl}
            title={media.alt || '文章影片'}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="h-full w-full border-0"
          />
        </div>
      ) : media.assetId || isDirectArticleVideoUrl(media.url) ? (
        <video controls playsInline preload="metadata" poster={media.posterUrl} className="max-h-[680px] w-full bg-black">
          <source src={videoUrl} />
          你的瀏覽器不支援影片播放。
        </video>
      ) : (
        <a href={media.url} target="_blank" rel="noreferrer noopener" className="block p-5 text-sm font-bold text-white underline underline-offset-4">
          開啟文章影片
        </a>
      )}
      {media.caption && <figcaption className="border-t border-white/10 px-4 py-3 text-sm leading-6 text-white/75">{media.caption}</figcaption>}
    </figure>
  );
}

export default function MarkdownPreview({ markdown, media = [] }: { markdown: string; media?: ArticleMedia[] }) {
  return (
    <div className="prose prose-stone max-w-none prose-headings:text-[#1A1612] prose-a:text-[#8A6A1F] prose-img:rounded-xl prose-img:border prose-img:border-[#D1C6B4]/50 prose-blockquote:border-[#D9B650] prose-blockquote:bg-[#FFF9E8]/60 prose-blockquote:py-1">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...props }) => {
            const safe = isSafeUrl(href);
            return (
              <a
                {...props}
                href={safe ? href : undefined}
                target={safe ? '_blank' : undefined}
                rel={safe ? 'noreferrer noopener' : undefined}
              >
                {children}
              </a>
            );
          },
          img: ({ src, alt, ...props }) => (
            typeof src === 'string' && isSafeUrl(src) ? <img {...props} src={src} alt={alt || '文章圖片'} loading="lazy" referrerPolicy="no-referrer" /> : null
          ),
        }}
      >
        {markdown || '尚未輸入文章內容。'}
      </ReactMarkdown>
      {media.map((item, index) => <ArticleMediaBlock key={`${item.type}-${item.url}-${index}`} media={item} />)}
    </div>
  );
}
