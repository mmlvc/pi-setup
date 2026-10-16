// Credential/typing-provider discovery for the Jev runtime.
//
// Pi may spawn extensions with a sanitized environment, so a key that exists in
// the user's shell files can be missing from `process.env`. Rather than failing,
// read the shell env files directly (names we control, values never logged).

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const SHELL_ENV_FILES = [".zshenv", ".zprofile", ".zshrc", ".bashrc", ".profile"];

/** Variables the Jev runtime needs; all are optional except the Typesafe key. */
const MANAGED_VARS = [
  "TYPESAFE_API_KEY",
  "JEV_BROWSER_TYPE_BASE_URL",
  "JEV_BROWSER_TYPE_API_KEY",
  "JEV_BROWSER_TYPE_MODEL",
  "JEV_BROWSER_TYPE_PROVIDER",
];

let cache = null;

/** Parse `export NAME="value"` / `NAME=value` lines, ignoring comments. */
function parseEnvFile(text) {
  const found = {};
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    // Strip only *escaped* quotes, never inner quotes: keys and URLs stay intact.
    value = value.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    if (value) found[match[1]] = value;
  }
  return found;
}

function readShellEnv() {
  const merged = {};
  for (const name of SHELL_ENV_FILES) {
    const path = join(homedir(), name);
    if (!existsSync(path)) continue;
    try {
      Object.assign(merged, parseEnvFile(readFileSync(path, "utf8")));
    } catch {
      // Unreadable file: ignore and keep whatever else we found.
    }
  }
  return merged;
}

/**
 * Resolve the Jev environment once per process: real env wins, shell files fill
 * the gaps. Values are applied to `process.env` so the Jev runtime (which reads
 * env directly) picks them up too.
 */
export function resolveJevEnv() {
  if (cache) return cache;

  const fromShell = readShellEnv();
  const resolved = {};

  for (const name of MANAGED_VARS) {
    const value = process.env[name]?.trim() || fromShell[name]?.trim();
    if (!value) continue;
    resolved[name] = value;
    if (!process.env[name]) process.env[name] = value;
  }

  cache = resolved;
  return resolved;
}

/** The Typesafe key, or a message explaining exactly how to provide it. */
export function requireTypesafeKey() {
  const { TYPESAFE_API_KEY: key } = resolveJevEnv();
  if (key) return key;

  throw new Error(
    "TYPESAFE_API_KEY is not set, so the Jev model cannot make per-step decisions.\n" +
      "Get a key at https://console.typesafe.ai/settings/keys and add it to a shell env file\n" +
      "that this extension can read (~/.zshenv is best), then retry:\n" +
      '  export TYPESAFE_API_KEY="<your key>"',
  );
}
