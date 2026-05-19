import test from "node:test";
import assert from "node:assert/strict";
import { oracle_vmware_cluster_exposure } from "../lib/oracle-java-governance-pack/oracle-vmware-cluster-exposure";
import { normalizeOracleJavaSignal } from "../lib/oracle-java-governance-pack/oracle-java-signal-normalizer";
test("oracle-vmware-cluster-exposure.test.ts",()=>{const r=oracle_vmware_cluster_exposure(normalizeOracleJavaSignal({})); assert.equal(r.reviewOnly,true);});
