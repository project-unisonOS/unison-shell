import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import pa11y from 'pa11y';

async function main() {
  const target = pathToFileURL(resolve('renderer/index.html')).href;
  console.log('[a11y] Checking', target);
  const results = await pa11y(target, {
    standard: 'WCAG2AA',
  });
  if (!results.issues || results.issues.length === 0) {
    console.log('[a11y] No accessibility issues found');
    return;
  }
  console.log('[a11y] Accessibility issues found:');
  for (const issue of results.issues) {
    console.log(
      `- [${issue.type}] ${issue.code}: ${issue.message} (${issue.selector})`,
    );
  }
  process.exitCode = 1;
}

main().catch((err) => {
  console.error('[a11y] Error running pa11y', err);
  process.exitCode = 1;
});

