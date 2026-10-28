"""
FastAPI Backend Entrypoint for NexusGraph (CortexOps).

Exposes REST API endpoints for the Next.js 3-Pane Command Center:
- `GET  /api/health`                   — FalkorDB health & multi-tenant workspace status
- `GET  /api/workspaces`               — List available isolated tenant graphs in FalkorDB
- `POST /api/workspaces/seed`          — Seed or reset `FinPulse-Prod` and `ShopSphere-Core`
- `GET  /api/graph/{workspace_id}`     — Full node & edge topology for live 2D/3D canvas rendering
- `POST /api/agent/query`              — Run 3-Agent investigation (Archivist, Guardian, Commander)
- `POST /api/agent/ingest`             — Ingest engineering notes into FalkorDB memory
- `POST /api/agent/ingest-pdf`         — Upload PDF architecture doc / post-mortem into FalkorDB memory
"""

import io
import sys
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.agents.orchestrator import orchestrator
from app.core.database import db_manager
from app.models.schemas import (
    AgentQueryRequest,
    AgentResponse,
    ChaosSimulationRequest,
    GraphTopologyResponse,
    IngestKnowledgeRequest,
)
from app.services.graph_service import graph_service
from app.services.seed_service import seed_all_workspaces, seed_finpulse_prod, seed_shopsphere_core

from contextlib import asynccontextmanager
from typing import AsyncIterator


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Ensures both default tenant workspaces exist in FalkorDB when the API starts."""
    try:
        existing = db_manager.list_workspaces()
        if "FinPulse-Prod" not in existing:
            seed_finpulse_prod(reset=False)
        if "ShopSphere-Core" not in existing:
            seed_shopsphere_core(reset=False)
    except Exception as e:
        print(f"[Notice] FalkorDB check on startup: {e}")
    yield


app = FastAPI(
    title="NexusGraph (CortexOps) API",
    description="Autonomous Engineering Brain, Decision-Memory & Incident Blast-Radius Agent powered by FalkorDB",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check(workspace_id: str = "FinPulse-Prod") -> dict:
    return db_manager.health_check(workspace_id)


@app.get("/api/workspaces")
def list_workspaces() -> dict:
    workspaces = db_manager.list_workspaces()
    return {
        "workspaces": workspaces,
        "default": "FinPulse-Prod",
    }


@app.post("/api/workspaces/seed")
def reset_and_seed_workspaces() -> dict:
    stats = seed_all_workspaces()
    return {
        "status": "seeded",
        "workspaces": stats,
    }


@app.get("/api/graph/{workspace_id}", response_model=GraphTopologyResponse)
def get_workspace_graph(workspace_id: str) -> GraphTopologyResponse:
    return graph_service.get_full_topology(workspace_id)


@app.post("/api/agent/query", response_model=AgentResponse)
def query_nexus_agents(payload: AgentQueryRequest) -> AgentResponse:
    if not payload.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    return orchestrator.run_agent_investigation(
        workspace_id=payload.workspace_id,
        query=payload.query,
    )


@app.post("/api/agent/ingest", response_model=AgentResponse)
def ingest_engineering_note(payload: IngestKnowledgeRequest) -> AgentResponse:
    if not payload.raw_text.strip():
        raise HTTPException(status_code=400, detail="raw_text cannot be empty.")
    return orchestrator.ingest_knowledge(
        workspace_id=payload.workspace_id,
        raw_text=payload.raw_text,
        source_name=payload.source_name,
    )


@app.post("/api/agent/ingest-pdf", response_model=AgentResponse)
async def ingest_pdf_document(
    workspace_id: str = Form("FinPulse-Prod"),
    file: UploadFile = File(...),
) -> AgentResponse:
    """Uses PyPDF to extract text from an uploaded architecture/incident PDF and commits entities to FalkorDB."""
    content = await file.read()
    reader = PdfReader(io.BytesIO(content))
    extracted_pages = [page.extract_text() or "" for page in reader.pages]
    full_text = "\n".join(extracted_pages).strip()

    if not full_text:
        raise HTTPException(status_code=400, detail="Could not extract readable text from PDF.")

    return orchestrator.ingest_knowledge(
        workspace_id=workspace_id,
        raw_text=full_text,
        source_name=file.filename or "Uploaded PDF",
    )


@app.post("/api/chaos/simulate")
def trigger_chaos_simulation(payload: ChaosSimulationRequest) -> dict:
    """Simulates node latency/outage shockwave and traces cascading multi-hop blast radius."""
    return graph_service.simulate_chaos_outage(
        workspace_id=payload.workspace_id,
        target_name=payload.target_component,
        latency_ms=payload.latency_ms,
    )


@app.get("/api/benchmark/graph-vs-vector")
def get_graph_vs_vector_benchmark(
    workspace_id: str = "FinPulse-Prod",
    query: str = "Root cause and blast radius",
) -> dict:
    """Compares FalkorDB sub-millisecond graph traversal vs naive vector search."""
    return graph_service.benchmark_graph_vs_vector(
        workspace_id=workspace_id,
        query=query,
    )


if __name__ == "__main__":
    print("=== Testing 3-Agent Orchestrator End-to-End ===\n")
    r1 = orchestrator.run_agent_investigation(
        "FinPulse-Prod",
        "Simulate outage on Neon-Postgres-Primary and show downstream blast radius",
    )
    print("Scenario 1 (Incident Simulation & Action):")
    print("  Handoffs:", [(h.agent, h.action) for h in r1.agent_handoffs])
    print("  Highlighted Nodes:", r1.highlighted_nodes)
    print("  Created Tasks:", r1.created_tasks)
    print()

    r2 = orchestrator.run_agent_investigation(
        "FinPulse-Prod",
        "Can we propose a synchronous webhook call on Svix-Webhook-Worker?",
    )
    print("Scenario 2 (Decision Memory Conflict Check):")
    print("  Handoffs:", [(h.agent, h.action) for h in r2.agent_handoffs])
    print("  Highlighted Nodes:", r2.highlighted_nodes)
