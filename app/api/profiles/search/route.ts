import { NextResponse } from 'next/server';
import { getServiceClient, requireUser } from '@/lib/serverAuth';
import {
  escapeIlike,
  getProfileMeta,
  isProfileSearchable,
  normalizeProfileVisibility,
} from '@/lib/server/profileVisibility';

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if ('response' in auth) return auth.response;
  const serviceClient = getServiceClient();
  if (!serviceClient) return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });

  const url = new URL(request.url);
  const query = url.searchParams.get('q')?.trim() || '';
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 20), 1), 50);
  if (query.length < 1 || query.length > 80) return NextResponse.json({ profiles: [] });

  const { data, error } = await serviceClient
    .from('profiles')
    .select('id,username,avatar_url,bio,total_likes,layout_config')
    .ilike('username', `%${escapeIlike(query)}%`)
    .order('username', { ascending: true })
    .limit(limit);
  if (error) return NextResponse.json({ error: 'Profile search failed' }, { status: 503 });

  const profiles = (data || [])
    .filter((profile) => profile.id === auth.user.id || isProfileSearchable(profile.layout_config))
    .map((profile) => {
      const meta = getProfileMeta(profile.layout_config);
      const visibility = normalizeProfileVisibility(meta.visibility);
      const isOwner = profile.id === auth.user.id;
      return {
        username: profile.username,
        avatarUrl: isOwner || visibility.cover ? profile.avatar_url : null,
        bio: isOwner || visibility.bio ? profile.bio || '' : '',
        totalLikes: isOwner || visibility.likes ? Number(profile.total_likes) || 0 : null,
      };
    });

  return NextResponse.json({ profiles });
}
