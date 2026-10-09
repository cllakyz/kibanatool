# kibanatool

A Chrome extension that speeds up working with logs in Kibana Discover. It adds a row of action buttons to
the log you open, built from that log's raw fields. It works on Kibana 7.17, 8.x and 9.x.

Inspired by [graytool](https://github.com/bozkurtemre/graytool) for Graylog.

## What it does

When you open a log in Discover (an expanded row on 7.17, the document flyout on 8.x/9.x), kibanatool shows
a bar above it with:

- **Link actions** that jump to another system with a value from the log, e.g. `https://admin.example.com/users/{user_id}`.
- **Discover actions** that open related logs in a new tab: the same user's logs, or everything ±5 minutes around this log.
- **JSON**: fields that hold JSON text, such as a request body, as a tree you can search and copy from.
- **⋯** to copy the log as Markdown with sensitive fields masked, a link to the log, or the current view with its time range fixed.

## Set up

1. Install kibanatool from the Chrome Web Store, or build it (see [Development](#development)) and load
   `.output/chrome-mv3` as an unpacked extension.
2. Click the toolbar icon to open the options.
3. **Environments:** add your Kibana address, e.g. `https://kibana.example.com` or `https://example.com/kibana`.
   Chrome asks for access to that site; the extension runs nowhere else.
4. **Variables:** values that differ per environment, like your admin panel's address. Each row is a
   variable, each column an environment; use them in templates as `{env.name}`.
5. **Actions:** add link or Discover actions, and paste a sample log into the preview to see the result.
   Or import [`examples/kibanatool-settings.json`](examples/kibanatool-settings.json) under **Export and import** and edit it.
6. Reload your Kibana tab and open a log.

### Placeholders and conditions

- `{field}` is a field of the raw log. Nested fields use dots (`context.user_id`), and fields that hold JSON
  text can be read inside too (`context.body.amount`).
- `{a|b|c}` uses the first field that has a value. If none has one, the button is hidden.
- `{env.name}` is a variable of the environment you are in (see **Variables**), e.g. `{env.adminUrl}/users/{user_id}`.
  It goes into links as it is and is quoted like a field in KQL. A link may start with one if its value is an
  `http(s)` address. If the environment does not set it, the button is greyed out and its tooltip says why.
- A Discover action opens the data view of the open log, or the one under **Target data view**: a display
  name or an index pattern (e.g. `*_log`), looked up in the current space, or an ID. If no data view or more
  than one matches the name, the button is greyed out.
- Field values are URL-encoded in links and quoted for KQL in Discover queries.
- Conditions (`exists`, `equals`, `notEquals`, `contains`, `startsWith`) must all hold for the button to show.

### Example actions

These are in [`examples/kibanatool-settings.json`](examples/kibanatool-settings.json):

| Label | Kind | Template |
|---|---|---|
| User in admin | Link | `{env.adminUrl}/users/{user_id\|context.user_id\|user.id}` |
| Sentry | Link, only when `level_name` is `ERROR` | `https://acme.sentry.io/issues/?query={message}` |
| Jira | Link | `{env.jiraUrl}/issues/?jql=text%20~%20{user_id\|user.id}` |
| This user's logs | Discover | `user_id:{user_id}` |
| This user in all logs | Discover on the `*_log` data view, 60-minute window | `user_id:{user_id}` |
| ±5 minutes | Discover, 5-minute window | empty query |

### Copy and masking

"Copy as Markdown" masks every field whose path matches a pattern under **Copy and masking** (by default
`*authorization*`, `*password*`, `*token*`, `*secret*` and `*cookie*`), keys inside JSON text included.
Masking applies to what you copy; the screen and your link templates are not changed.

## Privacy

kibanatool talks only to the Kibana addresses you add, with your own session, and keeps its settings in your
browser. There is no telemetry and no third-party service. See [PRIVACY.md](PRIVACY.md).

## Development

Requirements: Node 22+, npm, Docker with Compose v2 (for the dev stacks), jq, openssl, curl.

```bash
npm install
npm test                 # unit tests
npm run typecheck
npm run build            # output: .output/chrome-mv3
npm run check:manifest   # fails if the manifest asks for more than allowed
```

### Kibana dev stacks

```bash
./docker/up.sh 7     # Kibana 7.17.29 on http://localhost:17601/kibana (served under a base path)
./docker/up.sh 8     # Kibana 8.19.23 on http://localhost:18601
./docker/up.sh 9     # Kibana 9.5.5  on http://localhost:19601
./docker/down.sh 8   # stop and delete data
```

Security is on; the browser signs in anonymously, no password needed. `up.sh` is safe to re-run: it
re-creates the same synthetic logs every time. Data views: `app_log` (Monolog-shaped, time field
`datetime`), `*_log` (no time field) and `logs-*` (ECS, `@timestamp`). Every stack also has a `test`
space; 9.x has an `obs` space in the Observability view, where ECS logs open on "Log overview"
(`/s/obs/app/discover`).

### End-to-end tests

```bash
./docker/up.sh 9
KT_STACK=9 npm run e2e                              # builds, then runs tests/e2e against that stack
KT_STACK=9 KT_CAPTURE=1 npm run e2e -- capture      # refreshes tests/fixtures from the stack
```

CI runs the unit checks and the e2e tests against all three versions on every pull request.

### Release

```bash
npm run icons   # after changing assets/icon.svg
npm run zip     # .output/kibanatool-<version>-chrome.zip, uploaded to the Chrome Web Store by hand
```

Store listing texts are in [docs/store-listing.md](docs/store-listing.md); changes in [CHANGELOG.md](CHANGELOG.md).

## Credits

The `{path|fallback}` placeholders, the condition operators and the field flattening are adapted from
[graytool](https://github.com/bozkurtemre/graytool) by Emre Bozkurt (MIT License, Copyright (c) 2026 Emre Bozkurt).

## License

MIT. See [LICENSE](LICENSE).
