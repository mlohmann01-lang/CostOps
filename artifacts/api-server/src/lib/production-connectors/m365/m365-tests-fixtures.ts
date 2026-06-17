export const m365Fixtures = [
 { id: "user-1", kind: "user", payload: { id: "user-1", userPrincipalName: "alex@example.com", displayName: "Alex Owner", department: "IT" } },
 { id: "sku-1", kind: "sku", payload: { skuId: "sku-1", skuPartNumber: "M365_COPILOT", prepaidUnits: { enabled: 50 }, consumedUnits: 12 } },
 { id: "usage-1", kind: "usage", payload: { userPrincipalName: "alex@example.com", product: "M365", activeDays: 18 } },
 { id: "copilot-1", kind: "copilotUsage", payload: { status: "NOT_AVAILABLE", reason: "tenant/API does not expose Copilot usage endpoint" } }
];
