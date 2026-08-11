/**
 * ============================================================
 * 🌸 KinkFlow v1 (秋Day) — 模組架構標籤 (Module Tag)
 * 模組 ID  : 2-1, 2-2 (Wave 2 13 夜故事冒險與和風圖卡性向測驗)
 * 路由路徑 : / (性向測驗 Modal)
 * 核心功能 : 13 夜經典日系繪本圖卡問答、分支劇情冒險引擎、8 維 SVG 雷達圖生成與名片印記同步
 * 對應檔案 : components/QuizView.tsx, components/quiz/useQuizEngine.ts
 * ============================================================
 */
'use client';
import { useQuizEngine } from './quiz/useQuizEngine';
import { QuizIntroPhase } from './quiz/QuizIntroPhase';
import { QuizScenarioPhase } from './quiz/QuizScenarioPhase';
import { QuizScenarioEndingPhase } from './quiz/QuizScenarioEndingPhase';
import { QuizSwipePhase } from './quiz/QuizSwipePhase';
import { QuizResultPhase } from './quiz/QuizResultPhase';
import { useQuizConfig } from './QuizContext';

interface QuizViewProps {
  userName: string;
  showToast: (msg: string) => void;
  onCancel?: () => void;
  quizConfig?: any;
}

export default function QuizView({ userName, showToast, onCancel }: QuizViewProps) {
  const quizConfig = useQuizConfig();
  const {
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
  } = useQuizEngine(userName, showToast, quizConfig);

  const currentQ = quizConfig?.scenarioGraph?.[currentScenarioId];
  const currentSwipeNode = quizConfig?.cards?.[swipeIdx];

  return (
    <div className="w-full h-full overflow-y-auto flex justify-center py-4 md:py-12">
      {/* 歡迎畫面 */}
      {phase === 'select' && (
        <QuizIntroPhase onStart={startQuiz} />
      )}

      {/* 情境選擇階段 */}
      {phase === 'scenario' && currentQ && (
        <QuizScenarioPhase
          currentQ={currentQ}
          scenarioHistoryLength={scenarioHistory.length}
          isLeaving={isLeaving}
          selOpt={selOpt}
          onBack={handleScenarioBack}
          onAnswer={handleScenarioAns}
          onCancel={onCancel}
        />
      )}

      {/* 情境結束階段 */}
      {phase === 'scenario_ending' && (
        <QuizScenarioEndingPhase
          scenarioHistory={scenarioHistory}
          onContinue={() => setPhase('swipe_intro')}
        />
      )}

      {/* 圖卡階段前導 */}
      {phase === 'swipe_intro' && (
        <div className="max-w-xl mx-auto w-full animate-fade-in flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="bg-[#FDFBF7] rounded-[40px] border-[3px] border-[#4A4238] p-8 sm:p-12 relative shadow-[4px_6px_0px_0px_rgba(74,66,56,1)] w-full">
            {/* 內裝飾線 */}
            <div className="absolute inset-3 border-[1.5px] border-[#4A4238]/20 rounded-[30px] pointer-events-none" />
            
            <div className="text-center relative z-10">
              <div className="w-16 h-16 mx-auto mb-6 bg-[#4A4238] rounded-full flex items-center justify-center shadow-inner border-[2px] border-[#FDFBF7]">
                <span className="text-2xl">👁️</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-[#4A4238] mb-6 tracking-widest">潛意識圖卡驗證</h3>
              
              <div className="w-12 h-1 bg-[#D9B650] mx-auto mb-6 rounded-full" />
              
              <p className="text-[#4A4238]/70 mb-10 leading-loose font-bold text-sm sm:text-base">
                接下來，我們將跳過邏輯的思考。<br/>
                畫面將連續閃過一系列意象，<br/>
                請憑直覺選擇你對它的渴望程度。<br/><br/>
                <span className="text-[#4A4238]">這能幫助我們捕捉你靈魂深處最真實的印記。</span>
              </p>
              <button 
                onClick={() => setPhase('swipe')}
                className="px-10 py-4 bg-[#4A4238] text-[#FDFBF7] rounded-full font-black hover:-translate-y-1 hover:shadow-[0_6px_15px_rgba(74,66,56,0.3)] transition-all tracking-widest active:translate-y-0 active:shadow-none"
              >
                我準備好了
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 圖卡滑動階段 */}
      {phase === 'swipe' && currentSwipeNode && (
        <QuizSwipePhase
          currentNode={currentSwipeNode}
          swipeIdx={swipeIdx}
          totalSwipes={quizConfig?.cards?.length || 0}
          isSwipeLeaving={isSwipeLeaving}
          onBack={handleSwipeBack}
          onSwipe={handleSwipe}
          onCancel={onCancel}
        />
      )}

      {/* 結果頁階段 */}
      {phase === 'result' && (
        <QuizResultPhase
          scores={normalizedScores}
          aiAnalysis={aiAnalysis}
          isAiLoading={isAiLoading}
          onRestart={() => setPhase('select')}
        />
      )}
    </div>
  );
}
