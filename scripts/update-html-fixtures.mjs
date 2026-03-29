import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const userAgent = 'indiehackers-cli-fixture-updater/0.1';
const fixtures = [
  {
    outputPath: path.join(repoRoot, 'tests/fixtures/html/home-page.html'),
    url: 'https://www.indiehackers.com/',
  },
  {
    outputPath: path.join(repoRoot, 'tests/fixtures/html/post-page.html'),
    url: 'https://www.indiehackers.com/post/how-do-you-make-a-successful-post-on-indie-hackers-f6745260fd',
  },
  {
    outputPath: path.join(repoRoot, 'tests/fixtures/html/product-page.html'),
    url: 'https://www.indiehackers.com/product/offero',
  },
];

for (const fixture of fixtures) {
  const response = await fetch(fixture.url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': userAgent,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${fixture.url}: ${response.status} ${response.statusText}`,
    );
  }

  const html = await response.text();
  if (html.length < 5000) {
    throw new Error(
      `Refusing to write suspiciously short fixture for ${fixture.url}`,
    );
  }

  await mkdir(path.dirname(fixture.outputPath), { recursive: true });
  await writeFile(fixture.outputPath, html, 'utf8');
  console.log(`updated ${path.relative(repoRoot, fixture.outputPath)}`);
}
