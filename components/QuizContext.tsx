import { createContext, useContext } from 'react';
import { AXES_INFO, TRAITS_DB, ENDINGS_DB, SCENARIO_GRAPH, CARDS } from '@/lib/quizData';

export const QuizConfigContext = createContext<any>({
  axes: AXES_INFO || {},
  traits: TRAITS_DB || {},
  endings: ENDINGS_DB || [],
  scenarioGraph: SCENARIO_GRAPH || {},
  cards: CARDS || [],
  cardsConfig: { scoreLabels: ['排斥', '無感', '中立', '好奇', '渴望'] },
  resultPage: { labels: {} },
  introPage: {},
  globalAssets: {}
});

export const useQuizConfig = () => {
  const ctx = useContext(QuizConfigContext);
  return {
    axes: ctx?.axes || AXES_INFO || {},
    traits: ctx?.traits || TRAITS_DB || {},
    endings: ctx?.endings || ENDINGS_DB || [],
    scenarioGraph: ctx?.scenarioGraph || SCENARIO_GRAPH || {},
    cards: ctx?.cards || CARDS || [],
    cardsConfig: ctx?.cardsConfig || { scoreLabels: ['排斥', '無感', '中立', '好奇', '渴望'] },
    resultPage: ctx?.resultPage || { labels: {} },
    introPage: ctx?.introPage || {},
    globalAssets: ctx?.globalAssets || {}
  };
};
