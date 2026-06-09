# UK Tender MCP - Agent Execution Instructions

## 0. Objective

Build an MVP for `BidScout MCP`, a hosted MCP/API product that lets AI agents search UK public tenders, match tenders to a company profile, and generate bid/no-bid summaries.

Product positioning:

> Find UK public tenders with your AI agent.

MVP coverage:

- Contracts Finder first.
- England and UK central-government opportunities available through Contracts Finder.
- Find a Tender only after public API/search/reuse terms are confirmed.
- No claim of complete UK-wide coverage in MVP.

Do not build:

- Full bid-writing platform.
- Marketplace.
- CRM.
- Full UK devolved administration coverage.
- Payment before beta usage is proven.

## 1. Agent Ground Rules

- Keep work small and shippable.
- Prefer official sources and documented reuse terms.
- Every tender result must include `source_url`, `source`, and `last_checked_at`.
- Never guarantee eligibility, compliance, or award likelihood.
- Use `strong`, `possible`, `weak`, or `needs_review` for fit status.
- Track notice status and stale data.
- Store raw source payloads where allowed.
- Do not use vector search until structured search is working.
- For primary beta users, provide a simple web demo as well as MCP access.

## 2. Recommended Stack

Use this stack unless an existing project uses something else.

```text
Frontend/Landing: Next.js
Backend API: TypeScript + Fastify or Hono
MCP Server: TypeScript MCP SDK
Database: Supabase Postgres or local Postgres
Search: Postgres full-text search
Hosting: Railway or Render
Auth: API key
Payments: Stripe after beta validation
Monitoring: Sentry
DNS: Cloudflare
```

Suggested structure:

```text
apps/
  api/
    src/
      index.ts
      routes/
      services/
      db/
  mcp/
    src/
      index.ts
      tools/
  web/
    src/
packages/
  shared/
    src/
      types.ts
      scoring.ts
      normalization.ts
migrations/
scripts/
docs/
```

## 3. Milestone 1 - Project Setup

Goal:

Create a runnable monorepo or small multi-app project.

Tasks:

1. Initialize TypeScript project.
2. Create `apps/api`.
3. Create `apps/mcp`.
4. Create `apps/web`.
5. Create `packages/shared`.
6. Create `migrations`.
7. Add `.env.example`.
8. Add root README with local run instructions.

Done when:

- API server starts locally.
- MCP server starts locally.
- Web app starts locally.
- README explains setup.

## 4. Milestone 2 - UK Data Source Review

Goal:

Confirm which UK tender data can be ingested safely.

Create:

```text
docs/uk-data-sources.md
```

For each source, document:

```text
source name
official URL
API/download method
reuse/license notes
coverage area
available fields
rate limits if known
update frequency
known gaps
implementation status
```

Initial source priority:

```text
Priority 1: Contracts Finder
Priority 2: Find a Tender, after API/search/reuse confirmation
Priority 3: Public Contracts Scotland, Sell2Wales, eTendersNI after MVP validation
```

Done when:

- Contracts Finder source method is documented.
- Find a Tender uncertainty is documented.
- MVP coverage statement is documented.
- At least one source is approved for ingestion.

## 5. Milestone 3 - Database Schema

Goal:

Create normalized tender, profile, usage, and notice-history tables.

Create migrations for:

```sql
create table tenders (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  external_id text,
  title text not null,
  buyer_name text,
  description text,
  cpv_codes text[],
  region text,
  country text,
  value_min numeric,
  value_max numeric,
  currency text default 'GBP',
  published_at timestamptz,
  deadline_at timestamptz,
  notice_type text,
  procurement_stage text,
  status text default 'active',
  is_cancelled boolean default false,
  is_awarded boolean default false,
  related_notice_ids text[],
  source_url text not null,
  document_urls text[],
  document_access_notes text,
  raw_json jsonb,
  raw_text text,
  normalized_text text,
  content_hash text,
  last_checked_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

```sql
create table tender_versions (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid references tenders(id),
  source text not null,
  external_id text,
  version_hash text not null,
  changed_fields text[],
  raw_json jsonb,
  raw_text text,
  source_url text,
  observed_at timestamptz not null default now()
);
```

```sql
create table tender_documents (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid references tenders(id),
  document_url text not null,
  document_title text,
  document_type text,
  retrieved_at timestamptz,
  access_status text,
  content_hash text,
  text_excerpt text,
  notes text
);
```

```sql
create table company_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text,
  industry text,
  location text,
  company_size text,
  employee_count int,
  certifications text[],
  past_projects text[],
  keywords text[],
  preferred_contract_value_min numeric,
  preferred_contract_value_max numeric,
  excluded_keywords text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

```sql
create table api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  key_hash text not null unique,
  label text,
  plan text not null default 'free',
  monthly_limit int not null default 50,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
```

