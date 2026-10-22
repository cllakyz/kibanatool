---
sidebar_position: 1
title: Action bar and row buttons
description: The bar above the open log, and the one-click buttons on result rows.
---

# Action bar and row buttons

When you open a log in Discover (an expanded row on 7.17, the document flyout on 8.x/9.x), kibanatool shows
a bar above it with your link and Discover actions, the [View panel](/docs/use/view-panel) and the **⋯** copy menu
(see [Copy and masking](/docs/use/copy-and-masking)).

Actions you mark with **Show in row** also appear on the result rows themselves: point at a row, or move
keyboard focus into it, and they show at the row's right end, so one click runs them without opening the log.
The bar keeps every action, the View panel and the copy menu. On 7.17, whose collapsed rows carry no log id, a
small script in the Kibana page's own context reads each row's index and id from Kibana's page data, only
while an action is marked.

Mark actions under **Show in row** in the [Actions](/docs/configure/actions) settings.
