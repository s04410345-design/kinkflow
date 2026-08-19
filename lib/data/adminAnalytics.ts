import { supabase } from '@/lib/supabase';
import { AXES_INFO, TRAITS_DB } from '@/lib/quizData';
import type { GraphNode } from '@/lib/types';

export type AnalyticsLog = {
  id: string | number;
  created_at: string;
  action_type: string;
  details: Record<string, unknown>;
  device_id?: string | null;
  user_id?: string | null;
  user_name?: string | null;
};

export type AnalyticsQuizResult = {
  id: string | number;
  user_name: string;
  scores: Record<string, number>;
  top_traits: string[];
  created_at: string;
};

export type AnalyticsDiscussion = {
  id: string | number;
  node_id?: string;
  author?: string;
  text?: string;
  timestamp?: number | string | null;
  created_at?: string | null;
};

export type AnalyticsFeedback = {
  id: string | number;
  author: string;
  authorName: string;
  content: string;
  created_at: string;
};

export type VoteBreakdown = {
  need: number;
  like: number;
  curious: number;
  neutral: number;
  nope: number;
};

export type AdminAnalyticsData = {
  logs: AnalyticsLog[];
  quizResults: AnalyticsQuizResult[];
  feedbackList: AnalyticsFeedback[];
  discussions: AnalyticsDiscussion[];
  nodeStatsContent: Record<string, VoteBreakdown>;
  mindmapNodes: GraphNode[];
};

export type ActivityTimeframe = 'today' | 'week' | 'all';

export type QuizChartItem = {
  name: string;
  value?: number;
  scoreSum?: number;
  percentage: number;
  color: string;
  id?: string;
  icon?: string;
};

export type TreeVoteItem = {
  id: string;
  label: string;
  parent?: string;
  level: number;
  likeCount: number;
  neutralCount: number;
  nopeCount: number;
  total: number;
  likePct: number;
  neutralPct: number;
  nopePct: number;
};

export type ActivityStats = {
  visitors: number;
  comments: number;
  votes: number;
  quizzes: number;
};

export const AXES_COLOR_MAP: Record<string, { name: string; color: string }> = {
  dom_sub: { name: '支配 / 服從 (Dom & Sub)', color: '#D9B650' },
  rigger_tied: { name: '繩縛 / 被縛 (Rigger & Tied)', color: '#C5D4B6' },
  sadist_maso: { name: '施痛 / 承受 (Sadist & Maso)', color: '#E08A8A' },
  roleplay: { name: '角色 / 身份演繹', color: '#B6C4D4' },
  mind_control: { name: '心智 / 控制與催眠', color: '#9B8265' },
  sensory: { name: '感官 / 剝奪與剝離', color: '#7F1D1D' },
  pet: { name: '寵物 / 馴養關係', color: '#E8C5C8' },
  humiliation: { name: '羞辱 / 精神標記', color: '#0F766E' },
  fetish: { name: '戀物 / 道具癖好', color: '#1E3A8A' },
  aftercare: { name: '撫慰 / 餘溫關懷', color: '#4A4238' },
};

export const FIVE_CATS = [
  { key: 'Dom', name: 'Dom 支配系', color: '#D9B650', keys: ['dom', 'rigger', 'sadist', 'master', 'top'] },
  { key: 'Sub', name: 'Sub 服從系', color: '#E8C5C8', keys: ['sub', 'tied', 'maso', 'slave', 'bottom', 'prey'] },
  { key: 'Sadist', name: 'Sadist 施痛系', color: '#E08A8A', keys: ['sadist', 'tormentor'] },
  { key: 'Maso', name: 'Maso 承受系', color: '#C5D4B6', keys: ['maso', 'prey'] },
  { key: 'Switch', name: 'Switch 雙向與多元', color: '#B6C4D4', keys: ['switch', 'versatile', 'curious'] },
];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asScores(value: unknown): Record<string, number> {
  const record = asRecord(value);
  return Object.fromEntries(Object.entries(record).map(([key, score]) => [key, asNumber(score)]));
}

function asVoteBreakdown(value: unknown): VoteBreakdown {
  const record = asRecord(value);
  return {
    need: asNumber(record.need),
    like: asNumber(record.like),
    curious: asNumber(record.curious),
    neutral: asNumber(record.neutral),
    nope: asNumber(record.nope ?? record.dislike),
  };
}

function asDateString(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (typeof value === 'string' && value.trim()) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}

function logDetails(row: Record<string, unknown>): Record<string, unknown> {
  const details = asRecord(row.details);
  if (Object.keys(details).length > 0) return details;
  return asRecord(row.metadata_json);
}

