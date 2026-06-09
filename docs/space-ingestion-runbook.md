# Space Program Ingestion Runbook

This runbook is for recurring Korea space/aerospace support-program refresh work. The generated dataset must come from automated public-source discovery, not one-off manual record insertion.

## Scope

Include deadline-bearing public notices for:

- Companies and startups in space, aerospace, satellite, launch vehicle, aviation/UAM/drone, defense-space, and adjacent fields.
- Ordinary researchers, university labs, 출연연 researchers, and small research teams when the notice is a concrete research project call, researcher support program, collaboration call, or R&D participation opportunity.

Exclude:

- Guide pages, portals, policy pages, static infrastructure descriptions, and curated directory records that are not concrete program notices.
- Hiring, admissions, internship, camp, training-only, event-only, award, result, recap, and press/news notices.
- Generic SME/manufacturing/business-support notices without explicit space, aerospace, drone/UAM, defense-aerospace, satellite, launch, astronomy, or space-science signals.
- Deadline-unknown notices. Keep them in `data/space-programs.excluded.json` until the crawler/parser can read a public deadline.
- Login-gated, restricted, classified, export-controlled, or non-public defense information.

## Normal Refresh

Recommended cadence:

- Weekly during normal operation.
- Daily during heavy government R&D announcement seasons.
- Immediately after a user reports a missing official-source notice.

Commands:

```bash
npm run refresh:space
```

Use the scheduled wrapper when running from cron, launchd, systemd, or another scheduler:

```bash
npm run refresh:space:scheduled
```

Dry-run the scheduled wrapper without touching source data:

```bash
npm run refresh:space:scheduled -- --dry-run
```

Use the full verification chain after classifier, parser, source, or generated-data changes:

```bash
npm run verify:space
```

Validate the API/MCP search UX samples after filter or search-ranking changes:

```bash
npm run check:space-search
```

Validate the actual API and MCP surfaces after endpoint, schema, or tool changes:

```bash
npm run check:space-surfaces
```

Expected artifacts:

```text
data/space-programs.generated.json
data/space-programs.excluded.json
data/space-ingest-report.json
data/space-refresh-diff.json
data/space-refresh-history.jsonl
data/space-refresh-scheduler.log
data/space-refresh-scheduler-last.json
data/space-search-sample-report.json
data/space-api-mcp-smoke-report.json
```

Acceptance gates:

- `npm run check:space` has no `failures`.
- `source_url_coverage` is `100`.
- `duplicate_id_count` is `0`.
- Every generated record has `applicationEndDate`.
- `data/space-ingest-report.json` counts match generated and excluded files.
- New records have a credible `sourceFamily`, `spaceCategory`, `relevanceScore`, `sourceUrl`, `summary`, `eligibilityText`, `participationType`, and `lastCheckedAt`.
- Source review entries stay metadata-only unless `docs/space-source-terms-review.md` and `packages/shared/src/space-sources.ts` explicitly approve broader storage.
- Researcher/lab/team opportunities preserve `targetCompanyType`, `eligibilityText`, and `universityOrResearchPartnerRequired` where applicable.
- `data/space-ingest-report.json` includes `discoveryRunAudit` and `sourceFamilyAudit`; their discovered/generated/excluded totals match the generated and excluded files.
- `data/space-refresh-diff.json` is reviewed when the refresh is recurring rather than a first run.
- `data/space-refresh-history.jsonl` is appended on each recurring refresh so count drift and recurring changes can be audited later.
- `data/space-search-sample-report.json` has no failures for researcher/lab, company, startup, drone/UAM, defense-only, and upcoming-deadline search samples.
- `data/space-api-mcp-smoke-report.json` has no failures when API endpoints and MCP tools are exercised through their real runtime surfaces.

## Scheduled Refresh

`npm run refresh:space:scheduled` wraps the normal refresh with scheduler safety:

- Uses `data/.space-refresh.lock` to prevent overlapping runs.
- Treats an existing lock as stale after `SPACE_REFRESH_LOCK_STALE_MINUTES` minutes; default is `240`.
- Writes append-only scheduler logs to `data/space-refresh-scheduler.log`.
- Writes the latest scheduler status to `data/space-refresh-scheduler-last.json`.
- Exits `0` when a run is skipped because another fresh lock exists; this prevents noisy cron failures.

