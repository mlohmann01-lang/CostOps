import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import glob from 'fast-glob';

const forbidden = [/observability platform/i, /governance middleware/i, /kubernetes/i, /devops console/i];
const requiredStates = [
  'GOVERNED_EXECUTION_ELIGIBLE','APPROVAL_REQUIRED','EXECUTION_IN_PROGRESS','VERIFICATION_PENDING','VERIFIED','PARTIAL_FAILURE','DRIFT_DETECTED','ROLLBACK_AVAILABLE','ROLLBACK_REQUIRED','BLOCKED','MANUAL_ONLY','QUARANTINED'
];
const files = await glob(['src/components/mockups/**/*.tsx','src/components/ops/**/*.tsx','src/lib/**/*.ts'], { cwd: process.cwd() });
let fail = false;
for (const file of files) {
  const content = readFileSync(join(process.cwd(), file), 'utf8');
  forbidden.forEach((re) => {
    if (re.test(content)) {
      console.error(`[forbidden-terminology] ${file}: ${re}`);
      fail = true;
    }
  });
}
const stateFile = readFileSync(join(process.cwd(), 'src/lib/ops-state.ts'), 'utf8');
for (const state of requiredStates) {
  if (!stateFile.includes(state)) {
    console.error(`[state-system] missing ${state}`);
    fail = true;
  }
}
if (fail) process.exit(1);
console.log(`ux-enforcement passed across ${files.length} files`);
