export type AIToolCategory = "ASSISTANT" | "IDE" | "CHAT" | "CREATIVE" | "SEARCH" | "KNOWLEDGE" | "API" | "OTHER";

export type AIPricingModel = "PER_SEAT" | "USAGE_BASED" | "HYBRID" | "ENTERPRISE_CONTRACT";

export type AIRiskTier = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface AITool {
  toolId: string;
  toolName: string;
  vendor: string;
  category: AIToolCategory;
  pricingModel: AIPricingModel;
  enterpriseApproved: boolean;
  riskTier: AIRiskTier;
}

export interface AIToolInventory {
  tenantId: string;
  tools: AITool[];
  generatedAt: string;
}

export function buildAIToolInventory(tenantId: string, tools: AITool[]): AIToolInventory {
  return {
    tenantId,
    tools: [...tools],
    generatedAt: new Date().toISOString(),
  };
}

export function findUnapprovedTools(inventory: AIToolInventory): AITool[] {
  return inventory.tools.filter((tool) => !tool.enterpriseApproved);
}
