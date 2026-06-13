import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  createPortfolioAsset,
  getPortfolioAsset,
  listPortfolioAssets,
  updatePortfolioAsset,
  createPortfolioOwner,
  listPortfolioOwners,
  createPortfolioContract,
  listPortfolioContracts,
  createPortfolioRenewal,
  listPortfolioRenewals,
  linkPortfolioAssetToRecommendation,
  linkPortfolioAssetToGovernedAction,
  linkPortfolioAssetToOutcome,
  linkPortfolioAssetToProtectedOutcome,
  linkPortfolioAssetToEvidence,
  syncTechnologyPortfolioAuthority,
  getTechnologyPortfolioHealth,
  getTechnologyPortfolioAuthorityStatus,
  clearTechnologyPortfolioStores,
  ingestM365PortfolioAssets,
  ingestAIPortfolioAssets,
  ingestServiceNowPortfolioAssets,
  ingestAwsPortfolioAssets,
  ingestAzurePortfolioAssets,
  ingestSnowflakePortfolioAssets,
  ingestDatabricksPortfolioAssets,
  ingestItamPortfolioAssets,
} from "../lib/technology-portfolio/technology-portfolio-authority";

const TENANT = "test-portfolio-tenant";
const OTHER = "other-portfolio-tenant";

function setup() { clearTechnologyPortfolioStores(); }

test("1. Portfolio assets can be created, listed, and updated", () => {
  setup();
  const asset = createPortfolioAsset({
    tenantId: TENANT,
    name: "Test Asset",
    assetType: "APPLICATION",
    sourceWedge: "M365",
    sourceId: "test-001",
    status: "ACTIVE",
    recommendationIds: [],
    governedActionIds: [],
    outcomeIds: [],
    protectedOutcomeIds: [],
    evidenceIds: [],
    certificationStatus: "CERTIFIED",
  });
  assert.ok(asset.id);
  assert.equal(asset.name, "Test Asset");

  const found = getPortfolioAsset(TENANT, asset.id);
  assert.ok(found);
  assert.equal(found!.id, asset.id);

  const list = listPortfolioAssets(TENANT);
  assert.equal(list.some((a) => a.id === asset.id), true);

  const updated = updatePortfolioAsset(TENANT, asset.id, { status: "UNDER_REVIEW" });
  assert.ok(updated);
  assert.equal(updated!.status, "UNDER_REVIEW");
});

test("2. Owners, contracts, and renewals can be created and listed", () => {
  setup();
  const owner = createPortfolioOwner({
    tenantId: TENANT,
    name: "Jane Smith",
    email: "jane@example.com",
    businessUnit: "Engineering",
    costCentre: "CC-001",
    assetIds: [],
    actionIds: [],
    outcomeIds: [],
  });
  assert.ok(owner.id);
  assert.equal(listPortfolioOwners(TENANT).some((o) => o.id === owner.id), true);

  const contract = createPortfolioContract({
    tenantId: TENANT,
    vendor: "Microsoft",
    contractName: "M365 Enterprise Agreement",
    annualValue: 200000,
    linkedAssetIds: [],
    riskLevel: "LOW",
    status: "ACTIVE",
  });
  assert.ok(contract.id);
  assert.equal(listPortfolioContracts(TENANT).some((c) => c.id === contract.id), true);

  const renewal = createPortfolioRenewal({
    tenantId: TENANT,
    contractId: contract.id,
    renewalDate: new Date(Date.now() + 45 * 86400000).toISOString().split("T")[0],
    daysUntilRenewal: 45,
    renewalRisk: "HIGH",
    linkedRecommendationIds: [],
    linkedActionIds: [],
  });
  assert.ok(renewal.id);
  assert.equal(listPortfolioRenewals(TENANT).some((r) => r.id === renewal.id), true);
});

