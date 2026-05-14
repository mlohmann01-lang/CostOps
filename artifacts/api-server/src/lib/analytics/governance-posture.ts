export function governancePosture(openExceptions:number, blocked:number){ return openExceptions+blocked>10?'AT_RISK':'STABLE'; }
