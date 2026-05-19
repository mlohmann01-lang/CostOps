export const resolveCompatibilityAlias=(i:{name:string;aliases:Record<string,string>})=>({resolved:i.aliases[i.name]??i.name,deprecated:!!i.aliases[i.name]});
