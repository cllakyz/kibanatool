---
sidebar_position: 3
title: XML and form data
description: How XML text and URL-encoded form text are read as JSON.
---

# XML and form data

Fields that hold XML text, such as SOAP request and response bodies, are read as JSON: in the JSON view, in
both copies and in placeholders.

- Namespace prefixes are dropped: `soap:Envelope` becomes `Envelope`.
- An attribute becomes `@name`, and the text of an element that has attributes becomes `#text`
  (`{context.request.Amount.#text}`).
- An element that appears more than once becomes a list. Every value stays text, so `00` keeps its zeros.
- XML or JSON escaped inside a value is opened too, up to five levels deep. In the copies, anything nested deeper
  is replaced with `***`.
- Text split by an element, comment or CDATA section is joined with a space, so `ID<br/>10000000146` reads
  `ID 10000000146` and its value is still masked.
- Text that is not well-formed XML, such as an HTML error page, stays as it is.

URL-encoded form text with two or more `&`-joined pairs, such as `username=…&password=…&grant_type=…`, is
read the same way and tagged "form" in the JSON view. Values are decoded and stay text, a repeated key becomes
a list, and a single `key=value` stays text. Masks reach its keys, so `*password*` hides a password inside it.

See [Placeholders and conditions](/docs/configure/placeholders-and-conditions) and
[Copy and masking](/docs/use/copy-and-masking).
