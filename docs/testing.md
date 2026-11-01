# Testing

## Strategy: e2e first

Piskel is mostly UI glue between jQuery event handlers, pubsub events,
canvases and browser storage. The bugs that matter happen at those seams,
so the main safety net is the **Playwright e2e suite**, which drives the
real, built editor in a browser.

- **New behavior and bug fixes get an e2e test.** For a bug fix, the test
  should fail without the fix.
- **No mocked unit tests.** Tests that stub controllers, services, pubsub
  or the DOM mostly restate the implementation: they break when code is
  refactored and rarely catch real bugs. Don't add them, even when a unit
  test looks quicker to write.
- **Unit tests are for pure logic only**: pixel and color math, model
  operations, serialization round-trips, algorithms such as flood fill or
  color sorting. Even then, only write one when an e2e test would be
  impractical (e.g. many edge cases of one function).

## Tests as the refactor's safety net

The codebase is about to be modernized without changing behavior (see
[plans/modernization.md](plans/modernization.md)). The e2e suite is what
proves that behavior was preserved, which shapes how tests are written:

- **Test behavior, not structure.** A test that has to change because code
  moved or was renamed is testing structure.
- **Close gaps before migrating an area.** List them as described in
  [Finding test gaps](#finding-test-gaps) and fill the relevant ones
  first, against the old code, so the migration is checked against tests
  that already passed.

## Running tests

Commands are listed in [AGENTS.md](../AGENTS.md#commands). A few things to
know:

- `npm run e2e` builds the app and serves it on port 9001
  (`npm run start:test`) unless a server is already running there. **A
  stale server means stale code**: stop it after changing `src/`.
- Run one spec with `npx playwright test <path>`, or one test with
  `npx playwright test <path> -g "<test name>"`. Run the tests for a spec
  claim with `npx playwright test --grep @<claim-id>`.
- `npm run e2e:interactive` opens the Playwright UI, which is useful for
  stepping through a failing test.
- Unit tests (`npm run unit-tests`) run in headless Chrome downloaded by
  Puppeteer.
- CI runs both suites on Ubuntu and macOS. Shortcuts and some rendering
  differ between platforms; use `CMD_OR_CTRL` / `MODIFIER_LABEL` from
  `testutils.ts` rather than hard-coding `Control` or `Meta`.

## Finding test gaps

Every claim in a [feature spec](specs/README.md) has an id, and e2e tests
reference the claims they check as tags (see
[Claim ids](specs/README.md#claim-ids)). A claim that no test references
is a test gap. To list them:

```
npm run spec-check
```

It prints the number of claims, how many are referenced by tests, then
each untested claim with the spec file and line where it is written.
`--quiet` prints only the counts (the pre-commit hook uses it). The same
command fails on duplicate ids and on tags that reference unknown ids.

The current gaps are also recorded in
[specs/untested.txt](specs/untested.txt), and that list may only shrink.
This is how new gaps get noticed: `spec-check` runs in the pre-commit hook
and in CI, and fails when

- a claim has no test and isn't in the list (a new gap): tag a test with
  the claim, or, if it can't be tested yet, add its id to the list so the
  gap shows up in review;
- a listed claim is now tested, or no longer exists: remove it from the
  list.

`npm run spec-check -- --update-baseline` rewrites the list from the
current state.

What the list doesn't tell you:

- **"Referenced" is not "fully covered".** A claim counts as tested as
  soon as one test is tagged with it. A claim can cover several rules
  (e.g. a tool and its modifiers); the specs split out a rule only when it
  needs to be reported on its own. Read the tagged tests
  (`npx playwright test --list --grep @<claim-id>`) to see what is
  actually checked.
- **Only tagged tests count.** The recorded drawing tests
  (`tests/e2e/playwright/drawing/`) and the unit tests aren't tagged, so
  what they cover still shows up as a gap.
- **Coverage notes that don't fit a claim**, such as manual test sprites
  or behavior only checked by unit tests, are in
  [known-issues.md](known-issues.md).

## Writing an e2e test

### Where to put it

- `tests/e2e/playwright/integration/<spec>/` holds the tests for the
  feature spec `docs/specs/<spec>.md`: the folder is named after the spec
  file (`frames.md` → `integration/frames/`). Add to an existing file when
  one covers the feature. A test that spans features goes in the folder of
  the feature it checks; keyboard shortcut tests go in
  `integration/keyboard-shortcuts/` unless they are about one feature only.
- A new spec gets a new folder; don't create folders that match no spec.
- Tag each test with the spec claims it asserts:
  `test('...', { tag: ['@layers.rename'] }, async ({ page }) => ...)`.
  Only tag what the test checks; `npm run spec-check` rejects unknown ids.
  See [specs/README.md](specs/README.md#claim-ids).
- `tests/e2e/playwright/drawing/` replays recorded drawing sessions (see
  below). They exercise several features at once. Prefer `integration/`
  tests for new work.
- Fixtures (`.piskel` files, images) go under `tests/e2e/data/`; the test
  server serves that folder.

### Use the helpers

`tests/e2e/playwright/testutils.ts` covers most needs. Read it before
writing a new helper. The main ones:

| Need | Helper |
| --- | --- |
| Open the editor and wait until it is ready | `openEditor(page)` |
| Start from a known sprite | `setPiskelFromGrid(page, grid)` (`R`/`G`/`B`/`T` cells), `setPiskelFromImageSrc` |
| Pick a tool | `clickTool(page, "tool-pen")` |
| Draw with real mouse events | `drawAtPixel`, `dragBetweenPixels` |
| Assert on pixels | `waitForGrid(page, w, h, rows)` (`X` = filled, `.` = empty), `waitForPixelUpdate`, `getPixelColor` |
| Read document state | `getCurrentPiskelWidth/Height/FrameCount/LayerCount`, `getCurrentFrameIndex`, ... |
| Colors | `setPrimaryColor`, `getPrimaryColor`, `colorToInt`, `TRANSPARENT` |
| Settings drawers | `openResizeSettingsPanel`, `openExportSettingsPanel`, ... |
| Find elements | `testId(page, id)` (matches `data-test-id`) |
| Undo / redo | `undo(page)`, `redo(page)` |
| Wait for async state | `waitFor(fn)` |

A typical test:

```ts
test("pen tool: draws single pixels", async ({ page }) => {
  await openEditor(page);
  await setPiskelFromGrid(page, emptyTestGrid());
  await clickTool(page, "tool-pen");
  await drawAtPixel(page, 2, 2);
  await waitForGrid(page, 10, 10, ["..........", "..........", "..X.......", /* ... */]);
});
```

### Guidelines

- **Act like a user, assert on state.** Drive the UI with real clicks, key
  presses and mouse moves. Assert on document state through the
  `testutils.ts` helpers, or by decoding exported images
  (`decodePngDataUrl`). Don't compare raw base64 strings, and only use
  screenshot comparisons for things that are purely visual.
- **Access app internals only through `testutils.ts`.** Helpers read the
  app through `window.pskl`, which the modernization will change. Keeping
  that access in one file means the suite can be moved to a new test API
  without rewriting every spec. If you need something new, add a helper
  instead of calling `page.evaluate(() => window.pskl...)` in a spec.
- **Set up state directly, then test the feature.** Use `setPiskelFromGrid`
  and similar shortcuts to get to the starting point quickly. Only go
  through the UI for the part under test.
- **Never use fixed sleeps to wait for state.** Use `waitFor`,
  `waitForGrid`, `waitForPixelUpdate` or Playwright's auto-waiting
  `expect(locator)` assertions. `wait(ms)` exists but is a last resort.
- **Select elements by `data-test-id`.** Add one to the template when a
  test needs to target an element that lacks one; don't rely on CSS classes
  that exist for styling.
- **Tests must be independent.** Each test opens a fresh editor. Don't
  depend on order or on state left behind by another test (browser storage
  is per-test in Playwright).
- **Keep tests small.** One behavior per test, with a descriptive name.

### Recorded drawing tests

The `drawing/` specs open the editor with `?test-run=<file>` and replay a
JSON recording of mouse and keyboard events (`src/js/devtools/`). The
editor compares the result with the recorded expected output and shows
`OK` in `#drawing-test-result`. Recordings are made by opening the editor
with `?test=true`. These tests are hard to read and update, so prefer
`integration/` tests for anything new.

## Flaky tests

Playwright retries failing tests 3 times (`playwright.config.ts`), so a
flaky test can make a run look green. Treat any test that needed a retry as
a bug:

1. Reproduce it with `npx playwright test <path> --repeat-each=20`, ideally
   while the rest of the suite runs to add CPU contention.
2. Look for the usual causes: a fixed sleep, reading state before an
   async render or worker finished, coordinates computed before layout
   settled.
3. Fix the cause (wait on the actual condition). Don't just raise timeouts.

Known flaky test: `should show drag origin during rectangle selection`
(in `integration/canvas/`) sometimes reports
coordinates off by one. Increasing the relayout wait did not fix it; the
leading hypothesis is web fonts loading after the zoom is computed.

## Environment notes

- Headless Chrome may fail to launch in some sandboxes (Puppeteer's
  downloaded Chrome can be incomplete). If you cannot run a suite, say so
  explicitly; don't report it as passing.
- Tests are not linted by biome; `npm run lint` only checks `src/`.
