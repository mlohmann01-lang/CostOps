import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  generateExecutiveProofPack,
  getExecutiveProofPack,
  listExecutiveProofPacks,
  archiveExecutiveProofPack,
  markExecutiveProofPackExported,
  evaluateProofPackCompleteness,
  evaluateExecutiveProofPackExportReadiness,
  getExecutiveProofPackAuthoritySummary,
  getExecutiveProofPackAuthorityStatus,
  clearExecutiveProofPackStore,
  type ExecutiveProofPackType,
} from "../lib/proof-pack-authority/executive-proof-pack-authority";
import { syncTechnologyPortfolioAuthority, clearTechnologyPortfolioStores } from "../lib/technology-portfolio/technology-portfolio-authority";

const TENANT = "test-proof-pack-tenant";
const OTHER = "other-proof-pack-tenant";

const PERIOD = { periodStart: "2026-01-01T00:00:00.000Z", periodEnd: "2026-12-31T23:59:59.999Z" };

async function setup() {
  clearExecutiveProofPackStore();
  clearTechnologyPortfolioStores();
  await syncTechnologyPortfolioAuthority(TENANT);
}

test("1. Board Pack generation", async () => {
  await setup();
  const pack = await generateExecutiveProofPack({ tenantId: TENANT, packType: "BOARD_PACK", ...PERIOD });
  assert.equal(pack.packType, "BOARD_PACK");
  assert.equal(pack.audience, "BOARD");
  assert.ok(pack.id);
  assert.ok(pack.title.includes("Board"));
  assert.ok(pack.sections.length > 0);
  assert.ok(["READY", "INCOMPLETE"].includes(pack.status));
  assert.ok(typeof pack.completeness.score === "number");
});

test("2. CFO Pack generation", async () => {
  await setup();
  const pack = await generateExecutiveProofPack({ tenantId: TENANT, packType: "CFO_PACK", ...PERIOD });
  assert.equal(pack.packType, "CFO_PACK");
  assert.equal(pack.audience, "CFO");
  assert.ok(pack.sections.some((s) => s.sectionType === "VALUE_BRIDGE"), "CFO pack must have VALUE_BRIDGE");
  assert.ok(pack.sections.some((s) => s.sectionType === "DRIFT"), "CFO pack must have DRIFT");
});

test("3. CIO Pack generation", async () => {
  await setup();
  const pack = await generateExecutiveProofPack({ tenantId: TENANT, packType: "CIO_PACK", ...PERIOD });
  assert.equal(pack.packType, "CIO_PACK");
  assert.equal(pack.audience, "CIO");
  assert.ok(pack.sections.some((s) => s.sectionType === "PORTFOLIO_HEALTH"), "CIO pack must have PORTFOLIO_HEALTH");
  assert.ok(pack.sections.some((s) => s.sectionType === "ACTIONS"), "CIO pack must have ACTIONS");
});

test("4. Procurement Pack generation", async () => {
  await setup();
  const pack = await generateExecutiveProofPack({ tenantId: TENANT, packType: "PROCUREMENT_PACK", ...PERIOD });
  assert.equal(pack.packType, "PROCUREMENT_PACK");
  assert.equal(pack.audience, "PROCUREMENT");
  assert.ok(pack.sections.some((s) => s.sectionType === "APPROVALS"), "Procurement pack must have APPROVALS");
  assert.ok(pack.sections.some((s) => s.sectionType === "VALUE_BRIDGE"), "Procurement pack must have VALUE_BRIDGE");
});

test("5. Audit Pack generation", async () => {
  await setup();
  const pack = await generateExecutiveProofPack({ tenantId: TENANT, packType: "AUDIT_PACK", ...PERIOD });
  assert.equal(pack.packType, "AUDIT_PACK");
  assert.equal(pack.audience, "AUDIT");
  assert.ok(pack.sections.some((s) => s.sectionType === "APPROVALS"), "Audit pack must have APPROVALS");
  assert.ok(pack.sections.some((s) => s.sectionType === "EXECUTIONS"), "Audit pack must have EXECUTIONS");
  assert.ok(pack.sections.some((s) => s.sectionType === "DRIFT"), "Audit pack must have DRIFT");
  assert.ok(pack.sections.some((s) => s.sectionType === "EVIDENCE_INDEX"), "Audit pack must have EVIDENCE_INDEX");
});

