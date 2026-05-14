export function operationalMaturityScore(input:{blocked:number;ready:number}){ const total=input.blocked+input.ready||1; return Math.round((input.ready/total)*100); }
