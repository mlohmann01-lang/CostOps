import { Router } from "express";
import { authProviderRegistry } from "../lib/auth/providers/auth-provider-registry.js";
import { issueSessionToken, hashSessionToken } from "../lib/auth/providers/session-manager.js";
import { mapClaimsToRole } from "../lib/auth/providers/token-claims.js";

const router = Router();

router.get('/login/start', (req, res) => {
  res.json({
    provider: 'MICROSOFT_ENTRA',
    loginUrl: authProviderRegistry.MICROSOFT_ENTRA.loginUrl(String(req.query.state ?? 'state')),
  });
});

router.get('/login/callback', async (req, res, next) => {
  try {
    const claims = await authProviderRegistry.MICROSOFT_ENTRA.exchangeCodeForClaims(String(req.query.code ?? ''));
    const token = issueSessionToken();
    res.json({ sessionToken: token, sessionTokenHash: hashSessionToken(token), claims, mappedRole: mapClaimsToRole(claims.groups) });
  } catch (e) { next(e); }
});

router.post('/demo-login', (req, res) => {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_LOGIN !== 'true') {
    return res.status(403).json({ error: 'DEMO_LOGIN_DISABLED' });
  }
  const accessToken = issueSessionToken();
  return res.json({
    accessToken,
    expiresAt: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
    tenantId: 'demo-certen',
    tenantMode: 'DEMO',
    role: 'ADMIN',
    isDemo: true,
    environment: 'DEMO',
    user: { email: 'demo@certen.io', name: 'Certen Demo User' },
  });
});

router.post('/logout', (_req, res) => res.json({ revoked: true }));
router.get('/me', (req, res) => res.json((req as { auth?: unknown }).auth ?? null));
router.get('/login', (_req, res) => res.status(410).json({ error: 'USE_LOGIN_START' }));
router.get('/callback', (_req, res) => res.status(410).json({ error: 'USE_LOGIN_CALLBACK' }));

export default router;
