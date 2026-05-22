import { Switch, Route, Router as WouterRouter, Redirect } from 'wouter'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ConnectorHub from './pages/ConnectorHub'
import CommandView from './pages/CommandView'
import GovernanceView from './pages/GovernanceView'
import ExecutionView from './pages/ExecutionView'
import IntelligenceView from './pages/IntelligenceView'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/connectors" />} />
      <Route path="/connectors" component={ConnectorHub} />
      <Route path="/:domain/command" component={CommandView} />
      <Route path="/:domain/governance" component={GovernanceView} />
      <Route path="/:domain/execution" component={ExecutionView} />
      <Route path="/:domain/intelligence" component={IntelligenceView} />
      <Route component={() => <Redirect to="/connectors" />} />
    </Switch>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  )
}

export default App
