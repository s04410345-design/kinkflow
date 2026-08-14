import { useState, useCallback } from 'react';
import { logToSupabase } from '../../lib/constants';
import { getAuthHeaders } from '../../lib/authHeaders';
import { normalizeScores } from '../../lib/scoreUtils';
import type { QuizScores } from '../../lib/types';
import { SCENARIO_GRAPH as DEFAULT_GRAPH, CARDS as DEFAULT_CARDS, TRAITS_DB as DEFAULT_TRAITS } from '../../lib/quizData';

export type QuizPhase = 'select' | 'scenario' | 'scenario_ending' | 'swipe_intro' | 'swipe' | 'result';

export function useQuizEngine(userName: string, showToast: (msg: string) => void, quizConfig?: any) {
  const SCENARIO_GRAPH = quizConfig?.scenarioGraph || DEFAULT_GRAPH;
  const CARDS = quizConfig?.cards || DEFAULT_CARDS;
  const TRAITS_DB = quizConfig?.traits || DEFAULT_TRAITS;
  
  const [phase, setPhase] = useState<QuizPhase>('select');
  const [scenarioHistory, setScenarioHistory] = useState<{ id: string, optScores: Record<string, number>, optionIndex: number }[]>([]);
  const [swipeAnswers, setSwipeAnswers] = useState<{ active: number, passive: number }[]>([]);
  
  const [currentScenarioId, setCurrentScenarioId] = useState('start');
  const [selOpt, setSelOpt] = useState<number | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isSwipeLeaving, setIsSwipeLeaving] = useState(false);

  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Derived scores
  const swipeIdx = swipeAnswers.length;
  const rawScores: QuizScores = {};
  scenarioHistory.forEach(history => {
    Object.entries(history.optScores).forEach(([k, v]) => {
      rawScores[k] = (rawScores[k] || 0) + v;
    });
  });
  swipeAnswers.forEach((ans, idx) => {
    const node = CARDS[idx];
    if (node) {
      node.actImpact.forEach((trait: string) => {
        rawScores[trait] = (rawScores[trait] || 0) + 12 * (ans.active - 1);
      });
      node.passImpact.forEach((trait: string) => {
        rawScores[trait] = (rawScores[trait] || 0) + 12 * (ans.passive - 1);
      });
      if (ans.active >= 4 && ans.passive >= 4) {
        rawScores['switch'] = (rawScores['switch'] || 0) + 15;
      }
    }
  });

  const normalizedScores = normalizeScores(rawScores);

  const startQuiz = () => {
    setScenarioHistory([]);
    setSwipeAnswers([]);
    setCurrentScenarioId('start');
    setPhase('scenario');
    setAiAnalysis('');
  };

  const handleScenarioAns = (opt: any, idx: number) => {
    if (selOpt !== null) return;
    setSelOpt(idx);
    setIsLeaving(true);

    setTimeout(() => {
      setScenarioHistory(prev => [...prev, { id: currentScenarioId, optScores: opt.impacts || {}, optionIndex: idx }]);
      setSelOpt(null);
      setIsLeaving(false);

      if (opt.nextNodeId) {
        if (opt.nextNodeId === 'result') {
          setPhase('scenario_ending');
        } else {
          setCurrentScenarioId(opt.nextNodeId);
        }
      } else {
        setPhase('swipe_intro');
      }
    }, 400);
  };

  const handleScenarioBack = () => {
    if (scenarioHistory.length === 0) return;
    const newHistory = [...scenarioHistory];
    const last = newHistory.pop();
    if (last) {
      setScenarioHistory(newHistory);
      setCurrentScenarioId(last.id);
    }
  };


  const handleSwipe = (choice: { active: number, passive: number }) => {
    if (isSwipeLeaving) return;
    setIsSwipeLeaving(true);
    
    setTimeout(() => {
      setSwipeAnswers(prev => [...prev, choice]);
      setIsSwipeLeaving(false);
      if (swipeIdx + 1 >= CARDS.length) {
        finishQuiz();
      }
    }, 300);
  };

  const handleSwipeBack = () => {
    if (swipeIdx === 0) {
      setPhase('scenario');
      handleScenarioBack();
    } else {
      const newAns = [...swipeAnswers];
      newAns.pop();
      setSwipeAnswers(newAns);
    }
  };

  const generateAiAnalysis = useCallback(async () => {
    if (isAiLoading || aiAnalysis) return;
    setIsAiLoading(true);
    try {
      const topIds = Object.entries(normalizedScores).sort((a, b) => b[1] - a[1]).slice(0, 5).map(i => i[0]);
      let extraHint = '';
      if (topIds.includes('dom') && topIds.includes('sub')) {
        extraHint = '特別提示：這是一位在支配與服從間流動的 Switch (雙屬性)。';
      } else if (topIds.includes('sadist') && topIds.includes('little')) {
        extraHint = '特別提示：這是一位帶有危險病嬌或極大反差萌潛質的探索者。';
      }

      const sorted = Object.entries(normalizedScores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([k, v]) => `${TRAITS_DB[k]?.name || k}: ${v}%`)
        .join(', ');

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [{ role: 'user', text: `這是我（${userName || '無名探索者'}）剛做完的 BDSM 屬性測驗的最高分屬性：${sorted}。${extraHint}請用 100 字以內，彷彿一位隱居都市邊緣、溫柔卻能洞悉人心的茶室主理人，使用現代白話、優美且帶有隱喻的語氣，為我解析專屬的「靈魂印記」評語，並給予一個充滿詩意與神祕感的印記名稱（例如：「凝霜之櫻」、「暗夜流火」）。重要：請將生成的印記名稱使用 Markdown 粗體包裹，例如：**凝霜之櫻**。避免使用文言文，語言要平易近人但深邃。` }], 
          userName, 
          persona: '溫柔主理人' 
        })
      });
      const data = await res.json();
      setAiAnalysis(data.reply);
      try {
        await fetch('/api/saveQuizResult', {
          method: 'POST',
          headers: await getAuthHeaders(),
          body: JSON.stringify({
            scores: normalizedScores,
            topTrait: topIds[0],
            aiAnalysis: data.reply
          })
        });
      } catch (e) {
        console.error('Failed to save quiz result:', e);
      }

    } catch {
      showToast('分析失敗，請稍後再試。');
    } finally {
      setIsAiLoading(false);
    }
  }, [normalizedScores, userName, showToast, isAiLoading, aiAnalysis]);

  const finishQuiz = () => {
    setPhase('result');
    logToSupabase('quiz_completed', { questions_count: Object.keys(SCENARIO_GRAPH).length + CARDS.length });
    generateAiAnalysis();
  };

  return {
    phase,
    setPhase,
    currentScenarioId,
    selOpt,
    isLeaving,
    swipeIdx,
    isSwipeLeaving,
    aiAnalysis,
    isAiLoading,
    normalizedScores,
    scenarioHistory,
    startQuiz,
    handleScenarioAns,
    handleScenarioBack,
    handleSwipe,
    handleSwipeBack,
    generateAiAnalysis
  };
}
