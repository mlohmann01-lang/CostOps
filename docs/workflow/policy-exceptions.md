# Policy Exceptions Lifecycle

Policy exceptions are tracked in `policy_exceptions` with deterministic lifecycle:

REQUESTED -> APPROVED/REJECTED -> REVOKED/EXPIRED

Rules:
- Explicit reason and policy version linkage required.
- Expired exceptions are marked `EXPIRED` and no longer active.
- Exception actions emit operator activity events.
- Exceptions expire automatically and preserve policy lineage.
