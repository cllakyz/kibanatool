# Feature Specification: Plain-Text Request/Response Viewer

**Feature Branches**: `002-form-data` (User Story 1, 1.0.0), then `002-text-view` (User Story 2, 1.1.0).
Neither is created yet.

**Created**: 2026-10-15

**Status**: Draft

**Input**: User description: "Düz metin istek/yanıt görüntüleyici. Bu metinler XML, SOAP ya da form verisi
olabilir. JSON görünümü şu an bunları açamıyor. Biçimlerini henüz doğrulamadım. Yukarıdaki geliştirme için
analiz yap ve spec dökümanı oluştur." (A viewer for plain-text requests and responses. The text may be XML,
SOAP or form data, which the JSON view cannot open today. The formats are not verified yet.)

## Clarifications

### Session 2026-10-15

- Q: Which release carries this feature? → A: User Story 1 (form data) ships in 1.0.0 in its own
  pull request, before the store upload. User Story 2 (text view) follows in 1.1.0 in a second
  pull request.
- Q: How does the cURL copy mask form text inside the request? → A: It masks inside the form and
  writes it back as form text (`a=1&password=***`), as Plan 7 does for JSON text. It does not
  apply the Plan 7 rule for XML/HTML text, where only value masks apply.
- Q: Which plain-text fields are listed in the panel as text? → A: Text that does not open as
  structure and is multi-line or at least 500 characters long.
- Q: Do long lines wrap when the text view opens? → A: It depends on the text. Multi-line text
  opens unwrapped, so tables keep their columns; single-line text opens wrapped. A control
  switches either way.
- Q: Is XML- or JSON-like text that cannot be parsed shown indented in the text view? → A: No. It
  is shown exactly as stored.

## User Scenarios & Testing *(mandatory)*

The users are developers and support staff who read logs in Kibana Discover with the extension's
bar. The user asked for the formats to be measured before this spec was written. The measurement
of the team's Alpha Kibana is in the [appendix](#appendix-alpha-measurement-2026-10-15). It
changed the starting picture:

- **XML and SOAP already open.** Since Plan 6, the requests and responses in the payment, coupon,
  tjk and altenar logs open as a tree. None of the sampled documents in those four logs failed.
- **Form data occurs once.** `iys_log` → `context.options.body` holds a URL-encoded OAuth token
  request, and that request carries a credential. The text is not parsed today, so the default
  `*password*` mask pattern never reaches inside it. The Markdown and JSON copies of such a log
  carry the credential unmasked.
- **The text that cannot be read is plain multi-line text:** console output with box-drawing tables
  (`cron_log`), stack traces, SMS bodies, error responses with a cut-off body, and an HTML error
  page. Today these never appear in the panel, and a log that has only such fields shows no panel
  button at all.

### User Story 1 - Form data opens like XML, and copies mask what it carries (Priority: P1)

A user opens an `iys_log` entry. The token request's form body opens in the panel as a tree of
keys and values, as XML does. Templates and conditions can address its keys. When the user copies
the log as Markdown or as JSON to share it, the credential inside the form is masked like any
other field whose name matches a mask pattern.

**Why this priority**: it closes a live privacy leak: shared copies carry a credential today. It
is also the only part of the original request (XML, SOAP or form data) that the measurement found
still missing.

**Independent Test**: Open a log whose field holds `username=…&password=…&grant_type=…` text. The
panel lists the field tagged "form", and the tree shows three keys. In both the Markdown and the
JSON copy, the value under `password` is `***`, and `username` and `grant_type` stay readable.

**Acceptance Scenarios**:

1. **Given** a log field with the text `a=1&b=x%20y&c=`, **When** the user opens the panel, **Then**
   the field opens as a tree with `a` = `1`, `b` = `x y` and `c` = empty text.
2. **Given** the default mask patterns and a form body containing a `password` key, **When** the
   user copies the log as Markdown or as JSON, **Then** the password value is `***` and the other
   keys keep their values.
3. **Given** a link action whose template uses `{context.options.body.grant_type}`, **When** the
   user opens a matching log, **Then** the link contains that key's value.
4. **Given** a field holding a single pair such as `vendor=abc123`, a URL, or base64 text ending in
   `=`, **When** the user opens the panel, **Then** that field is not treated as form data.
5. **Given** a form value whose text is itself JSON or XML, **When** the log is opened, **Then**
   that value opens too, within the existing nesting limit.
6. **Given** an action log whose request body is the form text `user=a&password=b`, **When** the
   user copies it as cURL, **Then** the command sends `user=a&password=***` as form data.

---

### User Story 2 - Long and multi-line text is readable in the panel (Priority: P2)