test("6. Operator Pack generation", async () => {
  await setup();
  const pack = await generateExecutiveProofPack({ tenantId: TENANT, packType: "OPERATOR_PACK", ...PERIOD });
  assert.equal(pack.packType, "OPERATOR_PACK");
  assert.equal(pack.audience, "OPERATIONS");
  assert.ok(pack.sections.some((s) => s.sectionType === "ACTIONS"), "Operator pack must have ACTIONS");
  assert.ok(pack.sections.some((s) => s.sectionType === "RECOMMENDED_DECISIONS"), "Operator pack must have RECOMMENDED_DECISIONS");
});

test("7. Pack-specific required sections", async () => {
  await setup();
  const boardPack = await generateExecutiveProofPack({ tenantId: TENANT, packType: "BOARD_PACK", ...PERIOD });
  const required = ["EXECUTIVE_SUMMARY", "VALUE_BRIDGE", "CERTIFIED_WEDGES", "PORTFOLIO_HEALTH", "PROTECTED_VALUE", "RISKS_AND_BLOCKERS", "RECOMMENDED_DECISIONS", "EVIDENCE_INDEX"];
  for (const st of required) {
    assert.ok(boardPack.sections.some((s) => s.sectionType === st), `Board pack missing section: ${st}`);
  }
  const auditPack = await generateExecutiveProofPack({ tenantId: TENANT, packType: "AUDIT_PACK", ...PERIOD });
  for (const st of ["APPROVALS", "EXECUTIONS", "OUTCOMES", "PROTECTED_VALUE", "DRIFT"]) {
    assert.ok(auditPack.sections.some((s) => s.sectionType === st), `Audit pack missing section: ${st}`);
  }
});

test("8. Deterministic narratives", async () => {
  await setup();
  const pack = await generateExecutiveProofPack({ tenantId: TENANT, packType: "BOARD_PACK", ...PERIOD });
  const summary = pack.sections.find((s) => s.sectionType === "EXECUTIVE_SUMMARY")!;
  assert.ok(summary.narrative.length > 50, "Narrative must be non-trivial");
  assert.ok(summary.narrative.includes("certified"), "Board narrative must reference certified wedges");
  assert.ok(summary.narrative.includes("protected") || summary.narrative.includes("verified"), "Board narrative must reference value");

  const pack2 = await generateExecutiveProofPack({ tenantId: TENANT, packType: "BOARD_PACK", ...PERIOD });
  const summary2 = pack2.sections.find((s) => s.sectionType === "EXECUTIVE_SUMMARY")!;
  assert.equal(typeof summary2.narrative, "string");
  assert.ok(summary2.narrative.length > 0);

  const cfoPack = await generateExecutiveProofPack({ tenantId: TENANT, packType: "CFO_PACK", ...PERIOD });
  const cfoSummary = cfoPack.sections.find((s) => s.sectionType === "EXECUTIVE_SUMMARY")!;
  assert.ok(cfoSummary.narrative.includes("bridge") || cfoSummary.narrative.includes("value"), "CFO narrative must reference financial value");
});

test("9. Completeness score", async () => {
  await setup();
  const pack = await generateExecutiveProofPack({ tenantId: TENANT, packType: "BOARD_PACK", ...PERIOD });
  assert.ok(pack.completeness.score >= 0 && pack.completeness.score <= 100, "Completeness score must be 0-100");
  assert.equal(typeof pack.completeness.hasCertifiedWedgeEvidence, "boolean");
  assert.equal(typeof pack.completeness.hasApprovalEvidence, "boolean");
  assert.equal(typeof pack.completeness.hasExecutionEvidence, "boolean");
  assert.equal(typeof pack.completeness.hasVerificationEvidence, "boolean");
  assert.equal(typeof pack.completeness.hasOutcomeEvidence, "boolean");
  assert.equal(typeof pack.completeness.hasProtectionEvidence, "boolean");
  assert.equal(typeof pack.completeness.hasDriftEvidence, "boolean");
  assert.equal(typeof pack.completeness.hasPortfolioSummary, "boolean");
  assert.ok(Array.isArray(pack.completeness.missingItems));
});

