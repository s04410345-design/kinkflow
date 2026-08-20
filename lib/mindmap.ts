import type { GraphLink, GraphNode } from '@/lib/types';

export const MINDMAP_V2_ROOT_ID = 'bdsm';
export const MINDMAP_V2_NODE_COUNT = 20;
export const MINDMAP_V2_FIRST_LEVEL_IDS = ['bd', 'ds', 'sm', 'community'] as const;

export type MindmapLevel = 0 | 1 | 2 | 3;

export type MindmapNode = Omit<GraphNode, 'level' | 'parent' | 'crossLinks'> & {
  level: MindmapLevel;
  parent?: string;
  crossLinks: string[];
  isHotTopicHub: boolean;
  allowContentTag: boolean;
};

const sharedFields = {
  crossLinks: [] as string[],
  isHotTopicHub: false,
  allowContentTag: false,
};

export const MINDMAP_V2_NODES: MindmapNode[] = [
  {
    id: 'bdsm',
    level: 0,
    radius: 54,
    color: '#D9B650',
    label: 'BDSM',
    desc: '探索權力交換、身體感受、關係信任與社群文化的入口。',
    image: '/images/bdsm_lobby.png',
    kamonIcon: '/images/totem_bdsm.svg',
    shape: 'plaque',
    ...sharedFields,
  },
  {
    id: 'bd',
    level: 1,
    radius: 44,
    color: '#8F4B3A',
    label: 'BD',
    desc: '束縛、紀律、器具與行為規範的主題入口。',
    parent: 'bdsm',
    image: '/images/bd_art.png',
    kamonIcon: '/images/totem_bd_L0.svg',
    shape: 'hexagon',
    ...sharedFields,
    isHotTopicHub: true,
  },
  {
    id: 'ds',
    level: 1,
    radius: 44,
    color: '#5B7565',
    label: 'DS',
    desc: '支配、臣服、權力流動與關係角色的主題入口。',
    parent: 'bdsm',
    image: '/images/ds_art.png',
    kamonIcon: '/images/totem_ds.svg',
    shape: 'diamond',
    ...sharedFields,
    isHotTopicHub: true,
  },
  {
    id: 'sm',
    level: 1,
    radius: 44,
    color: '#A46B3C',
    label: 'SM',
    desc: '痛覺、衝擊、感官與本能探索的主題入口。',
    parent: 'bdsm',
    image: '/images/sm_art.png',
    kamonIcon: '/images/totem_sm.svg',
    shape: 'drop',
    ...sharedFields,
    isHotTopicHub: true,
  },
  {
    id: 'community',
    level: 1,
    radius: 44,
    color: '#4D7180',
    label: '社群',
    desc: '知情同意、溝通、安全、文化與交流的共同基礎。',
    parent: 'bdsm',
    image: '/images/bdsm_lobby.png',
    kamonIcon: '/images/totem_community.svg',
    shape: 'badge',
    ...sharedFields,
    isHotTopicHub: true,
  },
  {
    id: 'bd_bondage_tools',
    level: 2,
    radius: 34,
    color: '#A9785A',
    label: '束縛與器具',
    desc: '從繩索、束帶到其他拘束工具的分類入口。',
    parent: 'bd',
    image: '/images/bd_art.png',
    kamonIcon: '/images/totem_bd_L1.svg',
    shape: 'octagon',
    ...sharedFields,
    allowContentTag: true,
  },
  {
    id: 'bd_discipline_training',
    level: 2,
    radius: 34,
    color: '#806047',
    label: '紀律與訓練',
    desc: '規則建立、日常訓練與角色內行為約定。',
    parent: 'bd',
    image: '/images/bd_art.png',
    kamonIcon: '/images/totem_bd_L3.svg',
    shape: 'octagon',
    ...sharedFields,
    allowContentTag: true,
  },
  {
    id: 'ds_power_exchange',
    level: 2,
    radius: 34,
    color: '#6E907D',
    label: '權力交換',
    desc: '支配與臣服如何被協議、交接與回應。',
    parent: 'ds',
    image: '/images/ds_art.png',
    kamonIcon: '/images/totem_ds_L1.svg',
    shape: 'diamond',
    ...sharedFields,
    allowContentTag: true,
  },
  {
    id: 'ds_relationship_roles',
    level: 2,
    radius: 34,
    color: '#587460',
    label: '關係與角色',
    desc: '角色定位、關係期待與長期互動的整理入口。',
    parent: 'ds',
    image: '/images/ds_art.png',
    kamonIcon: '/images/totem_ds_L3.svg',
    shape: 'diamond',
    ...sharedFields,
    allowContentTag: true,
  },
  {
    id: 'sm_pain_impact',
    level: 2,
    radius: 34,
    color: '#A9794B',
    label: '痛覺與衝擊',
    desc: '強度、感受與界線溝通的分類入口。',
    parent: 'sm',
    image: '/images/sm_art.png',
    kamonIcon: '/images/totem_sm_L1.svg',
    shape: 'drop',
    ...sharedFields,
    allowContentTag: true,
  },
  {
    id: 'sm_sensory_instinct',
    level: 2,
    radius: 34,
    color: '#8A6A49',
    label: '感官與本能',
    desc: '感官變化、未知感與本能反應的分類入口。',
    parent: 'sm',
    image: '/images/sm_art.png',
    kamonIcon: '/images/totem_sm_L3.svg',
    shape: 'drop',
    ...sharedFields,
    allowContentTag: true,
  },
  {
    id: 'community_safety_communication',
    level: 2,
    radius: 34,
    color: '#547C8B',
    label: '安全與溝通',
    desc: '事前協議、事中確認、界線與事後照護。',
    parent: 'community',
    image: '/images/bdsm_lobby.png',
    kamonIcon: '/images/totem_community_L1.svg',
    shape: 'badge',
    ...sharedFields,
    allowContentTag: true,
  },
  {
    id: 'community_culture_exchange',
    level: 2,
    radius: 34,
    color: '#3E6574',
    label: '文化與交流',
    desc: '社群互動、次文化、角色切換與經驗分享。',
    parent: 'community',
    image: '/images/bdsm_lobby.png',
    kamonIcon: '/images/totem_community_L3.svg',
    shape: 'badge',
    ...sharedFields,
    allowContentTag: true,
  },
  {
    id: 'bd_shibari',
    level: 3,
    radius: 29,
    color: '#B68D70',
    label: '日式繩縛',
    desc: '繩索結構、幾何美學與信任關係的主題。',
    parent: 'bd_bondage_tools',
    image: '/images/bd_art.png',
    kamonIcon: '/images/totem_bd_L2.svg',
    shape: 'circle',
    ...sharedFields,
    allowContentTag: true,
  },
  {
    id: 'bd_rules_behavior',
    level: 3,
    radius: 29,
    color: '#96735B',
    label: '規則與行為訓練',
    desc: '規則、儀式、回饋與可調整的互動習慣。',
    parent: 'bd_discipline_training',
    image: '/images/bd_art.png',
    kamonIcon: '/images/totem_bd_L4.svg',
    shape: 'circle',
    ...sharedFields,
    allowContentTag: true,
  },
  {
    id: 'ds_power_flow',
    level: 3,
    radius: 29,
    color: '#7FA18C',
    label: '權力流動',
    desc: '支配與臣服如何在互動中移動、確認與切換。',
    parent: 'ds_power_exchange',
    image: '/images/ds_art.png',
    kamonIcon: '/images/totem_ds_L2.svg',
    shape: 'circle',
    ...sharedFields,
    allowContentTag: true,
  },
  {
    id: 'ds_ownership_contract',
    level: 3,
    radius: 29,
    color: '#6C8C76',
    label: '所有權與契約',
    desc: '稱呼、信物、契約與長期關係的共識。',
    parent: 'ds_relationship_roles',
    image: '/images/ds_art.png',
    kamonIcon: '/images/totem_ds_L4.svg',
    shape: 'circle',
    ...sharedFields,
    allowContentTag: true,
  },
  {
    id: 'sm_impact_strength',
    level: 3,
    radius: 29,
    color: '#B58B59',
    label: '拍打與強度',
    desc: '強度分級、感受回饋與安全停止條件。',
    parent: 'sm_pain_impact',
    image: '/images/sm_art.png',
    kamonIcon: '/images/totem_sm_L2.svg',
    shape: 'circle',
    ...sharedFields,
    allowContentTag: true,
  },
  {
    id: 'sm_edge_exploration',
    level: 3,
    radius: 29,
    color: '#9D754D',
    label: '邊緣探索',
    desc: '在清楚界線與可退出前提下討論極限感受。',
    parent: 'sm_pain_impact',
    image: '/images/sm_art.png',
    kamonIcon: '/images/totem_sm_L4.svg',
    shape: 'circle',
    ...sharedFields,
    allowContentTag: true,
  },
  {
    id: 'community_safeword_aftercare',
    level: 3,
    radius: 29,
    color: '#6B96A3',
    label: '安全詞與事後照護',
    desc: '安全詞、狀態確認、恢復與事後對話。',
    parent: 'community_safety_communication',
    image: '/images/bdsm_lobby.png',
    kamonIcon: '/images/totem_community_L2.svg',
    shape: 'circle',
    ...sharedFields,
    allowContentTag: true,
  },
];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asLevel(value: unknown): MindmapLevel | null {
  const level = typeof value === 'number' ? value : Number(value);
  return level === 0 || level === 1 || level === 2 || level === 3 ? level : null;
}

