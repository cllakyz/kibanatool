# Quickstart: Validating the Plain-Text Viewer

Run this once per pull request: first for User Story 1 on `002-form-data`, then for User Story 2
on `002-text-view`. Interfaces and shapes are in [data-model.md](data-model.md) and
[contracts/module-interfaces.md](contracts/module-interfaces.md).

## Prerequisites

- `npm install` has been run.
- The Docker stacks have been **re-seeded** with this branch's `docker/seed.mjs`.
  `tests/e2e/global-setup.ts` does not seed, and stacks already running still hold the old seed.

  ```bash
  ./docker/up.sh 7 && ./docker/up.sh 8 && ./docker/up.sh 9
  ```

## Gates (both PRs)

```bash
npm run typecheck                       # G1
npx vitest run                          # G2: unit tests + architecture check
npm run build && npm run check:manifest # G3: the manifest is unchanged
KT_STACK=7 npm run e2e                  # G4, then KT_STACK=8 and KT_STACK=9
```

The expected result is everything passing, with more tests than the baseline: 459 unit tests, and
e2e 27/27/28 with 3 skipped each. CI runs G1–G4 on the pull request.

## User Story 1 checks (`002-form-data`)

1. **SC-005: copies of other logs are unchanged.** In the US1 diff, the copy, cURL, mask and tree
   tests only *add* tests; no existing expected output changes (FR-019).

   ```bash
   git diff main -- tests/e2e/copy.spec.ts tests/unit/core/{curl,markdown,json-copy,mask,json-tree}.test.ts \
     | grep '^-[^-]'   # expect no output
   ```

2. **Panel (e2e and by hand).** On any stack, open `app-033` (`extra.uid:"uid-033"`) and press
   "JSON":
   - the list shows `context.options.body · form`;
   - the tree has `username`, `password` and `grant_type`.
3. **Copies.** Copy `app-033` as Markdown and as JSON:
   - `password` is `***`;
   - `grant_type` reads `password`;
   - `username` reads `dev`.
4. **M1 on Alpha (user, by hand, read-only).** Load the unpacked build from `.output/chrome-mv3`
   and open a recent `iys_log` entry that has `context.options.body`:
   - the panel lists the field tagged "form" with its 3 keys (SC-001);
   - the Markdown and JSON copies contain the credential only as `***`.

## User Story 2 checks (`002-text-view`)

1. **Panel (e2e and by hand).** Open `app-034` (`extra.uid:"uid-034"`):
   - the button reads "View" ("Görüntüle" in Turkish);
   - the list shows `context.output · text` and `context.error · text`.
2. **Table.** `context.output` opens unwrapped: the table's columns line up, and long lines scroll
   sideways. The wrap toggle wraps them and toggles back.
3. **Search and copy.**
   - Search `synced`: the status reads "1 of 2" and ↓/Enter moves to "2 of 2".
   - Press copy: the clipboard equals the field's text exactly.
4. **Single line.** `context.error` opens wrapped to the panel's width.
5. **No panel for plain logs.** A `logs-kibanatool-default` log (`trace.id:"trace-0001"`) still
   shows no panel button.
6. **SC-004: a 100 KB text.** Do this after G4. The document is the newest in `app_log`, so it
   would shift other specs' rows. Index one throwaway document into the 9.x stack without
   printing any secret:

   ```bash
   set -a; . docker/.env.9; set +a
   node -e '
     const line = "0123456789 abcdefghij ".repeat(4) + "\n";
     const doc = { datetime: new Date().toISOString(), extra: { uid: "uid-big" }, context: { output: line.repeat(1200) } };
     fetch(`http://localhost:${process.env.ES_PORT}/app_log/_doc/app-big?refresh=true`, {
       method: "PUT",
       headers: { "content-type": "application/json", authorization: "Basic " + Buffer.from(`elastic:${process.env.ELASTIC_PASSWORD}`).toString("base64") },
       body: JSON.stringify(doc),
     }).then((r) => console.log(r.status));'
   ```

   - Open `extra.uid:"uid-big"` and press View. The text opens within 1 s.
   - Search `a`, about 4,800 matches. The count appears and stepping stays smooth within 1 s.
   - If it does not, apply R10's cap.

   The seed deletes `app_log` first, so `./docker/up.sh 9` removes the document.
7. **SC-002 on Alpha (by hand, read-only).** Re-run the 2026-10-15 measurement with `panelFields`
   in place of the ad-hoc classifier:
   - the script is bundled with `npx rolldown … --format iife` and run in an Alpha Discover tab;
   - it reads only counts.

   Expected for the last 500 documents of each data view:
   - 0 text fields that are multi-line or at least 500 characters but not listed;
   - 0 listed text fields that are single-line and shorter than 500 characters.
8. **M2 on Alpha (user, by hand).** A `cron_log` entry's `context.output` opens unwrapped with
   aligned columns. A `shared_coupon_log` stack trace opens and is searchable.
