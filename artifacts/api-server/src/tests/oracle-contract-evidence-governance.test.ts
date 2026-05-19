import test from "node:test";
import assert from "node:assert/strict";
import { oracle_contract_evidence_governance } from "../lib/oracle-java-governance-pack/oracle-contract-evidence-governance";
import { normalizeOracleJavaSignal } from "../lib/oracle-java-governance-pack/oracle-java-signal-normalizer";
test("oracle-contract-evidence-governance.test.ts",()=>{const r=oracle_contract_evidence_governance(normalizeOracleJavaSignal({})); assert.equal(r.reviewOnly,true);});
