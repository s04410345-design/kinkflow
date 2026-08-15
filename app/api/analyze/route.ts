import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

import {
  checkRateLimit,
  clampText,
  hasOversizedContent,
  isRecord,
  rateLimitResponse
} from '@/lib/server/rateLimit';

const MAX_BODY_BYTES = 20_000;
const MAX_SCORE_ENTRIES = 60;
const MAX_SCORE = 1_000;
const MAX_USER_NAME_LENGTH = 80;
const MAX_TITLE_LENGTH = 120;

type SafeScores = Record<string, number>;

function parseScores(value: unknown): SafeScores | null {
  if (!isRecord(value)) return null;

  const entries = Object.entries(value);
  if (entries.length > MAX_SCORE_ENTRIES) return null;

  const scores: SafeScores = {};
  for (const [key, rawValue] of entries) {
    const safeKey = key.trim().slice(0, 60);
    const numericValue = typeof rawValue === 'number' ? rawValue : Number(rawValue);
    if (!safeKey || !Number.isFinite(numericValue) || Math.abs(numericValue) > MAX_SCORE) {
      return null;
    }
    scores[safeKey] = numericValue;
  }

  return scores;
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, {
    namespace: 'quiz-analysis',
    limit: 6,
    windowMs: 10 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterSeconds, '分析請求過於頻繁，請稍後再試。');
  }

  if (hasOversizedContent(request, MAX_BODY_BYTES)) {
    return NextResponse.json({ error: '測驗資料過大。' }, { status: 413 });
  }

  try {
    const body: unknown = await request.json();
    if (!isRecord(body)) {
      return NextResponse.json({ error: '測驗資料格式不正確。' }, { status: 400 });
    }

    const scores = parseScores(body.scores);
    if (!scores) {
      return NextResponse.json({ error: '測驗分數格式不正確。' }, { status: 400 });
    }

    const userName = clampText(body.userName, MAX_USER_NAME_LENGTH).replace(/[\r\n]/g, ' ') || '匿名';
    const endingTitle = clampText(body.endingTitle, MAX_TITLE_LENGTH).replace(/[\r\n]/g, ' ') || '專屬印記';
    const topTraits = Array.isArray(body.topTraits)
      ? body.topTraits.filter((trait): trait is string => typeof trait === 'string').map((trait) => trait.trim().slice(0, 60)).filter(Boolean).slice(0, 5)
      : [];
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `請根據以下 BDSM 屬性測驗的分數與頂級特質，為使用者 ${userName} 撰寫一段 150 字左右的深度心理分析與親密關係建議：

結局稱號：${endingTitle}
特質分數：
${JSON.stringify(scores)}
頂級特質：${JSON.stringify(topTraits)}

請以「**【專屬稱號】** Analysis text...」的格式輸出，口吻請保持專業、沉穩、帶有一點詩意與鼓勵。`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        if (text) {
          return NextResponse.json({ analysis: text });
        }
      } catch (geminiError) {
        console.warn('Gemini analysis failed; using offline fallback:', geminiError);
      }
    }

    const sorted = Object.entries(scores)
      .map(([id, score]) => ({ id, score }))
      .sort((a, b) => b.score - a.score);

    const top1 = sorted[0]?.id || 'switch';
    const top2 = sorted[1]?.id || 'dom';
    const top3 = sorted[2]?.id || 'sub';
    const traitNames: Record<string, string> = {
      master: '主宰', dom: '支配者', disciplinarian: '規訓者', owner: '所有者',
      sadist: '施虐者', hunter: '獵人', primal_dom: '狂戰士', tormentor: '施痛者',
      rigger: '繩師', mind_controller: '精神控制', restrainer: '空間支配', binder: '拘束者',
      caregiver: '照顧者', daddy_mommy: '爹地媽咪', soft_dom: '溫柔支配', protector: '守護者',
      service_sub: '侍奉者', sub: '臣服者', slave: '奴隸', worshipper: '崇拜者',
      masochist: '受虐者', prey: '獵物', sufferer: '承受者', edge_seeker: '邊緣試探',
      tied: '受縛物', doll: '人偶', pet: '寵物', exhibit: '展品',
      brat: '反叛調皮', little: '幼態', soft_sub: '溫柔臣服', needy: '索求者',
      vanilla: '純愛', sapiosexual: '靈魂伴侶', demisexual: '專一依附', aftercare: '撫慰者',
      switch: '雙向者', voyeur: '窺視者', exhibitionist: '展露者', poly: '綠帽共享'
    };

    const t1Name = traitNames[top1] || '靈魂探索者';
    const t2Name = traitNames[top2] || '平衡者';
    const t3Name = traitNames[top3] || '守護者';
    const title = endingTitle !== '專屬印記' ? endingTitle : `【夜幕的${t1Name}】`;
    const fallbackText = `**${title}**\n在親密互動與心理光譜中，你展現出深邃的靈魂掌控力與敏銳直覺。核心特質【${t1Name}】引導著你對權力流動與信任邊界的獨特理解；輔助特質【${t2Name}】與【${t3Name}】則為你的互動增添了層次感與溫柔餘裕。建議在每一次溝通中保持 SSC/RACK 原則，享受深層信任帶來的寧靜與共鳴。`;

    return NextResponse.json({ analysis: fallbackText });
  } catch (error: unknown) {
    console.error('Analyze API error:', error);
    return NextResponse.json({ error: '分析服務暫時無法使用，請稍後再試。' }, { status: 502 });
  }
}
