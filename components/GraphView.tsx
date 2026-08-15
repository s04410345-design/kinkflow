/**
 * ============================================================
 * 🌸 KinkFlow v1 (秋Day) — 模組架構標籤 (Module Tag)
 * 模組 ID  : 3-1, 3-2 (Wave 3 SVG 狼圖陰陽拓撲地圖與和風家紋徽章)
 * 路由路徑 : / (SVG 拓撲地圖組件)
 * 核心功能 : D3.js SVG 向量網路地圖、狼圖雙陰陽底紋圖騰、和風 Kamon 家紋徽章、拖曳與縮放控制
 * 對應檔案 : components/GraphView.tsx
 * ============================================================
 */
"use client";

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import type { GraphNode, GraphLink, AppData } from '@/lib/types';
import { graphNodes, graphLinks, getWafuColor } from '@/lib/constants';
import DrawerContent from '@/components/DrawerContent';
import { useQuizConfig } from '@/components/QuizContext';

// ================= 網絡圖視圖 =================
export default function GraphView({ onNodeClick, selectedNode, closeDrawer, userName, isGuest, appData, setAppData, showToast, onOpenIframe, targetPostId, onOpenArticle, nodesData, linksData, goBack, canGoBack, isEditMode, onNodeDragEnd, initialLobbyTab }: {
  onNodeClick: (node: GraphNode, postId?: string) => void;
  selectedNode: GraphNode | null;
  closeDrawer: () => void;
  userName: string;
  isGuest: boolean;
  appData: AppData;
  setAppData: (updater: AppData | ((prev: AppData) => AppData)) => void;
  showToast: (msg: string) => void;
  onOpenIframe: (url: string) => void;
  targetPostId: string | null;
  onOpenArticle: (title: string, content: string) => void;
  nodesData: GraphNode[];
  linksData: GraphLink[];
  goBack?: () => void;
  canGoBack?: boolean;
  isEditMode?: boolean;
  onNodeDragEnd?: (id: string, fx: number, fy: number) => void;
  initialLobbyTab?: 'info' | 'chat' | 'hot' | 'stats' | 'board';
}) {
  const quizConfig = useQuizConfig();
  const nodeImages = appData?.nodeImages || (quizConfig as any)?.nodeImages || {};
  const svgRef = useRef<SVGSVGElement | null>(null);
  const touchStartY = useRef(0);
  const touchCurrentY = useRef(0);
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  
  // ================= 節點座標快取 (防止展開抖動) =================
  const nodePositions = useRef<Record<string, {x: number, y: number}>>({});

  // ================= 展開/收合狀態 =================
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['bdsm', 'community_safety', 'bondage', 'ds_main', 'sm_main', 'sensory_deprivation', 'scenario_play', 'mental_control', 'consensus_risk', 'diverse_relations']));
  
  // ================= 手機版滿版視窗狀態 =================
  const [isDrawerFullScreen, setIsDrawerFullScreen] = useState(false);
  const toggleAll = () => {
    let newScale = 1;
    let targetY = 0;
    if (expandedNodes.size > 1) {
      setExpandedNodes(new Set(['bdsm']));
      newScale = 1.0; // 放大剛好能看到大廳與下一層
      targetY = 150; // 中心點放在大廳與第一層節點之間
    } else {
      setExpandedNodes(new Set(nodesData.map(n => n.id)));
      newScale = 0.38; // 適度縮小包含所有節點與卷軸
      targetY = 550; // 卷軸的視覺中心
    }
    const rootNode = nodesData.find(n => n.id === 'bdsm');
    if (rootNode) handlePanToNode(rootNode, newScale, targetY);
  };

  const handlePanToNode = (d: GraphNode, scaleOverride?: number, customTargetY?: number) => {
    if (!svgRef.current || !zoomRef.current) return;
    const svg = d3.select(svgRef.current);
    const target = staticPositions?.pos?.[d.id] || {x: 0, y: 0};
    const scale = scaleOverride || transformRef.current.k || 1;
    
    let offsetX = window.innerWidth / 2;
    let offsetY = window.innerHeight / 2;
    if (window.innerWidth < 768) {
      offsetY = (window.innerHeight * 0.45) / 2;
    } else {
      offsetX = (window.innerWidth - 500) / 2;
    }
    
    const yToUse = customTargetY !== undefined ? customTargetY : target.y;

    const newTransform = d3.zoomIdentity
      .translate(offsetX - target.x * scale, offsetY - yToUse * scale)
      .scale(scale);
      
    svg.transition().duration(800).call(zoomRef.current.transform, newTransform);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    // Only capture if clicking on the drag handle area (or we can just track globally in the drawer wrapper)
    touchStartY.current = e.touches[0].clientY;
    touchCurrentY.current = e.touches[0].clientY;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = () => {
    const diff = touchCurrentY.current - touchStartY.current;
    if (diff > 50) {
      if (isDrawerFullScreen) setIsDrawerFullScreen(false);
      else closeDrawer();
    } else if (diff < -50) {
      if (!isDrawerFullScreen) setIsDrawerFullScreen(true);
    }
  };

  // ================= 監聽外部跳轉，自動視角跟隨與展開 =================
  useEffect(() => {
    if (selectedNode) {
      const nodeData = nodesData.find(n => n.id === selectedNode.id);
      if (nodeData) {
         setExpandedNodes(prev => {
           const next = new Set(prev);
           let current = nodeData;
           while(current.parent) {
             next.add(current.parent);
             const parentNode = nodesData.find(n => n.id === current?.parent);
             if (parentNode) {
               current = parentNode;
             } else {
               break;
             }
           }
           next.add(nodeData.id);
           return next;
         });
         
         // Slightly delay panning to let the drawer open and nodes expand
         setTimeout(() => handlePanToNode(nodeData), 100);
      }
    }
  }, [selectedNode?.id, targetPostId, nodesData]);

  // ================= 節點座標計算 (由上往下道路地圖) =================
  const staticPositions = useMemo(() => {
    if (nodesData.length === 0) return {};
    try {
      const idSet = new Set(nodesData.map(n => n.id));
      const root = d3.stratify<GraphNode>()
        .id(d => d.id)
        .parentId(d => {
          if (d.id === 'bdsm') return undefined;
          return (d.parent && idSet.has(d.parent)) ? d.parent : 'bdsm';
        })(nodesData);
      
      const getColumnId = (d: any) => {
         let curr = d;
         while(curr && curr.depth > 1) curr = curr.parent;
         return curr ? curr.id : 'bdsm';
      };
      
      // 圓心放射心智圖 (Radial Mindmap Layout) 幾何算法
      const level1Children = (root.children || []);
      const count = level1Children.length;

      const nodesArr = root.descendants().map((d, index) => {
        let tx = 0;
        let ty = 0;

        if (d.depth === 0) {
          // 根節點（BDSM大廳）固定在圓心正中央
          tx = 0;
          ty = 0;
        } else if (d.depth === 1) {
          // Level 1 子節點依據角度均勻散發，沿著 410px 的圓周圍繞在四周，呈現大氣開闊的圓心放射
          const childIndex = level1Children.findIndex(child => child.id === d.id);
          const angle = (childIndex / (count || 1)) * 2 * Math.PI - Math.PI / 2; // 從頂部 12 點鐘方向開始順時針散發
          const radius = 410;
          tx = Math.cos(angle) * radius;
          ty = Math.sin(angle) * radius;
        } else {
          // Level 2+ 更深層節點沿著父節點的方向繼續向外放射
          const parentNode = d.parent;
          const parentIndex = level1Children.findIndex(child => child.id === (parentNode ? parentNode.id : ''));
          const baseAngle = (parentIndex >= 0 ? parentIndex / (count || 1) : 0) * 2 * Math.PI - Math.PI / 2;
          const offsetAngle = ((index % 3) - 1) * (Math.PI / 8);
          const radius = 620;
          tx = Math.cos(baseAngle + offsetAngle) * radius;
          ty = Math.sin(baseAngle + offsetAngle) * radius;
        }

        return {
          ...d.data,
          id: d.id,
          targetX: tx,
          targetY: ty,
          x: d.data.fx ?? tx,
          y: d.data.fy ?? ty,
          fx: d.data.fx,
          fy: d.data.fy,
          radius: d.data.radius || (d.depth === 0 ? 50 : 38),
          depth: d.depth
        };
      });

      // 產生交叉連線 (crossLinks)
      const crossLinks: any[] = [];
      nodesData.forEach(node => {
        if (node.crossLinks && Array.isArray(node.crossLinks)) {
          node.crossLinks.forEach(targetId => {
            if (nodesData.some(n => n.id === targetId)) {
              crossLinks.push({ source: node.id, target: targetId });
            }
          });
        }
      });

      const pos: Record<string, {x: number, y: number, depth?: number}> = {};
      nodesArr.forEach(n => {
        if (n.id) {
          pos[n.id] = { x: n.targetX, y: n.targetY, depth: n.depth };
        }
      });
      
      return { pos, crossLinks };
    } catch (e) {
      console.error(e);
      return { pos: {}, crossLinks: [] };
    }
  }, [nodesData]);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const width = window.innerWidth, height = window.innerHeight - 64;
    svg.attr("width", width).attr("height", height);

    if (svg.select("g.zoom-layer").empty()) {
      const defs = svg.append("defs");
      const filter = defs.append("filter").attr("id", "glow").attr("x", "-20%").attr("y", "-20%").attr("width", "140%").attr("height", "140%");
      filter.append("feGaussianBlur").attr("stdDeviation", "6").attr("result", "blur");
      filter.append("feComposite").attr("in", "SourceGraphic").attr("in2", "blur").attr("operator", "over");

      // 厚重乾枯毛筆濾鏡 (Thick Dry Brush) - 僅微幅侵蝕邊緣，保留主幹厚度
      const thickBrush = defs.append("filter").attr("id", "thick-brush").attr("x", "-20%").attr("y", "-20%").attr("width", "140%").attr("height", "140%");
      thickBrush.append("feTurbulence").attr("type", "fractalNoise").attr("baseFrequency", "0.4").attr("numOctaves", "2").attr("result", "noise");
      thickBrush.append("feDisplacementMap").attr("in", "SourceGraphic").attr("in2", "noise").attr("scale", "1.5").attr("xChannelSelector", "R").attr("yChannelSelector", "G").attr("result", "displaced");

      const zoom = d3.zoom<SVGSVGElement, unknown>().on("zoom", e => {
        transformRef.current = e.transform;
        svg.select("g.zoom-layer").attr("transform", e.transform);
      });
      zoomRef.current = zoom;
      svg.call(zoom);

      // 加入透明背景層以捕捉拖曳與縮放事件
      svg.append("rect")
         .attr("width", "100%")
         .attr("height", "100%")
         .attr("fill", "transparent")
         .style("pointer-events", "all");

      let initOffsetX = width / 2;
      let initOffsetY = height / 2;
      
      const initScale = 0.75;
      const initialTransform = d3.zoomIdentity.translate(initOffsetX, initOffsetY).scale(initScale);
      
      transformRef.current = initialTransform;
      svg.call(zoom.transform, initialTransform);

      const noisePattern = defs.append("pattern")
        .attr("id", "noise-pattern")
        .attr("width", 200)
        .attr("height", 200)
        .attr("patternUnits", "userSpaceOnUse");
      noisePattern.append("image")
        .attr("width", 200)
        .attr("height", 200)
        .attr("href", "data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");

      const container = svg.append("g").attr("class", "zoom-layer")
        .attr("transform", initialTransform.toString());
      
      const bgLayer = container.append("g").attr("class", "background-layer");
      
      // 讀取後台全域設定
      const mindmapBg = quizConfig?.globalAssets?.mindmapBgUrl || "/images/scroll_bg.svg";
      const siteLogo = quizConfig?.globalAssets?.siteLogoUrl || "/images/logo.png";

      // 卷軸背景已依使用者需求移除，保持畫面極簡清爽

      // 背景浮水印 Logo（純圓形，外圈對齊子節點圓周 radius=460）
      bgLayer.append("image")
        .attr("x", -460)
        .attr("y", -460)
        .attr("width", 920)
        .attr("height", 920)
        .attr("href", "/images/logo_transparent.png")
        .attr("opacity", 0.40)
        .style("filter", "drop-shadow(0 0 8px rgba(184,134,11,0.20))")
        .style("pointer-events", "none");

      container.append("g").attr("class", "links-layer");
      container.append("g").attr("class", "nodes-layer");
    }

    const container = svg.select("g.zoom-layer");
    const defs = svg.select("defs");
    
    // 過濾出目前可見的節點
    const visibleNodeIds = new Set<string>();
    nodesData.filter(n => Number(n.level) === 0).forEach(n => visibleNodeIds.add(n.id));
    let added = true;
    while(added) {
      added = false;
      for (const n of nodesData) {
        if (!visibleNodeIds.has(n.id) && n.parent && visibleNodeIds.has(n.parent) && expandedNodes.has(n.parent)) {
          visibleNodeIds.add(n.id);
          added = true;
        }
      }
    }
    const nodes = nodesData.filter(n => visibleNodeIds.has(n.id));
    const links = linksData.filter(l => {
      const sourceId = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id;
      const targetId = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id;
      return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
    });

    const crossLinks = (staticPositions?.crossLinks || []).filter((l: any) => {
      const sourceId = l.source;
      const targetId = l.target;
      return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
    });

    // 移除 Pattern 產生邏輯，改為直接在 node group 內繪製

    // 繪製水墨風格連線
    const linkSelection = container.select("g.links-layer").selectAll<SVGPathElement, GraphLink>("path.main-link")
      .data(links, (d: any) => `main-${d.id || `${(d.source as any).id || d.source}-${(d.target as any).id || d.target}`}`);
      
    linkSelection.join(
      enter => enter.append("path")
        .attr("class", "main-link")
        .attr("stroke", d => {
          const targetColor = (d.target as any).color || "#D1C6B4";
          return targetColor;
        })
        .attr("fill", "none")
        .attr("stroke-opacity", 0)
        .attr("stroke-width", d => Number((d.target as any).level) === 1 ? 8 : 5)
        .attr("stroke-linecap", "round")
        .attr("d", d => {
          const sx = staticPositions?.pos?.[(d.source as any).id || d.source as string]?.x || 0;
          const sy = staticPositions?.pos?.[(d.source as any).id || d.source as string]?.y || 0;
          const tx = staticPositions?.pos?.[(d.target as any).id || d.target as string]?.x || 0;
          const ty = staticPositions?.pos?.[(d.target as any).id || d.target as string]?.y || 0;
          const dx = tx - sx, dy = ty - sy;
          return `M${sx},${sy} Q${sx + dx/2 + dy*0.15},${sy + dy/2 - dx*0.15} ${tx},${ty}`;
        })
        .style("filter", "url(#thick-brush)")
        .call(e => e.transition().duration(800).attr("stroke-opacity", 0.9)),
      update => update.attr("d", d => {
          const sx = staticPositions?.pos?.[(d.source as any).id || d.source as string]?.x || 0;
          const sy = staticPositions?.pos?.[(d.source as any).id || d.source as string]?.y || 0;
          const tx = staticPositions?.pos?.[(d.target as any).id || d.target as string]?.x || 0;
          const ty = staticPositions?.pos?.[(d.target as any).id || d.target as string]?.y || 0;
          const dx = tx - sx, dy = ty - sy;
          return `M${sx},${sy} Q${sx + dx/2 + dy*0.15},${sy + dy/2 - dx*0.15} ${tx},${ty}`;
      }),
      exit => exit.transition().duration(400).attr("stroke-opacity", 0).remove()
    );

    // 繪製交叉連線 (使用象徵姻緣羈絆的紅色紅線)
    const crossLinkSelection = container.select("g.links-layer").selectAll<SVGPathElement, any>("path.cross-link")
      .data(crossLinks, (d: any) => `cross-${d.source}-${d.target}`);
      
    crossLinkSelection.join(
      enter => enter.append("path")
        .attr("class", "cross-link")
        .attr("stroke", "#1A1612")
        .attr("fill", "none")
        .attr("stroke-opacity", 0)
        .attr("stroke-width", 3)
        .attr("stroke-dasharray", "6,6")
        .attr("stroke-linecap", "round")
        .attr("d", d => {
          const sx = staticPositions?.pos?.[d.source]?.x || 0;
          const sy = staticPositions?.pos?.[d.source]?.y || 0;
          const tx = staticPositions?.pos?.[d.target]?.x || 0;
          const ty = staticPositions?.pos?.[d.target]?.y || 0;
          const dx = tx - sx, dy = ty - sy;
          return `M${sx},${sy} Q${sx + dx/2 - dy*0.15},${sy + dy/2 + dx*0.15} ${tx},${ty}`;
        })
        .style("filter", "url(#thick-brush)")
        .call(e => e.transition().duration(800).attr("stroke-opacity", 0.6)),
      update => update.attr("d", d => {
          const sx = staticPositions?.pos?.[d.source]?.x || 0;
          const sy = staticPositions?.pos?.[d.source]?.y || 0;
          const tx = staticPositions?.pos?.[d.target]?.x || 0;
          const ty = staticPositions?.pos?.[d.target]?.y || 0;
          const dx = tx - sx, dy = ty - sy;
          return `M${sx},${sy} Q${sx + dx/2 - dy*0.15},${sy + dy/2 + dx*0.15} ${tx},${ty}`;
      }),
      exit => exit.transition().duration(400).attr("stroke-opacity", 0).remove()
    );

    // 繪製節點
    const nodeSelection = container.select("g.nodes-layer").selectAll<SVGGElement, GraphNode>("g.node-group")
      .data(nodes, d => d.id);
      
    nodeSelection.join(
      enter => {
        const g = enter.append("g")
          .attr("class", "node-group")
           .attr("transform", d => {
              const p = d.parent && staticPositions?.pos?.[d.parent] ? staticPositions?.pos?.[d.parent] : staticPositions?.pos?.[d.id];
              return `translate(${p?.x || 0},${p?.y || 0}) scale(0.1)`;
           })
           .attr("id", d => `node-${d.id}`)
          .style("cursor", isEditMode ? "grab" : "pointer")
          .on("click", (e, d) => {
            if (isEditMode) return; // Prevent click navigation in edit mode
            e.stopPropagation();
            if (nodesData.some(n => n.parent === d.id)) {
              setExpandedNodes(prev => {
                const next = new Set(prev);
                if (next.has(d.id)) next.delete(d.id);
                else next.add(d.id);
                return next;
              });
            }
            handlePanToNode(d);
            onNodeClick(d);
          });
          
        g.each(function(d) {
          const group = d3.select(this);
          
          if (isEditMode) {
             const drag = d3.drag<SVGGElement, GraphNode>()
               .on("start", function() {
                  d3.select(this).style("cursor", "grabbing");
               })
               .on("drag", function(e, d) {
                  d3.select(this).attr("transform", `translate(${e.x},${e.y}) scale(1)`);
               })
               .on("end", function(e, d) {
                  d3.select(this).style("cursor", "grab");
                  if (onNodeDragEnd) onNodeDragEnd(d.id, Math.round(e.x), Math.round(e.y));
               });
             group.call(drag as any);
          }
          
          const baseRadius = d.radius || 40;
          const r = d.id === 'bdsm' ? baseRadius * 1.5 : baseRadius; // 1.5 倍精緻存在感
          const colId = (staticPositions?.pos?.[d.id] as any)?.colId;
          const strokeColor = d.id === selectedNode?.id ? "#8B7355" : "#1A1612";
          const strokeW = d.id === selectedNode?.id ? 4 : 3;
          
          let paperFill = getWafuColor(d.color) || "#F4EFE6";
          
          // 如果是第二層以下的子節點，色階調淺 (與宣紙底色混合)
          if ((d.level || 0) >= 2) {
            paperFill = d3.interpolate(paperFill, "#F4EFE6")(0.55);
          }

          // --- SVG Shapes ---
          let shapeType = d.shape;
          if (!shapeType) {
            if (d.id === 'bdsm') shapeType = 'plaque';
            else if (colId === 'community_safety') shapeType = 'hexagon';
            else if (colId === 'bd_main') shapeType = 'octagon';
            else if (colId === 'ds_main') shapeType = 'diamond';
            else if (colId === 'sm_main') shapeType = 'drop';
            else shapeType = 'circle';
          }

          if (shapeType === 'plaque') {
             // 16:9 繪馬/匾額 (放大)
             const ew = r * 2.5;
             const eh = r * 1.4;
             group.append("path").attr("class", "frame-stroke frame-stroke-main")
               .attr("d", `M${-ew},${-eh*0.6} L0,${-eh} L${ew},${-eh*0.6} L${ew},${eh} L${-ew},${eh} Z`)
               .attr("fill", paperFill).attr("stroke", strokeColor).attr("stroke-width", strokeW).attr("stroke-linejoin", "round");
             // 內側細線描邊
             const inEw = ew - 6, inEh = eh - 6;
             group.append("path").attr("class", "frame-stroke")
               .attr("d", `M${-inEw},${-inEh*0.6} L0,${-inEh} L${inEw},${-inEh*0.6} L${inEw},${inEh} L${-inEw},${inEh} Z`)
               .attr("fill", "none").attr("stroke", strokeColor).attr("stroke-width", 1).attr("stroke-linejoin", "round");
             // 頂部的洞
             group.append("circle").attr("class", "frame-stroke")
               .attr("cx", 0).attr("cy", -eh*0.7).attr("r", r*0.08)
               .attr("fill", "#1A1612");
          } else if (shapeType === 'hexagon') {
             const h = r * 1.3;
             group.append("path").attr("class", "frame-stroke frame-stroke-main")
               .attr("d", `M0,${-h} L${h*0.866},${-h*0.5} L${h*0.866},${h*0.5} L0,${h} L${-h*0.866},${h*0.5} L${-h*0.866},${-h*0.5} Z`)
               .attr("fill", paperFill).attr("stroke", strokeColor).attr("stroke-width", strokeW).attr("stroke-linejoin", "round");
             group.append("path").attr("class", "frame-stroke")
               .attr("d", `M0,${-h*0.85} L${h*0.736},${-h*0.425} L${h*0.736},${h*0.425} L0,${h*0.85} L${-h*0.736},${h*0.425} L${-h*0.736},${-h*0.425} Z`)
               .attr("fill", paperFill).attr("stroke", strokeColor).attr("stroke-width", 1.5).attr("stroke-linejoin", "round");
          } else if (shapeType === 'octagon') {
             const h = r * 1.3;
             const a = h * 0.414;
             group.append("path").attr("class", "frame-stroke frame-stroke-main")
               .attr("d", `M${-a},${-h} L${a},${-h} L${h},${-a} L${h},${a} L${a},${h} L${-a},${h} L${-h},${a} L${-h},${-a} Z`)
               .attr("fill", paperFill).attr("stroke", strokeColor).attr("stroke-width", strokeW).attr("stroke-linejoin", "round");
             group.append("circle").attr("class", "frame-stroke")
               .attr("r", h * 0.75)
               .attr("fill", paperFill).attr("stroke", strokeColor).attr("stroke-width", 1.5);
          } else if (shapeType === 'diamond') {
             const h = r * 1.25;
             group.append("path").attr("class", "frame-stroke frame-stroke-main")
               .attr("d", `M${-h*0.4},${-h} Q0,${-h*0.7} ${h*0.4},${-h} Q${h},${-h*0.7} ${h},0 Q${h},${h*0.7} ${h*0.4},${h} Q0,${h*0.7} ${-h*0.4},${h} Q${-h},${h*0.7} ${-h},0 Q${-h},${-h*0.7} ${-h*0.4},${-h} Z`)
               .attr("fill", paperFill).attr("stroke", strokeColor).attr("stroke-width", strokeW).attr("stroke-linejoin", "round");
             group.append("path").attr("class", "frame-stroke")
               .attr("d", `M${-h*0.3},${-h*0.8} Q0,${-h*0.6} ${h*0.3},${-h*0.8} Q${h*0.8},${-h*0.6} ${h*0.8},0 Q${h*0.8},${h*0.6} ${h*0.3},${h*0.8} Q0,${h*0.6} ${-h*0.3},${h*0.8} Q${-h*0.8},${h*0.6} ${-h*0.8},0 Q${-h*0.8},${-h*0.6} ${-h*0.3},${-h*0.8} Z`)
               .attr("fill", paperFill).attr("stroke", strokeColor).attr("stroke-width", 1.5).attr("stroke-linejoin", "round");
          } else if (shapeType === 'drop') {
             const h = r * 1.4;
             group.append("path").attr("class", "frame-stroke frame-stroke-main")
               .attr("d", `M0,${h*0.8} L${-h},${-h*0.3} A${h*1.3},${h*1.3} 0 0,1 ${h},${-h*0.3} Z`)
               .attr("fill", paperFill).attr("stroke", strokeColor).attr("stroke-width", strokeW).attr("stroke-linejoin", "round");
             group.append("path").attr("class", "frame-stroke")
               .attr("d", `M${-h*0.4},${h*0.36} A${h*0.5},${h*0.5} 0 0,1 ${h*0.4},${h*0.36}`)
               .attr("fill", paperFill).attr("stroke", strokeColor).attr("stroke-width", 2);
             [-0.8, -0.4, 0, 0.4, 0.8].forEach(ang => {
                group.append("line").attr("class", "frame-stroke")
                  .attr("x1", 0).attr("y1", h*0.8)
                  .attr("x2", h * 1.25 * Math.sin(ang)).attr("y2", h*0.8 - h * 1.25 * Math.cos(ang))
                  .attr("stroke", strokeColor).attr("stroke-width", 1);
             });
             // 重繪外框以覆蓋扇骨超出邊緣的部分
             group.append("path").attr("class", "frame-stroke frame-stroke-main")
               .attr("d", `M0,${h*0.8} L${-h},${-h*0.3} A${h*1.3},${h*1.3} 0 0,1 ${h},${-h*0.3} Z`)
               .attr("fill", paperFill).attr("stroke", strokeColor).attr("stroke-width", strokeW).attr("stroke-linejoin", "round");
          } else if (shapeType === 'triangle') {
             const h = r * 1.5;
             group.append("path").attr("class", "frame-stroke frame-stroke-main")
               .attr("d", `M0,${-h} L${h*0.866},${h*0.5} L${-h*0.866},${h*0.5} Z`)
               .attr("fill", paperFill).attr("stroke", strokeColor).attr("stroke-width", strokeW).attr("stroke-linejoin", "round");
          } else if (shapeType === 'square') {
             const h = r * 1.2;
             group.append("path").attr("class", "frame-stroke frame-stroke-main")
               .attr("d", `M${-h},${-h} L${h},${-h} L${h},${h} L${-h},${h} Z`)
               .attr("fill", paperFill).attr("stroke", strokeColor).attr("stroke-width", strokeW).attr("stroke-linejoin", "round");
          } else if (shapeType === 'star') {
             const h = r * 1.4;
             group.append("path").attr("class", "frame-stroke frame-stroke-main")
               .attr("d", `M0,${-h} L${h*0.22},${-h*0.3} L${h},${-h*0.3} L${h*0.38},${h*0.15} L${h*0.58},${h} L0,${h*0.5} L${-h*0.58},${h} L${-h*0.38},${h*0.15} L${-h},${-h*0.3} L${-h*0.22},${-h*0.3} Z`)
               .attr("fill", paperFill).attr("stroke", strokeColor).attr("stroke-width", strokeW).attr("stroke-linejoin", "round");
          } else if (shapeType === 'heart') {
             const h = r * 1.2;
             group.append("path").attr("class", "frame-stroke frame-stroke-main")
               .attr("d", `M0,${h*0.5} C0,${h*0.5} ${-h*1.2},${-h*0.2} ${-h},${-h*0.6} C${-h*0.8},${-h} 0,${-h*0.8} 0,${-h*0.4} C0,${-h*0.8} ${h*0.8},${-h} ${h},${-h*0.6} C${h*1.2},${-h*0.2} 0,${h*0.5} 0,${h*0.5} Z`)
               .attr("fill", paperFill).attr("stroke", strokeColor).attr("stroke-width", strokeW).attr("stroke-linejoin", "round");
          } else if (shapeType === 'cloud') {
             const h = r * 1.2;
             group.append("path").attr("class", "frame-stroke frame-stroke-main")
               .attr("d", `M${-h*0.5},${h*0.5} C${-h},${h*0.5} ${-h},${-h*0.2} ${-h*0.5},${-h*0.2} C${-h*0.5},${-h*0.8} ${h*0.2},${-h*0.8} ${h*0.4},${-h*0.4} C${h},${-h*0.4} ${h},${h*0.3} ${h*0.6},${h*0.5} Z`)
               .attr("fill", paperFill).attr("stroke", strokeColor).attr("stroke-width", strokeW).attr("stroke-linejoin", "round");
          } else if (shapeType === 'cross') {
             const h = r * 1.3;
             const w = h * 0.4;
             group.append("path").attr("class", "frame-stroke frame-stroke-main")
               .attr("d", `M${-w},${-h} L${w},${-h} L${w},${-w} L${h},${-w} L${h},${w} L${w},${w} L${w},${h} L${-w},${h} L${-w},${w} L${-h},${w} L${-h},${-w} L${-w},${-w} Z`)
               .attr("fill", paperFill).attr("stroke", strokeColor).attr("stroke-width", strokeW).attr("stroke-linejoin", "round");
          } else if (shapeType === 'badge') {
             const h = r * 1.3;
             group.append("path").attr("class", "frame-stroke frame-stroke-main")
               .attr("d", `M0,${-h} L${h*0.8},${-h*0.6} L${h*0.8},${h*0.6} L0,${h} L${-h*0.8},${h*0.6} L${-h*0.8},${-h*0.6} Z`)
               .attr("fill", paperFill).attr("stroke", strokeColor).attr("stroke-width", strokeW).attr("stroke-linejoin", "round");
          } else {
             group.append("circle").attr("class", "frame-stroke frame-stroke-main")
               .attr("r", r * 1.2).attr("fill", paperFill).attr("stroke", strokeColor).attr("stroke-width", strokeW);
          }

          // --- Dynamic ClipPath for Node Shape Seamless Integration ---
          const clipId = `clip-node-${d.id}`;
          const clipPath = defs.append("clipPath").attr("id", clipId);

          if (shapeType === 'plaque') {
             const ew = r * 2.3;
             const eh = r * 1.3;
             clipPath.append("path").attr("d", `M${-ew},${-eh*0.6} L0,${-eh} L${ew},${-eh*0.6} L${ew},${eh} L${-ew},${eh} Z`);
          } else if (shapeType === 'hexagon') {
             const h = r * 1.2;
             clipPath.append("path").attr("d", `M0,${-h} L${h*0.866},${-h*0.5} L${h*0.866},${h*0.5} L0,${h} L${-h*0.866},${h*0.5} L${-h*0.866},${-h*0.5} Z`);
          } else if (shapeType === 'octagon') {
             const h = r * 1.2;
             const a = h * 0.414;
             clipPath.append("path").attr("d", `M${-a},${-h} L${a},${-h} L${h},${-a} L${h},${a} L${a},${h} L${-a},${h} L${-h},${a} L${-h},${-a} Z`);
          } else if (shapeType === 'diamond') {
             const h = r * 1.2;
             clipPath.append("path").attr("d", `M${-h*0.4},${-h} Q0,${-h*0.7} ${h*0.4},${-h} Q${h},${-h*0.7} ${h},0 Q${h},${h*0.7} ${h*0.4},${h} Q0,${h*0.7} ${-h*0.4},${h} Q${-h},${h*0.7} ${-h},0 Q${-h},${-h*0.7} ${-h*0.4},${-h} Z`);
          } else if (shapeType === 'drop') {
             const h = r * 1.3;
             clipPath.append("path").attr("d", `M0,${h*0.8} L${-h},${-h*0.3} A${h*1.3},${h*1.3} 0 0,1 ${h},${-h*0.3} Z`);
          } else {
             clipPath.append("circle").attr("r", r * 1.15);
          }

          // --- Inner Kamon / Icon Image ---
          const nodeImages = appData?.nodeImages || (quizConfig as any)?.nodeImages || {};
          const siteLogo = quizConfig?.globalAssets?.siteLogoUrl || "/images/logo.png";
          const nodeDictImage = nodeImages[d.id]?.kamon || nodeImages[d.id]?.icon;
          const rawImg = nodeDictImage || d.kamonIcon || d.icon || d.image;
          const imgUrl = (rawImg && typeof rawImg === 'string' && rawImg.trim()) 
            ? rawImg 
            : (d.id === 'bdsm' ? (nodeImages['bdsm']?.kamon || siteLogo) : '');

          if (imgUrl && typeof imgUrl === 'string' && (imgUrl.startsWith('http') || imgUrl.startsWith('/'))) {
            const imgScale = shapeType === 'plaque' ? 1.4 : 1.15;
            const imgSize = r * 2 * imgScale;
            let imgYOffset = 0;
            if (shapeType === 'drop') imgYOffset = -r * 0.15;

            group.append("image")
              .attr("href", imgUrl)
              .attr("xlink:href", imgUrl)
              .attr("x", -imgSize/2)
              .attr("y", -imgSize/2 + imgYOffset)
              .attr("width", imgSize)
              .attr("height", imgSize)
              .attr("clip-path", `url(#${clipId})`)
              .style("mix-blend-mode", d.id === 'bdsm' ? "normal" : "multiply") // 大廳節點原色顯示，子節點溶入宣紙
              .style("opacity", 0.95)
              .attr("preserveAspectRatio", "xMidYMid meet")
              .on("error", function() { 
                d3.select(this).remove();
                if (d.icon && !d.icon.startsWith('http') && !d.icon.startsWith('/')) {
                  group.append("text")
                    .attr("text-anchor", "middle")
                    .attr("dominant-baseline", "central")
                    .attr("font-size", `${r}px`)
                    .text(d.icon);
                }
              });
          } else if (d.icon) {
            // 文字/Emoji 圖示 Fallback
            group.append("text")
              .attr("text-anchor", "middle")
              .attr("dominant-baseline", "central")
              .attr("font-size", `${r * 0.9}px`)
              .text(d.icon);
          }

          // --- Node Label ---
          group.append("text").text(d.label)
            .attr("y", shapeType === 'plaque' ? (r * 0.9 + 55) : (shapeType === 'drop' ? r * 1.2 + 65 : r * 1.2 + 50))
            .attr("text-anchor", "middle")
            .attr("font-size", staticPositions?.pos?.[d.id]?.depth === 0 ? "26px" : "18px")
            .attr("font-weight", "900")
            .attr("font-family", '"Noto Serif TC", "PMingLiU", serif')
            .attr("fill", "#0F0C0A")
            .attr("stroke", "rgba(255, 255, 255, 0.98)")
            .attr("stroke-width", 5)
            .attr("paint-order", "stroke fill")
            .style("pointer-events", "none");
        });

        g.transition().duration(800).ease(d3.easeCubicOut)
          .attr("transform", d => {
             const target = staticPositions?.pos?.[d.id] || {x:0, y:0};
             return `translate(${target.x},${target.y}) scale(1)`;
          })
          .style("opacity", 1);
          
        return g;
      },
      update => {
        update.selectAll(".frame-stroke")
          .attr("stroke", function(this: any) { 
            const d = d3.select(this.parentNode as Element).datum() as any;
            return d.id === selectedNode?.id ? "#8B7355" : "#1A1612";
          });
        update.selectAll(".frame-stroke-main")
          .attr("stroke-width", function(this: any) { 
            const d = d3.select(this.parentNode as Element).datum() as any;
            return d.id === selectedNode?.id ? 4 : 3;
          });

        return update;
      },
      exit => exit.transition().duration(400)
        .attr("transform", d => {
           const p = d.parent && staticPositions?.pos?.[d.parent] ? staticPositions?.pos?.[d.parent] : staticPositions?.pos?.[d.id];
           return `translate(${p?.x || 0},${p?.y || 0}) scale(0.1)`;
        })
        .style("opacity", 0)
        .remove()
    );

    const handleResize = () => {
      const rect = svgRef.current?.parentElement?.getBoundingClientRect();
      if (!rect) return;
      svg.attr("width", rect.width).attr("height", rect.height);
    };
    window.addEventListener('resize', handleResize);
    
    return () => { window.removeEventListener('resize', handleResize); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onNodeClick, expandedNodes, staticPositions]);

  return (
    <div className="w-full h-full relative overflow-hidden flex justify-center bg-transparent">


      <svg ref={svgRef} className="absolute inset-0 z-10 w-full h-full cursor-grab active:cursor-grabbing pointer-events-auto"></svg>
      <div 
        className={`absolute bottom-0 md:top-0 right-0 ${isDrawerFullScreen ? 'h-[95dvh] max-h-[100dvh]' : 'h-[55dvh] max-h-[100dvh]'} md:h-full w-full md:w-[500px] bg-white/95 backdrop-blur-xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] md:shadow-2xl rounded-t-[2rem] md:rounded-none md:border-l border-[#D1C6B4]/20 transform transition-all duration-300 ease-out flex flex-col z-20 ${selectedNode ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-y-0 md:translate-x-full'}`}
      >
        {/* Mobile Drag Handle */}
        {selectedNode && (
          <div 
            className="md:hidden w-full h-10 flex flex-col items-center justify-center shrink-0 cursor-ns-resize touch-none hover:bg-[#D1C6B4]/10 transition-colors rounded-t-3xl"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={() => setIsDrawerFullScreen(!isDrawerFullScreen)}
          >
            <div className="w-12 h-1.5 bg-[#D1C6B4]/60 rounded-full mb-1"></div>
            <span className="text-[10px] font-bold text-[#D1C6B4] tracking-widest">{isDrawerFullScreen ? '點擊或向下滑動縮小' : '點擊或向上滑動滿版'}</span>
          </div>
        )}
        
        {selectedNode && (
          <div className="flex-1 overflow-hidden relative">
            <DrawerContent 
              node={selectedNode} 
              closeDrawer={closeDrawer} 
              userName={userName}
              appData={appData}
              setAppData={setAppData}
              showToast={showToast}
              isGuest={isGuest}
              onOpenIframe={onOpenIframe}
              targetPostId={targetPostId}
              onOpenArticle={onOpenArticle}
              onJump={(nid, pid) => {
                const targetNode = nodesData.find(n => n.id === nid);
                if (targetNode) onNodeClick(targetNode, pid);
              }}
              nodesData={nodesData}
              goBack={goBack}
              canGoBack={canGoBack}
              initialLobbyTab={initialLobbyTab}
            />
          </div>
        )}
      </div>
    </div>
  );
}
