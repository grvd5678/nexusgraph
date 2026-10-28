"""
Multi-Workspace Realistic Seeder for NexusGraph (CortexOps).

Populates two rich, isolated tenant graphs in FalkorDB:
1. `FinPulse-Prod` — Inspired by Gourav's FinPulse SaaS project (Next.js, Clerk, Svix Webhooks, Live Market Feed, Neon Postgres).
2. `ShopSphere-Core` — Inspired by Gourav's MERN E-Commerce project (Stripe/Razorpay, OTP Auth, Order Worker, Catalog API).

Why this matters for the Hackathon:
- Demonstrates FalkorDB's multi-graph tenant isolation (`select_graph`).
- Gives us rich multi-hop paths (4-5 hops) for Blast Radius, Decision Conflict (`SUPERSEDES`), Expertise Resolution, Shortest Path, and PageRank!
"""

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[2]))

from app.core.database import db_manager


def seed_finpulse_prod(reset: bool = True) -> dict:
    """Seeds the `FinPulse-Prod` workspace graph."""
    workspace = "FinPulse-Prod"
    graph = db_manager.get_graph(workspace)

    if reset:
        try:
            graph.delete()
            graph = db_manager.get_graph(workspace)
        except Exception:
            pass

    cypher = """
    CREATE
      // 1. Teams
      (t_core:Team {name: 'Core Platform', slack_channel: '#finpulse-core', on_call: 'Gourav Das'}),
      (t_quant:Team {name: 'Market Data & Quant', slack_channel: '#finpulse-quant', on_call: 'Aarav Mehta'}),
      (t_sec:Team {name: 'Identity & Security', slack_channel: '#finpulse-sec', on_call: 'Priya Nair'}),

      // 2. Developers
      (dev_gourav:Developer {name: 'Gourav Das', role: 'Lead Full-Stack Architect', email: 'gourav@finpulse.io', expertise: 'Next.js, FastAPI, Distributed Systems'}),
      (dev_aarav:Developer {name: 'Aarav Mehta', role: 'Senior Data Engineer', email: 'aarav@finpulse.io', expertise: 'WebSockets, Redis, Market Feeds'}),
      (dev_priya:Developer {name: 'Priya Nair', role: 'Security & Auth Engineer', email: 'priya@finpulse.io', expertise: 'Clerk, JWT, RBAC, Svix Webhooks'}),

      // 3. Databases
      (db_neon:Database {name: 'Neon-Postgres-Primary', engine: 'PostgreSQL', region: 'ap-south-1', status: 'healthy'}),
      (db_redis:Database {name: 'Redis-Market-Cache', engine: 'Redis', region: 'ap-south-1', status: 'healthy'}),
      (db_audit:Database {name: 'Audit-Log-Store', engine: 'PostgreSQL', region: 'us-east-1', status: 'healthy'}),

      // 4. Microservices
      (s_gateway:Service {name: 'API-Gateway', tier: 'tier-0', status: 'healthy', language: 'TypeScript'}),
      (s_auth:Service {name: 'Clerk-Auth-Sync', tier: 'tier-1', status: 'healthy', language: 'TypeScript'}),
      (s_portfolio:Service {name: 'Portfolio-Engine', tier: 'tier-1', status: 'healthy', language: 'Python'}),
      (s_market:Service {name: 'Live-Ticker-Service', tier: 'tier-1', status: 'healthy', language: 'Python'}),
      (s_webhook:Service {name: 'Svix-Webhook-Worker', tier: 'tier-2', status: 'healthy', language: 'Node.js'}),
      (s_analytics:Service {name: 'Risk-Analytics-Service', tier: 'tier-2', status: 'healthy', language: 'Python'}),

      // 5. Endpoints
      (ep_trade:Endpoint {name: 'POST /v1/portfolio/rebalance', path: '/v1/portfolio/rebalance', method: 'POST'}),
      (ep_stream:Endpoint {name: 'WS /v1/market/stream', path: '/v1/market/stream', method: 'WS'}),
      (ep_portal:Endpoint {name: 'GET /v1/tenant/portal', path: '/v1/tenant/portal', method: 'GET'}),
      (ep_hook:Endpoint {name: 'POST /v1/webhooks/svix', path: '/v1/webhooks/svix', method: 'POST'}),

      // 6. User-Facing Features
      (f_collab:Feature {name: 'Collaborative Portfolios', sla_tier: '99.99%', revenue_impact: 'High ($45k/mo)'}),
      (f_ticker:Feature {name: 'Live Market Asset Tracker', sla_tier: '99.95%', revenue_impact: 'High ($38k/mo)'}),
      (f_portal:Feature {name: 'White-Label Client Portal', sla_tier: '99.90%', revenue_impact: 'Critical ($60k/mo)'}),

      // 7. Past & Active Architectural Decisions
      (dec_old_webhook:Decision {
          id: 'DEC-101',
          title: 'Synchronous Clerk Webhook Processing',
          summary: 'Process tenant creation webhooks synchronously inside API-Gateway request thread.',
          status: 'deprecated',
          timestamp: '2026-08-10'
      }),
      (dec_new_webhook:Decision {
          id: 'DEC-108',
          title: 'Async Svix Queue for Tenant Webhooks',
          summary: 'All Clerk & tenant webhooks must be queued via Svix-Webhook-Worker and Redis to prevent Neon connection exhaustion.',
          status: 'active',
          timestamp: '2026-09-18'
      }),
      (dec_drizzle:Decision {
          id: 'DEC-112',
          title: 'Read-Replica Pooling on Portfolio-Engine',
          summary: 'Portfolio-Engine must route analytics queries through connection pooling to protect Neon-Postgres-Primary.',
          status: 'active',
          timestamp: '2026-09-29'
      }),
      (dec_ws:Decision {
          id: 'DEC-115',
          title: 'Sub-Second Ticker PubSub via Redis-Market-Cache',
          summary: 'Live-Ticker-Service must never query Neon-Postgres-Primary directly during market hours; read only from Redis-Market-Cache.',
          status: 'active',
          timestamp: '2026-10-04'
      }),

      // 8. Past Incidents, Runbooks & Open Tasks
      (inc_pool:Incident {
          id: 'INC-304',
          title: 'Neon Connection Pool Exhaustion During Market Open',
          severity: 'SEV-1',
          status: 'resolved',
          timestamp: '2026-09-17'
      }),
      (inc_latency:Incident {
          id: 'INC-319',
          title: 'Ticker Stream 4s Lag on Volatile Assets',
          severity: 'SEV-2',
          status: 'resolved',
          timestamp: '2026-10-03'
      }),
      (rb_pool:Runbook {
          id: 'RB-POOL-FAILOVER',
          title: 'Neon Connection Pool Exhaustion Mitigation',
          command: 'kubectl scale deployment/portfolio-engine --replicas=6 && pgbouncer -R',
          steps: '1. Divert read traffic to read-replica pool. 2. Restart idle pool connections. 3. Flush stale Redis cache keys.',
          target: 'Neon-Postgres-Primary',
          estimated_recovery_sec: 12
      }),
      (rb_ticker:Runbook {
          id: 'RB-TICKER-LAG',
          title: 'Live Ticker Lag Recovery',
          command: 'redis-cli -h redis-market-cache CLIENT KILL TYPE normal && kubectl rollout restart deployment/live-ticker-service',
          steps: '1. Terminate slow consumer websocket connections. 2. Restart ticker workers. 3. Re-subscribe to upstream feeds.',
          target: 'Redis-Market-Cache',
          estimated_recovery_sec: 8
      }),
      (tsk_audit:Task {
          id: 'TSK-201',
          title: 'Verify Svix signature retry backoff under spike load',
          priority: 'P1',
          status: 'open',
          created_by_agent: 'SystemSeed'
      }),

      // --- Relationships: Team Membership & Service Ownership ---
      (dev_gourav)-[:MEMBER_OF]->(t_core),
      (dev_aarav)-[:MEMBER_OF]->(t_quant),
      (dev_priya)-[:MEMBER_OF]->(t_sec),

      (t_core)-[:OWNS]->(s_gateway),
      (t_core)-[:OWNS]->(s_portfolio),
      (t_quant)-[:OWNS]->(s_market),
      (t_quant)-[:OWNS]->(s_analytics),
      (t_sec)-[:OWNS]->(s_auth),
      (t_sec)-[:OWNS]->(s_webhook),

      // --- Relationships: Feature -> Endpoint -> Service -> Service -> Database ---
      (f_collab)-[:DEPENDS_ON]->(ep_trade),
      (f_ticker)-[:DEPENDS_ON]->(ep_stream),
      (f_portal)-[:DEPENDS_ON]->(ep_portal),
      (f_portal)-[:DEPENDS_ON]->(ep_hook),

      (ep_trade)-[:EXPOSED_BY]->(s_portfolio),
      (ep_stream)-[:EXPOSED_BY]->(s_market),
      (ep_portal)-[:EXPOSED_BY]->(s_gateway),
      (ep_hook)-[:EXPOSED_BY]->(s_webhook),

      (s_gateway)-[:CALLS]->(s_auth),
      (s_gateway)-[:CALLS]->(s_portfolio),
      (s_gateway)-[:CALLS]->(s_market),
      (s_portfolio)-[:CALLS]->(s_auth),
      (s_portfolio)-[:CALLS]->(s_analytics),
      (s_analytics)-[:CALLS]->(s_market),
      (s_webhook)-[:CALLS]->(s_auth),

      (s_portfolio)-[:WRITES_TO]->(db_neon),
      (s_portfolio)-[:READS_FROM]->(db_neon),
      (s_auth)-[:READS_FROM]->(db_neon),
      (s_webhook)-[:WRITES_TO]->(db_neon),
      (s_webhook)-[:WRITES_TO]->(db_audit),
      (s_market)-[:READS_FROM]->(db_redis),
      (s_market)-[:WRITES_TO]->(db_redis),
      (s_analytics)-[:READS_FROM]->(db_redis),
      (s_analytics)-[:READS_FROM]->(db_neon),

      // --- Relationships: Decisions, Supersedes, Authors, Incidents ---
      (dev_priya)-[:AUTHORED]->(dec_old_webhook),
      (dev_gourav)-[:AUTHORED]->(dec_new_webhook),
      (dev_gourav)-[:AUTHORED]->(dec_drizzle),
      (dev_aarav)-[:AUTHORED]->(dec_ws),

      (dec_new_webhook)-[:SUPERSEDES]->(dec_old_webhook),
      (dec_new_webhook)-[:MOTIVATED_BY]->(inc_pool),
      (dec_drizzle)-[:MOTIVATED_BY]->(inc_pool),
      (dec_ws)-[:MOTIVATED_BY]->(inc_latency),

      (dec_old_webhook)-[:AFFECTS]->(s_gateway),
      (dec_new_webhook)-[:AFFECTS]->(s_webhook),
      (dec_new_webhook)-[:AFFECTS]->(s_auth),
      (dec_drizzle)-[:AFFECTS]->(s_portfolio),
      (dec_ws)-[:AFFECTS]->(s_market),

      (inc_pool)-[:IMPACTS]->(s_portfolio),
      (inc_pool)-[:IMPACTS]->(s_auth),
      (inc_latency)-[:IMPACTS]->(s_market),
      (inc_pool)-[:RESOLVED_BY]->(rb_pool),
      (inc_latency)-[:RESOLVED_BY]->(rb_ticker),

      (tsk_audit)-[:MITIGATES]->(inc_pool),
      (tsk_audit)-[:ASSIGNED_TO]->(dev_priya)
    """

    graph.query(cypher)
    return db_manager.health_check(workspace)


