# Project Workflow

## Guiding Principles

1. **The plan is the source of truth.** Every phase, task, result, checkpoint, and evidence link lives in `plan.md`.
2. **The tech stack is deliberate.** A change to the stack is recorded in `tech-stack.md` before the implementation depends on it.
3. **Verification is agent-executed.** The phase subagent runs the configured checks and writes evidence. The user is not asked to manually verify routine work.
4. **Evidence over assertion.** A phase is complete only when the configured checks pass and the evidence file exists.
5. **No silent debt.** A finding is fixed, explicitly accepted with a reason, or tracked as an issue. It is never quietly ignored.
6. **Stay inside the phase contract.** `Touches` defines the expected blast radius. A required deviation is allowed, recorded, and reviewed.
7. **Non-interactive and CI-aware.** Prefer commands that terminate. Use `CI=true` for watch-mode tools where the ecosystem supports it.

## Workflow Config

```yaml
project:
  type: "web app (static Astro content site + Hono API on Cloudflare Workers)"
  languages: ["TypeScript", "Python"]
commands:
  setup: "pnpm install"
  dev: "pnpm dev"
  test: "pnpm test"
  coverage: "pnpm coverage"
  lint: "pnpm lint"
  format: "pnpm fmt:check"
  typecheck: "pnpm typecheck"
  build: "pnpm build"
  verify_phase: "pnpm verify"
coverage:
  gate: 80
  scope: "logic-bearing modules only"
verification:
  layers: ["static", "unit", "integration", "smoke", "e2e"]
  retry: 2
  manual_exceptions:
    - "Cloudflare account credentials and deploy approval"
    - "GitHub OAuth app credentials"
    - "LLM provider API keys"
    - "WebGPU-capable hardware for visual verification"
git:
  base_branch: "master"
  fetch: true
  commit_style: "conventional"
  task_commits: true
  phase_squash: true
review:
  strict: false
  issues:
    enabled: true
    auto_create: true
    min_severity: "medium"
    group_low: true
    labels: ["tech-debt", "conductor"]
pr:
  enabled: true
  tool: "gh"
  base: "master"
  media: "always"
  watch_ci: true
  watch_timeout_minutes: 15
  merge_method: "merge"
```

Notes: GitHub CLI 2.103.0 is installed, so media demos in PR bodies are supported (GitHub only). No git remote exists yet — PR creation is deferred until one is added. `phase_squash` refers to task commits inside a phase and remains enabled; the PR merge method is `merge`.

## Development Commands

### Setup

```bash
pnpm install
```

Copy `.env.example` to `.env` and fill provider keys (see Verification Strategy → Environment variables).

### Daily Development

```bash
# Start the app (Astro on :4321) and API (Wrangler on :8787)
pnpm dev
pnpm dev:api

# Run tests
pnpm test

# Run coverage (gate: 80% on logic-bearing modules)
pnpm coverage

# Lint
pnpm lint

# Format check (use `pnpm fmt` to write)
pnpm fmt:check

# Typecheck
pnpm typecheck

# Build
pnpm build
```

### Before Committing

```bash
pnpm verify
```

## Phase & Task Workflow

Implementation is executed one phase at a time by a phase subagent. The primary
agent owns `plan.md`, `metadata.json`, the registry, and review artifacts.

### Task Lifecycle

1. Read the phase contract in `plan.md`, the relevant requirements in `spec.md`, and the applicable style guides.
2. Work through the phase's tasks in order.
3. Write or update a failing test first for logic-bearing code (mastery math, retrieval/scoring, prompt assembly, validation, badge logic). For glue, content, and UI, add tests alongside the behavior change only where they add real value.
4. Implement the smallest change that satisfies the task.
5. Run the targeted checks for the task.
6. Commit the task with a conventional commit message.
7. Report the task's status and commit SHA to the primary agent.

The subagent does **not** edit `plan.md`. The primary marks tasks complete after it accepts the phase.

### Deviations

- If the phase goal requires a file outside `Touches`, make the smallest necessary change and record it in the report under `deviations`.
- If the work requires a product or design decision, stop and report `blocked`.
- Do not silently expand scope, add a dependency, or migrate unrelated code.

