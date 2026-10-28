import { GraphEdgeData, GraphNodeData } from "@/components/GraphCanvas";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface AgentStepTrace {
  agent: "Archivist" | "Guardian" | "Commander";
  action: string;
  findings: string;
}

export interface CypherExecutionTrace {
  agent_name: "Archivist" | "Guardian" | "Commander";
  purpose: string;
  cypher_query: string;
  execution_time_ms: number;
  rows_returned: number;
}

export interface RemediationPlaybook {
  runbook_id: string;
  title: string;
  command: string;
  steps: string;
  target_component: string;
  estimated_recovery_sec: number;
  historical_incident_id?: string;
  incident_title?: string;
  severity?: string;
}

export interface AgentResponse {
  workspace_id: string;
  answer: string;
  agent_handoffs: AgentStepTrace[];
  cypher_traces: CypherExecutionTrace[];
  highlighted_nodes: string[];
  created_tasks: Record<string, any>[];
  remediation_playbook?: RemediationPlaybook | null;
}

export interface GraphTopologyResult {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  query_time_ms: number;
}

export async function fetchTopology(workspaceId: string): Promise<GraphTopologyResult> {
  try {
    const res = await fetch(`${API_BASE}/api/graph/${encodeURIComponent(workspaceId)}`);
    if (!res.ok) throw new Error("Failed to fetch topology");
    const data = await res.json();
    return {
      nodes: data.nodes || [],
      edges: data.edges || [],
      query_time_ms: data.query_time_ms || 0,
    };
  } catch (err) {
    console.warn(`[NexusGraph] Backend offline or starting up at ${API_BASE}:`, err);
    return {
      nodes: [],
      edges: [],
      query_time_ms: 0,
    };
  }
}

export async function fetchWorkspaces(): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE}/api/workspaces`);
    if (!res.ok) return ["FinPulse-Prod", "ShopSphere-Core"];
    const data = await res.json();
    return data.workspaces || ["FinPulse-Prod", "ShopSphere-Core"];
  } catch (err) {
    console.warn(`[NexusGraph] Could not fetch workspaces from ${API_BASE}:`, err);
    return ["FinPulse-Prod", "ShopSphere-Core"];
  }
}

export async function queryAgents(workspaceId: string, query: string): Promise<AgentResponse> {
  const res = await fetch(`${API_BASE}/api/agent/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workspace_id: workspaceId, query }),
  });
  if (!res.ok) throw new Error("Agent query failed");
  return res.json();
}

export async function ingestNote(workspaceId: string, rawText: string): Promise<AgentResponse> {
  const res = await fetch(`${API_BASE}/api/agent/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      workspace_id: workspaceId,
      raw_text: rawText,
      source_name: "Architecture PR Note",
    }),
  });
  if (!res.ok) throw new Error("Ingestion failed");
  return res.json();
}

export async function ingestPdf(workspaceId: string, file: File): Promise<AgentResponse> {
  const formData = new FormData();
  formData.append("workspace_id", workspaceId);
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/api/agent/ingest-pdf`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("PDF ingestion failed");
  return res.json();
}

export async function resetDemoGraphs(): Promise<void> {
  await fetch(`${API_BASE}/api/workspaces/seed`, { method: "POST" });
}

export interface ChaosSimulationResult {
  target: string;
  latency_injected_ms: number;
  impacted_components: Array<{
    component: string;
    type: string;
    hops_away: number;
    impact_path: string[];
    sla_tier: string;
    revenue_impact: string;
    team?: string;
    on_call?: string;
  }>;
  cascading_risk_score: number;
  estimated_revenue_risk_usd: number;
  remediation_playbook?: RemediationPlaybook | null;
  highlighted_nodes: string[];
  trace: CypherExecutionTrace;
}

export interface BenchmarkResult {
  query: string;
  workspace_id: string;
  falkordb_graph: {
    latency_ms: number;
    multi_hop_depth: string;
    hallucination_rate: string;
    token_cost_usd: number;
    storage_model: string;
  };
  naive_vector_rag: {
    latency_ms: number;
    multi_hop_depth: string;
    hallucination_rate: string;
    token_cost_usd: number;
    storage_model: string;
  };
  speedup_factor: string;
  verdict: string;
}

export async function triggerChaos(
  workspaceId: string,
  targetComponent: string,
  latencyMs: number = 500
): Promise<ChaosSimulationResult> {
  const res = await fetch(`${API_BASE}/api/chaos/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      workspace_id: workspaceId,
      target_component: targetComponent,
      latency_ms: latencyMs,
    }),
  });
  if (!res.ok) throw new Error("Chaos simulation failed");
  return res.json();
}

export async function fetchBenchmark(workspaceId: string): Promise<BenchmarkResult> {
  const res = await fetch(`${API_BASE}/api/benchmark/graph-vs-vector?workspace_id=${encodeURIComponent(workspaceId)}`);
  if (!res.ok) throw new Error("Failed to fetch benchmark");
  return res.json();
}

