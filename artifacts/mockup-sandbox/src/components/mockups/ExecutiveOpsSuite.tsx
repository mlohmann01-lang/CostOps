import { ExecutiveOpsRuntime } from "@/components/ops/EconomicOperationsSuite";

export default function ExecutiveOpsSuite() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900 md:p-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Economic Operations Command Center</p>
          <h1 className="text-3xl font-semibold">Verdict First · Proof Expandable</h1>
          <p className="max-w-3xl text-sm text-slate-600">Operator surface for governed savings execution, rollback safety, and verification-backed outcomes.</p>
        </header>
        <ExecutiveOpsRuntime />
      </div>
    </main>
  );
}
