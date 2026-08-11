import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ action: 'BLOCK', message: '發言內容不能為空' }, { status: 200 });
    }

    // 防洗版：限制字數或簡單檢查，暫時直接放行，避免消耗 AI API 額度
    if (text.length > 500) {
      return NextResponse.json({ action: 'BLOCK', message: '留言字數不能超過 500 字' }, { status: 200 });
    }

    return NextResponse.json({ action: 'ALLOW', message: '審查通過' }, { status: 200 });

  } catch (error: unknown) {
    console.error('Moderation API Error:', error);
    return NextResponse.json({ action: 'ALLOW', message: '安全降級放行' }, { status: 200 });
  }
}
