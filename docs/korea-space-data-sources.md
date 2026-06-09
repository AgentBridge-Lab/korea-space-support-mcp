# Korea Space Support MCP - Data Sources

## MVP Coverage Policy

This MVP is a narrow Korea space/aerospace support-program MCP, not a complete Korean government-support search engine. It covers both company-facing support programs and deadline-bearing research project calls that ordinary researchers, university labs, 출연연 researchers, or small research teams may use.

Initial source boundary:

```text
Track A - Core space: KASA, KARI, KASI
Track B - Defense space: DAPA, KRIT, ADD public notices only
Track C - Aerospace industry: MOTIE/KEIT/KIAT and MOLIT/KAIA notices only when clearly aerospace, aviation, UAM, drone, or space-adjacent
```

Do not collect login-gated, restricted, classified, export-controlled, or non-public defense information.

Source terms and storage-scope review is tracked in `docs/space-source-terms-review.md`. Until a source is explicitly approved there and in `packages/shared/src/space-sources.ts`, generated records must remain metadata-only with source URLs and short summaries.

## Source Review Table

| Source family | Source | Category | MVP status | Collection policy | Notes |
| --- | --- | --- | --- | --- | --- |
| KASA | 우주항공청 | Core space | Candidate | Public business-notice list discovery via browser-like fetch; metadata + source URL until reuse terms are reviewed | Primary MVP source; normal curl/Node requests may be blocked, so use TLS impersonation fallback |
| KARI | 한국항공우주연구원 | Core space / research and industry support | Candidate | Research project calls and enterprise/industry support notices; metadata + source URL first | Check whether notices are support programs or general announcements |
| KASI | 한국천문연구원 | Astronomy / space science | Candidate | Public notices for astronomy, space-science, observation-infrastructure, or researcher support; classify separately from company support | Often research-institute or researcher oriented |
| DAPA | 방위사업청 | Defense space | Candidate | Public notice-list discovery via browser-like fetch; public metadata only; no restricted or login-gated information | Always warn about security/export-control/qualification requirements |
| KRIT | 국방기술진흥연구소 | Defense R&D / defense industry | Candidate | Public metadata only | Check public notice reuse terms before storing full text |
| ADD | 국방과학연구소 | Defense R&D | Candidate | Public proposal-call metadata only | Use carefully due to defense sensitivity; always preserve defense/dual-use warnings |
| MOTIE | 산업통상자원부 | Aerospace industry / materials / advanced manufacturing | Candidate | Keyword-filtered notices only | Do not ingest all ministry notices |
| KEIT | 한국산업기술기획평가원 | Industrial R&D | Candidate | Aerospace/materials/parts keyword-filtered notices | Good source for aerospace parts/materials R&D |
| KIAT | 한국산업기술진흥원 | Industrial support / commercialization | Candidate | Public KIAT business-notice feed; explicit space/aerospace/drone/UAM deadline-bearing support calls only | Current feed may produce 0 records when no matching notice is active |
| TIPA/SMTECH | 중소기업기술정보진흥원/SMTECH | SME R&D | Candidate | Space/aerospace/drone/defense-aerospace keyword-filtered SME R&D notices only | Some IRIS-linked rows may expose list metadata rather than stable detail URLs |
| MOLIT | 국토교통부 | Aviation / UAM / drone / safety | Candidate | Keyword-filtered notices only | Mark aviation/UAM as adjacent unless space-related |
| KAIA | 국토교통과학기술진흥원 | Aviation/UAM R&D | Candidate | Aerospace/UAM/drone/airport keyword-filtered notices from the public R&D notice list | Often R&D and demonstration-oriented; automatically discovered notices must remain adjacent unless explicitly space/aerospace |
| K-Startup | 창업지원포털 | Startup support | Candidate | Space/aerospace keyword-filtered startup support notices | Exclude education-only, event-only, generic startup, and portal-like notices |
| 기업마당 | 기업마당 | SME support | Candidate | Space/aerospace/drone/defense-aerospace keyword-filtered support notices | Useful for regional cluster and SME support; do not ingest generic SME programs |
| GNTP | 경남테크노파크 | Regional aerospace cluster | Candidate | Gyeongnam space/aerospace/aviation/drone cluster support notices only | Preserve regional eligibility; exclude generic local-business, consulting, safety, ESG, and portal notices |
| DJTP | 대전테크노파크 | Regional space/defense-aerospace cluster | Candidate | Daejeon space-industry, defense-space materials/parts, drone, and unmanned-system support notices only | PDF-first feed; preserve Daejeon eligibility and exclude exhibitions/results |
| JNTP | 전남테크노파크 | Regional satellite/drone/aerospace cluster | Candidate | Jeonnam satellite, space, drone, UAM, and unmanned-system support notices only | Preserve Jeonnam eligibility; exclude generic regional R&D/support |
| ITP | 인천테크노파크 | Regional PAV/drone/aviation cluster | Candidate | Incheon drone, PAV/UAM/AAV, and aviation-industry support notices only | Uses public reader fallback when direct fetch returns an error page; exclude airport-only startup and generic event notices |
| Regional TP/cluster | 사천/대전/전남 등 | Regional aerospace cluster | Backlog | Regional cluster notices only | Add source-specific parsers after beta feedback |

