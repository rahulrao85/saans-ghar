// Fails the build if the shipped JavaScript or CSS grows past its gzip budget.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const dir = 'dist/public/assets';
const budgets = { '.js': 130 * 1024, '.css': 8 * 1024 };
let failed = false;
for (const [ext, limit] of Object.entries(budgets)) {
  const total = readdirSync(dir)
    .filter((f) => f.endsWith(ext))
    .reduce((sum, f) => sum + gzipSync(readFileSync(join(dir, f))).length, 0);
  const ok = total <= limit;
  failed ||= !ok;
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} ${ext} ${(total / 1024).toFixed(1)} KB gzip (budget ${limit / 1024} KB)`,
  );
}
if (failed) process.exit(1);