function parseLog(row: unknown, index: number): AnalyticsLog | null {
  const record = asRecord(row);
  const createdAt = asDateString(record.created_at);
  const actionType = asString(record.action_type);
  if (!createdAt || !actionType) return null;
  const rawId = record.id;
  const id = typeof rawId === 'string' || typeof rawId === 'number' ? rawId : `log-${index}`;
  return {
    id,
    created_at: createdAt,
    action_type: actionType,
    details: logDetails(record),
    device_id: typeof record.device_id === 'string' ? record.device_id : null,
    user_id: typeof record.user_id === 'string' ? record.user_id : null,
    user_name: typeof record.user_name === 'string' ? record.user_name : null,
  };
}

function parseDiscussion(row: unknown, index: number, authorNames: Map<string, string>): AnalyticsDiscussion | null {
  const record = asRecord(row);
  const rawId = record.id;
  const id = typeof rawId === 'string' || typeof rawId === 'number' ? rawId : `discussion-${index}`;
  const authorId = typeof record.author_id === 'string' ? record.author_id : '';
  const createdAt = typeof record.created_at === 'string' ? record.created_at : null;
  return {
    id,
    node_id: typeof record.node_id === 'string' ? record.node_id : undefined,
    author: authorNames.get(authorId) || (authorId ? `會員 ${authorId.slice(0, 8)}` : undefined),
    text: typeof record.text === 'string' ? record.text : undefined,
    timestamp: createdAt,
    created_at: createdAt,
  };
}

function extractLogUserName(log: AnalyticsLog): string | undefined {
  const name = log.details.userName ?? log.details.author ?? log.user_name;
  return typeof name === 'string' && !['匿名訪客', '匿名', 'null', 'undefined'].includes(name) ? name : undefined;
}

function parseQuizResults(logs: AnalyticsLog[]): AnalyticsQuizResult[] {
  const quizActions = new Set(['quiz_ai_analysis', 'quiz_result', 'quiz_complete', 'quiz_completed']);
  return logs.flatMap((log) => {
    const details = log.details;
    const scores = asScores(details.scores);
    if (!quizActions.has(log.action_type) || Object.keys(scores).length === 0) return [];
    const topTrait = typeof details.top_trait === 'string' ? details.top_trait : Object.keys(scores)[0] || 'dom';
    return [{
      id: log.id,
      user_name: extractLogUserName(log) || '訪客',
      scores,
      top_traits: [topTrait],
      created_at: log.created_at,
    }];
  });
}

function parseMindmapNodes(value: unknown): GraphNode[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is GraphNode => {
    const record = asRecord(item);
    return typeof record.id === 'string' && typeof record.label === 'string';
  });
}

function buildFeedbackList(logs: AnalyticsLog[], discussions: AnalyticsDiscussion[]): AnalyticsFeedback[] {
  const feedbackFromLogs: AnalyticsFeedback[] = logs.flatMap((log) => {
    if (!['author_message', 'feedback'].includes(log.action_type)) return [];
    const content = log.details.message ?? log.details.content;
    if (typeof content !== 'string' || !content.trim()) return [];
    const author = extractLogUserName(log) || '匿名訪客';
    return [{ id: log.id, author, authorName: author, content: content.trim(), created_at: log.created_at }];
  });

  const feedbackFromDiscussions: AnalyticsFeedback[] = discussions.flatMap((discussion) => {
    const text = discussion.text || '';
    if (!['author_feedback', 'author_message'].includes(discussion.node_id || '') && !text.startsWith('【給作者的話】')) return [];
    const createdAt = asDateString(discussion.timestamp) || discussion.created_at;
    if (!createdAt || !text.trim()) return [];
    const author = discussion.author || '匿名訪客';
    return [{
      id: discussion.id,
      author,
      authorName: author,
      content: text.replace('【給作者的話】', '').trim(),
      created_at: createdAt,
    }];
  });

  const sorted = [...feedbackFromLogs, ...feedbackFromDiscussions].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const seen = new Set<string>();
  const timeToUser = new Map<number, string>();
  logs.forEach((log) => {
    const name = extractLogUserName(log);
    if (name) timeToUser.set(Date.parse(log.created_at), name);
  });

  return sorted.flatMap((item) => {
    const key = item.content.trim();
    if (!key || seen.has(key)) return [];
    seen.add(key);
    if (item.authorName !== '匿名訪客') return [item];
    const itemTime = Date.parse(item.created_at);
    const matched = [...timeToUser.entries()].find(([time]) => Math.abs(time - itemTime) < 5 * 60 * 1000);
    return [{ ...item, authorName: matched?.[1] || item.authorName }];
  });
}

