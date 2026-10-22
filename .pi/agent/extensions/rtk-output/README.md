# RTK output selection for Pi

This extension is discovered from `~/.pi/agent/extensions/rtk-output/` by Pi 1.2.0. It complements the existing `~/.pi/agent/extensions/rtk.ts` command rewriter; provider/model settings are not changed and RTK proxy routing is not used.

## Switches

- `RTK_JEV=0` disables JEV selection while leaving the existing RTK rewrite extension enabled.
- `RTK_DISABLED=1` disables both the existing RTK command rewriting and this result optimizer.
- `RTK_JEV_THRESHOLD` defaults to 16000 characters; `RTK_JEV_BUDGET` defaults to 8000 characters; `RTK_JEV_TIMEOUT_MS` defaults to 8000 ms.

The JEV client uses `TYPESAFE_API_KEY` from the Pi process environment or `~/.pi/agent/jev.env` (mode 600), and the installed TypeSafe SystemOne endpoint. It scores at most 12 candidates per request because that is the installed client contract; larger sets fall back to RTK instead of partial scoring. Candidate excerpts and paths are capped at 500 characters, task text at 6000 characters, the command/search context at 3000 characters, and response bodies at 64 KiB. No chat history or hidden reasoning is sent. If JEV is disabled, unavailable, invalid, times out, or current task context is missing, eligible output falls back to RTK's explicit `log` (Bash) or `grep` filter.

## Retrieval and storage

Compressed results include a random 16-character output ID. It is this extension's ID, not an RTK `rtk recall` hash. Call `rtk_output_recall` with that ID, a 1-based `from` line, and `lines` from 1 to 300. Each response is capped at 32000 characters. Store records are independent per output/session, mode 600, under `~/.pi/agent/rtk-output-store/`. Storage has a hard 256 MiB limit and never automatically deletes records; once full, new saves fail open. After confirming no active session needs retained IDs, remove old JSON records manually to reclaim space.

Pi may truncate command output before extensions receive it. In that case only the visible fragment and Pi's original continuation/path notice are retained; retrieving the extension ID cannot recover bytes Pi did not provide.

## RTK compatibility

The installed RTK is 1.0.1. Its `rtk hook claude` is a PreToolUse hook, returns no PostToolUse transform, and the active pipeline is `rtk:default`; the posthook pipeline's after-tool rules are inert without the RTK proxy. Proxy routing is intentionally disabled. Accordingly this extension does not call that ineffective PostToolUse hook. Existing `rtk rewrite` behavior and RTK's specialized command filters continue to operate; outputs from commands already run through RTK are not JEV-selected. There is no generic post-result RTK hook in this installed non-proxy configuration. This extension invokes RTK's public `pipe --filter log` or `grep` commands directly on fallback; it does not run `cap` before JEV scoring.

## Rollback

No Pi settings or pipeline rules were changed; the dated settings and existing `rtk.ts` backups are in `~/.pi/agent/backups/`. To disable only Jev for a Pi process, launch it with `RTK_JEV=0`; to disable the whole RTK integration, use `RTK_DISABLED=1`. Removing the new `rtk-output/` extension directory restores the pre-install extension set. The TypeSafe key is in `~/.pi/agent/jev.env` and may be removed separately if you are uninstalling the integration.

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
