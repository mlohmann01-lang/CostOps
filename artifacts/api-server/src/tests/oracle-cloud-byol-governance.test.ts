import test from "node:test";
import assert from "node:assert/strict";
import { oracle_cloud_byol_governance } from "../lib/oracle-java-governance-pack/oracle-cloud-byol-governance";
import { normalizeOracleJavaSignal } from "../lib/oracle-java-governance-pack/oracle-java-signal-normalizer";
test("oracle-cloud-byol-governance.test.ts",()=>{const r=oracle_cloud_byol_governance(normalizeOracleJavaSignal({})); assert.equal(r.reviewOnly,true);});