export async function fetchAdminAnalyticsData(): Promise<AdminAnalyticsData> {
  const [{ data: logRows, error: logError }, { data: contentRows, error: contentError }, { data: discussionRows, error: discussionError }, { data: profileRows, error: profileError }] = await Promise.all([
    supabase.from('visitor_logs').select('*').order('created_at', { ascending: false }).limit(5000),
    supabase.from('quiz_content').select('key_name,content').limit(2000),
    supabase.from('discussions').select('id,node_id,author_id,text,media_url,parent_id,is_hidden,reach_score,created_at').limit(5000),
    supabase.from('profiles').select('id,username').limit(5000),
  ]);
  if (logError) throw logError;
  if (contentError) throw contentError;
  if (discussionError) throw discussionError;
  if (profileError) throw profileError;

  const authorNames = new Map((profileRows || []).map((profile) => [String(profile.id), typeof profile.username === 'string' ? profile.username : '匿名']));
  const logs = (logRows || []).map(parseLog).filter((log): log is AnalyticsLog => log !== null);
  const discussions = (discussionRows || []).map((row, index) => parseDiscussion(row, index, authorNames)).filter((item): item is AnalyticsDiscussion => item !== null);
  const nodeStatsContent: Record<string, VoteBreakdown> = {};
  let mindmapNodes: GraphNode[] = [];

  (contentRows || []).forEach((row) => {
    const record = asRecord(row);
    const keyName = asString(record.key_name);
    if (keyName === 'quiz_node_stats' || keyName === 'node_stats') {
      Object.entries(asRecord(record.content)).forEach(([nodeId, stats]) => {
        nodeStatsContent[nodeId] = asVoteBreakdown(stats);
      });
    }
    if (keyName === 'mindmap_data') mindmapNodes = parseMindmapNodes(record.content);
  });

  const quizResults = parseQuizResults(logs);
  return {
    logs,
    quizResults,
    feedbackList: buildFeedbackList(logs, discussions),
    discussions,
    nodeStatsContent,
    mindmapNodes,
  };
}

export function buildQuizChartData(quizResults: AnalyticsQuizResult[]) {
  const traitScores: Record<string, number> = {};
  const axisScores: Record<string, number> = {};
  let totalSum = 0;

  quizResults.forEach((result) => {
    Object.entries(result.scores).forEach(([traitId, score]) => {
      const value = asNumber(score);
      if (value <= 0) return;
      traitScores[traitId] = (traitScores[traitId] || 0) + value;
      totalSum += value;
      const traitMeta = asRecord(TRAITS_DB[traitId]);
      const axisId = asString(traitMeta.axis, traitId.split('_')[0] || 'other');
      axisScores[axisId] = (axisScores[axisId] || 0) + value;
    });
  });

  const fiveCatValues: Record<string, number> = { Dom: 0, Sub: 0, Sadist: 0, Maso: 0, Switch: 0 };
  Object.entries(traitScores).forEach(([traitId, sum]) => {
    const matched = FIVE_CATS.some((category) => {
      if (!category.keys.some((key) => traitId.toLowerCase().includes(key))) return false;
      fiveCatValues[category.key] += sum;
      return true;
    });
    if (!matched) fiveCatValues.Switch += sum;
  });

  const fiveCategoriesData: QuizChartItem[] = FIVE_CATS.map((category) => ({
    name: category.name,
    value: fiveCatValues[category.key],
    percentage: totalSum > 0 ? Number(((fiveCatValues[category.key] / totalSum) * 100).toFixed(1)) : 0,
    color: category.color,
  }));

  const traitList: QuizChartItem[] = Object.entries(traitScores).map(([id, scoreSum]) => {
    const meta = asRecord(TRAITS_DB[id]);
    const axisMeta = AXES_COLOR_MAP[asString(meta.axis)] || { name: id, color: '#D9B650' };
    return {
      id,
      name: asString(meta.name, id),
      scoreSum,
      percentage: totalSum > 0 ? Number(((scoreSum / totalSum) * 100).toFixed(1)) : 0,
      color: axisMeta.color,
      icon: asString(meta.icon, '✨'),
    };
  }).sort((a, b) => (b.scoreSum || 0) - (a.scoreSum || 0));

  const tenAxesData: QuizChartItem[] = (AXES_INFO || []).map((axis) => {
    const axisRecord = asRecord(axis);
    const id = asString(axisRecord.id);
    const value = axisScores[id] || 0;
    const meta = AXES_COLOR_MAP[id] || { name: asString(axisRecord.name, id), color: asString(axisRecord.color, '#D9B650') };
    return {
      id,
      name: asString(axisRecord.name, meta.name),
      scoreSum: value,
      percentage: totalSum > 0 ? Number(((value / totalSum) * 100).toFixed(1)) : 0,
      color: meta.color,
    };
  }).sort((a, b) => (b.scoreSum || 0) - (a.scoreSum || 0));

  return {
    fiveCategoriesData,
    top10Popular: traitList.slice(0, 10),
    bottom10Unpopular: [...traitList].reverse().slice(0, 10),
    tenAxesData,
  };
}

