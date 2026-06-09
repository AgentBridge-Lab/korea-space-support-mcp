# Korea Space Support MCP - Source Terms Review

## Current Position

This project does not treat public notice pages as approved full-text redistribution sources. The MVP uses a conservative metadata-only policy until each source family receives a dedicated legal/reuse review.

Allowed MVP storage:

- Source URL
- Source family and agency metadata
- Public title
- Announcement, application start, and application end dates
- Short generated summary
- Short deadline evidence snippet
- Category, relevance, eligibility, and warning metadata
- Attachment URLs when public

Not allowed until source-specific review:

- Full notice body redistribution
- Full attachment text storage
- Full PDF/HWP/HWPX document mirroring
- Login-gated, restricted, classified, export-controlled, or non-public defense information
- Removing source attribution or hiding the official source URL

## Review Checklist

Before changing a source from `metadata_only` to broader storage:

1. Confirm the official terms, copyright notice, public-data license, or 공공누리 marker on the source site.
2. Record whether commercial use is allowed.
3. Record whether attribution is required and the required attribution wording.
4. Record whether redistribution or derivative summaries are allowed.
5. Confirm whether attached documents have separate copyright notices.
6. Confirm whether defense, export-control, or security-sensitive notices require stricter handling even when public.
7. Update `packages/shared/src/space-sources.ts`.
8. Run `npm run verify:space`.

## Source Family Status

| Source family | Current policy | Legal review status | Storage policy | Notes |
| --- | --- | --- | --- | --- |
| KASA | Metadata only | `metadata_only_policy` | Metadata, source URL, short summary, deadline evidence only | Confirm notice reuse terms before full text |
| KARI | Metadata only | `metadata_only_policy` | Metadata, source URL, short summary, deadline evidence only | Research project attachments may have separate conditions |
| KASI | Metadata only | `metadata_only_policy` | Metadata, source URL, short summary, deadline evidence only | Researcher/lab notices remain source-linked |
| DAPA | Public metadata only | `metadata_only_policy` | Metadata and source URL only | Defense/security/export-control review required |
| KRIT | Public metadata only | `metadata_only_policy` | Metadata and source URL only | Defense R&D sensitivity review required |
| ADD | Public proposal-call metadata only | `metadata_only_policy` | Metadata and source URL only | Treat all records as defense/dual-use |
| MOTIE_KEIT | Metadata only | `metadata_only_policy` | Metadata, source URL, short summary, deadline evidence only | Confirm ITECH/KEIT notice reuse terms |
| MOTIE_KEIT_KIAT | Metadata only | `metadata_only_policy` | Metadata, source URL, short summary, deadline evidence only | Aggregated through Bizinfo in current ingestion |
| KIAT | Metadata only | `metadata_only_policy` | Metadata, source URL, short summary, deadline evidence only | Direct KIAT business-notice feed; current feed may produce 0 matching aerospace/space records |
| TIPA_SMTECH | Metadata only | `metadata_only_policy` | Metadata, source URL, short summary, deadline evidence only | Some rows link to IRIS through JavaScript; preserve list metadata when stable detail URL is unavailable |
| BIZINFO | Metadata only | `metadata_only_policy` | Metadata, source URL, short summary, deadline evidence only | Aggregator; executing agency may differ |
| KSTARTUP | Metadata only | `metadata_only_policy` | Metadata, source URL, short summary, deadline evidence only | Aggregator; verify executing agency and attachments |
| GNTP | Metadata only | `metadata_only_policy` | Metadata, source URL, short summary, deadline evidence only | Preserve regional eligibility and official URL |
| DJTP | Metadata only | `metadata_only_policy` | Metadata, source URL, short summary, deadline evidence only | Regional list with PMS PDF viewer links; preserve Daejeon eligibility and per-notice viewer URL because direct PDF paths may expire |
| JNTP | Metadata only | `metadata_only_policy` | Metadata, source URL, short summary, deadline evidence only | Regional feed and data-domain attachments; preserve Jeonnam eligibility and official URL |
| ITP | Metadata only | `metadata_only_policy` | Metadata, source URL, short summary, deadline evidence only | Uses public reader fallback for valid public pages that return direct-fetch error pages; preserve Incheon eligibility |
| MOLIT_KAIA | Metadata only | `metadata_only_policy` | Metadata, source URL, short summary, deadline evidence only | Mark aviation/UAM/drone as adjacent unless explicitly space |

## Runtime Expectations

`list_space_sources` and `/space-sources` expose source review metadata from `packages/shared/src/space-sources.ts`. Programs returned by search/detail tools should keep official source URLs visible. Program summaries should continue to warn that the official notice and attachments must be checked before applying.

## Change Control

If a source is approved for broader storage, update these files together:

- `packages/shared/src/space-sources.ts`
- `docs/korea-space-data-sources.md`
- `docs/space-source-terms-review.md`
- `docs/space-ingestion-runbook.md`
- `docs/korea-space-mcp-work-report.md`

Do not change generated storage scope without running:

```bash
npm run verify:space
```
