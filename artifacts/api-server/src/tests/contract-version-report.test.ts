import test from "node:test";
import assert from "node:assert/strict";
import { computeContractVersionReport } from "../lib/contract-version-governance"; test("contract report",()=>{assert.equal(computeContractVersionReport({contract:"x",version:"1",canonical:"2"}).proof,"evidence-linked");});
