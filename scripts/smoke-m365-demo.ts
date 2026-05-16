const baseUrl = process.env.API_BASE_URL ?? "http://localhost:4000";
const readOnlyEndpoints = [
  "/api/demo/status",
  "/api/recommendations",
  "/api/governance/approvals",
  "/api/execution-orchestration/observability",
  "/api/execution-orchestration/savings-proof/summary",
];

async function main() {
  for (const endpoint of readOnlyEndpoints) {
    const url = `${baseUrl}${endpoint}`;
    const response = await fetch(url, { method: "GET" });

    if (!response.ok) {
      throw new Error(`smoke check failed for ${endpoint} with status ${response.status}`);
    }

    console.log(`ok: ${endpoint}`);
  }

  console.log("smoke demo checks passed (read-only, no execution endpoints called)");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
