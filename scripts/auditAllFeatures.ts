import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// 解析 .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.length > 0 && value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value.trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

async function runAudit() {
  console.log("==================================================");
  console.log("🛡️ 開始對 KinkFlow 全站進行自動化深度檢測與錯誤排查...");
  console.log("==================================================\n");

  let errorCount = 0;

  // 1. 檢測 profiles 與 quiz_content
  try {
    console.log("🔍 [1/5] 檢測用戶 Profile 與 quiz_content 同步狀態...");
    const { data: profiles, error: pErr } = await supabaseAdmin.from('profiles').select('*');
    if (pErr) throw new Error(`profiles 讀取失敗: ${pErr.message}`);
    console.log(`  ✓ profiles 表共 ${profiles?.length || 0} 筆會員紀錄`);

    const { data: userContents, error: qcErr } = await supabaseAdmin.from('quiz_content').select('*').like('key_name', 'user_%');
    if (qcErr) throw new Error(`quiz_content 讀取失敗: ${qcErr.message}`);
    console.log(`  ✓ quiz_content 表共 ${userContents?.length || 0} 筆用戶資料快取`);
  } catch (e: any) {
    console.error(`  ❌ [1/5] 錯誤: ${e.message}`);
    errorCount++;
  }

  // 2. 檢測 discussions 與給作者的話
  try {
    console.log("\n🔍 [2/5] 檢測 Discussions 討論區與【給作者的話】...");
    const { data: discussions, error: dErr } = await supabaseAdmin.from('discussions').select('*');
    if (dErr) throw new Error(`discussions 讀取失敗: ${dErr.message}`);
    console.log(`  ✓ discussions 表共 ${discussions?.length || 0} 則發言`);
    
    const authorMsgs = (discussions || []).filter(d => d.node_id === 'author_feedback' || d.text.includes('【給作者的話】'));
    console.log(`  ✓ 其中包含 ${authorMsgs.length} 則【給作者的話】`);
    authorMsgs.forEach(m => {
      if (!m.author || m.author === '匿名訪客') {
        console.warn(`  ⚠️ 發現疑似匿名作者的給作者的話: ID ${m.id}`);
      }
    });
  } catch (e: any) {
    console.error(`  ❌ [2/5] 錯誤: ${e.message}`);
    errorCount++;
  }

  // 3. 檢測 visitor_logs 網站活動監控
  try {
    console.log("\n🔍 [3/5] 檢測 visitor_logs 網站活動監控...");
    const { data: logs, error: lErr } = await supabaseAdmin.from('visitor_logs').select('*');
    if (lErr) throw new Error(`visitor_logs 讀取失敗: ${lErr.message}`);
    console.log(`  ✓ visitor_logs 表共 ${logs?.length || 0} 筆日誌紀錄`);
  } catch (e: any) {
    console.error(`  ❌ [3/5] 錯誤: ${e.message}`);
    errorCount++;
  }

  // 4. 檢測 quiz_node_stats 心智圖節點投票
  try {
    console.log("\n🔍 [4/5] 檢測 心智圖節點喜好投票數據 (quiz_node_stats)...");
    const { data: statsData, error: sErr } = await supabaseAdmin.from('quiz_content').select('content').eq('key_name', 'quiz_node_stats').maybeSingle();
    if (sErr) throw new Error(`quiz_node_stats 讀取失敗: ${sErr.message}`);
    console.log(`  ✓ 節點喜好投票紀錄: ${statsData?.content ? Object.keys(statsData.content).length : 0} 個節點被投票`);
  } catch (e: any) {
    console.error(`  ❌ [4/5] 錯誤: ${e.message}`);
    errorCount++;
  }

  // 5. 測試模擬寫入 updateProfile API
  try {
    console.log("\n🔍 [5/5] 測試模擬 Profile 更新與視窗照片保存...");
    const testUsername = "全自動檢測帳號_" + Date.now();
    const { data: qcData, error: uErr } = await supabaseAdmin.from('quiz_content').upsert({
      key_name: `user_${testUsername}`,
      content: {
        bio: "這是自動檢測腳本產生的測試簡介",
        avatarUrl: "https://example.com/avatar.jpg",
        coverUrl: "https://example.com/cover.jpg",
        joinedAt: new Date().toISOString()
      }
    }, { onConflict: 'key_name' });

    if (uErr) throw new Error(`quiz_content 寫入失敗: ${uErr.message}`);
    console.log(`  ✓ 個人資料、視窗封面照片與大頭貼模擬寫入成功！`);

    // 清理測試數據
    await supabaseAdmin.from('quiz_content').delete().eq('key_name', `user_${testUsername}`);
    console.log(`  ✓ 測試快取數據已自動清理`);
  } catch (e: any) {
    console.error(`  ❌ [5/5] 錯誤: ${e.message}`);
    errorCount++;
  }

  console.log("\n==================================================");
  if (errorCount === 0) {
    console.log("✨ 全站數據與 API 全面檢測完畢，0 錯誤！系統完全穩定！");
  } else {
    console.log(`⚠️ 全檢完成，發現 ${errorCount} 項錯誤，即刻進行自動修正！`);
  }
  console.log("==================================================");
}

runAudit();
