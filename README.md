# kibanatool

A Chrome extension that speeds up working with logs in Kibana Discover. It adds a row of action buttons to
the log you open, built from that log's raw fields. It works on Kibana 7.17, 8.x and 9.x.

Inspired by [graytool](https://github.com/bozkurtemre/graytool) for Graylog.

Website: https://cllakyz.github.io/kibanatool/

## Install

1. Install kibanatool from the [Chrome Web Store](https://chromewebstore.google.com/detail/kibanatool/flgnjcjghmbcnfhilikbeddkhjiagodp).
2. Click the toolbar icon to open the options. Save
   [`kibanatool-settings.json`](https://raw.githubusercontent.com/cllakyz/kibanatool/main/examples/kibanatool-settings.json)
   (right-click, Save link as) and load it under **Export and import**. Importing replaces all current settings.
3. On **Environments**, enter a name and your Kibana's address, e.g. `https://kibana.example.com` or
   `https://example.com/kibana`, and click **Add and grant access**. Chrome asks for access to that site;
   kibanatool runs nowhere else. Under **Variables**, fill in `adminUrl` and `jiraUrl` in its column and click
   **Save**. Then remove the example "Production" environment, reload your Kibana tab and open a log.

Full guide: [English](https://cllakyz.github.io/kibanatool/docs/getting-started/introduction) ·
[Türkçe](https://cllakyz.github.io/kibanatool/tr/docs/getting-started/introduction)

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

CI runs the unit checks and the e2e tests against all three versions on every pull request to `main`.

### Website

The website is a Docusaurus site in `website/`, a separate package.

```bash
npm --prefix website ci
npm --prefix website start       # dev server
npm --prefix website run build
npm --prefix website test
npm --prefix website run smoke   # needs a build, and `npx playwright install chromium` once, from website/
```

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
