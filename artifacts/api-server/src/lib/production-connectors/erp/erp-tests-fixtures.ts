export const erpFixtures = [
 { id: "invoice-1", kind: "invoice", payload: { id: "invoice-1", vendorId: "vendor-1", amount: 1200, currency: "USD" } },
 { id: "po-1", kind: "purchaseOrder", payload: { id: "po-1", vendorId: "vendor-1", amount: 2200, currency: "USD" } },
 { id: "spend-1", kind: "vendorSpend", payload: { id: "spend-1", vendorId: "vendor-1", amount: 3400, currency: "USD" } },
 { id: "cc-1", kind: "costCentre", payload: { id: "cc-1", name: "IT Cost Centre" } }
];
export const erpProfiles = ["SAP", "Oracle ERP", "NetSuite", "Workday Financials", "Microsoft Dynamics", "TechnologyOne", "Generic ERP"];