Cron example for a weekly Monday 09:00 KST refresh:

```cron
0 9 * * 1 cd /Users/ldh/claude_projects/patents && /usr/bin/env npm run refresh:space:scheduled >> data/space-refresh-cron.log 2>&1
```

During heavy government R&D announcement periods, use daily weekday refresh:

```cron
0 9 * * 1-5 cd /Users/ldh/claude_projects/patents && /usr/bin/env npm run refresh:space:scheduled >> data/space-refresh-cron.log 2>&1
```

For macOS launchd, use the checked-in plist:

```bash
cp ops/launchd/com.bidscout.space-refresh.plist ~/Library/LaunchAgents/
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.bidscout.space-refresh.plist
launchctl kickstart -k gui/$(id -u)/com.bidscout.space-refresh
```

The plist runs every Monday 09:00 local time and writes stdout/stderr to:

```text
data/space-refresh-launchd.log
data/space-refresh-launchd.err.log
```

Run `npm run verify:space` manually after code, classifier, parser, source, search-filter, API/MCP schema, or generated-data schema changes. The scheduled wrapper intentionally runs the lighter recurring chain: ingest, check, search-sample check, report, diff, and history.

## Source Terms Review

Use `docs/space-source-terms-review.md` as the terms/reuse checklist. The default policy is metadata-only:

- Keep official source URLs visible.
- Store short summaries and short deadline evidence snippets only.
- Do not store full notice bodies or full attachment text.
- Do not broaden storage for defense/dual-use sources without manual security/export-control review.
- Update `packages/shared/src/space-sources.ts` when legal review status, attribution, redistribution, or commercial-use assumptions change.

## API/MCP Search Filters

Use these filters when validating or demonstrating the runtime search layer:

```text
applicantType / applicant_type:
  researcher_or_lab       university labs, researchers, 출연연, research teams, R&D project calls
  company                 company-facing support, commercialization, local cluster, SME/venture notices
  startup_or_prefounder   startup, pre-founder, student founder, early commercialization notices

defenseOnly / defense_only:
  true                    only defense/dual-use or defense-category records; automatically includes defense and defense-adjacent records without requiring includeAdjacent

adjacentOnly / adjacent_only:
  true                    only adjacent categories such as drone/UAM/defense-aerospace; automatically includes adjacent records
```

`includeDefense` and `includeAdjacent` remain the broad opt-in switches. Use `defenseOnly` or `adjacentOnly` when the user asks specifically for 방산/국방 or 인접분야 results rather than mixed results.

## Source Rules

KASA:

- Use public business notices only.
- Keep explicit space, satellite, aerospace R&D, commercialization, or industry-support notices.
- Exclude result, hiring, facility operation, event, and non-program notices.
- If the HTML has no deadline, use public PDF/HWPX/HWP attachments only for lightweight deadline metadata extraction.

KARI:

- Use public research-business notices.
- Include aerospace, launch vehicle, satellite, lunar exploration, space strategy technology, and adjacent R&D project calls.
- Include research project calls for labs/researchers when they are concrete 공모/신규과제/위탁연구 notices.
- Exclude procurement, hiring, training, internships, camps, tours, events, and result notices.

KASI:

- Use public notices for astronomy, space science, space exploration, observation infrastructure, space surveillance, and researcher support.
- Include researcher/expert, university lab, 출연연, and small research-team opportunities when they are concrete support or project calls.
- Exclude UST admissions, hiring, procurement, event recaps, and general announcements.
- When a Korean deadline omits the year, use the notice registration year only if the registration date is publicly visible.

DAPA:

- Use public notice-list metadata only.
- Include explicit space, satellite, surveillance/reconnaissance, C4I, defense-aerospace, drone, unmanned-system, or aviation-electronics signals.
- Generic defense terms alone are not enough.
- Always preserve defense/export-control/security warnings.
- Do not ingest restricted, login-gated, classified, or export-controlled details.

ADD:

