import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { visibleNavItems, navGroups, type NavGroup } from "@/lib/navigation/nav-registry";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  const itemsByGroup = navGroups.reduce<Record<NavGroup, typeof visibleNavItems>>(
    (acc, g) => {
      acc[g] = visibleNavItems.filter((i) => i.group === g);
      return acc;
    },
    {} as Record<NavGroup, typeof visibleNavItems>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden dark text-foreground">
      {/* Sidebar */}
      <div className="w-56 border-r border-sidebar-border bg-sidebar flex flex-col shrink-0">

        {/* Logo */}
        <div className="px-4 py-5 flex items-center gap-2.5 border-b border-sidebar-border">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="leading-none">
            <span className="font-semibold text-sm tracking-tight text-foreground">GovOps</span>
            <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-widest">Gov. Platform</p>
          </div>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {navGroups.map((group) => {
            const items = itemsByGroup[group];
            if (!items.length) return null;
            return (
              <div key={group}>
                <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 select-none">
                  {group}
                </p>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
                    return (
                      <Link
                        key={item.label}
                        href={item.path}
                        className={cn(
                          "flex items-center gap-2.5 px-2.5 py-2 rounded text-[13px] font-medium transition-colors",
                          isActive
                            ? "bg-primary/12 text-primary"
                            : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                        )}
                        data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <item.icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer — Data trust + user */}
        <div className="px-3 py-3 border-t border-sidebar-border space-y-2.5">
          <div className="flex items-center gap-2 px-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-[11px] text-muted-foreground">Data trust: <span className="text-foreground font-medium">94%</span></span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[11px] font-semibold shrink-0">
              JD
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-medium leading-none truncate">Jane Doe</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">FinOps Manager</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-7">
          {children}
        </main>
      </div>
    </div>
  );
}
