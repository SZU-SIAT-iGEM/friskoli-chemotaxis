# Game rules

These are the rules for Friskoli Chemotaxis **1.0.0**, using rule identifier **1.0**. The executable rules live in `src/game/engine.ts` and the generated-map budgets in `src/game/mapgen.ts`.

## Objective and boards

Guide one cell from its starting tile to the goal within the available turns. Collect nutrients along the way to score points. Reaching the goal wins; exhausting the budget without reaching it ends the game with the feeding points already earned.

| Board | Tiles | Turn budget |
| --- | ---: | --- |
| Quick game | 37 | 11 |
| Standard world | 127 | `max(16, round(shortestPath × 1.8 + 2))` |
| Large world | 217 | `max(16, round(shortestPath × 1.55 + 2))` |

`shortestPath` counts steps along the shortest wall-avoiding route from start to goal, without dice constraints. Generated terrain is fixed once the board appears. Eating food changes the remaining resource field, not the walls. A map seed reproduces terrain; a new dice seed is used for each replay, so rolls can differ on the same map.

## Directions and a turn

Die faces identify directions, not distances:

| Face | Direction | Axial coordinate change `(q, r)` |
| --- | --- | --- |
| 1 | East → | `(1, 0)` |
| 2 | Southeast ↘ | `(0, 1)` |
| 3 | Southwest ↙ | `(-1, 1)` |
| 4 | West ← | `(-1, 0)` |
| 5 | Northwest ↖ | `(0, -1)` |
| 6 | Northeast ↗ | `(1, -1)` |

1. Roll the pool specified by the cell's current environment.
2. Choose one positive face that can move at least one tile.
3. Use **all positive dice showing that face**. Each contributes one step in the same straight direction. Other faces are discarded.
4. Process every entered tile in order, including food collection and Combo changes.
5. The turn ends unless the run qualifies for an extra action. Roll a new pool for each extra action.

For example, a pool of `1, 1, 3` offers a two-step eastward run or a one-step southwest run. Choosing east cannot be shortened to one step. A pool of `−1, 1, 1` still offers a two-step eastward run; the crossed-out die does not count.

### Walls, boundaries, and the goal

A wall or board boundary stops the run on the last valid tile before the obstacle. No movement is allowed if the first step is blocked. A partially blocked run can collect food on the tiles it enters, but it ends the turn and cannot grant an extra action.

Entering the goal ends the run immediately and wins, even if more matching dice remain. Reaching the goal on the final allowed turn still wins. Walls do not remove their direction from the probability distribution; blocked rolls are part of the game.

### Food-assisted actions

Landing on a previously uneaten nutrient grants another action in the same turn if the run was not blocked and the cell has not reached the goal. Each turn allows at most **three actions**. Crossing food without landing on it gives points but does not grant an extra action. Ending the third action consumes the turn even when its endpoint has fresh food.

The finishing action consumes its turn before unused-turn points are calculated. A turn is counted as used when a run does not grant another action, when the third action completes, or when the player waits after a blocked retry.

## Objects and environments

The board displays both objects and environmental shading. Their effects differ:

| Object or environment | Effect |
| --- | --- |
| Cell/start | The player begins here. The start is traversable and has no scoring bonus. |
| Orange nutrient | Collected once when entered; awards Combo points and removes its attraction field. |
| Nutrient-rich zone | On or one hex step from any remaining nutrient: roll four dice. |
| Normal/open water | Roll three mobile dice. |
| Depleted zone | A marked depleted tile, or within one hex step of consumed food: one of the three dice is locked; two are rolled. |
| Repellent node and range | On or one hex step from a node: roll three dice, then cancel one. The node itself is traversable. |
| Wall | Impassable; stops a straight run before entry. |
| Goal | Traversable; entering it ends the game with the finish bonus. |

If environments overlap, apply **repellent → nutrient-rich → depleted → normal**, in that order. Eating a nutrient can change both the current and neighboring environments immediately. The next roll uses the new location and remaining food.

### Depletion and repellent cancellation

A locked die is represented internally as zero. It contributes no direction and no movement; it imposes no separate score penalty. Leaving depletion removes the lock on the next roll if the new location has a higher-priority or normal environment.

In a repellent zone, compare the change in repellent strength one step along each rolled direction. Cancel the individual die with the greatest increase, favoring the most inward direction. Ties use the earlier die in the pool. If all rolled directions lead outward, cancel the die with the weakest outward improvement. The crossed-out die is represented by a negative face. Other dice with that face remain usable.

## Dice probabilities

Each mobile die samples independently from the same six probabilities, calculated at the cell's location when rolling. The display reports these per-die probabilities, rounded to one decimal place; rounded percentages may not total exactly 100%.

The signal field at a location is the strongest remaining nutrient contribution minus the sum of nearby repellent contributions:

- Nutrient contribution: `1.5` on its tile, `1.0` at distance one, `0.3` at distance two, and zero farther away. Use the maximum across nutrients.
- Repellent contribution: `1.5` on a node, `0.65` at distance one, and zero farther away. Sum across nodes.

For each direction `i`, take the difference between the field one step ahead and the field at the current location:

```text
response = 0.7 for the standard cell, 1.0 for the enhanced cell
weight[i] = exp(clamp(response × fieldDifference[i], −0.9, 0.9))
probability[i] = 0.55 / 6 + 0.45 × weight[i] / sum(weight)
```

This mixture preserves randomness while biasing movement toward a stronger nutrient signal or away from repellents. The goal contributes no signal. The enhanced cell changes only the response coefficient; it remains stochastic. Winning a regular game unlocks it in local browser storage.

The tutorial uses explicitly preset dice instead of probability sampling. The rest of its movement and scoring follows the regular rules.

## Combo and scoring

The first nutrient in a chain is worth **10** points. Each subsequent nutrient increases its individual value by **15**:

```text
nutrient points = 10 + 15 × (Combo − 1)
sequence: 10, 25, 40, 55, 70, …
```

One entered foodless tile preserves the current Combo. Entering a second consecutive foodless tile breaks it. A nutrient before that second gap continues the chain and resets the gap counter. Gaps count individual entered tiles, including previously consumed food tiles, and can span several moves. Rolling alone does not break the chain.

Example: food → empty → food scores `10 + 25 = 35`. Food → empty → empty → food scores `10 + 10 = 20`. Three consecutive nutrients score `10 + 25 + 40 = 75`.

On reaching the goal:

```text
final score = feeding score × 2 + max(0, turn limit − turns used) × 5
```

For example, 75 feeding points and five unused turns yield `75 × 2 + 5 × 5 = 175`. On a loss, final score equals feeding score. There is no exploration score, penalty for touching a repellent, or separate score cost for a wall collision.

## Fully blocked rolls

If every offered direction has no valid first step, one free retry is available per turn. It advances the dice random stream, keeps the current Combo, and consumes no action or turn. This retry remains spent during any food-assisted actions in the same turn.

If the retry is also fully blocked, **Wait** consumes one turn and resets the Combo. Waiting can end the game when it uses the final turn. A retry is unavailable when even one offered positive direction can move.

## Results and comparison

Tutorial results are excluded from regular records. Local rankings compare only games with the same rule identifier, mode, radius, map seed, and cell type. They are local records, without server verification. The map's geometric connectivity does not guarantee completion with a particular series of rolls.
