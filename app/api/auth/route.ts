import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    if (password === process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ success: true }, { status: 200 });
    }
    return NextResponse.json({ success: false, message: '密碼錯誤' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ success: false, message: '驗證失敗' }, { status: 500 });
  }
}
