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
