/**
 * ============================================================
 * 🌸 KinkFlow v1 (秋Day) — 模組架構標籤 (Module Tag)
 * 模組 ID  : 0-1 (Wave 1 基礎建設與 SSR 服務端進入點)
 * 路由路徑 : / (首頁)
 * 核心功能 : 初始化 Supabase SSR 連線，預載 cms_quiz / quiz_content 全站題庫與設定，並傳遞至 ClientApp
 * 對應檔案 : app/page.tsx, app/ClientApp.tsx
 * ============================================================
 */
import { createClient } from '@supabase/supabase-js';
import ClientApp from './ClientApp';
import { AXES_INFO, TRAITS_DB, ENDINGS_DB, SCENARIO_GRAPH, CARDS } from '@/lib/quizData';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let quizConfig = { axes: AXES_INFO, traits: TRAITS_DB, endings: ENDINGS_DB, scenarioGraph: SCENARIO_GRAPH, cards: CARDS };

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      const { data: configDataArray } = await supabase
        .from('quiz_content')
        .select('content')
        .eq('key_name', 'quiz_system_config');
      const data = configDataArray?.[0];

      if (data?.content && typeof data.content === 'object') {
        quizConfig = {
          axes: data.content.axes || AXES_INFO,
          traits: data.content.traits || TRAITS_DB,
          endings: data.content.endings || ENDINGS_DB,
          scenarioGraph: data.content.scenarioGraph || SCENARIO_GRAPH,
          cards: data.content.cards || CARDS,
          ...data.content
        };
      }
    } catch (err) {
      console.error("Supabase SSR fetch failed:", err);
    }
  }

  return <ClientApp quizConfig={quizConfig} />;
}
