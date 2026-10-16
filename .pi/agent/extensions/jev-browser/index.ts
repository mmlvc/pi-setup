// pi-jev-browser — high-level UI navigation for Pi.
//
//   Pi tool `jev_browser` -> @jkudish/jev-browser navigate({ task, page })
//                         -> Jev (TypeSafe System One) owns per-step decisions
//                         -> the SAME page the `agent_browser` tools control
//
// Reuse over rewrite: observation extraction, the Jev decision loop, element
// selection, action execution, stuck detection and verification all live in
// @jkudish/jev-browser. This file is only adapter/glue.

import { Type } from "typebox";
import { attachPage } from "./cdp-session.mjs";
import { resolveJevEnv, requireTypesafeKey } from "./jev-env.mjs";

/** Compact action trace: what Jev actually did, step by step. */
function summarizeSteps(steps) {
  if (!Array.isArray(steps) || steps.length === 0) return "no steps recorded";
  return steps
    .map((s) => {
      const action = s.executed_action ?? s.proposed_action ?? "?";
      const detail = s.detail ? ` — ${String(s.detail).slice(0, 120)}` : "";
      const confidence =
        typeof s.confidence === "number" ? ` (${s.confidence.toFixed(2)})` : "";
      return `${s.step}. ${action}${confidence}${detail}`;
    })
    .join("\n");
}

/** Failures Jev could not get past, surfaced so Pi can switch to debugging. */
function summarizeProblems(result) {
  const problems = [];

  if (result.stuck_reason) problems.push(`stuck: ${result.stuck_reason}`);
  if (result.recovery_reason) problems.push(`recovery: ${result.recovery_reason}`);
  for (const warning of result.warnings ?? []) problems.push(`warning: ${warning}`);
  for (const problem of result.extraction_problems ?? []) problems.push(`extract: ${problem}`);

  const consoleIssues = (result.console ?? []).filter(
    (e) => e.type === "console_error" || e.type === "page_error" || e.type === "request_failed",
  );
  for (const issue of consoleIssues.slice(0, 8)) {
    problems.push(`${issue.type}: ${String(issue.text).slice(0, 160)}`);
  }

  return problems;
}