- Use public `제안서 공모 > 공모안내` metadata only.
- Include explicit defense-space, satellite, surveillance/reconnaissance, defense-aerospace, drone, unmanned-system, stealth aircraft, aircraft materials, or aviation sensor proposal calls.
- Generic future-defense, AI, battlefield-awareness, competition, event, guidance, and cost-analysis notices are not enough.
- Always mark records as defense/dual-use and preserve security/export-control/eligibility warnings.
- Do not store restricted, login-gated, classified, or export-controlled details; users must review the original notice and attachments before applying.

KAIA/MOLIT:

- Include aviation, aerospace, UAM, AAM, drone, autonomous-flight, airport-safety, and explicit space/aerospace infrastructure R&D notices.
- Mark UAM/drone/aviation-only notices as adjacent unless the text is explicitly space/aerospace.

KEIT:

- Use ITECH `지원사업공고(KEIT)` as the direct support-program source.
- Include only 신규지원 대상과제 or comparable deadline-bearing support notices with explicit title signals for space, satellite, aerospace, aviation parts/materials/manufacturing, drone/UAM/AAM, unmanned systems, or autonomous flight.
- Do not include generic machinery, generic manufacturing, generic service R&D, integrated implementation plans, demand surveys, internet-public-comment notices, public hearings, or planning-only notices without explicit aerospace/space signals.
- Keep `과제기획공고(KEIT)` out of generated records until a separate policy decides whether planning/public-comment opportunities should be searchable.
- Show the ITECH detail URL and require users to verify final eligibility, RFP, and IRIS/SROME submission rules in the original notice and attachments.

KIAT:

- Use the public KIAT homepage business-notice feed (`board_id=90`) as the direct metadata source.
- Include only concrete deadline-bearing R&D, commercialization, infrastructure, or industrial support calls with explicit title signals for space, satellite, aerospace, aviation parts/materials/manufacturing, drone/UAM/AAM, unmanned systems, or autonomous flight.
- Do not include demand surveys, technology-donation/transfer notices, seminars, education, guide pages, procurement, or generic industrial programs without explicit aerospace/space signals.
- A current refresh can validly produce 0 KIAT records; treat that as normal if the feed has no matching active notices.
- Show the KIAT detail URL and require users to verify final eligibility, attachments, and submission rules on the official KIAT page.

TIPA/SMTECH:

- Use the public SMTECH `R&D 사업공고` list for SME R&D notices.
- Include only deadline-bearing SME R&D calls with explicit space, aerospace, satellite, launch vehicle, defense-aerospace, drone/UAM, unmanned-system, or autonomous-flight signals.
- Generic SME R&D, generic manufacturing, research-manpower support, investment/IR, seminars, guide pages, and broad support notices are not enough.
- Some IRIS-linked rows expose `javascript:goMove()` rather than a stable detail URL. In that case, preserve the SMTECH list URL, row title, business name, announcement date, and application period as source metadata.
- Users must verify final eligibility and submission rules in SMTECH/IRIS before applying.

GNTP:

- Use the public 경남테크노파크 사업신청 list and detail pages through the POST method required by the site.
- Include direct regional space, aerospace, aviation, drone, unmanned-system, defense-aerospace, and space-AI commercialization support notices.
- Include small company, university-lab, research-team, or consortium-facing notices when the notice is a concrete deadline-bearing support or R&D call.
- Exclude generic regional business support, safety consulting, ESG, information security, education, hiring, tenant recruitment, evaluation-panel recruitment, procurement, generic AI/DX/AX consulting, and portal-like announcements.
- Preserve regional eligibility, 담당부서, 담당자, and source URL metadata; users must verify detailed qualification and attachments on the official GNTP page.

DJTP:

- Use the public 대전테크노파크 사업공고 list (`/pbanc?mid=a20101000000`) and its PMS PDF viewer links.
- Include direct regional space-industry, defense-space materials/parts, drone, unmanned-system, and aerospace support notices.
- Include small company, startup, lab, research-team, or consortium-facing notices when the notice is a concrete deadline-bearing support or R&D/business화 call.
- Exclude general 3D-printing notices without space/defense/drone terms, exhibitions, conferences, internships, tenant recruitment, selection results, public hearings, procurement, and generic regional support notices.
- Preserve Daejeon regional eligibility and the per-notice PMS PDF viewer URL. Direct `/pbanc/*.pdf` paths can return 404, so use viewer/list metadata for source provenance and require users to verify detailed qualification and attachments on the official DJTP/PMS page.

