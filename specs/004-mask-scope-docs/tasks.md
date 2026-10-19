---

description: "Task list for explaining how far a field-name mask reaches"
---

# Tasks: Explain How Far a Field-Name Mask Reaches

**Input**: Design documents from `/specs/004-mask-scope-docs/`

**Prerequisites**: plan.md, spec.md (clarified 2026-10-19), research.md (R1–R6), data-model.md,
contracts/ui-text.md, quickstart.md

**Tests**: Included, because FR-006 asks for them.
- The two unit tests pin a rule that already exists, so they pass as soon as they are written. That is
  expected: they guard the docs against a later rule change.
- The e2e check fails until T008 adds the note.

**Organization**: the spec has one story (US1, P1), so the feature is a single increment. Everything goes on
one branch, `004-mask-scope-docs`, as one pull request (research R5).

**Ground rules for every task**:
- **No copy changes (SC-002, FR-001, FR-007).** Do not touch `src/core`, the default patterns or the
  settings format. No existing test expectation may change.
- **Exact text.** The strings and the README paragraph are in `contracts/ui-text.md`. Copy them as they
  are.
- **cURL is the exception for XML.** The cURL copy leaves XML text as text, with only the value masks
  (README "Copy as cURL", CLAUDE.md Traps). Nothing new may say that cURL masks XML element names.
- **Never offer `*.token` as a narrowing** (FR-002). It appears only as a warning.
- **Code style**: match the surrounding code. Cite this feature as `spec 004 FR-xxx`.
- **E2E asserts no localized text** (`tests/CLAUDE.md`).
- **Commits**: end every message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never
  push or open a PR without the user's yes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 from spec.md

---

## Phase 1: Setup

- [X] T001 Create the branch from an up-to-date `main`:
  - `git switch main && git pull`;
  - `git switch -c 004-mask-scope-docs`.

  The uncommitted `specs/004-mask-scope-docs/` and `.specify/feature.json` come along; T012 commits them.
- [X] T002 Record the baseline: `npx vitest run` passes with 563 tests (quickstart "Gates").

---

## Phase 2: Foundational

None. No shared code is needed: the story touches only text, one component and tests.

---

## Phase 3: User Story 1 - Users can see how far a mask reaches, and how to narrow it (Priority: P1) 🎯 MVP

**Goal**: the options page and the README explain that a matching field or element is masked with
everything inside it, and give `*token` as the narrowing. The value-mask help names every copy.

**Independent Test**: read the options page in English and Turkish, and the README's "Copy and masking"
section (quickstart checks 2–4). `npx vitest run tests/unit/core/mask.test.ts` and
`KT_STACK=9 npm run e2e -- options` pass.

### Tests for User Story 1

- [X] T003 [P] [US1] In `tests/unit/core/mask.test.ts`, inside `describe("maskValue")`, add the test "masks
  a matching object, list or XML element whole (spec 004 FR-006)". It uses the existing
  `isMasked = maskMatcher(DEFAULT_MASK_PATTERNS)`:
  - `maskValue("context.request", expandStructured("<Envelope><Body><GetTokenRequest><User>u</User></GetTokenRequest></Body></Envelope>"), isMasked, [])`
    equals `{ Envelope: { Body: { GetTokenRequest: MASK } } }`;
  - `maskValue("context.headers", { "platform-token": ["a", "b"], accept: "json" }, isMasked, [])` equals
    `{ "platform-token": MASK, accept: "json" }`;
  - `maskValue("context.response", { tokenInfo: { scope: "read" } }, isMasked, [])` equals
    `{ tokenInfo: MASK }`.
- [X] T004 [US1] In the same file, after T003's test, add the test "with *token in place of *token*, a
  wrapper opens and the measured token names stay masked (spec 004 FR-006, SC-004)":
  - Build `narrowed = maskMatcher(DEFAULT_MASK_PATTERNS.map((p) => (p === "*token*" ? "*token" : p)))`.
  - **Coverage (research R2).** Each of these paths gives `true` from both `isMasked` and `narrowed`:
    - `context.headers.platform-token`, `context.headers.postman-token`;
    - `context.request.PKT.Method.Params.Token`, `context.response.PKT.Result.Returnset.Token`;
    - `context.request_content.Token`, `context.response.data.token`;
    - `context.response.Data.TransactionSavingToken`, `context.response.Data.ConfirmationToken`;
    - `context.request.ApplicationToken`, `context.response.refreshToken`;
    - `context.request.body._token`.
  - **The wrapper opens.**
    `maskValue("context.request", expandStructured('<Envelope><Body><GetTokenRequest><User>u</User><Amount>1</Amount><Token Type="a" Value="v"/></GetTokenRequest></Body></Envelope>'), narrowed, [])`
    equals `{ Envelope: { Body: { GetTokenRequest: { User: "u", Amount: "1", Token: MASK } } } }`. XML values
    are always strings.

  Run `npx vitest run tests/unit/core/mask.test.ts`. Both tests pass at once, since the rule exists. If one
  fails, the rule differs from research R1: stop and report it, and do not change `src/core`.