export function isMindmapNode(value: unknown): value is MindmapNode {
  const record = asRecord(value);
  return typeof record.id === 'string' && typeof record.label === 'string' && asLevel(record.level) !== null;
}

export function parseMindmapNodes(value: unknown): MindmapNode[] {
  return Array.isArray(value) ? value.filter(isMindmapNode).map((node) => ({
    ...node,
    level: asLevel(node.level) as MindmapLevel,
    crossLinks: Array.isArray(node.crossLinks) ? node.crossLinks.filter((id): id is string => typeof id === 'string') : [],
    isHotTopicHub: node.isHotTopicHub === true,
    allowContentTag: node.allowContentTag === true,
  })) : [];
}

export function validateMindmapNodes(value: unknown): { ok: boolean; nodes: MindmapNode[]; errors: string[] } {
  const nodes = parseMindmapNodes(value);
  const errors: string[] = [];
  const ids = new Set(nodes.map((node) => node.id));

  if (nodes.length !== MINDMAP_V2_NODE_COUNT) errors.push(`節點總數必須是 ${MINDMAP_V2_NODE_COUNT} 個，目前是 ${nodes.length} 個。`);
  if (nodes.filter((node) => node.id === MINDMAP_V2_ROOT_ID && node.level === 0).length !== 1) errors.push('必須有且只有一個 BDSM 0 階根節點。');
  if (MINDMAP_V2_FIRST_LEVEL_IDS.some((id) => !ids.has(id))) errors.push('BD、DS、SM、社群 四個 1 階節點必須全部存在。');

  const levelOneIds = new Set<string>(MINDMAP_V2_FIRST_LEVEL_IDS);
  nodes.forEach((node) => {
    const parent = node.parent;
    if (node.level === 0) {
      if (parent) errors.push(`${node.id} 是 0 階，不能設定 parent。`);
      if (node.allowContentTag || node.isHotTopicHub) errors.push(`${node.id} 的熱門或標籤設定不符合 0 階規則。`);
      return;
    }
    if (!parent || !ids.has(parent)) {
      errors.push(`${node.id} 缺少有效 parent。`);
      return;
    }
    const parentNode = nodes.find((candidate) => candidate.id === parent);
    if (!parentNode || parentNode.level !== node.level - 1) errors.push(`${node.id} 的 parent 層級必須比自己少 1。`);
    if ((node.level === 1) !== levelOneIds.has(node.id)) errors.push(`${node.id} 的 1 階固定節點清單不正確。`);
    if (node.level === 1 && (!node.isHotTopicHub || node.allowContentTag)) errors.push(`${node.id} 必須是熱門統合節點且不可作內容標籤。`);
    if ((node.level === 2 || node.level === 3) && (!node.allowContentTag || node.isHotTopicHub)) errors.push(`${node.id} 必須可作內容標籤且不可作熱門統合節點。`);
  });

  const visited = new Set<string>();
  const visiting = new Set<string>();
  const visit = (id: string) => {
    if (visiting.has(id)) { errors.push(`發現心智圖循環 parent：${id}。`); return; }
    if (visited.has(id)) return;
    visiting.add(id);
    const node = nodes.find((candidate) => candidate.id === id);
    if (node?.parent && ids.has(node.parent)) visit(node.parent);
    visiting.delete(id);
    visited.add(id);
  };
  nodes.forEach((node) => visit(node.id));

  return { ok: errors.length === 0, nodes, errors: [...new Set(errors)] };
}

