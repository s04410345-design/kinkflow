import { useMemo, useRef, useState } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, PolarRadiusAxis } from 'recharts';
import { Share2, RotateCcw } from 'lucide-react';
import html2canvas from 'html2canvas';
import type { QuizScores } from '../../lib/types';
import { useQuizConfig } from '../QuizContext';

interface QuizResultPhaseProps {
  scores: QuizScores;
  aiAnalysis: string;
  isAiLoading: boolean;
  onRestart: () => void;
}

function CustomRadarTick({ payload, x, y, cx, cy }: any) {
  const isTop = y < cy - 40;
  const isBottom = y > cy + 40;
  const val = payload.value;
  
  // 依據主動 / 被動 / 中立給予專屬質感色彩
  let fill = '#4A4238';
  if (['支配統御', '施虐破壞', '掌控束縛', '照顧保護'].some(k => val.includes(k))) {
    fill = '#7F1D1D'; // 主動：深紅棕
  } else if (['臣服侍奉', '受縛物化', '承受痛苦', '撒嬌依賴'].some(k => val.includes(k))) {
    fill = '#1E3A8A'; // 被動：深藍
  } else {
    fill = '#0F766E'; // 中立：青綠
  }
  
  return (
    <g transform={`translate(${x},${y})`}>
      <text 
        x={0} 
        y={isTop ? -14 : (isBottom ? 22 : 6)} 
        textAnchor="middle" 
        fill={fill} 
        fontSize={14} 
        fontWeight={800}
        style={{ letterSpacing: '0.05em' }}
      >
        {val}
      </text>
    </g>
  );
}

const getAxisBaseColor = (axis: string): [number, number, number] => {
  switch (axis) {
    case 'dom': return [220, 60, 35]; // 紺青 (Navy)
    case 'sadism': return [350, 70, 40]; // 緋 (Red)
    case 'control': return [280, 40, 40]; // 江戶紫 (Purple)
    case 'care': return [35, 50, 45]; // 琥珀 (Gold/Brown)
    case 'sub': return [10, 40, 35]; // 錆朱 (Rust)
    case 'maso': return [330, 40, 40]; // 梅紫 (Plum)
    case 'tied': return [200, 30, 40]; // 縹色 (Blue grey)
    case 'spoiled': return [15, 60, 60]; // 鴇色 (Peach)
    case 'emotional': return [160, 40, 35]; // 千歲綠 (Green)
    case 'diverse': return [180, 50, 35]; // 青碧 (Teal)
    default: return [40, 40, 40];
  }
};

const getTraitColors = (axis: string, traitId: string) => {
  const [h, s, l] = getAxisBaseColor(axis);
  const charSum = traitId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const hueShift = (charSum % 30) - 15;
  const hFinal = (h + hueShift + 360) % 360;
  
  return {
    border: `hsl(${hFinal}, ${s * 0.8}%, ${Math.max(20, l - 15)}%)`,
    bg: `hsl(${hFinal}, ${s * 0.5}%, 93%)`,
    text: `hsl(${hFinal}, ${s}%, ${Math.max(15, l - 25)}%)`,
    shadow: `hsla(${hFinal}, ${s}%, ${l}%, 0.25)`
  };
};

function getKamonStampImage(trait: any) {
  const top5Image = trait.top5Image || trait.top5_image;
  if (top5Image && (top5Image.startsWith('http') || top5Image.startsWith('/'))) return top5Image;
  if (trait.icon && (trait.icon.startsWith('http') || trait.icon.startsWith('/'))) return trait.icon;

  const axisKamonMap: Record<string, string> = {
    dom: 'domination',
    sadism: 'sadism',
    control: 'bondage',
    care: 'sensory',
    sub: 'submission',
    maso: 'masochist',
    tied: 'sensory_deprivation',
    spoiled: 'roleplay',
    emotional: 'mental_control',
    diverse: 'diverse_relations'
  };

  const kamonKey = axisKamonMap[trait.axis] || 'bdsm';
  return `/images/nodes/kamon_${kamonKey}.png`;
}

