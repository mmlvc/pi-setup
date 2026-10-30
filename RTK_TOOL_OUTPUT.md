# Optional RTK tool-output selection

This setup includes Bash command rewriting through `.pi/agent/extensions/rtk.ts` and an optional output-processing extension at `.pi/agent/extensions/rtk-output/`.

The output extension preserves eligible large Bash and native grep results locally, then uses JEV to select relevant original fragments. If JEV is disabled, the key is unavailable, context is insufficient, or a request fails, it preserves the original successful result. For an actually failed tool result, it may use RTK filtering as a compact fallback. Small results and commands already handled by specialized RTK filters are skipped. This setup does not enable RTK proxy routing or change provider configuration.

## Requirements and installation

- RTK must be installed and available on `PATH`.
- Node.js with TypeScript stripping support is required (Node 22.6+; Node 24 recommended).
- Install the extension's declared dependency from the repository root:

  ```sh
  npm ci --prefix .pi/agent/extensions/rtk-output
  ```

- To enable JEV scoring, supply `TYPESAFE_API_KEY` in the Pi process environment or create `~/.pi/agent/jev.env` with mode `600` containing `TYPESAFE_API_KEY=...`. The repository must not contain this credential.

Without a key, tool calls continue through the RTK fallback; JEV is not contacted. That fallback can shorten eligible output, so it is not identical to disabling all output processing.

## Switches

- `RTK_JEV=0` disables JEV selection while retaining RTK processing.
- `RTK_JEV_DEBUG=1` enables diagnostic selection/fallback messages on stderr; it is off by default.
- `RTK_DISABLED=1` disables both RTK command rewriting and output processing.

## Retrieval and retention

Compressed output includes an extension-generated output ID (not an `rtk recall` hash). Use the `rtk_output_recall` tool with the ID, 1-based `from` line, and a `lines` count from 1 to 300 to retrieve a bounded range. Results are capped at 32,000 characters.

Raw results are retained under `~/.pi/agent/rtk-output-store/`, with a 256 MiB hard limit. The directory is mode `700` and records are mode `600`; records are not automatically deleted. Confirm no active session needs an ID before manually deleting old records. If Pi truncated the result before the extension received it, only the available fragment can be retrieved.

## Tests and replay

From the repository root:

```sh
node --experimental-strip-types --test .pi/agent/extensions/rtk-output/test.mjs
node --experimental-strip-types .pi/agent/extensions/rtk-output/replay.mjs [optional-session.jsonl]
```

Replay compares original output, ordinary RTK, and RTK+JEV. Character reduction measures output volume, not coding-task quality. See `.pi/agent/extensions/rtk-output/README.md` for compatibility details, endpoint limits, and replay limitations.
