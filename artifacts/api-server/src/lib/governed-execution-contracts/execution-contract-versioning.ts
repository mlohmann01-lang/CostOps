export const evaluateExecutionContractVersioning=(v:string)=>({version:v,valid:/^v?\d+\.\d+\.\d+$/.test(v)});