function TraitBadge({ trait, index, colors, isTop1 }: { trait: any, index: number, colors: any, isTop1: boolean }) {
  const kamonImgSrc = getKamonStampImage(trait);

  return (
    <div 
      className={`relative flex flex-col items-center justify-between p-4 sm:p-5 transition-all duration-300 hover:-translate-y-2 group cursor-default shadow-md ${
        isTop1 ? 'col-span-2 sm:col-span-2 row-span-2 rounded-[36px] border-[3.5px]' : 
        'col-span-1 rounded-[28px] border-[3px]'
      }`}
      style={{
        backgroundColor: colors.bg || '#FDFBF7',
        borderColor: colors.border,
        boxShadow: isTop1 ? `0 14px 35px -6px ${colors.shadow}` : `0 6px 18px -4px ${colors.shadow}`
      }}
    >
      {/* 典藏圖章頂部金屬圓角標籤 */}
      <div 
        className="px-3 py-0.5 text-[10px] font-black text-white rounded-full shadow-sm tracking-wider uppercase border border-white/40 mb-2 z-10"
        style={{ backgroundColor: colors.text }}
      >
        TOP {index + 1}
      </div>

      {/* 雙層復古圖章內框 (Inner Shield Arc) */}
      <div 
        className="w-full flex-1 flex flex-col items-center justify-center p-3 rounded-[24px] border border-dashed border-black/10 relative overflow-hidden bg-white/40 dark:bg-black/10"
      >
        {/* 背景放射光束與微質感網紋 */}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: `radial-gradient(${colors.border} 2px, transparent 2px)`, backgroundSize: '10px 10px' }} />

        {/* 和風 Kamon 圖章與典藏徽章 */}
        <div className={`relative flex items-center justify-center rounded-full border-2 mb-2 group-hover:scale-110 transition-transform duration-300 overflow-hidden ${
          isTop1 ? 'w-20 h-20 bg-white/90 border-[#D9B650] shadow-md p-1.5' : 'w-14 h-14 bg-white/80 border-[#D1C6B4]/60 shadow-xs p-1'
        }`}>
          <img 
            src={kamonImgSrc} 
            alt={trait.name} 
            className="w-full h-full object-contain drop-shadow-xs" 
            crossOrigin="anonymous" 
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/images/nodes/kamon_bdsm.png';
            }}
          />
        </div>

        {/* 特質名稱與極致燙金質感分比 */}
        <span className={`font-black tracking-widest text-center ${isTop1 ? 'text-xl sm:text-2xl' : 'text-sm'}`} style={{ color: colors.text }}>
          {trait.name}
        </span>
      </div>

      {/* 底部分數與典藏燙金線條 */}
      <div className="w-full mt-2 pt-2 border-t border-black/5 flex items-center justify-center gap-1.5">
        <span className="text-[10px] font-bold opacity-60 tracking-wider" style={{ color: colors.text }}>靈魂契合度</span>
        <span className={`font-black font-mono ${isTop1 ? 'text-lg' : 'text-xs'}`} style={{ color: colors.text }}>
          {trait.score}%
        </span>
      </div>
    </div>
  );
}

