export type OperationalEventType =
  | 'RECOMMENDATION_CREATED'
  | 'APPROVAL_REQUIRED'
  | 'EXECUTION_READY'
  | 'EXECUTION_BLOCKED'
  | 'EXECUTION_SUBMITTED'
  | 'VERIFICATION_SUCCEEDED'
  | 'VERIFICATION_FAILED'
  | 'DRIFT_DETECTED'
  | 'ROLLBACK_READY'
  | 'ROLLBACK_REQUIRED'
  | 'CONNECTOR_DEGRADED'
  | 'SYNC_FAILED'
  | 'READINESS_BLOCKED';

export type AlertCategory =
  | 'ACTION_REQUIRED'
  | 'APPROVAL_REQUIRED'
  | 'EXECUTION_BLOCKED'
  | 'VERIFICATION_FAILED'
  | 'DRIFT_DETECTED'
  | 'ROLLBACK_REQUIRED'
  | 'CONNECTOR_HEALTH'
  | 'SYNC_FAILURE'
  | 'READINESS_GAP';

export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type OperationalEvent = {
  id: string;
  tenantId: string;
  eventType: OperationalEventType;
  severity: AlertSeverity;
  source: string;
  resourceType?: string;
  resourceId?: string;
  dedupeKey?: string;
  payload: Record<string, unknown>;
  createdAt: Date;
  dispatchedAt?: Date;
  status: 'PENDING' | 'DISPATCHED' | 'FAILED';
};

export type OperatorAlert = {
  id: string;
  tenantId: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  message: string;
  resourceType?: string;
  resourceId?: string;
  recommendedAction?: string;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
  createdAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  metadata: Record<string, unknown>;
};

export type EmitEventInput = {
  tenantId: string;
  eventType: OperationalEventType;
  severity?: AlertSeverity;
  source: string;
  resourceType?: string;
  resourceId?: string;
  payload?: Record<string, unknown>;
  dedupeKey?: string;
};

export type CreateAlertInput = {
  tenantId: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  message: string;
  resourceType?: string;
  resourceId?: string;
  recommendedAction?: string;
  metadata?: Record<string, unknown>;
};

const EVENT_TO_ALERT_CATEGORY: Partial<Record<OperationalEventType, AlertCategory>> = {
  APPROVAL_REQUIRED: 'APPROVAL_REQUIRED',
  EXECUTION_BLOCKED: 'EXECUTION_BLOCKED',
  VERIFICATION_FAILED: 'VERIFICATION_FAILED',
  DRIFT_DETECTED: 'DRIFT_DETECTED',
  ROLLBACK_REQUIRED: 'ROLLBACK_REQUIRED',
  CONNECTOR_DEGRADED: 'CONNECTOR_HEALTH',
  SYNC_FAILED: 'SYNC_FAILURE',
  READINESS_BLOCKED: 'READINESS_GAP',
};

export class OperationalEventsService {
  private events: OperationalEvent[] = [];
  private alerts: OperatorAlert[] = [];
  private eventCounter = 0;
  private alertCounter = 0;

  emitEvent(input: EmitEventInput): OperationalEvent {
    if (input.dedupeKey) {
      const existing = this.events.find((e) => e.dedupeKey === input.dedupeKey && e.tenantId === input.tenantId && e.status !== 'FAILED');
      if (existing) return existing;
    }

    const event: OperationalEvent = {
      id: `evt-${++this.eventCounter}-${Date.now()}`,
      tenantId: input.tenantId,
      eventType: input.eventType,
      severity: input.severity ?? 'INFO',
      source: input.source,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      dedupeKey: input.dedupeKey,
      payload: input.payload ?? {},
      createdAt: new Date(),
      status: 'PENDING',
    };

    this.events.push(event);

    const alertCategory = EVENT_TO_ALERT_CATEGORY[input.eventType];
    if (alertCategory && (input.severity === 'HIGH' || input.severity === 'CRITICAL' || input.severity === 'MEDIUM')) {
      this.createAlertFromEvent(event, alertCategory);
    }

    return event;
  }

