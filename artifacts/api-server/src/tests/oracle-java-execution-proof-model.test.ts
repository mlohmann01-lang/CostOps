import test from "node:test";
import assert from "node:assert/strict";
import { oracleJavaExecutionProof } from "../lib/oracle-java-governance-pack/oracle-java-execution-proof-model";
test("proof",()=>{assert.equal(oracleJavaExecutionProof("x").reviewOnly,true);});
