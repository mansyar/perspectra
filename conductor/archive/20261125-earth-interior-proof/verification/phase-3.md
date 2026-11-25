# Phase 3 Verification — Generic Learning Loop & Additive Ingestion

- **Track:** `20261125-earth-interior-proof`
- **Phase:** 3
- **Date:** 2026-11-25
- **Branch:** `feat/20261125-earth-interior-proof`
- **Phase base:** `0d3ff7d38857659ccd3e69f3f17940289fb80ae6`
- **Source head under verification:** `5cbdf9111730a0343b057de4583520b54cd75214`
- **Result:** `VERIFIED`
- **Browser gate:** `PASS — static-preview UI and graceful API-fallback review`

Phase 3 made lesson seeding and embedding ingestion additive across all discovered MDX lessons,
removed heart-only badge display logic, grounded quiz/badge/mastery vocabulary in the requested
lesson's chunks, and exercised the complete Heart and Earth learning loops. Production ingestion
and deployment remain Phase 4 work. No real Gemini, Neon, database, Wrangler, or private-environment
commands were run.

## Final verification

Command: `pnpm verify:full`  
Exit code: `0`  
Source commit: `5cbdf9111730a0343b057de4583520b54cd75214`

| Layer | Result |
| --- | --- |
| Lint | Zero errors; five pre-existing warnings in `offline-queue.ts` and `worker-assets.test.ts`. |
| Format | All 102 matched files correctly formatted. |
| Typecheck | Passed. |
| Unit | 185 tests passed across 21 files. |
| Coverage | 98.63% statements, 92.89% branches, 97.89% functions, 99.13% lines. |
| Integration | 66 tests passed across 7 files. |
| Build | Four static pages built, including `/lessons/earth-interior/`. |
| Smoke | Two Heart/Earth scene smoke tests passed. |
| E2E | 32 test outcomes: 31 passed and one allowed Lighthouse retry passed. Both learning-loop cases passed. |

The full output is retained at:
`C:\Users\Ansyar\.local\share\opencode\shell\50ce724efc94a9b6112c778c8a7e31212e06687c\sh_211121daa001EzKgbBHHXxZPSP.out`

### Lighthouse

Thresholds and per-path isolation were unchanged.

| Path | Accessibility | Best practices | Performance | SEO | Result |
| --- | ---: | ---: | ---: | ---: | --- |
| `/` | 1.00 | 0.96 | 1.00 | 1.00 | Passed first attempt |
| `/lessons/heart/` | 1.00 | 0.96 | 0.99 | 1.00 | Passed first attempt |
| `/lessons/earth-interior/` | 1.00 | 0.96 | 0.99 | 1.00 | Passed configured retry |

The first Earth Lighthouse attempt met every numeric budget but Playwright reported the test as
flaky because `chrome.kill()` raised `EPERM` while removing Lighthouse's temporary profile. The
suite's existing single retry completed successfully. No threshold, assertion, or retry setting
was changed.

The build retains the existing Vite warning about a minified chunk larger than 500 KB; this is not
a verification failure.

## Implementation evidence

### Content-driven, idempotent seed

`api/src/lib/lesson-content.ts` parses lesson title, description, and hotspot IDs from MDX.
`api/src/db/seed.ts` discovers every lesson and upserts those fields by lesson ID. The CLI remains
import-safe and opens `DATABASE_URL` only when invoked directly. `seedHeart` and
`heartHotspotIds` remain available for compatibility.

Fake-database unit tests prove discovery includes Heart and Earth and that repeated seeding keeps
one row per lesson while preserving unrelated rows.

### Additive embedding ingestion

`scripts/embed-lessons.ts` exports injectable `ingestLessons` logic while preserving import-safe CLI
behavior. It discovers all lessons, uses shared content parsing, embeds every chunk with purpose
`document`, emits NDJSON, and upserts lesson metadata plus deterministic embedding IDs. It never
deletes existing rows.

Fake-adapter/fake-database integration tests prove:

- Earth yields 18 chunks and the six ordered Earth hotspot IDs.
- All embeddings use the document purpose and exactly 1536 dimensions.
- Two runs produce 76 lesson/embedding upsert calls but retain 37 embedding rows, including an
  unrelated legacy row.
- A wrong-length embedding is rejected before any write.

The README now documents `pnpm db:seed`, dry-run ingestion, `--write`, repeat-run behavior, and
preservation of existing lessons, embeddings, and progress rows.

### Generic learning-loop behavior

- Badge achievement names use the seeded lesson title when available, otherwise a humanized lesson
  ID. A leading article is omitted for display, preserving `Human Heart Mastery` and producing
  `Inside Earth Mastery` without a lesson-specific branch.
- Badge narrative, description, and criteria derive from the requested lesson's chunks. Missing,
  empty, or failed chunk sources return `503 lesson_unavailable` instead of substituting Heart.
- Quiz generation, grading, remediation, mastery, next-best hotspot, and FSRS due cards use the
  requested lesson's source and vocabulary. Missing source returns `400`; unavailable mastery
  vocabulary returns an empty lesson view rather than Heart landmarks.
