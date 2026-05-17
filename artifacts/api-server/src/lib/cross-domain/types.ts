export type DomainKey = 'M365'|'ADOBE'|'ATLASSIAN';
export type Severity = 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL';

export type CrossDomainIdentityRecord = {
  tenantId:string; entityId:string; canonicalUserKey:string; domain:DomainKey;
  inactive?:boolean; disabled?:boolean; licensed?:boolean; active?:boolean; contractor?:boolean; admin?:boolean; duplicateIdentity?:boolean; unknownOwner?:boolean; highCostLicense?:boolean;
};
