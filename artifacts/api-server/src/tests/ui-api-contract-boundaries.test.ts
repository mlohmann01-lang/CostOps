import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (p: string) => fs.readFileSync(new URL(p, import.meta.url), "utf8");

test("recommendations page does not reference playbookId", () => {
  const page = read("../../../control-plane/src/pages/recommendations.tsx");
  assert.equal(page.includes("playbookId"), false);
});

test("nav registry only exposes enabled+existing items", () => {
  const nav = read("../../../control-plane/src/lib/navigation/nav-registry.ts");
  assert.equal(nav.includes("visibleNavItems = navRegistry.filter((item) => item.enabled && item.pageExists)"), true);
});

test("ui endpoints are backed by backend routes", () => {
  const page = read("../../../control-plane/src/pages/recommendations.tsx");
  const approvalsRoute = read("../routes/approvals.ts");
  const recommendationsRoute = read("../routes/recommendations.ts");

  if (page.includes("/api/approvals")) {
    assert.equal(approvalsRoute.includes("router.post(\"/\""), true);
  }
  if (page.includes("/api/recommendations/prioritized-queue")) {
    assert.equal(recommendationsRoute.includes("/prioritized-queue"), true);
  }
});

test("workspace packageManager avoids unsupported exact replit pin", () => {
  const pkg = JSON.parse(read("../../../../package.json"));
  assert.notEqual(pkg.packageManager, "pnpm@10.33.0");
});
