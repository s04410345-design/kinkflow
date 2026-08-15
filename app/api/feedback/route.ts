import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import {
  checkRateLimit,
  clampText,
  hasOversizedContent,
  isRecord,
  rateLimitResponse
} from '@/lib/server/rateLimit';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const MAX_BODY_BYTES = 12_000;
const MAX_AUTHOR_LENGTH = 80;
const MAX_CONTENT_LENGTH = 2_000;

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, {
    namespace: 'feedback',
    limit: 5,
    windowMs: 10 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterSeconds, '回饋送出太頻繁，請稍後再試。');
  }

  if (hasOversizedContent(request, MAX_BODY_BYTES)) {
    return NextResponse.json({ error: '回饋內容過大。' }, { status: 413 });
  }

  try {
    const body: unknown = await request.json();
    if (!isRecord(body)) {
      return NextResponse.json({ error: '回饋格式不正確。' }, { status: 400 });
    }

    const author = clampText(body.author, MAX_AUTHOR_LENGTH) || '匿名訪客';
    const content = clampText(body.content, MAX_CONTENT_LENGTH).replace(/\u0000/g, '');

    if (!content) {
      return NextResponse.json({ error: '內容不能為空。' }, { status: 400 });
    }

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: '回饋服務目前未設定完成。' }, { status: 503 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { error } = await supabase.from('feedbacks').insert({
      author,
      content,
      created_at: new Date().toISOString()
    });

    if (error) {
      console.error('Feedback insert error:', error);
      return NextResponse.json({ error: '回饋暫時無法送出，請稍後再試。' }, { status: 503 });
    }

    return NextResponse.json({ success: true, message: '留言已成功傳送給作者！' });
  } catch (error: unknown) {
    console.error('Feedback API error:', error);
    return NextResponse.json({ error: '回饋格式不正確。' }, { status: 400 });
  }
}
