Verification complete. I tested the live jina path end-to-end and confirmed several assumptions (the double-scheme URL actually works; the row parser matches current output). Here are the findings.

## Review findings — space ingest/report scripts

**No blocking issue.** The pipeline is functionally sound — I verified the ITP→jina→row-parse path end-to-end against the live site (HTTP 200, correct markdown, 10 `fncShow` rows matching `rowPattern`). All items below are robustness/quality concerns, ordered by severity.

---

### 1. ITP jina fallback can degrade silently (LOW-MED)
`ingest-space-programs.mjs:160-168` (`fetchWithJina` / `isFetchErrorPage`)
- **Issue:** `isFetchErrorPage` only matches Korean error markup (`요청하신 페이지…`, `errorPage`). When jina returns a **200 soft-error** (rate-limit / "Failed to fetch" in English/JSON), it passes the filter and is returned as "valid". With `preferJina: true`, jina is tried first, so `node`/`curl_cffi` are never reached, `rowPattern` matches 0 rows, and ITP discovery records **`discovered: 0` with status `ok`** — silent degradation, not an error.
- **Fix:** broaden `isFetchErrorPage` to catch jina soft-errors, or treat a jina result that yields 0 parsed rows as a miss and fall through to `node`/`curl_cffi`.
- **Residual risk:** jina rate-limits intermittently; a quiet day looks identical to a real "no new programs" day in the report.

**Sub-note (LOW, cosmetic):** `https://r.jina.ai/http://${url}` double-prefixes the scheme because `itpSupportListUrls` entries already start with `https://`. I confirmed jina tolerates this today (returns the correct page), so it's not breaking — but it relies on jina's lenient URL normalization. Drop the hardcoded `http://`.

### 2. `fetchPage` throws on total failure → aborts the whole ITP loop (LOW-MED)
`ingest-space-programs.mjs:216` (`throw new Error`) consumed at `1118-1119`
- **Issue:** `fetchPage` throws when all strategies fail (it does **not** return `undefined`). `discoverItpSupportSources` calls it inside `for (const [tmid, listUrl] of itpSupportListUrls)` with no per-URL guard, so a transient failure on `tmid=13` aborts before `tmid=672` is attempted — all ITP discovery is lost for the run.
- **Fix:** wrap each `fetchPage(listUrl…)` in try/catch and `continue` on failure (partial discovery beats none). Surfaced via `discoveryRunAudit`, so not silent — but coarse.
- **Residual risk:** none new; just improves isolation.

### 3. DJTP `url` points to homepage root; open-ended items dropped (LOW-MED)
`ingest-space-programs.mjs:1654` and `1648`
- **Issue A (intentional tradeoff, flag for provenance):** every discovered DJTP program gets `url: djtpMainUrl` (`https://www.djtp.or.kr/`). The only real pointer to the specific announcement is `seedAttachmentUrls: [pdfUrl]`. Canonical `url` no longer deep-links the notice; a reviewer following it lands on the rotating homepage.
- **Issue B:** `if (!defaultDeadline) continue;` drops DJTP items whose `applicationPeriod` doesn't parse (incl. 상시/open-ended) **before** they reach `describeMissingDeadline`. This is inconsistent with how other families surface open-ended programs.
- **Fix:** keep the PDF as evidence but prefer a stable per-item detail URL if one exists; for B, let deadline-less DJTP items flow through to the open-ended classifier instead of silently dropping.
- **Residual risk:** PDF link-rot makes the program untraceable (the homepage `url` won't help); homepage content drift weakens provenance.

### 4. Open-ended classification over-matches boilerplate (LOW)
`ingest-space-programs.mjs:2244` (`describeMissingDeadline`)
- **Issue:** `/상시|예산 소진|차수별 상이|별도 공지|수시 접수|선착순/` runs over the **entire** `text` and **before** the attachment checks. Common boilerplate like "결과는 별도 공지" (results announced separately) misclassifies a genuinely-missing deadline as `open_ended_or_variable_deadline`. Ordering also means an actually-checked attachment (`attachmentResult.text`) loses to a stray "별도 공지" in the body.
- **Fix:** anchor these terms to application/접수 context (not "결과/results"), and move the `attachmentResult?.text` check ahead so concrete evidence wins.
- **Residual risk:** display/triage-only — the deadline is already null; only the `reasonCategory` bucket is wrong, so humans may triage into the wrong queue.

### 5. `extractDeadlineContext` separator test is near-always true (LOW)
`ingest-space-programs.mjs:1969`
- **Issue:** `if (/[~∼～\-–—]/.test(context) || /20\d{2}-\d{2}-\d{2}/.test(context)) return context;` — the char class includes the **plain ASCII hyphen `-`**, which appears in nearly any 900-char window (URLs, words, image alts). So the first anchor found almost always returns immediately; the `while` loop rarely advances to a later, better occurrence. Also the `anchors` array is duplicated verbatim with `findDeadline` (`:1919`) — drift risk.
- **Fix:** drop plain `-` from the range-separator class (keep `~∼～–—` + ISO date), or require a date token near the separator; hoist the shared `anchors` to one const.
- **Residual risk:** evidence snippet is display-only (not the parsed value), so impact is a possibly-unhelpful context excerpt, not a wrong deadline.

### 6. Operational watchpoints: routine exclusions create noise; NaN formatting (LOW)
`report-space-refresh.mjs:80-84, 108`
- **Issue A:** every `sourceFamilyAudit` family with `excludedCount > 0` becomes a watchpoint. Exclusions are normal operation, so this fills the 12-item cap with routine entries. (Error entries are first in array order so they survive the slice — but excluded noise still consumes slots.)
- **Issue B:** `(item.durationMs / 1000).toFixed(1)` renders `"NaN"` if `durationMs` is missing. The `> 15000` filter is safe (`undefined > 15000` is false), so cosmetic only.
- **Fix:** gate excluded watchpoints behind a spike/threshold (e.g., excluded as a share of discovered) rather than `> 0`; guard formatting with `(item.durationMs ?? 0)`.
- **Residual risk:** none material; signal/noise improvement.

---

**Positive:** the `page_date_fallback` → `fallbackDeadlinePrograms` → watchpoint chain (`report-space-refresh.mjs:67-87`, `deadlineSource` at `ingest:2377`) correctly surfaces low-confidence deadlines for manual review — keep it; it's the right backstop for Finding 1.