export function isContentTopicNode(node: Pick<GraphNode, 'level' | 'allowContentTag'>): boolean {
  return (node.level === 2 || node.level === 3) && node.allowContentTag === true;
}

export function getMindmapTopicNodes<T extends Pick<GraphNode, 'level' | 'allowContentTag'>>(nodes: T[]): T[] {
  return nodes.filter(isContentTopicNode);
}

export function getMindmapHotTopicHubs(nodes: MindmapNode[]): MindmapNode[] {
  return nodes.filter((node) => node.level === 1 && node.isHotTopicHub);
}

export function getMindmapNodePath<T extends Pick<GraphNode, 'id' | 'parent'>>(nodes: T[], nodeId: string): T[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const path: T[] = [];
  const visited = new Set<string>();
  let current = byId.get(nodeId);
  while (current && !visited.has(current.id)) {
    path.unshift(current);
    visited.add(current.id);
    current = current.parent ? byId.get(current.parent) : undefined;
  }
  return path;
}

export function getMindmapNodePathLabel<T extends Pick<GraphNode, 'id' | 'label' | 'parent'>>(nodes: T[], nodeId: string): string {
  return getMindmapNodePath(nodes, nodeId).map((node) => node.label).join('／');
}

export function buildMindmapLinks(nodes: Pick<GraphNode, 'id' | 'parent'>[]): GraphLink[] {
  return nodes
    .filter((node): node is Pick<GraphNode, 'id' | 'parent'> & { parent: string } => typeof node.parent === 'string' && node.parent.length > 0)
    .map((node) => ({ source: node.parent, target: node.id }));
}

export function filterValidTopicNodeIds<T extends Pick<GraphNode, 'id' | 'level' | 'allowContentTag'>>(nodes: T[], nodeIds: string[]): string[] {
  const allowedIds = new Set(getMindmapTopicNodes(nodes).map((node) => node.id));
  return [...new Set(nodeIds.filter((nodeId) => allowedIds.has(nodeId)))].slice(0, 3);
}
