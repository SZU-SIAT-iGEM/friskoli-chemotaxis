# Development guide

This document describes the working stable implementation and how to continue development. Player instructions are in [Usage](USAGE.md) and [Rules](RULES.md).

## Environment and commands

Use Node.js 22.12+ with npm; the CI template uses Node.js 24. Install from the committed lockfile with `npm ci`.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite with hot reload |
| `npm run check` | Run strict TypeScript checks |
| `npm test` | Check rules, viewport geometry, and translation keys |
| `npm run validate:maps` | Validate 2,200 deterministic generated maps |
| `npm run build` | Produce the standalone `dist/index.html` |
| `npm run verify` | Run all of the above non-browser checks and build |
| `npm run test:browser` | Run browser journeys with an automatically managed Vite server |
| `npm run preview` | Serve the production build for inspection |
| `npm run balance` | Simulate visible-board strategies; write results to stdout |
| `npm run release:package` | Build and package offline HTML and tracked source files |

Before the first browser run, use `npx playwright install chromium` (on Linux CI, `npx playwright install --with-deps chromium`). Browser tests write screenshots and a report to ignored `output/playwright/`. Run a subset with `npm run test:browser -- table physical`, using the names `table`, `table-games`, `physical`, `readable`, `offline`, or `stable`. The offline check needs a current production build.

## Source map

| Path | Responsibility |
| --- | --- |
| `src/App.tsx` | Session setup, dialogs, records, language/theme controls, and input routing |
| `src/game/engine.ts` | Game state, probabilities, roll/move transitions, score, retry, and forecast |
| `src/game/mapgen.ts` | Seeded terrain, cellular growth, connectivity repair, and turn budgets |
| `src/game/viewport.ts` | Pure pan, zoom, and pinch geometry |
| `src/Board.tsx` | SVG board, route selection, gestures, reveal and movement animation |
| `src/BoothControls.tsx` | Dice pickup/toss, environmental readout, and probability display |
| `src/DiceCube.tsx` | Visual cube faces, lock, cancellation, and toss animation |
| `src/TableFeedback.tsx` | Score animation, Combo feedback, and result breakdown |
| `src/FieldGuide.tsx` | Object explanations and the wall diagram |
| `src/directions.ts` | Shared direction colors and identifiers |
| `src/i18n.ts`, `src/lang/` | Language selection, pack validation, interpolation, and storage helpers |
| `src/assets/` | Bundled artwork and its separate rights notice |
| `scripts/` | Rule/map/browser validation, simulation, and release packaging |

Styling layers load in this order: `index.css`, `play.css`, `field-notes.css`, `booth.css`, `table.css`, `tabletop.css`, and `tabletop-readable.css`. Later layers specialize the tabletop layout and responsive reading sizes. Preserve the order when adjusting styles; earlier shared selectors still support active components. The active UI uses the tabletop display in both quick and generated-map games.

## State and rules

`Game.phase` follows `ready → choose → ready`, with terminal `won` and `lost` states. `roll()` enters `choose`; `move()` consumes the whole matching-face group and processes the straight path. A fresh food endpoint can retain the turn and increase the action count. `rescue()` permits one fully blocked reroll per turn; `waitTurn()` consumes a blocked turn after the retry.

Rule transitions return new state objects. Dice faces use positive integers for mobile dice, zero for a depleted lock, and a negative face for an individually cancelled die. Do not treat a negative face as cancelling the entire matching group. `forecast()` calls the same transition as `move()` without changing the live state or random stream; keep this single rule path for preview accuracy.

`RULE_VERSION` is stored with records and used for ranking groups. It is `1.0` for this release. Change it when scoring, movement, probability, terrain generation, or budgets change enough to affect record comparability. The package version describes the software release; patch releases with unchanged rules can retain the rule identifier.

`createGame()` accepts separate dice and map seeds. Generated terrain uses its own random stream, while rolls advance `Game.rng`. Animations must not sample or advance the gameplay stream. Replaying a map keeps the terrain seed and creates a fresh dice seed.

## Interaction boundaries

The first tile tap selects a run. A second tap on the same tile within 420 ms confirms it only if the move and roll counters match. Pointer movement beyond six pixels suppresses tile activation; multi-touch also suppresses it. Preserve this protection when changing gestures. Keyboard actions use the same engine transition as pointer actions.

