export interface DemoScenario {
  badge: string;
  title: string;
  prompt: string;
  color: string;
}

export const WORKSPACE_SCENARIOS: Record<string, DemoScenario[]> = {
  "FinPulse-Prod": [
    {
      badge: "🚑 P1 OUTAGE & AUTO-REMEDIATE",
      title: "P1 Outage: Auto-Remediate Neon Exhaustion",
      prompt:
        "Simulate an emergency P1 outage on Neon-Postgres-Primary, calculate downstream blast radius, and execute the verified FalkorDB self-healing runbook playbook.",
      color: "border-red-500/50 hover:bg-red-950/50 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.2)]",
    },
    {
      badge: "BLAST RADIUS & MITIGATION",
      title: "Simulate Neon-Postgres Outage",
      prompt:
        "Simulate an outage on Neon-Postgres-Primary, trace the 1..5 hop downstream blast radius, and create an emergency mitigation task.",
      color: "border-rose-500/40 hover:bg-rose-950/40",
    },
    {
      badge: "POLICY CONFLICT CHECK",
      title: "Propose Sync Webhook Change",
      prompt:
        "Can we propose adding a synchronous webhook call on Svix-Webhook-Worker, or does that violate an active architectural decision?",
      color: "border-fuchsia-500/40 hover:bg-fuchsia-950/40",
    },
    {
      badge: "COMPANY BRAIN",
      title: "Resolve Collaborative Portfolio Owners",
      prompt:
        "Who on the team owns Collaborative Portfolios and authored the underlying architectural decisions?",
      color: "border-emerald-500/40 hover:bg-emerald-950/40",
    },
    {
      badge: "ROOT CAUSE TRACER",
      title: "Find Shared Dependency Between Features",
      prompt:
        "Both Collaborative Portfolios and White-Label Client Portal are throwing errors. Find the shortest path and shared root cause.",
      color: "border-sky-500/40 hover:bg-sky-950/40",
    },
    {
      badge: "PAGERANK BOTTLENECK AUDIT",
      title: "Rank Critical Single Points of Failure",
      prompt:
        "Run PageRank and multi-hop fan-in centrality to rank single points of failure across our architecture.",
      color: "border-amber-500/40 hover:bg-amber-950/40",
    },
  ],
  "ShopSphere-Core": [
    {
      badge: "🚑 P1 OUTAGE & AUTO-REMEDIATE",
      title: "P1 Outage: Auto-Remediate Payment Gateway",
      prompt:
        "Simulate an emergency P1 outage on Payment-Router, trace blast radius, and execute the verified FalkorDB self-healing runbook playbook.",
      color: "border-red-500/50 hover:bg-red-950/50 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.2)]",
    },
    {
      badge: "BLAST RADIUS & MITIGATION",
      title: "Simulate Mongo-Cluster Outage",
      prompt:
        "Simulate an outage on Mongo-Cluster-Primary, calculate the downstream blast radius, and assign a P0 mitigation task.",
      color: "border-rose-500/40 hover:bg-rose-950/40",
    },
    {
      badge: "POLICY CONFLICT CHECK",
      title: "Check Payment-Router Decision Lineage",
      prompt:
        "Why did we deprecate single-gateway Stripe checkout on Payment-Router, and which incident motivated the decision?",
      color: "border-fuchsia-500/40 hover:bg-fuchsia-950/40",
    },
    {
      badge: "COMPANY BRAIN",
      title: "Find Checkout Owners & Decision Authors",
      prompt:
        "Who owns Dual Stripe & Razorpay Checkout and what architectural decisions have they authored?",
      color: "border-emerald-500/40 hover:bg-emerald-950/40",
    },
    {
      badge: "PAGERANK BOTTLENECK AUDIT",
      title: "Rank Service Bottlenecks",
      prompt:
        "Run PageRank and centrality bottleneck audit across ShopSphere-Core.",
      color: "border-amber-500/40 hover:bg-amber-950/40",
    },
  ],
};