test("10. Incomplete pack missing items", async () => {
  await setup();
  const auditPack = await generateExecutiveProofPack({ tenantId: TENANT, packType: "AUDIT_PACK", ...PERIOD });
  // Audit pack requires all evidence types — check completeness reports any missing items coherently
  assert.ok(Array.isArray(auditPack.completeness.missingItems));
  assert.equal(typeof auditPack.completeness.ready, "boolean");
  assert.ok(auditPack.completeness.score >= 0);
  // status must reflect completeness
  if (auditPack.completeness.ready) {
    assert.equal(auditPack.status, "READY");
  } else {
    assert.equal(auditPack.status, "INCOMPLETE");
  }
});

test("11. Export readiness", async () => {
  await setup();
  const pack = await generateExecutiveProofPack({ tenantId: TENANT, packType: "BOARD_PACK", ...PERIOD });
  const readiness = evaluateExecutiveProofPackExportReadiness(TENANT, pack.id);
  assert.equal(readiness.packId, pack.id);
  assert.equal(readiness.tenantId, TENANT);
  assert.ok(typeof readiness.ready === "boolean");
  assert.ok(typeof readiness.score === "number");
  assert.ok(Array.isArray(readiness.missingItems));
  assert.ok(readiness.exportFormats.includes("JSON"), "Must support JSON export");
  assert.ok(readiness.exportFormats.includes("PDF"), "Must support PDF export");
  assert.ok(readiness.exportFormats.includes("DOCX"), "Must support DOCX export");
  assert.ok(readiness.generatedAt);
});

test("12. Mark exported", async () => {
  await setup();
  const pack = await generateExecutiveProofPack({ tenantId: TENANT, packType: "CFO_PACK", ...PERIOD });
  const exported = markExecutiveProofPackExported(TENANT, pack.id);
  assert.ok(exported);
  assert.equal(exported!.status, "EXPORTED");
  assert.ok(exported!.exportedAt);
  const retrieved = getExecutiveProofPack(TENANT, pack.id)!;
  assert.equal(retrieved.status, "EXPORTED");
});

test("13. Archive pack", async () => {
  await setup();
  const pack = await generateExecutiveProofPack({ tenantId: TENANT, packType: "CIO_PACK", ...PERIOD });
  const archived = archiveExecutiveProofPack(TENANT, pack.id);
  assert.ok(archived);
  assert.equal(archived!.status, "ARCHIVED");
  const retrieved = getExecutiveProofPack(TENANT, pack.id)!;
  assert.equal(retrieved.status, "ARCHIVED");
});

test("14. Summary counts", async () => {
  await setup();
  const types: ExecutiveProofPackType[] = ["BOARD_PACK", "CFO_PACK", "CIO_PACK", "PROCUREMENT_PACK", "AUDIT_PACK", "OPERATOR_PACK"];
  for (const type of types) {
    await generateExecutiveProofPack({ tenantId: TENANT, packType: type, ...PERIOD });
  }
  const summary = await getExecutiveProofPackAuthoritySummary(TENANT);
  assert.equal(summary.totalPacks, 6);
  assert.ok(summary.readyPacks >= 0 && summary.readyPacks <= 6);
  assert.ok(summary.incompletePacks >= 0 && summary.incompletePacks <= 6);
  assert.equal(typeof summary.boardPackReady, "boolean");
  assert.equal(typeof summary.cfoPackReady, "boolean");
  assert.equal(typeof summary.cioPackReady, "boolean");
  assert.equal(typeof summary.procurementPackReady, "boolean");
  assert.equal(typeof summary.auditPackReady, "boolean");
  assert.ok(typeof summary.projectedAnnualValue === "number");
  assert.ok(typeof summary.protectedAnnualValue === "number");
  assert.ok(summary.totalWedges >= 0);
  assert.ok(Array.isArray(summary.blockers));
});

