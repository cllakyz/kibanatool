---
sidebar_position: 2
title: Build from source
description: Build kibanatool yourself and load it in Chrome as an unpacked extension.
---

# Build from source

Requirements: Node 22+ and npm.

```bash
npm install
npm run build            # output: .output/chrome-mv3
```

Then open `chrome://extensions`, turn on developer mode, click **Load unpacked** and choose `.output/chrome-mv3`.

Tests, the Kibana dev stacks and the release steps are in the
[Development section of the README](https://github.com/cllakyz/kibanatool/blob/main/README.md#development).
