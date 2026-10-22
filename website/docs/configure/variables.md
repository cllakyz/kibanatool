---
sidebar_position: 2
title: Variables
description: Define values that differ per environment and use them in templates as {env.name}.
---

# Variables

On the **Variables** tab, add values that differ per environment, like your admin panel's address. Each row is a
variable, each column an environment; use them in templates as `{env.name}`.

`{env.name}` is a variable of the environment you are in, e.g. `{env.adminUrl}/users/{user_id}`.
It goes into links as it is and is quoted like a field in KQL. A link may start with one if its value is an
`http(s)` address. If the environment does not set it, the button is greyed out and its tooltip says why.

See [Placeholders and conditions](/docs/configure/placeholders-and-conditions).
