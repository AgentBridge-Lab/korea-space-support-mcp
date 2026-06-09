# UK Tender MCP - Product Plan

## 1. Product Summary

Working name:

```text
BidScout MCP
```

One-line positioning:

> Find UK public tenders with your AI agent.

Longer description:

BidScout MCP is a hosted MCP/API product that lets Claude, Cursor, ChatGPT-compatible agents, LangGraph workflows, and AI automation tools search UK public procurement notices, match tenders against a company profile, summarize requirements, and generate bid/no-bid checklists.

The initial product is not a full bid-writing platform and not a marketplace. It is an agent-ready data and workflow infrastructure layer for UK public tender discovery.

## 2. Target Customers

### Primary Customer: UK Bid Consultants

Profile:

- Independent bid writers
- Tender consultants
- Small procurement advisory firms
- Agencies monitoring tenders for multiple clients

Pain:

- They monitor opportunities across multiple clients and sectors.
- They manually review notices and decide whether each client should bid.
- They spend time summarizing requirements, deadlines, eligibility, and submission documents.

Why they may pay:

- One consultant can use the tool across many client profiles.
- Time savings are measurable.
- They already understand the value of tender monitoring.
- They are more likely than ordinary SMEs to pay for specialized workflow tools.

### Secondary Customer: UK SMEs

Profile:

- Small businesses trying to win public contracts
- Service businesses in IT, cybersecurity, facilities, consulting, training, construction, health, and social care

Pain:

- Public procurement portals are fragmented and hard to monitor.
- Tender documents are long.
- SMEs often waste time on tenders they are not well-suited for.

Why they may pay:

- Missing a relevant tender has a clear opportunity cost.
- Bid/no-bid support can prevent wasted effort.

### Secondary Customer: AI Automation Builders

Profile:

- AI agencies
- Internal automation teams
- Developers building procurement agents

Pain:

- They need reliable public tender data without building ingestion and normalization pipelines.
- They need tools that work directly with agent frameworks.

Why they may pay:

- They can resell workflows to clients.
- MCP/API access saves build time.

## 3. Customer Jobs To Be Done

Core user questions:

```text
Which UK public tenders match this company?
Which tenders are closing soon?
Is this tender worth bidding for?
What are the key requirements?
What documents and certifications are likely required?
What should we check before deciding to bid?
Can you draft a bid/no-bid checklist?
Can you monitor new tenders for this client profile?
```

MVP should optimize for these jobs, not for generic search.

## 4. Initial Market Focus

Start with UK public tenders, but define the MVP coverage narrowly:

```text
MVP coverage:
- England and UK central-government opportunities available through Contracts Finder
- Selected live opportunities and future opportunities
- Above-threshold Find a Tender data only after source/API terms are confirmed

Not covered in MVP:
- Full Scotland coverage
- Full Wales coverage
- Full Northern Ireland coverage
- Private-sector tenders
- EU-wide procurement
```

Reason:

The UK procurement landscape is fragmented. Scotland, Wales, and Northern Ireland have their own dedicated public procurement websites. The MVP should avoid claiming complete UK coverage until those sources are integrated and tested.

Do not start with:

- EU-wide tenders
- US federal procurement
- Grant discovery
- Full proposal writing
- Supplier CRM
- Marketplace for bid writers

Recommended initial sectors:

- IT services
- Cybersecurity
- Software development
- Digital transformation
- Business consulting
- Training
- Marketing/communications

Reason:

These sectors are easier for AI to parse than complex construction or healthcare procurement, and early adopters are more likely to use AI tools.

## 5. Data Sources

Initial data source priority:

```text
Priority 1: UK Contracts Finder
Priority 2: Find a Tender, after public search/reuse terms are confirmed
Priority 3: Public Contracts Scotland, Sell2Wales, eTendersNI, after MVP validation
Priority 4: Related official public procurement datasets
```

Source review requirements:

For each source, document:

- Official URL
- Whether API or bulk download exists
- License or reuse terms
- Available fields
- Rate limits
- Update frequency
- Whether full notices or only metadata can be stored

Create:

```text
docs/uk-data-sources.md
```

Minimum required fields:

```text
source
external_id
title
buyer_name
description
cpv_codes
region
country
estimated_value
currency
published_at
deadline_at
notice_type
procurement_stage
source_url
raw_json or raw_text
```

Important rule:

Every tender returned to users must include a source URL and retrieval/update timestamp.

MVP source policy:

```text
Use Contracts Finder first because it publicly supports search and downloadable XML/CSV data.
Do not rely on Find a Tender as the primary MVP ingestion source until API access, query scope, authentication requirements, and reuse terms are documented.
Do not claim full UK coverage on the landing page until devolved administration sources are integrated.
```

Create a data-source review document before implementation:

```text
docs/uk-data-sources.md
```

The document must include:

```text
source name
official URL
API/download method
allowed reuse notes
fields available
rate limits if known
coverage area
known gaps
implementation status
```

## 6. Product Scope

### MVP Included

```text
Tender search
Tender detail lookup
Company profile matching
Bid/no-bid fit explanation
Requirement summary
Checklist generation
API key access
Usage logging
Simple documentation
Simple landing page
Minimal web demo for consultants
```

### MVP Excluded

```text
Full bid writing
Document upload and redlining
Team collaboration
CRM
Payment integration before beta validation
EU/US procurement
Grant discovery
Managed AI agent UI
Marketplace
Complete UK-wide coverage
```

## 7. Core MCP Tools

### Tool 1: `search_tenders`

Purpose:

Search UK public tenders by keyword, sector, CPV code, region, value range, and deadline.

Input example:

```json
{
  "query": "cybersecurity penetration testing",
  "region": "North West",
  "cpv_codes": ["72000000"],
  "deadline_within_days": 30,
  "min_value": 10000,
  "max_value": 250000,
  "limit": 10
}
```

Output example:

```json
{
  "results": [
    {
      "tender_id": "uuid",
      "title": "Cyber Security Testing Services",
      "buyer_name": "Example Council",
      "deadline": "2026-08-12",
      "estimated_value": 120000,
      "currency": "GBP",
      "region": "North West",
      "summary": "Tender for penetration testing and vulnerability assessment services.",
      "source_url": "https://..."
    }
  ]
}
```

### Tool 2: `get_tender_detail`

Purpose:

Return detailed tender information and source references.

Input:

```json
{
  "tender_id": "uuid"
}
```

Output:

```json
{
  "tender_id": "uuid",
  "title": "Cyber Security Testing Services",
  "buyer_name": "Example Council",
  "description": "...",
  "deadline": "2026-08-12",
  "estimated_value": 120000,
  "cpv_codes": ["72000000"],
  "region": "North West",
  "source_url": "https://...",
  "last_checked_at": "2026-06-06T00:00:00Z"
}
```

### Tool 3: `match_tenders_to_company`

Purpose:

Find and rank tenders for a company profile.

Input:

```json
{
  "company_profile": {
    "name": "Example Cyber Ltd",
    "location": "Manchester",
    "industry": "cybersecurity consulting",
    "company_size": "small",
    "employee_count": 8,
    "certifications": ["Cyber Essentials"],
    "past_projects": [
      "penetration testing",
      "security audit",
      "vulnerability assessment"
    ],
    "preferred_contract_value_min": 10000,
    "preferred_contract_value_max": 250000,
    "excluded_keywords": ["onsite full-time staffing"]
  },
  "deadline_within_days": 45,
  "limit": 10
}
```

Output:

```json
{
  "matches": [
    {
      "tender_id": "uuid",
      "title": "Cyber Security Testing Services",
      "fit_score": 84,
      "fit_status": "strong",
      "reasons": [
        "Matches cybersecurity and penetration testing keywords",
        "Contract value is within preferred range",
        "Deadline is within 45 days"
      ],
      "risks": [
        "Certification requirements need manual confirmation"
      ],
      "source_url": "https://..."
    }
  ]
}
```

### Tool 4: `explain_tender_requirements`

Purpose:

Summarize key requirements from a tender notice.

Input:

```json
{
  "tender_id": "uuid"
}
```

Output:

```json
{
  "summary": "The buyer is seeking cybersecurity testing services...",
  "key_requirements": [
    "Penetration testing experience",
    "Public-sector reporting capability",
    "Evidence of relevant certifications"
  ],
  "likely_required_documents": [
    "Company profile",
    "Relevant project examples",
    "Insurance evidence",
    "Certification evidence"
  ],
  "open_questions": [
    "Confirm exact certification requirements from tender documents"
  ],
  "source_url": "https://..."
}
```

### Tool 5: `generate_bid_checklist`

Purpose:

Generate an action checklist for bid/no-bid review.

Input:

```json
{
  "tender_id": "uuid",
  "company_profile": {
    "name": "Example Cyber Ltd",
    "industry": "cybersecurity consulting",
    "employee_count": 8,
    "certifications": ["Cyber Essentials"]
  }
}
```

Output:

```json
{
  "bid_no_bid_questions": [
    "Can the company provide evidence of similar public-sector work?",
    "Can the company meet the submission deadline?",
    "Are required certifications confirmed in the tender documents?"
  ],
  "preparation_tasks": [
    "Review full tender documents",
    "Prepare relevant case studies",
    "Confirm insurance and certification evidence",
    "Assign proposal owner"
  ],
  "risks": [
    "Short deadline may reduce bid quality"
  ],
  "source_url": "https://..."
}
```

### Tool 6: `watch_tenders`

Purpose:

Store a watch query for future alerts.

MVP note:

This should be minimal in beta. Do not overbuild alerting before repeat usage is proven.

MVP implementation:

```text
Save a query and company profile.
Allow manual re-run of the saved query.
Do not build email/webhook alerts until repeat usage is proven.
```

Related minimal tool:

```text
run_saved_search
```

## 8. Matching And Scoring

Fit score inputs:

```text
Keyword similarity
CPV code match
Region match
Estimated contract value match
Deadline window
Buyer type
Company size suitability
Required certification match
Excluded keyword penalty
Past project keyword match
```

Fit status:

```text
strong
possible
weak
needs_review
```

Rules:

- Do not claim a company is definitively eligible unless the source has explicit structured eligibility.
- Use `needs_review` when key tender documents are unavailable or ambiguous.
- Always list risks and missing information.
- Prefer explainable scoring over black-box ranking.

## 9. Data Model

Recommended tables:

```sql
tenders
- id
- source
- external_id
- title
- buyer_name
- description
- cpv_codes
- region
- country
- value_min
- value_max
- currency
- published_at
- deadline_at
- notice_type
- procurement_stage
- status
- is_cancelled
- is_awarded
- related_notice_ids
- source_url
- document_urls
- document_access_notes
- raw_json
- normalized_text
- content_hash
- last_checked_at
- last_seen_at
- created_at
- updated_at
```

```sql
tender_versions
- id
- tender_id
- source
- external_id
- version_hash
- changed_fields
- raw_json
- raw_text
- source_url
- observed_at
```

```sql
tender_documents
- id
- tender_id
- document_url
- document_title
- document_type
- retrieved_at
- access_status
- content_hash
- text_excerpt
- notes
```

```sql
company_profiles
- id
- user_id
- name
- industry
- location
- company_size
- employee_count
- certifications
- past_projects
- keywords
- preferred_contract_value_min
- preferred_contract_value_max
- excluded_keywords
- created_at
- updated_at
```

