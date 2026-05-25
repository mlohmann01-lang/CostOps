export interface ActionAuditEvent { action: string; outcome: string; synthetic?: boolean; context?: Record<string, unknown> }
export function recordActionAudit(_event: ActionAuditEvent) {
  // wired placeholder to route into backend audit endpoint when available
}