## Required Fields

```text
source
source_family
external_id
title
agency
source_url
source_type
space_category
relevance_score
data_reuse_policy
commercial_use_allowed
defense_or_dual_use
restricted_notice
region
target_regions
industries
technology_areas
application_end_date
deadline_source
deadline_evidence_text
deadline_evidence_url
support_amount_text
summary
eligibility_text
required_documents
restrictions
security_requirements
export_control_notes
qualification_notes
participation_type
consortium_required
university_or_research_partner_required
status
last_checked_at
```

## Classification Rules

Use `core_space` or specific core categories when the notice is directly about:

```text
satellite
launch vehicle
space data
space commercialization
space parts/materials
astronomy/space science
space observation infrastructure
defense space
```

Use `adjacent_space` or adjacent categories when the notice is primarily:

```text
aviation
UAM
drone
aviation safety
defense aerospace
advanced manufacturing with only partial aerospace relevance
```

## Defense And Dual-Use Policy

For defense or dual-use notices:

- Store public metadata and source URL first.
- Do not store restricted, classified, login-gated, or export-controlled details.
- Always return `needs_review` unless public eligibility is explicit.
- Always warn users to check security requirements, export-control restrictions, and procurement qualifications in the official source.

## MVP Source Limit

Start with 3-5 source families only:

```text
KASA
KARI
KASI
DAPA/KRIT public notices
MOTIE/KEIT or MOLIT/KAIA keyword-filtered aerospace notices
```

Move all other sources to backlog until ingestion quality and classification accuracy are verified.

## Current Ingestion Notes

`npm run ingest:space` currently uses automated discovery for KARI, KASI, KASA, DAPA, ADD, KRIT, K-Startup, KEIT 지원사업공고, KIAT 사업공고, TIPA/SMTECH, DJTP, JNTP, ITP, KAIA, Bizinfo, and GNTP. It must not merge hand-authored or curated real notice records into the generated dataset.

KASA and DAPA reject some normal Node/curl requests. The ingestion script therefore follows the same pattern as `insane-search`: try standard fetches where possible, use `r.jina.ai` as a reader fallback, and use `curl_cffi` TLS impersonation for blocked government pages. KARI, KASI, KAIA, and Bizinfo are currently readable through direct public-list parsing. This is still public-page metadata collection; it does not access login-gated, restricted, classified, or non-public content.

Generated search records must be deadline-bearing program notices. Eligible research project calls and researcher/team support programs are included; guide pages, portals, infrastructure descriptions, and notices whose application or bid deadline cannot be read from public page/attachment metadata are excluded from the generated search dataset.

Every generated record with `application_end_date` must also include deadline evidence metadata. `deadline_source` is one of `source_metadata`, `html`, `attachment`, `html_no_year_deadline`, or `page_date_fallback`; `deadline_evidence_text` stores a short public snippet around the date; and `deadline_evidence_url` points to the page or attachment where the date was read. Attachment extraction is limited to lightweight PDF/HWPX/HWP text needed for date metadata and does not store full document text.

Source review metadata exposed by API/MCP comes from `packages/shared/src/space-sources.ts`. `legal_review_status`, `storage_policy`, commercial-use, attribution, and redistribution flags must be kept conservative until source-specific terms are reviewed.

