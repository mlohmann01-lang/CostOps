export const evaluateElasticityConfidence=(i:{evidenceConfidence:number;propagationDepth:number})=>({governanceConfidence:Math.max(0,Math.min(1,i.evidenceConfidence-(i.propagationDepth*0.05)))});
