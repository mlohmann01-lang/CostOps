import test from "node:test"; import assert from "node:assert/strict"; import { classifyAISpend } from "../lib/ai-economics/ai-spend-classification";
test("spend class",()=>{ const c=classifyAISpend({tenantId:"t",userId:"u",toolId:"x",model:"m",mode:"API",timestamp:new Date().toISOString(),tokens:120000,estimatedCost:1,operationType:"GEN",productivitySignal:0}); assert.equal(c,"HIGH_RISK");});