Excluded candidates are written to `data/space-programs.excluded.json` with source URL and exclusion reason. Each ingestion run also writes `data/space-ingest-report.json` with generated, discovered, excluded, active, and closed counts.

Routine refreshes should follow `docs/space-ingestion-runbook.md`. In short, use `npm run refresh:space` for ingestion, source-quality checks, and a human-readable refresh report; use `npm run verify:space` after classifier, parser, source, or generated-data changes.

KAIA discovery only keeps notices whose business name or title clearly matches one of these adjacent-domain signals:

```text
우주
위성
항공
공항
UAM
AAM
드론
무인이동체
자율비행
```

Discovered KAIA notices are classified conservatively as `aerospace`, `drone_uam_adjacent`, or `aviation_industry`; they should not be presented as core space programs unless the source text explicitly says so.

KASA discovery reads the public `BBSMSTR_000000000018` business-notice list and keeps only notices with explicit space, satellite, aerospace R&D, or commercialization signals. Result notices, hiring notices, facility operation notices, and event notices are excluded. When the HTML notice does not expose the application deadline, public PDF/HWPX/HWP attachments are downloaded only for lightweight date metadata extraction; full document text is not stored.

KARI discovery reads the public research-business notice board and keeps only research project calls with aerospace, launch vehicle, satellite, lunar exploration, or adjacent R&D signals. Hiring, procurement, training, internship, camp, event, tour, and result notices are excluded. KARI detail pages usually expose the application period in HTML, so that deadline is preferred over attachment-derived dates.

KASI discovery reads the public notice board and keeps only astronomy, space-science, space-exploration, space-observation, or researcher-support notices with readable deadlines. Researcher, expert, university lab, 출연연, and small research-team opportunities are eligible when the public notice is a concrete support or project call rather than a portal, event recap, hiring notice, procurement notice, or general announcement. When KASI notices omit the year in Korean deadline phrases such as `3월 11일까지`, the ingestion script uses the notice registration year as the deadline year.

DAPA discovery reads the public notice list and keeps only notices with explicit space, satellite, surveillance/reconnaissance, C4I, defense-aerospace, drone, unmanned-system, or aviation-electronics signals. Generic weapon-system or defense notices are not enough by themselves. Awards, hiring, events, citizen participation, and training-only notices are excluded. Public PDF/HWPX/HWP attachments may be used for deadline metadata. Legacy binary HWP extraction is best-effort; if the application or bid deadline is not readable from public text, leave deadlines blank rather than guessing.

ADD discovery reads the public `제안서 공모 > 공모안내` list and keeps only deadline-bearing public proposal calls with explicit defense-space, aerospace, drone, unmanned-system, stealth aircraft, or surveillance/reconnaissance signals. Generic future-defense, AI, battlefield-awareness, event, competition, guidance, and cost-analysis notices are excluded unless the title has a clear space/aerospace/drone signal. ADD records are always marked defense/dual-use and remain metadata-centered; users must inspect original attachments for security, export-control, and eligibility requirements.

KRIT discovery reads the public notice list and uses a stricter defense-adjacent filter than Bizinfo. It only admits public notices with explicit space, satellite, aerospace, aviation, drone, unmanned-system, or defense-space signals. Generic defense, weapon-system, component-localization, briefing-session, or event notices are not enough by themselves. Current KRIT public notices may therefore produce no generated records until a deadline-bearing space/aerospace-relevant support or R&D notice appears.

Bizinfo discovery reads recent active and recently closed public support-notice pages, then keeps only deadline-bearing support notices with explicit space, satellite, aerospace, aviation-parts, drone/UAM, defense-aerospace, or space-cluster signals. It excludes generic manufacturing, generic SME, event-only, forum, pitching, seminar, internship, tourism, beauty, game, and portal-like notices. Bizinfo is an aggregator; source agency metadata should be shown with the original Bizinfo URL and users should still check the underlying executing agency before applying. Bizinfo detail pages may expose HWP/HWPX attachments through JavaScript `fileLoad`/`fileBlank` calls and may show `차수별 상이` in the HTML application-period field; in those cases the crawler scans public PDF/HWPX/HWP attachments for deadline metadata, including no-year ranges such as `5. 19(화) ~ 29(금)` that are normalized using the notice registration year.

