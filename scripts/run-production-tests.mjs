/** Run Playwright against an explicitly supplied production origin. */
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PLAYWRIGHT_CLI = fileURLToPath(
  new URL('../node_modules/@playwright/test/cli.js', import.meta.url),
);

function invokedDirectly() {
  const entry = process.argv[1];
  return entry !== undefined && resolve(entry) === fileURLToPath(import.meta.url);
}

if (invokedDirectly()) {
  if (!process.env.E2E_BASE_URL?.trim()) {
    process.stderr.write('E2E_BASE_URL is required for production Playwright tests.\n');
    process.exitCode = 1;
  } else {
    const child = spawn(process.execPath, [PLAYWRIGHT_CLI, 'test', ...process.argv.slice(2)], {
      stdio: 'inherit',
    });
    child.on('error', (error) => {
      process.stderr.write(`Unable to start Playwright: ${error.message}\n`);
      process.exitCode = 1;
    });
    child.on('exit', (code, signal) => {
      if (signal) {
        process.stderr.write(`Playwright terminated by signal ${signal}.\n`);
        process.exitCode = 1;
      } else {
        process.exitCode = code ?? 1;
      }
    });
  }
}