A user opens a `cron_log` entry whose output is a 100-line console table. The bar's panel button,
now named "View", lists the field tagged "text". The user opens it and reads the output with its
line breaks and columns intact, because multi-line text opens unwrapped. The user searches for a
word, steps through the matches and copies the whole text.

**Why this priority**: this is the viewer the user asked for. It covers the bulk of the text the
measurement found unreadable: cron output, stack traces, SMS bodies and error responses.

**Independent Test**: Open a log that has a multi-line text field and no JSON or XML field. The
bar shows the "View" button. The panel opens that field directly, keeps every line break, finds
search matches with a count, and copies the text unchanged.

**Acceptance Scenarios**:

1. **Given** a log whose only long field is multi-line plain text, **When** the user opens the log,
   **Then** the panel button is shown, and pressing it opens that text directly.
2. **Given** a log with a JSON field, an XML field and a multi-line text field, **When** the user
   presses the panel button, **Then** the list shows all three in field order, tagged by kind
   ("XML", "text"; JSON untagged as today).
3. **Given** console output containing a box-drawing table, **When** the user opens it, **Then**
   every line stays on one row and the columns line up; the user scrolls sideways to see long
   lines. Turning wrapping on wraps them.
4. **Given** a single-line text of 1,000 characters, **When** the user opens it, **Then** it wraps
   to the panel's width, and turning wrapping off puts it on one scrollable row.
5. **Given** an HTML error page stored as text, **When** the user opens it in the panel, **Then**
   the HTML source is shown as text; nothing in it renders, loads or runs.
6. **Given** an opened text, **When** the user searches for a word that occurs 3 times, **Then**
   all 3 are highlighted, the status reads "1 of 3", and next/previous move between them and
   scroll the active one into view.
7. **Given** an opened text, **When** the user presses copy, **Then** the clipboard holds the text
   exactly as stored, unmasked, the same as the tree's "Copy value".
8. **Given** a short single-line field such as an authorization header or a user agent, **When**
   the user opens the panel, **Then** that field is not listed.

---

### Edge Cases

- **Truncated JSON** (`banner_catalog` → `context.payload_prefix` is cut at 200 characters by
  design; 22 filebeat messages end mid-object): it is not structure, so it opens as text when
  it qualifies by length or line breaks.