test("3. Tenant isolation is enforced", () => {
  setup();
  createPortfolioAsset({ tenantId: TENANT, name: "Tenant A Asset", assetType: "APPLICATION", sourceWedge: "M365", sourceId: "a1", status: "ACTIVE", recommendationIds: [], governedActionIds: [], outcomeIds: [], protectedOutcomeIds: [], evidenceIds: [], certificationStatus: "CERTIFIED" });
  createPortfolioAsset({ tenantId: OTHER, name: "Tenant B Asset", assetType: "SAAS", sourceWedge: "AWS", sourceId: "b1", status: "ACTIVE", recommendationIds: [], governedActionIds: [], outcomeIds: [], protectedOutcomeIds: [], evidenceIds: [], certificationStatus: "NOT_CERTIFIED" });
  const tenantAssets = listPortfolioAssets(TENANT);
  assert.equal(tenantAssets.every((a) => a.tenantId === TENANT), true);
  assert.equal(tenantAssets.some((a) => a.tenantId === OTHER), false);
  assert.equal(listPortfolioAssets(OTHER).every((a) => a.tenantId === OTHER), true);
});

test("4. M365 assets ingest", async () => {
  setup();
  const assets = await ingestM365PortfolioAssets(TENANT);
  assert.ok(assets.length > 0);
  assert.ok(assets.every((a) => a.sourceWedge === "M365"));
  assert.ok(assets.every((a) => a.tenantId === TENANT));
});

test("5. AI assets ingest", async () => {
  setup();
  const assets = await ingestAIPortfolioAssets(TENANT);
  assert.ok(assets.length > 0);
  assert.ok(assets.every((a) => a.sourceWedge === "AI"));
});

test("6. ServiceNow assets ingest", async () => {
  setup();
  const assets = await ingestServiceNowPortfolioAssets(TENANT);
  assert.ok(assets.length > 0);
  assert.ok(assets.every((a) => a.sourceWedge === "SERVICENOW"));
});

test("7. AWS assets ingest", async () => {
  setup();
  const assets = await ingestAwsPortfolioAssets(TENANT);
  assert.ok(assets.length > 0);
  assert.ok(assets.every((a) => a.sourceWedge === "AWS"));
});

test("8. Azure assets ingest", async () => {
  setup();
  const assets = await ingestAzurePortfolioAssets(TENANT);
  assert.ok(assets.length > 0);
  assert.ok(assets.every((a) => a.sourceWedge === "AZURE"));
});

test("9. Snowflake assets ingest", async () => {
  setup();
  const assets = await ingestSnowflakePortfolioAssets(TENANT);
  assert.ok(assets.length > 0);
  assert.ok(assets.every((a) => a.sourceWedge === "SNOWFLAKE"));
});

test("10. Databricks assets ingest", async () => {
  setup();
  const assets = await ingestDatabricksPortfolioAssets(TENANT);
  assert.ok(assets.length > 0);
  assert.ok(assets.every((a) => a.sourceWedge === "DATABRICKS"));
});

test("11. ITAM assets ingest", async () => {
  setup();
  const assets = await ingestItamPortfolioAssets(TENANT);
  assert.ok(assets.length > 0);
  assert.ok(assets.every((a) => a.sourceWedge === "ITAM"));
});

test("12. Sync produces assets across all eight certified wedge domains", async () => {
  setup();
  const synced = await syncTechnologyPortfolioAuthority(TENANT);
  assert.ok(synced.length >= 8);
  const wedges: Array<"M365" | "AI" | "SERVICENOW" | "AWS" | "AZURE" | "SNOWFLAKE" | "DATABRICKS" | "ITAM"> =
    ["M365", "AI", "SERVICENOW", "AWS", "AZURE", "SNOWFLAKE", "DATABRICKS", "ITAM"];
  for (const w of wedges) {
    assert.ok(synced.some((a) => a.sourceWedge === w), `Missing wedge domain: ${w}`);
  }
});

