# Korea Space Support MCP Handoff

Last updated: 2026-06-09 KST

## Project Context

Repository:

```text
/Users/ldh/claude_projects/patents
```

Primary goal:

- Build and maintain an automated Korea space/aerospace support-program MCP/API dataset.
- Include concrete deadline-bearing public program notices for companies, startups, researchers, university labs, research teams, and consortium-style R&D opportunities.
- Exclude guide/portal/curated records, events, exhibitions, seminars, hiring, procurement, result notices, and deadline-unknown notices.
- Do not manually insert records. Improve crawler/parser/classifier and rerun ingestion.

Core files:

```text
scripts/ingest-space-programs.mjs
scripts/report-space-refresh.mjs
scripts/run-space-refresh.mjs
scripts/run-scheduled-space-refresh.mjs
scripts/verify-space-search-samples.mjs
scripts/verify-space-api-mcp-smoke.mjs
packages/shared/src/space-search.ts
packages/shared/src/space-data.ts
packages/shared/src/space-sources.ts
packages/shared/src/types.ts
apps/api/src/index.ts
apps/mcp/src/index.ts
docs/space-ingestion-runbook.md
docs/korea-space-data-sources.md
docs/space-source-terms-review.md
docs/korea-space-mcp-work-report.md
```

## Current State

Latest verified generated data:

- generated: `48`
- excluded: `0`
- discovered sources: `50`
- source families: `12`
- BIZINFO records with `originalAgencyUrl`: `15` / `15`
- shared tests: `13` pass (added event-leak guard + BIZINFO provenance coverage check)
- DJTP discovered/generated/excluded: `9` / `7` / `0`
- API/MCP smoke failures: `0`
- search sample failures: `0`

Latest known watchpoint:

- `report:space` showed `slow discovery: ITP 18.0s` once. This is not a functional failure; likely reader fallback/network latency.

Latest important artifacts:

```text
data/space-programs.generated.json
data/space-programs.excluded.json
data/space-ingest-report.json
data/space-search-sample-report.json
data/space-api-mcp-smoke-report.json
data/space-refresh-diff.json
data/space-refresh-history.jsonl
```

## Completed Work Summary

Implemented source expansion and parser hardening:

- Added researcher/lab/team support in search filters and ingestion policy.
- Added/expanded KARI, KASA, KASI, DAPA, ADD, K-Startup, KEIT, KIAT, TIPA/SMTECH, GNTP, DJTP, JNTP, ITP, KAIA, Bizinfo source coverage.
- Added HWP/HWPX/PDF deadline extraction paths.
- Added missing-deadline reason categories, including open-ended/variable deadline handling.
- Excluded portal/guide/curated records, event-only notices, exhibitions, seminars, procurement, results, and deadline-unknown items.
- Added Bizinfo filters for `경진대회`, `공모전`, `아이디어 대회` after a false positive was found.

Implemented recurring operation support:

- `npm run refresh:space`
- `npm run refresh:space:scheduled`
- scheduler lock/state/log files
- `ops/launchd/com.bidscout.space-refresh.plist`
- `data/space-refresh-diff.json`
- `data/space-refresh-history.jsonl`

Implemented search/API/MCP verification:

- `npm run check:space-search`
  - validates shared search UX samples for researcher/lab, company, startup, drone/UAM, defense-only, upcoming deadline.
- `npm run check:space-surfaces`
  - starts API server on a temp port and calls `/health`, `/space-programs/search`, `/space-programs/:id`.
  - starts MCP stdio server via SDK `Client + StdioClientTransport`.
  - calls `search_space_programs` and `get_space_ingest_report`.
- `npm run verify:space`
  - now runs check, search samples, API/MCP smoke, tests, typecheck, build.

DJTP provenance improvement:

- Previous DJTP records used homepage URL because direct `/pbanc/*.pdf` paths returned 404.
- Current implementation reads:

```text
https://www.djtp.or.kr/pbanc?mid=a20101000000&nPage=1..6
```

- Uses per-notice PMS viewer URLs as `sourceUrl` and `deadlineEvidenceUrl`.
- Preserves PMS business URL in `sourceTextOverride`.
- Direct PDF paths are not used as canonical source URL.
- Current DJTP generated records: `7`.

