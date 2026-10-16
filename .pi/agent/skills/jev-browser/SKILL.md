---
name: jev-browser
description: Use the existing Jev decision layer for bounded multi-step UI flows on the pi-agent-browser-native session.
---

# Jev browser tasks

`pi-agent-browser-native` is the single browser/computer-use stack. It provides the native `agent_browser`, `agent_browser_code`, and specialized `agent_browser_*` tools. `jev_browser` is a bounded decision layer attached to the same native session; it is not a competing browser implementation.

## Routing

- Use `agent_browser` for open, snapshots, screenshots, exact actions, console/network inspection, and assertions.
- Use `agent_browser_code` for bounded loops/branches or aggregation against the same persistent browser.
- Use `jev_browser` only for repetitive multi-step UI flows where Jev can choose one action per step. Obtain the native session CDP URL first and verify with native tools afterward.

The Jev adapter attaches to the existing native browser through CDP and injects the existing page into `@jkudish/jev-browser`; it does not launch a second browser. Keep its task literal and bounded: exact values, real labels, and a visible stop condition.

## Jev flow

```text
agent_browser open/snapshot
-> agent_browser get cdp-url
-> jev_browser(task, cdp_url)
-> agent_browser assertion/screenshot/network verification
```

Jev chooses which visible element to act on, but it does not invent text, options, or success criteria. Example:

```text
In the Project name field type Alpha, select prod in the Environment dropdown,
then click Save. Stop once the page shows a SAVED message.
```

Keep one coherent flow per call and bound risky runs with `max_steps`/`max_seconds`. A Jev run may reload or navigate the page, so verify the resulting state rather than transient input values.

## When not to use Jev

Use native `agent_browser` directly for one-off actions, screenshots, console/network debugging, precise assertions, complex page state, and unusual interactions. Do not introduce another browser wrapper or competing routing.
