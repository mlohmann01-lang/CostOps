import { useCallback, useEffect, useMemo, useState } from 'react';import { liveFetch, normalizeApiError } from '../lib/liveApi';import { useWorkspace } from '../lib/workspaceContext';import type { TechnologyPortfolioSummary } from '../types/technologyPortfolio';
export const notAvailable='Not available';export const emptyTechnologyPortfolioSummary:TechnologyPortfolioSummary={assets:[],vendors:[],products:[],applications:[],risks:[],recommendations:[],values:[]};
export type TechnologyPortfolioDataState='LIVE'|'DEMO'|'NOT_CONNECTED'|'NO_DATA';
export function demoTechnologyPortfolioSummary():TechnologyPortfolioSummary{return {snapshot:{id:'demo-snapshot',tenantId:'demo',generatedAt:new Date().toISOString(),assetCount:2,vendorCount:2,productCount:2,applicationCount:1,totalAnnualSpend:1250000,totalFinanceVerifiedSavings:96000,totalCommercialExposure:180000,currency:'USD',missingOwnerCount:1,missingCostCentreCount:1,renewalRiskCount:1,unverifiedSavingsCount:1,averageConfidenceScore:86,readiness:'DEMO'},assets:[{id:'a1',name:'Microsoft 365',assetType:'SAAS',vendorId:'Microsoft',ownerUserId:'Jane Owner',costCentreId:'IT',annualSpend:850000,verifiedSavings:96000,completenessScore:92,lifecycleStatus:'ACTIVE',currency:'USD'},{id:'a2',name:'Legacy CRM',assetType:'APPLICATION',vendorId:'LegacyCo',annualSpend:400000,completenessScore:54,lifecycleStatus:'RETIRE_CANDIDATE',currency:'USD'}],vendors:[{id:'v1',name:'Microsoft'}],products:[{id:'p1',name:'M365 E5'}],applications:[{id:'app1',name:'CRM'}],risks:[{id:'r1',targetId:'a2',riskType:'MISSING_OWNER',severity:'HIGH',description:'Missing owner'}],recommendations:[{id:'rec1',targetId:'a2',priority:'HIGH',title:'Assign owner',description:'Reason: missing owner',projectedValue:400000,currency:'USD',status:'OPEN'}],values:[{id:'val1',financeVerifiedValue:96000}]}}
function hasData(summary:TechnologyPortfolioSummary):boolean{return !!summary.snapshot}
export function useTechnologyPortfolio(){
  const {mode,dataReady}=useWorkspace()
  const [summary,setSummary]=useState<TechnologyPortfolioSummary>(mode==='demo'?demoTechnologyPortfolioSummary():emptyTechnologyPortfolioSummary)
  const [loading,setLoading]=useState(mode!=='demo')
  const [dataState,setDataState]=useState<TechnologyPortfolioDataState>(mode==='demo'?'DEMO':'NOT_CONNECTED')
  const [error,setError]=useState<string|undefined>(undefined)

  const refresh=useCallback(async()=>{
    if(mode==='demo'){setSummary(demoTechnologyPortfolioSummary());setDataState('DEMO');setError(undefined);setLoading(false);return}
    if(!dataReady){setSummary(emptyTechnologyPortfolioSummary);setDataState('NOT_CONNECTED');setError(undefined);setLoading(false);return}
    setLoading(true)
    try{
      const data=await liveFetch<any>('/api/technology-portfolio/summary')
      const next:TechnologyPortfolioSummary=data?.snapshot?data:emptyTechnologyPortfolioSummary
      setSummary(next)
      setDataState(hasData(next)?'LIVE':'NO_DATA')
      setError(undefined)
    }catch(err){
      setSummary(emptyTechnologyPortfolioSummary)
      setDataState('NO_DATA')
      setError(normalizeApiError(err).message)
    }finally{
      setLoading(false)
    }
  },[mode,dataReady])

  useEffect(()=>{let cancel=false;(async()=>{await refresh();if(cancel)return})();return()=>{cancel=true}},[refresh])

  return useMemo(()=>({summary,loading,isDemo:mode==='demo',dataState,error,refresh}),[summary,loading,mode,dataState,error,refresh])
}
