---
sidebar_position: 6
title: Copy as cURL
description: Copy the HTTP request a log records as a masked cURL command.
---

# Copy as cURL

A log that records an HTTP request, with a `method` and an absolute `http(s)` `url` under `context` or at the top
level, also gets "Copy as cURL": a bash or zsh command that sends the request again.

- `headers`, `body` and `query` are read from the same place. Each may be JSON text, as in Symfony request logs.
- The query is added to the URL, and a form body is written back as `a[b]=c`, the way PHP reads it. Multipart
  fields become `--form-string` options; uploaded files are not in the log, so they are left out.
- Transport, proxy and CDN headers are dropped: `host`, `content-length`, `connection`, `accept-encoding`,
  `forwarded`, `x-forwarded-*`, `x-real-ip`, `cf-*`, `cdn-loop`, `x-php-ob-level` and `php-auth-*`.
  `accept-encoding` becomes `--compressed`.
- The command is masked like the other copies (see [Copy and masking](/docs/use/copy-and-masking)), so a token reads `-H 'authorization: ***'`: put in your own before
  you run it. JSON and form text inside the request is masked inside and stays JSON or form text; plain, HTML
  and XML text stays as it is, with only the value masks.
