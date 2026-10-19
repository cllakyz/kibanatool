# Contract: UI Text, README Text and Tests

Nothing exported changes: no signature, no setting, no copy output (FR-001, FR-007, SC-002). This contract fixes
the user-facing text and the checks, so tasks and reviews can compare against it.

## Locale strings (`public/_locales/{en,tr}/messages.json`)

**New key, `optionsMaskPatternsHelp`**, placed right after `optionsMaskPatterns`:

- **en:** A field or element whose name matches is masked with everything inside it, keys inside JSON, XML and
  form text included. To keep a wrapper such as GetTokenRequest readable, narrow the pattern instead of
  removing it: *token (names that end in "token") in place of *token*. Avoid *.token: it masks only names that
  are exactly "token", so tokens such as platform-token stay readable.
- **tr:** Adı eşleşen bir alan ya da eleman içindeki her şeyle birlikte maskelenir; JSON, XML ve form metninin
  içindeki anahtarlar da buna dahil. GetTokenRequest gibi bir sarmalayıcıyı okunur tutmak için deseni silmek
  yerine daraltın: *token* yerine *token (adı "token" ile bitenler). *.token kullanmayın: yalnızca adı tam
  olarak "token" olanları maskeler, platform-token gibi token'lar okunur kalır.

**Changed key, `optionsValueMasksHelp`** (FR-003):

- **en:** Searched inside every value, whatever the field's name. Applies to every copy: Markdown, JSON and cURL.
- **tr:** Alan adından bağımsız olarak her değerin içinde aranır. Bütün kopyalara uygulanır: Markdown, JSON ve
  cURL.

## Options page (`entrypoints/options/CopySection.tsx`)

The mask patterns label is followed by
`<p className="muted" id="mask-patterns-help">{t("optionsMaskPatternsHelp")}</p>`. Its textarea carries
`aria-describedby="mask-patterns-help"`. Nothing else in the section changes.

## README (`README.md`, section "Copy and masking")

A new paragraph goes after the one listing the default patterns:

> A field whose path matches is masked with everything inside it: an object, a list or an XML element becomes
> a single `***`. That is what you want for a header list or a `<Token Type="…" Value="…"/>` element. But it
> also hides a wrapper whose name merely contains the word, such as a SOAP operation `GetTokenRequest`.
>
> To keep such a wrapper readable, narrow the pattern instead of removing it. `*token` matches names that end
> in "token", such as `platform-token`, `ConfirmationToken` and `_token`, but not `GetTokenRequest`. Any
> narrower pattern trades coverage for readability:
>
> - `*token` misses a name like `tokenValue`;
> - `*.token` matches only names that are exactly `token`, so it would leave `platform-token` or
>   `refreshToken` in plain text.

## Tests

- **`tests/unit/core/mask.test.ts`**, test "masks a matching object, list or XML element whole", with
  `maskMatcher(DEFAULT_MASK_PATTERNS)`:
  - XML `<Envelope><Body><GetTokenRequest><User>u</User></GetTokenRequest></Body></Envelope>` gives
    `{ Envelope: { Body: { GetTokenRequest: MASK } } }`;
  - `{ "platform-token": ["a", "b"], accept: "json" }` gives `{ "platform-token": MASK, accept: "json" }`;
  - `{ tokenInfo: { scope: "read" } }` gives `{ tokenInfo: MASK }`.
- **`tests/unit/core/mask.test.ts`**, test "with *token in place of *token*, a wrapper opens and the measured
  token names stay masked":
  - every path in research R2's list matches `*token`;
  - `GetTokenRequest` with `User`, `Amount` and `<Token Type="a" Value="v"/>` gives `User` and `Amount`
    readable and `Token: MASK`.
- **`tests/e2e/options.spec.ts`**: on the options page, the mask patterns textarea's `aria-describedby` names an
  element whose text is not empty. No localized text is asserted (`tests/CLAUDE.md`).