Board generation and dice animation temporarily block movement. The tutorial uses six preset pools and `LESSON_FACES` to guide valid actions, then calls the regular scoring and movement functions. It should end at 250 points and never create a leaderboard entry.

The optional browser `document.modelContext` integration registers visible-state reading, rolling, and moving tools only if that API exists. It is not needed for normal play. Preserve the same phase, busy-state, and full-group constraints for these tools.

## Language, storage, and assets

Documentation and comments are English. Built-in player text remains English and Simplified Chinese, with English as the default for a fresh browser. A valid URL language overrides the saved preference. Add any new text to both packs and preserve interpolation placeholders. Imported packs must match the complete built-in schema; pack contents are rendered as text, not HTML. Custom packs are session-only.

Storage access is wrapped to tolerate blocked `localStorage`. Records use `friskoli.chemotaxis.records.v2`; theme, language, and cell unlock use separate keys. Records are capped at 100, and only compatible groups appear in the top-five view. Unfinished games are not persisted. When changing stored formats, validate existing data and provide a compatible migration or a clear export route.

All runtime assets are bundled. Do not add remote fonts, analytics, network score submission, or a CDN dependency without documenting the new behavior. Preserve day/night wordmark variants, keyboard focus, visible action cues, and reduced-motion behavior. See the [asset notice](../src/assets/NOTICE.md) before replacing or redistributing branding.

## Validation

The rule suite checks scoring, full-group movement, blocked runs, final-turn wins, environment priority, single-die cancellation, retry lifetime, tutorial parity, RNG separation, viewport math, and bilingual placeholders. Map validation checks radii 4, 6, 8, and 10 for tile uniqueness, goal/start validity, connected walkable terrain, reachable anchors, exit degree, valid depletion, generation frames, and seed reproducibility. The player UI exposes radii 6 and 8 plus the fixed quick board.

Browser journeys check the six tutorial steps, preview-to-score agreement, full win/loss journeys, local records, layout at desktop/phone/tablet sizes, themes/languages, normal/reduced motion, mouse dice dragging, touch double-taps, map pan/pinch, restart, and offline play. They use Chromium automation and emulated touch. A passing run does not establish physical device, Safari, or Firefox compatibility.

For interaction changes, also inspect phone portrait, phone landscape, tablet, and desktop manually. Check touch targets, safe areas, scrollable dialogs, focus, orientation changes, and whether dragging can accidentally move the cell. Verify keyboard and trackpad behavior separately where available. State exactly which checks were performed in the pull request.

`balance.cjs` simulates simple strategies against visible boards and rolled dice. Use `BALANCE_SEEDS` and `BALANCE_OFFSET` to set sample count and seed range. Simulation results describe those policies, not human win rates or measured bacterial behavior. Do not infer player experience from simulation alone.

## Packaging and releases

Vite, React, TypeScript, Tailwind, and the local `scripts/single-file.ts` build hook produce one HTML file with inline scripts, styles, language data, and images. The hook rejects unexpected external assets. Run `npm run release:package` from a Git checkout. The packager requires a clean checkout, builds the app, copies the HTML to `output/release/friskoli-chemotaxis-v<version>.html`, and creates a source ZIP from `git archive HEAD`. Commit changes first so the source archive matches the intended release. Ignored local files are excluded by Git.

For a release:

1. Update the package version and lockfile. Update the rule identifier and visible rule label only when the rules change.
2. Keep Usage, Rules, and this guide consistent with the implementation.
3. Run `npm run verify` and `npm run test:browser`, then inspect the relevant screenshots.
4. Commit the final files, run `npm run release:package`, and test the packaged HTML offline.
5. Push `main`, confirm automated CI if enabled, create the version tag, and publish the HTML and source ZIP as GitHub release assets.

## Continuous integration

The supplied `.github/ci-template.yml` verifies the code, executes browser journeys, and retains the build and diagnostic screenshots as workflow artifacts. It is a template and does not run automatically. To enable it, move it to `.github/workflows/ci.yml`, commit, and push using a credential permitted to write GitHub Actions workflows. With an OAuth-based GitHub CLI login, that permission requires the `workflow` scope. The initial publication credential did not include that scope, so the first release was validated locally using the same commands.

Release publication is a maintainer action; the template does not publish tags or upload releases automatically.
