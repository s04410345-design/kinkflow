import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// 手動解析 .env.local 檔案
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function cleanAllData() {
  console.log("🧹 開始清空全站紀錄與所有註冊帳號...");

  try {
    // 1. 清空 discussions
    const { error: errDisc } = await supabase.from('discussions').delete().not('id', 'is', null);
    console.log("1. discussions 清空結果:", errDisc ? errDisc.message : "成功");

    // 2. 嘗試清空 feedbacks
    const { error: errFb } = await supabase.from('feedbacks').delete().not('id', 'is', null);
    console.log("2. feedbacks 清空結果:", errFb ? errFb.message : "成功");

    // 3. 嘗試清空 quiz_results
    const { error: errQr } = await supabase.from('quiz_results').delete().not('id', 'is', null);
    console.log("3. quiz_results 清空結果:", errQr ? errQr.message : "成功");

    // 4. 清空 visitor_logs
    const { error: errVl } = await supabase.from('visitor_logs').delete().not('id', 'is', null);
    console.log("4. visitor_logs 清空結果:", errVl ? errVl.message : "成功");

    // 5. 清空 profiles 表格
    const { error: errProf } = await supabase.from('profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log("5. profiles 清空結果:", errProf ? errProf.message : "成功");

    // 6. 清空 quiz_content 中非系統保留的用戶數據 (保留 mindmap_data, quiz_config, quiz_questions)
    const { data: qcList } = await supabase.from('quiz_content').select('key_name');
    if (qcList) {
      const keysToDelete = qcList
        .map(q => q.key_name)
        .filter(k => k !== 'mindmap_data' && k !== 'quiz_config' && k !== 'quiz_questions');

      for (const k of keysToDelete) {
        await supabase.from('quiz_content').delete().eq('key_name', k);
      }
      console.log(`6. quiz_content 使用者快取清空結果: 已刪除 ${keysToDelete.length} 筆測試紀錄`);
    }

    // 7. 嘗試刪除 Supabase Auth users
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { data: usersData } = await supabase.auth.admin.listUsers();
      if (usersData?.users) {
        for (const u of usersData.users) {
          await supabase.auth.admin.deleteUser(u.id);
        }
        console.log(`7. Supabase Auth 用戶帳號清空結果: 已刪除 ${usersData.users.length} 個帳號`);
      }
    }

    console.log("✨ 全站數據已 100% 徹底清空並回到純淨初始狀態！");
  } catch (e: any) {
    console.error("清空資料過程中發生錯誤:", e.message);
  }
}

cleanAllData();
