/**
 * Local CI contract checker.
 *
 * Usage: pnpm check:ci
 *
 * Reads the pull-request workflow as text and asserts the same contract the
 * unit tests enforce: `pull_request` is the only trigger and there are exactly
 * two jobs, `verify` and `e2e`. Exits non-zero with a clear message on any
 * violation so drift is caught before a PR is opened.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Location of the checked-in workflow, relative to this module. */
export const WORKFLOW_PATH = new URL('../.github/workflows/ci.yml', import.meta.url);

/**
 * Top-level keys of a column-zero YAML block, or null when the block is absent.
 * @param {string} source workflow text
 * @param {string} heading column-zero key such as `on` or `jobs`
 * @returns {string[] | null}
 */
function keysUnder(source, heading) {
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex((line) => line === `${heading}:`);
  if (start === -1) {
    return null;
  }
  const keys = [];
  for (const line of lines.slice(start + 1)) {
    if (line.trim() === '' || line.trimStart().startsWith('#')) {
      continue;
    }
    if (!line.startsWith(' ')) {
      break;
    }
    const match = /^ {2}([A-Za-z_][\w-]*):\s*(?:#.*)?$/.exec(line);
    if (match) {
      keys.push(match[1]);
    }
  }
  return keys;
}

/**
 * Validate raw workflow text.
 * @param {string} source workflow file contents
 * @returns {string[]} human-readable violations (empty when valid)
 */
export function checkWorkflowText(source) {
  const errors = [];

  const triggers = keysUnder(source, 'on');
  if (triggers === null) {
    errors.push('workflow is missing the "on:" trigger block');
  } else if (triggers.length !== 1 || triggers[0] !== 'pull_request') {
    errors.push(
      `expected "pull_request" to be the only trigger, found: ${triggers.join(', ') || '(none)'}`,
    );
  }

  const jobs = keysUnder(source, 'jobs');
  if (jobs === null) {
    errors.push('workflow is missing the "jobs:" block');
  } else {
    const found = jobs.toSorted();
    if (found.join(',') !== 'e2e,verify') {
      errors.push(
        `expected exactly two jobs "verify" and "e2e", found: ${jobs.join(', ') || '(none)'}`,
      );
    }
  }

  return errors;
}

/**
 * Validate the checked-in workflow and return its text.
 * @param {URL | string} [path] workflow location
 * @returns {string} workflow text
 */
export function checkWorkflowFile(path = WORKFLOW_PATH) {
  const source = readFileSync(path, 'utf8');
  const errors = checkWorkflowText(source);
  if (errors.length > 0) {
    const lines = [
      `Invalid CI workflow (${String(path)}):`,
      ...errors.map((error) => `  - ${error}`),
    ];
    throw new Error(lines.join('\n'));
  }
  return source;
}

const invokedDirectly =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  try {
    checkWorkflowFile();
    process.stdout.write('CI workflow contract OK: pull_request trigger; jobs verify, e2e.\n');
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
