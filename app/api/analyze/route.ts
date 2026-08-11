import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { scores, userName, topTraits, endingTitle } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `請根據以下 BDSM 屬性測驗的分數與頂級特質，為使用者 ${userName || '匿名'} 撰寫一段 150 字左右的深度心理分析與親密關係建議：\n\n結局稱號：${endingTitle || '專屬印記'}\n特質分數：\n${JSON.stringify(scores, null, 2)}\n\n請以「**【專屬稱號】** Analysis text...」的格式輸出，口吻請保持專業、沉穩、帶有一點詩意與鼓勵。`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        if (text && text.trim()) {
          return NextResponse.json({ analysis: text });
        }
      } catch (geminiError) {
        console.warn('Gemini API call failed, falling back to smart offline generator:', geminiError);
      }
    }

    // 智能本地心靈印記產生器 (Smart Dynamic Psychological Portrait Fallback)
    const sorted = Object.entries(scores || {})
      .map(([k, v]) => ({ id: k, score: Number(v) || 0 }))
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

    const title = endingTitle || `【夜幕的${t1Name}】`;
    const fallbackText = `**${title}**\n在親密互動與心理光譜中，你展現出深邃的靈魂掌控力與敏銳直覺。核心特質【${t1Name}】引導著你對權力流動與信任邊界的獨特理解；輔助特質【${t2Name}】與【${t3Name}】則為你的互動增添了層次感與溫柔餘裕。建議在每一次溝通中保持 SSC/RACK 原則，享受深層信任帶來的寧靜與共鳴。`;

    return NextResponse.json({ analysis: fallbackText });
  } catch (error: unknown) {
    console.error('Analyze API Error:', error);
    return NextResponse.json({ 
      analysis: '**【夜幕的執棋者】**\n在親密互動與心理光譜中，你展現出深邃的靈魂掌控力與敏銳直覺。建議在每一次溝通中保持 SSC/RACK 原則，享受深層信任帶來的寧靜與共鳴。' 
    });
  }
}
