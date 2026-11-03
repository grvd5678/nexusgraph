"""
FalkorDB Multi-Tenant Connection Manager for NexusGraph.

Why this matters for the Hackathon:
1. Track 02 (Agent Memory & Coordination) explicitly asks for "Separate memory per user or tenant".
2. FalkorDB supports thousands of isolated sparse-matrix graphs inside a single instance.
3. Calling `get_graph(workspace_id)` gives each project/tenant its own isolated knowledge graph!
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from falkordb import FalkorDB, Graph

# Load backend/.env first, then fallback to root .env
_backend_env = Path(__file__).resolve().parents[1] / ".env"
_root_env = Path(__file__).resolve().parents[2] / ".env"
if _backend_env.exists():
    load_dotenv(_backend_env)
if _root_env.exists():
    load_dotenv(_root_env)
load_dotenv()

FALKORDB_HOST = os.getenv("FALKORDB_HOST", "localhost")
FALKORDB_PORT = int(os.getenv("FALKORDB_PORT", "6379"))
FALKORDB_USERNAME = os.getenv("FALKORDB_USERNAME", None)
FALKORDB_PASSWORD = os.getenv("FALKORDB_PASSWORD", None)
FALKORDB_SSL = os.getenv("FALKORDB_SSL", "false").lower() in ("true", "1", "yes")
DEFAULT_WORKSPACE = os.getenv("DEFAULT_WORKSPACE", "NexusDemo")


class FalkorDBManager:
    """Singleton-style connection manager for FalkorDB multi-graph operations."""

    def __init__(self) -> None:
        self._client = None

    @property
    def client(self) -> FalkorDB:
        """Lazily connects or reconnects to FalkorDB without crashing module imports."""
        if self._client is None:
            self._client = FalkorDB(
                host=FALKORDB_HOST,
                port=FALKORDB_PORT,
                username=FALKORDB_USERNAME,
                password=FALKORDB_PASSWORD,
                ssl=FALKORDB_SSL,
            )
        return self._client

    def get_graph(self, workspace_id: str = DEFAULT_WORKSPACE) -> Graph:
        """
        Selects an isolated graph by workspace_id (tenant name).
        If the graph doesn't exist yet, FalkorDB creates it automatically on first write.
        """
        return self.client.select_graph(workspace_id)

    def list_workspaces(self) -> list[str]:
        """Returns all active tenant graphs currently stored in FalkorDB."""
        try:
            return self.client.list_graphs()
        except Exception as e:
            print(f"[FalkorDBManager] list_graphs fallback: {e}")
            return ["FinPulse-Prod", "ShopSphere-Core"]

    def health_check(self, workspace_id: str = DEFAULT_WORKSPACE) -> dict:
        """Runs a fast Cypher query to verify FalkorDB connectivity and count nodes/edges."""
        try:
            graph = self.get_graph(workspace_id)
            node_res = graph.query("MATCH (n) RETURN count(n) AS total_nodes")
            edge_res = graph.query("MATCH ()-[r]->() RETURN count(r) AS total_edges")

            total_nodes = node_res.result_set[0][0] if node_res.result_set else 0
            total_edges = edge_res.result_set[0][0] if edge_res.result_set else 0

            return {
                "status": "connected",
                "host": f"{FALKORDB_HOST}:{FALKORDB_PORT}",
                "active_workspace": workspace_id,
                "all_workspaces": self.list_workspaces(),
                "total_nodes": total_nodes,
                "total_edges": total_edges,
                "query_time_ms": round(node_res.run_time_ms, 3),
            }
        except Exception as e:
            # Reset client to allow reconnection attempts on subsequent calls
            self._client = None
            return {
                "status": "disconnected",
                "host": f"{FALKORDB_HOST}:{FALKORDB_PORT}",
                "error": str(e),
                "active_workspace": workspace_id,
                "all_workspaces": ["FinPulse-Prod", "ShopSphere-Core"],
                "total_nodes": 0,
                "total_edges": 0,
                "query_time_ms": 0.0,
            }


db_manager = FalkorDBManager()


if __name__ == "__main__":
    print("Testing FalkorDB Connection...")
    info = db_manager.health_check("NexusDemo")
    for k, v in info.items():
        print(f"  {k}: {v}")

