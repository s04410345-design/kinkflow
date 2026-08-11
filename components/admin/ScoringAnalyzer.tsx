"use client";
import { useState, useMemo, useCallback } from "react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";

interface ScoringAnalyzerProps {
  config: {
    scenarioGraph: Record<string, any>;
    cards: any[];
    traits: Record<string, { name: string; icon: string; axis: string }>;
    axes?: { id: string; name: string; color: string }[];
  };
}

const AXIS_COLORS: Record<string, string> = {
  dom: "#C0392B", sadism: "#E74C3C", control: "#8E44AD", care: "#D4AC0D",
  sub: "#C0392B", maso: "#E74C3C", tied: "#8E44AD", spoiled: "#F39C12",
  emotional: "#27AE60", diverse: "#2980B9",
};
const AXIS_BG: Record<string, string> = {
  dom: "#FEF0EE", sadism: "#FEF5F5", control: "#F5EEF8", care: "#FEF9E7",
  sub: "#FEF0EE", maso: "#FEF5F5", tied: "#F5EEF8", spoiled: "#FEF5E7",
  emotional: "#EAFAF1", diverse: "#EAF4FB",
};

// 渲染特質 icon（支援 URL 或 emoji）
function TraitIcon({ icon, name, size = "sm" }: { icon: string; name: string; size?: "xs" | "sm" | "md" }) {
  const sizeClass = size === "xs" ? "w-4 h-4" : size === "sm" ? "w-5 h-5" : "w-8 h-8";
  const textClass = size === "xs" ? "text-xs" : size === "sm" ? "text-sm" : "text-xl";
  if (!icon) return null;
  if (icon.startsWith("http") || icon.startsWith("/")) {
    return <img src={icon} alt={name} className={`${sizeClass} object-contain rounded shrink-0`} />;
  }
  return <span className={`${textClass} shrink-0`}>{icon}</span>;
}

