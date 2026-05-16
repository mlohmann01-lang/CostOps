import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ConnectorsM365() {
  const [status, setStatus] = useState<any>(null);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  const load = async () => {
    setStatus(await (await fetch("/api/connectors/m365/status")).json());
    setEvidence(await (await fetch("/api/connectors/m365/evidence")).json());
  };
  useEffect(() => { void load(); }, []);

  return <Layout><div className="space-y-4"><h1 className="text-2xl font-semibold">M365 Connector</h1>
    <Badge>Read-only connector mode. No licence changes or user changes can be made from this connector.</Badge>
    <pre className="text-xs">{JSON.stringify(status, null, 2)}</pre>
    <div className="flex gap-2"><Button onClick={async()=>{setSummary(await (await fetch('/api/connectors/m365/sync/read-only',{method:'POST'})).json()); await load();}}>Run Read-only Sync</Button>
    <Button variant="outline" onClick={async()=>setSummary(await (await fetch('/api/connectors/m365/evaluate-playbooks',{method:'POST'})).json())}>Evaluate Playbooks</Button></div>
    <pre className="text-xs">{JSON.stringify(summary, null, 2)}</pre>
    <h2 className="text-lg">Evidence Records</h2><pre className="text-xs">{JSON.stringify(evidence.slice(0,20), null, 2)}</pre>
  </div></Layout>;
}