JNTP:

- Use the public 전남테크노파크 main regional-business feed and detail pages.
- Include direct regional satellite, space, aerospace, Goheung Drone Center, drone, UAM, and unmanned-system support notices.
- Include small company, lab, research-team, or consortium-facing notices when the notice is a concrete deadline-bearing support or R&D/business화 call.
- Exclude generic R&D capability-building, energy, plastics, agriculture, general manufacturing, broad regional support, selection results, events, tenant recruitment, procurement, and notices without explicit space/aerospace/drone signals.
- Preserve Jeonnam regional eligibility and official source URL metadata; users must verify detailed qualification and attachments on the official JNTP page.

ITP:

- Use the public 인천테크노파크 support-program lists. Direct HTTP fetch may return a generic error page for valid notices, so use the public reader fallback for metadata-only discovery.
- Include only deadline-bearing drone, PAV/UAM/AAV, and aviation-industry support notices with direct title/body signals.
- Exclude airport-only startup programs, broad AI/deeptech calls, seminars, events, exhibitions, always-open calls, generic regional support notices, and notices without a readable final application deadline.
- Preserve Incheon regional eligibility and official ITP detail URL metadata; users must verify detailed qualification and attachments on the official ITP page.

Bizinfo:

- Use as a public aggregator for support-notice discovery.
- Include clear space, satellite, aerospace, aviation-parts, drone/UAM, defense-aerospace, regional space-cluster, or industrial R&D support notices.
- Exclude generic SME notices, events, forums, seminars, pitching-only events, internships, tourism, beauty, games, and portal-like announcements.
- Show the original Bizinfo URL and agency/executing-agency metadata; users must still verify the executing agency before applying.

K-Startup:

- Use as a public aggregator for startup, pre-founder, and early commercialization support notices.
- Search the ongoing notice list and keyword result pages for explicit space, aerospace, satellite, drone/UAM/AAM, and defense-aerospace signals.
- Include concrete deadline-bearing support programs for pre-founders, individual researchers, university students, startups, or small teams when the notice is clearly aerospace/space-related.
- Exclude education-only participant recruitment, events, networking, incubator-only 모집, generic deeptech/startup programs without explicit domain signals, and portal/manual notices.
- Keep source URL and metadata; users must verify the executing agency and eligibility on K-Startup and any attached notice.

## Excluded File Review

After every refresh, inspect excluded candidates:

```bash
node -e "const fs=require('fs'); const e=JSON.parse(fs.readFileSync('data/space-programs.excluded.json','utf8')); console.table(e.map(({sourceFamily,title,reason,sourceUrl})=>({sourceFamily,title,reason,sourceUrl})))"
```

Decision rules:

- If a candidate is not a concrete program notice, leave it excluded.
- If it is a concrete notice but has no readable deadline, improve the crawler/parser or attachment extraction. Do not hand-add the record.
- If a classifier admits guide/portal/event/admission/procurement notices, tighten the classifier.
- If a classifier drops a real research project or researcher/team support call, add a source-specific rule and rerun ingestion.
- Excluded `no_readable_application_deadline` records must include `reasonCategory`, `deadlineExtractionStatus`, and `deadlineExtractionNote` so recurring reviews can distinguish HTML parser gaps, unreadable attachments, and true no-deadline notices.

## Parser Maintenance

Use structured extraction where practical. Avoid brittle one-off string hacks unless the source page structure leaves no better option.

Deadline extraction priority:

```text
source defaultDeadline
HTML deadline near application/접수/신청 anchors
public attachment deadline metadata
Korean no-year deadline with public announcement year
fallback public date only when source explicitly allows inference
```

Every generated record must preserve deadline evidence:

```text
deadlineSource: source_metadata | html | attachment | html_no_year_deadline | page_date_fallback
deadlineEvidenceText: short public snippet around the date
deadlineEvidenceUrl: source page or attachment URL where the date was read
```

Attachment handling policy:

