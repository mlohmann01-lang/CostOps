import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Activity, LayoutDashboard, Database, CheckSquare, Inbox, ShieldCheck, ReceiptText, GitMerge, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  const navigation = [
    { name: "Command Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Recommendations", href: "/recommendations", icon: Inbox },
    { name: "Savings Ledger", href: "/outcomes", icon: CheckSquare },
    { name: "Execution Log", href: "/execution", icon: Activity },
    { name: "Data Connectors", href: "/connectors", icon: Database },
    { name: "Tenant Pricing", href: "/pricing", icon: ReceiptText },
    { name: "Reconciliation", href: "/reconciliation", icon: GitMerge },
    { name: "Jobs / Orchestration", href: "/jobs", icon: Workflow },
    { name: "Approvals", href: "/approvals", icon: ShieldCheck },
    { name: "Governance", href: "/governance", icon: ShieldCheck },
    { name: "Operationalization", href: "/operationalization", icon: ShieldCheck },
    { name: "Operator Workbench", href: "/operator-workbench", icon: ShieldCheck },
    { name: "Evidence Explorer", href: "/evidence", icon: ShieldCheck },
    { name: "Executive View", href: "/executive", icon: ShieldCheck },
    { name: "Connector Operations", href: "/connector-operations", icon: ShieldCheck },
    { name: "Value Realization", href: "/value-realization", icon: ShieldCheck },
    { name: "Onboarding", href: "/onboarding", icon: ShieldCheck },
    { name: "Platform Events", href: "/platform-events", icon: ShieldCheck },
    { name: "Runtime Telemetry", href: "/runtime-telemetry", icon: ShieldCheck },
    { name: "Platform Observability", href: "/platform-observability", icon: ShieldCheck },
    { name: "Partner Operationalization", href: "/partner-operationalization", icon: ShieldCheck },
    { name: "Onboarding Acceleration", href: "/onboarding-acceleration", icon: ShieldCheck },
    { name: "Ecosystem Readiness", href: "/ecosystem-readiness", icon: ShieldCheck },
    { name: "Operational Analytics", href: "/operational-analytics", icon: ShieldCheck },
    { name: "Operational Intelligence", href: "/operational-intelligence", icon: ShieldCheck },
    { name: "Observability V2", href: "/platform-observability-v2", icon: ShieldCheck },
    { name: "Enterprise Graph", href: "/enterprise-graph", icon: ShieldCheck },
    { name: "Operational Entity Graph", href: "/operational-entity-graph", icon: ShieldCheck },
    { name: "Workflow Center", href: "/workflow-center", icon: ShieldCheck },
    { name: "Execution Orchestration", href: "/execution-orchestration", icon: ShieldCheck },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden dark text-foreground">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg tracking-tight">GovOps</span>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-2">
          {navigation.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
                data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border mt-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-medium">
              JD
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium leading-none">Jane Doe</span>
              <span className="text-xs text-muted-foreground mt-1">FinOps Manager</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
