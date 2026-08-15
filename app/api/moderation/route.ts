import { NextResponse } from 'next/server';

import {
  checkRateLimit,
  clampText,
  hasOversizedContent,
  isRecord,
  rateLimitResponse
} from '@/lib/server/rateLimit';

const MAX_BODY_BYTES = 8_000;
const MAX_TEXT_LENGTH = 500;

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, {
    namespace: 'moderation',
    limit: 30,
    windowMs: 10 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterSeconds, '送出過於頻繁，請稍後再試。');
  }

  if (hasOversizedContent(request, MAX_BODY_BYTES)) {
    return NextResponse.json({ action: 'BLOCK', message: '留言內容過大。' }, { status: 413 });
  }

  try {
    const body: unknown = await request.json();
    if (!isRecord(body)) {
      return NextResponse.json({ action: 'BLOCK', message: '留言格式不正確。' }, { status: 400 });
    }

    const rawText = typeof body.text === 'string' ? body.text : '';
    if (rawText.trim().length > MAX_TEXT_LENGTH) {
      return NextResponse.json({ action: 'BLOCK', message: `留言字數不能超過 ${MAX_TEXT_LENGTH} 字。` });
    }

    const text = clampText(rawText, MAX_TEXT_LENGTH).replace(/\u0000/g, '');
    if (!text) {
      return NextResponse.json({ action: 'BLOCK', message: '發言內容不能為空。' });
    }

    return NextResponse.json({ action: 'ALLOW', message: '審查通過' });
  } catch (error: unknown) {
    console.error('Moderation API error:', error);
    return NextResponse.json({ action: 'BLOCK', message: '留言格式不正確，請重新輸入。' }, { status: 400 });
  }
}