export function buildTreeVoteData(input: Pick<AdminAnalyticsData, 'nodeStatsContent' | 'logs' | 'mindmapNodes'>): TreeVoteItem[] {
  const rawMap: Record<string, VoteBreakdown> = { ...input.nodeStatsContent };
  const seenLog = new Set<string>();
  input.logs.forEach((log) => {
    if (!['vote', 'node_vote'].includes(log.action_type)) return;
    const nodeId = log.details.node_id;
    if (typeof nodeId !== 'string' || !nodeId) return;
    const userKey = `${log.device_id || extractLogUserName(log) || log.user_id || 'guest'}_${nodeId}`;
    if (seenLog.has(userKey)) return;
    seenLog.add(userKey);
    const voteType = asString(log.details.vote_type, 'like');
    const current = rawMap[nodeId] || asVoteBreakdown({});
    if (voteType === 'need') current.need += 1;
    else if (voteType === 'like') current.like += 1;
    else if (voteType === 'curious') current.curious += 1;
    else if (voteType === 'nope') current.nope += 1;
    else current.neutral += 1;
    rawMap[nodeId] = current;
  });

  const nodes = input.mindmapNodes.length > 0 ? input.mindmapNodes : [
    { id: 'bdsm', label: 'BDSM 大廳', parent: null, level: 0 },
    { id: 'bondage', label: '繩縛與束縛', parent: 'bdsm', level: 1 },
    { id: 'spanking', label: '打屁股與體罰', parent: 'bdsm', level: 1 },
    { id: 'domination', label: '支配與服從', parent: 'bdsm', level: 1 },
  ] as GraphNode[];
  const childrenMap: Record<string, GraphNode[]> = {};
  const roots: GraphNode[] = [];
  nodes.forEach((node) => {
    if (!node.parent) roots.push(node);
    else (childrenMap[node.parent] ||= []).push(node);
  });

  const result: TreeVoteItem[] = [];
  const traverse = (node: GraphNode, level: number) => {
    const stats = rawMap[node.id] || asVoteBreakdown({});
    const likeCount = stats.need + stats.like;
    const neutralCount = stats.curious + stats.neutral;
    const total = likeCount + neutralCount + stats.nope;
    result.push({
      id: node.id,
      label: node.label || node.id,
      parent: node.parent,
      level,
      likeCount,
      neutralCount,
      nopeCount: stats.nope,
      total,
      likePct: total > 0 ? Math.round((likeCount / total) * 100) : 0,
      neutralPct: total > 0 ? Math.round((neutralCount / total) * 100) : 0,
      nopePct: total > 0 ? Math.round((stats.nope / total) * 100) : 0,
    });
    (childrenMap[node.id] || []).forEach((child) => traverse(child, level + 1));
  };
  roots.forEach((root) => traverse(root, 0));
  const visited = new Set(result.map((item) => item.id));
  nodes.forEach((node) => {
    if (!visited.has(node.id)) traverse(node, 1);
  });
  return result;
}

function timeValue(value: number | string | null | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

export function buildActivityStats(input: { logs: AnalyticsLog[]; discussions: AnalyticsDiscussion[]; quizResults: AnalyticsQuizResult[]; timeframe: ActivityTimeframe }): ActivityStats {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).getTime();
  const isTarget = (value: number | string | null | undefined) => {
    const time = timeValue(value);
    if (time === null) return false;
    if (input.timeframe === 'today') return time >= startOfToday;
    if (input.timeframe === 'week') return time >= startOfWeek;
    return true;
  };

  const visitors = new Set<string>();
  input.logs.filter((log) => isTarget(log.created_at)).forEach((log) => {
    const id = extractLogUserName(log) || log.device_id || log.user_id;
    if (id) visitors.add(id);
  });
  const comments = input.discussions.filter((discussion) => isTarget(discussion.timestamp || discussion.created_at)).length;
  const votes = input.logs.filter((log) => isTarget(log.created_at) && ['vote', 'node_vote'].includes(log.action_type)).length;
  const quizzes = input.quizResults.filter((result) => isTarget(result.created_at)).length;
  return { visitors: visitors.size || (input.timeframe === 'all' ? 1 : 0), comments, votes, quizzes };
}
