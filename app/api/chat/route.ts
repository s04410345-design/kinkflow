import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { messages, userName, nodeContext = '', persona = '溫柔前輩' } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ reply: '伺服器未設定 API 金鑰。' }, { status: 500 });

    const genAI = new GoogleGenerativeAI(apiKey);
    
    const systemInstruction = `你是一位在 BDSM 探索大廳擔任輔導員的 AI 導師。使用者名稱是 ${userName || '訪客'}。
你的說話風格必須扮演：「${persona}」。請根據這個個性去調整你的語氣、用語，但必須保持安全意識。
${nodeContext}
如果涉及危險行為，必須強調「安全、知情、同意 (SSC)」原則與安全詞的重要性。回答盡量簡短。`;

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-3.1-flash-lite',
      systemInstruction
    });

    const rawHistory = messages.slice(0, -1).map((m: {role: string, text: string}) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text }],
    }));
    // Gemini API requires history to start with 'user' role
    const firstUserIdx = rawHistory.findIndex((m: {role: string}) => m.role === 'user');
    const history = firstUserIdx >= 0 ? rawHistory.slice(firstUserIdx) : [];
    const latestMessage = messages[messages.length - 1].text;

    const chat = model.startChat({
      history
    });

    const result = await chat.sendMessage(latestMessage);
    return NextResponse.json({ reply: result.response.text() });
  } catch (error: unknown) {
    console.error('Chat API Error:', error);
    const err = error as { status?: number; message?: string };
    if (err.status === 429 || err.status === 503 || err.message?.includes('rate limit') || err.message?.includes('quota')) {
      return NextResponse.json({ reply: '不好意思，目前大廳的訪客比較多，導師正在稍微休息一下。請您晚點再來找我聊聊好嗎？' });
    }
    return NextResponse.json({ reply: `[DEBUG] ${err.message || JSON.stringify(error)}` });
  }
}
