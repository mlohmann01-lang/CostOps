import test from 'node:test'; import assert from 'node:assert/strict';
import { computeCrossDomainPortfolioGovernance } from '../lib/cross-domain/cross-domain-governance-intelligence';
test('domain governance scores aggregate correctly',()=>{ const r=computeCrossDomainPortfolioGovernance([{tenantId:'t1',domain:'M365',governanceMaturityScore:50,trustRisk:65,workflowRisk:20,driftRisk:20,suppressedOpportunityValue:10,realizedSavings:5,projectedRecoverableSpend:20}]); assert.equal(r[0].portfolioGovernanceSignal,'GOVERNANCE_ATTENTION_REQUIRED');});
