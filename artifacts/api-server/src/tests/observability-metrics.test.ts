import test from "node:test"; import assert from "node:assert/strict";
import { correlationId } from "../lib/observability/correlation";

test("correlation id generated", ()=>{ assert.equal(typeof correlationId(),"string"); });
