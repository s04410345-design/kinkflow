import { supabase } from '@/lib/supabase';

export type MemberProfile = {
  id: string;
  userName: string;
  avatar_url?: string;
  cover_url?: string;
  bio?: string;
  joinedAt: string;
  isRegistered: boolean;
};

export type MemberQuizResult = {
  id: string | number;
  user_name?: string | null;
  user_id?: string | null;
  top_traits?: string[];
  scores?: Record<string, number>;
  created_at?: string | null;
  timestamp?: string | number | null;
};

export type MemberPost = {
  id: string | number;
  author?: string | null;
  text?: string | null;
  body?: string | null;
  node_id?: string | null;
  timestamp?: string | number | null;
  created_at?: string | null;
  upvotes?: number | null;
};

export type AdminMembersData = {
  members: MemberProfile[];
  memberQuizMap: Record<string, MemberQuizResult[]>;
  memberPostsMap: Record<string, MemberPost[]>;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function asDate(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }
  if (typeof value === 'string' && value.trim()) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }
  return undefined;
}

function cleanName(value: string): string {
  return value.replace(/ ☑️/g, '').replace(/ 👻/g, '').trim();
}

function displayName(value: string, registered: boolean): string {
  const clean = cleanName(value);
  if (!clean) return registered ? '未命名會員 ☑️' : '匿名訪客 👻';
  const suffix = registered ? ' ☑️' : ' 👻';
  return clean.endsWith(suffix.trim()) ? clean : `${clean}${suffix}`;
}

function toNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normaliseQuizResult(value: unknown, index: number): MemberQuizResult | null {
  const record = asRecord(value);
  const rawId = record.id;
  const id = typeof rawId === 'string' || typeof rawId === 'number' ? rawId : `quiz-${index}`;
  const scoresRecord = asRecord(record.scores);
  const topTraits = Array.isArray(record.top_traits) ? record.top_traits.filter((item): item is string => typeof item === 'string') : [];
  return {
    id,
    user_name: asString(record.user_name),
    user_id: asString(record.user_id),
    top_traits: topTraits,
    scores: Object.fromEntries(Object.entries(scoresRecord).map(([key, score]) => [key, toNumber(score)])),
    created_at: asDate(record.created_at),
    timestamp: asDate(record.timestamp),
  };
}

function normalisePost(value: unknown, index: number): MemberPost | null {
  const record = asRecord(value);
  const rawId = record.id;
  const id = typeof rawId === 'string' || typeof rawId === 'number' ? rawId : `post-${index}`;
  return {
    id,
    author: asString(record.author),
    text: asString(record.text),
    body: asString(record.body),
    node_id: asString(record.node_id),
    timestamp: typeof record.timestamp === 'number' || typeof record.timestamp === 'string' ? record.timestamp : null,
    created_at: asDate(record.created_at),
    upvotes: toNumber(record.upvotes),
  };
}

function addToMap<T>(map: Record<string, T[]>, key: string | undefined, value: T): void {
  if (!key) return;
  (map[key] ||= []).push(value);
}

function addPostAliases(map: Record<string, MemberPost[]>, author: string, post: MemberPost): void {
  const clean = cleanName(author);
  addToMap(map, author, post);
  addToMap(map, clean, post);
  addToMap(map, `${clean} ☑️`, post);
  addToMap(map, `${clean} 👻`, post);
}

function buildUserContentMap(rows: unknown[]): Record<string, UnknownRecord> {
  const map: Record<string, UnknownRecord> = {};
  rows.forEach((row) => {
    const record = asRecord(row);
    const key = asString(record.key_name);
    if (!key) return;
    const cleanKey = cleanName(key.replace(/^user_/, ''));
    map[cleanKey] = asRecord(record.content);
  });
  return map;
}

export async function fetchAdminMembersData(): Promise<AdminMembersData> {
  const [{ data: profiles, error: profilesError }, { data: discussions, error: discussionsError }, { data: quizResults }, { data: userContents }] = await Promise.all([
    supabase.from('profiles').select('id,username,user_name,name,email,avatar_url,cover_url,bio,intro,created_at,joined_at').limit(5000),
    supabase.from('discussions').select('id,author,text,body,node_id,timestamp,created_at,upvotes').limit(5000),
    supabase.from('quiz_results').select('id,user_id,user_name,top_traits,scores,created_at').limit(5000),
    supabase.from('quiz_content').select('key_name,content').like('key_name', 'user_%').limit(5000),
  ]);
  if (profilesError) throw profilesError;
  if (discussionsError) throw discussionsError;

  const contentMap = buildUserContentMap(userContents || []);
  const memberPostsMap: Record<string, MemberPost[]> = {};
  (discussions || []).map(normalisePost).filter((post): post is MemberPost => post !== null).forEach((post) => {
    if (post.author) addPostAliases(memberPostsMap, post.author, post);
  });

  const memberQuizMap: Record<string, MemberQuizResult[]> = {};
  (quizResults || []).map(normaliseQuizResult).filter((result): result is MemberQuizResult => result !== null).forEach((result) => {
    const key = result.user_name || result.user_id;
    if (!key) return;
    addToMap(memberQuizMap, key, result);
    addToMap(memberQuizMap, cleanName(key), result);
    addToMap(memberQuizMap, `${cleanName(key)} ☑️`, result);
    addToMap(memberQuizMap, `${cleanName(key)} 👻`, result);
  });

  const seenNames = new Set<string>();
  const members: MemberProfile[] = [];
  (profiles || []).forEach((row) => {
    const record = asRecord(row);
    const rawName = asString(record.username) || asString(record.user_name) || asString(record.name) || asString(record.email)?.split('@')[0] || `會員_${asString(record.id)?.slice(0, 6) || 'unknown'}`;
    const clean = cleanName(rawName);
    if (seenNames.has(clean)) return;
    seenNames.add(clean);
    const content = contentMap[clean] || {};
    const id = asString(record.id) || `profile-${members.length}`;
    members.push({
      id,
      userName: displayName(clean, true),
      avatar_url: asString(record.avatar_url) || asString(content.avatarUrl),
      cover_url: asString(record.cover_url) || asString(content.coverUrl),
      bio: asString(record.bio) || asString(record.intro) || asString(content.bio),
      joinedAt: asDate(record.created_at) || asDate(record.joined_at) || new Date(0).toISOString(),
      isRegistered: true,
    });
  });

  Object.entries(memberPostsMap).forEach(([authorName, posts]) => {
    const clean = cleanName(authorName);
    if (!clean || seenNames.has(clean)) return;
    seenNames.add(clean);
    const content = contentMap[clean] || {};
    const firstPost = posts[0];
    members.push({
      id: `guest_${clean}`,
      userName: displayName(clean, false),
      avatar_url: asString(content.avatarUrl),
      cover_url: asString(content.coverUrl),
      bio: asString(content.bio),
      joinedAt: asDate(firstPost?.created_at) || asDate(firstPost?.timestamp) || new Date(0).toISOString(),
      isRegistered: false,
    });
  });

  return { members, memberQuizMap, memberPostsMap };
}