export function QuizResultPhase({ scores, aiAnalysis, isAiLoading, onRestart }: QuizResultPhaseProps) {
  const { traits, endings, axes, resultPage } = useQuizConfig();
  const labels = resultPage?.labels || {};
  const resultRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showAllRemaining, setShowAllRemaining] = useState(false);

  // 1. 整理 40 個特質的分數並排序
  const sortedTraits = useMemo(() => {
    return Object.entries(scores)
      .map(([id, score]) => ({
        id,
        ...(traits[id] || { name: id, icon: '✨', axis: 'diverse' }),
        score: score as number
      }))
      .filter(t => t.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [scores, traits]);

  const top5 = sortedTraits.slice(0, 5);
  const remainingTraits = sortedTraits.slice(5);

  // 2. 獲取對應的結局資料（100% 後台驅動比對）
  const ending = useMemo(() => {
    const topTraitId = top5[0]?.id || '';
    const topAxis = top5[0]?.axis || '';

    // 優先：用 triggerTraits 比對最高分特質 ID 或最高分 Axis
    const matched = (endings || []).find((e: any) =>
      Array.isArray(e.triggerTraits) && e.triggerTraits.length > 0 && (e.triggerTraits.includes(topTraitId) || e.triggerTraits.includes(topAxis))
    );
    
    // 如果無匹配，預設讀取後台定義的第一筆結局
    return matched || (endings && endings[0]) || { title: '終局', subtitle: '', image: '', commentary: '' };
  }, [top5, endings]);

  // 3. AI 解析 (覆蓋預設標題，智慧防止未設定 API 金鑰字樣)
  const { title: aiTitle, description: aiDesc } = useMemo(() => {
    const isApiKeyMissing = !aiAnalysis || aiAnalysis.includes('未設定 API 金鑰') || aiAnalysis.includes('失敗');
    if (isApiKeyMissing) {
      const top1Name = top5[0]?.name || '靈魂探索者';
      const top2Name = top5[1]?.name || '支配者';
      const title = ending?.title || `【夜幕的${top1Name}】`;
      const desc = `在親密互動與心理光譜中，你展現出深邃的靈魂掌控力與敏銳直覺。核心特質【${top1Name}】（契合度 ${top5[0]?.score || 85}%）與輔助特質【${top2Name}】相互交織，引導著你對權力流動與信任邊界的獨特感知。建議在每一次溝通中遵循 SSC/RACK 原則，享受深層信任所帶來的平靜與精神共鳴。`;
      return { title, description: desc };
    }
    const match = aiAnalysis.match(/\*\*(.+?)\*\*/);
    if (match) {
      const t = match[1];
      const d = aiAnalysis.replace(match[0], '').trim();
      return { title: t, description: d };
    }
    return { title: ending?.title || '專屬印記', description: aiAnalysis };
  }, [aiAnalysis, ending, top5]);

  // 4. 計算 10 大軸心雷達圖資料
  const radarData = useMemo(() => {
    return axes.map((axis: any) => {
      let total = 0;
      let count = 0;
      // 找出所有屬於該軸心的 traits
      const axisTraits = Object.entries(traits).filter(([_, v]: [string, any]) => v.axis === axis.id).map(([k]) => k);
      axisTraits.forEach(k => {
        if (scores[k] !== undefined) {
          total += scores[k];
          count++;
        }
      });
      const avg = count > 0 ? total / count : 0;
      return {
        subject: axis.name,
        A: Math.round(avg),
        fullMark: 100,
      };
    });
  }, [scores, axes, traits]);

  // === 截圖下載 ===
  const handleShare = async () => {
    if (!resultRef.current) return;
    setIsCapturing(true);
    try {
      // 確保跨域圖片載入與相容 html2canvas 的顏色轉義
      const canvas = await html2canvas(resultRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#FDFBF7',
        logging: false,
        imageTimeout: 15000,
        ignoreElements: (element) => element.classList.contains('no-export'),
        onclone: (clonedDoc) => {
          // 強制替換不被 html2canvas 支援的現代 lab() / oklch() 顏色
          const elements = clonedDoc.querySelectorAll('*');
          elements.forEach((el: any) => {
            const style = window.getComputedStyle(el);
            if (style.backgroundColor && (style.backgroundColor.includes('lab') || style.backgroundColor.includes('oklch'))) {
              el.style.backgroundColor = '#FDFBF7';
            }
            if (style.color && (style.color.includes('lab') || style.color.includes('oklch'))) {
              el.style.color = '#4A4238';
            }
            if (style.borderColor && (style.borderColor.includes('lab') || style.borderColor.includes('oklch'))) {
              el.style.borderColor = '#4A4238';
            }
          });
        }
      });
      
      const dataUrl = canvas.toDataURL('image/png');
      downloadImage(dataUrl);
    } catch (err: any) {
      console.error('截圖失敗:', err);
      try {
        const fallbackCanvas = await html2canvas(resultRef.current, { scale: 1, useCORS: true });
        const fallbackUrl = fallbackCanvas.toDataURL('image/png');
        downloadImage(fallbackUrl);
      } catch (e) {
        alert('無法產生圖片，請使用系統螢幕截圖。');
      }
    } finally {
      setIsCapturing(false);
    }
  };

  const downloadImage = (dataUrl: string) => {
    const link = document.createElement('a');
    link.download = `kinkflow_imprint_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-6 px-4 animate-fade-in relative">
      <div 
        ref={resultRef}
        className="bg-[#FDFBF7] rounded-[40px] border-[3px] border-[#4A4238] overflow-hidden shadow-[8px_12px_0px_0px_rgba(74,66,56,1)] mb-8 relative"
      >
        {/* 背景裝飾 */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#D9B650]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#E8C5C8]/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        {/* 頂部裝飾條 */}
        <div className="h-4 bg-[#4A4238] w-full" />
        
        <div className="p-6 sm:p-12 relative z-10">
          {/* === 區塊一：結局宣告與評語 === */}
          <div className="text-center mb-12">
            <span className="text-[#D9B650] font-bold text-sm tracking-widest mb-4 block">
              {ending?.title} - {ending?.subtitle}
            </span>
            
            <h1 className="text-3xl sm:text-5xl font-black text-[#4A4238] tracking-widest mb-4">
              {isAiLoading ? '解析印記中...' : (aiAnalysis ? aiTitle : ending?.title)}
            </h1>
            <div className="w-24 h-1 bg-[#D9B650] mx-auto rounded-full mb-8" />
            
            <div className="bg-white border-2 border-[#D1C6B4]/50 rounded-2xl p-6 sm:p-8 text-[#4A4238]/90 text-sm sm:text-base leading-relaxed tracking-wide shadow-inner inline-block max-w-2xl relative mb-12">
              {isAiLoading && (
                <div className="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center z-10 backdrop-blur-sm">
                  <RotateCcw className="w-6 h-6 animate-spin text-[#D9B650]" />
                </div>
              )}
              <p className="italic font-medium">"{aiDesc}"</p>
            </div>
          </div>

          {/* === 區塊二：10 大軸心雷達圖 === */}
          <div className="bg-white/60 rounded-3xl border-2 border-[#D1C6B4]/40 p-4 sm:p-8 mb-12 shadow-sm relative backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
              <h3 className="text-base font-black text-[#4A4238] tracking-widest">
                【 10 大核心力場光譜 】
              </h3>
              <div className="flex gap-4 text-xs font-bold bg-white/80 px-3 py-1.5 rounded-full border border-[#D1C6B4]/40 shadow-xs">
                <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-[#7F1D1D] rounded-full"></div>主動</span>
                <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-[#1E3A8A] rounded-full"></div>被動</span>
                <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-[#0F766E] rounded-full"></div>中立</span>
              </div>
            </div>
            
            <div className="w-full aspect-square max-h-[440px] mx-auto py-2">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#D1C6B4" strokeOpacity={0.6} />
                  <PolarAngleAxis 
                    dataKey="subject" 
                    tick={<CustomRadarTick />}
                  />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name="傾向"
                    dataKey="A"
                    stroke="#D9B650"
                    strokeWidth={3}
                    fill="#D9B650"
                    fillOpacity={0.35}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* === 區塊三：TOP 5 靈魂印記卡片 === */}
          <div className="mb-12">
            <h3 className="text-sm font-bold text-[#4A4238]/60 text-center tracking-widest mb-6">
              {labels.traitBadgeTitle || '【 你的 TOP 5 靈魂印記 】'}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {top5.map((trait, index) => (
                <TraitBadge 
                  key={trait.id}
                  trait={trait}
                  index={index}
                  colors={getTraitColors(trait.axis, trait.id)}
                  isTop1={index === 0}
                />
              ))}
            </div>
          </div>

          {/* === 區塊四：剩餘潛意識碎片 === */}
          {remainingTraits.length > 0 && (
            <div className="mt-8">
              <div className="flex justify-between items-center mb-4 border-b border-[#D1C6B4]/30 pb-2">
                <h3 className="text-sm font-black text-[#1A1612] tracking-widest">
                  {labels.remainingTitle || '其餘潛意識傾向 ( Top 6 ~ 30 )'}
                </h3>
              </div>
              
              {/* 無外框極簡和風印記清單 (多彩質感字體，無裁切、無白底方塊) */}
              <div className="flex flex-wrap gap-x-5 gap-y-3.5 p-4 sm:p-6 bg-[#FDFBF7] rounded-3xl border-2 border-[#D1C6B4]/50 shadow-inner">
                {(showAllRemaining ? remainingTraits : remainingTraits.slice(0, 6)).map((trait) => {
                  const colors = getTraitColors(trait.axis, trait.id);
                  const isIconUrl = trait.icon?.startsWith('http') || trait.icon?.startsWith('/');
                  // 動態多角色質感文字色彩
                  const textColor = colors.text && colors.text !== '#4A4238' ? colors.text : (
                    trait.axis === 'active' ? '#991B1B' : (trait.axis === 'passive' ? '#1E40AF' : '#065F46')
                  );
                  return (
                    <div 
                      key={trait.id} 
                      className="flex items-center gap-1.5 text-xs sm:text-sm font-black cursor-default whitespace-nowrap hover:scale-105 transition-transform"
                      style={{ color: textColor }}
                    >
                      {isIconUrl ? (
                        <img src={trait.icon} alt={trait.name} className="w-4 h-4 object-contain shrink-0" crossOrigin="anonymous" />
                      ) : (
                        <span className="text-xs shrink-0">{trait.icon}</span>
                      )}
                      <span className="tracking-wide font-black">{trait.name}</span>
                      <span className="font-mono font-black text-[11px] opacity-80 ml-0.5">{trait.score}%</span>
                    </div>
                  );
                })}
              </div>

              {/* 醒目的展收按鈕 (黑底白字高對比) */}
              {remainingTraits.length > 6 && (
                <div className="mt-5 flex justify-center no-export">
                  <button 
                    onClick={() => setShowAllRemaining(!showAllRemaining)}
                    className="px-6 py-2.5 bg-[#1A1612] hover:bg-[#2A241F] text-[#FDFBF7] rounded-full text-xs font-black transition-all flex items-center gap-2 shadow-md cursor-pointer border border-[#D9B650]"
                  >
                    <span>{showAllRemaining ? '▲ 收合隱藏部分特質' : `🔽 點開查看全部 (${remainingTraits.length} 項特質)`}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* === 品牌水印 Footer（截圖內，可由後台設定）=== */}
          <div className="mt-10 pt-6 border-t border-[#D1C6B4]/20 flex items-center justify-center gap-3">
            {resultPage?.logoUrl ? (
              <img
                src={resultPage.logoUrl}
                alt="logo"
                className="h-8 object-contain"
                crossOrigin="anonymous"
              />
            ) : null}
            <div className="text-center">
              <p className="text-xs font-black text-[#4A4238] tracking-[0.3em] uppercase">
                {resultPage?.footerText || '探索你的潛意識傾向'}
              </p>
              <p className="text-[10px] font-bold text-[#D9B650] tracking-[0.2em] mt-0.5">
                {resultPage?.siteUrl || 'KINKFLOW.COM'}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* 底部按鈕 (100% 絕對清晰對比) */}
      <div className="flex flex-col sm:flex-row gap-4 pb-12">
        <button
          onClick={handleShare}
          disabled={isCapturing || isAiLoading}
          className="flex-1 py-4 bg-[#D9B650] text-[#1A1612] rounded-2xl font-black tracking-widest hover:-translate-y-1 hover:shadow-lg transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
        >
          {isCapturing ? <RotateCcw className="w-5 h-5 animate-spin text-[#1A1612]" /> : <Share2 className="w-5 h-5 text-[#1A1612]" />}
          <span>{labels.shareBtn || '分享我的印記報告'}</span>
        </button>
        <button
          onClick={onRestart}
          className="flex-1 flex items-center justify-center gap-2 py-4 bg-[#1A1612] text-[#FDFBF7] font-black rounded-2xl border-2 border-[#1A1612] hover:-translate-y-1 hover:shadow-lg transition-all tracking-widest shadow-md cursor-pointer"
        >
          <RotateCcw className="w-5 h-5 text-[#FDFBF7]" />
          <span>{labels.restartBtn || '重新探索'}</span>
        </button>
      </div>
    </div>
  );
}
