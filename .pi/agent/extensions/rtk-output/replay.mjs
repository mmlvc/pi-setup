import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import extension from "./index.ts";

const TOOL_THRESHOLD = Number(process.env.RTK_JEV_THRESHOLD ?? 16_000);
const extensionHarness = () => {
  const handlers = new Map(), tools = new Map();
  extension({ on: (n, fn) => handlers.set(n, fn), registerTool: t => tools.set(t.name, t) });
  return { handlers, tools };
};
const textOf = result => result?.content?.map(x => x.type === "text" ? x.text : "[non-text]").join("\n");
function execRtk(text, toolName) {
  return new Promise(resolve => {
    const p = spawn("rtk", ["pipe", "--filter", toolName === "grep" ? "grep" : "log"], { stdio: ["pipe", "pipe", "ignore"] });
    const out = []; p.stdout.on("data", x => out.push(x)); p.once("error", () => resolve({ text, failed: true }));
    p.once("close", code => resolve(code === 0 ? { text: Buffer.concat(out).toString() } : { text, failed: true })); p.stdin.end(text);
  });
}
async function jev(text, goal, command, toolName = "bash") {
  const h = extensionHarness(); h.handlers.get("before_agent_start")({ messageType: "user", prompt: goal });
  const event = { type:"tool_result", toolCallId:"replay", toolName, input: toolName === "bash" ? { command } : { pattern: command, path:"." }, content:[{type:"text",text}], details:undefined, isError:false };
  const oldFetch = globalThis.fetch; let usage;
  globalThis.fetch = async (...args) => { const response=await oldFetch(...args); try { usage=(await response.clone().json()).usage; } catch {} return response; };
  const start = performance.now(); const result = await h.handlers.get("tool_result")(event, { cwd:process.cwd(), signal:new AbortController().signal }); globalThis.fetch=oldFetch;
  return { text:textOf(result) ?? text, latencyMs:performance.now()-start, changed:Boolean(result), usage };
}
function controlled() {
  const filler = i => `routine diagnostic record ${i} ${"x".repeat(230)}`;
  const py = Array.from({length:100},(_,i)=>filler(i)); py[48] = `ERROR ValueError: required column missing in parser stage ${"e".repeat(200)}`;
  const trace = Array.from({length:90},(_,i)=>i<32?`worker ${i} ${"a".repeat(220)}`:i<35?`Traceback (most recent call last):\n  File "loader.py", line 91, in run\nKeyError: missing "sku" ${"z".repeat(200)}`: `worker ${i} ${"b".repeat(220)}`);
  const grep = Array.from({length:120},(_,i)=>`src/module${i%12}.py:${i+1}: ${i===61?"CRITICAL failure in requested parser":"unrelated match"} ${"g".repeat(140)}`);
  return [
    {name:"python-diagnostic-middle-error",text:py.join("\n"),goal:"Find the missing parser column and its cause",command:"python3 diagnostic.py",important:["ValueError","required column missing"]},
    {name:"traceback-boundary",text:trace.join("\n"),goal:"Diagnose the KeyError in loader.py",command:"python3 run_loader.py",important:["KeyError: missing", "loader.py"]},
    {name:"native-grep-grouping",text:grep.join("\n"),goal:"Find the critical parser failure",command:"grep -R critical .",toolName:"grep",important:["CRITICAL failure in requested parser"]},
  ];
}
async function runCase(item, real = false) {
  const original = item.text;
  const t0 = performance.now(); const ordinary = await execRtk(original, item.toolName ?? "bash"); const ordinaryMs = performance.now()-t0;
  const selected = await jev(original, item.goal, item.command, item.toolName ?? "bash");
  const row = { name:item.name, source:real?"real-log":"controlled", originalChars:original.length,
    ordinaryRtkChars:ordinary.text.length, ordinaryRtkMs:+ordinaryMs.toFixed(1),
    rtkJevChars:selected.text.length, rtkJevMs:+selected.latencyMs.toFixed(1), addedLatencyMs:+(selected.latencyMs-ordinaryMs).toFixed(1), jevUsage:selected.usage, jevCost:selected.usage?.cost ?? null,
    reductionVsOriginal:+(100*(1-selected.text.length/original.length)).toFixed(1),
    fallback:selected.text.startsWith("RTK-filtered output;"),
    knownImportant:item.important ? Object.fromEntries(item.important.map(x=>[x,{original:original.includes(x),ordinaryRtk:ordinary.text.includes(x),rtkJev:selected.text.includes(x)}])) : undefined,
  };
  return row;
}
async function realCases(path) {
  const lines=(await readFile(path,"utf8")).split("\n"), out=[],calls=new Map(); let goal="";
  for(const line of lines) try { const entry=JSON.parse(line),m=entry.message;
    if(m?.role==="assistant"&&Array.isArray(m.content))for(const block of m.content)if(block.type==="toolCall"&&block.id)calls.set(block.id,{name:block.name,arguments:block.arguments??{}});
    if(m?.role==="user") { const c=typeof m.content==="string"?m.content:Array.isArray(m.content)?m.content.filter(x=>x.type==="text").map(x=>x.text).join(" "):""; if(c)goal=c.slice(0,6000); }
    if(m?.role!=="toolResult"||!goal||!['bash','grep'].includes(m.toolName)||!Array.isArray(m.content)||m.content.some(x=>x.type!=="text"))continue;
    const text=m.content.map(x=>x.text).join("\n"); if(text.length<TOOL_THRESHOLD)continue;
    const call=calls.get(m.toolCallId),args=call?.arguments??{}; const command=m.toolName==="bash"?(typeof args.command==="string"?args.command:"persisted Bash command"):`grep pattern=${String(args.pattern??"unknown")} path=${String(args.path??".")}`;
    out.push({name:`${m.toolName}-${m.toolCallId}`,text,goal,command,toolName:m.toolName}); if(out.length>=3)break;
  } catch {}
  return out;
}
const realPath=process.argv[2];
const cases=[...controlled(),...(realPath?await realCases(realPath):[])];
const results=[]; for(const item of cases) results.push(await runCase(item, Boolean(realPath)&&cases.indexOf(item)>=3));
console.log(JSON.stringify({threshold:TOOL_THRESHOLD,budget:Number(process.env.RTK_JEV_BUDGET??8000),candidateLimit:12,results,notes:["Ordinary RTK replay uses installed `rtk pipe --filter log|grep`; those explicit filters may be lossy.","JEV usage comes from the TypeSafe response. No cost was returned in this run. Character reduction is not a coding-quality metric.","Real-log entries have no labels, so no real-log quality score is reported."]},null,2));
