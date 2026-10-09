# Tests

- Unit tests run in the `node` environment by default. DOM tests opt in per file with `// @vitest-environment happy-dom`. Tests use fake `fetch`/`scripting`/`permissions` objects (see the `*Like` interfaces), not WXT mocks.
- E2E tests never assert localized text (Chromium on macOS takes the UI language from the OS). They use `data-test-subj`, roles, menu order and the action labels from `e2eConfig()`, and read time ranges from `_g.time` in the URL, not from the 9.x time picker.
- The e2e copy of the extension (`.output/e2e-extension`) lists the stack's origin under `host_permissions`, because Chrome's permission prompt cannot be automated. The prompt itself is checked by hand (`docs/verification/2026-10-plan-3.md`).
