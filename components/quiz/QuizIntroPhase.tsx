import { useQuizConfig } from '../QuizContext';
import { Sparkles } from 'lucide-react';

export function QuizIntroPhase({ onStart }: { onStart: () => void }) {
  const { introPage, globalAssets } = useQuizConfig();

  const title = introPage?.title || '⛩️ 專屬 BDSM 靈魂印記測驗';
  const subtitle = introPage?.subtitle || '';
  const description = introPage?.description || '這不是枯燥的問卷。這是一場深入潛意識的探索之旅。\n透過情境共鳴與視覺直覺，為您凝聚獨一無二的靈魂印記。';
  const buttonText = introPage?.buttonText || '開始凝聚我的印記';
  const coverImage = introPage?.coverImage || globalAssets?.defaultScenarioBg;

  return (
    <div className="max-w-2xl mx-auto w-full animate-fade-in mt-4 md:mt-12 px-4">
      {coverImage && (
        <div className="w-full aspect-[21/9] sm:aspect-[2.4/1] rounded-3xl overflow-hidden mb-8 border-2 border-[#D1C6B4]/40 shadow-md">
          <img src={coverImage} alt="cover" className="w-full h-full object-cover" crossOrigin="anonymous" />
        </div>
      )}

      <div className="bg-[#FDFBF7] p-6 sm:p-10 rounded-3xl border-2 border-[#D1C6B4]/60 shadow-md text-center mb-8">
        {subtitle && <p className="text-xs font-black text-[#D9B650] tracking-[0.3em] uppercase mb-2">{subtitle}</p>}
        <h2 className="text-2xl sm:text-3xl font-black text-[#1A1612] mb-4 tracking-wide">{title}</h2>
        <p className="text-sm sm:text-base text-[#1A1612] font-bold leading-relaxed max-w-lg mx-auto whitespace-pre-wrap">
          {description}
        </p>
      </div>

      <div className="flex justify-center">
        <button onClick={onStart} className="group relative px-8 py-4 bg-[#D9B650] text-[#1A1612] rounded-full font-black text-lg hover:-translate-y-1 hover:shadow-xl transition-all duration-300 shadow-md cursor-pointer">
          <span className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-[#1A1612]" />
            {buttonText}
          </span>
          <div className="absolute inset-0 border-2 border-white/50 rounded-full scale-110 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300"></div>
        </button>
      </div>
    </div>
  );
}
