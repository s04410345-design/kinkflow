import type * as d3 from 'd3';

// ================= 知識網絡圖 =================
export interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  level: number;
  radius: number;
  color: string;
  label: string;
  desc?: string;
  intro?: string;
  practice?: string;
  hazard?: string;
  first_aid?: string;
  parent?: string;
  safety?: string;
  detail_link?: string;
  image?: string;
  icon?: string;
  kamonIcon?: string;
  colId?: string;
  detail_text?: string;
  crossLinks?: string[];
  /** Only level-1 hubs can aggregate hot topics. */
  isHotTopicHub?: boolean;
  /** Only level-2 and level-3 nodes can be selected as content tags. */
  allowContentTag?: boolean;
  shape?: 'hexagon' | 'octagon' | 'diamond' | 'drop' | 'plaque' | 'circle' | 'triangle' | 'square' | 'star' | 'heart' | 'cloud' | 'cross' | 'badge';
  fx?: number;
  fy?: number;
}

export interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}

// ================= 社群互動 =================
export interface DiscussionMedia {
  type: 'image' | 'gif' | 'video';
  url: string;
  alt?: string;
}

export interface DiscussionPost {
  id: string | number;
  author: string;
  /** 舊版資料仍使用 text；新 UI 優先使用 title/body。 */
  text: string;
  title?: string;
  body?: string;
  media?: DiscussionMedia[];
  upvotes: number;
  timestamp: number | string | null | undefined;
  isHot?: boolean;
  replies?: Reply[];
  emojis?: EmojiCount[];
  nodeName?: string;
  nodeId?: string;
}

export interface Reply {
  id: string | number;
  author: string;
  text: string;
  timestamp?: number;
  upvotes?: number;
  emojis?: EmojiCount[];
}

export interface EmojiCount {
  char: string;
  count: number;
}

// ================= 應用資料 =================
export interface VoteStats {
  need: number;
  like: number;
  curious: number;
  neutral: number;
  nope: number;
  dislike?: number;
}

export interface AppData {
  stats: Record<string, VoteStats>;
  discussions: Record<string, DiscussionPost[]>;
  userVotes: Record<string, string>;
  userUpvotes: Record<string | number, boolean>;
  userEmojis: Record<string, boolean>;
  nodeImages?: Record<string, any>;
}

// ================= 測驗 =================
export type QuizScores = Record<string, number>;

export interface QuizOption {
  text: string;
  scores: QuizScores;
  nextId?: string; // For branching
}

export interface QuizScenarioQuestion {
  id: string;
  type: 'scenario';
  text: string;
  imageUrl?: string;
  title?: string; // 加入 title 屬性
  options: QuizOption[];
  isEnding?: boolean;
}

export interface QuizSwipeQuestion {
  id: string;
  type: 'swipe';
  nodeId: string; // Used to fetch the image, e.g. kamon_{nodeId}.png
  label: string;
  activeScores?: QuizScores; // awarded if user chooses "Active" role (Dom/Top)
  passiveScores?: QuizScores; // awarded if user chooses "Passive" role (Sub/Bottom)
}

export type QuizQuestion = QuizScenarioQuestion | QuizSwipeQuestion;

export type QuizPhase = 'intro' | 'scenario' | 'scenario_ending' | 'swipe_intro' | 'swipe' | 'result';
