import { SCENARIO_GRAPH, CARDS, TRAITS_DB } from './quizData';
import type { QuizScores } from './types';

/**
 * 計算每個屬性在測驗中可能獲得的「最高分數」。
 * 這是用來做「分數常態化 (Normalization)」的關鍵，
 * 因為不同屬性在題庫中出現的頻率與最高給分都不同。
 */
export const MAX_ARCHETYPE_SCORES: Record<string, number> = (() => {
  const maxScores: Record<string, number> = {};

  // 初始化所有 trait 為 0
  Object.keys(TRAITS_DB).forEach(k => maxScores[k] = 0);

  // 1. 計算 CARDS (Phase 2) 的最高分
  // 假設每個卡片玩家都可以拉到 5 分（即 +4 * 12 = 48 分的影響，但我先用一個標準單位）
  // 為了精確，我們直接抓取組件實際計算的權重： (5-1) * 12 = +48
  CARDS.forEach(card => {
    // switch 最高可得 15 分額外加成 (當 Act>=4, Pass>=4)
    maxScores['switch'] += 15;

    // active 選擇 5 時，每個 actImpact 特質可得 48 分
    card.actImpact.forEach(trait => {
      maxScores[trait] = (maxScores[trait] || 0) + 48;
    });
    // passive 選擇 5 時，每個 passImpact 特質可得 48 分
    card.passImpact.forEach(trait => {
      maxScores[trait] = (maxScores[trait] || 0) + 48;
    });
  });

  // 2. 計算 Scenario Phase (Phase 1) 的最高分
  // 使用 DFS 找出所有可能路徑中，每個屬性能獲得的最大分數。
  const maxScoresForArchetypes: Record<string, number> = {};

  const dfs = (nodeId: string, currentScores: Record<string, number>) => {
    const node = SCENARIO_GRAPH[nodeId];
    if (!node || !node.options || node.options.length === 0) {
      // 找不到節點或是結局節點，結算當前路徑的最高分
      Object.entries(currentScores).forEach(([k, v]) => {
        maxScoresForArchetypes[k] = Math.max(maxScoresForArchetypes[k] || 0, v);
      });
      return;
    }

    // 走訪每一個選項分支
    node.options.forEach(opt => {
      const nextScores = { ...currentScores };
      Object.entries(opt.impacts || {}).forEach(([k, v]) => {
        nextScores[k] = (nextScores[k] || 0) + (v as number);
      });
      
      if (opt.nextNodeId && opt.nextNodeId !== 'result') {
        dfs(opt.nextNodeId, nextScores);
      } else {
        // 如果這個選項指向了測驗結束 (result)，則結算
        Object.entries(nextScores).forEach(([k, v]) => {
          maxScoresForArchetypes[k] = Math.max(maxScoresForArchetypes[k] || 0, v);
        });
      }
    });
  };

  // 從起點開始搜尋
  dfs('start', {});

  // 3. 將 Phase 1 的最高分與 Phase 2 的最高分合併
  Object.keys(maxScoresForArchetypes).forEach(k => {
    maxScores[k] = (maxScores[k] || 0) + maxScoresForArchetypes[k];
  });

  return maxScores;
})();

/**
 * 將使用者的絕對分數常態化為 0~100 的百分比
 */
export const normalizeScores = (rawScores: QuizScores): Record<string, number> => {
  const normalized: Record<string, number> = {};
  
  Object.entries(rawScores).forEach(([k, v]) => {
    // 加上基礎分避免全 0 太難看 (如 v7 邏輯： baseline = 5 + length % 10)
    // 這裡我們只簡單將計算出的分數 / MAX，如果超過 100 則限制在 100
    const maxScore = MAX_ARCHETYPE_SCORES[k] || 1; 
    normalized[k] = Math.min(100, Math.round(((v || 0) / maxScore) * 100));
  });

  return normalized;
};
