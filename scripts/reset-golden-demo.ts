import { resetGoldenDemo, seedGoldenDemo } from "./seed-golden-demo.ts";

export async function resetAndReseedGoldenDemo() {
  await resetGoldenDemo();
  return seedGoldenDemo();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  resetAndReseedGoldenDemo().then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error); process.exit(1); });
}