- [X] T005 [P] [US1] In `tests/e2e/options.spec.ts`, after "turns one value mask off and keeps the others",
  add the test "describes the mask patterns field with a note (spec 004 FR-002)":
  - `await configure()`, then `openOptions`, then
    `copy = options.locator('section[aria-labelledby="copy-title"]')`;
  - the mask patterns field is the section's second textarea (after the Markdown fields):
    `await expect(copy.locator("textarea").nth(1)).toHaveAccessibleDescription(/\S/)`.

  It asserts no localized text. It fails until T008.

### Implementation for User Story 1

- [X] T006 [P] [US1] In `public/_locales/en/messages.json`:
  - add `optionsMaskPatternsHelp` right after `optionsMaskPatterns`, with the English text from
    `contracts/ui-text.md`;
  - replace `optionsValueMasksHelp` with "Searched inside every value, whatever the field's name. Applies to
    every copy: Markdown, JSON and cURL."

  Keep the file's one-line-per-key layout, and escape the inner quotes as `\"`.
- [X] T007 [P] [US1] In `public/_locales/tr/messages.json`, the same two keys in the same places, with the
  Turkish text from `contracts/ui-text.md`. `tests/unit/i18n.test.ts` keeps the two files in step.
- [X] T008 [US1] In `entrypoints/options/CopySection.tsx` (needs T006, because `MessageKey` comes from the
  English file):
  - give the mask patterns textarea `aria-describedby="mask-patterns-help"`;
  - right after that `</label>`, before the `<fieldset>`, add
    `<p className="muted" id="mask-patterns-help">{t("optionsMaskPatternsHelp")}</p>`.

  Nothing else in the section changes.
- [X] T009 [P] [US1] In `README.md`, section "### Copy and masking", add the paragraph from
  `contracts/ui-text.md` (two paragraphs and a two-item list, without the `>` quoting). It goes right after
  the paragraph that lists the default patterns ("Both copies mask every field …"), before "They also look
  inside every value …".

**Checkpoint**: US1 is complete. T003–T005 pass, and the options page shows the note in both languages.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [X] T010 Gates (quickstart "Gates"):
  - `npm run typecheck`;
  - `npx vitest run`: 565 tests (563 + 2);
  - `npm run build && npm run check:manifest`;
  - `KT_STACK=9 npm run e2e -- options`: start the stack first with `./docker/up.sh 9` if it is stopped.
    CI runs all three stacks on the PR.

  Report any failure with its output. Do not "fix" an existing expectation.
- [X] T011 Quickstart checks 1–4:
  1. `git diff main --stat -- src/core` prints nothing.
  2. Read both locale files: the note states the whole-value rule and the `*token` example, and offers
     `*.token` only as a warning.
  3. `grep -n "optionsValueMasksHelp" public/_locales/*/messages.json` shows "every copy" and "Bütün
     kopyalara".
  4. The README paragraph is in place and names `*token` and the `*.token` warning.
- [X] T012 Commit everything in one commit: the code, the tests, the README, `specs/004-mask-scope-docs/`
  (with this file's checkboxes up to date) and `.specify/feature.json`. Message: `docs: explain how far a
  field-name mask reaches; spec-kit feature 004`.
- [ ] T013 Ask the user whether to push and open the PR. Do not push without a yes. On yes:
  - **Push** with `GH_TOKEN=$(gh auth token --user cllakyz) git -c credential.helper='!gh auth
    git-credential' push -u origin 004-mask-scope-docs`.
  - **Open** the PR with `GH_TOKEN=$(gh auth token --user cllakyz) gh pr create`.
    - Title: "Explain how far a field-name mask reaches".
    - The body covers:
      - the Alpha measurement and the decision to keep the rule;
      - the `*token` narrowing and why `*.token` is not offered;
      - the corrected value-mask help;
      - the test counts.
    - The body ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

  After the user says it is merged, pull `main`. Delete the branch locally and on GitHub only if the user
  asks.
- [ ] T014 Mark spec-kit feature 004 implemented:
  - spec status "Implemented (PR #N, merged <date>)", all tasks checked;
  - add 004 to the spec-kit features listed in `CLAUDE.md` "Docs".

  Ask the user whether this goes directly to `main` (as 003's T040 did) or into the branch before the merge.

---

## Dependencies & Execution Order

- **Setup (T001–T002)** comes first.
- **US1 (T003–T009):**
  - T003 and T004 share `mask.test.ts`, so T004 follows T003.
  - T008 needs T006, since `MessageKey` comes from the English locale file.
  - T005 fails until T008.
  - T003, T005, T006, T007 and T009 touch different files and can run together.
- **Polish (T010–T014)** runs after US1, in order. T013 waits for the user's yes; T014 waits for the merge.

## Parallel Opportunities

```text
Together:  T003 (mask.test.ts)  T005 (options.spec.ts)  T006 (en)  T007 (tr)  T009 (README.md)
Then:      T004 (mask.test.ts, after T003)  T008 (CopySection.tsx, after T006)
```

The whole change is a few dozen lines, so one person doing it in order is just as fast.

## Implementation Strategy

US1 is the MVP and the whole feature. Do T001–T009, check the result against the checkpoint, run the gates
(T010–T011), then commit (T012) and ask before pushing (T013).