  private createAlertFromEvent(event: OperationalEvent, category: AlertCategory): void {
    const dedupeKey = `${event.tenantId}:${event.eventType}:${event.resourceId}`;
    const existing = this.alerts.find((a) => a.status === 'OPEN' && `${a.tenantId}:${a.category}:${a.resourceId}` === dedupeKey);
    if (existing) return;

    this.alerts.push({
      id: `alert-${++this.alertCounter}-${Date.now()}`,
      tenantId: event.tenantId,
      severity: event.severity,
      category,
      title: this.buildAlertTitle(event),
      message: this.buildAlertMessage(event),
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      recommendedAction: this.buildRecommendedAction(event),
      status: 'OPEN',
      createdAt: new Date(),
      metadata: event.payload,
    });
  }

  createAlert(input: CreateAlertInput): OperatorAlert {
    const alert: OperatorAlert = {
      id: `alert-${++this.alertCounter}-${Date.now()}`,
      tenantId: input.tenantId,
      severity: input.severity,
      category: input.category,
      title: input.title,
      message: input.message,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      recommendedAction: input.recommendedAction,
      status: 'OPEN',
      createdAt: new Date(),
      metadata: input.metadata ?? {},
    };
    this.alerts.push(alert);
    return alert;
  }

  acknowledgeAlert(alertId: string, tenantId: string, actorId: string): boolean {
    const alert = this.alerts.find((a) => a.id === alertId && a.tenantId === tenantId);
    if (!alert || alert.status !== 'OPEN') return false;
    alert.status = 'ACKNOWLEDGED';
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = actorId;
    return true;
  }

  getAlerts(tenantId: string, status?: string): OperatorAlert[] {
    return this.alerts.filter((a) => a.tenantId === tenantId && (!status || a.status === status));
  }

  getAlert(alertId: string, tenantId: string): OperatorAlert | undefined {
    return this.alerts.find((a) => a.id === alertId && a.tenantId === tenantId);
  }

  getEvents(tenantId: string, eventType?: OperationalEventType): OperationalEvent[] {
    return this.events.filter((e) => e.tenantId === tenantId && (!eventType || e.eventType === eventType));
  }

  private buildAlertTitle(event: OperationalEvent): string {
    const titles: Record<OperationalEventType, string> = {
      RECOMMENDATION_CREATED: 'New recommendation ready for review',
      APPROVAL_REQUIRED: 'Approval required for execution',
      EXECUTION_READY: 'Execution ready to proceed',
      EXECUTION_BLOCKED: 'Execution blocked — action required',
      EXECUTION_SUBMITTED: 'Execution submitted',
      VERIFICATION_SUCCEEDED: 'Verification succeeded',
      VERIFICATION_FAILED: 'Verification failed — review needed',
      DRIFT_DETECTED: 'Drift detected — outcome at risk',
      ROLLBACK_READY: 'Rollback ready to initiate',
      ROLLBACK_REQUIRED: 'Rollback required — execution diverged',
      CONNECTOR_DEGRADED: 'Connector health degraded',
      SYNC_FAILED: 'Sync failure — data may be stale',
      READINESS_BLOCKED: 'Readiness gate blocked',
    };
    return titles[event.eventType] ?? event.eventType;
  }

  private buildAlertMessage(event: OperationalEvent): string {
    return `Event ${event.eventType} on ${event.resourceType ?? 'resource'} ${event.resourceId ?? ''} in tenant ${event.tenantId}`;
  }

  private buildRecommendedAction(event: OperationalEvent): string {
    const actions: Partial<Record<OperationalEventType, string>> = {
      APPROVAL_REQUIRED: 'Navigate to recommendation detail and grant approval',
      EXECUTION_BLOCKED: 'Review blocking conditions in readiness gate',
      VERIFICATION_FAILED: 'Re-run verification or escalate to connector admin',
      DRIFT_DETECTED: 'Acknowledge drift and review rollback eligibility',
      ROLLBACK_REQUIRED: 'Initiate rollback from execution detail page',
      CONNECTOR_DEGRADED: 'Check connector configuration and credentials',
      SYNC_FAILED: 'Trigger manual sync or review connector health',
    };
    return actions[event.eventType] ?? 'Review in operational queue';
  }

  clearForTesting(): void {
    this.events = [];
    this.alerts = [];
    this.eventCounter = 0;
    this.alertCounter = 0;
  }
}

export const globalEventsService = new OperationalEventsService();
