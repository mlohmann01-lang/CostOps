---
name: Landing page CTA label
description: getStartedLabel is 'Run Free Exposure Review' and getStartedHref is '/exposure-review/start' — tests that assert these must match current values.
---

## The rule
`PUBLIC_HEADER.getStartedLabel` = `'Run Free Exposure Review'`
`PUBLIC_HEADER.getStartedHref` = `'/exposure-review/start'`

Defined in `src/lib/website/defaultLandingPage.ts`.

**Why:** P1–P5 changes renamed the header CTA from 'Get started' → 'Run Free Exposure Review' and rerouted from `/exposure-review` → `/exposure-review/start` (the signup form entry point).

**How to apply:** Any test asserting on `page.header.getStartedLabel` or `page.header.getStartedHref` must use these values. The architectural rule (CTA label must live in the data model, not hardcoded in JSX) still applies.