```sql
tender_matches
- id
- tender_id
- company_profile_id
- fit_score
- fit_status
- reasons
- risks
- missing_information
- created_at
```

```sql
api_keys
- id
- user_id
- key_hash
- label
- plan
- monthly_limit
- created_at
- revoked_at
```

```sql
usage_logs
- id
- user_id
- api_key_id
- tool_name
- request_hash
- result_count
- latency_ms
- created_at
```

Notice lifecycle rules:

```text
Keep historical versions when a notice changes.
Track cancelled, closed, awarded, and amended states.
Never hide old notices by deleting them unless removal is legally required.
Prefer marking stale notices with status and last_seen_at.
Expose notice status in every MCP result.
Warn users when a notice has changed since the last generated summary or match score.
```

## 10. Technical Architecture

Recommended MVP architecture:

```text
Official UK procurement sources
        ↓
Ingestion scripts / cron jobs
        ↓
Postgres database
        ↓
Search and matching API
        ↓
Hosted MCP server
        ↓
Claude / Cursor / ChatGPT-compatible clients / LangGraph
```

Recommended stack:

```text
Frontend/Landing: Next.js
Backend API: TypeScript + Fastify or Hono
MCP server: TypeScript MCP SDK
Database: Supabase Postgres
Search: Postgres full-text search
Hosting: Railway or Render
Auth: API key
Payments: Stripe after beta validation
Monitoring: Sentry
DNS: Cloudflare
```

Do not use vector search in the first MVP unless keyword search fails badly. Tender matching depends heavily on structured fields, deadlines, CPV codes, and contract value.

## 11. User Delivery Model

Customer-facing interface should be split by user type:

```text
Bid consultants:
- Web dashboard first
- Saved company/client profiles
- Search and matching reports
- CSV export later
- MCP optional

AI builders and technical users:
- Hosted MCP first
- Local MCP wrapper
- API docs
- Usage logs

SMEs:
- Web demo first
- Guided prompt examples
- MCP only if they already use Claude Desktop/Cursor
```

### Hosted MCP

Endpoint:

```text
https://api.bidscoutmcp.com/mcp
```

Used by advanced users and agent builders.

### Local MCP Wrapper

For Claude Desktop and Cursor users:

```json
{
  "mcpServers": {
    "bidscout": {
      "command": "npx",
      "args": ["-y", "@bidscout/mcp"],
      "env": {
        "BIDSCOUT_API_KEY": "your_api_key"
      }
    }
  }
}
```

The local wrapper should call the hosted API so authentication, usage logs, updates, and billing stay centralized.

### Web Demo

A minimal web demo is useful for non-technical prospects.

Inputs:

```text
Company description
Location
Sector
Preferred contract value
Keywords
```

Outputs:

```text
Top matching tenders
Fit scores
Reasons
Risks
Deadlines
Source links
```

The web demo is part of the MVP because the primary buyer may not know what MCP is. The landing page should sell the outcome first and mention MCP as the technical integration layer.

## 12. Pricing Hypothesis

Start with beta access before paid subscriptions.

Proposed pricing:

```text
Free
- 50 tool calls/month
- Recent tenders only
- 1 company profile

Pro: $19/month
- 1,000 tool calls/month
- Full tender search
- 3 company profiles
- Claude/Cursor setup

Consultant: $79/month
- 10,000 tool calls/month
- 50 company profiles
- Saved searches
- Watch queries
- CSV export

Agency/API: $199/month
- 50,000 tool calls/month
- Team API keys
- Webhook access
- Commercial client usage allowed
```

Pricing should be validated with consultants before implementation.

Commercial/legal checklist before paid launch:

```text
Terms of Service
Privacy Policy
Data-source attribution policy
Refund policy
Procurement-advice disclaimer
Stripe Tax or equivalent VAT handling
Cookie notice if analytics are used
Customer data deletion process
Support contact
```

