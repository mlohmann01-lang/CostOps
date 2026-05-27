# Connector Coverage Matrix (Governed Economic Outcomes)

| Platform | Discovery | Recommendation | Dry Run | Execution | Rollback | Verification | Current Status |
|---|---|---|---|---|---|---|---|
| M365 (`REMOVE_LICENSE`) | Yes | Yes | Yes | Yes (gated) | Yes (gated) | Yes | **Full governed path** |
| M365 (`RIGHTSIZE_LICENSE`) | Yes | Yes | Future | Future | Future | Future | Recommendation-only (v1) |
| M365 (`COPILOT_UTILISATION`) | Yes | Yes | Future | Future | Future | Future | Recommendation-only (v1) |
| M365 (`ADDON_RECLAMATION`) | Yes | Yes | Future | Future | Future | Future | Recommendation-only (v1) |
| ServiceNow | Yes | Partial (workflow candidates) | Partial | No | No | Partial | Discovery/workflow candidate |
| Flexera | Yes | Evidence-assist | N/A | No | No | Evidence-assist | Entitlement authority source |
| Snowflake | Partial/future | Future | Future | Future | Future | Future | Future optimization domain |
| Databricks | Partial/future | Future | Future | Future | Future | Future | Future optimization domain |
| AWS | Yes (existing domain telemetry) | Partial/future | Partial/future | Future | Future | Future | Future optimization domain |
| Azure | Partial/future | Future | Future | Future | Future | Future | Future optimization domain |
| GCP | Partial/future | Future | Future | Future | Future | Future | Future optimization domain |

## Narrative
- Broad connector narrative is preserved through discovery/evidence breadth.
- Unsafe breadth is avoided by limiting live execution to explicitly governed, connector-specific, policy-gated paths.
- M365 REMOVE_LICENSE remains the primary end-to-end reference implementation.
