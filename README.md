# Korea Space Support MCP

Korea Space Support MCP is an MVP for an AI-agent-facing search and fit-scoring tool for Korean space, aerospace, defense-space, astronomy, satellite, launch, UAM, and space-adjacent support/R&D programs.

The workspace also keeps the earlier BidScout MCP UK tender MVP as a secondary track.

## Local Setup

```bash
npm install
cp .env.example .env
npm run dev:api
```

Run the MCP server in another terminal:

```bash
npm run dev:mcp
```

Run the web demo:

```bash
npm run dev:web
```

The web demo runs at `http://localhost:3001`.

## Korea Space MVP Scope

- Sample Korean space/aerospace support-program search for companies, researchers, university labs, and small research teams.
- MCP tools for `search_space_programs`, `get_space_program_detail`, `match_space_programs_to_company`, `check_space_program_eligibility`, `summarize_space_program`, and `list_space_sources`.
- HTTP API endpoints for search, detail, matching, eligibility, summary, and source review status.
- Source registry for KASA, KARI, KASI, DAPA, KRIT, MOTIE/KEIT, and MOLIT/KAIA with conservative metadata-only collection policies.
- Web demo copy for non-technical beta users.
- `npm run ingest:space` writes `data/space-programs.generated.json`, `data/space-programs.excluded.json`, and `data/space-ingest-report.json`; API/MCP space-program search loads the generated official-source file by default.
- `npm run refresh:space` runs ingestion, source-quality checks, a human-readable refresh report, `data/space-refresh-diff.json` generation, and `data/space-refresh-history.jsonl` append for routine refreshes; `npm run verify:space` runs the full space-data verification chain after classifier/parser changes.
- The current ingestion pass combines curated non-blocked official-source records with automated KARI, KASI, KASA, DAPA, KAIA, and Bizinfo discovery. KARI/KASI/KAIA/Bizinfo use direct public-list parsing; KASA/DAPA use a browser-like `curl_cffi` fetch fallback for government sites that reject normal Node/curl requests.
- Space-program search supports source-family, status, deadline-window, defense/adjacent inclusion, and sort filters. API and MCP inputs accept both camelCase and snake_case field names for agent compatibility.
- Space-program search defaults to currently active notices; pass `status` or `includeClosed`/`include_closed` when historical closed notices are needed.
- Runtime API/MCP search uses generated official-source records by default. Built-in sample records are only included when `BIDSCOUT_INCLUDE_SAMPLE_SPACE_PROGRAMS=true`.
- Ingestion excludes guide, portal, infrastructure, and deadline-unknown pages from generated search data. Generated records must be deadline-bearing program notices, including eligible research project calls and researcher/team support programs.
- Excluded candidates are kept in `data/space-programs.excluded.json` with a reason so source-quality decisions remain auditable.
- API `/space-programs/ingest-report` and MCP `get_space_ingest_report` expose the latest generated/excluded counts and exclusion reasons.
- `npm run check:space` validates generated source URL coverage, duplicate IDs, category labels, date/status consistency, and metadata-only policy assumptions.
- API key and usage logging are planned in the next implementation pass.

For KASA/DAPA discovery, install the Python fetch dependency once if it is not already available:

```bash
python3 -m pip install --user curl_cffi beautifulsoup4 pyyaml olefile
```

KASA/DAPA deadline enrichment uses `pdftotext` for public PDF attachments, lightweight HWPX ZIP/XML text extraction, and best-effort legacy HWP 5.x BodyText extraction when public attachments contain application dates.

For recurring refresh work, source-specific inclusion rules, excluded-candidate triage, and the reporting template, see [docs/space-ingestion-runbook.md](./docs/space-ingestion-runbook.md).

## UK Tender Track

- Contracts Finder-first UK tender search.
- MCP tools for `search_tenders`, `get_tender_detail`, and `match_tenders_to_company`.

See [uk-tender-mcp-agent-instructions.md](./uk-tender-mcp-agent-instructions.md) for the execution plan.
See [korea-space-support-mcp-agent-instructions.md](./korea-space-support-mcp-agent-instructions.md) for the Korea space/aerospace support-program plan.
