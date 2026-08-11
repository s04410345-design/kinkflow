import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, targetName, bio, editAvatarUrl, editCoverUrl } = body;

    if (!targetName) {
      return NextResponse.json({ error: 'Missing targetName' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
      return NextResponse.json({ error: 'Missing SUPABASE_URL' }, { status: 500 });
    }
    
    // 優先使用 service role key，強制繞過 RLS
    const keyToUse = supabaseServiceKey || supabaseAnonKey;
    const usingServiceKey = !!supabaseServiceKey;
    
    // Debug: Decode JWT to check if it's REALLY a service role key
    let decodedRole = 'unknown';
    try {
      if (keyToUse) {
        const parts = keyToUse.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          decodedRole = payload.role;
        }
      }
    } catch(e) {}
    
    console.log(`[updateProfile] Using ${usingServiceKey ? 'SERVICE ROLE' : 'ANON'} key. Decoded role: ${decodedRole}. userId=${userId}, targetName=${targetName}`);
    
    if (!keyToUse) {
      return NextResponse.json({ error: 'No Supabase key available' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, keyToUse, {
      auth: { persistSession: false },
      global: { headers: { apikey: keyToUse, Authorization: `Bearer ${keyToUse}` } }
    });
    
    // 1. Update profiles table (僅對有 userId 的登入用戶，profiles 表有 username, bio, avatar_url)
    if (userId) {
      const { error: profileError } = await supabase.from('profiles').upsert(
        { id: userId, username: targetName, bio, avatar_url: editAvatarUrl }, 
        { onConflict: 'id' }
      );
      if (profileError) {
        console.error('[updateProfile] profiles upsert error:', profileError);
        return NextResponse.json({ 
          error: profileError.message, 
          debug_info: `使用的 Key 角色為: ${decodedRole}。`
        }, { status: 500 });
      }
    }
    
    // 2. 將 bio/avatar/cover 存入 quiz_content（訪客和登入用戶都適用）
    const cleanTargetName = targetName.replace(/ ☑️/g, '').replace(/ 👻/g, '').trim();
    const { data: qData } = await supabase.from('quiz_content').select('content').eq('key_name', `user_${cleanTargetName}`).maybeSingle();
    const newContent = { 
      ...(qData?.content || {}), 
      coverUrl: editCoverUrl, 
      bio, 
      avatarUrl: editAvatarUrl 
    };
    const { error: quizError } = await supabase.from('quiz_content').upsert(
      { key_name: `user_${cleanTargetName}`, content: newContent }, 
      { onConflict: 'key_name' }
    );
    if (quizError) {
      console.error('[updateProfile] quiz_content upsert error:', quizError);
      return NextResponse.json({ error: quizError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, usedServiceKey: usingServiceKey });
  } catch (err: any) {
    console.error('updateProfile API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
