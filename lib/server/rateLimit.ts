type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  limit: number;
  windowMs: number;
  namespace: string;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

type GlobalRateLimitStore = typeof globalThis & {
  __kinkflowRateLimitStore?: Map<string, RateLimitEntry>;
};

const globalStore = globalThis as GlobalRateLimitStore;
const store = globalStore.__kinkflowRateLimitStore ?? new Map<string, RateLimitEntry>();

globalStore.__kinkflowRateLimitStore = store;

function getClientKey(request: Request, namespace: string): string {
  const vercelForwardedFor = request.headers.get('x-vercel-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const address = vercelForwardedFor || realIp || forwardedFor || 'unknown-client';

  return `${namespace}:${address}`;
}

export function checkRateLimit(request: Request, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const key = getClientKey(request, options.namespace);
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= options.limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    };
  }

  current.count += 1;
  store.set(key, current);
  return { allowed: true, retryAfterSeconds: 0 };
}

export function rateLimitResponse(retryAfterSeconds: number, message = '請稍後再試。'): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Retry-After': String(retryAfterSeconds),
      'Cache-Control': 'no-store'
    }
  });
}

export function hasOversizedContent(request: Request, maxBytes: number): boolean {
  const contentLength = Number(request.headers.get('content-length') || 0);
  return Number.isFinite(contentLength) && contentLength > maxBytes;
}

export function clampText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
