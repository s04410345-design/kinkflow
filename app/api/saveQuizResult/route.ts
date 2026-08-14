import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/serverAuth';

export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    if ('response' in auth) return auth.response;

    const body = await req.json();
    const { scores, topTrait, aiAnalysis, actionType = 'quiz_ai_analysis' } = body as {
      scores?: Record<string, number>;
      topTrait?: string;
      aiAnalysis?: string;
      actionType?: string;
    };

    if (!scores || typeof scores !== 'object' || typeof actionType !== 'string') {
      return NextResponse.json({ error: 'Invalid quiz result payload' }, { status: 400 });
    }

    const topTraitsList = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([key]) => key);

    const { error: resultError } = await auth.client.from('quiz_results').insert({
      user_id: auth.user.id,
      scores,
      top_traits: topTraitsList,
      ai_analysis: typeof aiAnalysis === 'string' ? aiAnalysis.slice(0, 12000) : '',
      created_at: new Date().toISOString(),
    });
    if (resultError) {
      console.error('[saveQuizResult] quiz_results insert failed:', resultError.message);
      return NextResponse.json({ error: 'Unable to save quiz result' }, { status: 400 });
    }

    const { error: logError } = await auth.client.from('visitor_logs').insert({
      user_id: auth.user.id,
      action_type: actionType.slice(0, 80),
      metadata_json: {
        user_id: auth.user.id,
        scores,
        top_trait: topTrait,
        reply: typeof aiAnalysis === 'string' ? aiAnalysis.slice(0, 12000) : '',
      },
    });
    if (logError) console.warn('[saveQuizResult] visitor log failed:', logError.message);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[saveQuizResult] unexpected error:', error);
    return NextResponse.json({ error: 'Unable to save quiz result' }, { status: 500 });
  }
}