```sql
create table usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  api_key_id uuid references api_keys(id),
  tool_name text not null,
  request_hash text,
  result_count int,
  latency_ms int,
  created_at timestamptz not null default now()
);
```

Indexes:

- `tenders(source, external_id)`
- `tenders(deadline_at)`
- `tenders(status)`
- `tenders(is_cancelled)`
- `tenders(is_awarded)`
- full-text index over `title`, `buyer_name`, `description`, `normalized_text`

Done when:

- Migrations run locally.
- Seed script inserts at least 5 sample tenders.
- Search indexes are created.

## 6. Milestone 4 - Data Ingestion

Goal:

Collect 500-2,000 initial tender records if source access allows.

Tasks:

1. Implement Contracts Finder ingestion script.
2. Normalize source fields into `tenders`.
3. Save raw payload where allowed.
4. Deduplicate by `source + external_id` or canonical `source_url`.
5. Compute `content_hash`.
6. Create `tender_versions` when source data changes.
7. Track `last_checked_at` and `last_seen_at`.
8. Mark stale/closed/cancelled/awarded notices where source data supports it.

Create:

```text
scripts/ingest-contracts-finder.ts
scripts/normalize-tender.ts
scripts/seed-sample-tenders.ts
```

Done when:

- At least 500 tender records are inserted, or limitation is documented.
- Every record has title, source, source URL, and last checked time.
- Duplicate rate is under 5% in a reviewed sample.
- Changed source records create `tender_versions`.

## 7. Milestone 5 - Search API

Goal:

Expose basic tender search and detail endpoints.

Endpoints:

```text
GET /health
POST /tenders/search
GET /tenders/:id
POST /tenders/match
POST /tenders/:id/explain
```

`POST /tenders/search` input:

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

Done when:

- Search works by keyword.
- Search works by deadline.
- Search works by CPV code where available.
- Search works by value range where available.
- Results include source URL, status, deadline, and last checked time.

## 8. Milestone 6 - Matching Engine

Goal:

Rank tenders against a company profile with explainable reasons.

Create function:

```text
scoreTenderFit(tender, companyProfile) -> {
  score: number;
  fit_status: "strong" | "possible" | "weak" | "needs_review";
  reasons: string[];
  risks: string[];
  missing_information: string[];
}
```

Scoring inputs:

```text
keyword match
CPV code match
region match
contract value range
deadline window
buyer type
company size suitability
certification match
excluded keyword penalty
past project keyword match
notice status
```

Rules:

- If tender is closed/cancelled/awarded, penalize or exclude unless explicitly requested.
- If certification or eligibility data is unclear, return `needs_review`.
- Always include risks and missing information.
- Do not claim guaranteed eligibility.

Done when:

- At least 10 unit tests cover scoring cases.
- Fit scores are deterministic.
- API returns score, fit status, reasons, risks, and missing information.

## 9. Milestone 7 - MCP Server

Goal:

Expose the tender API as MCP tools.

Initial MCP tools:

```text
search_tenders
get_tender_detail
match_tenders_to_company
explain_tender_requirements
generate_bid_checklist
```

Beta-only optional tools:

```text
watch_tenders
run_saved_search
```

Tool requirements:

- Validate inputs.
- Require API key.
- Log usage.
- Include source URLs.
- Include notice status.
- Include `last_checked_at`.
- Warn if notice is stale, closed, cancelled, awarded, or amended.

Done when:

- MCP server starts locally.
- Claude Desktop or Cursor can call `search_tenders`.
- `match_tenders_to_company` returns explainable fit output.
- Source URL appears in every tender result.

## 10. Milestone 8 - Local MCP Wrapper

Goal:

Make the service easy to connect from local MCP clients.

Create package:

```text
@bidscout/mcp
```

Example config:

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

Done when:

- Missing API key gives a clear error.
- Invalid API key gives a clear error.
- Valid API key calls hosted API.

## 11. Milestone 9 - Web Demo

Goal:

Provide a simple interface for bid consultants who do not know MCP.

Inputs:

```text
Company description
Location
Sector
Preferred contract value
Certifications
Keywords
Excluded keywords
```

Outputs:

```text
Top matching tenders
Fit score
Fit reasons
Risks
Deadline
Buyer
Source link
Last checked time
```

Done when:

- A non-technical user can test matching in the browser.
- Results are source-linked.
- Page includes disclaimer.

## 12. Milestone 10 - API Keys And Usage Logging

Goal:

Prepare access control and future billing.

Tasks:

1. Generate API keys.
2. Store only hashed keys.
3. Require API key for API and MCP calls.
4. Log tool calls in `usage_logs`.
5. Enforce monthly limits.
6. Add admin script to create/revoke keys.

Beta plans:

