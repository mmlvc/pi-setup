# Coding behavior

- Infer scope from the request and existing code. Preserve unrelated user changes.
- Prefer the smallest correct change and progressive disclosure: targeted `rg`/deterministic search, then narrow reads of relevant ranges or symbols.
- One session is one coherent workstream, not one task. Related tasks may continue in the same session when the subsystem, contracts, invariants, working set, and unresolved state substantially overlap; prefer a fresh session when they do not.
- At each bounded task boundary, record a short semantic checkpoint in the existing active spec, `PROJECT_STATE.md`, or durable decision document: Completed; Important decisions; Relevant files/symbols; Validation; Remaining risk/next task; Follow-ups.
- Before finishing, perform a transcript-independence check: important context must be recoverable from repository memory rather than the raw transcript.
- If context has grown materially, a completed-task boundary is a preferred point for existing/native compaction; do not compact mechanically after every task.
- At meaningful phase changes or discoveries during non-trivial work, emit one short human-readable progress breadcrumb (for example: `Ищу место, где сохраняется snapshot state…`, `Причина подтверждена. Вношу минимальную правку…`, `Проверяю regression…`). Do not narrate every tool call or expose hidden reasoning.

## Delivery limits

- Use a spec only for cross-module changes, migrations, concurrency/recovery, production writes, multi-state workflows, unclear scope, or significant handoff. Skip it for obvious fixes, local UI fixes, targeted tests, renames/config edits, and one-function/endpoint changes without a contract change.
- Maximum 2 plan-review rounds and 2 code-review rounds. After the first review, subsequent rounds report blockers only.
- Blockers are data loss, duplicate send/write/charge, unrecoverable stuck state, security issue, broken required production path, or violated approved acceptance criterion.
- Nice-to-haves, cleanup, and unrelated refactors go to Follow-ups. Do not silently expand scope or reduce approved acceptance criteria.
- Stop when acceptance and validation pass.

## Model and workers

- Sol low is the default for known bounded work, implementation, validation, and read-only diagnostics; Sol medium is for local uncertainty during investigation.
- Use Astra medium for architecture, unclear scope, cross-module contracts, migrations, concurrency/recovery, production safety, or difficult dependency review. Astra high/max is only for a concrete race, security, financial/data invariant, serious incident, or genuinely hard architecture.
- Workers receive bounded task/spec context and return only status, changed files, validation, blockers/deviations, decisions, and a concise summary. Parallel workers require independent scopes/files; never edit the same files concurrently. Planner/scout/reviewer phases are optional.

## Verification

- Use checks proportional to risk; do not repeat broad suites without a new reason.
- Backend uses `backend/venv/bin/python`; integration tests use the dedicated local `pricesync_test` only.
- Production writes, deploys, and destructive operations require explicit authorization.
