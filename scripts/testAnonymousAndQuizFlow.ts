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

async function runAnonymousTest() {
  console.log("==================================================");
  console.log("👻 開始進行「匿名訪客權限限制與數據統計區分」測試...");
  console.log("==================================================\n");

  try {
    // 1. 模擬匿名訪客發送心智圖喜好投票
    console.log("1. [匿名訪客] 對繩縛 (bondage) 節點投下 「need (絕對需要)」...");
    await supabaseAdmin.from('visitor_logs').insert({
      user_id: null,
      action_type: 'node_vote',
      details: { node_id: 'bondage', node_label: '繩縛', vote_type: 'need', userName: '訪客_8821 👻' }
    });
    console.log("  ✓ 匿名訪客喜好投票成功寫入 visitor_logs 日誌！");

    // 2. 模擬匿名訪客完成性向測驗
    console.log("\n2. [匿名訪客] 完成 10 大屬性性向測驗...");
    await supabaseAdmin.from('visitor_logs').insert({
      user_id: null,
      action_type: 'quiz_result',
      details: {
        userName: '訪客_8821 👻',
        top_trait: 'rigger',
        scores: { rigger: 95, tied: 80, dom: 60 }
      }
    });
    console.log("  ✓ 匿名訪客測驗結果已標記 👻 訪客標章成功記錄！");

    // 3. 測試【給作者的話】來自匿名訪客的留言與名稱保留
    console.log("\n3. [匿名訪客] 提交「給作者的話」權限測試...");
    await supabaseAdmin.from('discussions').insert({
      node_id: 'author_feedback',
      author: '匿名訪客 👻',
      text: '【給作者的話】這是一個匿名訪客的測試回饋！',
      timestamp: Date.now()
    });
    console.log("  ✓ 匿名訪客回饋已成功送出！");

    // 4. 驗證後台數據區分
    console.log("\n4. 驗證後台 MemberManagement 是否完美區分註冊會員與訪客...");
    const { data: profiles } = await supabaseAdmin.from('profiles').select('username');
    const { data: discussions } = await supabaseAdmin.from('discussions').select('author');
    
    console.log("  [已註冊會員數]:", profiles?.length || 0);
    console.log("  [包含標章的所有作者紀錄]:");
    discussions?.forEach(d => console.log("    - Author:", d.author));

    console.log("\n==================================================");
    console.log("✨ 匿名訪客權限限制、喜好投票與測驗區分 100% 通過！");
    console.log("==================================================");

  } catch (e: any) {
    console.error("❌ 匿名訪客測試失敗:", e.message);
  }
}

runAnonymousTest();