test("13. Relationship linking works for recommendations, actions, outcomes, protected outcomes, evidence", () => {
  setup();
  const asset = createPortfolioAsset({ tenantId: TENANT, name: "Linked Asset", assetType: "APPLICATION", sourceWedge: "AWS", sourceId: "link-001", status: "ACTIVE", recommendationIds: [], governedActionIds: [], outcomeIds: [], protectedOutcomeIds: [], evidenceIds: [], certificationStatus: "CERTIFIED" });

  linkPortfolioAssetToRecommendation(TENANT, asset.id, "rec-1");
  linkPortfolioAssetToGovernedAction(TENANT, asset.id, "action-1");
  linkPortfolioAssetToOutcome(TENANT, asset.id, "outcome-1");
  linkPortfolioAssetToProtectedOutcome(TENANT, asset.id, "prot-1");
  linkPortfolioAssetToEvidence(TENANT, asset.id, "evidence-1");

  const updated = getPortfolioAsset(TENANT, asset.id)!;
  assert.ok(updated.recommendationIds.includes("rec-1"));
  assert.ok(updated.governedActionIds.includes("action-1"));
  assert.ok(updated.outcomeIds.includes("outcome-1"));
  assert.ok(updated.protectedOutcomeIds.includes("prot-1"));
  assert.ok(updated.evidenceIds.includes("evidence-1"));

  // Idempotent — no duplicates
  linkPortfolioAssetToRecommendation(TENANT, asset.id, "rec-1");
  const again = getPortfolioAsset(TENANT, asset.id)!;
  assert.equal(again.recommendationIds.filter((id) => id === "rec-1").length, 1);
});

test("14. Health summary calculates cost, value, and protected value", async () => {
  setup();
  await syncTechnologyPortfolioAuthority(TENANT);
  const health = await getTechnologyPortfolioHealth(TENANT);
  assert.ok(health.totalAnnualCost > 0, "totalAnnualCost should be positive");
  assert.ok(health.totalAnnualValue > 0, "totalAnnualValue should be positive");
  assert.ok(health.protectedAnnualValue > 0, "protectedAnnualValue should be positive");
  assert.ok(health.totalAssets > 0);
  assert.equal(health.tenantId, TENANT);
});

test("15. Coverage percentages calculate deterministically", async () => {
  setup();
  const a1 = createPortfolioAsset({ tenantId: TENANT, name: "A1", assetType: "APPLICATION", sourceWedge: "M365", sourceId: "cov-1", status: "ACTIVE", ownerName: "Alice", costCentre: "CC-001", utilisationScore: 80, annualCost: 10000, recommendationIds: [], governedActionIds: [], outcomeIds: [], protectedOutcomeIds: [], evidenceIds: [], certificationStatus: "CERTIFIED" });
  const a2 = createPortfolioAsset({ tenantId: TENANT, name: "A2", assetType: "SAAS", sourceWedge: "AWS", sourceId: "cov-2", status: "ACTIVE", annualCost: 5000, recommendationIds: [], governedActionIds: [], outcomeIds: [], protectedOutcomeIds: [], evidenceIds: [], certificationStatus: "NOT_CERTIFIED" });

  const health = await getTechnologyPortfolioHealth(TENANT);
  // 1 of 2 has owner → 50%
  assert.equal(health.ownerCoveragePercent, 50);
  // 1 of 2 has costCentre → 50%
  assert.equal(health.costCentreCoveragePercent, 50);
  // 1 of 2 has utilisationScore → 50%
  assert.equal(health.utilisationCoveragePercent, 50);
  // 1 of 2 certified → 50%
  assert.equal(health.certificationCoveragePercent, 50);
});

test("16. Missing owner creates governance blocker", async () => {
  setup();
  createPortfolioAsset({ tenantId: TENANT, name: "No Owner Asset", assetType: "APPLICATION", sourceWedge: "AWS", sourceId: "no-owner-1", status: "ACTIVE", annualCost: 50000, recommendationIds: [], governedActionIds: [], outcomeIds: [], protectedOutcomeIds: [], evidenceIds: [], certificationStatus: "NOT_CERTIFIED" });
  const health = await getTechnologyPortfolioHealth(TENANT);
  assert.ok(health.blockers.some((b) => b.includes("missing owner")), "Expected missing owner blocker");
});

