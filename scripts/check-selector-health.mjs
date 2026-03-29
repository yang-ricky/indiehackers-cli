import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const { stdout } = await execFileAsync(
  'node',
  ['dist/index.js', 'doctor', '--json'],
  {
    cwd: repoRoot,
  },
);

const payload = JSON.parse(stdout);
if (!payload.ok || !payload.data) {
  throw new Error(
    `Doctor failed: ${payload.error?.message ?? 'unknown error'}`,
  );
}

const { connectivity, providers, selectors } = payload.data;
const failedChecks = [
  !connectivity.websiteReachable && 'website is unreachable',
  !selectors.homeFeedMatches && 'homepage selectors are broken',
  !selectors.postPageMatches && 'post page selectors are broken',
  !selectors.productCardsMatch && 'product card selectors are broken',
  !providers.some(
    (provider) => provider.name === 'html' && provider.status !== 'unavailable',
  ) && 'html provider is unavailable',
].filter(Boolean);

if (failedChecks.length) {
  throw new Error(`Selector health failed: ${failedChecks.join('; ')}`);
}

console.log('selector health check passed');
