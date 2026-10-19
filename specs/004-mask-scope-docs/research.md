# Research: Explain How Far a Field-Name Mask Reaches

## R1. The rule, as the code has it

- **Decision**: document `maskValue` (`src/core/mask.ts`) as it is.
  - A pattern matches the full dot path, case-insensitively, with `*` as any run of characters.
  - The first match on the way down replaces that value with `***`. For an object, a list or an XML element,
    this replaces its whole content.
  - Lists keep their parent's path, so a header list such as `authorization: ["Bearer …"]` is masked as one
    value.
  - Keys inside JSON, XML and form text are path segments because the copies run `expandStructured` first.
    The cURL copy is the exception for XML: it leaves XML text as text, with only the value masks.
  - All three copies (Markdown, JSON, cURL) use the same matcher.
- **Rationale**: the spec keeps the rule (FR-001, FR-007). Verified on 2026-10-19 with the copies themselves:
  `GetTokenRequest`, `tokenInfo` and `resetPasswordRequest` each became one `***`.

## R2. The narrowing example

- **Decision**: the docs offer `*token` in place of `*token*`, and name `*.token` only as a warning.
- **Rationale**:
  - **Coverage:** all 11 token names in the Alpha measurement end in "token". Checked with `maskMatcher`:
    `*token` matches every one of them, so 0 tokens become readable (SC-004):
    - `platform-token`, `postman-token`;
    - `Params.Token`, `Returnset.Token`, `request_content.Token`, `data.token`;
    - `TransactionSavingToken`, `ConfirmationToken`, `ApplicationToken`, `refreshToken`;
    - `_token`.
  - **The wrapper opens:** with `*token`, a `GetTokenRequest` wrapper's `User` and `Amount` are readable, and its
    `<Token …/>` child is still masked.
  - **Why not `*.token`:** it matches only names that are exactly `token`. That leaves `platform-token`,
    `ConfirmationToken`, `ApplicationToken`, `refreshToken` and `_token` readable (review note,
    2026-10-19).
- **Alternatives considered**:
  - `*.token`: leaks, as above.
  - Pairing `*token` with `*token*` restricted to leaves: the rule cannot express that.
  - No example: the user could not act on the note.

## R3. Where the note goes

- **Decision**: a muted paragraph right under the mask patterns textarea, in `entrypoints/options/CopySection.tsx`,
  linked to the textarea with `aria-describedby`. It is the same pattern the value-mask fieldset already uses
  (`<p className="muted">`).
- **Rationale**:
  - Screen readers announce the note with the field.
  - An e2e check can find it through the attribute, with no localized text.
  - No new style.
- **Alternatives considered**: putting the note into the label text, which would make a very long label.

## R4. The outdated value-mask help

- **Decision**: `optionsValueMasksHelp` says the value masks apply to every copy: Markdown, JSON and cURL.
- **Rationale**:
  - Since Plan 6, `buildJson` applies them.
  - Since Plan 7, `buildCurl` applies them, to plain, HTML and XML text inside the request, and to values inside
    JSON and form text.
  - The current text ("Applies only to 'Copy as Markdown'") is wrong (FR-003).

## R5. Release notes and delivery

- **Decision**:
  - **CHANGELOG:** no entry. Nothing behaves differently, 1.0.0 is unreleased, and its entry describes
    features, not help text.
  - **Delivery:** one branch, `004-mask-scope-docs`, cut from main, and one pull request; push and PR only
    after the user's yes.
- **Rationale**: SC-002 requires byte-identical copies, so the change consists of UI text, README text and
  tests.

## R6. Tests

- **Decision**:
  - **`tests/unit/core/mask.test.ts`** gains two tests (FR-006):
    - with the default patterns, a matching object, list and XML element are each masked whole;
    - with `*token` in place of `*token*`, a `GetTokenRequest` wrapper opens while the measured token names stay
      masked.
  - **`tests/e2e/options.spec.ts`** gains one check: the mask patterns textarea is described by a non-empty
    element (FR-002).
  - **`tests/unit/i18n.test.ts`** already keeps the two locale files in step (FR-005).
- **Rationale**: the unit tests pin the documented rule, so a later change to the rule fails until the docs
  change with it.
