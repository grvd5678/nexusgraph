"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ZoomIn, ZoomOut, Maximize2, Sparkles } from "lucide-react";

export interface GraphNodeData {
  id: string;
  label: string;
  name: string;
  properties: Record<string, any>;
}

export interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  type: string;
  properties: Record<string, any>;
}

interface GraphCanvasProps {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  highlightedNodes: string[];
  selectedNode: GraphNodeData | null;
  onSelectNode: (node: GraphNodeData | null) => void;
}

export const LABEL_COLORS: Record<
  string,
  { bg: string; border: string; text: string; badge: string }
> = {
  Feature: {
    bg: "#064e3b",
    border: "#10b981",
    text: "#a7f3d0",
    badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  },
  Endpoint: {
    bg: "#0c4a6e",
    border: "#38bdf8",
    text: "#bae6fd",
    badge: "bg-sky-500/20 text-sky-300 border-sky-500/40",
  },
  Service: {
    bg: "#1e1b4b",
    border: "#818cf8",
    text: "#e0e7ff",
    badge: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
  },
  Database: {
    bg: "#451a03",
    border: "#f59e0b",
    text: "#fde68a",
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  },
  Decision: {
    bg: "#4a044e",
    border: "#e879f9",
    text: "#f5d0fe",
    badge: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40",
  },
  Incident: {
    bg: "#450a0a",
    border: "#f87171",
    text: "#fecaca",
    badge: "bg-red-500/20 text-red-300 border-red-500/40",
  },
  Task: {
    bg: "#134e4a",
    border: "#2dd4bf",
    text: "#99f6e4",
    badge: "bg-teal-500/20 text-teal-300 border-teal-500/40",
  },
  Developer: {
    bg: "#3b0764",
    border: "#c084fc",
    text: "#e9d5ff",
    badge: "bg-purple-500/20 text-purple-300 border-purple-500/40",
  },
  Team: {
    bg: "#431407",
    border: "#fb923c",
    text: "#fed7aa",
    badge: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  },
  Runbook: {
    bg: "#083344",
    border: "#06b6d4",
    text: "#a5f3fc",
    badge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
  },
};

// Hierarchical Y-tier layout so architecture + memory relationships read like an engineering diagram
const LABEL_TIER_Y: Record<string, number> = {
  Feature: 100,
  Endpoint: 220,
  Service: 360,
  Database: 510,
  Decision: 640,
  Incident: 760,
  Runbook: 760,
  Task: 760,
  Team: 880,
  Developer: 990,
};