```text
free: 50 calls/month
pro_beta: 1000 calls/month
consultant_beta: 10000 calls/month
```

Done when:

- Unauthorized requests are rejected.
- Revoked keys are rejected.
- Monthly limit is enforced.
- Usage logs show tool name, result count, and latency.

## 13. Milestone 11 - Landing Page

Goal:

Recruit beta users.

Landing sections:

```text
1. Hero: Find UK public tenders with your AI agent.
2. Example prompts
3. Who it is for
4. Web demo preview
5. MCP/API integration
6. Data coverage policy
7. Source-link policy
8. Beta signup
9. Pricing preview
10. Disclaimer
```

Important wording:

Use:

```text
Contracts Finder-first UK tender search for AI agents.
```

Avoid:

```text
Complete UK tender coverage.
Guaranteed bid eligibility.
Automated procurement advice.
```

Done when:

- Signup form works.
- Coverage limitation is clear.
- Disclaimer is visible.
- Setup docs are linked.

## 14. Milestone 12 - Documentation

Create:

```text
docs/claude-desktop-setup.md
docs/cursor-setup.md
docs/api-reference.md
docs/example-prompts.md
docs/uk-data-sources.md
docs/coverage-policy.md
```

Example prompts:

```text
Find cybersecurity tenders under £250k closing in the next 30 days.

We are a small software consultancy in Manchester. Which tenders should we review this week?

Summarize this tender and create a bid/no-bid checklist.

Find tenders suitable for a small digital transformation consultancy with local government experience.
```

Done when:

- A beta user can connect Claude or Cursor from the docs.
- Data coverage and source limitations are clear.

## 15. Milestone 13 - Quality Evaluation

Goal:

Measure whether search and matching are useful enough.

Create a test set:

```text
10 cybersecurity queries
10 software/digital transformation queries
10 consulting/training queries
10 generic SME queries
```

Track:

```text
deadline extraction accuracy
source URL coverage
duplicate rate
closed/cancelled notice handling
top-10 relevance
fit-score usefulness
false positives
false negatives
```

Minimum quality targets:

```text
Source URL coverage: 100%
Deadline extraction accuracy: 95% on reviewed sample
Duplicate rate: below 5%
Top-10 relevance: above 70% for target-sector queries
MCP tool success rate: above 95%
```

Done when:

- Evaluation results are documented.
- Known failure cases are listed.
- At least 3 beta users say fit explanations are useful.

## 16. Milestone 14 - Beta Launch

Goal:

Recruit 20 beta users.

Target users:

```text
UK bid consultants
small procurement advisory firms
AI automation builders
SMEs already interested in public contracts
```

Outreach channels:

```text
LinkedIn
UK bid consultant directories
procurement consultant communities
AI automation communities
indie hacker communities
cold email to small bid consultancies
```

Outreach message:

```text
Hi [Name],

I'm building BidScout MCP, a tool that lets Claude/Cursor/AI agents search UK public tenders, match them to a company profile, and generate bid/no-bid checklists.

I'm looking for UK bid consultants and small businesses to test the private beta.

Would you be open to trying it with one client profile and giving feedback?
```

Success metrics:

```text
20 beta users
5 repeat users
3 users with multiple company/client profiles
1-3 users asking for paid access, alerts, or saved profiles
```

Done when:

- At least 10 users provide feedback.
- Repeat usage is measured.
- Decision is made on whether to add payment.

## 17. Milestone 15 - Commercial Readiness

Do this before paid launch:

```text
Terms of Service
Privacy Policy
Data-source attribution policy
Refund policy
Procurement-advice disclaimer
Stripe Tax or VAT handling decision
Cookie notice if analytics are used
Customer data deletion process
Support contact
```

Do not add payment until:

- At least 5 users use the tool more than once.
- At least 1 user asks for paid access or a paid feature.
- Data coverage and quality issues are understood.

Initial pricing hypothesis:

```text
Free
- 50 tool calls/month
- recent tenders only
- 1 company profile

Pro: $19/month
- 1,000 tool calls/month
- full tender search
- 3 company profiles

Consultant: $79/month
- 10,000 tool calls/month
- 50 company profiles
- saved searches
- watch queries

Agency/API: $199/month
- 50,000 tool calls/month
- team API keys
- commercial client usage allowed
```

## 18. MVP Definition Of Done

MVP is done when:

- Contracts Finder source review is complete.
- At least one official source is ingested.
- 500-2,000 tenders are searchable, or source limitation is documented.
- `search_tenders`, `get_tender_detail`, and `match_tenders_to_company` work through MCP.
- Claude Desktop or Cursor can use the MCP server.
- Web demo works for non-technical users.
- Results include source URLs, deadlines, status, and last checked times.
- API key and usage logging work.
- Landing page and setup guide are published.
- 20 beta users can be onboarded.

