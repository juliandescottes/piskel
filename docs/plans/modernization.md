# Modernization

> **Status: partial draft.** The goal, decisions and target conventions are
> not written yet. The harness (how migration work is verified and
> conducted) is drafted below. Until the plan is complete, do not start
> migration work without explicit instructions from a maintainer.

## Goal

TODO: target state of the codebase (ES modules, classes, TypeScript; build;
test runner), and what is explicitly out of scope.

## Decisions

TODO: decisions made and why, with rejected alternatives (e.g. incremental
migration vs rewrite, order of the steps, which libraries stay).

## Target conventions

TODO: how new and migrated code is written (imports, classes, types,
naming, no new globals). Once written, these take precedence over legacy
patterns found in the code.

## Harness

See [modernization-harness.md](modernization-harness.md).

## Rules for migration work

- **No behavior change in a migration PR.** Bugs found along the way are
  logged (issue, or the spec's "Known issues"), not fixed in the same PR.
- **Close test gaps before migrating an area.** Each
  [spec](../specs/README.md) lists untested behavior under "Test gaps". Fill the
  gaps relevant to the area first, in a separate PR, against the old code.
- **Preserve the public contracts** listed in
  [architecture.md](../architecture.md#public-contracts).
- **Mechanical first.** Conversions are done by a deterministic codemod
  where possible. Agents handle what the tool flags as unsupported, and fix
  the tool rather than hand-patching its output, so a re-run reproduces the
  result.
- **Tool output is not evidence of correctness.** "All files converted, no
  errors" says nothing about whether the result is right. Every converted
  file is reviewed in the diff, and the oracles must pass.
- **Small units.** One directory (or one tightly coupled group of files) per
  PR, in dependency order: leaves first.
- **Report honestly.** If a check could not run, the change is not done;
  say so rather than presenting partial verification as a pass.

## Workflow (per unit)

1. Pick the next unit from the [status table](#status), in dependency
   order.
2. Close that area's spec gaps with e2e tests against the current code
   (separate PR, merged first).
3. Run the codemod on the unit; review its output.
4. Resolve whatever the codemod flagged, fixing the codemod when the issue
   is general.
5. Run `npm run verify:migration` until it passes.
6. Have the reviewer agent review the diff; address its findings.
7. Update the status table and any docs or specs whose code pointers
   changed.
8. Open a PR for maintainer review.

## Definition of done (per unit)

- `npm run verify:migration` passes:
  - lint and build clean;
  - unit tests pass;
  - full e2e suite green with zero retries;
  - namespace snapshot identical to baseline (unless the step intentionally
    changes it, and the expected diff is stated in the PR);
  - golden outputs identical to baseline.
- Every file flagged by the codemod has been resolved and reviewed.
- The reviewer agent's findings are addressed or explicitly answered.
- The status table is updated; docs and specs are updated where affected.

## Test API

The e2e suite reads app state through the `window.pskl` globals, which the
migration will eventually remove. To keep the safety net intact:

1. **All app access goes through `tests/e2e/playwright/testutils.ts`.**
   Specs never call `window.pskl` directly. Existing direct calls in specs
   are moved into helpers before migration starts.
2. **A small, explicit test API** (e.g. a `window.__piskelTestApi` object
   exposing the few entry points the helpers need: current piskel, frame
   and layer access, screen ↔ sprite coordinates, settings) is added. The
   helpers are switched to it. TODO: decide its exact surface and whether
   it is exposed in production builds or only in test builds.
3. From then on, the test API is a [public contract](../architecture.md#public-contracts):
   migration steps keep it stable, and the globals can be removed without
   touching the tests.

## Steps

Harness first, then migration.

| # | Step | Status |
| --- | --- | --- |
| H1 | Test environment where agents can run Karma and Playwright | Not started |
| H2 | Zero-retry baseline: fix or quarantine flaky tests | Not started |
| H3 | Move direct `window.pskl` access from specs into `testutils.ts`; add the test API | Not started |
| H4 | Namespace snapshot script and baseline | Not started |
| H5 | Golden-output corpus and diff script | Not started |
| H6 | `npm run verify:migration`, wired into CI | Not started |
| H7 | `.claude/` tooling: skill, reviewer agent, Stop hook, permissions | Not started |
| M… | Migration steps: TODO, once goal and decisions are written | Not started |

## Status

Not started. Next step: H1.

## Appendix: starting point

How the code is structured today, for whoever migrates it. This describes
what is being replaced, not conventions to follow.

- **Module system.** Each file in `src/js` is an IIFE that registers its
  exports on a global namespace tree rooted at `window.pskl`, via
  `$.namespace("pskl.x.y")` (`src/js/utils/core.js`). Inheritance uses
  `pskl.utils.inherit` plus `Parent.call(this, ...)`. `Constants`, `Events`
  and `$`/`jQuery` are separate globals.
- **Load order** is the hand-maintained list in `src/piskel-script-list.js`
  (CSS: `src/piskel-style-list.js`). A file can only use another one at
  load time if it comes earlier in the list; usage inside function bodies
  works in any order. Karma loads the same list.
- **Build.** `npm run build` runs `scripts/sprite.js` (icon spritesheet),
  then `vite build` with custom plugins in `vite-plugins/`. Vite's module
  graph is not used: a virtual no-op entry keeps Rollup happy, and
  `concat-scripts.js` concatenates and minifies the script and style lists.
  `html-include.js` resolves `@@include(...)` and `@@version` in
  `src/index.html`. `scripts/partials.js` derives the piskelapp.com
  partials. `src/piskel-boot.js` loads the bundles and calls
  `pskl.app.init()`.
- **Web Workers** are written as functions in regular scripts and turned
  into Blob URLs at runtime (`WorkerUtils`), so worker code cannot
  reference anything outside its own function body.
- **Known obstacles**: circular references between `Frame`, `Layer` and
  `Piskel`; some namespace members are named like built-ins
  (`pskl.utils.Math`, `Array`, `Event`); the e2e suite depends heavily on
  `window.pskl` (notably
  `pskl.app.drawingController.getScreenCoordinates`).
