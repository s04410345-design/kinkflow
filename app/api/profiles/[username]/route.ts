import { NextResponse } from 'next/server';
import { getBearerToken, getServiceClient, requireUser } from '@/lib/serverAuth';
import { mapDiscussionRow, type DiscussionRow } from '@/lib/data/discussions';
import {
  cleanProfileName,
  getProfileMeta,
  isProfileSearchable,
  normalizeProfileVisibility,
} from '@/lib/server/profileVisibility';

type ProfileRow = {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  total_likes: number | null;
  created_at: string;
  layout_config: unknown;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

async function getViewerId(request: Request): Promise<string | null> {
  if (!getBearerToken(request)) return null;
  const auth = await requireUser(request);
  return 'response' in auth ? null : auth.user.id;
}

export async function GET(request: Request, context: { params: Promise<{ username: string }> }) {
  const serviceClient = getServiceClient();
  if (!serviceClient) return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });

  const { username: rawUsername } = await context.params;
  const cleanName = cleanProfileName(decodeURIComponent(rawUsername || ''));
  if (!cleanName || cleanName.length > 80) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const viewerId = await getViewerId(request);
  const candidates = [...new Set([rawUsername, cleanName].filter(Boolean))];
  const { data: profile, error } = await serviceClient
    .from('profiles')
    .select('id,username,avatar_url,bio,total_likes,created_at,layout_config')
    .in('username', candidates)
    .maybeSingle<ProfileRow>();

  if (error || !profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const isOwner = viewerId === profile.id;
  if (!isOwner && !isProfileSearchable(profile.layout_config)) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const meta = getProfileMeta(profile.layout_config);
  const visibility = normalizeProfileVisibility(meta.visibility);
  const canShow = (key: keyof typeof visibility) => isOwner || visibility[key];
  const profileData: Record<string, unknown> = {
    id: profile.id,
    username: profile.username,
    avatarUrl: profile.avatar_url,
    visibility,
    searchable: isProfileSearchable(profile.layout_config),
  };

  if (canShow('cover')) {
    profileData.coverUrl = typeof meta.coverUrl === 'string' ? meta.coverUrl : null;
  } else {
    profileData.coverUrl = null;
  }
  if (canShow('bio')) profileData.bio = profile.bio || '';
  if (canShow('identity')) {
    profileData.gender = typeof meta.gender === 'string' ? meta.gender : 'secret';
    profileData.bdsmRole = typeof meta.bdsmRole === 'string' ? meta.bdsmRole : 'Switch';
  }
  if (canShow('stats')) {
    profileData.joinedAt = profile.created_at;
    profileData.totalComments = 0;
  }
  if (canShow('likes')) profileData.totalLikes = Number.isFinite(profile.total_likes) ? profile.total_likes : 0;

  if (canShow('latestPosts') || canShow('hotPosts') || canShow('stats') || canShow('likes')) {
    const { data: discussionRows } = await serviceClient
      .from('discussions')
      .select('id,node_id,author_id,text,title,body,media,media_url,upvotes,timestamp,created_at,replies,emojis,parent_id,is_hidden,reach_score')
      .eq('author_id', profile.id)
      .eq('is_hidden', false)
      .is('parent_id', null)
      .order('created_at', { ascending: false })
      .limit(100);
    const posts = (discussionRows || [])
      .map((row) => mapDiscussionRow(row as DiscussionRow))
      .filter((post): post is NonNullable<ReturnType<typeof mapDiscussionRow>> => Boolean(post));
    if (canShow('stats')) profileData.totalComments = posts.length;
    if (canShow('likes')) profileData.totalUpvotes = posts.reduce((total, post) => total + (post?.upvotes || 0), 0);
    if (canShow('latestPosts')) profileData.latestPosts = posts.slice(0, 5);
    if (canShow('hotPosts')) {
      profileData.hotPosts = [...posts]
        .sort((left, right) => (right?.upvotes || 0) - (left?.upvotes || 0))
        .slice(0, 5);
    }
  }

  if (canShow('articles')) {
    const { data: articles } = await serviceClient
      .from('articles')
      .select('id,title,slug,excerpt,created_at,updated_at,published_at')
      .eq('author_id', profile.id)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(50);
    profileData.articles = articles || [];
  }

  if (canShow('quizResult')) {
    const quizKey = `user_${cleanProfileName(profile.username)}`;
    const { data: quizRows } = await serviceClient
      .from('quiz_content')
      .select('content')
      .eq('key_name', quizKey)
      .limit(1);
    const content = asRecord(quizRows?.[0]?.content);
    profileData.quizResult = {
      topTrait: asString(content.top_trait) || '尚未測驗',
      scores: content.scores ?? null,
      aiAnalysis: asString(content.aiAnalysis),
    };
  }

  if (canShow('radar')) {
    const quizResult = profileData.quizResult;
    if (!quizResult) profileData.radarAvailable = false;
    else profileData.radarAvailable = true;
  }

  return NextResponse.json({ profile: profileData, isOwner });
}
