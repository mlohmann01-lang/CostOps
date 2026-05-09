export type PermissionReadinessResult = {
  ready: boolean;
  status: "READY" | "DEGRADED" | "BLOCKED";
  missingRequired: string[];
  missingOptional: string[];
  warnings: string[];
  evidence: Record<string, unknown>;
};

const minimumRead = ["User.Read.All", "Directory.Read.All"];
const licenceRead = ["Organization.Read.All", "Directory.Read.All"];
const activityReadAny = ["AuditLog.Read.All", "Reports.Read.All"];
const writeFutureAny = ["Directory.ReadWrite.All", "User.ReadWrite.All"];

function parseGrantedPermissions(): string[] {
  const raw = process.env.M365_GRAPH_GRANTED_PERMISSIONS ?? "";
  return raw.split(/[\s,]+/).map((x) => x.trim()).filter(Boolean);
}

export async function checkM365PermissionReadiness(): Promise<PermissionReadinessResult> {
  const tenantId = process.env.M365_TENANT_ID;
  const clientId = process.env.M365_CLIENT_ID;
  const clientSecret = process.env.M365_CLIENT_SECRET;
  if (!tenantId || !clientId || !clientSecret) {
    return {
      ready: false,
      status: "BLOCKED",
      missingRequired: ["M365_TENANT_ID", "M365_CLIENT_ID", "M365_CLIENT_SECRET"].filter((k) => !process.env[k]),
      missingOptional: [],
      warnings: ["Missing required M365 environment variables"],
      evidence: { mode: process.env.M365_MODE ?? "MOCK_CONNECTOR" },
    };
  }

  const granted = parseGrantedPermissions();
  const missingMin = minimumRead.filter((p) => !granted.includes(p));
  const missingLicence = licenceRead.filter((p) => !granted.includes(p));
  const hasActivity = activityReadAny.some((p) => granted.includes(p));
  const hasWriteFuture = writeFutureAny.some((p) => granted.includes(p));

  const missingRequired = Array.from(new Set([...missingMin, ...missingLicence]));
  const missingOptional = [] as string[];
  const warnings: string[] = [];

  let status: PermissionReadinessResult["status"] = "READY";
  if (missingRequired.length > 0) {
    status = "BLOCKED";
  } else if (!hasActivity) {
    status = "DEGRADED";
    missingOptional.push("AuditLog.Read.All OR Reports.Read.All");
    warnings.push("Missing activity-read permission; usage data may be unavailable");
  }

  if (!hasWriteFuture) {
    warnings.push("Missing future write permission (Directory.ReadWrite.All or User.ReadWrite.All); MVP execution simulation unaffected");
  }

  return {
    ready: status === "READY",
    status,
    missingRequired,
    missingOptional,
    warnings,
    evidence: {
      grantedPermissions: granted,
      requiredGroups: {
        MINIMUM_READ: minimumRead,
        LICENCE_READ: licenceRead,
        ACTIVITY_READ_ANY: activityReadAny,
        WRITE_EXECUTION_FUTURE_ANY: writeFutureAny,
      },
      hasActivityPermission: hasActivity,
      hasWriteFuturePermission: hasWriteFuture,
    },
  };
}
