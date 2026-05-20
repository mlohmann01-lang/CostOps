export const evaluateBenchmarkStaleness=(age:number)=>({stale:age>90,confidencePenalty:age>90?0.2:0});
