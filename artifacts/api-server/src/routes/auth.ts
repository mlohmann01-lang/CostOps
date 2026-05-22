import { Router } from "express";
import { authProviderRegistry } from "../lib/auth/providers/auth-provider-registry.js";
import { issueSessionToken, hashSessionToken } from "../lib/auth/providers/session-manager.js";
import { mapClaimsToRole } from "../lib/auth/providers/token-claims.js";

const router = Router();

router.get('/login', (req, res) => {
  res.json({
    provider: 'MICROSOFT_ENTRA',
    loginUrl: authProviderRegistry.MICROSOFT_ENTRA.loginUrl(String(req.query.state ?? 'state')),
  });
});

router.get('/callback', async (req, res, next) => {
  try {
    const claims = await authProviderRegistry.MICROSOFT_ENTRA.exchangeCodeForClaims(
      String(req.query.code ?? ''),
    );
    const token = issueSessionToken();
    res.json({
      sessionToken: token,
      sessionTokenHash: hashSessionToken(token),
      claims,
      mappedRole: mapClaimsToRole(claims.groups),
    });
  } catch (e) {
    next(e);
  }
});

router.post('/logout', (_req, res) => res.json({ revoked: true }));

router.get('/me', (req, res) => res.json((req as { auth?: unknown }).auth ?? null));

export default router;
