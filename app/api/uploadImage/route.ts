import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { base64, fileName } = body;

    if (!base64 || !fileName) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
      return NextResponse.json({ error: 'Server misconfiguration: missing url' }, { status: 500 });
    }

    const keyToUse = supabaseServiceKey || supabaseAnonKey;
    const supabase = createClient(supabaseUrl, keyToUse!, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // 解析 Base64 為 Buffer
    const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let mimeType = 'image/jpeg';
    let buffer: Buffer;

    if (matches && matches.length === 3) {
      mimeType = matches[1];
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    }

    const bucketCandidates = ['quiz-images', 'avatars', 'public'];
    let uploadedPublicUrl = '';
    let lastError = '';

    for (const bucketName of bucketCandidates) {
      try {
        // 嘗試確保 Bucket 存在
        await supabase.storage.createBucket(bucketName, { public: true }).catch(() => {});

        const path = `nodes/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(path, buffer, { contentType: mimeType, upsert: true });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(path);
          if (publicUrl) {
            uploadedPublicUrl = publicUrl;
            console.log(`[uploadImage] Successfully uploaded to bucket '${bucketName}': ${publicUrl}`);
            break;
          }
        } else {
          lastError = uploadError.message;
        }
      } catch (e: any) {
        lastError = e.message;
      }
    }

    if (uploadedPublicUrl) {
      return NextResponse.json({ url: uploadedPublicUrl });
    }

    // 萬一所有 Bucket 均失敗，如果容量小於 300KB 才允許 fallback
    if (buffer.length < 400 * 1024) {
      console.warn(`[uploadImage] Storage buckets failed (${lastError}). Returning lightweight data URL.`);
      return NextResponse.json({ url: base64, fallback: true });
    }

    return NextResponse.json({ 
      error: `Storage 上傳失敗 (${lastError})，請確認 Supabase Storage 已開啟或圖片小於限制。` 
    }, { status: 400 });

  } catch (err: any) {
    console.error('uploadImage API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
