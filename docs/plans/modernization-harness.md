# Modernization Harness

The migration is mostly done by agents, so it is only as safe as the
checks that verify each change. The harness has four parts, which are
built in this order (see [Steps](#steps)).

## 1. A working test environment

Agents must be able to run the full test suites (Karma and Playwright, in
headless Chrome) where they work. A migration change that could not be
verified is not done. This is a prerequisite: a previous attempt could not
launch headless Chrome in its sandbox, so its changes were never verified
against the tests.

## 2. A trustworthy baseline

- The e2e suite runs **with retries disabled** (`--retries=0`) for
  migration work. A green run that needed retries hides real regressions.
- Before migration starts, `master` passes the full suite with zero
  retries, several times in a row. Flaky tests are fixed, or quarantined
  with an issue and a note in [testing.md](../testing.md#flaky-tests).

## 3. Behavior oracles

The e2e suite only checks what it tests. Migration work is also checked by
**differential oracles**: run the baseline build and the migrated build on
the same inputs and require identical results.

- **Namespace snapshot.** A script loads a build and dumps the shape of the
  `window.pskl` tree (every path and its `typeof`, plus function arity).
  Until the globals are intentionally removed, the snapshot of a migrated
  build must equal the baseline's. This catches missing or misresolved
  exports and shadowed built-ins, the bugs a codemod typically introduces.
- **Golden outputs.** A corpus of `.piskel` files (`tests/e2e/data/`,
  `misc/gif-tests/`, plus files saved by older versions) is loaded,
  re-serialized, and exported (PNG spritesheet, GIF, ZIP, C file) by both
  builds. Outputs must be identical: byte-for-byte where the encoder is
  deterministic, pixel-for-pixel otherwise.
- **Recorded drawing sessions.** The devtools replay (`?test-run=`, see
  [testing.md](../testing.md#recorded-drawing-tests)) already compares a
  replayed session with a reference image. Recording more sessions is cheap
  extra coverage of tools and history.
- **Static checks**: lint, no circular imports, no new globals, and type
  checking once TypeScript is introduced.

## 4. One verification command

`npm run verify:migration` runs everything a migration change must pass:
lint, build, unit tests, e2e with zero retries, the namespace snapshot diff
and the golden-output diff. CI runs the same command, so an agent's local
result and CI agree. It is the [definition of done](#definition-of-done-per-unit)
in executable form.

## Agent tooling

Encoded in `.claude/` so every agent session works the same way:

- **A `migrate-directory` skill** that walks through the
  [workflow](#workflow-per-unit) below.
- **A reviewer agent** (read-only tools, fresh context) that reviews each
  migration diff against this plan's rules, adversarially.
- **A Stop hook** that runs `npm run verify:migration` when the agent
  finishes, so it cannot report success while checks fail.
- **A permissions allowlist** for the build and test commands, so agents
  don't stall on prompts.

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
