# Earth Interior Topic Proof

## Overview

Add **Inside Earth**, a second Perspectra lesson, to prove that the platform can host a subject unrelated to anatomy using only content, scene manifests, and assets. The lesson uses a detailed semi-realistic procedural 3D cutaway, six hotspots, grounded tutor answers, quizzes, mastery/FSRS, and a verifiable credential on the public workers.dev deployment.

## Problem and Motivation

Perspectra's architecture is topic-agnostic, but production currently demonstrates only one heart lesson. Tests support the claim; a visually distinct second subject must prove it to reviewers. The new lesson must also expose any remaining topic-specific assumptions as generic pipeline fixes rather than one-off patches.

## Goals and Metrics

- Two production lessons work end to end.
- Earth's interior introduces zero topic-specific TypeScript.
- Both lessons pass production E2E, browser, accessibility, and Lighthouse gates.
- Existing production users and progress are preserved.
- A reviewer can move from catalog to Earth lesson to tutor to quiz to mastery to badge without developer assistance.

## Scope

### In Scope

- One English lesson, **Inside Earth**, with approximately six hotspots.
- Hotspot IDs: `crust`, `upper_mantle`, `lower_mantle`, `outer_core`, `inner_core`, `lithosphere`.
- Layered MDX prose with NASA/USGS factual references.
- Original procedural Blender GLB, deterministic recipe, optimized WebP poster, and retained PNG source if useful.
- Detailed semi-realistic cutaway: procedural surface relief, visible layer boundaries and strata, distinct crust/mantle/metal materials, warm core emission, and subtle motion.
- Generic scene manifest and existing two-way hotspot/prose binding.
- Topic-neutral catalog copy and an Earth Science category.
- Additive Neon seed and Gemini embedding ingestion.
- Production verification of tutor, citations, quiz, mastery, FSRS, badge, and verifier.
- Stale completed-run cleanup and documentation updates.

### Out of Scope

- Additional lessons beyond this proof.
- Custom domains, automatic deployment, cohorts, IRT, LTI, xAPI, or other new product features.
- Destructive production database reset or migration of existing users/progress.
- Committed credentials, private diagnostics, or restrictive third-party assets.
- Photorealism that violates the agreed asset/performance budgets.

## Functional Requirements

- **FR-1:** Author complete Earth-interior MDX with six validated hotspots, layered explanations, and source links.
- **FR-2:** Generate an original deterministic Blender model with named meshes matching hotspot IDs, detailed semi-realistic materials/geometry, subtle motion support, and an optimized poster.
- **FR-3:** Drive the scene through the existing generic manifest and preserve two-way hotspot/prose binding, keyboard access, reduced motion, and renderer fallbacks.
- **FR-4:** Generalize catalog and lesson framing so the platform presents multiple subjects rather than anatomy only.
- **FR-5:** Seed the lesson and ingest 1536-dimensional Gemini embeddings additively and idempotently.
- **FR-6:** Support grounded tutor, citations, quizzes, mastery, FSRS, and badge issuance for Earth without heart vocabulary.
- **FR-7:** Keep topic onboarding content/manifest/asset-only, allowing generic pipeline fixes but no Earth-specific TypeScript.
- **FR-8:** Produce local/production verification, browser evidence, updated docs, and a portfolio demo.

## Non-Functional Requirements

- **NFR-1:** No Earth-specific branches or constants in renderer, retrieval, quiz, mastery, or badge code.
- **NFR-2:** Catalog and both lessons meet Lighthouse performance/accessibility >=95 and best-practices/SEO >=90.
- **NFR-3:** Earth retains keyboard access, reduced-motion behavior, and WebGPU to WebGL to poster fallback.
- **NFR-4:** Visual quality is reviewed at desktop and mobile sizes with no cropping, washed-out materials, broken cutaway edges, or misaligned hotspots. Assets are original or permissively licensed; NASA/USGS are factual references only.
- **NFR-5:** Seed/embed/deploy operations are repeatable and preserve existing production data.
- **NFR-6:** No production secret, identifier, cookie, or private diagnostic is committed.
- **NFR-7:** `pnpm verify:full`, production E2E, real-service smoke, and browser verification pass before completion.

## Acceptance Criteria

- **AC-1 -> FR-1, FR-3:** Earth renders six working hotspots with matching prose and valid build-time contracts.
- **AC-2 -> FR-2, NFR-4:** GLB and poster meet size budgets, named-mesh validation, and desktop/mobile visual-quality review.
- **AC-3 -> FR-4:** Catalog presents Cardiovascular and Earth Science without anatomy-only hero copy.
- **AC-4 -> FR-5, NFR-5:** Production contains both lessons and Earth embeddings at exactly 1536 dimensions; existing rows remain.
- **AC-5 -> FR-6:** Earth tutor returns grounded, cited answers and preserves off-topic/static fallback behavior.
- **AC-6 -> FR-6:** Earth quiz updates mastery/FSRS and issues/verifies a lesson-correct badge.
- **AC-7 -> FR-7:** Source audit finds no Earth-specific TypeScript logic.
- **AC-8 -> FR-8, NFR-2, NFR-7:** Production E2E, smoke, Lighthouse, and browser fallback checks pass for both lessons.
- **AC-9 -> FR-8, NFR-6:** Secret and tracked-file audits pass; documentation contains no private values.
- **AC-10 -> FR-8:** Demo evidence shows the complete public Earth learning loop.

## Edge Cases

- Missing or mismatched scene hotspot IDs fail the build.
- Incorrect Gemini dimensions or failed ingestion leave existing vectors intact.
- Gemini outages return static excerpts rather than blocking lesson access.
- Duplicate seed/ingest runs do not duplicate lessons or embeddings.
- Renderer failure preserves full prose and the poster fallback.
- Detailed geometry/textures do not regress Lighthouse budgets.

## Dependencies

- Completed `20261124-public-deployment` track.
- Existing Blender/MCP asset pipeline and Workers/Neon/Gemini production setup.
- NASA and USGS factual references.

## References

- NASA Earth facts: https://science.nasa.gov/earth/facts
- USGS Earth interior: https://pubs.usgs.gov/gip/interior
- USGS lithosphere definition: https://apps.usgs.gov/thesaurus/term-simple.php?thcode=2&code=667

## Assumptions

- One focused lesson is sufficient for the first multi-topic proof.
- The six hotspot IDs above are stable.
- Manual workers.dev deployment remains the release method.
- Scientific prose uses simplified, reviewer-readable explanations with source links.
