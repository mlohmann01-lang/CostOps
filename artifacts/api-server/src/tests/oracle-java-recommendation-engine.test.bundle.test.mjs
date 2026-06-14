import { createRequire as __createRequire } from 'node:module';
import { fileURLToPath as __fileURLToPath } from 'node:url';
import { dirname as __pathDirname } from 'node:path';
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __pathDirname(__filename);

// src/tests/oracle-java-recommendation-engine.test.ts
import test from "node:test";
import assert from "node:assert/strict";

// src/lib/oracle-java-governance-pack/oracle-java-recommendation-engine.ts
var oracleRecommendation = (c) => c;

// src/tests/oracle-java-recommendation-engine.test.ts
test("maps recommendation", () => {
  assert.equal(typeof oracleRecommendation("JAVA_EMPLOYEE_METRIC_EXPOSURE_REVIEW"), "string");
});
