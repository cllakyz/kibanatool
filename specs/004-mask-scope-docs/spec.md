# Feature Specification: Explain How Far a Field-Name Mask Reaches

**Feature Branch**: decided in the plan.

**Created**: 2026-10-19

**Status**: Draft

**Input**: User description (a heads-up written in Turkish, summarized): the default `*token*` and `*password*`
patterns now also match XML element names. A field-name mask looks for its word anywhere in the field's full
path, and since XML opens like JSON, element names are part of that path, for example
`context.request.Envelope.Body.GetTokenRequest`. When an ancestor element matches, everything under it becomes a
single `***`: not just the token, but the whole request is lost from the copy. Before Plan 6 masks could not reach
inside XML, so such logs were copied readable. Nobody knows yet whether Alpha's operation names contain these
words. A pattern can be narrowed if needed; for example `*.Token` masks only an element named `Token`.

## Clarifications

### Session 2026-10-19

- Q: Should the spec wait for a measurement of Alpha? → A: Yes. The measurement ran on 2026-10-19 (see the
  [appendix](#appendix-alpha-measurement-2026-10-19)).
- Q: Given the measurement, should the masking rule change? → A: No. The rule stays as it is, and the extension
  explains it. The README and the options page say that a field or element whose name matches is masked with
  everything under it, and how to narrow a pattern when that hides too much. The outdated help text that says
  value masks apply only to "Copy as Markdown" is corrected at the same time.
- Note (2026-10-19, from a review of the measurement): the narrowing example in the original heads-up, `*.Token`,
  leaks tokens. It matches only names that are exactly `token`. Alpha also holds tokens under `platform-token`,
  `ConfirmationToken`, `ApplicationToken`, `refreshToken` and `_token`, and they would be copied as plain text.
  Every token name the measurement found *ends* with "token", so the documented narrowing is `*token`. The docs
  name `*.token` only as a warning.

## User Scenarios & Testing *(mandatory)*

The users are developers and support staff who copy logs to share them, and who set the mask patterns on the
options page.

**What the code does today.** A field-name mask matches a log field's full dot path, which includes the keys of
JSON, XML and form text inside the field. The first match on the way down replaces that value with `***`. When
the value is an object or a list, its whole content is replaced. This holds in the Markdown and JSON copies.
The cURL copy applies it to JSON and form text inside the request and leaves XML text as it is. Nothing on the
options page or in the README says so.

**What Alpha shows.** The measurement found 7 shapes of field that are masked whole. Each of them is the secret
itself:

- header lists (`authorization`, `cookie`, `platform-token`, `postman-token`);
- the altenar `<Token Type="…" Value="…"/>` element, whose secret sits in its `Value` attribute.

No operation or wrapper element is masked whole in Alpha's last 500 logs per data view. A rule that masks only a
value whose own name matches would leak the altenar tokens.

### User Story 1 - Users can see how far a mask reaches, and how to narrow it (Priority: P1)

A user copies a SOAP log and finds that a whole operation reads `***`, because its name contains "Token". They
open the options page. Under the mask patterns, a short note explains two things:

- a field or element whose name matches is masked together with everything inside it;
- to keep such a wrapper readable, narrow the pattern rather than drop it. `*token` (names that *end* in
  "token") instead of `*token*` keeps `GetTokenRequest` readable and still masks `platform-token`,
  `ConfirmationToken` and `_token`.

The user narrows the pattern, and the next copy shows the operation with only the token masked. The README says
the same, with an example. It also warns that `*.token` matches only names that are exactly `token` and leaves
the others in plain text.

**Why this priority**: it is the whole feature. The rule stays, so the user can only avoid an unwanted full mask
if the extension explains the rule.

**Independent Test**: read the options page in English and in Turkish. The note under the mask patterns states
the rule and the narrowing example. The value-mask note no longer says that value masks apply only to "Copy as
Markdown". The README's masking section states the rule with an example.

**Acceptance Scenarios**:

1. **Given** the options page in English or Turkish, **When** the user reads the mask patterns section,
   **Then** a note states that a matching field or element is masked with everything inside it, and gives
   `*token` in place of `*token*` as the way to keep such a wrapper readable.
2. **Given** the options page, **When** the user reads the note on masks inside values, **Then** it says those
   masks apply to every copy (Markdown, JSON and cURL), not only to "Copy as Markdown".
3. **Given** a log whose XML holds `<GetTokenRequest><User>u</User><Amount>1</Amount></GetTokenRequest>` and
   whose headers hold `platform-token`, **When** it is copied with the default patterns, **Then** the operation
   reads `***`, as documented; **and When** `*token*` is replaced by `*token`, **Then** the operation's `User`
   and `Amount` are readable and `platform-token` is still `***`.
4. **Given** the README, **When** a reader looks up masking, **Then** it states the same rule and the narrowing
   example, and says that this applies to keys inside JSON, XML and form text too. It warns that `*.token`
   matches only exact names and would leave `platform-token`, `ConfirmationToken`, `refreshToken` and `_token`
   readable.

### Edge Cases

- **`*token` still misses names with the word in the middle**, such as `tokenValue`. The README says that any
  narrowing trades coverage for readability, which is why the defaults stay broad (`*token*`).
- **`*.token` leaks.** It matches only names that are exactly `token`, so the docs never offer it as the
  narrowing. They name it only as a warning.
- **Header lists** are masked whole, and the note's wording must not suggest otherwise.
- **Top-level fields:** `*token` also matches a top-level field such as `token` or `access_token`, because it
  needs no dot.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The masking rule MUST stay as it is: a pattern matches the full dot path, and the first match on
  the way down masks that value with everything inside it, in every copy.
- **FR-002**: The options page MUST show, under the mask patterns field, a note that a matching field or element
  is masked together with everything inside it. The note MUST give a narrowing example that keeps the measured
  tokens masked: `*token` in place of `*token*`. It MUST NOT offer `*.token` as a narrowing, since that leaks
  `platform-token`, `ConfirmationToken`, `refreshToken` and `_token`.
- **FR-003**: The note on masks inside values MUST say that they apply to every copy, not only to "Copy as
  Markdown".
- **FR-004**: The README's masking section MUST state the rule of FR-001 and the narrowing example of FR-002,
  including that keys inside JSON, XML and form text count as part of the path. It MUST warn that a narrower
  pattern trades coverage for readability, and that `*.token` in particular leaves compound token names in
  plain text.
- **FR-005**: Every new or changed UI string MUST exist in English and Turkish.
- **FR-006**: An automated test MUST pin the documented rule:
  - a matching object, list or XML element is masked whole;
  - with `*token` in place of `*token*`, a `GetTokenRequest` wrapper's other children are readable, while
    `platform-token`, `ConfirmationToken`, `_token` and an element named `Token` (with its attributes) are still
    masked.
- **FR-007**: The default patterns and the settings format MUST NOT change.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On the options page, in English and Turkish, a user can find out from the screen alone why a whole
  operation was masked and which pattern narrows it, without reading the README.
- **SC-002**: Every copy of every log is byte-for-byte the same as before the change. Only UI text, README text
  and tests change.
- **SC-003**: No UI text claims that value masks apply only to "Copy as Markdown".
- **SC-004**: Applied to the token names Alpha holds (appendix), the documented narrowing `*token` masks every one
  that `*token*` masks: 0 tokens become readable.

## Assumptions

- **Release:** this ships in 1.0.0, which has not gone to the store yet. It changes no behavior, so it needs no
  manual check on Alpha.
- **Measurement:** the measurement covers Alpha only. Other Web Store users may have wrapper elements whose names
  contain the words. For them the documented narrowing is the remedy, and an over-mask is the safe direction.
- **Scope:** CHANGELOG gets a line only if the README or UI text change is worth noting there. That is for the
  plan to decide.

## Out of Scope

- Changing which values a pattern masks, or how deep a mask reaches.
- New default patterns.
- A per-pattern preview on the options page.

## Appendix: Alpha measurement (2026-10-19)

**Method.** Read-only, through the user's Chrome. The bundle ran the extension's own text expansion and pattern
matcher, with the default patterns, over the last 500 logs of each of the 23 data views (about 10,500 logs).
Only names and counts were read; keys that looked like data were replaced with `<n>` or `<k>`.

**Values masked whole** (an object or list replaced by one `***`):

| Path | Logs | What it is |
|---|---|---|
| `context.headers.platform-token` | 998 | header list |
| `context.headers.cookie` | 516 | header list |
| `context.headers.authorization` | 510 | header list |
| `context.request.PKT.Method.Params.Token` | 500 | altenar `<Token Type=… Value=…/>`; the secret is `@Value` |
| `context.response.PKT.Result.Returnset.Token` | 286 | the same element in the response |
| `context.header.postman-token` / `context.headers.postman-token` | 23 / 3 | header list |

**Not found:** an operation, `…Request` or `…Info` wrapper masked whole. The SOAP operations seen are
`GetMemberInfo`, `InsertPayment`, `AMTrequestTicketStatus`, `AMTraceBet` and `GetReconciliationByDate`. Their
`password`/`passWord` leaves are masked one by one, and the rest stays readable.

**Single values masked:** 31 path shapes. The most frequent are:

| Path | Logs |
|---|---|
| `context.request.PKT.Method.Auth.<k>` (an attribute name; attribute keys start with `@`, which the measurement hid) | 500 |
| `…AMTrequestTicketStatus.transSec.passWord` | 500 |
| `…GetMemberInfo.password` | 401 |
| `context.options.headers.Authorization` | 149 |
| `context.options.body.password` | 149 |
| `…InsertPayment.password` | 95 |
| `context.requestHeaders.Authorization` | 89 |
| `context.response.Data.TransactionSavingToken` | 83 |
| `context.response.Data.ConfirmationToken` | 83 |

The rest are CSRF `_token` form fields and a few `token`/`refreshToken` values.

**Logs with a whole-value mask, per data view:**

| Data view | Logs |
|---|---|
| player_login_log | 498/500 |
| altenar_api_log | 500/500 |
| player_action_log | 500/500 |
| user_action_log | 500/500 |
| payment_log | 23/500 |

Every other data view has none.
