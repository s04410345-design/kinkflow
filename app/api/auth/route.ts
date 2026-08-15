import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { success: false, message: '此舊登入入口已停用，請使用後台專用登入頁。' },
    { status: 410, headers: { 'Cache-Control': 'no-store' } }
  );
}
