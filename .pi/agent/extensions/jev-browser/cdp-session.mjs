// Resolve the CDP endpoint of the SAME browser session the pi-native
// `agent_browser` tool controls, then hand back a live Playwright Page.
//
// Reuse, not reimplementation: we shell out to upstream `agent-browser`
// (`get cdp-url`) exactly like pi-agent-browser-native does, so whatever
// session Pi's low-level tools are driving is the session Jev drives too.

import { execFile } from "node:child_process";
import { accessSync, constants as fsConstants, readdirSync } from "node:fs";
import { delimiter, join } from "node:path";
import { homedir } from "node:os";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// `get cdp-url` may return a JSON envelope ({"cdpUrl": "..."}) or a bare URL.
const CDP_URL_RE = /"cdpUrl"\s*:\s*"([^"]+)"/;
const BARE_URL_RE = /\b(wss?:\/\/\S+)/;

function isExecutable(candidate) {
  try {
    accessSync(candidate, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Locate the upstream `agent-browser` binary.
 *
 * Pi may spawn extensions with a PATH that lacks the Node global bin dir, so
 * PATH alone is not reliable. `AGENT_BROWSER_BIN` wins when set; otherwise scan
 * PATH plus the common Node/nvm global bin locations.
 */
export function resolveAgentBrowserBin(env = process.env) {
  if (env.AGENT_BROWSER_BIN && isExecutable(env.AGENT_BROWSER_BIN)) {
    return env.AGENT_BROWSER_BIN;
  }

  const dirs = [
    ...(env.PATH ?? "").split(delimiter).filter(Boolean),
    join(homedir(), ".local", "bin"),
    "/opt/homebrew/bin",
    "/usr/local/bin",
  ];

  // Any nvm-installed Node bin dir that contains agent-browser.
  try {
    const nvmVersions = join(homedir(), ".nvm", "versions", "node");
    for (const version of readdirSync(nvmVersions)) {
      dirs.push(join(nvmVersions, version, "bin"));
    }
  } catch {
    // No nvm; ignore.
  }

  for (const dir of dirs) {
    const candidate = join(dir, "agent-browser");
    if (isExecutable(candidate)) return candidate;
  }

  return "agent-browser"; // last resort: let the spawn fail with a clear error
}

/**
 * Read the live CDP endpoint for the browser session Pi's tools are driving.
 *
 * Never invents a port: the endpoint belongs to the running Pi-native browser.
 * `session` pins one explicit named session so jev_browser and agent_browser
 * deterministically address the SAME browser.
 */
export async function resolveCdpUrl({ session, timeoutMs = 20_000, cwd } = {}) {
  const args = [];
  if (session) args.push("--session", session);
  args.push("get", "cdp-url");

  let stdout;
  try {
    ({ stdout } = await execFileAsync(resolveAgentBrowserBin(), args, {
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024,
      env: process.env,
      cwd: cwd ?? process.cwd(),
    }));
  } catch (error) {
    const detail = String(error?.stderr || error?.message || "").trim();
    throw new Error(
      "Could not read a CDP endpoint from the Pi-native browser session " +
        `(\`agent-browser get cdp-url\` failed).${detail ? ` Upstream said: ${detail.slice(0, 400)}` : ""}`,
    );
  }

  const match = CDP_URL_RE.exec(stdout) ?? BARE_URL_RE.exec(stdout);
  if (!match) {
    throw new Error(
      "`agent-browser get cdp-url` returned no CDP endpoint. Is a browser session running? " +
        `Raw output: ${stdout.trim().slice(0, 300)}`,
    );
  }
  return match[1];
}

/**
 * The session's authoritative active tab, from `agent-browser tab list --json`.
 * `null` when the session cannot report it (caller falls back to heuristics).
 */
export async function resolveActiveTabUrl({ session, timeoutMs = 20_000, cwd } = {}) {
  const args = [];
  if (session) args.push("--session", session);
  args.push("tab", "list", "--json");

  try {
    const { stdout } = await execFileAsync(resolveAgentBrowserBin(), args, {
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024,
      env: process.env,
      cwd: cwd ?? process.cwd(),
    });
    const tabs = JSON.parse(stdout)?.data?.tabs;
    if (!Array.isArray(tabs) || tabs.length === 0) return null;
    const active = tabs.find((t) => t.active) ?? tabs[tabs.length - 1];
    return typeof active?.url === "string" ? active.url : null;
  } catch {
    return null; // fall back to Playwright-side heuristics
  }
}

/**
 * Attach Playwright to an existing CDP endpoint and return the page the
 * user/tool is currently looking at. The returned `browser` is a *connection*:
 * `close()` must only detach, never terminate the real browser.
 */
export async function attachPage({ cdpUrl, pageIndex, session, cwd } = {}) {
  const { chromium } = await import("playwright-core");
  const url = cdpUrl ?? (await resolveCdpUrl({ session, cwd }));

  const browser = await chromium.connectOverCDP(url);

  const context = browser.contexts()[0];
  if (!context) {
    await browser.close().catch(() => {});
    throw new Error("Connected over CDP but the browser exposed no context.");
  }

  const pages = context.pages();
  if (pages.length === 0) {
    await browser.close().catch(() => {});
    throw new Error(
      "Connected over CDP but the browser exposed no page. Open a tab in the Pi browser, then retry.",
    );
  }

  // Prefer a real page over blank/new-tab surfaces when no index is given, so a
  // stray new-tab does not become the Jev run target. The session's active tab
  // is authoritative; Playwright's view can briefly include stale surfaces.
  const isBlank = (u) =>
    u === "about:blank" || u.startsWith("chrome://new-tab") || u.startsWith("chrome://newtab");

  const activeUrl = await resolveActiveTabUrl({ session, cwd });

  // Read each page's URL ONCE: a live `p.url()` can change under us while a
  // new-tab surface finishes loading, which would make the chosen index point
  // at a different page by the time the caller reads it.
  const urls = pages.map((p) => p.url());

  let index;
  if (Number.isInteger(pageIndex) && pageIndex >= 0) {
    index = Math.min(pageIndex, pages.length - 1);
    // An explicit index that points at a blank/new-tab surface is almost never
    // what the caller meant (models commonly default page_index to 0), so fall
    // back to the real page rather than driving an empty tab.
    if (isBlank(urls[index])) {
      const real = urls.map((u, i) => [u, i]).filter(([u]) => !isBlank(u));
      const preferred = activeUrl ? urls.findIndex((u) => u === activeUrl) : -1;
      if (preferred >= 0 && !isBlank(urls[preferred])) {
        index = preferred;
      } else if (real.length > 0) {
        index = real[real.length - 1][1];
      }
    }
  } else {
    const byActive = activeUrl ? urls.findIndex((u) => u === activeUrl) : -1;
    if (byActive >= 0) {
      index = byActive;
    } else {
      const real = urls.map((u, i) => [u, i]).filter(([u]) => !isBlank(u));
      index = real.length > 0 ? real[real.length - 1][1] : pages.length - 1;
    }
  }

  const page = pages[index];

  return { browser, context, page, cdpUrl: url, pageCount: pages.length };
}
