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
- Copy menu: the log as Markdown with sensitive fields masked, a link to the log, and the current view with
  its time range fixed.
- JSON view for fields that hold JSON text: a tree with search, and copying a value or its path.
- Options page: environments with per-site access, an action editor with a live preview, copy and masking
  settings, export and import.
- Environment variables: `{env.name}` placeholders take each environment's own value, set in a variables
  table on the options page, so one set of actions works in every Kibana. A button whose variable is not set
  is greyed out with the reason.
- Discover actions can name their target data view (display name or index pattern) instead of an ID; the
  name is looked up in the current space.
- Settings files are version 2. Version 1 files and settings saved by earlier builds are converted when loaded.
- English and Turkish.
