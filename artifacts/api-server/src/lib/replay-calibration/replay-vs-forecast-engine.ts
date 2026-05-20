export const compareReplayVsForecast=(i:{forecast:number;actual:number})=>({miss:i.actual-i.forecast,missRate:i.forecast===0?0:(i.actual-i.forecast)/i.forecast});
