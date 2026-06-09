Focused review findings below.

## High

**1. `verify-space-api-mcp-smoke.mjs:65-71` — child stdout piped but never drained (hang risk)**
`stdio: ["ignore", "pipe", "pipe"]` pipes stdout, but only `stderr` has a `data` listener (line 71). If the API logs more than the ~64KB pipe buffer to stdout, the write blocks and the server hangs, stalling the smoke test until something times out.
```js
// line 68
    stdio: ["ignore", "ignore", "pipe"]   // we never read stdout; ignore it
```
(or add `child.stdout.on("data", () => {})` to drain it).

## Medium

**2. `verify-space-api-mcp-smoke.mjs:188-189` — thrown errors bypass the report entirely**
`postJson`/`waitForApi`/`connect` throw on network/build failures. Those throws are not caught, so when the API smoke throws: no report is written (line 199 never runs), `runMcpSmoke` never runs, and the failure isn't recorded in `failures`. The smoke harness is meant to summarize pass/fail but a real outage produces an opaque stack trace instead.
```js
let api = null, mcp = null;
try { api = await runApiSmoke(); } catch (e) { failures.push(`API smoke threw: ${e.message}`); }
try { mcp = await runMcpSmoke(); } catch (e) { failures.push(`MCP smoke threw: ${e.message}`); }
// then write report as before
```

**3. `ingest-space-programs.mjs:1696-1697` — `applicationStartDate` can be `undefined` and leak into source text**
Only `defaultDeadline` is guarded (line 1680). If `parseLooseDateRange` returns a deadline but no start date, `sourceTextOverride` becomes `...접수기간 undefined ~ 2026-...` and `applicationStartDate: undefined` is emitted. Either guard it or default it:
```js
const startText = applicationStartDate ?? "";
// use ${startText} in sourceTextOverride; emit applicationStartDate only if present
```

## Low / cleanup

**4. `verify-space-api-mcp-smoke.mjs:9` — `warnings` is declared and reported but never written to.** Dead unless intentionally a placeholder; remove or wire up.

**5. `ingest-space-programs.mjs:1706` — `.slice(0, 8)` silently caps discoveries** after fetching 6 pages. Per the project's "no silent caps" convention, `log`/console the dropped count, or document why 8.

**6. `ingest-space-programs.mjs:1659` — `/<tr>/` matches only attribute-less `<tr>`.** If the DJTP list ever renders `<tr class=...>`, every row is silently skipped (zero discoveries, no error). Use `/<tr\b[^>]*>[\s\S]*?<\/tr>/gi` to harden.

**7. `ingest-space-programs.mjs:1664` — unescaped `.` in `business.jsp`** matches any char (e.g. `businessXjsp`). Negligible in practice; escape as `business\.jsp` if tightening.

No blockers. Items 1–3 are the ones worth fixing before relying on this run.
