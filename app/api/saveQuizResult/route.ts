import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userName, scores, topTrait, aiAnalysis, actionType = 'quiz_ai_analysis' } = body;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
      return NextResponse.json({ error: 'Server misconfiguration: missing URL' }, { status: 500 });
    }

    const keyToUse = supabaseServiceKey || supabaseAnonKey;
    const usingServiceKey = !!supabaseServiceKey;
    console.log(`[saveQuizResult] Using ${usingServiceKey ? 'SERVICE ROLE' : 'ANON'} key for key_name: ${userName}`);

    // Use service role to bypass RLS for inserting into quiz_content
    const supabase = createClient(supabaseUrl, keyToUse!, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const cleanName = (userName || '').replace(/ ☑️/g, '').replace(/ 👻/g, '').trim();

    // 1. 寫入 quiz_results (讓後台統計數據中心即時連動)
    if (cleanName) {
      const topTraitsList = scores ? Object.entries(scores).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5).map(([k]) => k) : [topTrait];
      await supabase.from('quiz_results').insert({
        user_name: cleanName,
        scores: scores || {},
        top_traits: topTraitsList,
        ai_analysis: aiAnalysis || '',
        created_at: new Date().toISOString()
      }).then(({ error }) => {
        if (error) console.log("quiz_results insert log:", error.message);
      });
    }

    // 2. 寫入 visitor_logs
    if (userName) {
      await supabase.from('visitor_logs').insert({
        action_type: actionType,
        details: {
          userName,
          scores,
          top_trait: topTrait,
          reply: aiAnalysis
        }
      });
    }

    // 3. 寫入或更新 quiz_content (用於 UserProfileModal)
    if (cleanName) {
      const keyName = `user_${cleanName}`;
      
      // 先抓舊資料
      const { data: existingData } = await supabase.from('quiz_content')
        .select('content')
        .eq('key_name', keyName)
        .maybeSingle();

      const newContent = {
        ...((existingData?.content as Record<string, any>) || {}),
        scores,
        ai_analysis: aiAnalysis,
        top_trait: topTrait
      };

      // 強制 Upsert (無視 RLS)
      await supabase.from('quiz_content').upsert(
        { key_name: keyName, content: newContent },
        { onConflict: 'key_name' }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('saveQuizResult API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
