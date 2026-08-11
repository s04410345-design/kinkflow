import { useQuizConfig } from '../QuizContext';
import { Play } from 'lucide-react';
import Image from 'next/image';

interface QuizScenarioEndingPhaseProps {
  scenarioHistory: { id: string, optScores: Record<string, number>, optionIndex: number }[];
  onContinue: () => void;
}

export function QuizScenarioEndingPhase({ scenarioHistory, onContinue }: QuizScenarioEndingPhaseProps) {
  const { endings, traits, globalAssets } = useQuizConfig();
  
  // 計算前 6 題累積的最高分特質與 Axis
  const traitScores: Record<string, number> = {};
  const axisScores: Record<string, number> = {};
  
  scenarioHistory.forEach(history => {
    Object.entries(history.optScores).forEach(([key, value]) => {
      if (traits[key]) {
        traitScores[key] = (traitScores[key] || 0) + value;
        const axis = traits[key].axis;
        if (axis) axisScores[axis] = (axisScores[axis] || 0) + value;
      } else {
        axisScores[key] = (axisScores[key] || 0) + value;
      }
    });
  });

  const topTraitId = Object.keys(traitScores).sort((a, b) => traitScores[b] - traitScores[a])[0] || '';
  const topAxis = Object.keys(axisScores).sort((a, b) => axisScores[b] - axisScores[a])[0] || '';

  // 全後台驅動比對：1. 特質匹配 2. 軸心匹配 3. 後台定義的第一筆結局
  const ending = (endings || []).find((e: any) =>
    Array.isArray(e.triggerTraits) && e.triggerTraits.length > 0 && (e.triggerTraits.includes(topTraitId) || e.triggerTraits.includes(topAxis))
  ) || (endings && endings[0]) || { title: '終局', subtitle: '', image: '', commentary: '' };

  const endingImage = ending.image || globalAssets?.defaultEndingImg;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8 animate-fade-in relative z-10 flex flex-col items-center justify-start min-h-[60vh]">
      <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 sm:p-12 border-2 border-[#D1C6B4]/50 shadow-xl relative w-full text-center">
        {/* 背景裝飾 */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#D9B650]/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#E8C5C8]/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <span className="text-[#D9B650] font-bold text-sm tracking-[0.3em] mb-4 block">
          第一幕 終局
        </span>
        
        <h2 className="text-3xl sm:text-4xl font-black text-[#4A4238] tracking-widest mb-2">
          {ending.title}
        </h2>
        
        <div className="text-[#4A4238]/60 text-sm tracking-[0.2em] uppercase mb-6 font-semibold">
          {ending.subtitle}
        </div>

        {/* 結局意象圖片 */}
        <div className="w-full aspect-[16/9] relative mb-8 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-4 border-white">
          {endingImage ? (
            <img 
              src={endingImage} 
              alt={ending.title || ''} 
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
            />
          ) : (
            <div className="w-full h-full bg-[#F5EFE6] flex items-center justify-center text-[#4A4238]/30 font-bold">
              {ending.title}
            </div>
          )}
        </div>

        <div className="w-16 h-1 bg-[#D9B650] mx-auto rounded-full mb-8" />

        <p className="text-[#4A4238]/80 text-base sm:text-lg leading-relaxed tracking-wide mb-12 italic text-left sm:text-center">
          {ending.commentary}
        </p>

        <button
          onClick={onContinue}
          className="group relative inline-flex items-center justify-center gap-3 bg-[#4A4238] text-white px-8 py-4 rounded-full font-bold tracking-widest hover:bg-[#D9B650] hover:-translate-y-1 transition-all duration-300 shadow-lg hover:shadow-xl w-full sm:w-auto"
        >
          <span>閉上雙眼，進入潛意識深處</span>
          <Play className="w-4 h-4 fill-current group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
