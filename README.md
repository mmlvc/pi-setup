# pi-setup

Portable, project-neutral Pi coding-agent configuration.

This repository contains reusable agent instructions, worker definitions, skills, extensions, model routing, and UI settings. It intentionally excludes project-specific instructions, sessions, auth state, browser state, production credentials, and secrets.

## Contents

- `.pi/agent/AGENTS.md`: general coding-agent behavior
- `.pi/agent/agents/`: planner, worker, reviewer, scout, and visual tester definitions
- `.pi/agent/skills/`: reusable investigation, review, specification, browser, and documentation workflows
- `.pi/agent/extensions/`: reusable Pi extensions
- `.pi/agent/settings.json`: portable UI, package, and default model settings
- `.pi/agent/models.json`: provider/model definitions using environment-variable API keys

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

## Optional RTK tool-output selection

The bundled `.pi/agent/extensions/rtk.ts` delegates Bash command rewriting to `rtk rewrite`. The optional `.pi/agent/extensions/rtk-output/` extension preserves eligible large Bash and native grep results locally, then uses JEV to select relevant original fragments; when JEV cannot make a valid selection it falls back to RTK filtering. It does not enable RTK proxy routing or change provider configuration. See that extension's README for compatibility notes, retention limits, switches, retrieval, tests, and replay instructions.

The extension requires RTK on `PATH`, Node.js with TypeScript stripping support (Node 22.6+; Node 24 recommended), and its declared TypeBox dependency. Install the dependency in the extension directory with `npm ci`. To use JEV, supply `TYPESAFE_API_KEY` in the Pi process environment or create `~/.pi/agent/jev.env` with mode `600` containing `TYPESAFE_API_KEY=...`. Never commit this credential or retained outputs.

- `RTK_JEV=0`: disable JEV selection while retaining the ordinary RTK integration.
- `RTK_DISABLED=1`: disable RTK command rewriting and output processing.

Run the extension tests with `node --experimental-strip-types --test .pi/agent/extensions/rtk-output/test.mjs`.
