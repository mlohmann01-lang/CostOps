export const detectCMDBDrift=(input:{labels:string[]})=>({drift:input.labels.some((l)=>l.toLowerCase().includes('cmdb')||l.toLowerCase().includes('topology'))});
