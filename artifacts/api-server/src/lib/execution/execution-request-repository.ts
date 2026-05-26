import { and, eq } from "drizzle-orm";
import { db, executionRequestsTable } from "@workspace/db";
import type { ExecutionRequestObject } from "./types";

function allowMemory() {
  const env = String(process.env.RUNTIME_ENV ?? process.env.NODE_ENV ?? "development").toLowerCase();
  return env === "development" || env === "test";
}

export class ExecutionRequestRepository {
  private static mem = new Map<string, any>();
  private key(tenantId: string, executionRequestId: string) { return `${tenantId}:${executionRequestId}`; }

  async upsert(req: ExecutionRequestObject) {
    try {
      const [existing] = await db.select().from(executionRequestsTable).where(and(eq(executionRequestsTable.tenantId, req.tenantId), eq(executionRequestsTable.idempotencyKey, req.idempotencyKey))).limit(1);
      if (existing) return existing;
      const [row] = await db.insert(executionRequestsTable).values({ ...req, requestedAt: new Date(req.requestedAt), approvedAt: req.approvedAt ? new Date(req.approvedAt) : null, expiresAt: new Date(req.expiresAt) }).returning();
      return row;
    } catch (e) {
      if (!allowMemory()) throw new Error(`EXECUTION_REQUEST_DB_UNAVAILABLE_FAIL_CLOSED: ${(e as Error).message}`);
      const found = Array.from(ExecutionRequestRepository.mem.values()).find((r: any) => r.tenantId === req.tenantId && r.idempotencyKey === req.idempotencyKey);
      if (found) return found;
      const row = { ...req, id: Date.now(), createdAt: new Date(), updatedAt: new Date() };
      ExecutionRequestRepository.mem.set(this.key(req.tenantId, req.executionRequestId), row);
      return row;
    }
  }

  async list(tenantId: string) {
    try { return await db.select().from(executionRequestsTable).where(eq(executionRequestsTable.tenantId, tenantId)); }
    catch (e) { if (!allowMemory()) throw new Error(`EXECUTION_REQUEST_DB_UNAVAILABLE_FAIL_CLOSED: ${(e as Error).message}`); return Array.from(ExecutionRequestRepository.mem.values()).filter((r: any) => r.tenantId === tenantId); }
  }

  async getByExecutionRequestId(tenantId: string, executionRequestId: string) {
    try { const rows = await db.select().from(executionRequestsTable).where(and(eq(executionRequestsTable.tenantId, tenantId), eq(executionRequestsTable.executionRequestId, executionRequestId))).limit(1); return rows[0] ?? null; }
    catch (e) { if (!allowMemory()) throw new Error(`EXECUTION_REQUEST_DB_UNAVAILABLE_FAIL_CLOSED: ${(e as Error).message}`); return ExecutionRequestRepository.mem.get(this.key(tenantId, executionRequestId)) ?? null; }
  }

  async updateState(tenantId: string, executionRequestId: string, nextState: string) {
    const existing = await this.getByExecutionRequestId(tenantId, executionRequestId);
    if (!existing) return null;
    try {
      const [row] = await db.update(executionRequestsTable).set({ executionState: nextState, updatedAt: new Date() }).where(eq(executionRequestsTable.id, existing.id)).returning();
      return row;
    } catch (e) {
      if (!allowMemory()) throw new Error(`EXECUTION_REQUEST_DB_UNAVAILABLE_FAIL_CLOSED: ${(e as Error).message}`);
      const memRow = { ...existing, executionState: nextState, updatedAt: new Date() };
      ExecutionRequestRepository.mem.set(this.key(tenantId, executionRequestId), memRow);
      return memRow;
    }
  }
}
