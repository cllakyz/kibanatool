---
sidebar_position: 1
title: Privacy and permissions
description: What kibanatool sends, stores and asks Chrome for, and why.
---

# Privacy and permissions

kibanatool talks only to the Kibana addresses you add, with your own session, and keeps its settings in your
browser. There is no telemetry and no third-party service. The full policy is in
[PRIVACY.md](https://github.com/cllakyz/kibanatool/blob/main/PRIVACY.md).

- **Settings.** Your Kibana addresses, actions and copy settings are stored only in your browser
  (`chrome.storage.local`). They leave your computer only if you export them to a file yourself.
- **Network.** The extension talks only to the Kibana addresses you add, with your own Kibana session, to
  read the log you opened and its data view. When you have marked actions to show on result rows, it also
  reads the logs of the rows on screen, kept in memory only while the page is open. These requests go from
  your browser to your Kibana.
- **Links.** Buttons open the address that your own action templates build, in a new tab, only when you click them.
- **Clipboard.** The extension writes to the clipboard only when you choose a copy command. It never reads it.
- **No telemetry, analytics, ads or remote code.**

## Permissions

- `storage`: keeps the user's settings (Kibana addresses, actions, copy settings) locally.
- `scripting`: registers the extension's script only on the Kibana addresses the user added
  (`chrome.scripting.registerContentScripts`), instead of declaring a content script for every site. On the
  same addresses it also registers a small script that runs in the Kibana page's own context and reads only
  the index and id of Discover's result rows (Kibana 7.17 keeps them only in its page data), so the actions the
  user chose can be shown on the rows. That script has no extension API, sends nothing and stays idle until
  the extension's own script asks.
- Host permissions (optional, `http://*/*` and `https://*/*`): requested at runtime for each Kibana address
  the user adds, one origin at a time. Needed to run on that Kibana and to read the opened log through
  Kibana's own API with the user's session. Never requested for any other site.

Access to each address is requested when you add it, and you can remove it at any time in `chrome://extensions`.

Questions: <https://github.com/cllakyz/kibanatool/issues>
