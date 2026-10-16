---
name: spec
description: Create a concise executable spec only when scope, contracts, acceptance, or handoff are materially unclear.
---

Use this skill only for meaningful work where a durable contract or handoff is useful: cross-module changes, migrations, concurrency/recovery, production writes, multi-state workflows, ambiguous scope, or significant worker/session handoff. Do not use it for obvious bugfixes, local UI corrections, targeted tests, renames/config edits, or one local function/endpoint without a contract change.

Create one file at `docs/specs/active/<feature>.md` with this default shape:

```markdown
# Task

## Goal

## Scope

## Non-goals

## Acceptance

## Validation

## Handoff
- status
- important decisions if task-local
- remaining risks
- follow-ups
```

Goal is one observable outcome. Acceptance contains 3–7 observable criteria. Validation contains exact commands or browser/manual checks. Add `Current state`, `Design`, `Open questions`, `Migration`, `Recovery`, or `Production constraints` only when they affect an implementation decision. A short Product/Scope check or Technical/Design check may be included in the same spec when uncertainty warrants it; never create separate planning/review artifacts automatically.

Ground the spec in targeted repository reads and existing architecture. Keep the smallest viable scope and state non-goals explicitly. The spec is an executable contract and handoff artifact, not a transcript or a general project plan. Do not implement automatically, create issues, install tools, or create extra persistent state.

At task boundaries, update the existing spec handoff with Completed, Important decisions, Relevant files/symbols, Validation performed, Remaining risk/next task, and Follow-ups. Before finishing, check that the next task could continue if the raw transcript disappeared.
