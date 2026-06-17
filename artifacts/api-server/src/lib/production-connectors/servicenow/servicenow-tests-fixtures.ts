export const serviceNowFixtures = [
 { id: "app-1", kind: "businessApp", payload: { id: "app-1", name: "Billing App", ownerId: "user-1" } },
 { id: "owner-1", kind: "owner", payload: { appId: "app-1", ownerId: "user-1", role: "service_owner" } },
 { id: "rel-1", kind: "cmdbRelation", payload: { from: "app-1", to: "svc-1", relationType: "DEPENDS_ON" } }
];
