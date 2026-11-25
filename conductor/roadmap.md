# Conductor Roadmap

<!-- next-rm-id: 9 -->

> Planned and future work. The roadmap stores **intent** — ordering, priority,
> and dependencies — not live state. `conductor-status` joins every entry whose
> `track` column is filled to that track's real metadata and registry state, so
> this file never has to be kept in sync by hand. Reorder rows within a bucket
> to set sequence. Use `conductor-roadmap` to add, refine, promote, or drop
> items; do not hand-edit the `id` or `track` columns.

## Now

| id | title | type | priority | depends_on | track | origin |
| --- | --- | --- | --- | --- | --- | --- |
| RM-7 | Add persistent sign-in/navigation and inline auth calls to action | feature | high | — | — | user |
| RM-8 | Correct verifier production copy and sample credential styling | bug | high | — | — | user |

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
