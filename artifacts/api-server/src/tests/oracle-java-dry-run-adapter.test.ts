import test from "node:test";
import assert from "node:assert/strict";
import { oracleJavaDryRun } from "../lib/oracle-java-governance-pack/oracle-java-dry-run-adapter";
test("dry run",()=>{assert.equal(oracleJavaDryRun().dryRun,true);});
