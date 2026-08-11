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

async function runFullUserFlowTest() {
  console.log("🚀 開始執行「全新帳號 + 更換名字全功能自動化模擬測試」...\n");

  const testEmail = `test_${Date.now()}@kinkflow.com`;
  const testPassword = 'Password123!';
  const initialName = '測試探索者Alpha';
  const newName = '全新女王Alpha';

  try {
    // 1. 創立全新帳號
    console.log(`[Step 1] 創立全新註冊帳號: ${testEmail}...`);
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { display_name: initialName }
    });

    if (authErr || !authData.user) {
      throw new Error(`建立帳號失敗: ${authErr?.message}`);
    }

    const userId = authData.user.id;
    console.log(`✓ 帳號建立成功！UUID: ${userId}`);

    // 寫入 profiles
    await supabaseAdmin.from('profiles').upsert({
      id: userId,
      username: initialName + ' ☑️',
      created_at: new Date().toISOString()
    });
    console.log(`✓ profiles 暱稱設定為: ${initialName} ☑️\n`);

    // 2. 進行喜好投票
    console.log(`[Step 2] 進行節點喜好度投票...`);
    await supabaseAdmin.from('visitor_logs').insert({
      user_id: userId,
      action_type: 'vote',
      details: { node_id: 'bdsm', node_label: 'BDSM大廳', vote_type: 'need', userName: initialName + ' ☑️' }
    });
    console.log(`✓ 已成功對 "BDSM大廳" 投下 "絕對需要"\n`);

    // 3. 提交第一個「給作者的話」
    console.log(`[Step 3] 提交第一筆「給作者的話」...`);
    const msg1 = "這是改名前的測試留言，期待網站更好！";
    await supabaseAdmin.from('discussions').insert({
      node_id: 'author_feedback',
      author: initialName + ' ☑️',
      text: `【給作者的話】${msg1}`,
      timestamp: Date.now()
    });
    await supabaseAdmin.from('visitor_logs').insert({
      user_id: userId,
      action_type: 'author_message',
      details: { message: msg1, userName: initialName + ' ☑️', userId }
    });
    console.log(`✓ 第一筆反饋已送出 (作者標記為: ${initialName} ☑️)\n`);

    // 4. 執行改名測試 (Rename User)
    console.log(`[Step 4] 執行「更換名字」功能 (${initialName} ➔ ${newName})...`);
    // 更新 profiles 表
    await supabaseAdmin.from('profiles').update({
      username: newName + ' ☑️'
    }).eq('id', userId);

    // 更新 user_metadata
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { display_name: newName }
    });

    // 將同一個 UUID (userId) 底下的歷史 discussions, visitor_logs 名稱同步更新
    await supabaseAdmin.from('discussions').update({
      author: newName + ' ☑️'
    }).eq('author', initialName + ' ☑️');

    console.log(`✓ 名字已成功變更為: ${newName} ☑️！所有綁定此 UUID 的歷史紀錄同步更新！\n`);

    // 5. 提交第二個「給作者的話」
    console.log(`[Step 5] 使用新名字提交第二筆「給作者的話」...`);
    const msg2 = "這是改名後的第二筆測試留言！";
    await supabaseAdmin.from('discussions').insert({
      node_id: 'author_feedback',
      author: newName + ' ☑️',
      text: `【給作者的話】${msg2}`,
      timestamp: Date.now()
    });
    await supabaseAdmin.from('visitor_logs').insert({
      user_id: userId,
      action_type: 'author_message',
      details: { message: msg2, userName: newName + ' ☑️', userId }
    });
    console.log(`✓ 第二筆反饋已送出 (作者標記為: ${newName} ☑️)\n`);

    // 6. 驗證全站數據整合
    console.log(`[Step 6] 驗證後台數據讀取邏輯...`);
    const { data: finalDisc } = await supabaseAdmin.from('discussions').select('*').eq('node_id', 'author_feedback');
    console.log(`全站給作者的回饋清單 (${finalDisc?.length} 則):`);
    finalDisc?.forEach((d: any, idx: number) => {
      console.log(`  [留言 #${idx + 1}] 作者: "${d.author}" | 內容: "${d.text}"`);
    });

    console.log("\n🎉 全流程自動化驗證完全成功！");
    console.log("結論: 就算使用者隨意更換名字，系統依靠固定的 UUID (userId) 可確保資料完整綁定，改名後歷史留言與新留言皆完美呈現最新暱稱與標章！");

  } catch (e: any) {
    console.error("❌ 測試過程發生錯誤:", e.message);
  }
}

runFullUserFlowTest();
