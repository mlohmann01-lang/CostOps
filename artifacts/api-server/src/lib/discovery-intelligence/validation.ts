import { z } from "zod";
import { CANONICAL_GRAPH_ENTITY_TYPES, CANONICAL_RELATIONSHIP_TYPES } from "../operational-graph/types";

export const discoverySignalSchema = z.object({
  source: z.string().min(1),
  externalId: z.string().min(1),
  entityType: z.enum(CANONICAL_GRAPH_ENTITY_TYPES),
  displayName: z.string().min(1),
  confidence: z.number().min(0).max(1),
  observedAt: z.string().datetime(),
  attributes: z.record(z.unknown()).optional(),
  relatedTo: z.array(z.object({
    canonicalKey: z.string().min(1),
    relationshipType: z.enum(CANONICAL_RELATIONSHIP_TYPES),
    confidence: z.number().min(0).max(1),
  })).optional(),
});

export const lineageSchema = z.object({
  lineageId: z.string().min(1),
  runId: z.string().optional(),
  parents: z.array(z.string()).optional(),
  capturedAt: z.string().datetime(),
});