Payment should not be implemented until repeat usage is shown, but legal pages should be drafted before collecting customer profiles beyond beta testing.

## 13. Landing Page Plan

Headline:

> Find UK public tenders with your AI agent.

Subheadline:

> BidScout MCP lets Claude, Cursor, and other AI agents search UK public tenders, match them to your company profile, summarize requirements, and generate bid/no-bid checklists.

Sections:

```text
1. Hero
2. Example prompt
3. Who it is for
4. MCP tools
5. Claude/Cursor setup preview
6. Data sources and source-link policy
7. Beta signup
8. Pricing preview
9. Disclaimer
```

Example prompts:

```text
Find cybersecurity tenders under £250k closing in the next 30 days.

We are a small software consultancy in Manchester. Which tenders should we look at this week?

Summarize this tender and create a bid/no-bid checklist.

Find tenders suitable for a small digital transformation consultancy with local government experience.
```

Disclaimer:

> BidScout MCP helps search and summarize public tender notices. It does not guarantee eligibility, compliance, award likelihood, or procurement advice. Always review the official source documents before bidding.

## 14. Beta Validation Plan

Goal:

Validate whether bid consultants and AI builders will repeatedly use the tool.

Target:

```text
20 beta users
5 repeat users
3 users with multiple company/client profiles
1-3 users asking for paid access or alerts
```

Outreach channels:

```text
LinkedIn
UK bid consultant directories
Procurement consultant communities
AI automation communities
Indie hacker communities
Reddit procurement/business communities
Cold email to small bid consultancies
```

Outreach message:

```text
Hi [Name],

I'm building BidScout MCP, a tool that lets Claude/Cursor/AI agents search UK public tenders, match them to a company profile, and generate bid/no-bid checklists.

I'm looking for UK bid consultants and small businesses to test the private beta.

Would you be open to trying it with one client profile and giving feedback?
```

Validation questions:

```text
How do you currently find and track tenders?
How many client/company profiles do you monitor?
Which portals or data sources do you rely on?
Do you already use ChatGPT, Claude, or other AI tools?
Would MCP/API access be useful, or do you need a web UI?
What output would save the most time?
Would you pay monthly for this if it worked?
```

## 15. MVP Development Sequence

1. Source review
   - Document UK tender data sources and reuse terms.

2. Data ingestion
   - Collect 500-2,000 initial tender records if source access allows.

3. Database
   - Create `tenders`, `company_profiles`, `api_keys`, and `usage_logs`.

4. Search API
   - Implement keyword, CPV, deadline, region, and value filters.

5. Matching engine
   - Implement explainable fit scoring.

6. MCP server
   - Implement `search_tenders`, `get_tender_detail`, and `match_tenders_to_company`.

7. Claude/Cursor test
   - Verify local wrapper works.

8. Usage logging and API keys
   - Add basic access control.

9. Landing page and docs
   - Publish setup instructions and beta signup.

10. Beta launch
   - Recruit bid consultants and AI builders.

11. Iterate
   - Add `explain_tender_requirements`, `generate_bid_checklist`, and saved profiles only after initial usage.

12. Payment
   - Add Stripe only after repeat usage is proven.

## 16. Success Metrics

Technical:

```text
Search latency under 2 seconds for common queries
MCP tool success rate over 95%
Every result includes a source URL
Daily ingestion/update job succeeds
```

Data quality:

```text
Deadline extraction accuracy above 95% on reviewed sample
Source URL coverage at 100%
Duplicate notice rate below 5%
Cancelled/closed notices correctly marked in reviewed sample
Top-10 search relevance above 70% for target-sector test queries
Fit-score explanations accepted as useful by at least 3 beta consultants
```

Product:

```text
20 beta users
5 repeat users
At least 100 MCP calls in beta
At least 3 users save or reuse company profiles
At least 1 user asks for paid access
```

Business:

```text
First paid user
First consultant using more than one client profile
First user requesting alerts or weekly reports
```

