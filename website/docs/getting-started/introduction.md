---
sidebar_position: 1
title: Introduction
description: kibanatool adds action buttons to the open log in Kibana Discover, built from that log's raw fields.
---

# Introduction

A Chrome extension that speeds up working with logs in Kibana Discover. It adds a row of action buttons to
the log you open, built from that log's raw fields. It works on Kibana 7.17, 8.x and 9.x.

Inspired by [graytool](https://github.com/bozkurtemre/graytool) for Graylog.

## What it does

When you open a log in Discover (an expanded row on 7.17, the document flyout on 8.x/9.x), kibanatool shows
a bar above it with:

- **Link actions** that jump to another system with a value from the log, e.g. `https://admin.example.com/users/{user_id}`.
  See [Actions](/docs/configure/actions).
- **Discover actions** that open related logs in a new tab: the same user's logs, or everything ±5 minutes around this log.
- **View**: fields that hold JSON, XML or form text, such as a request body, as a tree you can search and copy
  from, and long or multi-line text, such as console output or a stack trace, as text you can search.
  See [View panel](/docs/use/view-panel).
- **⋯** to copy the log as Markdown or JSON with sensitive fields and values masked, the request it records as a cURL command, a link to the log, or the current view with its time range fixed.
  See [Copy and masking](/docs/use/copy-and-masking).

Actions you mark with **Show in row** also appear on the result rows themselves: point at a row, or move
keyboard focus into it, and they show at the row's right end, so one click runs them without opening the log.
See [Action bar and row buttons](/docs/use/action-bar-and-row-buttons).

Ready to try it? [Install it](/docs/getting-started/install), then follow the [first setup](/docs/getting-started/first-setup).
