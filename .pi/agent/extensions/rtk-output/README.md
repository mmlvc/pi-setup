# RTK output selection for Pi

This extension is discovered from `~/.pi/agent/extensions/rtk-output/` by Pi 1.2.0. It complements the existing `~/.pi/agent/extensions/rtk.ts` command rewriter; provider/model settings are not changed and RTK proxy routing is not used.

## Switches

- `RTK_JEV=0` disables JEV selection while leaving the existing RTK rewrite extension enabled.
- `RTK_JEV_DEBUG=1` enables diagnostic selection/fallback messages on stderr. It is off by default.
- `RTK_DISABLED=1` disables both the existing RTK command rewriting and this result optimizer.
- `RTK_JEV_THRESHOLD` defaults to 16000 characters; `RTK_JEV_BUDGET` defaults to 8000 characters; `RTK_JEV_TIMEOUT_MS` defaults to 8000 ms.

JEV fallback is deliberately conservative: offline, timeout, invalid-response, and missing-context cases preserve the original result. RTK's `pipe` filtering is used as a fallback only when the original tool result is actually marked as an error; successful large results are not reclassified by text matching.

The JEV client uses `TYPESAFE_API_KEY` from the Pi process environment or `~/.pi/agent/jev.env` (mode 600), and the installed TypeSafe SystemOne endpoint. It scores at most 12 candidates per request because that is the installed client contract; larger sets preserve the original result. Candidate excerpts and paths are capped at 500 characters, task text at 6000 characters, the command/search context at 3000 characters, and response bodies at 64 KiB. No chat history or hidden reasoning is sent. If JEV is disabled, unavailable, invalid, times out, or current task context is missing, eligible output preserves the original result; failed tool results may then use RTK's explicit `log` (Bash) or `grep` filter.

## Retrieval and storage

Compressed results include a random 16-character output ID. It is this extension's ID, not an RTK `rtk recall` hash. Call `rtk_output_recall` with that ID, a 1-based `from` line, and `lines` from 1 to 300. Each response is capped at 32000 characters. Store records are independent per output/session, mode 600, under `~/.pi/agent/rtk-output-store/`. Raw results are retained under `~/.pi/agent/rtk-output-store/`, with a 256 MiB hard limit. The directory is mode `700` and records are mode `600`; records are not automatically deleted. Confirm no active session needs an ID before manually deleting old records. If Pi truncated the result before the extension received it, only the available fragment can be retrieved.

## RTK compatibility

The installed RTK is 1.1.0. Its `rtk hook claude` is a PreToolUse hook, returns no PostToolUse transform, and the active pipeline is `rtk:default`; the posthook pipeline's after-tool rules are inert without the RTK proxy. Proxy routing is intentionally disabled. Accordingly this extension does not call that ineffective PostToolUse hook. Existing `rtk rewrite` behavior and RTK's specialized command filters continue to operate; outputs from commands already run through RTK are not JEV-selected. There is no generic post-result RTK hook in this installed non-proxy configuration. This extension invokes RTK's public `pipe --filter log` or `grep` only for failed eligible tool results; successful output is never sent through that fallback merely because JEV was unavailable.

## Rollback

No Pi settings or pipeline rules were changed; the dated settings and existing `rtk.ts` backups are in `~/.pi/agent/backups/`. To disable only JEV for a Pi process, launch it with `RTK_JEV=0`; to disable the whole RTK integration, use `RTK_DISABLED=1`. Removing the new `rtk-output/` extension directory restores the pre-install extension set. The TypeSafe key is in `~/.pi/agent/jev.env` and may be removed separately if you are uninstalling the integration.

## Validation

Run tests with:

```sh
node --experimental-strip-types --test ~/.pi/agent/extensions/rtk-output/test.mjs
```

Replay controlled fixtures and an optional local Pi JSONL session with:

```sh
node --experimental-strip-types ~/.pi/agent/extensions/rtk-output/replay.mjs /path/to/session.jsonl
```

The replay compares the original result, installed `rtk pipe --filter log|grep`, and this extension's JEV handler. Character reduction is not a coding-quality measurement. Real-log entries are unlabeled and therefore report no quality score.
