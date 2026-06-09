# Korea Space Support MCP

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A520-339933?logo=node.js&logoColor=white)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)](package.json)
[![MCP](https://img.shields.io/badge/MCP-server-7c3aed)](https://modelcontextprotocol.io)
[![Last commit](https://img.shields.io/github/last-commit/AgentBridge-Lab/korea-space-support-mcp)](https://github.com/AgentBridge-Lab/korea-space-support-mcp/commits/main)
[![Stars](https://img.shields.io/github/stars/AgentBridge-Lab/korea-space-support-mcp?style=social)](https://github.com/AgentBridge-Lab/korea-space-support-mcp/stargazers)

> Search-ready, agent-facing dataset of **Korean space / aerospace / defense-space R&D and support program notices** — with a Model Context Protocol server, a REST API, and a verifiable ingestion pipeline.

Built for Claude / Cursor / ChatGPT agents that need to recommend *concrete*, *deadline-bearing* Korean public programs to companies, startups, university labs, research teams, and consortia.

![Korea Space Support MCP — web demo](docs/img/web-demo.jpg)

---

## Current snapshot

| Metric | Value |
|---|---|
| Generated program notices | **51** |
| Active (deadline ≥ today) | 22 |
| Source families | 12 (KARI · KASA · KASI · DAPA · ADD · TIPA/SMTECH · KAIA · DJTP · JNTP · GNTP · ITP · Bizinfo) |
| Bizinfo records with original-agency URL | 17 / 17 |
| Excluded (no readable deadline / wrong notice type) | 0 |
| Refresh cadence | Every Mon 09:00 KST via launchd |

Numbers update on every `npm run ingest:space`.

---

## What's inside

```
apps/
  api/      Fastify REST server  →  /space-programs/search, /space-programs/:id, /health
  mcp/      MCP stdio server     →  search_space_programs, get_space_ingest_report
  web/      Next.js landing demo (server-rendered preview cards)
packages/
  shared/   Search, scoring, classification, sources, type defs
scripts/
  ingest-space-programs.mjs       # Crawler + classifier + dataset writer
  verify-space-search-samples.mjs # Search-UX regression scenarios
  verify-space-api-mcp-smoke.mjs  # API + MCP smoke
  run-space-refresh.mjs           # ingest + diff + history
data/
  space-programs.generated.json   # Active dataset
  space-programs.excluded.json    # Audit trail
  space-ingest-report.json        # Per-source counts & timing
  space-refresh-diff.json
  space-refresh-history.jsonl
ops/launchd/
  com.bidscout.space-refresh.plist  # Weekly auto-refresh agent
docs/
  space-mcp-handoff.md            # Project handoff
  space-ingestion-runbook.md      # Runbook
  korea-space-mcp-work-report.md  # Progress log
```

---

## Quick start

```bash
git clone https://github.com/AgentBridge-Lab/korea-space-support-mcp.git
cd korea-space-support-mcp
npm install

# (one-time, only if you want to re-ingest from sources)
python3 -m pip install --user curl_cffi beautifulsoup4 pyyaml olefile
# pdftotext is also used for PDF deadline extraction

# Read the pre-generated dataset
cat data/space-programs.generated.json | jq '.[].title' | head

# Run the REST API
npm run dev:api    # http://localhost:4000

# Run the MCP stdio server (for Claude Desktop, Cursor, etc.)
npm run dev:mcp

# Run the landing demo
npm run dev:web    # http://localhost:3001
```

---

## Try the REST API

```bash
# Health
curl http://localhost:4000/health

# Search for startup-eligible space programs closing within 90 days
curl "http://localhost:4000/space-programs/search?applicantType=startup_or_prefounder&includeAdjacent=true&deadlineWithinDays=90&limit=5" | jq

# Researcher / university-lab calls
curl "http://localhost:4000/space-programs/search?applicantType=researcher_or_lab&limit=10" | jq

# Defense / dual-use space
curl "http://localhost:4000/space-programs/search?defenseOnly=true&limit=10" | jq

# Detail by id
curl "http://localhost:4000/space-programs/space-bizinfo-discovered-PBLN_000000000122300" | jq
```

---

## Use as an MCP server

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "korea-space-support": {
      "command": "node",
      "args": ["/absolute/path/to/korea-space-support-mcp/apps/mcp/dist/index.js"],
      "env": {}
    }
  }
}
```

After `npm run build`, the agent gains two tools:

| Tool | Purpose |
|---|---|
| `search_space_programs` | Filter by applicant type, status, deadline window, defense/adjacent inclusion, source family |
| `get_space_ingest_report` | Inspect per-source counts, exclusion reasons, and freshness |

---

## Sample record

```jsonc
{
  "id": "space-bizinfo-discovered-PBLN_000000000122300",
  "title": "[전남] 순천시 위성 개발 및 실증 사업 참여기업 모집 공고",
  "agency": "전라남도/전남테크노파크",
  "sourceUrl": "https://www.bizinfo.go.kr/sii/siia/selectSIIA200Detail.do?pblancId=PBLN_000000000122300",
  "originalAgencyUrl": "https://data.jntp.or.kr/jntp/content/business/announcement/view.jsp?idx=1063",
  "sourceFamily": "BIZINFO",
  "spaceCategory": "satellite",
  "applicationStartDate": "2026-05-21",
  "applicationEndDate": "2026-06-23",
  "status": "active",
  "deadlineSource": "html_body",
  "deadlineExtractionStatus": "found",
  "summary": "전남도 순천시 위성 개발 및 실증 사업 참여기업 모집…",
  "defenseOrDualUse": false,
  "relevanceScore": 84
}
```

Every record carries:

- A canonical `sourceUrl` (aggregator-stable) **and**, where possible, an `originalAgencyUrl` for the original-issuing-agency page.
- A `deadlineSource` + `deadlineEvidenceUrl` so the deadline can be re-verified.
- A `dataReusePolicy` field set conservatively — the project stores **metadata + short summaries only**, never the full notice body.

---

## Collection policy (what's in, what's out)

✅ **Included**: deadline-bearing public notices for companies, startups, researchers, university labs, research teams, and consortia — in space, aerospace, defense-space, drone/UAM, astronomy, satellite, launch, parts/materials.

❌ **Excluded** (kept in `space-programs.excluded.json` with a reason):

- Guides, portals, curated indexes
- Events, exhibitions, seminars, forums, conferences, contests, ideathons
- Hiring, procurement, RFPs, contract awards, results announcements
- Notices with no readable application deadline

---

## Verification

```bash
npm run verify:space
# Runs: structure check, search-UX scenarios, API+MCP smoke,
#       Node tests, typecheck, build (shared + api + mcp + web)
```

Current state: **13/13** tests pass, 0 warnings, 0 failures.

---

## Recurring refresh

A launchd agent is shipped at `ops/launchd/com.bidscout.space-refresh.plist` for macOS.

```bash
cp ops/launchd/com.bidscout.space-refresh.plist ~/Library/LaunchAgents/
launchctl bootstrap "gui/$(id -u)" ~/Library/LaunchAgents/com.bidscout.space-refresh.plist
launchctl kickstart -k "gui/$(id -u)/com.bidscout.space-refresh"   # run once now
```

The plist sets `PATH` so `/usr/bin/python3` (with `curl_cffi`/`olefile`) is preferred over Homebrew's 3.14.

---

## License

[MIT](LICENSE) © 2026 AgentBridge-Lab

---

## Notes

- The repository also keeps an earlier **BidScout MCP UK tender MVP** as a secondary track under `uk-tender-mcp-*` docs. The Korea space track is the active line of work.
- Built with help from [Claude Code](https://claude.ai/code) and [Happy](https://happy.engineering).