export default function ScoringAnalyzer({ config }: ScoringAnalyzerProps) {
  const { scenarioGraph = {}, cards = [], traits = {} } = config;

  // ======================== 計算最高分 ========================
  const maxScores = useMemo(() => {
    const scores: Record<string, number> = {};
    cards.forEach((card: any) => {
      scores["switch"] = (scores["switch"] || 0) + 15;
      (card.actImpact || []).forEach((t: string) => { scores[t] = (scores[t] || 0) + 48; });
      (card.passImpact || []).forEach((t: string) => { scores[t] = (scores[t] || 0) + 48; });
    });
    const pathMax: Record<string, number> = {};
    const dfs = (nodeId: string, cur: Record<string, number>, visited: Set<string>) => {
      if (visited.has(nodeId)) return;
      const node = scenarioGraph[nodeId];
      if (!node?.options?.length) {
        Object.entries(cur).forEach(([k, v]) => { pathMax[k] = Math.max(pathMax[k] || 0, v); });
        return;
      }
      node.options.forEach((opt: any) => {
        const next = { ...cur };
        Object.entries(opt.impacts || {}).forEach(([k, v]) => { next[k] = (next[k] || 0) + (v as number); });
        const nextId = opt.nextNodeId || opt.nextScenarioId;
        if (nextId && nextId !== "result") dfs(nextId, next, new Set([...visited, nodeId]));
        else Object.entries(next).forEach(([k, v]) => { pathMax[k] = Math.max(pathMax[k] || 0, v); });
      });
    };
    dfs("start", {}, new Set());
    Object.entries(pathMax).forEach(([k, v]) => { scores[k] = (scores[k] || 0) + v; });
    return scores;
  }, [scenarioGraph, cards]);

  // ======================== 特質來源 ========================
  const traitSources = useMemo(() => {
    const sources: Record<string, { label: string; score: number; type: "scenario" | "card" }[]> = {};
    Object.values(scenarioGraph).forEach((node: any) => {
      (node.options || []).forEach((opt: any, i: number) => {
        Object.entries(opt.impacts || {}).forEach(([trait, score]) => {
          if (!sources[trait]) sources[trait] = [];
          sources[trait].push({ label: `${node.id} 選項${i + 1}`, score: score as number, type: "scenario" });
        });
      });
    });
    cards.forEach((card: any) => {
      (card.actImpact || []).forEach((t: string) => {
        if (!sources[t]) sources[t] = [];
        sources[t].push({ label: `${card.title} (主動)`, score: 48, type: "card" });
      });
      (card.passImpact || []).forEach((t: string) => {
        if (!sources[t]) sources[t] = [];
        sources[t].push({ label: `${card.title} (被動)`, score: 48, type: "card" });
      });
    });
    return sources;
  }, [scenarioGraph, cards]);

  // ======================== 按軸心分組 ========================
  const byAxis = useMemo(() => {
    const grouped: Record<string, { id: string; name: string; icon: string; maxScore: number }[]> = {};
    Object.entries(traits).forEach(([id, t]: any) => {
      if (!grouped[t.axis]) grouped[t.axis] = [];
      grouped[t.axis].push({ id, name: t.name, icon: t.icon, maxScore: maxScores[id] || 0 });
    });
    return grouped;
  }, [traits, maxScores]);

  // ======================== 模擬器狀態 ========================
  type SimPhase = "scenario" | "cards" | "result";
  const [simPhase, setSimPhase] = useState<SimPhase>("scenario");
  const [currentNodeId, setCurrentNodeId] = useState("start");
  const [scenarioPath, setScenarioPath] = useState<{ nodeId: string; optIdx: number; impacts: Record<string, number> }[]>([]);
  const [simCards, setSimCards] = useState<{ active: number; passive: number }[]>(() => cards.map(() => ({ active: 1, passive: 1 })));

  const resetSim = useCallback(() => {
    setSimPhase("scenario");
    setCurrentNodeId("start");
    setScenarioPath([]);
    setSimCards(cards.map(() => ({ active: 1, passive: 1 })));
  }, [cards]);

  const currentNode = scenarioGraph[currentNodeId];

  const handleSelectOption = useCallback((opt: any, optIdx: number) => {
    const newPath = [...scenarioPath, { nodeId: currentNodeId, optIdx, impacts: opt.impacts || {} }];
    setScenarioPath(newPath);
    const nextId = opt.nextNodeId || opt.nextScenarioId;
    if (!nextId || nextId === "result") {
      setSimPhase("cards");
    } else {
      setCurrentNodeId(nextId);
    }
  }, [currentNodeId, scenarioPath]);

  // ======================== 計算模擬結果 ========================
  const simRaw = useMemo(() => {
    const raw: Record<string, number> = {};
    scenarioPath.forEach(step => {
      Object.entries(step.impacts).forEach(([k, v]) => { raw[k] = (raw[k] || 0) + (v as number); });
    });
    simCards.forEach((ans, idx) => {
      const card = cards[idx];
      if (!card) return;
      (card.actImpact || []).forEach((t: string) => { raw[t] = (raw[t] || 0) + 12 * (ans.active - 1); });
      (card.passImpact || []).forEach((t: string) => { raw[t] = (raw[t] || 0) + 12 * (ans.passive - 1); });
      if (ans.active >= 4 && ans.passive >= 4) raw["switch"] = (raw["switch"] || 0) + 15;
    });
    return raw;
  }, [scenarioPath, simCards, cards]);

  const simNorm = useMemo(() => {
    const norm: Record<string, number> = {};
    Object.entries(simRaw).forEach(([k, v]) => {
      norm[k] = Math.min(100, Math.round((v / (maxScores[k] || 1)) * 100));
    });
    return norm;
  }, [simRaw, maxScores]);

  const radarData = useMemo(() => {
    const axisIds = [...new Set(Object.values(traits).map((t: any) => t.axis))];
    return axisIds.map(axisId => {
      const axisTraits = Object.entries(traits).filter(([, t]: any) => t.axis === axisId).map(([k]) => k);
      const vals = axisTraits.map(k => simNorm[k] || 0);
      const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
      const axisName = config.axes?.find((a: any) => a.id === axisId)?.name || axisId;
      return { subject: axisName, A: avg, fullMark: 100 };
    });
  }, [simNorm, traits, config.axes]);

  // ======================== 特質覆蓋率分析 ========================
  const coverageAnalysis = useMemo(() => {
    if (simPhase !== "result") return null;
    // 哪些特質只能靠情境題得分（無卡片覆蓋）
    const cardTraits = new Set([
      ...cards.flatMap((c: any) => [...(c.actImpact || []), ...(c.passImpact || [])]),
      "switch"
    ]);
    // 哪些特質在我走的路線裡有被影響
    const chosenTraits = new Set(scenarioPath.flatMap(s => Object.keys(s.impacts)));
    const allTraitIds = Object.keys(traits);
    const notCovered = allTraitIds.filter(id => {
      const fromCards = cardTraits.has(id) && simCards.some(ans => ans.active > 1 || ans.passive > 1);
      const fromScenario = chosenTraits.has(id);
      return !fromCards && !fromScenario && (simNorm[id] || 0) === 0;
    });
    return { notCovered, chosenTraits: [...chosenTraits], cardTraits: [...cardTraits] };
  }, [simPhase, scenarioPath, simCards, cards, traits, simNorm]);

  const [expandedTrait, setExpandedTrait] = useState<string | null>(null);
  const [expandSection, setExpandSection] = useState<Record<string, boolean>>({ flow: true, map: false, scenario: false, cards: false });
  const toggleSection = (key: string) => setExpandSection(p => ({ ...p, [key]: !p[key] }));

  // ======================== RENDER ========================
  return (
    <div className="space-y-4 animate-fade-in">

      {/* ===== 1. 算分流程說明 ===== */}
      <div className="bg-white rounded-2xl border border-[#D1C6B4]/50 shadow-sm overflow-hidden">
        <button onClick={() => toggleSection("flow")} className="w-full px-5 py-3.5 flex items-center gap-2 hover:bg-[#F5EFE6] transition-colors text-left">
          <span className="w-5 h-5 rounded-full bg-[#4A4238] text-white flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
          <span className="text-sm font-black text-[#4A4238]">算分流程說明</span>
          <span className="ml-auto text-xs text-[#4A4238]/40">{expandSection.flow ? "▲" : "▼"}</span>
        </button>
        {expandSection.flow && (
          <div className="px-5 pb-5 border-t border-[#D1C6B4]/20">
            <div className="flex flex-wrap items-center gap-2 text-xs mt-4">
              {[
                { label: "第一幕劇情分支\n(impacts 物件)", color: "bg-red-50 border-red-200 text-red-700" },
                "+",
                { label: "第二幕刷卡測驗\n主動/被動 × 12(值-1)", color: "bg-blue-50 border-blue-200 text-blue-700" },
                "→",
                { label: "rawScores\n40 種特質原始分", color: "bg-yellow-50 border-yellow-200 text-yellow-800" },
                "→",
                { label: "÷ 理論最高分 × 100\nnormalizeScores", color: "bg-purple-50 border-purple-200 text-purple-700" },
                "→",
                { label: "40 種特質 %\n各 0~100%", color: "bg-green-50 border-green-200 text-green-700" },
                "→",
                { label: "同軸心取平均\n4 特質 → 1 軸心", color: "bg-amber-50 border-amber-200 text-amber-700" },
                "→",
                { label: "10 軸心雷達圖\n最終視覺化", color: "bg-cyan-50 border-cyan-200 text-cyan-700" },
              ].map((item, i) =>
                typeof item === "string" ? (
                  <span key={i} className="text-[#4A4238]/30 font-bold text-base px-1">{item}</span>
                ) : (
                  <div key={i} className={`border rounded-xl px-3 py-2 text-center whitespace-pre-line leading-snug ${item.color}`}>
                    <span className="font-bold">{item.label}</span>
                  </div>
                )
              )}
            </div>
            <div className="mt-3 bg-[#F5EFE6] rounded-lg p-2.5 text-xs text-[#4A4238]/70">
              <strong>⚡ Switch 加成</strong>：刷卡題主動 ≥ 4 且被動 ≥ 4 時，<code className="bg-white/80 px-1 rounded">switch</code> 特質額外 +15 分
            </div>
          </div>
        )}
      </div>

      {/* ===== 2. 40 特質 × 10 軸心對應表 ===== */}
      <div className="bg-white rounded-2xl border border-[#D1C6B4]/50 shadow-sm overflow-hidden">
        <button onClick={() => toggleSection("map")} className="w-full px-5 py-3.5 flex items-center gap-2 hover:bg-[#F5EFE6] transition-colors text-left">
          <span className="w-5 h-5 rounded-full bg-[#4A4238] text-white flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
          <span className="text-sm font-black text-[#4A4238]">40 種特質 → 10 軸心對應表</span>
          <span className="text-xs font-normal text-[#4A4238]/40 ml-1">點擊特質可展開分數來源</span>
          <span className="ml-auto text-xs text-[#4A4238]/40">{expandSection.map ? "▲" : "▼"}</span>
        </button>
        {expandSection.map && (
          <div className="px-5 pb-5 border-t border-[#D1C6B4]/20 mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              {Object.entries(byAxis).map(([axisId, traitList]) => {
                const axisName = config.axes?.find((a: any) => a.id === axisId)?.name || axisId;
                const color = AXIS_COLORS[axisId] || "#888";
                const bg = AXIS_BG[axisId] || "#F5F5F5";
                return (
                  <div key={axisId} className="rounded-xl border-2 overflow-hidden" style={{ borderColor: color + "30" }}>
                    <div className="px-3 py-2 flex items-center gap-2" style={{ backgroundColor: bg }}>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <span className="font-bold text-xs" style={{ color }}>{axisName}</span>
                      <span className="text-[10px] ml-auto text-[#4A4238]/40">{traitList.length} 種特質</span>
                    </div>
                    <div className="divide-y divide-[#D1C6B4]/20">
                      {traitList.map(trait => (
                        <div key={trait.id}>
                          <button
                            onClick={() => setExpandedTrait(expandedTrait === trait.id ? null : trait.id)}
                            className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-[#F5EFE6] transition-colors"
                          >
                            <TraitIcon icon={trait.icon} name={trait.name} size="sm" />
                            <span className="font-bold text-xs text-[#4A4238] flex-1">{trait.name}</span>
                            <span className="text-[10px] font-mono text-[#4A4238]/40 bg-[#F5EFE6] px-2 py-0.5 rounded-full">最高 {trait.maxScore}</span>
                            <span className="text-[#4A4238]/30 text-[10px]">{expandedTrait === trait.id ? "▲" : "▼"}</span>
                          </button>
                          {expandedTrait === trait.id && (
                            <div className="px-3 py-2 bg-[#FDFBF7] border-t border-[#D1C6B4]/20">
                              <p className="text-[10px] text-[#4A4238]/40 mb-1.5 font-bold">分數來源：</p>
                              {(traitSources[trait.id] || []).length === 0 ? (
                                <p className="text-[10px] text-[#4A4238]/30 italic">無直接貢獻</p>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {(traitSources[trait.id] || []).map((src, i) => (
                                    <span key={i} className={`text-[10px] px-2 py-0.5 rounded font-bold ${src.type === "card" ? "bg-blue-50 text-blue-600 border border-blue-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                                      {src.type === "card" ? "🎴" : "📖"} {src.label} +{src.score}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ===== 3. 情境選項影響 ===== */}
      <div className="bg-white rounded-2xl border border-[#D1C6B4]/50 shadow-sm overflow-hidden">
        <button onClick={() => toggleSection("scenario")} className="w-full px-5 py-3.5 flex items-center gap-2 hover:bg-[#F5EFE6] transition-colors text-left">
          <span className="w-5 h-5 rounded-full bg-[#4A4238] text-white flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
          <span className="text-sm font-black text-[#4A4238]">第一幕：情境題選項影響</span>
          <span className="ml-auto text-xs text-[#4A4238]/40">{expandSection.scenario ? "▲" : "▼"}</span>
        </button>
        {expandSection.scenario && (
          <div className="px-5 pb-5 border-t border-[#D1C6B4]/20">
            <div className="space-y-2 mt-4">
              {Object.values(scenarioGraph).map((node: any) => (
                <div key={node.id} className="border border-[#D1C6B4]/30 rounded-xl overflow-hidden">
                  <div className="px-3 py-2 bg-[#F5EFE6] flex items-center gap-2">
                    <span className="font-mono text-[10px] bg-[#4A4238] text-white px-2 py-0.5 rounded">{node.id}</span>
                    <span className="text-xs font-bold text-[#4A4238] truncate">{(node.desc || node.text || "").substring(0, 50)}…</span>
                  </div>
                  <div className="divide-y divide-[#D1C6B4]/20">
                    {(node.options || []).map((opt: any, i: number) => {
                      const impactEntries = Object.entries(opt.impacts || {});
                      const nextId = opt.nextNodeId || opt.nextScenarioId;
                      return (
                        <div key={i} className="px-3 py-2 flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold text-[#4A4238]/50 w-12 shrink-0">選項 {i + 1}</span>
                          <span className="text-[10px] text-[#4A4238]/70 flex-1 min-w-0 truncate">{opt.text || "（無文字）"}</span>
                          <div className="flex flex-wrap gap-1">
                            {impactEntries.length === 0 ? (
                              <span className="text-[10px] text-[#4A4238]/30 italic">無影響</span>
                            ) : impactEntries.map(([trait, score]) => {
                              const traitInfo = traits[trait];
                              const s = score as number;
                              return (
                                <span key={trait} className="text-[10px] px-2 py-0.5 rounded-full font-bold border flex items-center gap-1"
                                  style={{
                                    backgroundColor: s > 0 ? `rgba(197,212,182,${Math.min(0.9, 0.2 + Math.abs(s) / 25)})` : `rgba(232,197,200,${Math.min(0.9, 0.2 + Math.abs(s) / 25)})`,
                                    borderColor: s > 0 ? "#C5D4B6" : "#E8C5C8",
                                    color: s > 0 ? "#3A5C28" : "#8B3A3A",
                                  }}>
                                  <TraitIcon icon={traitInfo?.icon || ""} name={traitInfo?.name || trait} size="xs" />
                                  {traitInfo?.name || trait} {s > 0 ? "+" : ""}{s}
                                </span>
                              );
                            })}
                          </div>
                          {nextId && <span className="text-[10px] text-[#4A4238]/30 font-mono shrink-0">→ {nextId}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ===== 4. 刷卡影響 ===== */}
      <div className="bg-white rounded-2xl border border-[#D1C6B4]/50 shadow-sm overflow-hidden">
        <button onClick={() => toggleSection("cards")} className="w-full px-5 py-3.5 flex items-center gap-2 hover:bg-[#F5EFE6] transition-colors text-left">
          <span className="w-5 h-5 rounded-full bg-[#4A4238] text-white flex items-center justify-center text-[10px] font-bold shrink-0">4</span>
          <span className="text-sm font-black text-[#4A4238]">第二幕：刷卡題影響一覽</span>
          <span className="text-xs font-normal text-[#4A4238]/40 ml-1">滑桿拉到 5 時最高 +48 分</span>
          <span className="ml-auto text-xs text-[#4A4238]/40">{expandSection.cards ? "▲" : "▼"}</span>
        </button>
        {expandSection.cards && (
          <div className="px-5 pb-5 border-t border-[#D1C6B4]/20">
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F5EFE6]">
                    <th className="text-left px-3 py-2 font-bold text-[#4A4238] rounded-tl-lg">卡片</th>
                    <th className="text-left px-3 py-2 font-bold text-blue-600">主動 actImpact (最高 +48)</th>
                    <th className="text-left px-3 py-2 font-bold text-rose-600 rounded-tr-lg">被動 passImpact (最高 +48)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D1C6B4]/20">
                  {cards.map((card: any, i: number) => (
                    <tr key={i} className="hover:bg-[#FDFBF7] transition-colors">
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-[#4A4238]">{card.title}</div>
                        <div className="text-[10px] text-[#4A4238]/40 font-mono">{card.id}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {(card.actImpact || []).map((t: string) => {
                            const info = traits[t];
                            return (
                              <span key={t} className="bg-blue-50 border border-blue-200 text-blue-700 px-2 py-0.5 rounded-full font-bold text-[10px] flex items-center gap-1">
                                <TraitIcon icon={info?.icon || ""} name={info?.name || t} size="xs" />
                                {info?.name || t}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {(card.passImpact || []).map((t: string) => {
                            const info = traits[t];
                            return (
                              <span key={t} className="bg-rose-50 border border-rose-200 text-rose-700 px-2 py-0.5 rounded-full font-bold text-[10px] flex items-center gap-1">
                                <TraitIcon icon={info?.icon || ""} name={info?.name || t} size="xs" />
                                {info?.name || t}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ===== 5. 路線模擬器 ===== */}
      <div className="bg-white rounded-2xl border-2 border-[#D9B650]/40 shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-[#FEF9E7] border-b border-[#D9B650]/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#D9B650] text-white flex items-center justify-center text-[10px] font-bold shrink-0">5</span>
            <span className="text-sm font-black text-[#4A4238]">全屬性算分與特質覆蓋分析</span>
            <span className="text-xs text-[#4A4238]/50">沿著真實分支走，結束後顯示特質覆蓋率分析</span>
          </div>
          <button onClick={resetSim} className="text-xs px-3 py-1.5 bg-[#4A4238] text-white rounded-lg font-bold hover:bg-[#4A4238]/80 transition-colors">
            🔄 重置
          </button>
        </div>

        <div className="p-5">
          {/* Breadcrumb 路徑 */}
          {scenarioPath.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] font-bold text-[#4A4238]/40">路徑：</span>
              {scenarioPath.map((step, i) => (
                <span key={i} className="text-[10px] bg-[#F5EFE6] text-[#4A4238]/70 px-2 py-0.5 rounded font-mono">
                  {step.nodeId} → 選{step.optIdx + 1}
                </span>
              ))}
              {simPhase !== "scenario" && (
                <span className="text-[10px] bg-[#D9B650]/20 text-[#D9B650] px-2 py-0.5 rounded font-bold">→ 第二幕</span>
              )}
            </div>
          )}

          {/* 情境選擇階段 */}
          {simPhase === "scenario" && currentNode && (
            <div className="space-y-4">
              <div className="bg-[#F5EFE6] rounded-xl p-4">
                <p className="text-[10px] font-bold text-[#4A4238]/50 mb-2">當前節點：{currentNodeId}</p>
                <p className="text-sm font-bold text-[#4A4238] leading-relaxed">{currentNode.desc || currentNode.text || ""}</p>
              </div>
              <div className="space-y-2">
                {(currentNode.options || []).map((opt: any, i: number) => {
                  const impactPreview = Object.entries(opt.impacts || {}).sort((a: any, b: any) => b[1] - a[1]).slice(0, 3);
                  return (
                    <button
                      key={i}
                      onClick={() => handleSelectOption(opt, i)}
                      className="w-full text-left p-4 rounded-xl border-2 border-[#D1C6B4]/30 bg-white hover:border-[#D9B650] hover:bg-[#FEF9E7] transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#4A4238]/10 text-[#4A4238] text-xs font-black flex items-center justify-center shrink-0 group-hover:bg-[#D9B650] group-hover:text-white transition-colors">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#4A4238] leading-relaxed">{opt.text || "（無文字）"}</p>
                          {impactPreview.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {impactPreview.map(([trait, score]: any) => {
                                const info = traits[trait];
                                return (
                                  <span key={trait} className="text-[10px] px-1.5 py-0.5 rounded bg-[#C5D4B6]/30 text-green-700 font-bold flex items-center gap-0.5">
                                    <TraitIcon icon={info?.icon || ""} name={info?.name || trait} size="xs" />
                                    +{score}
                                  </span>
                                );
                              })}
                              {Object.entries(opt.impacts || {}).length > 3 && (
                                <span className="text-[10px] text-[#4A4238]/40">+{Object.entries(opt.impacts || {}).length - 3} 更多</span>
                              )}
                              <span className="text-[10px] text-[#4A4238]/30 font-mono ml-auto">→ {opt.nextNodeId || opt.nextScenarioId || "結束"}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 刷卡階段 */}
          {simPhase === "cards" && (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700 font-bold">
                ✅ 第一幕完成！選擇每張刷卡題的主動/被動強度，然後查看結果。
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {cards.map((card: any, i: number) => (
                  <div key={i} className="bg-[#EAF4FB] rounded-xl p-3">
                    <p className="text-xs font-bold text-blue-700 mb-2">{card.title}</p>
                    <div className="space-y-2">
                      <label className="text-[10px] text-[#4A4238]/60 flex items-center gap-2">
                        <span className="w-12 shrink-0 text-blue-600 font-bold">主動 {simCards[i]?.active ?? 1}</span>
                        <input type="range" min={1} max={5} value={simCards[i]?.active ?? 1}
                          onChange={e => setSimCards(prev => { const n = [...prev]; n[i] = { ...n[i], active: +e.target.value }; return n; })}
                          className="flex-1 accent-blue-500 h-1.5" />
                        <span className="text-blue-500 w-10 text-right font-mono">+{12 * ((simCards[i]?.active ?? 1) - 1)}</span>
                      </label>
                      <label className="text-[10px] text-[#4A4238]/60 flex items-center gap-2">
                        <span className="w-12 shrink-0 text-rose-600 font-bold">被動 {simCards[i]?.passive ?? 1}</span>
                        <input type="range" min={1} max={5} value={simCards[i]?.passive ?? 1}
                          onChange={e => setSimCards(prev => { const n = [...prev]; n[i] = { ...n[i], passive: +e.target.value }; return n; })}
                          className="flex-1 accent-rose-400 h-1.5" />
                        <span className="text-rose-500 w-10 text-right font-mono">+{12 * ((simCards[i]?.passive ?? 1) - 1)}</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setSimPhase("result")}
                className="w-full py-3 bg-[#4A4238] text-white rounded-xl font-bold text-sm tracking-widest hover:bg-[#4A4238]/80 transition-colors"
              >
                📊 查看模擬結果
              </button>
            </div>
          )}

          {/* 結果階段 */}
          {simPhase === "result" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 雷達圖 */}
                <div className="bg-[#FDFBF7] rounded-2xl border border-[#D1C6B4]/30 p-4">
                  <p className="text-xs font-bold text-[#4A4238]/50 text-center mb-3">10 軸心雷達圖</p>
                  <div className="w-full aspect-square max-h-[240px] mx-auto">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="60%" data={radarData}>
                        <PolarGrid stroke="#D1C6B4" strokeOpacity={0.4} />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#4A4238", fontWeight: 700 }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar dataKey="A" stroke="#D9B650" strokeWidth={2} fill="#D9B650" fillOpacity={0.3} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 40 特質百分比 */}
                <div className="bg-[#FDFBF7] rounded-2xl border border-[#D1C6B4]/30 p-4 max-h-72 overflow-y-auto">
                  <p className="text-xs font-bold text-[#4A4238]/50 mb-3">40 種特質百分比（由高到低）</p>
                  <div className="space-y-1.5">
                    {Object.entries(traits)
                      .map(([id, t]: any) => ({ id, ...t, pct: simNorm[id] || 0 }))
                      .sort((a, b) => b.pct - a.pct)
                      .map(t => (
                        <div key={t.id} className="flex items-center gap-1.5">
                          <TraitIcon icon={t.icon} name={t.name} size="xs" />
                          <span className="text-[10px] font-bold text-[#4A4238] w-12 truncate">{t.name}</span>
                          <div className="flex-1 bg-[#E8E0D8] rounded-full h-1.5 overflow-hidden">
                            <div className="h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${t.pct}%`, backgroundColor: AXIS_COLORS[t.axis] || "#C5D4B6" }} />
                          </div>
                          <span className="text-[10px] font-mono text-[#4A4238]/50 w-7 text-right">{t.pct}%</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* 覆蓋率分析 */}
              {coverageAnalysis && (
                <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5">
                  <h4 className="text-sm font-black text-amber-800 mb-3">🔍 特質覆蓋率分析</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs font-bold text-green-700 mb-2">✅ 情境路線覆蓋（{coverageAnalysis.chosenTraits.length} 種）</p>
                      <div className="flex flex-wrap gap-1">
                        {coverageAnalysis.chosenTraits.map(id => {
                          const t = traits[id];
                          return t ? (
                            <span key={id} className="text-[10px] bg-green-50 border border-green-200 text-green-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                              <TraitIcon icon={t.icon} name={t.name} size="xs" /> {t.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-blue-700 mb-2">🎴 刷卡覆蓋（{coverageAnalysis.cardTraits.length} 種）</p>
                      <div className="flex flex-wrap gap-1">
                        {coverageAnalysis.cardTraits.map(id => {
                          const t = traits[id];
                          return t ? (
                            <span key={id} className="text-[10px] bg-blue-50 border border-blue-200 text-blue-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                              <TraitIcon icon={t.icon} name={t.name} size="xs" /> {t.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                    {coverageAnalysis.notCovered.length > 0 ? (
                      <div>
                        <p className="text-xs font-bold text-red-700 mb-2">❌ 本次未覆蓋（{coverageAnalysis.notCovered.length} 種）</p>
                        <div className="flex flex-wrap gap-1">
                          {coverageAnalysis.notCovered.map(id => {
                            const t = traits[id];
                            return t ? (
                              <span key={id} className="text-[10px] bg-red-50 border border-red-200 text-red-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                                <TraitIcon icon={t.icon} name={t.name} size="xs" /> {t.name}
                              </span>
                            ) : null;
                          })}
                        </div>
                        <p className="text-[10px] text-amber-700 mt-2 leading-relaxed">💡 這些特質在你走的路線中沒有被任何選項或刷卡覆蓋。建議檢查是否有其他路線可以覆蓋它們，或在刷卡題中補充。</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-bold text-green-700 mb-2">✅ 覆蓋率完整！</p>
                        <p className="text-[10px] text-green-700">這條路線 + 刷卡題覆蓋了所有特質。</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button onClick={resetSim} className="w-full py-3 border-2 border-[#4A4238] text-[#4A4238] rounded-xl font-bold text-sm tracking-widest hover:bg-[#F5EFE6] transition-colors">
                🔄 換一條路線再測試
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
