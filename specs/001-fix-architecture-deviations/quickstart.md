# Quickstart: Validate the Architecture Fixes

Run these steps from the repository root on branch `001-fix-architecture-deviations`. They check
the spec's success criteria. The changed interfaces are in
[contracts/module-interfaces.md](contracts/module-interfaces.md), and the rule owners are in
[data-model.md](data-model.md).

## Prerequisites

- `npm install` has run (its `postinstall` runs `wxt prepare`).
- For e2e: the docker stacks are up (`./docker/up.sh 7`, `./docker/up.sh 8`, `./docker/up.sh 9`).

## 1. Gates G1–G3

```bash
npm run typecheck                       # G1: no output, exit 0
npx vitest run                          # G2: all files pass, including tests/unit/architecture.test.ts
npm run build && npm run check:manifest # G3: manifest check passes
```

## 2. The architecture check (SC-002)

```bash
npx vitest run tests/unit/architecture.test.ts
```

- Expected: the run over the real tree reports no violations, and the exception list in the test is
  `[]`.
- Expected: the five synthetic cases fail as designed. They are an outer import in core, a
  type-only import, a re-export, a browser global in core, and a cycle. Each must report exactly
  its own violation.
- Spot check by hand: add `import { discoverUrl } from "../kibana/url";` to any `src/core` file,
  run the test, and it fails naming that file and `../kibana/url`. Then revert the line.

## 3. One definition per rule (SC-003)

Each rule has one definition, the owner listed in data-model.md. The expected match counts are noted on each line:

```bash
grep -rn "environmentIds.length === 0" src entrypoints          # config.ts appliesToAll
grep -rn '"notEquals"' src entrypoints                          # expect 2: config.ts CONDITION_OPS + the evaluateCondition case
grep -rnE "DEPTH = 5" src                                       # fields.ts MAX_TEXT_DEPTH
grep -rn 'startsWith("<")' src                                  # xml.ts isXmlText
grep -rn 'replace(/\\/+\$/' src                                 # config.ts basePathOf
grep -rnF "https?:" src/core                                    # expect 1: template.ts startsWithHttp (fixed string on purpose)
grep -rn 'reason === "missingVariable"' src                     # conditions.ts gateAction
grep -rnE "\bLinkButton\b|\bDiscoverButton\b" src entrypoints   # none (0 matches)
```

The `"notEquals"` search also matches the `case "notEquals":` in `evaluateCondition`. That is the
operator's evaluation, not a second list. Missing variables have one owner in `template.ts`;
`variableWarnings` must call `missingVariables` and contain no `every(... lookupVariable ...)`.

## 4. No behavior change (SC-004)

```bash
KT_STACK=7 npm run e2e
KT_STACK=8 npm run e2e
KT_STACK=9 npm run e2e
git diff --stat main -- tests/e2e       # expected: no changes
```

- Expected: e2e passes 27/27/28 with 3 skipped each, the same counts as Plan 7.
- Expected: the unit test diff against `main` changes only imports, moved names, the discover
  tests' `context()` helper (`link` instead of `prefix`), the storage fake (`onChanged`), and new
  tests. No expected URL, copied text, notice, warning or validation error changes.

## 5. Copy failure notices (US4)

```bash
npx vitest run tests/unit/content/copy-menu.test.ts
```

- Expected: an item whose text is `null` with `unavailable: "noticeTimeNotConverted"` reports that
  key. An item whose text is `null` without `unavailable` reports `noticeCopyFailed`.
- e2e already covers "view with fixed time" (`tests/e2e/copy.spec.ts`).

## 6. Governance (SC-001, SC-006)

- `.specify/memory/constitution.md`: Known Deviations has no rows, there is no `TODO(`, and the
  version is above 1.0.0, with one PATCH per amendment (R18).
- `CLAUDE.md` names `.specify/memory/constitution.md` and `tests/unit/architecture.test.ts`.
- `git check-ignore specs/` prints `specs/`.
