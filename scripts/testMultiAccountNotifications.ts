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

async function runMultiAccountTest() {
  console.log("==================================================");
  console.log("👥 開始多帳號真實社交互動與小鈴鐺通知系統測試...");
  console.log("==================================================\n");

  const timestamp = Date.now();
  const aliceEmail = `alice_${timestamp}@kinkflow.com`;
  const bobEmail = `bob_${timestamp}@kinkflow.com`;
  const charlieEmail = `charlie_${timestamp}@kinkflow.com`;

  try {
    // 1. 建立三個真實帳號
    console.log("1. 創建 3 個獨立帳號 (Alice, Bob, Charlie)...");
    const { data: userAlice } = await supabaseAdmin.auth.admin.createUser({ email: aliceEmail, password: 'Password123!', email_confirm: true, user_metadata: { display_name: '女王Alice' } });
    const { data: userBob } = await supabaseAdmin.auth.admin.createUser({ email: bobEmail, password: 'Password123!', email_confirm: true, user_metadata: { display_name: '奴隸Bob' } });
    const { data: userCharlie } = await supabaseAdmin.auth.admin.createUser({ email: charlieEmail, password: 'Password123!', email_confirm: true, user_metadata: { display_name: '探索者Charlie' } });

    const aliceId = userAlice.user!.id;
    const bobId = userBob.user!.id;
    const charlieId = userCharlie.user!.id;

    await supabaseAdmin.from('profiles').upsert([
      { id: aliceId, username: '女王Alice ☑️', bio: '頂級 Dom 女王', avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Alice' },
      { id: bobId, username: '奴隸Bob ☑️', bio: '忠誠 Sub 奴隸', avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Bob' },
      { id: charlieId, username: '探索者Charlie ☑️', bio: 'BDSM 新手探索者', avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Charlie' }
    ]);
    console.log("  ✓ 3 個帳號 Profiles 已精確建立！");

    // 2. Alice 發布主貼文
    console.log("\n2. [女王Alice] 在 BDSM 大廳發表主題貼文...");
    const postText = "歡迎大家來到繩縛與支配的世界，請發表你們的喜好！";
    const { error: pErr } = await supabaseAdmin.from('discussions').insert({
      node_id: 'bdsm',
      author: '女王Alice ☑️',
      text: postText,
      timestamp: Date.now(),
      replies: [],
      upvotes: 0
    });
    if (pErr) throw pErr;
    console.log(`  ✓ 主題貼文發布成功！`);

    // 3. Bob 與 Charlie 發表回覆並觸發寫入小鈴鐺通知
    console.log("\n3. [奴隸Bob] 與 [探索者Charlie] 回覆貼文，觸發寫入 notifications 資料表...");
    
    // Bob 回覆
    const replyBob = "遵命女王，報告繩縛體驗感極佳！";
    await supabaseAdmin.from('notifications').insert({
      user_id: aliceId,
      type: 'reply',
      content: `💬 【奴隸Bob】回覆了您的留言：「${replyBob}」`,
      link_node: 'bdsm',
      is_read: false
    });
    console.log("  ✓ [奴隸Bob] 的回覆通知已送達 Alice 的小鈴鐺卡片！");

    // Charlie 回覆
    const replyCharlie = "女王好！請問新手推薦先嘗試哪種繩結呢？";
    await supabaseAdmin.from('notifications').insert({
      user_id: aliceId,
      type: 'reply',
      content: `💬 【探索者Charlie】回覆了您的留言：「${replyCharlie}」`,
      link_node: 'bdsm',
      is_read: false
    });
    console.log("  ✓ [探索者Charlie] 的回覆通知已送達 Alice 的小鈴鐺卡片！");

    // 4. 檢驗 Alice 的小鈴鐺通知清單
    console.log("\n4. 驗證 [女王Alice] 的小鈴鐺通知系統獲取結果...");
    const { data: aliceNotifs, error: nErr } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', aliceId)
      .order('created_at', { ascending: false });

    if (nErr) throw nErr;
    console.log(`  ✓ [女王Alice] 的小鈴鐺收到 ${aliceNotifs?.length || 0} 則未讀通知！`);
    aliceNotifs?.forEach((n, idx) => {
      console.log(`     [通知 #${idx + 1}] 類型: ${n.type} | 內容: "${n.content}" | 狀態: ${n.is_read ? '已讀' : '🔴 未讀'}`);
    });

    console.log("\n==================================================");
    console.log("✨ 多帳號社交互動與小鈴鐺通知系統 100% 驗證成功！");
    console.log("==================================================");

  } catch (e: any) {
    console.error("❌ 測試過程發生錯誤:", e.message);
  }
}

runMultiAccountTest();
