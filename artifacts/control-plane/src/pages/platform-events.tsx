import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export default function PlatformEventsPage(){ const [rows,setRows]=useState<any[]>([]); useEffect(()=>{ fetch('/api/platform-events?tenantId=default').then(r=>r.json()).then(setRows); },[]); return <Layout><div className='space-y-4'><h1 className='text-2xl font-semibold'>Platform Events</h1><Card><CardHeader><CardTitle>Events</CardTitle></CardHeader><CardContent><pre className='text-xs'>{JSON.stringify(rows,null,2)}</pre></CardContent></Card></div></Layout>; }