export default function (pi) {
  pi.registerTool({
    name: "jev_browser",
    label: "Jev Browser Task",
    description:
      "Run a bounded browsing task on the CURRENT Pi browser page. A Jev (TypeSafe System One) model " +
      "chooses one action per step (click/fill/select/scroll/back/done) so the main model does not need a " +
      "reasoning turn between every click. Operates on the same browser session and page as the " +
      "agent_browser tools, so cookies, localStorage and open tabs are preserved and low-level tools can " +
      "inspect the result afterwards. Use for repetitive multi-step UI flows; use agent_browser directly " +
      "for screenshots, console/network debugging, precise assertions and unusual interactions.",
    promptSnippet:
      "jev_browser: run a multi-step UI task (click/fill/navigate) on the current Pi browser page without per-click reasoning",
    promptGuidelines: [
      "For UI flows that need several interactions (fill a form, open settings, change a value and save), prefer jev_browser over many individual agent_browser click/fill calls: it drives a bounded loop with its own stuck detection and returns a step trace.",
      "Write `task` as: exact target values + the action + a visible stop condition. Jev chooses WHICH element to act on, but it never invents your data: it cannot produce the text to type or the option to pick. Always name literal values ('type Alpha in the Project name field', not 'enter a name') and always state what marks success ('Stop once the page shows a SAVED message.'), otherwise the loop keeps proposing actions until it reports stuck.",
      "Mirror the page's real on-screen labels in `task` so Jev can match them, and keep each call to one coherent flow; split unrelated goals into separate calls.",
      "To guarantee jev_browser drives the SAME browser instance as your agent_browser session, first call agent_browser 'get cdp-url' and pass that exact WebSocket URL as jev_browser's cdp_url. Pi's native agent_browser keeps its own session registry, separate from the CLI's --session store.",
      "Keep using agent_browser for screenshots, console errors, network debugging, precise assertions, reading complex page state, and unusual interactions. Both tools can act on the SAME browser session, so no re-authentication is needed between them.",
      "After a jev_browser run, verify the outcome (with jev_browser's final_url/result or an agent_browser assertion) before reporting success; on failure, inspect console/network/page state with agent_browser, fix, then rerun the flow. A Jev run may reload the page, so verify the outcome rather than a transient input value.",
    ],
    parameters: Type.Object({
      task: Type.String({
        description:
          "The goal in plain language, naming the exact values to use and how the run should stop. " +
          "Jev decides which element to act on but does not invent your data, so write literal values " +
          "(e.g. 'In the Project name field type Alpha, select prod in the Environment dropdown, then " +
          "click Save. Stop once the page shows a SAVED message.'). Mirror the page's real labels and " +
          "always include a stop condition.",
      }),
      start_url: Type.Optional(
        Type.String({
          description:
            "Optional URL to navigate to first. Omit to operate on whatever page is currently open.",
        }),
      ),
      max_steps: Type.Optional(
        Type.Number({ description: "Maximum Jev decisions before stopping. Default 24." }),
      ),
      max_seconds: Type.Optional(
        Type.Number({ description: "Wall-clock budget for the run. Default 180." }),
      ),
      format: Type.Optional(
        Type.String({
          description:
            "Shape of the returned page content: text (default), markdown, html, or aria.",
        }),
      ),
      screenshot: Type.Optional(
        Type.String({ description: "'final' (default) or 'none'." }),
      ),
      page_index: Type.Optional(
        Type.Number({
          description:
            "Only set this to target a specific tab by 0-based index. Omit it in almost all cases: the tool then drives the active tab, skipping blank/new-tab surfaces automatically.",
        }),
      ),
      session: Type.Optional(
        Type.String({
          description:
            "Explicit agent-browser session name to attach to. Set the same name on agent_browser calls (--session) to guarantee both tools share one browser. Defaults to the implicit session.",
        }),
      ),
      cdp_url: Type.Optional(
        Type.String({
          description:
            "Exact CDP WebSocket URL to attach to, e.g. the value returned by agent_browser 'get cdp-url'. Use this when you need to guarantee jev_browser drives the very same browser instance as a specific agent_browser session.",
        }),
      ),
    }),
    executionMode: "sequential",

    async execute(toolCallId, params, signal) {
      // Resolve/apply credentials BEFORE importing jev-browser: its provider
      // module decides the Jev transport from process.env at import time.
      requireTypesafeKey();
      const jevEnv = resolveJevEnv();

      const { navigate } = await import("@jkudish/jev-browser");

      const {
        task,
        start_url,
        max_steps,
        max_seconds,
        format,
        screenshot,
        page_index,
        session,
        cdp_url,
      } = params;

      // Attach to the browser Pi is already driving. Nothing is launched.
      const attached = await attachPage({ pageIndex: page_index, session, cdpUrl: cdp_url });
      const { browser, page, cdpUrl, pageCount } = attached;

      try {
        const result = await navigate(
          {
            task,
            page, // injected: jev-browser will NOT close this page/context/browser
            ...(start_url ? { startUrl: start_url } : {}),
            ...(Number.isFinite(max_steps) ? { maxSteps: max_steps } : {}),
            ...(Number.isFinite(max_seconds) ? { maxSeconds: max_seconds } : {}),
            ...(format ? { format } : {}),
            ...(screenshot ? { screenshot } : {}),
          },
          signal,
        );

        if (result && typeof result === "object" && "error" in result) {
          throw new Error(String(result.error));
        }

        const status = result.status ?? "unknown";
        const problems = summarizeProblems(result);
        const ok = status === "done";

        const stepSummary = summarizeSteps(result.steps);
        const usage = result.usage ?? {};
        const cost =
          typeof usage.est_cost_usd === "number"
            ? `$${usage.est_cost_usd.toFixed(4)}`
            : "n/a";

        const lines = [
          `status: ${status}`,
          `final_url: ${result.final_url ?? "(unknown)"}`,
          result.final_title ? `final_title: ${result.final_title}` : null,
          `steps: ${Array.isArray(result.steps) ? result.steps.length : 0}`,
          `jev_calls: ${usage.jev_calls ?? "n/a"} | est_cost: ${cost}`,
          jevEnv.JEV_BROWSER_TYPE_BASE_URL
            ? `typing: ${jevEnv.JEV_BROWSER_TYPE_MODEL ?? "default"} via custom endpoint`
            : "typing: no provider configured (text fields will be left empty)",
          result.degraded ? "degraded: yes" : null,
          "",
          "action trace:",
          stepSummary,
        ].filter(Boolean);

        if (problems.length > 0) {
          lines.push("", "problems:", ...problems.map((p) => `- ${p}`));
        }

        if (result.text) {
          lines.push("", "page content (truncated):", String(result.text).slice(0, 4000));
        }

        const text = lines.join("\n");

        return {
          content: [{ type: "text", text }],
          details: {
            status,
            final_url: result.final_url ?? null,
            final_title: result.final_title ?? null,
            step_count: Array.isArray(result.steps) ? result.steps.length : 0,
            problems,
            steps: result.steps ?? [],
            usage,
            degraded: Boolean(result.degraded),
            browser: { cdp_url: cdpUrl, pages: pageCount, page_index: page_index ?? pageCount - 1 },
            screenshot_base64: result.screenshot_base64 ?? null,
          },
          isError: !ok,
        };
      } finally {
        // Detach only. The Pi-native browser, its cookies and its tabs stay alive.
        await browser.close().catch(() => {});
      }
    },
  });
}
