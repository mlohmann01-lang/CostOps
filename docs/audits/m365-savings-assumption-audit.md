# M365 Savings Assumption Audit

Audit date: 2026-06-01

## Pricing mechanism observed

Savings are produced by each playbook as `projectedMonthlySavings`; `projectedAnnualSavings` is calculated as `monthly * 12`. SKU pricing comes from `getM365MonthlyPrice`, which canonicalizes SKU names to `E5`, `E3`, `E1`, `F3`, `COPILOT`, `COMMON_ADDON`, or `UNKNOWN`. Defaults are static estimates: E5 $57, E3 $36, E1 $10, F3 $8, Copilot $30, and common add-on $12. Environment variables such as `M365_PRICE_E5` can override defaults. Unknown SKUs return zero in pricing, but `monthlySkuCost` replaces zero with a low-confidence $10 fallback.

## Savings source classification

| Playbook | Monthly savings derivation | Annual savings derivation | Source | Confidence | Required fixes before execution |
| --- | --- | --- | --- | --- | --- |
| Inactive User Reclaim | Sum of `monthlySkuCost(skuPartFor(snapshot, skuId))` for every assigned license on the inactive user. | Monthly savings multiplied by 12. | Estimated SKU cost with $10 placeholder fallback for unknown SKUs. | MEDIUM | Replace default catalog prices with tenant contract or billing prices; separate direct vs group-assigned license savings; show confidence downgrade when any license uses fallback; exclude non-removable licenses. |
| License Pool Recovery | `(inactive assigned count + unused prepaid capacity) * monthlySkuCost(skuPartNumber)`. | Monthly savings multiplied by 12. | Estimated SKU cost with possible placeholder fallback. | LOW-MEDIUM | Separate renewal-avoidance savings from immediate monthly savings; avoid counting already-paid unused prepaid capacity as current cash savings unless contract allows reduction; remove protected inactive users; account for group assignment. |
| Copilot Rightsizing | No/low usage uses full default Copilot monthly price; medium usage uses 40% of Copilot price. | Monthly savings multiplied by 12. | Estimated SKU cost; 40% rightsize assumption is heuristic. | LOW-MEDIUM | Use actual Copilot SKU cost from tenant contract; require actual Copilot usage telemetry; justify partial-savings model or change to review-only until reassignment/removal economics are proven. |
| Shared Mailbox Conversion | Sum of assigned license costs for the mailbox candidate. | Monthly savings multiplied by 12. | Estimated SKU cost with fallback. | MEDIUM | Confirm mailbox conversion eligibility, storage/archive/compliance requirements, ownership, and whether every assigned license can be removed; use actual SKU costs. |
| Duplicate License Detection | Sum of estimated costs for add-on SKU parts deemed redundant when E5 exists. | Monthly savings multiplied by 12. | Estimated SKU cost; overlap is assumed from SKU hints. | LOW | Build or import Microsoft service-plan entitlement overlap intelligence; prove add-on feature redundancy per tenant/user; use actual add-on cost; avoid treating all hinted add-ons as removable. |
| Dormant Group Cleanup | Always zero monthly savings. | Always zero annual savings. | Explicit zero value, not license-cost-derived. | HIGH for zero-dollar claim; LOW for total value if governance risk savings are expected. | Keep as zero-savings unless a separate, evidenced governance-value model is introduced; do not imply license savings. |
| Security SKU Rationalization | Sum of `Math.max(5, monthlySkuCost(part))` for detected security add-ons. | Monthly savings multiplied by 12. | Estimated SKU cost plus $5 minimum placeholder. | LOW | Replace substring entitlement assumptions with authoritative service plan overlap; remove $5 floor unless backed by real price; require security usage/policy dependency evidence; use actual tenant prices. |

## Cross-cutting economic risks

- Static list prices are not customer-specific and may differ materially from enterprise agreements, CSP pricing, discounts, bundles, and annual commitments.
- `projectedMonthlySavings` currently represents theoretical avoidable cost, not necessarily immediate cash savings.
- Group-based license assignment can prevent per-user removal from realizing savings without changing group membership or assignment policy.
- Unknown SKUs can become $10/month estimates through the `monthlySkuCost` fallback, which can overstate or understate savings.
- Annual savings always assume twelve full future months of avoidable spend and do not consider contract end date, renewal timing, ramp, or proration.

## Economic audit conclusion

Only zero-dollar dormant group cleanup has high confidence in the stated savings because it claims no savings. All license-removal playbooks should be treated as estimated economic intelligence until tenant-specific pricing and contract reducibility are attached. Duplicate license and security SKU rationalization are not execution-ready because they require entitlement intelligence, not just SKU-name matching.
