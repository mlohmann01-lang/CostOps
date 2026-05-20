export const computeExecutionTrust=(i:{calibration:number;replay:number;volatility:number;persistence:number})=>(i.calibration+i.replay+(1-i.volatility)+i.persistence)/4;
