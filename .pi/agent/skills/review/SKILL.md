---
name: review
description: Review a substantial completed diff and relevant surrounding code for real defects and unnecessary complexity.
---

Use after substantial implementation or explicit review. Inspect current diff and surrounding code. Review against the active executable spec first: verify constraints and acceptance criteria using the spec, diff, relevant code, and validation results. Do not redesign a correct implementation merely for style.

For meaningful UI/UX features, also check:
- conformance to the spec and supplied reference/design system;
- information hierarchy and primary flow;
- interaction behavior and key states;
- responsive behavior;
- loading, empty, and error states;
- accessibility;
- unnecessary visual or interaction complexity.

Use screenshot/render feedback when it is available, but do not require browser or screenshot tooling for every UI task and do not install browser extensions automatically. Check implementation correctness, regressions, edge cases, types, state/concurrency, security, convention violations, meaningful tests, and complexity as relevant.

If a UI implementation lacks a required visual or interaction decision, treat it as a design blocker rather than approving an improvised redesign. For repeated substantial visual/UX corrections, use Astra for the bounded design/implementation decision instead of continuing an open-ended optimization loop.

Do not automatically fix, commit, invoke other agents, or start another workflow.
