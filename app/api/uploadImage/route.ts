import { NextResponse } from 'next/server';
import { getServiceClient, requireUser } from '@/lib/serverAuth';

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const BUCKET_NAME = 'quiz-images';

export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    if ('response' in auth) return auth.response;

    const body = await req.json();
    const { base64, fileName } = body as { base64?: unknown; fileName?: unknown };
    if (typeof base64 !== 'string' || typeof fileName !== 'string') {
      return NextResponse.json({ error: 'Invalid upload parameters' }, { status: 400 });
    }

    const matches = base64.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!matches) {
      return NextResponse.json({ error: 'Only JPEG, PNG and WebP data URLs are allowed' }, { status: 415 });
    }

    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    if (!ALLOWED_MIME_TYPES.has(mimeType) || buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Image must be JPEG, PNG or WebP and no larger than 2 MB' }, { status: 413 });
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
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
