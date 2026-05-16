import { TenantProvisioningService } from "../artifacts/api-server/src/lib/tenant-provisioning-service";

const [tenantName, tenantSlug, adminEmail, environment = "pilot"] = process.argv.slice(2);
if (!tenantName || !tenantSlug || !adminEmail) {
  console.error("Usage: pnpm provision:tenant -- <tenantName> <tenantSlug> <adminEmail> [environment]");
  process.exit(1);
}

const svc = new TenantProvisioningService();
svc.provision({ tenantName, tenantSlug, adminEmail, environment, actorId: "operator-cli" })
  .then((x) => console.log(JSON.stringify(x, null, 2)))
  .catch((e) => { console.error(e); process.exit(1); });