export default function GraphCanvas({
  nodes,
  edges,
  highlightedNodes,
  selectedNode,
  onSelectNode,
}: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [zoom, setZoom] = useState<number>(0.82);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 30, y: 10 });
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const CANVAS_WIDTH = 1280;

  // Compute deterministic tiered layout whenever nodes change
  useEffect(() => {
    const grouped: Record<string, GraphNodeData[]> = {};
    for (const n of nodes) {
      const groupKey =
        n.label === "Task" ? "Incident" : n.label;
      if (!grouped[groupKey]) grouped[groupKey] = [];
      grouped[groupKey].push(n);
    }

    const nextPos: Record<string, { x: number; y: number }> = {};
    Object.entries(grouped).forEach(([groupKey, list]) => {
      const baseY = LABEL_TIER_Y[groupKey] ?? 450;
      const count = list.length;
      const spacing = Math.min(240, Math.max(150, (CANVAS_WIDTH - 140) / Math.max(count, 1)));
      const totalWidth = (count - 1) * spacing;
      const startX = CANVAS_WIDTH / 2 - totalWidth / 2;

      list.forEach((node, idx) => {
        // Slight alternating vertical stagger so edge labels never overlap horizontally
        const yOffset = idx % 2 === 0 ? -14 : 14;
        nextPos[node.id] = {
          x: startX + idx * spacing,
          y: baseY + yOffset,
        };
      });
    });

    setPositions(nextPos);
  }, [nodes]);

  const highlightSet = useMemo(() => new Set(highlightedNodes), [highlightedNodes]);
  const hasActiveHighlight = highlightSet.size > 0;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingNodeId) {
      const svgRect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - svgRect.left - pan.x) / zoom;
      const y = (e.clientY - svgRect.top - pan.y) / zoom;
      setPositions((prev) => ({
        ...prev,
        [draggingNodeId]: { x, y },
      }));
    } else if (isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    setDraggingNodeId(null);
    setIsPanning(false);
  };

  const resetView = () => {
    setZoom(0.82);
    setPan({ x: 30, y: 10 });
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-[#07090e] select-none"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, rgba(99, 102, 241, 0.14) 1px, transparent 0)",
        backgroundSize: "26px 26px",
      }}
    >
      {/* Top Floating Legend & Controls */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-gray-800/90 bg-gray-950/85 px-3 py-1.5 backdrop-blur-md pointer-events-auto">
          {Object.entries(LABEL_COLORS).map(([label, style]) => (
            <span
              key={label}
              className="flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium text-gray-300"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: style.border,
                  boxShadow: `0 0 8px ${style.border}`,
                }}
              />
              {label}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-gray-800 bg-gray-950/90 p-1 backdrop-blur-md pointer-events-auto">
          <button
            onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.12).toFixed(2)))}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.45, +(z - 0.12).toFixed(2)))}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={resetView}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white"
            title="Reset Canvas View"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Active Path Highlight Banner */}
      {hasActiveHighlight && (
        <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2 rounded-lg border border-violet-500/40 bg-violet-950/80 px-3.5 py-2 text-xs text-violet-200 shadow-lg backdrop-blur-md">
          <Sparkles className="h-4 w-4 text-violet-400 animate-pulse" />
          <span>
            Showing <strong>{highlightSet.size}</strong> traversed nodes in live
            FalkorDB reasoning path
          </span>
        </div>
      )}

      {/* Interactive SVG Graph */}
      <svg
        className="h-full w-full cursor-grab active:cursor-grabbing"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            setIsPanning(true);
            panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
            onSelectNode(null);
          }
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          <marker
            id="arrow-default"
            viewBox="0 0 10 10"
            refX="26"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#4b5563" />
          </marker>
          <marker
            id="arrow-highlight"
            viewBox="0 0 10 10"
            refX="24"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#a855f7" />
          </marker>
        </defs>

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Render Directed Edges */}
          {edges.map((edge) => {
            const src = positions[edge.source];
            const tgt = positions[edge.target];
            if (!src || !tgt) return null;

            const isEdgeHighlighted =
              hasActiveHighlight &&
              highlightSet.has(edge.source) &&
              highlightSet.has(edge.target);

            const opacity = hasActiveHighlight
              ? isEdgeHighlighted
                ? 1
                : 0.14
              : 0.65;

            const midX = (src.x + tgt.x) / 2;
            const midY = (src.y + tgt.y) / 2;

            return (
              <g key={edge.id} style={{ opacity, transition: "opacity 300ms ease" }}>
                <line
                  x1={src.x}
                  y1={src.y}
                  x2={tgt.x}
                  y2={tgt.y}
                  stroke={isEdgeHighlighted ? "#a855f7" : "#374151"}
                  strokeWidth={isEdgeHighlighted ? 2.8 : 1.4}
                  strokeDasharray={edge.type === "SUPERSEDES" ? "5,4" : undefined}
                  markerEnd={
                    isEdgeHighlighted ? "url(#arrow-highlight)" : "url(#arrow-default)"
                  }
                />
                <rect
                  x={midX - 38}
                  y={midY - 8}
                  width={76}
                  height={15}
                  rx={4}
                  fill="#090b10"
                  stroke={isEdgeHighlighted ? "#9333ea" : "#1f2937"}
                  strokeWidth={0.8}
                />
                <text
                  x={midX}
                  y={midY + 2.5}
                  textAnchor="middle"
                  fill={isEdgeHighlighted ? "#e9d5ff" : "#9ca3af"}
                  fontSize="8.5"
                  fontFamily="monospace"
                >
                  {edge.type}
                </text>
              </g>
            );
          })}

          {/* Render Graph Nodes */}
          {nodes.map((node) => {
            const pos = positions[node.id];
            if (!pos) return null;

            const colors = LABEL_COLORS[node.label] || LABEL_COLORS.Service;
            const isHighlighted = highlightSet.has(node.id);
            const isSelected = selectedNode?.id === node.id;
            const isDeprecated = node.properties?.status === "deprecated";

            const nodeOpacity = hasActiveHighlight
              ? isHighlighted
                ? 1
                : 0.22
              : 1;

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                style={{ opacity: nodeOpacity, transition: "opacity 300ms ease" }}
                className="cursor-pointer"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setDraggingNodeId(node.id);
                  onSelectNode(node);
                }}
              >
                {/* Outer Pulse Ring when Traversed by Agent */}
                {(isHighlighted || isSelected) && (
                  <circle
                    r={31}
                    fill="none"
                    stroke={isSelected ? "#ffffff" : colors.border}
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    className="animate-spin"
                    style={{ animationDuration: "10s" }}
                  />
                )}

                {/* Main Node Circle */}
                <circle
                  r={22}
                  fill={colors.bg}
                  stroke={isSelected ? "#ffffff" : colors.border}
                  strokeWidth={isHighlighted || isSelected ? 3 : 1.8}
                  style={{
                    filter: isHighlighted
                      ? `drop-shadow(0 0 14px ${colors.border})`
                      : undefined,
                  }}
                />

                {/* Node Label Badge Inside Circle */}
                <text
                  y={-2}
                  textAnchor="middle"
                  fill={colors.text}
                  fontSize="8"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {node.label.slice(0, 7).toUpperCase()}
                </text>

                {/* Status / Sub-badge */}
                <text
                  y={9}
                  textAnchor="middle"
                  fill={isDeprecated ? "#f87171" : "#d1d5db"}
                  fontSize="7"
                  fontFamily="monospace"
                >
                  {isDeprecated
                    ? "DEPRECATED"
                    : (node.properties?.tier ||
                        node.properties?.severity ||
                        node.properties?.priority ||
                        node.properties?.engine ||
                        "ACTIVE")
                        .toString()
                        .slice(0, 8)}
                </text>

                {/* Node Title Pill Below Circle */}
                <rect
                  x={-72}
                  y={26}
                  width={144}
                  height={18}
                  rx={5}
                  fill="rgba(9, 11, 16, 0.92)"
                  stroke={isHighlighted ? colors.border : "#1f2937"}
                  strokeWidth={1}
                />
                <text
                  y={38}
                  textAnchor="middle"
                  fill={isHighlighted ? "#ffffff" : "#e5e7eb"}
                  fontSize="10"
                  fontWeight={isHighlighted ? "600" : "500"}
                >
                  {node.id.length > 21 ? node.id.slice(0, 20) + "…" : node.id}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

