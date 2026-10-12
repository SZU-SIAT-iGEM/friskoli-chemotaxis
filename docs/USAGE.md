# Usage guide

## Opening the game

For offline play, download the standalone HTML asset from the [latest release](https://github.com/SZU-SIAT-iGEM/friskoli-chemotaxis/releases/latest). Open the downloaded file in a browser. Keep the file somewhere convenient; no server or account is required.

For development, run `npm ci` and `npm run dev` from the repository root. For a production preview, run `npm run build` and `npm run preview`. A static web server can serve `dist/index.html` directly, including from a subdirectory because the production application is bundled into one HTML file.

## Starting a session

The setup panel offers a 37-tile **Quick game**, a 127-tile **Standard world**, and a 217-tile **Large world**. Larger worlds expose a map seed: an integer from 0 to 4,294,967,295. Apply the seed to reproduce terrain, or choose **New map** to generate another board.

The **Standard cell** is available initially. Completing a regular game unlocks the **Enhanced cell** on that browser. The enhanced cell has a stronger response to the same local signal gradients. It receives the same dice counts, movement rules, and scoring rules.

Choose the six-step tutorial for a guided introduction. It uses a small separate board and preset dice, explicitly marked as demonstrations. Tutorial scores do not enter the local leaderboard. Completing the tutorial leads to a regular game.

## Controls

| Input | Action |
| --- | --- |
| Tap/click the unrolled dice | Roll |
| Press, drag, and release the unrolled dice | Toss the dice |
| Space outside an input or focused control | Roll |
| Enter/Space on the focused dice tray | Roll |
| Tap/click a rolled die | Preview its direction |
| Tap/click a highlighted board tile | Preview the entire matching-dice run |
| Double-click, or two quick taps on the same tile | Execute the previewed direction |
| Confirm control after a preview | Execute the selected direction |
| Keys 1–6 during a settled roll | Execute the corresponding available direction |
| Enter/Space on a focused reachable tile | Execute its direction |
| Click a non-reachable tile | Inspect the object and environment |
| Zoom controls on a large board | Zoom, fit the board, or follow the cell |
| Drag a zoomed board | Pan without moving the cell |
| Two fingers on a large board | Pinch to zoom and pan |
| Ctrl/Command + wheel over a large board | Zoom around the pointer |
| Wheel or trackpad scroll on a zoomed board | Pan |
| Arrow keys with the large board itself focused | Pan |
| + / − with the large board itself focused | Zoom |
| Escape | Close an open dialog |

Any highlighted tile on a run selects that direction. The cell still travels the complete group distance; clicking an intermediate tile does not shorten the run. Board movement is disabled until dice animation and board generation finish.

The live direction percentages apply independently to each mobile die in the next roll. They update with location and food consumption. Directions are numbered consistently on the dice, probability display, paths, and cell compass. See [Rules](RULES.md) for the underlying mechanics.

## Settings and reference

**English is the default language** on a fresh browser. **Settings** contains language, theme, and restart controls; the game remembers the selected language. The `lang` URL parameter overrides that preference (`en` or `zh-CN`). Restarting an unfinished game requires confirmation. **Learn / field guide** opens rules without resetting the game. On short screens, scroll inside the guide or setup/result panel to reach additional information.

The interface follows the browser's reduced-motion preference. Fullscreen can be requested from the header where supported. If the browser refuses it, the game displays a message and remains available in the normal browser window.

Translation packs can be exported and imported through the rules dialog. Imported packs are held in the current session and must match the built-in key and placeholder schema. Reloading removes a custom pack.

## Results and records

At the end of a game, the result panel shows feeding points, the finish multiplier bonus, unused-turn points, best Combo, nutrients collected, and long runs. Open the save panel to add an optional nickname and feedback, then save the result locally.

Records are stored in the current browser's local storage, up to 100 entries. The displayed top five are grouped by rule version, game mode, map radius, map seed, and cell type. **Export records** downloads the stored records as JSON. If storage fails, the result panel offers a JSON export for the current run. JSON exports are for recordkeeping; this version has no record-import or in-progress save feature.

No game record is uploaded by the application. Browser profiles, private sessions, website origins, and local file paths may use different storage areas. Moving the offline file can affect record availability. Export important records before moving the file, clearing browser storage, or switching browsers.

## Troubleshooting

- **No movement after a click:** a first click previews. Double-click/tap again promptly, use Confirm, or use the keyboard. Wait until the dice settle.
- **A direction moves farther than expected:** every positive die with that face contributes one step. Unused directions are discarded after the move.
- **No legal direction:** use the one free retry. If the second roll is also blocked, use Wait to consume the turn.
- **The setup or result panel looks cut off:** scroll within that panel. On a small phone, landscape gives a different board layout; zoom controls are available on larger maps.
- **Records disappear after reload:** local storage may be unavailable or cleared. Export the current result before closing the page.
- **The HTML opens as text:** save it with the `.html` extension and open it in a JavaScript-enabled browser.