- Download public attachments only for metadata extraction needed to determine application dates.
- PDF: use `pdftotext`.
- HWPX: use ZIP/XML or `PrvText.txt` extraction.
- Legacy HWP: best-effort HWP 5.x BodyText extraction.
- Do not store full attachment text in generated records.

## Review Protocol

For routine refresh with no code changes:

1. Run the normal refresh commands.
2. Compare ingest report counts with the previous run.
3. Review the `report:space` output for active deadlines, researcher/lab/team records, and notable exclusions.
4. Spot-check deadline evidence distribution; a sudden rise in `page_date_fallback` means parser quality should be reviewed.
5. Review `data/space-refresh-diff.json` for added, removed, deadline-changed, status-changed, new-excluded, and resolved-excluded records.
6. Check the latest line of `data/space-refresh-history.jsonl` if cadence, runtime, or count drift matters.
7. Review `data/space-search-sample-report.json`; failures mean shared search UX regressed.
8. If API or MCP code changed, run `npm run check:space-surfaces` and review `data/space-api-mcp-smoke-report.json`.
9. Report generated count, active count, excluded count, new source families, warnings/failures, notable exclusions, deadline evidence distribution, search/API/MCP sample status, and diff highlights.
10. Review `discoveryRunAudit` for attempted sources with `0` discoveries, `error` status, or unexpectedly long `durationMs`.
11. Review `sourceFamilyAudit` for source families with sudden discovery drops, generated spikes, or repeated error counts.

To inspect the latest refresh history entry:

```bash
tail -n 1 data/space-refresh-history.jsonl
```

For classifier/parser/source changes:

1. Make the smallest source-specific change.
2. Run the normal refresh commands.
3. Review generated records for false positives, false negatives, and deadline evidence quality.
4. Ask for an external review with Claude CLI when available, then inspect the critique before making follow-up edits.
5. Do not accept the change until `check:space`, tests, typecheck, and build pass.
6. For search-filter changes, also require `check:space-search`.
7. For API/MCP-facing changes, also require `check:space-surfaces`.

Bizinfo deadline troubleshooting:

- If a Bizinfo record is excluded while the HTML application period says `차수별 상이`, inspect public attachments before deciding it is not a program notice.
- Bizinfo attachments may be exposed through `fileLoad(...)` or `fileBlank(...)` JavaScript calls as well as `/cmm/fms/fileDown.do` links.
- When a public HWP/HWPX/PDF attachment has a no-year range such as `5. 19(화) ~ 29(금)`, normalize it with the notice registration year and keep the evidence text short.
- Do not manually insert the deadline into generated data; improve the parser and rerun ingestion.

Variable deadline troubleshooting:

- If a page says `상시`, `예산 소진`, `차수별 상이`, `별도 공지`, `수시 접수`, or `선착순` and no final date is readable from public page or attachment metadata, keep it out of generated records.
- Such records should be classified as `open_ended_or_variable_deadline` in excluded output rather than guessed.

Suggested Claude CLI prompt:

```text
Review the Korea space support-program ingestion changes in this repo.
Focus on false positives, missed researcher/lab R&D calls, deadline extraction, generated/excluded audit quality, and whether any guide/portal/event/procurement notices are incorrectly included.
Return concrete file/line findings and recommended fixes.
```

## Reporting Template

Use this shape for recurring status reports:

```text
Refresh completed.

Generated: N
Active: N
Closed: N
Excluded: N
Source families: ...
Deadline evidence:
- source_metadata: N
- html: N
- attachment: N
- html_no_year_deadline: N
- page_date_fallback: N

Added/changed:
- ...

Diff:
- added: N
- removed: N
- deadline changed: N
- status changed: N
- new exclusions: N
- resolved exclusions: N

Notable exclusions:
- ...
Excluded reason categories:
- html_without_deadline: N
- attachment_without_deadline: N
- attachment_unreadable_or_without_deadline: N
- fetch_or_parse_error: N
- no_deadline_evidence: N

Verification:
- npm run ingest:space: pass
- npm run check:space: pass/fail
- npm run check:space-search: pass/fail
- npm run check:space-surfaces: pass/fail
- npm test: pass/fail
- npm run typecheck: pass/fail
- npm run build: pass/fail

Follow-up:
- ...
```
