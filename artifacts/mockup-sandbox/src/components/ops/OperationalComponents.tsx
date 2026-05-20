import { type ReactNode, useState } from "react";
import { ChevronDown, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type OperationalState, stateTone } from "@/lib/ops-state";
import { EXECUTION_INTENTS, type ExecutionIntentType } from "@/lib/economic-operations-client";
import { OPERATIONAL_STATE_REGISTRY } from "@/lib/ops-state";

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

export function OperatorActionBar({ state, disabledReasons, onAction }: { state: OperationalState; disabledReasons: Partial<Record<ExecutionIntentType, string>>; onAction: (action: ExecutionIntentType) => void }) {
  const rule = OPERATIONAL_STATE_REGISTRY[state];
  const allowed = new Set(rule.allowedNextActions as ExecutionIntentType[]);
  const blocked = new Set(rule.blockedActions as ExecutionIntentType[]);
  const actions = EXECUTION_INTENTS.filter((action) => allowed.has(action) || blocked.has(action));
  return <div className="rounded-lg border p-3"><p className="mb-2 text-xs text-slate-600">Operator actions</p><div className="flex flex-wrap gap-2">{actions.map((action) => { const disabledReason = disabledReasons[action] ?? (blocked.has(action) ? "Blocked by canonical state policy" : undefined); const disabled = Boolean(disabledReason); return <button key={action} onClick={() => onAction(action)} disabled={disabled} className="rounded border px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50" title={disabledReason}>{action}</button>; })}</div></div>;
}

export function ExecutionConfirmationDrawer({ open, action, onConfirm, onCancel, confirmationPhrase }: { open: boolean; action: ExecutionIntentType | null; onConfirm: () => void; onCancel: () => void; confirmationPhrase: string }) {
  const [typed, setTyped] = useState("");
  if (!open || !action) return null;
  return <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm"><p className="font-medium">Confirm {action}</p><p>Business impact and controls reviewed. Type confirmation phrase to continue.</p><p className="mt-2 rounded bg-white px-2 py-1 font-mono text-xs">{confirmationPhrase}</p><input className="mt-2 w-full rounded border px-2 py-1" value={typed} onChange={(e) => setTyped(e.target.value)} /><div className="mt-3 flex gap-2"><button className="rounded border px-3 py-1" onClick={onCancel}>Cancel</button><button className="rounded border bg-slate-900 px-3 py-1 text-white disabled:opacity-40" disabled={typed !== confirmationPhrase} onClick={onConfirm}>Confirm action</button></div></div>;
}

export function ActionHistoryPanel({ entries }: { entries: Array<{ action: string; actor: string; sourceSurface: string; reason: string; result: string; previousState: string; nextState: string; timestamp: string; proofIds: string[]; ledgerEntryId: string | null; idempotencyKey: string }> }) {
  if (entries.length === 0) return <div className="rounded border p-3 text-sm text-slate-500">No action history yet.</div>;
  return <div className="space-y-2">{entries.map((entry) => <div key={entry.idempotencyKey} className="rounded border p-3 text-xs"><p className="font-medium">{entry.action} · {entry.result}</p><p>{entry.actor} via {entry.sourceSurface} · {entry.timestamp}</p><p>{entry.previousState} → {entry.nextState}</p><p>Reason: {entry.reason}</p><p>Proofs: {entry.proofIds.join(", ") || "none"} · Ledger: {entry.ledgerEntryId ?? "none"}</p><p>Idempotency: {entry.idempotencyKey}</p></div>)}</div>;
}