test("17. Renewal within 90 days creates renewal risk", async () => {
  setup();
  createPortfolioAsset({ tenantId: TENANT, name: "Renewal Asset", assetType: "CONTRACT", sourceWedge: "ITAM", sourceId: "renewal-1", status: "ACTIVE", annualCost: 100000, renewalDate: new Date(Date.now() + 45 * 86400000).toISOString().split("T")[0], ownerName: "Finance", costCentre: "CC-FIN", recommendationIds: [], governedActionIds: [], outcomeIds: [], protectedOutcomeIds: [], evidenceIds: [], certificationStatus: "CERTIFIED" });
  createPortfolioRenewal({ tenantId: TENANT, contractId: "manual-contract", renewalDate: new Date(Date.now() + 45 * 86400000).toISOString().split("T")[0], daysUntilRenewal: 45, renewalRisk: "HIGH", linkedRecommendationIds: [], linkedActionIds: [] });
  const health = await getTechnologyPortfolioHealth(TENANT);
  assert.ok(health.renewalRiskAssets >= 1, "Expected at least one renewal risk asset");
  assert.ok(health.blockers.some((b) => b.includes("renewal")), "Expected renewal blocker");
});

test("18. Drifted protected outcome creates portfolio risk", async () => {
  setup();
  createPortfolioAsset({ tenantId: TENANT, name: "Drifted Asset", assetType: "AWS_RESOURCE", sourceWedge: "AWS", sourceId: "drifted-1", status: "DRIFTED", annualCost: 60000, protectedAnnualValue: 20000, ownerName: "Cloud Ops", costCentre: "CC-INFRA", recommendationIds: [], governedActionIds: [], outcomeIds: [], protectedOutcomeIds: ["prot-drifted-1"], evidenceIds: [], certificationStatus: "PARTIAL" });
  const health = await getTechnologyPortfolioHealth(TENANT);
  assert.ok(health.driftedAssets >= 1, "Expected at least one drifted asset");
  assert.ok(health.highRiskAssets >= 1, "Drifted asset should count as high risk");
});

test("19. Certified Wedge Registry includes Technology Portfolio Authority platform authority entry", async () => {
  setup();
  await syncTechnologyPortfolioAuthority(TENANT);
  const status = await getTechnologyPortfolioAuthorityStatus(TENANT);
  assert.equal(status.authorityId, "technology-portfolio-authority");
  assert.equal(status.name, "Technology Portfolio Authority");
  assert.equal(status.type, "PLATFORM_AUTHORITY");
  assert.ok(["CERTIFIED", "PARTIAL", "NOT_CERTIFIED"].includes(status.status));
  assert.ok(typeof status.certificationRequirements.portfolioAssetsSynced === "boolean");
  assert.ok(typeof status.certificationRequirements.allCertifiedWedgesRepresented === "boolean");
  assert.ok(typeof status.certificationRequirements.healthSummaryAvailable === "boolean");
  assert.ok(typeof status.certificationRequirements.ownerCoverageCalculated === "boolean");
  assert.ok(typeof status.certificationRequirements.costCoverageCalculated === "boolean");
  assert.ok(typeof status.certificationRequirements.uiAvailable === "boolean");
  assert.ok(Array.isArray(status.blockers));
  assert.equal(status.certificationRequirements.uiAvailable, true);
});

test("20. No LeftShield labels", () => {
  const root = path.resolve(process.cwd(), "src");
  const content = fs.readFileSync(path.join(root, "lib/technology-portfolio/technology-portfolio-authority.ts"), "utf8");
  assert.equal(content.includes("LeftShield"), false);
});

test("21. No Agent Security Analytics labels", () => {
  const root = path.resolve(process.cwd(), "src");
  const content = fs.readFileSync(path.join(root, "lib/technology-portfolio/technology-portfolio-authority.ts"), "utf8");
  assert.equal(content.includes("Agent Security Analytics"), false);
});
