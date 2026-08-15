import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

import {
  checkRateLimit,
  clampText,
  hasOversizedContent,
  isRecord,
  rateLimitResponse
} from '@/lib/server/rateLimit';

const MAX_BODY_BYTES = 24_000;
const MAX_MESSAGES = 8;
const MAX_MESSAGE_LENGTH = 1_200;
const MAX_USER_NAME_LENGTH = 80;
const MAX_NODE_CONTEXT_LENGTH = 300;
const MAX_PERSONA_LENGTH = 60;
const ALLOWED_PERSONAS = new Set(['溫柔前輩', '傲嬌貓貓', '忠心狗狗', '理性無口', '毒舌屬性', '溫柔主理人']);

type ChatMessage = {
  role: 'user' | 'model';
  text: string;
};

function parseMessages(value: unknown): ChatMessage[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_MESSAGES) {
    return null;
  }

  const messages: ChatMessage[] = [];
  for (const item of value) {
    if (!isRecord(item) || (item.role !== 'user' && item.role !== 'model')) {
      return null;
    }

    const text = clampText(item.text, MAX_MESSAGE_LENGTH).replace(/\u0000/g, '');
    if (!text) {
      return null;
    }
    messages.push({ role: item.role, text });
  }

  return messages[messages.length - 1]?.role === 'user' ? messages : null;
}

function getSafePersona(value: unknown): string {
  const persona = clampText(value, MAX_PERSONA_LENGTH).replace(/[\r\n]/g, ' ');
  if (!persona) return '溫柔前輩';
  return ALLOWED_PERSONAS.has(persona) ? persona : '溫柔前輩';
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, {
    namespace: 'ai-chat',
    limit: 15,
    windowMs: 10 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterSeconds, 'AI 對話使用過於頻繁，請稍後再試。');
  }

  if (hasOversizedContent(request, MAX_BODY_BYTES)) {
    return NextResponse.json({ error: '訊息內容過大。' }, { status: 413 });
  }

  try {
    const body: unknown = await request.json();
    if (!isRecord(body)) {
      return NextResponse.json({ error: '訊息格式不正確。' }, { status: 400 });
    }

    const messages = parseMessages(body.messages);
    if (!messages) {
      return NextResponse.json({ error: '訊息格式或數量不正確。' }, { status: 400 });
    }

    const userName = clampText(body.userName, MAX_USER_NAME_LENGTH).replace(/[\r\n]/g, ' ') || '訪客';
    const nodeContext = clampText(body.nodeContext, MAX_NODE_CONTEXT_LENGTH).replace(/[\r\n]/g, ' ');
    const persona = getSafePersona(body.persona);
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'AI 服務目前未設定完成。' }, { status: 503 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const systemInstruction = `你是一位在 BDSM 探索大廳擔任輔導員的 AI 導師。使用者名稱是 ${userName}。
你的說話風格必須扮演：「${persona}」。請根據這個個性去調整語氣，但必須保持安全意識。
${nodeContext}
如果涉及危險行為，必須強調「安全、知情、同意 (SSC)」原則與安全詞的重要性。回答盡量簡短。`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite',
      systemInstruction
    });

    const rawHistory = messages.slice(0, -1).map((message) => ({
      role: message.role,
      parts: [{ text: message.text }]
    }));
    const firstUserIndex = rawHistory.findIndex((message) => message.role === 'user');
    const history = firstUserIndex >= 0 ? rawHistory.slice(firstUserIndex) : [];
    const latestMessage = messages[messages.length - 1].text;

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(latestMessage);
    const reply = result.response.text().trim();

    if (!reply) {
      return NextResponse.json({ error: 'AI 暫時沒有產生回覆。' }, { status: 502 });
    }

    return NextResponse.json({ reply });
  } catch (error: unknown) {
    console.error('Chat API error:', error);
    const err = error as { status?: number; message?: string };
    if (err.status === 429 || err.status === 503 || err.message?.includes('rate limit') || err.message?.includes('quota')) {
      return NextResponse.json(
        { reply: '不好意思，目前大廳的訪客比較多，導師正在稍微休息一下。請晚點再來找我聊聊。' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }
    return NextResponse.json({ error: 'AI 對話暫時無法使用，請稍後再試。' }, { status: 502 });
  }
}
