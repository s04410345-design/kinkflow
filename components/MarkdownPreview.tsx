import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function isSafeUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value, 'https://kinkflow.local');
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function MarkdownPreview({ markdown }: { markdown: string }) {
  return (
    <div className="prose prose-stone max-w-none prose-headings:text-[#1A1612] prose-a:text-[#8A6A1F] prose-img:rounded-xl prose-img:border prose-img:border-[#D1C6B4]/50">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...props }) => (
            <a
              {...props}
              href={isSafeUrl(href) ? href : undefined}
              target={isSafeUrl(href) ? '_blank' : undefined}
              rel={isSafeUrl(href) ? 'noreferrer noopener' : undefined}
            >
              {children}
            </a>
          ),
          img: ({ src, alt, ...props }) => (
            typeof src === 'string' && isSafeUrl(src) ? <img {...props} src={src} alt={alt || '文章圖片'} loading="lazy" referrerPolicy="no-referrer" /> : null
          ),
        }}
      >
        {markdown || '尚未輸入文章內容。'}
      </ReactMarkdown>
    </div>
  );
}
