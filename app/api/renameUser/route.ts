import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { oldName, newName } = body;

    if (!oldName || !newName) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
      return NextResponse.json({ error: 'Server misconfiguration: missing URL' }, { status: 500 });
    }

    const keyToUse = supabaseServiceKey || supabaseAnonKey;
    const usingServiceKey = !!supabaseServiceKey;
    console.log(`[renameUser] Using ${usingServiceKey ? 'SERVICE ROLE' : 'ANON'} key. oldName=${oldName}, newName=${newName}`);

    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, keyToUse!, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    
    // 1. Update profiles table
    const { error: pErr } = await supabase.from('profiles').update({ username: newName }).eq('username', oldName);
    if (pErr) console.error('[renameUser] profiles update error:', pErr);
    
    // 2. Update discussions table - 同時比對有後綴和沒後綴的版本
    const namesToMatch = [oldName];
    // 加入常見後綴變體（有些留言存的是帶後綴的名稱）
    const suffixes = [' 玩家', ' 訪客', ' 守門人'];
    const cleanOldBase = oldName.replace(/ 玩家| 訪客| 守門人/g, '').trim();
    suffixes.forEach(sfx => {
      namesToMatch.push(cleanOldBase + sfx);
    });
    if (!namesToMatch.includes(cleanOldBase)) namesToMatch.push(cleanOldBase);
    
    for (const matchName of namesToMatch) {
      const { error: dErr } = await supabase.from('discussions').update({ author: newName }).eq('author', matchName);
      if (dErr) console.error(`[renameUser] discussions update error for "${matchName}":`, dErr);
      
      // 同步更新 feedbacks 表格
      await supabase.from('feedbacks').update({ author: newName }).eq('author', matchName);
    }
    
    // 3. Update quiz_content table
    const cleanOldName = oldName.replace(/ 玩家/g, '').replace(/ 訪客/g, '').replace(/ 守門人/g, '').trim();
    const cleanNewName = newName.replace(/ 玩家/g, '').replace(/ 訪客/g, '').replace(/ 守門人/g, '').trim();

    const { error: qErr } = await supabase
      .from('quiz_content')
      .update({ key_name: `user_${cleanNewName}` })
      .eq('key_name', `user_${cleanOldName}`);
    if (qErr) console.error('[renameUser] quiz_content update error:', qErr);

    // 同時更新如果 quiz_content 裡存的是完整名稱
    await supabase
      .from('quiz_content')
      .update({ key_name: `user_${newName}` })
      .eq('key_name', `user_${oldName}`);

    return NextResponse.json({ success: true, usedServiceKey: usingServiceKey });
  } catch (err: any) {
    console.error('renameUser API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
