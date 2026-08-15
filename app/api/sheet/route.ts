import { NextResponse } from 'next/server';

import { checkRateLimit, hasOversizedContent, rateLimitResponse } from '@/lib/server/rateLimit';

const MAX_RESPONSE_BYTES = 1_500_000;
const FETCH_TIMEOUT_MS = 8_000;
const ALLOWED_HOSTS = new Set(['docs.google.com', 'sheets.googleapis.com']);

function getAllowedSheetUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    const isAllowedHost = ALLOWED_HOSTS.has(url.hostname.toLowerCase());
    const isSpreadsheetPath = url.hostname.toLowerCase() === 'docs.google.com'
      ? url.pathname.startsWith('/spreadsheets/')
      : url.pathname.startsWith('/v4/spreadsheets/');

    if (url.protocol !== 'https:' || !isAllowedHost || !isSpreadsheetPath) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

async function fetchSheetCsv(initialUrl: URL): Promise<Response> {
  let currentUrl = initialUrl;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(currentUrl, {
      headers: { Accept: 'text/csv,text/plain;q=0.9' },
      redirect: 'manual',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    });

    if (response.status < 300 || response.status >= 400) {
      return response;
    }

    const location = response.headers.get('location');
    const nextUrl = location ? getAllowedSheetUrl(new URL(location, currentUrl).toString()) : null;
    if (!nextUrl) {
      throw new Error('不允許的 Google Sheets 重新導向');
    }
    currentUrl = nextUrl;
  }

  throw new Error('Google Sheets 重新導向次數過多');
}

export async function GET(request: Request) {
  const rateLimit = checkRateLimit(request, {
    namespace: 'sheet-proxy',
    limit: 30,
    windowMs: 10 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterSeconds, '資料載入過於頻繁，請稍後再試。');
  }

  if (hasOversizedContent(request, 2_000)) {
    return NextResponse.json({ error: '請求大小不正確。' }, { status: 413 });
  }

  const targetUrl = new URL(request.url).searchParams.get('url');
  const allowedUrl = targetUrl ? getAllowedSheetUrl(targetUrl) : null;

  if (!allowedUrl) {
    return NextResponse.json({ error: '只允許讀取受支援的 Google Sheets 匯出網址。' }, { status: 400 });
  }

  try {
    const response = await fetchSheetCsv(allowedUrl);
    if (!response.ok) {
      return NextResponse.json({ error: 'Google Sheets 暫時無法讀取。' }, { status: 502 });
    }

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
      return NextResponse.json({ error: '試算表內容過大。' }, { status: 413 });
    }

    const body = await response.arrayBuffer();
    if (body.byteLength > MAX_RESPONSE_BYTES) {
      return NextResponse.json({ error: '試算表內容過大。' }, { status: 413 });
    }

    const csvData = new TextDecoder().decode(body);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('csv') && !contentType.includes('text/plain')) {
      return NextResponse.json({ error: 'Google Sheets 回傳格式不受支援。' }, { status: 502 });
    }

    return new NextResponse(csvData, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Cache-Control': 's-maxage=60, stale-while-revalidate=120'
      }
    });
  } catch (error: unknown) {
    console.error('Sheet API error:', error);
    return NextResponse.json({ error: '試算表暫時無法載入，請稍後再試。' }, { status: 502 });
  }
}