## 17. Competitive Positioning

Do not position as:

```text
Another tender portal
Another procurement database
Another generic AI chatbot
```

Position as:

```text
Agent-ready UK tender infrastructure
MCP for UK public procurement
Bid/no-bid workflow tools for AI agents
Tender data API built for Claude and Cursor workflows
```

Key differentiation:

```text
MCP-native access
Company profile matching
Explainable bid fit scoring
Agent-ready JSON outputs
Source-linked answers
Consultant workflow support
```

Competitor matrix:

```text
Official portals
- Examples: Contracts Finder, Find a Tender
- Strength: authoritative source data
- Weakness: not agent-native, limited client-profile matching, manual review burden

Tender alert services
- Strength: established workflow, email alerts, broad coverage
- Weakness: often human-search oriented, limited MCP/API workflow, limited AI-agent integration

Generic tender APIs
- Strength: normalized procurement data
- Weakness: raw data access rather than bid/no-bid workflow, usually not MCP-native

Bid-writing tools
- Strength: proposal drafting and document workflows
- Weakness: may not focus on agent-readable tender discovery infrastructure

BidScout MCP
- Strength: MCP/API-native, company-profile matching, explainable fit scoring, source-linked output
- Weakness: narrower initial coverage and less historical data at launch
```

## 18. Risks And Mitigations

### Risk: Existing tender APIs already serve the market

Mitigation:

- Focus on MCP-native workflows, not raw API access.
- Sell to AI builders and bid consultants using AI tools.
- Provide bid/no-bid reasoning, not only search.

### Risk: Data licensing or reuse terms are restrictive

Mitigation:

- Prefer official sources.
- Document terms.
- Store source links.
- Avoid republishing content beyond allowed use.
- Use metadata and summaries conservatively where needed.

### Risk: Users need web UI more than MCP

Mitigation:

- Provide a minimal web demo.
- Use MCP for power users and AI builders.
- Let market feedback decide which interface leads.

### Risk: Matching quality is poor

Mitigation:

- Start with narrow sectors.
- Use structured filters and explainable scoring.
- Collect feedback from bid consultants.

### Risk: Proposal writing expectations become too broad

Mitigation:

- Keep MVP focused on discovery, fit, and checklist.
- Do not promise full bid writing.
- Add document drafting only after strong demand.

### Risk: UK coverage expectations exceed MVP scope

Mitigation:

- State coverage clearly on landing page.
- Start with "Contracts Finder-first" wording.
- Add devolved administration sources only after ingestion quality is stable.

### Risk: Public source changes break ingestion

Mitigation:

- Add daily ingestion health checks.
- Store raw source payloads.
- Track source-specific failures.
- Notify admin when source freshness falls behind.

### Risk: Paid customers rely on outdated notices

Mitigation:

- Show `last_checked_at` and notice status.
- Re-check selected notice before generating bid checklist.
- Warn if a notice is closing soon, closed, amended, or stale.

## 19. Expansion Path

Phase 1:

```text
UK Tender MCP
```

Phase 2:

```text
Saved company profiles
Weekly tender digest
Watch queries
```

Phase 3:

```text
UK grants and funding opportunities
```

Phase 4:

```text
EU Funding & Tenders MCP
```

Phase 5:

```text
Proposal assistant workflow
Consultant dashboard
Team accounts
```

Phase 6:

```text
Marketplace for bid-writing agents, templates, and specialist MCP tools
```

## 20. MVP Definition Of Done

The MVP is done when:

- At least one official UK tender source is ingested.
- 500-2,000 tenders are searchable.
- `search_tenders`, `get_tender_detail`, and `match_tenders_to_company` work through MCP.
- Claude Desktop or Cursor can use the MCP server.
- Results include source URLs and deadlines.
- API key and usage logging work.
- A landing page and setup guide are published.
- 20 beta users can be onboarded.
