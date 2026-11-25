# Reviewer walkthrough

This is the exact three-minute path through the Perspectra Showcase MVP. Every step has a deterministic fallback: if a service is unavailable, keep going with the prose lesson.

## 0. Before you start

```bash
pnpm install
pnpm dev
```

Open `http://localhost:4321/`. Optional: sign in with GitHub, Google, or email/password to unlock the full suite. Anonymous visitors still see static excerpts and can ask two tutor questions.

## 1. Catalog

- You see one live card, **The Human Heart**, and three clearly labeled coming-soon placeholders.
- View source: the catalog HTML contains no `<script>` tag. It is static Astro output, 0 KB of shipped JavaScript (`AC-1`).
- Click **Open lesson**.

## 2. Lesson shell and hotspot ↔ prose binding

- The poster appears first, then the interactive scene when WebGPU or WebGL is ready. If neither is available, the poster stays and a notice explains that the lesson text is complete below.
- Scroll the landmark list: each entry jumps to a `<div id="..." data-hotspot="...">` prose section.
- Click the **Aorta** hotspot button (or the 3D mesh). The `aorta` prose section highlights and scrolls into view; the scene's `data-active-hotspot` becomes `aorta` and the camera target moves.
- Scroll back up: the prose binder sets the active hotspot from the visible section, closing the loop.

**Fallback check:** add `prefers-reduced-motion: reduce` in your OS/browser (or DevTools rendering settings). Camera tweens, heartbeat pulse, and flow particles stop; clicking a hotspot still highlights and scrolls the prose (`AC-19`).

## 3. Tutor with a citation

- The right dock shows the **AI disclosure** and **privacy note** before you type anything (`AC-20`).
- Click the **Left ventricle** chip or type: “Why does the left ventricle have thicker walls?”
- The answer streams one JSON SSE delta at a time. At least one citation looks like `[[heart:left_ventricle:overview]]`.
- Click the rendered citation button. Prose scrolls to the source section and the scene focus moves to that hotspot (`AC-8`).
- Try an off-topic question (“What is the weather?”): it is rejected before generation and you get the static excerpt (`AC-9`).
- Ask three questions without signing in: the third returns a graceful sign-in hint plus the excerpt (`AC-6`).
- After 16 turns, or when a daily quota is exhausted, the same graceful-limit path applies (`AC-10`).

**Fallback check:** with the Worker stopped, the prose lesson and static excerpts still work. No answer is a hard failure.

## 4. Quiz and remediation

- Click **Generate question**. The Worker builds a strict JSON question from the active hotspot's MDX section; the browser never receives the answer key.
- Pick one of four options and submit. The result shows an explanation and a remediation link such as **Review aorta** (`AC-11`).
- Click remediation: it calls `focusHotspot('aorta')`, scrolling the prose and moving the scene focus.

## 5. Mastery and FSRS

- The mastery heatmap now shows the aorta cell above the previous value and a **Next** recommendation (`AC-12`).
- A **Due cards: N** summary reflects the FSRS schedule created after the quiz answer. Untouched hotspots start at a 0.2 prior.
- The heatmap refreshes automatically after grading via a custom page event.

## 6. Badge and public verifier

- Reach 0.85 mastery on all six hotspots. Click **Issue badge**.
- The Worker issues an Open Badge 3.0 credential with a `DataIntegrityProof` (`hmac-sha256`) and returns `{credential, verifyPath}`. Below the threshold, issuance returns 403 with the list of failing IDs (`AC-14`).
- Follow `/verify`. Paste or auto-load the encoded credential. The page shows achievement, issuer, and issuance date.
- Change one character in the credential and verify again: the signature check fails and no details are shown (`AC-15`).

## 7. Offline queue

- Go offline in DevTools, answer a question or mark a hotspot, and watch the event land in IndexedDB via `src/lib/offline-queue.ts`.
- Reconnect: `/api/progress/sync` drains the queue. Replaying the same batch does not create duplicate events because the server deduplicates by event ID and applies last-write-wins (`AC-13`).

## 8. Graceful degradation summary

| Failure | What the reviewer still sees |
| --- | --- |
| No WebGPU | WebGL scene |
| No WebGPU/WebGL | Poster + complete prose |
| GLB missing | Poster + complete prose |
| LLM down / quota / off-topic / bad citation | SSE error + static MDX excerpt |
| Auth down | Sign-in prompt, public catalog and prose |
| Database down | Queued events remain local; prose unaffected |
| Reduced motion | No tweens/particles; prose and hotspots still keyboard reachable |

## Developer verification

```bash
pnpm verify        # lint, format, typecheck, unit, coverage, integration, build
pnpm verify:full   # + smoke, non-perf Playwright, then serial @perf
pnpm test:a11y     # axe audit
pnpm perf:lighthouse  # Lighthouse score and budget checks
pnpm test:perf        # @perf only, single worker (used by verify:full/CI)
```

Evidence and per-phase results are in `conductor/tracks/20261124-showcase-mvp/verification/`.
