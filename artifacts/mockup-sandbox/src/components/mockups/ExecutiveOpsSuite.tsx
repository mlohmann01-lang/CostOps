import { motion } from "framer-motion";
import { Activity, AlertTriangle, CheckCircle2, Clock3, Link2, Users } from "lucide-react";

import { ProofDrawer, SavingsEvidencePanel, StatusPill, VerdictCard } from "@/components/ops/OperationalComponents";
import { type OperationalState } from "@/lib/ops-state";

const timeline = ["Recommendation", "Trust evaluation", "Simulation", "Approval", "Execution", "Propagation", "Verification", "Outcome proof", "Drift monitoring", "Rollback availability"];

export default function ExecutiveOpsSuite() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900 md:p-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Economic Operations Command Center</p>
          <h1 className="text-3xl font-semibold">Verdict First · Proof Expandable</h1>
          <p className="max-w-3xl text-sm text-slate-600">Operational clarity for governed savings execution, rollback safety, and verification-backed outcomes.</p>
        </header>

        <section className="grid gap-4 lg:grid-cols-3">
          <VerdictCard title="License deprovisioning opportunity" state="APPROVAL_REQUIRED" impact="$118,200 annualized savings" action="Approve staged execution for 410 inactive seats" />
          <VerdictCard title="Execution batch #8022" state="VERIFICATION_PENDING" impact="71% propagated" action="Wait for provider settlement window" />
          <VerdictCard title="HRIS connector trust" state="DRIFT_DETECTED" impact="Policy variance in admin role scope" action="Contain scope and re-verify before next run" />
        </section>

        <section className="grid gap-6 xl:grid-cols-5">
          <div className="space-y-4 xl:col-span-3">
            <h2 className="text-lg font-semibold">Execution Timeline Explorer</h2>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <ol className="space-y-2">
                {timeline.map((step, i) => (
                  <motion.li key={step} initial={{ opacity: 0, y: 2 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} className="flex items-center gap-3 rounded-md border border-slate-100 px-3 py-2 text-sm">
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-slate-100 text-xs">{i + 1}</span>
                    <span className="flex-1">{step}</span>
                    <StatusPill state={i < 7 ? "VERIFIED" : "ROLLBACK_AVAILABLE"} />
                  </motion.li>
                ))}
              </ol>
            </div>
          </div>

          <div className="space-y-4 xl:col-span-2">
            <h2 className="text-lg font-semibold">Operations Health Dashboard</h2>
            <div className="grid gap-3">
              {([
                { Icon: Activity, label: "Connector health", value: "22/24 healthy", state: "BLOCKED" },
                { Icon: Clock3, label: "Approval queue", value: "3 awaiting finance signoff", state: "APPROVAL_REQUIRED" },
                { Icon: AlertTriangle, label: "Rollback blockers", value: "1 deadline inside 6 hours", state: "ROLLBACK_REQUIRED" },
                { Icon: CheckCircle2, label: "Verification", value: "14/15 successful", state: "VERIFIED" },
                { Icon: Users, label: "Tenant posture", value: "2 tenants MANUAL_ONLY", state: "MANUAL_ONLY" },
              ] as const satisfies ReadonlyArray<{ Icon: typeof Activity; label: string; value: string; state: OperationalState }>).map(({ Icon, label, value, state }) => (
                <div className="rounded-lg border border-slate-200 bg-white p-3" key={label}>
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-medium"><Icon className="size-4 text-slate-500" />{label}</div><StatusPill state={state} /></div>
                  <p className="mt-2 text-sm text-slate-700">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Proof Explorer</h2>
            <ProofDrawer title="Savings calculation" summary="Before/after seat utilization and contract rates">410 seats reclaimed × blended rate $24.02/month, net of 3% transition leakage. Confidence locked after invoice reconciliation.</ProofDrawer>
            <ProofDrawer title="Rollback viability" summary="Safety window, blockers, dependency chain">Rollback window: 72 hours. One blocker: IDP group sync freeze at 18:00 UTC. Blast radius limited to non-admin cohorts.</ProofDrawer>
            <ProofDrawer title="Approval rationale" summary="Who approved and under which policy">Approved by FinOps Lead (May 20, 2026) and Security Delegate (May 20, 2026) under policy ECON-42 with exception threshold 0.</ProofDrawer>
          </div>
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Simulation Preview & Rollback Explorer</h2>
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 text-sm">
              <p><span className="font-medium">Before:</span> 1,922 assigned seats, 410 inactive over 90 days.</p>
              <p><span className="font-medium">After:</span> 1,512 assigned seats, staged deprovision in 3 waves.</p>
              <p><span className="font-medium">Propagation:</span> 20 min expected, verification 4 hours after provider settlement.</p>
              <p><span className="font-medium">Risk exposure:</span> Low, blast radius restricted to read-only cohorts.</p>
              <p><span className="font-medium">Rollback plan:</span> Auto-restore from captured assignment snapshot; deadline May 23, 2026.</p>
            </div>
            <SavingsEvidencePanel value="$118,200 / year" proof="Verified from invoice deltas and tenant-level outcome reconciliation." />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <VerdictCard title="Connector Setup UX" state="GOVERNED_EXECUTION_ELIGIBLE" impact="2 steps to readiness" action="Validate permissions then run health probe">
            <p className="text-sm text-slate-700">Readiness: ✅ Scopes mapped · ✅ Audit trail on · ⚠️ One sandbox tenant pending trust baseline.</p>
          </VerdictCard>
          <VerdictCard title="Approval Queue UX" state="APPROVAL_REQUIRED" impact="3 actions awaiting executive signoff" action="Review rationale and approve/reject with policy citation" />
          <VerdictCard title="Tenant Management UI" state="QUARANTINED" impact="Tenant ACME-EU isolated" action="Resolve connector drift before re-enabling autonomous execution" />
        </section>
      </div>
    </main>
  );
}
