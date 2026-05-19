import test from "node:test";
import assert from "node:assert/strict";
import { oracleJavaGovernanceReport } from "../lib/oracle-java-governance-pack/oracle-java-governance-report";
test("report",()=>{assert.equal(oracleJavaGovernanceReport({}).governanceReview,true);});