### Phase Completion

1. Run the phase's `Verification` command exactly as written in `plan.md`.
2. Run `verify_phase` when it is configured and different from the phase command.
3. Write the evidence file using the configured evidence path.
4. Return the structured report to the primary agent.
5. Do not merge, rebase, reset, push, open a PR, or edit Conductor state files.

## Verification Strategy

### Layers

- **Static:** lint, format, typecheck, build — runs every phase.
- **Unit:** logic-bearing modules only — runs every phase.
- **Integration:** module boundaries, Worker/DB, validation, GLB manifest checks — runs every phase.
- **Smoke:** startup and critical path (catalog → lesson → tutor health) — at milestones.
- **E2E:** complete browser flows via Playwright — at milestones once the 3D lesson is demoable.
- **Browser (primary, in-app browser):** visual and console pass that Playwright cannot replace — required for UI-bearing phases, mandatory at the review gate, and mandatory after every review-fix round. The primary runs this; phase subagents do not have browser access.

### Commands

| Layer | Command | Required |
| --- | --- | --- |
| static | `pnpm lint && pnpm fmt:check && pnpm typecheck && pnpm build` | yes (every phase) |
| unit | `pnpm test` | yes (every phase) |
| coverage | `pnpm coverage` | yes (every phase) |
| integration | `pnpm test:integration` | yes (every phase) |
| smoke | `pnpm smoke` | no (milestones) |
| e2e | `pnpm test:e2e` | no (milestones) |
| browser | in-app browser skill, manual pass (see below) | yes (UI phases, review, and every fix round) |

### Services and Fixtures

