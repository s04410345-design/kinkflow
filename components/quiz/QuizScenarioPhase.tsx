import { ArrowLeft } from 'lucide-react';
import type { ScenarioNode } from '../../lib/quizData';
import { useQuizConfig } from '../QuizContext';

interface QuizScenarioPhaseProps {
  currentQ: ScenarioNode;
  scenarioHistoryLength: number;
  isLeaving: boolean;
  selOpt: number | null;
  onBack: () => void;
  onAnswer: (opt: any, idx: number) => void;
  onCancel?: () => void;
}

export function QuizScenarioPhase({
  currentQ,
  scenarioHistoryLength,
  isLeaving,
  selOpt,
  onBack,
  onAnswer,
  onCancel
}: QuizScenarioPhaseProps) {
  const { globalAssets } = useQuizConfig();
  const scenarioBg = (currentQ as any).backgroundImage || globalAssets?.defaultScenarioBg;

  return (
    <div className={`max-w-2xl mx-auto w-full transition-all duration-[400ms] px-2 sm:px-0 ${isLeaving ? 'opacity-0 translate-y-4 scale-[0.98]' : 'opacity-100 translate-y-0 scale-100'}`}>
      
      {/* 頂部導航與進度 */}
      <div className="flex items-center justify-between mb-3 sm:mb-6">
        <button
          onClick={onBack}
          disabled={scenarioHistoryLength === 0}
          className="flex items-center gap-1.5 text-[#1A1612] font-black transition-colors disabled:opacity-0 disabled:pointer-events-none cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs sm:text-sm tracking-wider">上一步</span>
        </button>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono font-black text-[#D9B650] tracking-widest bg-white/80 px-2.5 py-0.5 rounded-full border border-[#D1C6B4]/40 shadow-2xs">
            IMAGE {((currentQ as any).stepIndex || 1)} / 13
          </span>
          {onCancel && (
            <button onClick={onCancel} className="text-[#1A1612] hover:text-red-500 font-bold p-1 cursor-pointer" title="結束測驗">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 主卡片 */}
      <div className="bg-[#FDFBF7] rounded-3xl border-2 border-[#D1C6B4]/60 overflow-hidden shadow-sm">
        {scenarioBg && (
          <div className="w-full h-32 sm:h-48 overflow-hidden relative border-b border-[#D1C6B4]/30">
            <img src={scenarioBg} alt="scenario bg" className="w-full h-full object-cover" crossOrigin="anonymous" />
          </div>
        )}

        {/* 題目文字 */}
        <div className="p-5 sm:p-12 bg-white">
          {currentQ.title && (
            <h2 className="text-xl sm:text-3xl text-center text-[#1A1612] font-black tracking-wider mb-4 sm:mb-6">
              {currentQ.title}
            </h2>
          )}
          <p className="text-base sm:text-xl text-[#1A1612] font-bold leading-relaxed mb-6 sm:mb-10 whitespace-pre-wrap text-center">
            {currentQ.desc}
          </p>

          <div className="space-y-3 sm:space-y-4">
            {currentQ.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => onAnswer(opt, idx)}
                disabled={selOpt !== null}
                className={`w-full p-4 sm:p-5 text-left rounded-2xl border-2 transition-all duration-300 cursor-pointer
                  ${selOpt === idx 
                    ? 'border-[#D9B650] bg-[#D9B650]/20 text-[#1A1612] shadow-md scale-[1.02]' 
                    : selOpt !== null
                      ? 'border-[#D1C6B4]/30 text-[#1A1612]/30 bg-gray-50'
                      : 'border-[#D1C6B4]/80 text-[#1A1612] bg-[#FDFBF7] hover:border-[#D9B650] hover:bg-white hover:-translate-y-0.5 hover:shadow-xs'
                  }
                `}
              >
                <span className="block text-sm sm:text-base font-bold leading-relaxed text-[#1A1612]">{opt.text}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
