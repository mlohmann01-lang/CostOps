import { Activity, CheckSquare, Database, Inbox, LayoutDashboard } from "lucide-react";

export type NavItem = {
  label: string;
  path: string;
  icon: any;
};

export const visibleNavItems: NavItem[] = [
  { label: "Command Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Recommendations", path: "/recommendations", icon: Inbox },
  { label: "Savings Ledger", path: "/outcomes", icon: CheckSquare },
  { label: "Execution Log", path: "/execution", icon: Activity },
  { label: "Data Connectors", path: "/connectors", icon: Database },
];
