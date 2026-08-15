import { NextResponse } from 'next/server';
import { getServiceClient, requireUser } from '@/lib/serverAuth';

import { checkRateLimit, hasOversizedContent, rateLimitResponse } from '@/lib/server/rateLimit';

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_REQUEST_BYTES = 3 * 1024 * 1024;
const MAX_BASE64_LENGTH = Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 256;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const BUCKET_NAME = 'quiz-images';

function matchesImageSignature(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === 'image/jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === 'image/png') {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  return buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
}

export async function POST(req: Request) {
  const rateLimit = checkRateLimit(req, {
    namespace: 'image-upload',
    limit: 10,
    windowMs: 10 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterSeconds, '圖片上傳過於頻繁，請稍後再試。');
  }

  if (hasOversizedContent(req, MAX_REQUEST_BYTES)) {
    return NextResponse.json({ error: '圖片請求過大。' }, { status: 413 });
  }

  try {
    const auth = await requireUser(req);
    if ('response' in auth) return auth.response;

    const body = await req.json();
    const { base64, fileName } = body as { base64?: unknown; fileName?: unknown };
    if (typeof base64 !== 'string' || typeof fileName !== 'string' || base64.length > MAX_BASE64_LENGTH) {
      return NextResponse.json({ error: 'Invalid upload parameters' }, { status: 400 });
    }

    const matches = base64.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!matches) {
      return NextResponse.json({ error: 'Only JPEG, PNG and WebP data URLs are allowed' }, { status: 415 });
    }

    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    if (!ALLOWED_MIME_TYPES.has(mimeType) || buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES || !matchesImageSignature(buffer, mimeType)) {
      return NextResponse.json({ error: 'Image must be a valid JPEG, PNG or WebP no larger than 2 MB' }, { status: 413 });
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'upload';
    const path = `nodes/${auth.user.id}/${crypto.randomUUID()}-${safeName}`;
    const storageClient = getServiceClient();
    if (!storageClient) {
      return NextResponse.json({ error: 'Storage is not configured' }, { status: 500 });
    }

    const { error: uploadError } = await storageClient.storage
      .from(BUCKET_NAME)
      .upload(path, buffer, { contentType: mimeType, upsert: false });
    if (uploadError) {
      console.error('[uploadImage] storage upload failed:', uploadError.message);
      return NextResponse.json({ error: 'Image upload failed' }, { status: 400 });
    }

    const { data: publicData } = storageClient.storage.from(BUCKET_NAME).getPublicUrl(path);
    return NextResponse.json({ url: publicData.publicUrl });
  } catch (error) {
    console.error('[uploadImage] unexpected error:', error);
    return NextResponse.json({ error: 'Unexpected upload error' }, { status: 500 });
  }
}
