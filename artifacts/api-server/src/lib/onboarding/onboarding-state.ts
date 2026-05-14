import { db, tenantOnboardingTable } from "@workspace/db";
import { eq } from "drizzle-orm";
export async function getOnboardingStatus(tenantId: string){ const [r]=await db.select().from(tenantOnboardingTable).where(eq(tenantOnboardingTable.tenantId,tenantId)); return r ?? null; }
export async function updateOnboardingStep(tenantId: string, step: string, patch: any = {}) { const [existing]=await db.select().from(tenantOnboardingTable).where(eq(tenantOnboardingTable.tenantId,tenantId)); if(!existing){ const [c]=await db.insert(tenantOnboardingTable).values({ tenantId, currentStep: step, completedSteps: [step], ...patch }).returning(); return c; }
 const completed=Array.from(new Set([...(existing.completedSteps as string[]),step])); const [u]=await db.update(tenantOnboardingTable).set({ currentStep: step, completedSteps: completed, updatedAt:new Date(), ...patch }).where(eq(tenantOnboardingTable.tenantId,tenantId)).returning(); return u; }
