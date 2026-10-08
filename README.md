# kibanatool

A Chrome extension that speeds up working with logs in Kibana Discover (7.17, 8.x, 9.x): it adds
action buttons built from the raw fields of the log you open. Inspired by
[graytool](https://github.com/bozkurtemre/graytool) for Graylog.

> Status: early development. Design: `docs/superpowers/specs/2026-10-07-kibanatool-design.md`.

## Privacy

The extension only sends same-origin requests to the Kibana you configure, using your own session, and opens the links you click. There is no telemetry and no third-party service.

## Development

Requirements: Node 22+, npm, Docker (for the dev stacks), Docker Compose v2, jq, openssl, curl.

```bash
npm install
npm test
npm run build            # output: .output/chrome-mv3
npm run check:manifest   # fails if the manifest asks for more permissions than allowed
```

Load the extension: open `chrome://extensions`, enable *Developer mode*, *Load unpacked* →
`.output/chrome-mv3`. Then open the extension's options, add your Kibana address, grant access and
reload your Kibana tab.

### Kibana dev stacks

```bash
./docker/up.sh 8     # Kibana 8.19.23 on http://localhost:18601
./docker/up.sh 9     # Kibana 9.5.5  on http://localhost:19601
./docker/obs-view.sh 9   # optional: Observability view (ECS logs open on "Log overview")
./docker/down.sh 8   # stop and delete data
```

Security is on; the browser signs in anonymously, no password needed. Data views: `app_log`
(Monolog-shaped, time field `datetime`), `*_log` (no time field) and `logs-*` (ECS, `@timestamp`).

## License

MIT