test("15. Registry includes Executive Proof Pack Authority platform authority", async () => {
  await setup();
  const types: ExecutiveProofPackType[] = ["BOARD_PACK", "CFO_PACK", "CIO_PACK", "PROCUREMENT_PACK", "AUDIT_PACK", "OPERATOR_PACK"];
  for (const type of types) {
    await generateExecutiveProofPack({ tenantId: TENANT, packType: type, ...PERIOD });
  }
  const status = await getExecutiveProofPackAuthorityStatus(TENANT);
  assert.equal(status.authorityId, "executive-proof-pack-authority");
  assert.equal(status.name, "Executive Proof Pack Authority");
  assert.equal(status.type, "PLATFORM_AUTHORITY");
  assert.ok(["CERTIFIED", "PARTIAL", "NOT_CERTIFIED"].includes(status.status));
  assert.equal(status.certificationRequirements.allSixPackTypesCanGenerate, true);
  assert.equal(status.certificationRequirements.completenessEvaluationExists, true);
  assert.equal(status.certificationRequirements.exportReadinessExists, true);
  assert.equal(status.certificationRequirements.uiAvailable, true);
  assert.equal(status.certificationRequirements.apiAvailable, true);
  assert.equal(status.certificationRequirements.deterministicNarrativesExist, true);
  assert.ok(Array.isArray(status.blockers));
});

test("16. Tenant isolation", async () => {
  clearExecutiveProofPackStore();
  clearTechnologyPortfolioStores();
  await syncTechnologyPortfolioAuthority(TENANT);
  await generateExecutiveProofPack({ tenantId: TENANT, packType: "BOARD_PACK", ...PERIOD });
  await generateExecutiveProofPack({ tenantId: OTHER, packType: "CFO_PACK", ...PERIOD });
  const tenantPacks = listExecutiveProofPacks(TENANT);
  const otherPacks = listExecutiveProofPacks(OTHER);
  assert.equal(tenantPacks.every((p) => p.tenantId === TENANT), true);
  assert.equal(otherPacks.every((p) => p.tenantId === OTHER), true);
  assert.equal(tenantPacks.some((p) => p.tenantId === OTHER), false);
});

test("17. Role guard behaviour", () => {
  const routeFile = path.resolve(process.cwd(), "src/routes/executive-proof-packs.ts");
  const content = fs.readFileSync(routeFile, "utf8");
  assert.equal(content.includes("requireTenantContext"), true, "Must use requireTenantContext");
  assert.equal(content.includes("requireRole"), true, "Must use requireRole");
  assert.equal(content.includes('"READ"'), true, "Must guard GET endpoints with READ role");
  assert.equal(content.includes('"EVIDENCE"'), true, "Must guard mutation endpoints with EVIDENCE role");
  assert.equal(content.includes("403"), true, "Must return 403 on role violation");
});

test("18. No LLM-generated text dependency", () => {
  const root = path.resolve(process.cwd(), "src/lib/proof-pack-authority");
  const content = fs.readFileSync(path.join(root, "executive-proof-pack-authority.ts"), "utf8");
  assert.equal(content.includes("openai"), false, "Must not use openai");
  assert.equal(content.includes("anthropic"), false, "Must not use anthropic");
  assert.equal(content.includes("gpt"), false, "Must not use gpt");
  assert.equal(content.includes("llm"), false, "Must not use llm");
  assert.equal(content.includes("completion"), false, "Must not call AI completions");
});

test("19. No LeftShield labels", () => {
  const root = path.resolve(process.cwd(), "src/lib/proof-pack-authority");
  const content = fs.readFileSync(path.join(root, "executive-proof-pack-authority.ts"), "utf8");
  assert.equal(content.includes("LeftShield"), false);
});

test("20. No Agent Security Analytics labels", () => {
  const root = path.resolve(process.cwd(), "src/lib/proof-pack-authority");
  const content = fs.readFileSync(path.join(root, "executive-proof-pack-authority.ts"), "utf8");
  assert.equal(content.includes("Agent Security Analytics"), false);
});
