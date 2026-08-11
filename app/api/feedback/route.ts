import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST(req: Request) {
  try {
    const { author, content, userId, isGuest } = await req.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: '內容不能為空' }, { status: 400 });
    }

    const authorName = author || '匿名訪客';

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // 1. 嘗試寫入 feedbacks 表格
      const { error: fbErr } = await supabase.from('feedbacks').insert({
        author: authorName,
        content: content.trim(),
        created_at: new Date().toISOString()
      });

      // 2. 如果沒有 feedbacks 表格，Fallback 寫入 discussions 標註 node_id='author_feedback'
      if (fbErr) {
        await supabase.from('discussions').insert({
          node_id: 'author_feedback',
          author: authorName,
          text: `【給作者的話】${content.trim()}`,
          timestamp: Date.now()
        });
      }
    }

    return NextResponse.json({ success: true, message: '留言已成功傳送給作者！' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '傳送失敗' }, { status: 500 });
  }
}