def seed_shopsphere_core(reset: bool = True) -> dict:
    """Seeds the `ShopSphere-Core` workspace graph (MERN E-Commerce architecture)."""
    workspace = "ShopSphere-Core"
    graph = db_manager.get_graph(workspace)

    if reset:
        try:
            graph.delete()
            graph = db_manager.get_graph(workspace)
        except Exception:
            pass

    cypher = """
    CREATE
      (t_checkout:Team {name: 'Checkout & Payments', slack_channel: '#shop-payments', on_call: 'Gourav Das'}),
      (t_catalog:Team {name: 'Catalog & Search', slack_channel: '#shop-catalog', on_call: 'Rohan Sen'}),

      (dev_gourav:Developer {name: 'Gourav Das', role: 'Lead Backend Engineer', email: 'gourav@shopsphere.in', expertise: 'Node.js, Express, Stripe, Razorpay, RBAC'}),
      (dev_rohan:Developer {name: 'Rohan Sen', role: 'Search & Catalog Engineer', email: 'rohan@shopsphere.in', expertise: 'MongoDB Indexing, Recommendations'}),

      (db_mongo:Database {name: 'Mongo-Cluster-Primary', engine: 'MongoDB', region: 'ap-south-1', status: 'healthy'}),
      (db_redis:Database {name: 'OTP-Session-Redis', engine: 'Redis', region: 'ap-south-1', status: 'healthy'}),

      (s_order:Service {name: 'Order-Service', tier: 'tier-1', status: 'healthy', language: 'Node.js'}),
      (s_pay:Service {name: 'Payment-Router', tier: 'tier-1', status: 'healthy', language: 'Node.js'}),
      (s_otp:Service {name: 'OTP-Auth-Service', tier: 'tier-1', status: 'healthy', language: 'Node.js'}),
      (s_reco:Service {name: 'Recommendation-Engine', tier: 'tier-2', status: 'healthy', language: 'Python'}),

      (ep_pay:Endpoint {name: 'POST /api/v1/checkout/pay', path: '/api/v1/checkout/pay', method: 'POST'}),
      (ep_similar:Endpoint {name: 'GET /api/v1/products/similar', path: '/api/v1/products/similar', method: 'GET'}),

      (f_buy:Feature {name: 'Dual Stripe & Razorpay Checkout', sla_tier: '99.99%', revenue_impact: 'Critical ($120k/mo)'}),
      (f_reco:Feature {name: 'Similar-Product Recommendations', sla_tier: '99.50%', revenue_impact: 'Medium ($18k/mo)'}),

      (dec_old_pay:Decision {
          id: 'DEC-201',
          title: 'Single Gateway Stripe Checkout',
          summary: 'Route all Indian and international card payments strictly through Stripe.',
          status: 'deprecated',
          timestamp: '2026-06-12'
      }),
      (dec_dual_pay:Decision {
          id: 'DEC-209',
          title: 'Automatic Razorpay Failover for UPI/INR',
          summary: 'Payment-Router must route INR/UPI transactions to Razorpay with idempotency keys to avoid double-charging.',
          status: 'active',
          timestamp: '2026-08-22'
      }),

      (inc_upi:Incident {
          id: 'INC-501',
          title: 'Duplicate Order Creation on Webhook Retry',
          severity: 'SEV-1',
          status: 'resolved',
          timestamp: '2026-08-20'
      }),
      (rb_pay:Runbook {
          id: 'RB-PAY-FAILOVER',
          title: 'Payment Gateway Circuit Breaker Mitigation',
          command: 'curl -X POST http://payment-router:8080/circuit-breaker/force-razorpay && kubectl scale deployment/payment-router --replicas=4',
          steps: '1. Divert checkout traffic to Razorpay backup. 2. Drain stuck stripe worker queues. 3. Resync webhook nonces.',
          target: 'Payment-Router',
          estimated_recovery_sec: 15
      }),

      (dev_gourav)-[:MEMBER_OF]->(t_checkout),
      (dev_rohan)-[:MEMBER_OF]->(t_catalog),
      (t_checkout)-[:OWNS]->(s_order),
      (t_checkout)-[:OWNS]->(s_pay),
      (t_checkout)-[:OWNS]->(s_otp),
      (t_catalog)-[:OWNS]->(s_reco),

      (f_buy)-[:DEPENDS_ON]->(ep_pay),
      (f_reco)-[:DEPENDS_ON]->(ep_similar),
      (ep_pay)-[:EXPOSED_BY]->(s_order),
      (ep_similar)-[:EXPOSED_BY]->(s_reco),

      (s_order)-[:CALLS]->(s_pay),
      (s_order)-[:CALLS]->(s_otp),
      (s_pay)-[:CALLS]->(s_otp),
      (s_order)-[:WRITES_TO]->(db_mongo),
      (s_reco)-[:READS_FROM]->(db_mongo),
      (s_otp)-[:WRITES_TO]->(db_redis),

      (dev_gourav)-[:AUTHORED]->(dec_old_pay),
      (dev_gourav)-[:AUTHORED]->(dec_dual_pay),
      (dec_dual_pay)-[:SUPERSEDES]->(dec_old_pay),
      (dec_dual_pay)-[:MOTIVATED_BY]->(inc_upi),
      (dec_dual_pay)-[:AFFECTS]->(s_pay),
      (dec_dual_pay)-[:AFFECTS]->(s_order),
      (inc_upi)-[:IMPACTS]->(s_pay),
      (inc_upi)-[:RESOLVED_BY]->(rb_pay)
    """

    graph.query(cypher)
    return db_manager.health_check(workspace)


def seed_all_workspaces() -> dict:
    finpulse_stats = seed_finpulse_prod(reset=True)
    shopsphere_stats = seed_shopsphere_core(reset=True)
    return {
        "FinPulse-Prod": finpulse_stats,
        "ShopSphere-Core": shopsphere_stats,
    }


if __name__ == "__main__":
    import sys
    from pathlib import Path
    sys.path.append(str(Path(__file__).resolve().parents[2]))
    stats = seed_all_workspaces()
    print("=== Multi-Tenant FalkorDB Workspaces Seeded Successfully ===")
    for ws, info in stats.items():
        print(f"\nWorkspace: {ws}")
        print(f"  Nodes: {info['total_nodes']} | Edges: {info['total_edges']} | Query Time: {info['query_time_ms']} ms")
        print(f"  All Active Graphs in FalkorDB: {info['all_workspaces']}")
