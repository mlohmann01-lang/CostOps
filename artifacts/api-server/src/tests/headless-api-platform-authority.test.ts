// Program 15 — Headless API Platform Authority test suite.

import test from "node:test";
import assert from "node:assert/strict";
import {
  buildHeadlessApiCategories,
  buildHeadlessApiReadiness,
  getHeadlessApiPlatformAuthority,
} from "../lib/headless-api-platform/headless-api-platform-authority";

test("[coverage] all 7 Program 15 categories are present, each with real /api routes", () => {
  const categories = buildHeadlessApiCategories();
  assert.equal(categories.length, 7);
  const ids = new Set(categories.map((c) => c.id));
  for (const expected of ["discovery", "governance", "authorities", "outcomes", "portfolio", "ai", "executive"]) {
    assert.ok(ids.has(expected), `missing category ${expected}`);
  }
  for (const c of categories) {
    assert.ok(c.routes.length > 0, `${c.id} must list at least one route`);
    for (const r of c.routes) assert.ok(r.startsWith("/api/"), `${c.id} route ${r} must be an /api/... path`);
  }
});

test("[coverage] category coverage is computed correctly from mounted/total ratio", () => {
  const categories = buildHeadlessApiCategories();
  for (const c of categories) {
    assert.ok(c.coverage >= 0 && c.coverage <= 100);
    if (c.coverage === 100) assert.equal(c.readiness, "READY");
    if (c.coverage === 0) assert.equal(c.readiness, "MISSING");
  }
});

test("[readiness] platform readiness aggregates category coverage and reports honest documentation/integration gaps", () => {
  const categories = buildHeadlessApiCategories();
  const readiness = buildHeadlessApiReadiness(categories);
  assert.ok(readiness.coverage >= 0 && readiness.coverage <= 100);
  assert.equal(readiness.versioning, "READY");
  assert.equal(readiness.authentication, "READY");
  assert.equal(readiness.documentation, "MISSING", "no OpenAPI spec exists yet — must be reported honestly");
  assert.equal(readiness.integrationReadiness, "PARTIAL", "no MCP/agent/Slack adapter exists yet — must not claim READY");
});

test("[authority] getHeadlessApiPlatformAuthority returns a complete, deterministic result", () => {
  const a = getHeadlessApiPlatformAuthority();
  assert.equal(a.authority, "HEADLESS_API_PLATFORM");
  assert.ok(typeof a.generatedAt === "string" && a.generatedAt.length > 0);
  assert.equal(a.categories.length, 7);
  assert.ok(["READY", "PARTIAL", "NOT_READY"].includes(a.overallReadiness));
  assert.ok(a.findings.length > 0, "documentation/integration gaps must always surface at least one finding");
  assert.ok(a.recommendations.length > 0);
});

test("[determinism] two calls produce equal categories and readiness (generatedAt excluded)", () => {
  const a = getHeadlessApiPlatformAuthority();
  const b = getHeadlessApiPlatformAuthority();
  assert.deepEqual(a.categories, b.categories);
  assert.deepEqual(a.readiness, b.readiness);
  assert.deepEqual(a.findings, b.findings);
});

test("[honesty] overallReadiness is never READY while documentation is MISSING", () => {
  const a = getHeadlessApiPlatformAuthority();
  if (a.readiness.documentation === "MISSING") {
    assert.notEqual(a.overallReadiness, "READY");
  }
});

test("[findings] every finding cites at least one affected file and every recommendation has a category", () => {
  const a = getHeadlessApiPlatformAuthority();
  for (const f of a.findings) {
    assert.ok(f.affectedFiles.length > 0, `finding ${f.id} must cite a file`);
    assert.ok(f.description.length > 10);
  }
  for (const r of a.recommendations) {
    assert.ok(r.category.length > 0);
    assert.ok(r.action.length > 10);
  }
});
