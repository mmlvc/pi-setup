# pi-setup

Portable, project-neutral Pi coding-agent configuration.

This repository contains reusable agent instructions, worker definitions, skills, extensions, model routing, and UI settings. It intentionally excludes project-specific instructions, sessions, auth state, browser state, production credentials, and secrets.

## Tools beyond default Pi

- **Pi Bar** (`pi-bar`): additional agent UI/status bar.
- **Better Compaction** (`@lll9p/pi-better-compaction`): improved context compaction.
- **Pi Agent Browser Native** (`pi-agent-browser-native`): browser automation tools for Pi agents.
- **Pi Tool Display** (`pi-tool-display`): configurable tool-call display.
- **Interactive Subagents** (`pi-interactive-subagents`): launch and coordinate interactive subagents.
- **Pi Cmux** (`pi-cmux`): cmux integration for Pi.
- **JEV Browser extension** (`.pi/agent/extensions/jev-browser/`): uses the JEV browser package with the native Pi browser session.
- **RTK command rewriting** (`.pi/agent/extensions/rtk.ts`): delegates supported Bash command rewrites to the installed RTK CLI.
- **RTK output selection** (`.pi/agent/extensions/rtk-output/`): optional JEV-based selection of relevant fragments from large tool outputs; see [RTK tool-output setup](RTK_TOOL_OUTPUT.md).
- **RTK CLI**: external prerequisite for command rewriting and RTK output fallback.
- **JEV / TypeSafe System One**: external scoring service used by the JEV browser and, optionally, RTK output selection.

The Pi packages and local extensions are configured in `.pi/agent/settings.json` and `.pi/agent/extensions/`. Default Pi capabilities are not listed here.

## Contents

- `.pi/agent/AGENTS.md`: general coding-agent behavior
- `.pi/agent/agents/`: planner, worker, reviewer, scout, and visual tester definitions
- `.pi/agent/skills/`: reusable investigation, review, specification, browser, and documentation workflows
- `.pi/agent/extensions/`: reusable Pi extensions
- `.pi/agent/settings.json`: portable UI, package, and default model settings
- `.pi/agent/models.json`: provider/model definitions using environment-variable API keys
- [Optional RTK tool-output setup](RTK_TOOL_OUTPUT.md): requirements, JEV key setup, switches, and retrieval

## Install

Back up an existing Pi configuration, then copy the contents of `.pi/agent` into `~/.pi/agent`:

```sh
cp -R ~/.pi/agent ~/.pi/agent.backup.$(date +%Y%m%d%H%M%S)
cp -R .pi/agent/. ~/.pi/agent/
```

Set provider credentials in the environment. The repository does not contain credentials:

```sh
export PI_ROUTER_CHEAP_API_KEY='...'
export PI_LAYSOAI_API_KEY='...'
```

Review `settings.json` and `models.json` before using the setup with a different provider account.

## Project-specific configuration

Add project-specific `AGENTS.md`, active specifications, issue skills, credentials, sessions, and deployment configuration in the project itself. They are deliberately not part of this setup.
