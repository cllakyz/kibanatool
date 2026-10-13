# Changelog

All notable changes are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and versions follow [Semantic Versioning](https://semver.org/).

## [1.0.0] - Unreleased

First public release, for Kibana 7.17, 8.x and 9.x in Chrome.

### Added

- An action bar on the log you open in Discover (an expanded row on 7.17, the document flyout on 8.x/9.x),
  built from the log's raw fields, which are read from your Kibana with your own session.
- Link actions: URL templates with `{field|fallback}` placeholders and conditions.
- Discover actions: a KQL query from the log, optionally ±N minutes around the log's time, in a new tab.
- Copy menu: the log as Markdown or as JSON with sensitive fields masked, a link to the log, and the current
  view with its time range fixed.
- Masking inside values: "Copy as Markdown" and "Copy as JSON" also mask Turkish IBANs, Turkish ID numbers (TCKN,
  with a valid checksum), Turkish mobile numbers and card numbers (Visa, Mastercard, Amex and Troy, with a valid
  Luhn digit) wherever they appear in a value, such as XML or plain-text request bodies. Each kind can be turned
  off; all four are on by default.
- JSON view for fields that hold JSON or XML text: a tree with search, and copying a value or its path.
- XML as JSON: fields that hold XML text, such as SOAP bodies, are read as JSON in the JSON view, in both copies
  and in placeholders. Namespace prefixes are dropped, attributes become `@name` and the text beside them
  `#text`, and every value stays text. "Copy as JSON" writes `_index`, `_id` and `_source` with all JSON and
  XML text expanded; field-name masks now reach XML element names too.
- "Copy as cURL" for logs that record an HTTP request (`method`, `url`, and optionally `headers`, `body` and
  `query`, as in Symfony request logs): a bash command that sends the request again, with proxy headers dropped,
  masked with the same settings as the other copies; plain, HTML and XML text inside the request keeps only the
  value masks.
- Options page: environments with per-site access, an action editor with a live preview, copy and masking
  settings, export and import.
- Environment variables: `{env.name}` placeholders take each environment's own value, set in a variables
  table on the options page, so one set of actions works in every Kibana. A button whose variable is not set
  is greyed out with the reason.
- Discover actions can name their target data view (display name or index pattern) instead of an ID; the
  name is looked up in the current space.
- Settings files are version 3; settings from pre-release builds (versions 1 and 2) are converted when loaded.
- English and Turkish.
- The look of Kibana 9's Borealis theme, in light and dark. The options page follows the system's dark mode;
  the action bar follows the Kibana page it sits on (7.17, 8.x and 9.x).
- A magnifier-and-chart icon, in a light and a dark version; the toolbar shows the one that matches the
  browser's color scheme once the options page or a Kibana tab has been open.
- Text and form controls meet WCAG AA contrast in both themes: text at 4.5:1, input borders, the focus ring
  and the unset-variable and current-match marks at 3:1.
