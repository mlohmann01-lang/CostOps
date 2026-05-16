import { resetGoldenDemo, seedGoldenDemo } from "./seed-golden-demo.ts";
const tenantId = process.env.GOLDEN_DEMO_TENANT_ID ?? "tenant-contoso-retail-group";

export async function resetAndReseedGoldenDemo() {
  if (!tenantId.includes("demo") && !tenantId.includes("contoso")) throw new Error("Blocked reset: non-demo tenant");
  await resetGoldenDemo();
  return seedGoldenDemo();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  resetAndReseedGoldenDemo().then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error); process.exit(1); });
}
