import { NextResponse } from 'next/server';
import { getServiceClient, requireUser } from '@/lib/serverAuth';
import { checkRateLimit, hasOversizedContent, rateLimitResponse } from '@/lib/server/rateLimit';

const BUCKET_NAME = 'quiz-images';
const MAX_REQUEST_BYTES = 16 * 1024;
const MAX_VIDEO_BYTES = 52_428_800;
const MAX_WIDTH = 1280;
const MAX_HEIGHT = 720;
const MAX_DURATION_SECONDS = 300;
const MAX_TOTAL_BYTES = 524_288_000;
const APPROVED_STATUS = 'approved';

function asPositiveInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
}

function asPositiveNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function safeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'video.mp4';
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, {
    namespace: 'video-upload-init',
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds, '影片上傳請求過於頻繁，請稍後再試。');
  if (hasOversizedContent(request, MAX_REQUEST_BYTES)) return NextResponse.json({ error: '影片上傳參數過大。' }, { status: 413 });

  const auth = await requireUser(request);
  if ('response' in auth) return auth.response;
  const serviceClient = getServiceClient();
  if (!serviceClient) return NextResponse.json({ error: 'Storage 尚未完成設定。' }, { status: 500 });

  try {
    const body = await request.json() as Record<string, unknown>;
    const fileName = typeof body.fileName === 'string' ? body.fileName.trim() : '';
    const mimeType = typeof body.mimeType === 'string' ? body.mimeType.toLowerCase() : '';
    const byteSize = asPositiveInteger(body.byteSize);
    const width = asPositiveInteger(body.width);
    const height = asPositiveInteger(body.height);
    const durationSeconds = asPositiveNumber(body.durationSeconds);

    if (!fileName.toLowerCase().endsWith('.mp4') || mimeType !== 'video/mp4') {
      return NextResponse.json({ error: '只接受 MP4 影片。' }, { status: 415 });
    }
    if (!byteSize || byteSize > MAX_VIDEO_BYTES) {
      return NextResponse.json({ error: '單支影片不可超過 50 MB。' }, { status: 413 });
    }
    if (!width || !height || width > MAX_WIDTH || height > MAX_HEIGHT) {
      return NextResponse.json({ error: '影片尺寸不可超過 1280×720（720p）。' }, { status: 400 });
    }
    if (!durationSeconds || durationSeconds > MAX_DURATION_SECONDS) {
      return NextResponse.json({ error: '單支影片長度不可超過 5 分鐘。' }, { status: 400 });
    }

    const { data: verification, error: verificationError } = await serviceClient
      .from('author_verifications')
      .select('status')
      .eq('user_id', auth.user.id)
      .maybeSingle();
    if (verificationError || verification?.status !== APPROVED_STATUS) {
      return NextResponse.json({ error: '只有已通過認證的特別用戶可以上傳專題誌影片。' }, { status: 403 });
    }

    const { data: usageRows, error: usageError } = await serviceClient
      .from('media_assets')
      .select('byte_size')
      .eq('owner_id', auth.user.id)
      .eq('media_type', 'video')
      .in('status', ['active', 'blocked'])
      .limit(1000);
    if (usageError) return NextResponse.json({ error: '影片配額查詢失敗。' }, { status: 503 });
    const usedBytes = (usageRows || []).reduce((total, row) => total + (typeof row.byte_size === 'number' ? row.byte_size : 0), 0);
    if (usedBytes + byteSize > MAX_TOTAL_BYTES) {
      return NextResponse.json({ error: '已超過每位特別用戶 500 MB 的影片總容量。' }, { status: 413 });
    }

    const storagePath = `articles/videos/${auth.user.id}/${crypto.randomUUID()}-${safeFileName(fileName)}`;
    const { data: signedUpload, error: signedUploadError } = await serviceClient.storage
      .from(BUCKET_NAME)
      .createSignedUploadUrl(storagePath, { upsert: false });
    if (signedUploadError || !signedUpload) {
      console.error('[uploadVideo] signed URL 建立失敗:', signedUploadError?.message || 'unknown');
      return NextResponse.json({ error: '影片上傳連結建立失敗。' }, { status: 503 });
    }

    const { data: uploadRow, error: uploadRowError } = await serviceClient
      .from('video_uploads')
      .insert({
        owner_id: auth.user.id,
        storage_path: storagePath,
        byte_size: byteSize,
        width,
        height,
        duration_seconds: Math.round(durationSeconds * 100) / 100,
        status: 'pending',
      })
      .select('id,expires_at')
      .single();
    if (uploadRowError || !uploadRow) {
      console.error('[uploadVideo] upload lifecycle row 建立失敗:', uploadRowError?.message || 'unknown');
      return NextResponse.json({ error: '影片上傳工作建立失敗。' }, { status: 503 });
    }

    return NextResponse.json({
      uploadId: uploadRow.id,
      path: signedUpload.path,
      token: signedUpload.token,
      signedUrl: signedUpload.signedUrl,
      expiresAt: uploadRow.expires_at,
      maxBytes: MAX_VIDEO_BYTES,
      maxDurationSeconds: MAX_DURATION_SECONDS,
      maxWidth: MAX_WIDTH,
      maxHeight: MAX_HEIGHT,
    });
  } catch (error) {
    console.error('[uploadVideo] unexpected error:', error);
    return NextResponse.json({ error: '影片上傳初始化失敗。' }, { status: 500 });
  }
}