K-Startup discovery reads the public ongoing startup-support notice list and keyword-search result pages for terms such as space, aerospace, satellite, drone, UAM/AAM, and defense. It keeps only deadline-bearing startup or pre-founder support notices with explicit space/aerospace relevance. Mentoring or consulting categories can be included when the notice is a concrete support program, but education-only participant recruitment, event/networking, incubator-only, generic deeptech, and portal-like notices are excluded.

KEIT discovery reads the public ITECH `지원사업공고(KEIT)` JSON list for the current and previous year. It keeps only `신규지원 대상과제`-style support notices whose title explicitly says space, satellite, aerospace, aviation parts/materials/manufacturing, drone, UAM/AAM, unmanned systems, or autonomous flight. `과제기획공고(KEIT)` internet-public-comment, technology-demand-survey, public-hearing, and planning notices are not currently generated because they are often future planning or opinion-collection notices rather than direct application support programs.

KIAT discovery reads the public KIAT homepage business-notice feed (`board_id=90`). It keeps only concrete deadline-bearing R&D, commercialization, infrastructure, or industrial support calls whose title explicitly says space, satellite, aerospace, aviation parts/materials/manufacturing, drone, UAM/AAM, unmanned systems, or autonomous flight. Demand surveys, technology-donation/transfer notices, seminars, education, guide pages, procurement, and generic industrial programs without direct aerospace/space terms are excluded. A refresh with 0 KIAT-generated records is valid when the current KIAT feed has no matching active notices.

TIPA/SMTECH discovery reads the public `R&D 사업공고` list and keeps only deadline-bearing SME R&D notices whose business name or title explicitly says space, aerospace, satellite, launch vehicle, drone/UAM, unmanned systems, or defense-aerospace. Generic SME R&D, generic manufacturing, research-manpower support, investment/IR, seminars, guide pages, and broad support notices are excluded. Some SMTECH rows link to IRIS through JavaScript rather than a stable public detail URL; those records use the public SMTECH list URL plus source metadata and deadline evidence rather than storing full text.

GNTP discovery reads the public 경남테크노파크 사업신청 list through the same POST method required by the site. It keeps only deadline-bearing regional support notices with explicit space, aerospace, aviation, drone, unmanned-system, or defense-aerospace signals. Generic regional business support, safety consulting, ESG, information security, education, hiring, tenant recruitment, evaluation-panel recruitment, procurement, and portal-like notices are excluded. GNTP records must preserve Gyeongnam/regional eligibility language because many opportunities are limited to local companies, labs, or small teams.

DJTP discovery reads the public 대전테크노파크 사업공고 list (`/pbanc?mid=a20101000000`) and follows its PMS PDF viewer links. It keeps only deadline-bearing regional support notices with explicit space-industry, defense-space materials/parts, drone, unmanned-system, or aerospace signals. General 3D-printing programs without space/defense/drone terms, exhibitions, conferences, internships, tenant recruitment, selection results, public hearings, and generic regional support notices are excluded. DJTP records must preserve Daejeon regional eligibility language and the per-notice PMS viewer URL; direct `/pbanc/*.pdf` paths can expire or return 404.

JNTP discovery reads the public 전남테크노파크 main regional-business feed and detail pages. It keeps only deadline-bearing regional support notices with explicit satellite, space, aerospace, Goheung Drone Center, drone, UAM, or unmanned-system signals. Generic R&D capability-building, energy, plastics, agriculture, generic manufacturing, broad regional support, selection results, events, and tenant recruitment are excluded. JNTP records must preserve Jeonnam regional eligibility language and official source URLs.

ITP discovery reads public 인천테크노파크 support-program lists through a public reader fallback because direct HTTP requests can return a generic error page even for valid notices. It keeps only deadline-bearing support notices with explicit drone, PAV/UAM/AAV, or aviation-industry signals. Airport-only startup programs, broad AI/deeptech calls, seminars, events, exhibitions, always-open calls, and generic regional support notices are excluded unless the title has direct aerospace/drone/PAV terms and a readable final application deadline.
