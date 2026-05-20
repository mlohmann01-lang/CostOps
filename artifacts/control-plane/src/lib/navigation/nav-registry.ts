import { Activity, CheckSquare, Database, GitMerge, Inbox, LayoutDashboard, ReceiptText, ShieldCheck, Workflow } from "lucide-react";

export type NavItem = {
  label: string;
  path: string;
  icon: any;
  enabled: boolean;
  pageExists: boolean;
  stability: "stable" | "experimental";
};

export const navRegistry: NavItem[] = [
  { label: "Command Dashboard", path: "/", icon: LayoutDashboard, enabled: true, pageExists: true, stability: "stable" },
  { label: "Recommendations", path: "/recommendations", icon: Inbox, enabled: true, pageExists: true, stability: "stable" },
  { label: "Savings Ledger", path: "/outcomes", icon: CheckSquare, enabled: true, pageExists: true, stability: "stable" },
  { label: "Execution Log", path: "/execution", icon: Activity, enabled: true, pageExists: true, stability: "stable" },
  { label: "Data Connectors", path: "/connectors", icon: Database, enabled: true, pageExists: true, stability: "stable" },
  { label: "Tenant Pricing", path: "/pricing", icon: ReceiptText, enabled: true, pageExists: true, stability: "stable" },
  { label: "Reconciliation", path: "/reconciliation", icon: GitMerge, enabled: true, pageExists: true, stability: "stable" },
  { label: "Jobs / Orchestration", path: "/jobs", icon: Workflow, enabled: true, pageExists: true, stability: "stable" },
  { label: "Approvals", path: "/approvals", icon: ShieldCheck, enabled: true, pageExists: true, stability: "stable" },
  { label: "Governance", path: "/governance", icon: ShieldCheck, enabled: true, pageExists: true, stability: "stable" },
  { label: "Pilot Readiness", path: "/pilot-readiness", icon: ShieldCheck, enabled: true, pageExists: true, stability: "stable" },
  { label: "Support Diagnostics", path: "/support-diagnostics", icon: ShieldCheck, enabled: true, pageExists: true, stability: "stable" },
];

export const visibleNavItems = navRegistry.filter((item) => item.enabled && item.pageExists);
