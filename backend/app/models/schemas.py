"""
Pydantic Schemas for NexusGraph (CortexOps).

Defines:
1. Graph Node & Edge representation for visualization and API responses.
2. Structured Extraction Schemas (used by the Archivist Agent with Gemini to turn unstructured docs/notes into graph entities).
3. Multi-Agent Reasoning & Trace Response Schemas (used by Guardian and Commander Agents to show Cypher queries and highlighted graph paths).
"""

from typing import Any, Literal, Optional
from pydantic import BaseModel, Field


NodeLabel = Literal[
    "Developer",
    "Team",
    "Service",
    "Database",
    "Endpoint",
    "Feature",
    "Decision",
    "Incident",
    "Task",
    "Runbook",
]

EdgeType = Literal[
    "MEMBER_OF",
    "OWNS",
    "AUTHORED",
    "SUPERSEDES",
    "AFFECTS",
    "MOTIVATED_BY",
    "DEPENDS_ON",
    "EXPOSED_BY",
    "CALLS",
    "READS_FROM",
    "WRITES_TO",
    "IMPACTS",
    "MITIGATES",
    "ASSIGNED_TO",
    "RESOLVED_BY",
]


class GraphNode(BaseModel):
    """Represents a node in FalkorDB for the Next.js interactive canvas."""
    id: str = Field(..., description="Unique identifier or name of the node")
    label: str = Field(..., description="Node label e.g. Service, Decision, Developer")
    name: str = Field(..., description="Display name of the node")
    properties: dict[str, Any] = Field(default_factory=dict, description="All node attributes")


class GraphEdge(BaseModel):
    """Represents a directed edge between two nodes in FalkorDB."""
    id: str = Field(..., description="Unique edge identifier")
    source: str = Field(..., description="Source node ID/name")
    target: str = Field(..., description="Target node ID/name")
    type: str = Field(..., description="Relationship type e.g. DEPENDS_ON, SUPERSEDES")
    properties: dict[str, Any] = Field(default_factory=dict)


class GraphTopologyResponse(BaseModel):
    """Full graph topology returned to the Next.js center canvas."""
    workspace_id: str
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    total_nodes: int
    total_edges: int
    query_time_ms: float


# --- Structured Output Schemas for Archivist Agent (Gemini Entity Extraction) ---

class ExtractedEntity(BaseModel):
    name: str = Field(..., description="Canonical name or ID of the entity (e.g., 'Payment-API', 'DEC-105')")
    label: NodeLabel = Field(..., description="One of the 9 NexusGraph node labels")
    properties: dict[str, str] = Field(
        default_factory=dict,
        description="Key attributes like title, summary, status, severity, role, tier, or path",
    )


class ExtractedRelationship(BaseModel):
    source_name: str = Field(..., description="Name of the source entity")
    source_label: NodeLabel = Field(..., description="Label of the source entity")
    target_name: str = Field(..., description="Name of the target entity")
    target_label: NodeLabel = Field(..., description="Label of the target entity")
    relationship_type: EdgeType = Field(..., description="Directed relationship type")


class KnowledgeExtractionResult(BaseModel):
    """Schema used by Gemini structured output to extract graph mutations from notes/PDFs."""
    summary: str = Field(..., description="1-2 sentence summary of what was extracted into graph memory")
    entities: list[ExtractedEntity]
    relationships: list[ExtractedRelationship]
    superseded_decision_ids: list[str] = Field(
        default_factory=list,
        description="IDs or titles of older decisions that this new knowledge supersedes/deprecates",
    )


# --- Multi-Agent Trace & Explainability Schemas ---

class CypherExecutionTrace(BaseModel):
    """Records every Cypher query or Graph Algorithm run by an agent so judges can verify it."""
    agent_name: Literal["Archivist", "Guardian", "Commander"]
    purpose: str = Field(..., description="Why the agent ran this query")
    cypher_query: str = Field(..., description="Exact OpenCypher query executed on FalkorDB")
    execution_time_ms: float = Field(..., description="FalkorDB execution latency in milliseconds")
    rows_returned: int = Field(default=0)


class AgentStepTrace(BaseModel):
    """Represents one step in the 3-agent handoff loop."""
    agent: Literal["Archivist", "Guardian", "Commander"]
    action: str
    findings: str


class AgentQueryRequest(BaseModel):
    workspace_id: str = Field(default="FinPulse-Prod")
    query: str = Field(..., description="User question, proposed change, or incident simulation prompt")
    session_id: Optional[str] = Field(default="session-1")


class IngestKnowledgeRequest(BaseModel):
    workspace_id: str = Field(default="FinPulse-Prod")
    raw_text: str = Field(..., description="Engineering note, PR description, or incident post-mortem text")
    source_name: str = Field(default="Engineering Note")


class ChaosSimulationRequest(BaseModel):
    workspace_id: str = Field(default="FinPulse-Prod")
    target_component: str = Field(default="Neon-Postgres-Primary")
    latency_ms: int = Field(default=500)


class AgentResponse(BaseModel):
    """Complete explainable response sent back to the Next.js 3-pane command center."""
    workspace_id: str
    answer: str
    agent_handoffs: list[AgentStepTrace]
    cypher_traces: list[CypherExecutionTrace]
    highlighted_nodes: list[str] = Field(
        default_factory=list,
        description="Names/IDs of nodes traversed so the Next.js canvas can pulse/highlight the exact path",
    )
    created_tasks: list[dict[str, Any]] = Field(
        default_factory=list,
        description="Any new mitigation tasks written to FalkorDB by the Commander Agent",
    )
    remediation_playbook: Optional[dict[str, Any]] = Field(
        default=None,
        description="Auto-remediation runbook matched from FalkorDB incident memory with executable shell commands",
    )