Claude review history:

- Successful review file:

```text
docs/reviews/claude-opus-space-review-2026-06-09.md
```

- File-direct Claude CLI review frequently hangs in this environment.
- Successful fallback was narrow snippet via stdin with `claude-opus-4-8 --effort low`.
- Review found no blockers.
- Fixed from review:
  - API smoke stdout pipe hang risk.
  - API/MCP smoke thrown errors bypassing report JSON.
  - API child cleanup guard.
  - MCP close cleanup.
  - DJTP `undefined` applicationStartDate text leakage.
  - DJTP `<tr>` regex hardening.
  - DJTP silent cap warning and cap increased to 12.

## Validation Commands

Use these after changes:

```bash
npm run ingest:space
npm run report:space
npm run check:space
npm run check:space-search
npm run check:space-surfaces
npm run verify:space
```

Expected current pass state:

- `check:space`: no warnings/failures.
- `check:space-search`: warnings `0`, failures `0`.
- `check:space-surfaces`: warnings `0`, failures `0`.
- shared tests: `11` pass.
- typecheck: shared/api/mcp/web pass.
- build: shared/api/mcp/web pass.

## Remaining Work

Recommended next priorities:

1. launchd registration — installed 2026-06-09
   - File: `ops/launchd/com.bidscout.space-refresh.plist`
   - Installed to `~/Library/LaunchAgents/com.bidscout.space-refresh.plist`
   - Loaded via `launchctl bootstrap gui/$(id -u)`. Schedule: every Monday 09:00 KST → `npm run refresh:space:scheduled`.
   - Plist hardening required during install:
     - Switched program from `/usr/bin/env npm` to absolute `/opt/homebrew/bin/npm` so launchd can resolve the binary without relying on PATH discovery.
     - Set `EnvironmentVariables.PATH = /usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin:/usr/local/bin`. `/usr/bin` is kept ahead of `/opt/homebrew/bin` so `python3` resolves to `/usr/bin/python3` (which has `curl_cffi`/`olefile` installed); Homebrew's 3.14 in `/opt/homebrew/bin/python3` does not have these packages.
   - Verified with `launchctl kickstart -k`: `last exit code = 0`, refresh cycle completed, `data/space-refresh-diff.json` + `space-refresh-history.jsonl` updated, `space-refresh-launchd.err.log` empty.
   - To unload later: `launchctl bootout gui/$(id -u)/com.bidscout.space-refresh && rm ~/Library/LaunchAgents/com.bidscout.space-refresh.plist`.

2. SMTECH/IRIS provenance improvement
   - Investigated 2026-06-09. Outcome:
     - SMTECH-system rows on `notice02_list.do` expose a stable `notice02_detail.do?ancmId=...&buclCd=...&dtlAncmSn=...&schdSe=...&aplySn=...` detail URL. Crawler now decodes HTML entities before extracting `ancmId`/`dtlAncmSn` so dedupe IDs are stable; `normalizeAbsoluteUrl` already strips `;jsessionid=...`.
     - IRIS-system rows use `href="javascript:goMove()"` which opens `iris.go.kr` root without exposing a notice id. No public stable per-notice IRIS URL can be reconstructed from this list page, and searching IRIS by title is not safe/stable. Documented in `space-sources.ts` `knownGaps`.
   - Status: closed. SMTECH-system path canonicalized; IRIS-system path remains list-anchor metadata-only by design.

3. Bizinfo/K-Startup original agency provenance
   - Investigated 2026-06-09. Outcome:
     - Bizinfo (`BIZINFO`, `MOTIE_KEIT_KIAT` families): detail page exposes a stable `<a id="barogagi" ...>` "출처 바로가기" link pointing to the original-agency notice URL. Crawler now extracts it during `normalizeProgram` and stores it on a new optional `SpaceProgram.originalAgencyUrl` field. 15/15 current Bizinfo records carry the field (KDIA, MSS, BTP, JBTP, JNTP, etc.).
     - K-Startup: detail page only exposes "사업안내 바로가기" via `javascript:fn_open_window('URL')` driven by per-notice attachments (Google Drive folders, agency homepages). URLs are inconsistent (some are storage links, not original notice pages) and the executing agency is already on the record as `agency`. Not surfaced as `originalAgencyUrl` since the link target is not a notice-detail URL in general.
   - Status: closed for Bizinfo. K-Startup left as aggregator URL with executing agency in `agency`, which is the canonical public reference.

