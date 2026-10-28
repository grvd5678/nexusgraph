"use client";

import React, { useEffect, useState } from "react";
import GraphCanvas, { GraphEdgeData, GraphNodeData, LABEL_COLORS } from "@/components/GraphCanvas";
import { WORKSPACE_SCENARIOS } from "@/lib/scenarios";
import {
  AgentResponse,
  BenchmarkResult,
  ChaosSimulationResult,
  fetchBenchmark,
  fetchTopology,
  fetchWorkspaces,
  ingestNote,
  ingestPdf,
  queryAgents,
  resetDemoGraphs,
  triggerChaos,
} from "@/lib/api";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  Check,
  CheckCircle2,
  Copy,
  Cpu,
  Database,
  FileUp,
  Flame,
  Layers,
  Network,
  Play,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
  Terminal,
  X,
  Zap,
} from "lucide-react";

export default function NexusCommandCenter() {
  const [workspaceId, setWorkspaceId] = useState<string>("FinPulse-Prod");
  const [nodes, setNodes] = useState<GraphNodeData[]>([]);
  const [edges, setEdges] = useState<GraphEdgeData[]>([]);
  const [queryTimeMs, setQueryTimeMs] = useState<number>(0);
  const [highlightedNodes, setHighlightedNodes] = useState<string[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNodeData | null>(null);

  const [promptInput, setPromptInput] = useState<string>("");
  const [noteInput, setNoteInput] = useState<string>(
    "Gourav Das authored a new architectural decision on Portfolio-Engine: Enforce Redis circuit breaker before querying Neon-Postgres-Primary to supersede DEC-112."
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isIngesting, setIsIngesting] = useState<boolean>(false);
  const [agentResult, setAgentResult] = useState<AgentResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"answer" | "handoffs" | "cypher">("answer");
  const [copiedCmd, setCopiedCmd] = useState<boolean>(false);
  const [isExecutingPb, setIsExecutingPb] = useState<boolean>(false);
  const [pbExecuted, setPbExecuted] = useState<boolean>(false);

  const [chaosMode, setChaosMode] = useState<boolean>(false);
  const [chaosResult, setChaosResult] = useState<ChaosSimulationResult | null>(null);
  const [isSimulatingChaos, setIsSimulatingChaos] = useState<boolean>(false);

  const [showBenchmark, setShowBenchmark] = useState<boolean>(false);
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkResult | null>(null);
  const [isLoadingBenchmark, setIsLoadingBenchmark] = useState<boolean>(false);

  const handleTriggerChaos = async (nodeName?: string) => {
    const target = nodeName || selectedNode?.name || (workspaceId === "FinPulse-Prod" ? "Neon-Postgres-Primary" : "Payment-Router");
    setIsSimulatingChaos(true);
    try {
      const res = await triggerChaos(workspaceId, target, 500);
      setChaosResult(res);
      setHighlightedNodes(res.highlighted_nodes || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSimulatingChaos(false);
    }
  };

  const handleOpenBenchmark = async () => {
    setShowBenchmark(true);
    setIsLoadingBenchmark(true);
    try {
      const data = await fetchBenchmark(workspaceId);
      setBenchmarkData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingBenchmark(false);
    }
  };

  const handleCopyCmd = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const handleExecutePlaybook = () => {
    setIsExecutingPb(true);
    setTimeout(() => {
      setIsExecutingPb(false);
      setPbExecuted(true);
    }, 1200);
  };

  const loadGraph = async (ws: string) => {
    try {
      const topo = await fetchTopology(ws);
      setNodes(topo.nodes);
      setEdges(topo.edges);
      setQueryTimeMs(topo.query_time_ms);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
    loadGraph(workspaceId);
  }, [workspaceId]);

  const handleRunInvestigation = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsLoading(true);
    setPromptInput(queryText);
    setCopiedCmd(false);
    setIsExecutingPb(false);
    setPbExecuted(false);
    try {
      const result = await queryAgents(workspaceId, queryText);
      setAgentResult(result);
      setHighlightedNodes(result.highlighted_nodes || []);
      await loadGraph(workspaceId);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommitNote = async () => {
    if (!noteInput.trim()) return;
    setIsIngesting(true);
    try {
      const result = await ingestNote(workspaceId, noteInput);
      setAgentResult(result);
      setHighlightedNodes(result.highlighted_nodes || []);
      await loadGraph(workspaceId);
    } finally {
      setIsIngesting(false);
    }
  };

  const handleUploadPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsIngesting(true);
    try {
      const result = await ingestPdf(workspaceId, file);
      setAgentResult(result);
      setHighlightedNodes(result.highlighted_nodes || []);
      await loadGraph(workspaceId);
    } finally {
      setIsIngesting(false);
      e.target.value = "";
    }
  };

  const handleReset = async () => {
    setIsLoading(true);
    try {
      await resetDemoGraphs();
      setHighlightedNodes([]);
      setSelectedNode(null);
      setAgentResult(null);
      await loadGraph(workspaceId);
    } finally {
      setIsLoading(false);
    }
  };

  const scenarios = WORKSPACE_SCENARIOS[workspaceId] || WORKSPACE_SCENARIOS["FinPulse-Prod"];

  return (
    <div className="flex h-screen w-screen flex-col bg-[#090b10] text-gray-100">
      {/* Top Header Bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-800/80 bg-[#0c0f17] px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-violet-500/40 bg-violet-600/20 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.25)]">
            <Network className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white">NexusGraph</h1>
              <span className="rounded border border-violet-500/40 bg-violet-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-violet-300">
                FalkorDB Powered
              </span>
            </div>
            <p className="text-[11px] text-gray-400">Autonomous Engineering Memory & Blast-Radius Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-4 rounded-lg border border-gray-800 bg-gray-900/70 px-3.5 py-1.5 text-xs md:flex">
            {nodes.length === 0 ? (
              <span className="flex items-center gap-1.5 font-mono text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                Backend: Offline (Start port 8000)
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-mono text-gray-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                FalkorDB:6379
              </span>
            )}
            <span className="text-gray-700">|</span>
            <span className="font-mono text-gray-300">Nodes: <strong className="text-white">{nodes.length}</strong></span>
            <span className="text-gray-700">|</span>
            <span className="font-mono text-gray-300">Edges: <strong className="text-white">{edges.length}</strong></span>
            <span className="text-gray-700">|</span>
            <span className="font-mono text-emerald-400">Latency: <strong>{queryTimeMs} ms</strong></span>
          </div>

          <button
            onClick={() => {
              const next = !chaosMode;
              setChaosMode(next);
              if (next) handleTriggerChaos();
              else {
                setChaosResult(null);
                setHighlightedNodes([]);
              }
            }}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              chaosMode
                ? "border-red-500 bg-red-600/25 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.35)]"
                : "border-gray-700 bg-gray-800/80 text-gray-300 hover:border-red-500/50 hover:text-red-200"
            }`}
          >
            <Flame className={`h-3.5 w-3.5 ${chaosMode ? "text-red-400 animate-pulse" : "text-gray-400"}`} />
            {chaosMode ? "Chaos Active" : "Chaos Mode"}
          </button>

          <button
            onClick={handleOpenBenchmark}
            className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/40 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-900/50 hover:border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
          >
            <BarChart3 className="h-3.5 w-3.5 text-cyan-400" />
            GraphRAG Benchmark
          </button>

          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800/80 px-3 py-1.5 text-xs font-medium text-gray-200 transition hover:border-violet-500/50 hover:bg-gray-800"
            title="Reset Workspaces"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reset Workspaces
          </button>
        </div>
      </header>

      {/* Main 3-Pane Command Center */}
      <div className="grid flex-1 grid-cols-12 overflow-hidden">
        {/* LEFT PANE (3 cols): Multi-Tenant Switcher, Scenarios, & Ingest */}
        <aside className="col-span-3 flex flex-col gap-4 overflow-y-auto border-r border-gray-800/80 bg-[#0b0e16] p-4">
          <div className="rounded-xl border border-gray-800/90 bg-gray-900/50 p-3.5">
            <span className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-violet-400">
              <Layers className="h-3.5 w-3.5" />
              Multi-Tenant Workspace
            </span>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              {["FinPulse-Prod", "ShopSphere-Core"].map((ws) => (
                <button
                  key={ws}
                  onClick={() => {
                    setWorkspaceId(ws);
                    setHighlightedNodes([]);
                    setSelectedNode(null);
                    setAgentResult(null);
                  }}
                  className={`rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition ${
                    workspaceId === ws
                      ? "border-violet-500 bg-violet-600/20 text-white shadow-[0_0_12px_rgba(139,92,246,0.2)]"
                      : "border-gray-800 bg-gray-950/60 text-gray-400 hover:border-gray-700 hover:text-gray-200"
                  }`}
                >
                  <div className="truncate font-semibold">{ws}</div>
                  <div className="mt-0.5 text-[10px] text-gray-400">
                    {ws === "FinPulse-Prod" ? "Fintech SaaS" : "E-Commerce"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Scenario Triggers */}
          <div className="rounded-xl border border-gray-800/90 bg-gray-900/50 p-3.5">
            <span className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
              <Play className="h-3.5 w-3.5" />
              Autonomous Scenarios
            </span>
            <div className="mt-2.5 flex flex-col gap-2">
              {scenarios.map((sc, i) => (
                <button
                  key={i}
                  disabled={isLoading}
                  onClick={() => handleRunInvestigation(sc.prompt)}
                  className={`flex flex-col gap-1 rounded-lg border bg-gray-950/70 p-2.5 text-left transition ${sc.color} disabled:opacity-50`}
                >
                  <span className="font-mono text-[9px] font-bold tracking-wider text-gray-400">
                    {sc.badge}
                  </span>
                  <div className="text-xs font-semibold text-gray-100">{sc.title}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Archivist Memory Ingestion */}
          <div className="rounded-xl border border-gray-800/90 bg-gray-900/50 p-3.5">
            <span className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-fuchsia-400">
              <Bot className="h-3.5 w-3.5" />
              Archivist Memory Ingestion
            </span>
            <textarea
              rows={3}
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Paste architectural decision, PR note, or post-mortem..."
              className="mt-2 w-full rounded-lg border border-gray-800 bg-gray-950 p-2 text-xs text-gray-200 focus:border-fuchsia-500 focus:outline-none"
            />
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={handleCommitNote}
                disabled={isIngesting}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-fuchsia-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-fuchsia-500 disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {isIngesting ? "Committing..." : "Commit to Graph"}
              </button>
              <label className="flex cursor-pointer items-center gap-1 rounded-lg border border-gray-700 bg-gray-800 px-2.5 py-1.5 text-xs font-medium text-gray-200 hover:bg-gray-700">
                <FileUp className="h-3.5 w-3.5" />
                PDF
                <input type="file" accept=".pdf" onChange={handleUploadPdf} className="hidden" />
              </label>
            </div>
          </div>
        </aside>

        {/* CENTER PANE (5 cols): Interactive Canvas */}
        <main className="col-span-5 relative flex flex-col border-r border-gray-800/80">
          <div className="flex-1 relative">
            {chaosResult && (
              <div className="absolute top-4 left-4 right-4 z-20 rounded-xl border border-red-500/60 bg-black/90 p-3.5 backdrop-blur shadow-[0_0_25px_rgba(239,68,68,0.3)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" />
                    <span className="font-mono text-[11px] font-bold uppercase text-red-300">
                      Chaos Outage Shockwave Active: {chaosResult.target}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setChaosResult(null);
                      setHighlightedNodes([]);
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2.5 grid grid-cols-3 gap-2 font-mono text-[11px]">
                  <div className="rounded border border-red-950 bg-red-950/40 p-2">
                    <span className="text-[10px] text-gray-400">Cascading Risk</span>
                    <div className="text-sm font-bold text-red-400">{chaosResult.cascading_risk_score}% CRITICAL</div>
                  </div>
                  <div className="rounded border border-red-950 bg-red-950/40 p-2">
                    <span className="text-[10px] text-gray-400">Est. Revenue Risk</span>
                    <div className="text-sm font-bold text-amber-400">
                      ${chaosResult.estimated_revenue_risk_usd.toLocaleString()}/mo
                    </div>
                  </div>
                  <div className="rounded border border-red-950 bg-red-950/40 p-2">
                    <span className="text-[10px] text-gray-400">Downstream Impact</span>
                    <div className="text-sm font-bold text-rose-300">
                      {chaosResult.impacted_components.length} components
                    </div>
                  </div>
                </div>
                {chaosResult.remediation_playbook && (
                  <div className="mt-2.5 flex items-center justify-between border-t border-red-900/50 pt-2 text-xs">
                    <span className="text-[11px] text-gray-300">
                      Matched Runbook: <strong>{chaosResult.remediation_playbook.runbook_id}</strong>
                    </span>
                    <button
                      onClick={() => {
                        handleRunInvestigation(`Simulate outage on ${chaosResult.target} and auto-remediate with runbook`);
                        setChaosResult(null);
                      }}
                      className="flex items-center gap-1 rounded bg-red-600 hover:bg-red-500 px-2.5 py-1 text-[11px] font-bold text-white shadow"
                    >
                      <Play className="h-3 w-3 fill-current" />
                      Auto-Remediate
                    </button>
                  </div>
                )}
              </div>
            )}

            <GraphCanvas
              nodes={nodes}
              edges={edges}
              highlightedNodes={highlightedNodes}
              selectedNode={selectedNode}
              onSelectNode={(node) => {
                setSelectedNode(node);
                if (chaosMode && node) {
                  handleTriggerChaos(node.name);
                }
              }}
            />
          </div>

          {selectedNode && (
            <div className="border-t border-gray-800 bg-[#0d111a] p-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded border px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                      LABEL_COLORS[selectedNode.label]?.badge || "border-gray-700 bg-gray-800 text-gray-300"
                    }`}
                  >
                    :{selectedNode.label}
                  </span>
                  <h3 className="text-sm font-bold text-white">{selectedNode.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      handleRunInvestigation(`Analyze blast radius and owners for ${selectedNode.id}`)
                    }
                    className="rounded border border-violet-500/40 bg-violet-600/20 px-2.5 py-1 text-[11px] font-medium text-violet-200 hover:bg-violet-600/30"
                  >
                    ⚡ Trace Blast Radius
                  </button>
                  <button
                    onClick={() => handleTriggerChaos(selectedNode.name)}
                    className="rounded border border-red-500/40 bg-red-600/20 px-2.5 py-1 text-[11px] font-medium text-red-200 hover:bg-red-600/30"
                  >
                    💥 Chaos Spike
                  </button>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {Object.entries(selectedNode.properties || {}).map(([k, val]) => (
                  <div key={k} className="rounded border border-gray-800/80 bg-gray-950/70 px-2.5 py-1.5">
                    <div className="font-mono text-[9px] uppercase text-gray-500">{k}</div>
                    <div className="truncate text-xs text-gray-200">{String(val)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* RIGHT PANE (4 cols): Agent Reasoning & Proof Console */}
        <section className="col-span-4 flex flex-col bg-[#0b0e16] overflow-hidden">
          <div className="border-b border-gray-800/80 p-3.5">
            <label className="font-mono text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Query the Engineering Brain
            </label>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRunInvestigation(promptInput);
              }}
              className="mt-2 flex gap-2"
            >
              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="Ask about blast radius, past decisions, or owning teams..."
                className="flex-1 rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-xs text-gray-100 focus:border-violet-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {isLoading ? "Tracing..." : "Run"}
              </button>
            </form>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-800/80 bg-gray-950/50 px-3 pt-2">
            <button
              onClick={() => setActiveTab("answer")}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition ${
                activeTab === "answer" ? "border-violet-500 text-violet-300" : "border-transparent text-gray-400 hover:text-gray-200"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Agent Report
            </button>
            <button
              onClick={() => setActiveTab("handoffs")}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition ${
                activeTab === "handoffs" ? "border-violet-500 text-violet-300" : "border-transparent text-gray-400 hover:text-gray-200"
              }`}
            >
              <Cpu className="h-3.5 w-3.5" />
              Handoffs ({agentResult?.agent_handoffs?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab("cypher")}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition ${
                activeTab === "cypher" ? "border-violet-500 text-violet-300" : "border-transparent text-gray-400 hover:text-gray-200"
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              Cypher Proof ({agentResult?.cypher_traces?.length || 0})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {!agentResult && !isLoading && (
              <div className="flex h-full flex-col items-center justify-center text-center text-gray-400">
                <Database className="h-10 w-10 text-violet-400/60 mb-3" />
                <p className="text-sm font-semibold text-gray-200">Ready to Reason Over FalkorDB</p>
                <p className="mt-1 max-w-xs text-xs text-gray-400">
                  Select a scenario from the left or click any node to trace dependencies, historical decisions, and bottlenecks.
                </p>
              </div>
            )}

            {isLoading && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                <p className="font-mono text-xs text-violet-300">Archivist ➔ Guardian ➔ Commander running Cypher queries...</p>
              </div>
            )}

            {agentResult && !isLoading && (
              <>
                {activeTab === "answer" && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-gray-800 bg-gray-900/60 p-2.5">
                      {agentResult.agent_handoffs.map((h, idx) => (
                        <React.Fragment key={idx}>
                          <span className="flex items-center gap-1 rounded border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-violet-300">
                            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                            {h.agent}
                          </span>
                          {idx < agentResult.agent_handoffs.length - 1 && (
                            <span className="text-xs text-gray-600">➔</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>

                    {agentResult.created_tasks?.length > 0 && (
                      <div className="rounded-xl border border-teal-500/40 bg-teal-950/30 p-3">
                        <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase text-teal-300">
                          <AlertTriangle className="h-4 w-4 text-teal-400" />
                          Autonomous Task Created in FalkorDB
                        </div>
                        {agentResult.created_tasks.map((t, idx) => (
                          <div key={idx} className="mt-1.5 text-xs text-gray-200">
                            Created node <code className="rounded bg-teal-900/60 px-1.5 py-0.5 text-teal-200">(:Task &#123;id: &apos;{t.task_id}&apos;&#125;)</code> assigned to <strong>{t.assigned_to}</strong>.
                          </div>
                        ))}
                      </div>
                    )}

                    {agentResult.remediation_playbook && (
                      <div className="rounded-xl border border-red-500/40 bg-gradient-to-b from-red-950/40 via-gray-900/60 to-[#0c0f17] p-4 shadow-[0_0_20px_rgba(239,68,68,0.12)]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="flex h-2 w-2 rounded-full bg-red-400 animate-ping" />
                            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-red-300">
                              FalkorDB Self-Healing Playbook
                            </span>
                          </div>
                          <span className="rounded border border-red-500/40 bg-red-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-red-200">
                            {agentResult.remediation_playbook.runbook_id}
                          </span>
                        </div>

                        <div className="mt-2 text-xs font-semibold text-white">
                          {agentResult.remediation_playbook.title}
                        </div>
                        <p className="mt-1 text-[11px] text-gray-300 leading-relaxed">
                          {agentResult.remediation_playbook.steps}
                        </p>

                        <div className="mt-3 overflow-hidden rounded-lg border border-gray-800 bg-black/85 font-mono text-[11px]">
                          <div className="flex items-center justify-between border-b border-gray-800/80 bg-gray-900/70 px-3 py-1.5 text-gray-400">
                            <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
                              <Terminal className="h-3 w-3 text-cyan-400" />
                              Executable Shell Mitigation
                            </span>
                            <button
                              onClick={() => handleCopyCmd(agentResult.remediation_playbook!.command)}
                              className="flex items-center gap-1 text-[10px] text-gray-300 hover:text-white transition cursor-pointer"
                            >
                              {copiedCmd ? (
                                <>
                                  <Check className="h-3 w-3 text-emerald-400" />
                                  <span className="text-emerald-400 font-semibold">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3 text-gray-400" />
                                  <span>Copy Command</span>
                                </>
                              )}
                            </button>
                          </div>
                          <div className="p-3 text-cyan-300 overflow-x-auto whitespace-pre select-all">
                            {agentResult.remediation_playbook.command}
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between pt-1">
                          <span className="text-[11px] text-gray-400">
                            Est. Recovery: <span className="font-mono text-emerald-400 font-semibold">~{agentResult.remediation_playbook.estimated_recovery_sec}s</span>
                          </span>

                          {pbExecuted ? (
                            <span className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                              Remediation Deployed
                            </span>
                          ) : (
                            <button
                              onClick={handleExecutePlaybook}
                              disabled={isExecutingPb}
                              className="flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-500 px-3 py-1 text-xs font-semibold text-white transition shadow-[0_0_12px_rgba(239,68,68,0.35)] disabled:opacity-50 cursor-pointer"
                            >
                              {isExecutingPb ? (
                                <>
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                  Deploying Fix...
                                </>
                              ) : (
                                <>
                                  <Play className="h-3 w-3 fill-current" />
                                  Execute Auto-Remediation
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2.5 rounded-xl border border-gray-800/90 bg-gray-900/40 p-4 text-xs leading-relaxed text-gray-200 whitespace-pre-wrap">
                      {agentResult.answer}
                    </div>
                  </div>
                )}

                {activeTab === "handoffs" && (
                  <div className="space-y-3">
                    {agentResult.agent_handoffs.map((step, i) => (
                      <div key={i} className="rounded-xl border border-gray-800 bg-gray-900/50 p-3.5">
                        <span className="rounded border border-violet-500/40 bg-violet-500/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-violet-300">
                          Step {i + 1} • {step.agent} Agent
                        </span>
                        <div className="mt-2 text-xs font-semibold text-white">{step.action}</div>
                        <div className="mt-1 text-xs text-gray-400">{step.findings}</div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "cypher" && (
                  <div className="space-y-3">
                    {agentResult.cypher_traces.map((tr, i) => (
                      <div key={i} className="rounded-xl border border-gray-800 bg-gray-900/60 p-3.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold uppercase text-violet-400">
                            {tr.agent_name} Agent
                          </span>
                          <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
                            {tr.execution_time_ms} ms • {tr.rows_returned} rows
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs font-medium text-gray-300">{tr.purpose}</p>
                        <pre className="mt-2 overflow-x-auto rounded-lg border border-gray-800 bg-[#07090e] p-2.5 font-mono text-[11px] leading-relaxed text-emerald-300">
                          <code>{tr.cypher_query}</code>
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>

      {/* FalkorDB GraphRAG vs Naive Vector RAG Benchmark Modal */}
      {showBenchmark && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl rounded-2xl border border-cyan-500/40 bg-[#0d111a] p-6 shadow-[0_0_40px_rgba(6,182,212,0.25)]">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-cyan-400" />
                <h2 className="text-base font-bold text-white">FalkorDB GraphRAG vs. Naive Vector RAG Benchmark</h2>
              </div>
              <button onClick={() => setShowBenchmark(false)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {isLoadingBenchmark ? (
              <div className="py-12 text-center text-cyan-300 font-mono text-xs flex flex-col items-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin text-cyan-400" />
                Executing empirical multi-hop benchmark on FalkorDB...
              </div>
            ) : benchmarkData ? (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* FalkorDB Card */}
                  <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-emerald-400">FalkorDB Graph Traversal</span>
                      <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">Deterministic</span>
                    </div>
                    <div className="mt-3 text-3xl font-black text-white font-mono">
                      {benchmarkData.falkordb_graph.latency_ms} <span className="text-sm font-normal text-gray-400">ms</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-300 space-y-1 font-mono text-[11px]">
                      <div>• Depth: <strong className="text-white">{benchmarkData.falkordb_graph.multi_hop_depth}</strong></div>
                      <div>• Hallucinations: <strong className="text-emerald-400">{benchmarkData.falkordb_graph.hallucination_rate}</strong></div>
                      <div>• Token Cost: <strong className="text-emerald-400">${benchmarkData.falkordb_graph.token_cost_usd}</strong></div>
                    </div>
                  </div>

                  {/* Naive Vector RAG Card */}
                  <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-rose-400">Naive Vector Search</span>
                      <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300">Approximate</span>
                    </div>
                    <div className="mt-3 text-3xl font-black text-white font-mono">
                      {benchmarkData.naive_vector_rag.latency_ms} <span className="text-sm font-normal text-gray-400">ms</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-300 space-y-1 font-mono text-[11px]">
                      <div>• Depth: <strong className="text-white">{benchmarkData.naive_vector_rag.multi_hop_depth}</strong></div>
                      <div>• Hallucinations: <strong className="text-rose-400">{benchmarkData.naive_vector_rag.hallucination_rate}</strong></div>
                      <div>• Token Cost: <strong className="text-rose-400">${benchmarkData.naive_vector_rag.token_cost_usd}</strong></div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/30 p-3 text-center font-mono text-xs text-cyan-200">
                  ⚡ Performance Verdict: FalkorDB is <strong className="text-white underline">{benchmarkData.speedup_factor}</strong> than chunk-based vector search with zero multi-hop hallucination risk!
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
