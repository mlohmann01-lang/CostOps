import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Recommendations from "@/pages/recommendations";
import RecommendationDetail from "@/pages/recommendation-detail";
import Outcomes from "@/pages/outcomes";
import Connectors from "@/pages/connectors";
import ExecutionLog from "@/pages/execution-log";
import Pricing from "@/pages/pricing";
import ReconciliationPage from "@/pages/reconciliation";
import JobsPage from "@/pages/jobs";
import ApprovalsPage from "@/pages/approvals";
import GovernancePage from "@/pages/governance";
import OperationalizationPage from "@/pages/operationalization";
import OperatorWorkbenchPage from "@/pages/operator-workbench";
import EvidenceExplorerPage from "@/pages/evidence-explorer";
import ExecutiveDashboardPage from "@/pages/executive-dashboard";
import ConnectorOperationsPage from "@/pages/connector-operations";
import ValueRealizationPage from "@/pages/value-realization";
import OnboardingPage from "@/pages/onboarding";
import PlatformEventsPage from "@/pages/platform-events";
import PlatformObservabilityPage from "@/pages/platform-observability";
import PartnerOperationalizationPage from "@/pages/partner-operationalization";
import OnboardingAccelerationPage from "@/pages/onboarding-acceleration";
import EcosystemReadinessPage from "@/pages/ecosystem-readiness";
import RuntimeTelemetryPage from "@/pages/runtime-telemetry";
import OperationalAnalyticsPage from "@/pages/operational-analytics";
import PlatformObservabilityV2Page from "@/pages/platform-observability-v2";
import EnterpriseGraphPage from "@/pages/enterprise-graph";
import WorkflowCenterPage from "@/pages/workflow-center";
import OperationalIntelligencePage from "@/pages/operational-intelligence";
import ExecutionOrchestrationPage from "@/pages/execution-orchestration";


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10_000,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/recommendations" component={Recommendations} />
      <Route path="/recommendations/:id" component={RecommendationDetail} />
      <Route path="/outcomes" component={Outcomes} />
      <Route path="/connectors" component={Connectors} />
      <Route path="/execution" component={ExecutionLog} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/reconciliation" component={ReconciliationPage} />
      <Route path="/jobs" component={JobsPage} />
      <Route path="/approvals" component={ApprovalsPage} />
      <Route path="/governance" component={GovernancePage} />
      <Route path="/operationalization" component={OperationalizationPage} />
      <Route path="/operator-workbench" component={OperatorWorkbenchPage} />
      <Route path="/evidence" component={EvidenceExplorerPage} />
      <Route path="/executive" component={ExecutiveDashboardPage} />
      <Route path="/connector-operations" component={ConnectorOperationsPage} />
      <Route path="/value-realization" component={ValueRealizationPage} />
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/platform-events" component={PlatformEventsPage} />
      <Route path="/platform-observability" component={PlatformObservabilityPage} />
      <Route path="/partner-operationalization" component={PartnerOperationalizationPage} />
      <Route path="/onboarding-acceleration" component={OnboardingAccelerationPage} />
      <Route path="/ecosystem-readiness" component={EcosystemReadinessPage} />
      <Route path="/runtime-telemetry" component={RuntimeTelemetryPage} />
      <Route path="/operational-analytics" component={OperationalAnalyticsPage} />
      <Route path="/platform-observability-v2" component={PlatformObservabilityV2Page} />
      <Route path="/enterprise-graph" component={EnterpriseGraphPage} />
      <Route path="/workflow-center" component={WorkflowCenterPage} />
      <Route path="/operational-intelligence" component={OperationalIntelligencePage} />
      <Route path="/execution-orchestration" component={ExecutionOrchestrationPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
