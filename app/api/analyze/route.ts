import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { scores, userName } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ analysis: '伺服器未設定 API 金鑰。' }, { status: 500 });

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });

    const prompt = `請根據以下 BDSM 屬性測驗的分數，為使用者 ${userName || '匿名'} 撰寫一段 100 字左右的分析與建議：\n\n分數：\n${JSON.stringify(scores, null, 2)}\n\n請用專業、鼓勵且帶有一點探索趣味的口吻來寫。`;

    const result = await model.generateContent(prompt);
    return NextResponse.json({ analysis: result.response.text() });
  } catch (error: unknown) {
    console.error('Analyze API Error:', error);
    const err = error as { status?: number; message?: string };
    const status = err?.status;
    if (status === 429 || status === 503 || err?.message?.includes('rate limit') || err?.message?.includes('quota')) {
      return NextResponse.json({ analysis: '不好意思，目前等待分析的人數較多，系統正在稍作休息。請您晚點再回來看看您的專屬報告喔！' });
    }
    return NextResponse.json({ analysis: '分析過程中遇到了一點小阻礙，請稍後再重試一次。' });
  }
}
