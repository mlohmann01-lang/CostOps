# Replit Runtime Notes

## Package Manager
- Avoid brittle exact `packageManager` pins when Replit runtime compatibility is unstable.
- If pinning is required, prefer a looser `pnpm` declaration and verify startup.

## Vite Optimized Dependency Cache
- If duplicate React / optimize-deps corruption appears:
  1. stop dev server
  2. clear Vite cache (`node_modules/.vite`)
  3. restart with clean install

## UI/Route Contract Safety
- Keep navigation minimal and only expose items from `nav-registry` where `enabled && pageExists`.
- Do not add links to pages/routes until backend route existence is verified.
- Use frontend contract guards (`safeArrayResponse`) so pages degrade safely on malformed/missing payloads.

## Data Degradation Behavior
- Recommendation UI should rely on canonical `playbook` field and fallback labels from typed adapters.
- Missing optional fields should render safe placeholders, not crash the page.
