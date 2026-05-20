import { type ReactNode, useState } from "react";
import { ChevronDown, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type OperationalState, stateTone } from "@/lib/ops-state";

export function StatusPill({ state }: { state: OperationalState }) {
  return <Badge className={cn("border font-medium", stateTone[state])}>{state}</Badge>;
}

export function VerdictCard({ title, state, impact, action, children }: { title: string; state: OperationalState; impact: string; action: string; children?: ReactNode }) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base text-slate-900">{title}</CardTitle>
          <StatusPill state={state} />
        </div>
        <div className="text-sm text-slate-600">Impact: <span className="font-medium text-slate-800">{impact}</span></div>
        <div className="text-sm text-slate-600">Recommended action: <span className="font-medium text-slate-800">{action}</span></div>
      </CardHeader>
      {children ? <CardContent>{children}</CardContent> : null}
    </Card>
  );
}

export function ProofDrawer({ title, summary, children }: { title: string; summary: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between px-4 py-3 text-left" aria-expanded={open}>
        <div>
          <p className="text-sm font-medium text-slate-900">{title}</p>
          <p className="text-xs text-slate-500">{summary}</p>
        </div>
        <ChevronDown className={cn("size-4 text-slate-500 transition-transform", open && "rotate-180")} />
      </button>
      {open ? <div className="border-t border-slate-100 px-4 py-3 text-sm text-slate-700">{children}</div> : null}
    </div>
  );
}

export function SavingsEvidencePanel({ value, proof }: { value: string; proof: string }) {
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex items-center gap-2 text-emerald-800"><ShieldCheck className="size-4" /> Verified savings</div>
      <div className="mt-2 text-2xl font-semibold text-emerald-900">{value}</div>
      <p className="mt-1 text-sm text-emerald-800">{proof}</p>
    </div>
  );
}
