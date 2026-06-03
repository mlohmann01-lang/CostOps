import test from "node:test";
import assert from "node:assert/strict";
import { scoreShadowITTrust } from "../lib/playbooks/shadow-it/shadow-it-trust";

test("shadow IT trust scoring rewards owner sign-in user count and metadata evidence", () => {
  const trusted = scoreShadowITTrust({ ownerKnown: true, signInEvidenceAvailable: true, userCountAvailable: true, applicationMetadataAvailable: true });
  assert.equal(trusted.trustScore, 100);
  assert.equal(trusted.trustBand, "TRUSTED");

  const weak = scoreShadowITTrust({ ownerKnown: false, signInEvidenceAvailable: false, userCountAvailable: true, applicationMetadataAvailable: true });
  assert.equal(weak.trustScore, 50);
  assert.equal(weak.trustBand, "LOW_CONFIDENCE");
  assert.ok(weak.trustReasons.includes("Application owner missing"));
});
