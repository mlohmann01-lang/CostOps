import {
  Activity,
  CheckSquare,
  Database,
  GitMerge,
  Inbox,
  LayoutDashboard,
  ReceiptText,
  ShieldCheck,
  Workflow,
  BookOpen,
  Zap,
} from "lucide-react";

export type NavGroup = "OPERATIONS" | "DATA LAYER" | "GOVERNANCE" | "PLATFORM";

export type NavItem = {
  label: string;
  path: string;
  icon: any;
  enabled: boolean;
  pageExists: boolean;
  stability: "stable" | "experimental";
  group: NavGroup;
};

export const navRegistry: NavItem[] = [
  { label: "Command Dashboard", path: "/", icon: LayoutDashboard, enabled: true, pageExists: true, stability: "stable", group: "OPERATIONS" },
  { label: "Recommendations", path: "/recommendations", icon: Inbox, enabled: true, pageExists: true, stability: "stable", group: "OPERATIONS" },
  { label: "Savings Ledger", path: "/outcomes", icon: CheckSquare, enabled: true, pageExists: true, stability: "stable", group: "OPERATIONS" },
  { label: "Execution Log", path: "/execution", icon: Activity, enabled: true, pageExists: true, stability: "stable", group: "OPERATIONS" },
  { label: "Data Connectors", path: "/connectors", icon: Database, enabled: true, pageExists: true, stability: "stable", group: "DATA LAYER" },
  { label: "Tenant Pricing", path: "/pricing", icon: ReceiptText, enabled: true, pageExists: true, stability: "stable", group: "DATA LAYER" },
  { label: "Reconciliation", path: "/reconciliation", icon: GitMerge, enabled: true, pageExists: true, stability: "stable", group: "DATA LAYER" },
  { label: "Approvals", path: "/approvals", icon: ShieldCheck, enabled: true, pageExists: true, stability: "stable", group: "GOVERNANCE" },
  { label: "Governance", path: "/governance", icon: BookOpen, enabled: true, pageExists: true, stability: "stable", group: "GOVERNANCE" },
  { label: "Jobs / Orchestration", path: "/jobs", icon: Workflow, enabled: true, pageExists: true, stability: "stable", group: "PLATFORM" },
  { label: "Pilot Readiness", path: "/pilot-readiness", icon: Zap, enabled: true, pageExists: true, stability: "stable", group: "PLATFORM" },
  { label: "Live Tenant Readiness", path: "/live-tenant-readiness", icon: ShieldCheck, enabled: true, pageExists: true, stability: "stable", group: "PLATFORM" },
  { label: "Support Diagnostics", path: "/support-diagnostics", icon: Activity, enabled: true, pageExists: true, stability: "stable", group: "PLATFORM" },
];

export const visibleNavItems = navRegistry.filter((item) => item.enabled && item.pageExists);

export const navGroups: NavGroup[] = ["OPERATIONS", "DATA LAYER", "GOVERNANCE", "PLATFORM"];
