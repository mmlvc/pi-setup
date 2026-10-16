---
name: investigate
description: Diagnose an unclear bug or regression through evidence before proposing the minimal fix.
---

Use for unclear bugs, regressions, failing tests, unexpected behavior, and production-like errors. Skip it when the root cause is already obvious.

Follow this sequence:
1. Reproduce or precisely characterize the symptom.
2. Gather evidence from errors, relevant code paths, tests, configuration, and recent changes.
3. Narrow the affected scope and state a specific, testable root-cause hypothesis.
4. Test the hypothesis before editing.
5. Identify the root cause, implement the minimal fix, and validate the original failure scenario.

Do not use trial-and-error edits as the first approach. After three disproven hypotheses, stop and report the evidence and the best next investigation step. Add a regression test only when it is proportionate and meaningful. Run targeted validation first; do not require a full suite for every small fix. Do not use GBrain, telemetry, hooks, auto-commits, scope-lock scripts, browser automation, or persistent workflow state.
