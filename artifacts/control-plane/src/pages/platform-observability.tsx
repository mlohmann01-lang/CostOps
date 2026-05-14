import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export default function PlatformObservabilityPage(){ return <Layout><div className='space-y-4'><h1 className='text-2xl font-semibold'>Platform Observability</h1><Card><CardHeader><CardTitle>Operational trends</CardTitle></CardHeader><CardContent><p className='text-sm text-muted-foreground'>Failure trends, connector latency, execution/rollback volume, disputes, drift, onboarding completion.</p></CardContent></Card></div></Layout>; }
