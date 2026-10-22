---
sidebar_position: 4
title: Placeholders and conditions
description: How {field}, {a|b|c} and {env.name} placeholders and button conditions work.
---

# Placeholders and conditions

- `{field}` is a field of the raw log. Nested fields use dots (`context.user_id`), and fields that hold JSON,
  XML or form text can be read inside too (`context.body.amount`, `context.request.Envelope.Body.Id`; see
  [XML and form data](/docs/use/xml-and-form-data)).
- `{a|b|c}` uses the first field that has a value. If none has one, the button is hidden.
- `{env.name}` is a variable of the environment you are in (see [Variables](/docs/configure/variables)), e.g. `{env.adminUrl}/users/{user_id}`.
  It goes into links as it is and is quoted like a field in KQL. A link may start with one if its value is an
  `http(s)` address. If the environment does not set it, the button is greyed out and its tooltip says why.
- A Discover action opens the data view of the open log, or the one under **Target data view**: a display
  name or an index pattern (e.g. `*_log`), looked up in the current space, or an ID. If no data view or more
  than one matches the name, the button is greyed out.
- Field values are URL-encoded in links and quoted for KQL in Discover queries.
- Conditions (`exists`, `equals`, `notEquals`, `contains`, `startsWith`) must all hold for the button to show.