- `MasteryPanel` requests `/api/mastery?lessonId=<lessonId>` and reloads when `lessonId` changes.
- Tutor prompt policy and UI prompts/privacy wording are topic-neutral.
- Parameterized E2E coverage runs the full catalog → tutor → quiz → mastery/FSRS → badge → verify
  loop for Heart and Earth with lesson-scoped API mocks and no page/console errors.

## Acceptance criteria

| ID | Evidence | Status |
| --- | --- | --- |
| FR-5 | Additive 1536-dimensional lesson/embedding ingestion with fake-driven Earth and repeat-run tests | Verified |
| FR-6 | Earth tutor, quiz, mastery, FSRS, due-card, remediation, and badge coverage without Heart vocabulary | Verified |
| FR-7 | No Earth names or topic branches in runtime TypeScript; shared MDX/test fixtures only | Verified |
| FR-8 | This report records exact results, failed intermediate attempts, retries, and pending browser review | Verified |
| AC-5 | Earth retrieval/citations, off-topic rejection, invalid-citation fallback, and grounded tutor E2E | Verified |
| AC-6 | Earth quiz grading, mastery, next-best, FSRS due cards, badge issuance/verification, and E2E | Verified |
| AC-7 | Runtime topic-specificity audit and targeted searches recorded below | Verified |
| NFR-1 | Existing disclosure, privacy, source locking, citations, and quota behavior preserved | Verified |
| NFR-5 | Seed/ingest use idempotent upserts and retain unrelated rows; no destructive operations | Verified |

## Topic-specificity audit

Searches across `api/src/**/*.ts` and `src/components/**/*.tsx` found no Earth lesson IDs or Earth
hotspot terms in runtime code. The former `lessonId === 'heart'` badge-name branch and anatomy/
clinical prompt wording were removed. No Earth-specific TypeScript branch was added.

The documented no-DB/dev Heart mirror remains in `api/src/lib/retrieval.ts`; production chunk lookup
is lesson-scoped. Existing helper defaults in `quiz.ts` and `mastery.ts` remain for direct caller
compatibility, but request routes supply the requested lesson's chunk-derived vocabulary. The
legacy `HeartScene` filename describes shared generic behavior rather than a runtime topic branch.
Static verification-page sample copy is outside this phase's allowed touches and was not changed.

## Verification history

1. `3599942` implemented content-driven multi-lesson seeding.
2. `9530252` implemented and proved additive Earth embedding ingestion with fakes.
3. `36c2bb0` implemented generic badge/quiz/mastery/tutor behavior, README onboarding, and Earth
   unit/integration/E2E coverage.
4. The first `pnpm verify:full` stopped at lint on an unused schema import in the ingestion test.
5. `6afb4c6` removed that import. The next full run passed every non-browser stage, but both new
   learning-loop tests failed before navigation because fixture paths included trailing slashes
   while catalog links do not.
6. `5cbdf91` corrected the shared fixture paths. The final `pnpm verify:full` exited 0, including
   both learning-loop cases and the allowed Earth Lighthouse cleanup retry described above.

## Primary browser verification

**PASS (static preview).** The primary opened `/lessons/earth-interior/` in the in-app browser and
reviewed the full-page desktop layout. The Earth poster, six lesson landmarks, lesson prose,
tutor disclosure/privacy copy, mastery overview, quiz panel, and footer rendered without visual
regression. Clicking a tutor landmark updated the dock context; clicking “Check understanding”
with no local API produced the intended graceful quiz message. The tutor similarly displayed its
static-prose fallback when `/api/tutor` was unavailable.

The only console errors were expected static-preview 404s for `/api/mastery?lessonId=earth-interior`,
`/api/tutor`, and `/api/quiz/generate`; the static preview has no Worker. Real citation, remediation,
mastery, and credential behavior is covered by the passing mocked browser E2E suite and will be
exercised against production in Phase 4. Responsive Earth layout was already verified at 390×844
in Phase 2 with no horizontal overflow.

## Primary verification

| Command | Exit | Result |
| --- | ---: | --- |
| `pnpm verify:full` | 0 | 185 unit tests, 66 integration tests, 2 smoke tests, four-page build, and 32 Playwright outcomes passed; two isolated Lighthouse cases passed their one permitted cleanup retry. |
| In-app browser static-preview pass | n/a | Earth learning-loop UI and intended API-unavailable fallbacks passed; only expected `/api/*` 404s. |

The primary diff from `0d3ff7d...` contained only the declared Phase 3 source, tests, docs, and
evidence files. No deployment, database mutation, private environment read, or Conductor-state edit
was performed by the primary browser pass.

## Deviations

None.

## Phase commits

- `3599942` — `feat(db): seed every discovered lesson`
- `9530252` — `test(ingest): verify additive Earth embeddings`
- `36c2bb0` — `feat(learning): ground the Earth learning loop`
- `6afb4c6` — `test(ingest): remove unused schema import`
- `5cbdf91` — `test(e2e): match catalog lesson links`
- Phase 3 evidence commit — `docs(conductor): record phase 3 verification`

No plan, metadata, registry, package, lockfile, coverage configuration, deployment, database, or
`.opencode/agents/**` file was edited by this phase executor.
