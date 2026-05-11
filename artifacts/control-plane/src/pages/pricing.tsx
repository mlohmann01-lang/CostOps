import * as React from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

const sampleJson = `[
  {
    "skuId": "ENTERPRISEPREMIUM",
    "skuPartNumber": "SPE_E5",
    "productName": "Microsoft 365 E5",
    "effectiveMonthlyCost": 48.25,
    "effectiveAnnualCost": 579,
    "contractStart": "2026-01-01",
    "contractEnd": "2026-12-31",
    "derivedFrom": "contract-upload"
  }
]`;

type PricingEvidenceEvent = {
  id: number;
  skuId: string;
  action: string;
  pricingConfidence: string;
  pricingSource: string;
  reason: string;
  createdAt: string;
};

type TenantPricingRow = {
  id: number;
  tenantId: string;
  skuId: string;
  pricingSource: string;
  pricingConfidence: string;
  evidenceSource: string;
  effectiveMonthlyCost: number;
  effectiveAnnualCost: number;
  currency: string;
  contractStart?: string;
  contractEnd?: string;
  lastValidated: string;
};

export default function Pricing() {
  const { toast } = useToast();
  const [tenantId, setTenantId] = React.useState("contoso");
  const [source, setSource] = React.useState("CONTRACT_IMPORT");
  const [currency, setCurrency] = React.useState("AUD");
  const [jsonRows, setJsonRows] = React.useState(sampleJson);
  const [force, setForce] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [rowsLoading, setRowsLoading] = React.useState(false);
  const [summary, setSummary] = React.useState<any | null>(null);
  const [rows, setRows] = React.useState<TenantPricingRow[]>([]);
  const [events, setEvents] = React.useState<PricingEvidenceEvent[]>([]);

  const fetchRows = React.useCallback(async () => {
    setRowsLoading(true);
    try {
      const res = await fetch(`/api/pricing/tenant/${tenantId}`);
      if (!res.ok) throw new Error("Failed to load tenant pricing rows");
      const data = await res.json();
      setRows(data);

      const eventsRes = await fetch(`/api/pricing/tenant/events?tenantId=${tenantId}`);
      if (eventsRes.ok) {
        const eventData = await eventsRes.json();
        setEvents(eventData);
      }
    } catch (error: any) {
      toast({ title: error.message ?? "Failed loading tenant pricing", variant: "destructive" });
    } finally {
      setRowsLoading(false);
    }
  }, [tenantId, toast]);

  React.useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const onImport = async () => {
    let parsedRows: unknown;
    try {
      parsedRows = JSON.parse(jsonRows);
      if (!Array.isArray(parsedRows)) throw new Error("Rows JSON must be an array");
    } catch (error: any) {
      toast({ title: error.message ?? "Invalid JSON", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/pricing/tenant/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, source, currency, rows: parsedRows, force }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Import failed");
      setSummary(data);
      toast({ title: `Imported ${data.imported} row(s), skipped ${data.skipped}` });
      fetchRows();
    } catch (error: any) {
      toast({ title: error.message ?? "Import failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pricing Evidence</h1>
          <p className="text-sm text-muted-foreground mt-1">Manual import is the first evidence path. Future connectors can ingest contracts, invoices, CSP billing, or Flexera entitlement data automatically.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pricing Evidence Intake (V1 JSON)</CardTitle>
            <CardDescription>
              Contract import = highest confidence. Invoice import = high confidence. CSP import = high confidence. Public list price remains fallback only.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tenantId">Tenant ID</Label>
                <Input id="tenantId" value={tenantId} onChange={(e) => setTenantId(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <select id="source" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={source} onChange={(e) => setSource(e.target.value)}>
                  <option value="CONTRACT_IMPORT">CONTRACT_IMPORT</option>
                  <option value="INVOICE_IMPORT">INVOICE_IMPORT</option>
                  <option value="CSP_IMPORT">CSP_IMPORT</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rows">Rows JSON</Label>
              <Textarea id="rows" className="min-h-[220px] font-mono text-xs" value={jsonRows} onChange={(e) => setJsonRows(e.target.value)} />
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={force} onCheckedChange={setForce} id="force" />
              <Label htmlFor="force">Force overwrite lower-confidence guard</Label>
            </div>

            <div className="flex gap-2">
              <Button onClick={onImport} disabled={loading}>{loading ? "Importing..." : "Import Evidence"}</Button>
              <Button variant="outline" onClick={fetchRows} disabled={rowsLoading}>{rowsLoading ? "Refreshing..." : "Refresh Rows"}</Button>
            </div>

            {summary && (
              <div className="rounded-md border p-3 text-sm space-y-1" data-testid="tenant-pricing-summary">
                <div><strong>Imported:</strong> {summary.imported}</div>
                <div><strong>Skipped:</strong> {summary.skipped}</div>
                <div><strong>Errors:</strong> {summary.errors?.length ?? 0}</div>
                {(summary.errors?.length ?? 0) > 0 && (
                  <ul className="list-disc ml-5 text-muted-foreground">
                    {summary.errors.map((err: any) => <li key={`${err.index}-${err.message}`}>Row {err.index}: {err.message}</li>)}
                  </ul>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Existing Pricing Evidence Rows</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Evidence Source</TableHead>
                  <TableHead>Monthly</TableHead>
                  <TableHead>Annual</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Last Validated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.skuId}</TableCell>
                    <TableCell>{row.pricingSource}</TableCell>
                    <TableCell>{row.pricingConfidence}</TableCell>
                    <TableCell>{row.evidenceSource}</TableCell>
                    <TableCell>{row.effectiveMonthlyCost}</TableCell>
                    <TableCell>{row.effectiveAnnualCost}</TableCell>
                    <TableCell>{row.currency}</TableCell>
                    <TableCell>{new Date(row.lastValidated).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {!rowsLoading && rows.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-muted-foreground">No tenant pricing rows found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing Evidence Event History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>{event.skuId}</TableCell>
                    <TableCell>{event.action}</TableCell>
                    <TableCell>{event.pricingConfidence}</TableCell>
                    <TableCell>{event.pricingSource}</TableCell>
                    <TableCell>{event.reason}</TableCell>
                    <TableCell>{new Date(event.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {!rowsLoading && events.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-muted-foreground">No evidence events found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
