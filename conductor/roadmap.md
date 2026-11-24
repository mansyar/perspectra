# Conductor Roadmap

<!-- next-rm-id: 7 -->

> Planned and future work. The roadmap stores **intent** — ordering, priority,
> and dependencies — not live state. `conductor-status` joins every entry whose
> `track` column is filled to that track's real metadata and registry state, so
> this file never has to be kept in sync by hand. Reorder rows within a bucket
> to set sequence. Use `conductor-roadmap` to add, refine, promote, or drop
> items; do not hand-edit the `id` or `track` columns.

## Now

| id | title | type | priority | depends_on | track | origin |
| --- | --- | --- | --- | --- | --- | --- |
| RM-6 | Deploy the public vertical slice on one Cloudflare Workers origin with Gemini-native embeddings and production proof | chore | high | — | — | user |
| RM-5 | Establish release readiness with CI, real DB scripts, deployment runbook and clean status | chore | high | — | — | user |
| RM-1 | Build multi-topic library with 3–5 more subjects and prove topic-agnosticism | feature | high | — | — | user |

## Next

| id | title | type | priority | depends_on | track | origin |
| --- | --- | --- | --- | --- | --- | --- |
| RM-2 | Add cohort learning, shared progress and team goals without public leaderboards | feature | medium | RM-1 | — | user |
| RM-3 | Deepen assessment with IRT adaptive tests, richer SRS scheduling and rubric grading | feature | medium | RM-1 | — | user |

## Later

| id | title | type | priority | depends_on | track | origin |
| --- | --- | --- | --- | --- | --- | --- |
| RM-4 | Open the platform with LTI 1.3 / xAPI / cmi5, external authors and post-OB3 credentials | feature | low | RM-2, RM-3 | — | user |

## Dropped

| id | title | reason |
| --- | --- | --- |
