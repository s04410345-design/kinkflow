import { NextResponse } from 'next/server';
import { getServiceClient, requireUser } from '@/lib/serverAuth';

const BUCKET_NAME = 'quiz-images';
const MAX_VIDEO_BYTES = 52_428_800;
const MAX_WIDTH = 1280;
const MAX_HEIGHT = 720;
const MAX_DURATION_SECONDS = 300;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type UploadRow = {
  id: string;
  owner_id: string;
  storage_path: string;
  byte_size: number;
  width: number;
  height: number;
  duration_seconds: number;
  status: 'pending' | 'active' | 'abandoned';
  expires_at: string;
  media_asset_id?: string | null;
};

type StorageObject = {
  name: string;
  metadata?: unknown;
};

function metadataSize(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>).size;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  return null;
}

function metadataMimeType(metadata: unknown): string {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return '';
  const record = metadata as Record<string, unknown>;
  const value = record.mimetype || record.mimeType || record.contentType;
  return typeof value === 'string' ? value.toLowerCase() : '';
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if ('response' in auth) return auth.response;
  const serviceClient = getServiceClient();
  if (!serviceClient) return NextResponse.json({ error: 'Storage 尚未完成設定。' }, { status: 500 });

  try {
    const body = await request.json() as Record<string, unknown>;
    const uploadId = typeof body.uploadId === 'string' ? body.uploadId : '';
    if (!UUID_RE.test(uploadId)) return NextResponse.json({ error: '影片上傳工作不存在。' }, { status: 400 });

    const { data: uploadRow, error: uploadError } = await serviceClient
      .from('video_uploads')
      .select('id,owner_id,storage_path,byte_size,width,height,duration_seconds,status,expires_at,media_asset_id')
      .eq('id', uploadId)
      .eq('owner_id', auth.user.id)
      .maybeSingle();
    if (uploadError || !uploadRow) return NextResponse.json({ error: '影片上傳工作不存在。' }, { status: 404 });

    const upload = uploadRow as UploadRow;
    if (upload.status === 'active' && upload.media_asset_id) {
      const { data: existingAsset } = await serviceClient.from('media_assets').select('id,storage_path').eq('id', upload.media_asset_id).eq('owner_id', auth.user.id).maybeSingle();
      if (existingAsset) {
        const { data: publicData } = serviceClient.storage.from(BUCKET_NAME).getPublicUrl(upload.storage_path);
        return NextResponse.json({ assetId: existingAsset.id, url: publicData.publicUrl, storagePath: upload.storage_path, alreadyConfirmed: true });
      }
    }
    if (upload.status !== 'pending') return NextResponse.json({ error: '這個影片上傳工作已失效。' }, { status: 409 });
    if (new Date(upload.expires_at).getTime() <= Date.now()) return NextResponse.json({ error: '影片上傳連結已過期，請重新上傳。' }, { status: 410 });
    if (upload.byte_size <= 0 || upload.byte_size > MAX_VIDEO_BYTES || upload.width > MAX_WIDTH || upload.height > MAX_HEIGHT || upload.duration_seconds <= 0 || upload.duration_seconds > MAX_DURATION_SECONDS) {
      return NextResponse.json({ error: '影片 metadata 不符合 MP4、720p、50 MB、5 分鐘限制。' }, { status: 400 });
    }

    const pathParts = upload.storage_path.split('/');
    const objectName = pathParts.pop() || '';
    const objectFolder = pathParts.join('/');
    const { data: objectRows, error: objectError } = await serviceClient.storage
      .from(BUCKET_NAME)
      .list(objectFolder, { limit: 5, search: objectName });
    const objectRow = (objectRows || []).find((row) => row.name === objectName);
    if (objectError || !objectRow) return NextResponse.json({ error: '尚未找到影片檔案，請確認上傳已完成後再試。' }, { status: 409 });

    const object = objectRow as StorageObject;
    const actualBytes = metadataSize(object.metadata);
    const actualMimeType = metadataMimeType(object.metadata);
    if (actualBytes !== upload.byte_size || actualBytes <= 0 || actualBytes > MAX_VIDEO_BYTES) {
      return NextResponse.json({ error: '影片檔案大小與上傳宣告不一致，未建立媒體資產。' }, { status: 400 });
    }
    if (actualMimeType && actualMimeType !== 'video/mp4') {
      return NextResponse.json({ error: 'Storage 檔案不是有效的 MP4 MIME。' }, { status: 415 });
    }

    const { data: mediaAsset, error: mediaError } = await serviceClient
      .from('media_assets')
      .insert({
        owner_id: auth.user.id,
        storage_path: upload.storage_path,
        media_type: 'video',
        byte_size: actualBytes,
        width: upload.width,
        height: upload.height,
        duration_seconds: upload.duration_seconds,
        status: 'active',
      })
      .select('id,storage_path,byte_size,width,height,duration_seconds,status')
      .single();
    if (mediaError || !mediaAsset) {
      console.error('[uploadVideo/confirm] media_assets 寫入失敗:', mediaError?.message || 'unknown');
      return NextResponse.json({ error: '影片媒體資產建立失敗，請稍後再試。' }, { status: 503 });
    }

    const { error: lifecycleError } = await serviceClient
      .from('video_uploads')
      .update({ status: 'active', media_asset_id: mediaAsset.id })
      .eq('id', upload.id)
      .eq('owner_id', auth.user.id)
      .eq('status', 'pending');
    if (lifecycleError) {
      console.error('[uploadVideo/confirm] video_uploads 狀態更新失敗:', lifecycleError.message);
      return NextResponse.json({ error: '影片已上傳，但狀態記錄更新失敗，請聯絡管理員。' }, { status: 503 });
    }

    const { data: publicData } = serviceClient.storage.from(BUCKET_NAME).getPublicUrl(upload.storage_path);
    return NextResponse.json({
      assetId: mediaAsset.id,
      url: publicData.publicUrl,
      storagePath: upload.storage_path,
      width: upload.width,
      height: upload.height,
      durationSeconds: upload.duration_seconds,
      byteSize: actualBytes,
    });
  } catch (error) {
    console.error('[uploadVideo/confirm] unexpected error:', error);
    return NextResponse.json({ error: '影片確認失敗。' }, { status: 500 });
  }
}