4. More source expansion
   - Investigated 2026-06-09:
     - IRIS (`retrieveBsnsAncmBtinSituListView.do`): SPA list page; data loads via `retrieveBsnsAncmBtinSituList.do` AJAX. Empty POST returns the layout page only. Session/CSRF dependency makes anonymous automated harvest unsafe.
     - NRF (`/biz/notice/list?menu_no=362`): page contains no notice rows; rows render after form submit. Same constraint.
     - NTIS (`/rndgate/eg/un/ra/mng.do`): list area is a `fn_search`-driven search form with no rows in the initial HTML. Same constraint.
     - Regional TP (BTP, JBTP, JNTP, KDIA, MSS, etc.): already reachable via BIZINFO `originalAgencyUrl`. Per-site direct crawlers add maintenance cost without unique coverage at current volume.
   - Status: no safely automatable new family at this time. Revisit when Bizinfo aggregator drops a notice we know from another source, or when one of the above publishes a stable public RSS/API.
   - Candidate fallback: university 산학협력단 notice boards are usually plain HTML; case-by-case feasibility check still pending.

5. Negative/positive sample expansion
   - 2026-06-09 진행:
     - DAPA 분류기에 컨퍼런스/세미나/포럼/박람회/전시회/학술대회/공청회/설명회/간담회 가드 추가. 이전 excluded에 남아 있던 "「항공우주무기체계 기술발전 컨퍼런스 2026」 개최 안내"가 이제 분류 단계에서 차단됨 (discovered 51→50, excluded 1→0).
     - `space-search.test.ts`에 두 회귀 테스트 추가: (a) generated 레코드에 순수 행사/공모전/박람회·전시회 참가 공고가 새지 않는지, (b) BIZINFO `originalAgencyUrl` 적재율이 ≥80%인지.
   - 상태: 첫 라운드 완료. 추후 새로운 FP가 발견되면 위 가드 패턴을 동일 방식으로 확장.

6. Periodic Claude review
   - Prefer narrow snippets through stdin.
   - Direct file-reading Claude CLI may hang.

## Operating Rules To Preserve

- Do not manually add generated records.
- Deadline-unknown notices must stay excluded until parser/crawler can read a public final deadline.
- Curated/portal/guide pages are not program notices.
- Event/exhibition/contest-only notices are not program notices.
- Keep source storage metadata-only unless source policy explicitly allows broader storage.
- For defense/dual-use notices, keep public metadata only and preserve security/export-control warnings.
- Verify before claiming completion.

## Suggested New Session Prompt

Paste this into the new session:

```text
We are continuing work in /Users/ldh/claude_projects/patents.

Read this handoff first:
/Users/ldh/claude_projects/patents/docs/space-mcp-handoff.md

Also keep these project instructions in mind:
- Do not manually insert generated program records.
- Improve crawler/parser/classifier and rerun ingestion.
- Include concrete deadline-bearing Korea space/aerospace support and R&D program notices for companies, startups, researchers, university labs, research teams, and consortia.
- Exclude guide/portal/curated records, events, exhibitions, seminars, contests, hiring, procurement, results, and deadline-unknown notices.
- Use apply_patch for edits.
- Verify before claiming completion.

Current verified state:
- generated 49
- excluded 1
- discovered 52
- source families 12
- check:space/search/surfaces all pass
- verify:space passes

Recommended next task:
Start with remaining work item 2 from the handoff: SMTECH/IRIS provenance improvement. Inspect the current TIPA_SMTECH discovery in scripts/ingest-space-programs.mjs, determine whether stable public detail URLs can be reconstructed without login/manual work, make only safe automated changes, update docs/report, and run npm run verify:space.

If you find SMTECH/IRIS cannot be improved safely, document why and move to Bizinfo/K-Startup original agency provenance.
```

