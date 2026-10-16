# Quickstart: Validating Row Buttons

Run this once on branch `003-row-actions` before the pull request. Interfaces and shapes are in
[data-model.md](data-model.md) and [contracts/module-interfaces.md](contracts/module-interfaces.md).

## Prerequisites

- `npm install` has been run.
- The Docker stacks are up and seeded. The seed does not change in this feature, but re-seed after
  the SC-004 one-off (step 6).

  ```bash
  ./docker/up.sh 7 && ./docker/up.sh 8 && ./docker/up.sh 9
  ```

## Gates

```bash
npm run typecheck                       # G1
npx vitest run                          # G2: unit tests + architecture check
npm run build && npm run check:manifest # G3: manifest unchanged; kibana-bridge.js is built
KT_STACK=7 npm run e2e                  # G4, then KT_STACK=8 and KT_STACK=9
```

- **Expected:** everything passes, with more tests than the baseline at `64c8260` (509 unit tests;
  e2e 30/30/31, with 3 skipped each).
- **CI:** CI runs G1–G4 on the pull request.
- **One stack at a time:** the stacks share the `localhost` cookie `sid`, so a browser that visits
  two stacks loses the first session. The e2e runs use one stack per run and are not affected.

## Checks

1. **One click from the row** (e2e `rows.spec.ts`, 7/8/9; SC-001, SC-002). With "User", "Error"
   and "Same user ±5" marked, hover the row of `app-004` (`extra.uid:"uid-004"`):
   - the strip shows those three, with the same targets as the expanded bar;
   - clicking "User" opens the admin address in a new tab;
   - the row stays collapsed (7.17), or the flyout stays closed (8.x/9.x).
2. **Greyed button** (e2e). On `all-logs`, which has no time field, mark "±5 minutes": the strip
   shows it greyed, with a non-empty `title`.
3. **Keyboard** (e2e). Focus the row's first control: the strip appears, and Tab reaches its first
   button.
4. **Nothing marked** (e2e; FR-014, SC-004). With the default `e2eConfig()`, load Discover and hover
   rows:
   - no request carries `kbn-xsrf: kibanatool`;
   - there is no `kibanatool-row` element.

   Then mark an action through storage without reloading: hovering now shows the strip (FR-014a).
5. **Layout** (e2e; SC-005). The rectangles of the hovered row's cells and of the next row's cells
   are identical before the strip shows and while it shows.
6. **SC-004 one-off on 7.17** (recorded in the verification doc, not committed):
   1. Add 500 temporary documents to a scratch `*_log` index.
   2. Open `all-logs` and scroll the table to its end.
   3. Count the extension's requests: expect ≤ 10.
   4. Re-seed with `./docker/up.sh 7`.
7. **Fail closed on 7.17** (e2e; SC-007). Unregister `kibanatool-bridge` from the service worker,
   then load Discover:
   - no strip appears;
   - the expanded bar works;
   - no `[kibanatool]` error appears.
8. **9.x Observability view** (e2e). In the `obs` space, hovering a row of `obs-logs` shows the
   strip.

## Manual checks (user, read-only)

- **M1, settings conversion.** Load the unpacked build from `.output/chrome-mv3` in the Chrome that
  holds the Alpha settings.
  - Expected: the options page lists every action as before, each with "Show in row" off (SC-006).
  - Then mark two actions, for example a player admin page and "this player's logs".
- **M2, Alpha (7.17.26)** (SC-003, SC-008). In Discover, hover a `player_action_log` row:
  - the strip appears without waiting;
  - one click opens the expected admin page, with the row still collapsed;
  - the logs of the first 50 rows are ready within 2 seconds of the rows appearing (DevTools,
    Network tab: the extension's request finishes within 2 s).
