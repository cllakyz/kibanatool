---
sidebar_position: 4
title: Text view
description: Search long or multi-line text, such as console output and stack traces, in the View panel.
---

# Text view

The **View** panel (see [View panel](/docs/use/view-panel)) also lists text that is not JSON, XML or form data when it has more than one line or is at
least 500 characters long, such as console output, stack traces and long error messages. Shorter one-line
values, such as tokens and headers, are left out.

- The text is shown as stored, in a monospace font. An HTML page shows as its source; nothing in it runs.
- Multi-line text opens unwrapped, so console tables keep their columns; one-line text opens wrapped.
  **Wrap lines** switches either way.
- Search marks every match, shows the count and steps through them with ↑/↓ or Enter and Shift+Enter.
- **Copy value** copies the whole text as it is. Like the tree's copy buttons, it is not masked: use the ⋯ menu
  to share a log.