- **Services:** Astro dev server on `localhost:4321`; Wrangler dev (Hono API + KV binding) on `localhost:8787`.
- **Containers:** none required.
- **Database:** Neon Postgres free branch with pgvector/HNSW; migrations via `pnpm db:push`, seed via `pnpm db:seed`.
- **Fixtures/seed data:** the heart lesson MDX and GLB under `assets/heart/`; seed script inserts lesson/hotspot rows.
- **Environment variables:** `DATABASE_URL`, `BETTER_AUTH_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `LLM_PROVIDER` (`gemini` | `openai`), `LLM_API_KEY`, `EMBEDDING_MODEL`, plus Cloudflare KV binding for anonymous sessions.
- **Start/stop commands:** `pnpm dev` and `pnpm dev:api`; stop with Ctrl+C.

### Pass Criteria

- Every required command exits `0`.
- Coverage gate: **80% line and branch coverage on logic-bearing modules** (mastery, retrieval/scoring, prompt assembly, validation, badge logic). Content, config, and UI glue are excluded from the gate.
- Every acceptance criterion has a test or a documented evidence artifact.
- No new Critical or High review findings remain.

### Browser Verification

Use the in-app browser skill (never a phase subagent). Start `pnpm preview --host 127.0.0.1 --port 4321` in the background with a long timeout, then visit the built site with an explicit tab ID.

- **When:** after Phase 2 (scene) and Phase 6 (polish), at every `conductor-review` gate, and after every review-fix round before re-review. Skip for non-UI phases.
- **What to check:** catalog loads and renders; lesson poster and prose are present; "Start interactive 3D view" produces a framed, correctly lit model; hotspot clicks/anchors change the active section; tutor disclosure and citations render; `/verify/` loads; console has no unexpected errors. A static preview has no Worker, so `/api/*` 404s are expected and must be noted, not counted as failures.
- **Fallbacks to exercise:** `?rendererErrors=1` (WebGPU → WebGL) and `?rendererErrors=2` (WebGPU → WebGL → poster). Confirm the model stays framed and lit on WebGL as well as WebGPU.
- **Evidence:** append a dated section to `conductor/tracks/<track-id>/verification/browser.md` with the URLs, actions, observed results, console findings, and verdict. Screenshots may be captured but are not committed; keep large binaries under `.conductor/evidence/browser/` (gitignored).

### Evidence

Write a report to:

```text
conductor/tracks/<track-id>/verification/phase-<n>.md
```

Include: title; track, phase, date, branch, base and head commits; result (`verified`, `failed`, `blocked`, or `partial`); a commands table (layer, command, exit, summary); an acceptance-criteria table (ID, criterion, evidence, status); evidence paths; deviations; and notes. Put binaries, screenshots, and large reports under `.conductor/evidence/`; that directory is gitignored. The report itself is committed with the track.

### Fallback Ladder

1. Run the full configured layer.
2. If a service is missing, start it with the documented command.
3. If it still cannot run, run the narrowest reliable subset and mark the phase `partial` with the reason.
4. Stop and ask the user (via the question tool) only for credentials, hardware, or an external approval.

### Retry Policy

- A failed check may be fixed and re-run at most **2** times.
- If it still fails, report `failed` with the command and output.
- Never mark a phase `verified` when a required check did not run.

### Human-Only Exceptions

- Cloudflare account credentials and deploy approval.
- GitHub OAuth app credentials (client ID/secret).
- LLM provider API keys.
- WebGPU-capable hardware for visual verification.

## Quality Gates

Before a phase is accepted:

- [ ] Required tests pass
- [ ] Coverage gate met for logic-bearing modules
- [ ] Lint and format checks pass
- [ ] Typecheck passes
- [ ] Build passes
- [ ] Code follows the applicable `conductor/code_styleguides/`
- [ ] No secrets, credentials, or PII are introduced
- [ ] Public behavior is documented when it changed
- [ ] Evidence is written and linked in `plan.md`
- [ ] Browser verification is recorded for UI-bearing phases
- [ ] Browser verification is recorded at review and after every fix round

## Commit Guidelines

### Message Format

```text
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: new feature
- `fix`: bug fix
- `docs`: documentation only
- `style`: formatting
- `refactor`: behavior-preserving change
- `test`: tests only
- `chore`: maintenance

Task-level commits are made by the phase subagent. The primary squashes them into one phase commit on acceptance, unless a foreign commit landed in the range. The plan update is a separate state commit.

## Definition of Done

A track is complete when:

1. Every phase is `verified` with a checkpoint and evidence.
2. The integrated verification on the track branch passes.
3. Review is `PASS`, or every finding is fixed, accepted with a reason, or tracked as an issue. No Critical or High finding remains unresolved without an explicit user override recorded in `review.md`.
4. Browser verification evidence is recorded at review and after the final fix round, with no unresolved visual or console defect.
5. Post-review documentation sync is complete.
6. The registry and `metadata.json` show the track as complete.
7. When a remote exists, the branch is pushed. When `pr.enabled` is true, a PR is open (`pr_url` is set); if PR creation could not run, `pr_url` is null and the failure is reported in the completion message. When `pr.enabled` is false, no PR is expected.

## Emergency Procedures

### Critical Bug in Production

1. Create a hotfix branch from the configured base.
2. Write a failing regression test.
3. Implement the minimal fix.
4. Run the full verification strategy.
5. Open a PR immediately; do not batch unrelated work.

### Data Loss

1. Stop all write operations.
2. Restore from the latest verified backup.
3. Verify data integrity.
4. Document the incident and update the recovery procedure.

### Security Breach

1. Rotate all affected secrets.
2. Review access logs.
3. Patch the vulnerability.
4. Notify affected users when required.
5. Document the incident and update the security procedure.

## Deployment

### Pre-Deployment Checklist

- [ ] All required checks pass
- [ ] Coverage gate met for logic-bearing modules
- [ ] Migrations reviewed and reversible
- [ ] Environment variables configured
- [ ] Backup created
- [ ] Rollback plan documented

### Deployment Steps

1. Merge the track PR.
2. Tag the release.
3. Deploy the Worker with Wrangler and the static Astro output to Cloudflare.
4. Run migrations.
5. Verify the critical path (catalog → lesson → tutor).
6. Monitor errors and key metrics.

### Post-Deployment

1. Monitor analytics and error logs.
2. Gather user feedback.
3. Record follow-ups as issues or a new track.

## Continuous Improvement

- Review this workflow after each track.
- Update commands and verification layers when the tooling changes.
- Record recurring review findings as process improvements.
- Keep the process as small as the project allows.
