export const entraFixtures = [
 { id: "user-1", kind: "user", payload: { id: "user-1", userPrincipalName: "alex@example.com", displayName: "Alex Owner", department: "IT" } },
 { id: "manager-1", kind: "managerRelation", payload: { userId: "user-1", managerId: "manager-1" } },
 { id: "dept-1", kind: "department", payload: { id: "dept-1", name: "IT" } }
];
