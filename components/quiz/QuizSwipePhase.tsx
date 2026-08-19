import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { QuizSwipeQuestion } from '../../lib/types';
import { useQuizConfig } from '../QuizContext';

interface QuizSwipePhaseProps {
  currentNode: any;
  swipeIdx: number;
  totalSwipes: number;
  isSwipeLeaving: boolean;
  onBack: () => void;
  onSwipe: (choice: { active: number, passive: number }) => void;
  onCancel?: () => void;
}

export function QuizSwipePhase({
  currentNode,
  swipeIdx,
  totalSwipes,
  isSwipeLeaving,
  onBack,
  onSwipe,
  onCancel
}: QuizSwipePhaseProps) {
  const { cardsConfig, globalAssets } = useQuizConfig();
  const cardImg = currentNode.image || currentNode.bgImage || globalAssets?.defaultNodeIcon;
  const [activeScore, setActiveScore] = useState<number | null>(null);
  const [passiveScore, setPassiveScore] = useState<number | null>(null);

  const handleSubmit = useCallback(() => {
    if (activeScore !== null && passiveScore !== null) {
      onSwipe({ active: activeScore, passive: passiveScore });
      // Reset for next node (will happen fast, but just in case)
      setTimeout(() => {
        setActiveScore(null);
        setPassiveScore(null);
      }, 300);
    }
  }, [activeScore, onSwipe, passiveScore]);

  useEffect(() => {
    if (activeScore !== null && passiveScore !== null && !isSwipeLeaving) {
      const timer = setTimeout(() => {
        handleSubmit();
      }, 200); // 短暫延遲讓使用者看到點擊狀態
      return () => clearTimeout(timer);
    }
  }, [activeScore, handleSubmit, isSwipeLeaving, passiveScore]);

  const scoreLabels = cardsConfig?.scoreLabels || ['排斥', '無感', '中立', '好奇', '渴望'];

  return (
    <div className="max-w-xl mx-auto w-full relative px-2 sm:px-0">
      {/* 頂部導航 */}
      <div className="flex items-center justify-between mb-3 sm:mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[#1A1612] font-black transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs sm:text-sm tracking-wider">上一步</span>
        </button>
        <div className="flex items-center gap-3">
          <div className="text-[11px] font-mono font-black text-[#D9B650] tracking-widest bg-white/80 px-2.5 py-0.5 rounded-full border border-[#D1C6B4]/40 shadow-2xs">
            IMAGE {swipeIdx + 1} / {totalSwipes}
          </div>
          {onCancel && (
            <button onClick={onCancel} className="text-[#1A1612] hover:text-red-500 font-bold p-1 cursor-pointer" title="結束測驗">
              ✕
            </button>
          )}
        </div>
      </div>

      <div className={`bg-white rounded-3xl border-2 border-[#D1C6B4]/60 shadow-sm p-4 sm:p-8 transition-all duration-[400ms] ${isSwipeLeaving ? 'opacity-0 translate-y-4 scale-[0.98]' : 'opacity-100 translate-y-0 scale-100'}`}>
        
        {/* 插畫展現區 (手機端精準高度) */}
        <div className="w-full h-36 sm:h-56 bg-[#FDFBF7] rounded-2xl mb-4 sm:mb-6 relative flex items-center justify-center overflow-hidden border border-[#D1C6B4]/40 shadow-inner group">
          {cardImg ? (
            <img
              src={cardImg}
              alt={currentNode.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              crossOrigin="anonymous"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#FDFBF7] text-[#1A1612] font-black text-lg">
              {currentNode.title}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#4A4238]/5 to-transparent mix-blend-multiply" />
        </div>

        <div className="text-center mb-8">
          <h3 className="text-2xl font-black text-[#4A4238] tracking-widest">{currentNode.title}</h3>
          <p className="text-sm text-[#4A4238]/50 mt-2 font-medium">針對這項互動，你的潛意識傾向是？</p>
        </div>

        {/* Rating Controls Container */}
        <div className="bg-[#FDFBF7] border border-[#D1C6B4]/60 p-5 rounded-3xl shadow-sm space-y-6 max-w-lg mx-auto pb-28 sm:pb-8">
          {/* Active Scale */}
          <div>
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-black text-[#D9B650] flex items-center gap-2">
                {currentNode.actKamon ? (
                  currentNode.actKamon.startsWith('http') || currentNode.actKamon.startsWith('/') ? (
                    <img src={currentNode.actKamon} alt="kamon" className="w-6 h-6 object-contain" crossOrigin="anonymous" />
                  ) : (
                    <span className="text-base">{currentNode.actKamon}</span>
                  )
                ) : (
                  <span>👑</span>
                )}
                {currentNode.actTitle}
              </span>
              <span className="text-xs text-[#1A1612] font-bold">1-5分</span>
            </div>
            <div className="flex justify-between gap-1.5 sm:gap-2">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={`active-${val}`}
                  onClick={() => setActiveScore(val)}
                  disabled={isSwipeLeaving}
                  className={`flex-1 py-3 sm:py-4 rounded-xl text-sm sm:text-base font-black border-2 transition-all ${
                    activeScore === val 
                      ? 'bg-[#D9B650] text-white border-[#D9B650] shadow-md scale-105' 
                      : 'bg-white text-[#1A1612] border-[#D1C6B4]/60 hover:border-[#D9B650] hover:bg-[#FDFBF7]'
                  }`}
                  title={scoreLabels[val - 1]}
                >
                  {val}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-[11px] font-bold text-[#4A4238] mt-1.5 px-1">
              <span>完全排斥 (1分)</span>
              <span>極度渴望 (5分)</span>
            </div>
          </div>

          {/* Passive Scale */}
          <div>
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-black text-[#E8C5C8] flex items-center gap-2">
                {currentNode.passKamon ? (
                  currentNode.passKamon.startsWith('http') || currentNode.passKamon.startsWith('/') ? (
                    <img src={currentNode.passKamon} alt="kamon" className="w-6 h-6 object-contain" crossOrigin="anonymous" />
                  ) : (
                    <span className="text-base">{currentNode.passKamon}</span>
                  )
                ) : (
                  <span>🎀</span>
                )}
                {currentNode.passTitle}
              </span>
              <span className="text-xs text-[#1A1612] font-bold">1-5分</span>
            </div>
            <div className="flex justify-between gap-1.5 sm:gap-2">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={`passive-${val}`}
                  onClick={() => setPassiveScore(val)}
                  disabled={isSwipeLeaving}
                  className={`flex-1 py-3 sm:py-4 rounded-xl text-sm sm:text-base font-black border-2 transition-all ${
                    passiveScore === val 
                      ? 'bg-[#E8C5C8] text-white border-[#E8C5C8] shadow-md scale-105' 
                      : 'bg-white text-[#1A1612] border-[#D1C6B4]/60 hover:border-[#E8C5C8] hover:bg-[#FDFBF7]'
                  }`}
                  title={scoreLabels[val - 1]}
                >
                  {val}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-[11px] font-bold text-[#4A4238] mt-1.5 px-1">
              <span>完全排斥 (1分)</span>
              <span>極度渴望 (5分)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
