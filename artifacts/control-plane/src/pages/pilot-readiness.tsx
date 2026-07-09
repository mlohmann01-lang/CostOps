import { Layout } from "@/components/layout";
import { platformStoryRegistry } from "../lib/platformStory";
export default function PilotReadinessPage(){
  return <Layout><div className="space-y-4"><h1 className="text-2xl font-semibold">Pilot Readiness</h1><p>Pilot readiness verifies configuration, evidence, governance, workflow, and telemetry before customer rollout.</p><p className="text-sm text-muted-foreground">{platformStoryRegistry.PROTECTED_GOVERNANCE.question} {platformStoryRegistry.PROTECTED_GOVERNANCE.narrative}</p><ul className="list-disc pl-5"><li>Tenant Setup</li><li>Connector Setup</li><li>Governance Setup</li><li>Workflow Setup</li><li>Telemetry Health</li><li>Security Checks</li><li>Demo/Golden Path Status</li><li>Overall Readiness</li></ul></div></Layout>
}
