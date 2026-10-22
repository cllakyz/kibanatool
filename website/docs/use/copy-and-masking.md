---
sidebar_position: 5
title: Copy and masking
description: Copy a log as Markdown or JSON with sensitive fields and values masked.
---

# Copy and masking

"Copy as JSON" copies the log's `_index`, `_id` and `_source`, with the JSON and XML text inside it expanded.

Both copies mask every field whose path matches a pattern under **Copy and masking** (by default
`*authorization*`, `*password*`, `*token*`, `*secret*`, `*cookie*` and `*php-auth-*`, the Basic-auth user and
password that Symfony copies out of `Authorization`), keys inside JSON, XML and form text included.

A field whose path matches is masked with everything inside it: an object, a list or an XML element becomes
a single `***`. That is what you want for a header list or a `<Token Type="…" Value="…"/>` element. But it
also hides a wrapper whose name merely contains the word, such as a SOAP operation `GetTokenRequest`.

To keep such a wrapper readable, narrow the pattern instead of removing it. `*token` matches names that end
in "token", such as `platform-token`, `ConfirmationToken` and `_token`, but not `GetTokenRequest`. Any
narrower pattern trades coverage for readability:

- `*token` misses a name like `tokenValue`;
- `*.token` matches only names that are exactly `token`, so it would leave `platform-token` or
  `refreshToken` in plain text.

They also look inside every value, such as plain-text bodies that a field name cannot reach, and replace each
of these with `***`. Each kind can be turned off under **Mask inside values**:

- Turkish IBANs: `TR` and 24 digits, written together or in the usual groups of four.
- Turkish ID numbers (TCKN): 11 digits with a valid checksum.
- Turkish mobile numbers: `5xx xxx xx xx`, with or without `+90`, `90` or `0` in front.
- Card numbers: Visa, Mastercard, Amex and Troy numbers with a valid Luhn digit.

A number glued to a letter or another digit is left alone, so IDs inside longer codes are not touched.
Masking applies to what you copy; the screen and your link templates are not changed. It is a best effort:
read the copy before you share it.

The request a log records can also be copied as a command: see [Copy as cURL](/docs/use/copy-as-curl).
