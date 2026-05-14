# Deployment Readme
- Build production image from root Dockerfile.
- Supply env via secret manager, never commit secrets.
- Run migrations before startup.
- Validate `/health`, `/readiness`, `/startup-report` after deploy.
