import test from "node:test";
import assert from "node:assert/strict";
import { resolveCompatibilityAlias } from "../lib/contract-version-governance"; test("alias resolution",()=>{assert.equal(resolveCompatibilityAlias({name:"old",aliases:{old:"new"}}).resolved,"new");});