- **Text before JSON** (filebeat's syslog line followed by its own metrics as JSON): shown as text,
  not as a tree (user decision; see Out of scope).
- **HTML with named entities** (`&nbsp;` in 24 `social` comments) or several root elements: not
  XML, so it stays text and opens in the text view when it qualifies.
- **Box-drawing and other non-ASCII characters** are shown as stored.
- **Single `key=value` tokens** are common in headers (`tracestate`, cookies) and IDs; a single
  pair never counts as form data.
- **Form text that is not valid percent-encoding** (`a=%zz&b=1`) stays text.
- **A key repeated in a form** (`id=1&id=2`) becomes a list in order, as repeated XML elements do.
- **Very long text:** the largest measured text is about 8 KB. Text up to 100 KB must stay usable
  (SC-004). Larger text still opens; it may scroll slowly.
- **Masking on screen:** the panel shows values unmasked, as Kibana itself does. Masking applies to
  the copy menu's Markdown, JSON and cURL copies.

## Requirements *(mandatory)*

### Functional Requirements

**Form data (User Story 1)**

- **FR-001**: Text MUST count as form data when, after trimming, it is two or more `key=value`
  pairs joined by `&` and has no whitespace. Each key MUST start with a letter, a digit, `_` or a
  percent-escape, and consist only of letters, digits, `_`, `.`, `-`, `[`, `]` and percent-escapes.
  A value may be empty and may contain `=`. All percent-encoding MUST be valid. Any other text MUST
  stay text.
- **FR-002**: Form data MUST convert to keys and values in the order the keys first appear.
  - Values are decoded: `+` becomes a space and percent-escapes are resolved. Values are always
    text, never numbers or booleans.
  - Keys are kept as written after decoding; `a[b]` is one key and is not nested.
  - A repeated key becomes a list of its values in order, at the place it first appeared.
- **FR-003**: Form data MUST join the single rule that decides what counts as structured text
  (constitution principle II). Every place that opens JSON or XML text today MUST open form text
  the same way, with no consumer restating the rule. That covers:
  - the panel tree;
  - the field map used by link templates and conditions;
  - the Markdown copy and the JSON copy;
  - masking;
  - text nested inside other text, within the existing nesting limit.
- **FR-004**: In the Markdown and JSON copies, field-name mask patterns MUST reach form keys, and
  value masks MUST apply to form values. The Markdown copy MUST write a form field as structured
  data, the same way it writes an XML field.
- **FR-005**: In the cURL copy, form text in the request MUST stay form text. This applies to a
  body or query part that is form text and to form text nested inside a part.
  - The value of a key that matches a mask pattern becomes `***`.
  - Value masks apply to the other values.
  - The text is written back as form text. Encoding differences that keep the meaning, such as
    `+` versus `%20`, are allowed.

  This extends Plan 7's rule for JSON text inside the request (clarified 2026-10-15). It does not
  follow the XML/HTML rule, under which only value masks apply.
- **FR-006**: Text that opens as JSON or XML today MUST open exactly as before. Form text can never
  start with `{`, `[` or `<`, so no text changes category.

**Text view (User Story 2)**

- **FR-007**: A `_source` field whose value is text MUST be listed in the panel as a text field
  when it does not open as structure (JSON, XML or form) and it either contains a line break after
  trimming or is at least 500 characters long.
- **FR-008**: The panel list MUST show structured and text fields together, in field order. Each
  field is tagged by kind: "XML" as today, "form" for form data, "text" for text fields. JSON stays
  untagged.
- **FR-009**: The bar's panel button MUST be shown whenever the open log has at least one listed
  field. Its label changes from "JSON" to a neutral name: "View" in English and "Görüntüle" in
  Turkish. A log with exactly one listed field opens it directly, as today.
- **FR-010**: The text view MUST show the text exactly as stored, in a monospace font: line breaks,
  spaces, tabs and box-drawing characters included. The text MUST NOT be interpreted as markup, so
  nothing in it renders, loads or runs.
- **FR-011**: Multi-line text MUST open unwrapped: lines keep their width and the view scrolls
  sideways. Single-line text MUST open wrapped to the panel's width. A control MUST switch
  wrapping on and off for the open text (clarified 2026-10-15).
- **FR-012**: The text view MUST offer search that works like the tree's search:
  - case-insensitive substring matching;
  - a match count ("N of M") or a "no matches" message;
  - next and previous by button and by Enter / Shift+Enter;
  - every match highlighted and the active one marked differently and scrolled into view.
- **FR-013**: The text view MUST offer a copy action that puts the whole text, exactly as stored
  and unmasked, on the clipboard. This is the same as the tree's "Copy value" (Plan 2 decision).
- **FR-014**: Every control in the text view MUST be reachable and usable by keyboard and MUST have
  an accessible name. The text region MUST scroll by keyboard, and the search status MUST be
  announced politely, as the tree's is.

**Both stories**

- **FR-015**: Every new or changed UI string MUST exist in English and Turkish.
- **FR-016**: The feature MUST work on Kibana 7.17, 8.x and 9.x.
- **FR-017**: A failure inside the panel or the text view MUST NOT break Kibana or the rest of the
  bar.
- **FR-018**: The settings schema MUST NOT change, and the feature has no setting of its own.
- **FR-019**: For a log with no form text, the panel's tree content and the Markdown, JSON and
  cURL copies MUST stay byte-for-byte the same as before. The only visible change for such a log
  is the panel button's label.

### Key Entities

- **Structured text**: text in a log field that opens as a tree. It is JSON, XML or (new) form
  data. One rule decides it for every consumer, and nesting is limited to the existing depth.
- **Text field**: a `_source` field holding text that is not structured text and is multi-line or
  at least 500 characters long.
- **Panel entry**: one listed field, with its path and its kind (JSON, XML, form or text). The kind
  decides whether it opens as a tree or as text.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On Alpha, an `iys_log` token request's form body opens as a tree with its 3 keys. The
  Markdown and JSON copies of that log contain the credential only as `***`.
- **SC-002**: The measurement is re-run on Alpha's 23 data views (last 500 documents each). Every
  field that the panel cannot open as structure and that is multi-line or at least 500 characters
  long is reachable in the panel: 0 unreachable. No single-line field shorter than 500 characters
  is listed as text.
- **SC-003**: A user can find a word in a 100-line `cron_log` output and copy the whole output in
  under 15 seconds, without leaving the page. The table's columns line up when it opens.
- **SC-004**: A 100 KB text opens, and its search results appear, within 1 second on a typical
  laptop.
- **SC-005**: For logs with no form text, the copies stay identical to before the change. The
  existing automated checks pass with only the panel button's label updated.
- **SC-006**: The form and text-view scenarios pass on Kibana 7.17, 8.x and 9.x.

## Assumptions

- **The 500-character threshold is based on the measurement (clarified 2026-10-15).** At 200
  characters the list fills with authorization headers, signatures and tokens in three indexes,
  all of them 440 characters or less. At 500 only real bodies, error texts and log messages remain.
  It is one shared constant, not a setting.
- **Only `_source` fields whose value is a single text are listed.** Array items, and long strings
  inside an opened JSON, XML or form tree, stay in the tree as today.
- **No indentation for broken XML or JSON (clarified 2026-10-15).** The measurement found little
  such text: 1 HTML page, 10 HTML fragments, 24 HTML comments and 35 truncated JSON texts. So the
  text view shows text as stored.
- **Form keys stay flat.** No form text with `a[b]` keys was measured. Nesting can be added if it
  appears.
- **A form key never starts with a bracket** (planning, 2026-10-15). PHP's form encoding never
  writes one, and the rule keeps FR-006 true: form text cannot start with `{`, `[` or `<`.
- **The panel shows values unmasked**, like Kibana and like the tree (Plan 2 decision, kept by the
  user for this feature). Shared output goes through the masked copies.
- **The Plan 6 parser and its depth limit are reused unchanged;** the form rule is added beside
  them.
- **The e2e seed has no form text and no multi-line text field today.** The seed and the e2e tests
  must gain them together (CLAUDE.md: the seed is a contract with the e2e tests).
- **Release (clarified):** User Story 1 ships in the unreleased 1.0.0, in its own pull request, so
  the store upload carries no credential leak. In that release the panel tags form fields "form"
  (FR-008) and the button keeps its "JSON" label. User Story 2 ships in 1.1.0, in a second pull
  request, with the text fields, the "text" tag and the button rename (FR-009).

### Out of scope

- Opening text that has plain text before or after JSON or XML (filebeat's syslog line and its
  metrics, `Request: <…>`). User decision on 2026-10-15; Plan 6 §10 had excluded it too.
- Parsing HTML (named entities such as `&nbsp;`, several root elements). It opens in the text view.
- Raw HTTP messages, multipart bodies and header blocks: none were measured.
- Indenting or reformatting text in the text view.
- Opening long strings found inside a tree as text.
- Masking on screen, or in the panel's own copy actions.
- Nested form keys (`a[b][c]`).
- Kibana's own document view and JSON tab.

## Appendix: Alpha measurement (2026-10-15)

Alpha Kibana (7.17.26) was measured on 2026-10-15 through the user's browser session, read-only.
The sample was the last 500 documents of each of the 23 data views (sorted by time where the view
has a time field). Every text value was classified with the extension's own structured-text rule,
including text nested inside JSON or XML. Only field paths, counts, lengths, line counts and
character-class shapes (letters → `a`, digits → `9`) were read. No value was recorded.

| Data view | Field | Finding |
|---|---|---|
| `payment_log`, `coupon_log`, `tjk_webhook_log*`, `altenar_api_log` | request, response | All open as XML today. No unopened text. |
| `withdraw_log` | `context.response` | 380 JSON and 4 XML open. 11 do not: 1 HTML error page and 10 plain-text error messages, 4 of which contain tags. The field is up to 956 characters and 10 lines. |
| `iys_log` | `context.options.body` | 151/500 form-urlencoded: 3 keys (an OAuth token request with a credential), at most 59 characters. The only form text found. |
| `cron_log` | `context.output` | 500/500 multi-line console output (box-drawing tables), up to 7,169 characters and 104 lines. |
| `shared_coupon_log` | `context.trace`, `context.error` | 15 stack traces, up to 8,116 characters and 34 lines. 10 errors start with an HTML fragment that is not XML. |
| `sms_log` | `context.content` | 282/500 multi-line SMS text, up to 427 characters. |
| `monolog` | `message` | 13/500 multi-line, the rest single lines under 233 characters. |
| `social` | `body.comment` | 100 open as XML (XHTML); 24 HTML comments fail on named entities such as `&nbsp;`. |
| `filebeat-*` | `message` | 377/500 are a syslog prefix followed by JSON: 367 filebeat metrics and 10 filebeat state records. 22 more end in truncated JSON. Single line, up to 1,176 characters. |
| `banner_catalog` | `context.payload_prefix` | 13/34 JSON cut at 200 characters. |
| `game_log` | `context.message` | 1 text with JSON embedded mid-line. |
| `user_action_log` | `context.body`, `context.query` | Form submissions are logged as JSON objects, not as form text. |
| all | — | No raw HTTP messages, multipart bodies, header blocks, prefixed XML or CDATA. |

Single `key=value` tokens (headers `tracestate`, `cookie`, `accept-language`; `game_log`
`PlatformTransactionId`; `filebeat` user names) were classified as single pairs, which is why
FR-001 requires at least two pairs joined by `&`.
