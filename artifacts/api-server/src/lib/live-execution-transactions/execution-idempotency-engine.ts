export const evaluateExecutionIdempotency=(i:{id:string;seen:Set<string>})=>({duplicate:i.seen.has(i.id)});
