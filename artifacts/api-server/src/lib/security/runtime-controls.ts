const cooldowns=new Map<string,number>();
export function enforceCooldown(key:string,ms=5000){ const now=Date.now(); const last=cooldowns.get(key)??0; if(now-last<ms) throw new Error('COOLDOWN_ACTIVE'); cooldowns.set(key,now); }
export function suspiciousApproval(actor:string,count:number){ return count>20 ? `SUSPICIOUS_APPROVAL:${actor}` : null; }
