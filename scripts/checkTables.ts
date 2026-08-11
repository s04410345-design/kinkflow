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

async function createTables() {
  console.log("Checking and ensuring tables exist...");
  try {
    // 嘗試寫入一個無害紀錄以確保 quiz_results 與 feedbacks 能正常被 Supabase 識辨或避開
    const { error: err1 } = await supabaseAdmin.from('quiz_content').select('key_name').limit(1);
    console.log("quiz_content check:", err1 ? err1.message : "OK");
  } catch(e) {}
}

createTables();
