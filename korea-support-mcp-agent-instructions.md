# Korea Support Program MCP - Agent Execution Instructions

## 0. Objective

Build an MVP for a Korean government support-program search tool that can be used directly from Claude, Cursor, ChatGPT-compatible agents, or any MCP client.

Product positioning:

> Claude/Cursor/ChatGPT에서 바로 쓰는 한국 정부지원사업 검색 도구

MVP scope:

- Collect 100-300 Korean support-program notices.
- Normalize them into a searchable database.
- Provide a small HTTP API.
- Provide an MCP server exposing 3-5 tools.
- Add API key and usage logging.
- Create a simple landing page and beta onboarding flow.

Do not build a marketplace, full CRM, or full application assistant in the MVP.

## 1. Ground Rules For Agents

- Keep the MVP small and shippable.
- Prefer official APIs and legally reusable public data.
- Store source URLs for every notice.
- Do not scrape websites aggressively.
- Do not make legal, tax, or guaranteed eligibility claims.
- Always phrase eligibility output as likely, unlikely, or needs_review unless the source has an explicit machine-checkable rule.
- Every MCP result must include source references.
- Start with deterministic filters before adding LLM summarization.
- Do not add vector search until keyword and structured filters are working.

## 2. Recommended Tech Stack

Use this stack unless the repository already contains a different working stack.

- Frontend: Next.js
- Backend API: TypeScript with Fastify or Hono
- MCP server: TypeScript MCP SDK
- Database: Supabase Postgres or local Postgres for development
- Search: Postgres full-text search
- Hosting: Railway
- Auth: API key first, Supabase Auth later
- Monitoring: Sentry optional
- Payment: Stripe or Toss Payments after beta validation

## 3. MVP Milestones

### Milestone 1 - Project Setup

Goal:

Create a basic runnable project structure.

Tasks:

1. Initialize a TypeScript project.
2. Add package manager config.
3. Add API server skeleton.
4. Add MCP server skeleton.
5. Add database migration folder.
6. Add `.env.example`.
7. Add README with local run instructions.

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

Done when:

- `npm install` or equivalent works.
- API server starts locally.
- MCP server starts locally.
- README explains how to run both.

### Milestone 2 - Data Source Review

Goal:

Identify safe initial data sources.

Tasks:

1. List candidate data sources.
2. For each source, record:
   - Name
   - URL
   - Whether an official API exists
   - Terms or usage notes
   - Data fields available
   - Update frequency
3. Select 1-3 initial sources.

Recommended initial source categories:

- K-Startup notices
- 기업마당 support programs
- Public-data APIs from data.go.kr
- Seoul/Gyeonggi startup or SME support notices
- NIPA/IITP/TIPA/KIAT public notices if terms allow

Create:

```text
docs/data-sources.md
```

Done when:

- At least 3 candidate sources are documented.
- At least 1 source is approved for MVP ingestion.
- Legal or terms uncertainty is explicitly noted.

### Milestone 3 - Database Schema

Goal:

Create normalized tables for support programs, company profiles, API keys, and usage logs.

Create migration:

```sql
create table programs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  external_id text,
  title text not null,
  agency text,
  source_url text not null,
  region text,
  target_regions text[],
  industries text[],
  target_company_stage text,
  target_company_type text,
  min_company_age_months int,
  max_company_age_months int,
  min_revenue numeric,
  max_revenue numeric,
  min_employees int,
  max_employees int,
  support_amount_text text,
  support_amount_min numeric,
  support_amount_max numeric,
  application_start_date date,
  application_end_date date,
  summary text,
  eligibility_text text,
  required_documents text[],
  raw_text text,
  raw_json jsonb,
  attachment_urls text[],
  status text not null default 'active',
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table company_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text,
  business_type text,
  region text,
  founded_at date,
  industry text,
  keywords text[],
  employee_count int,
  revenue numeric,
  previous_grants text[],
  certifications text[],
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  key_hash text not null unique,
  label text,
  plan text not null default 'free',
  monthly_limit int not null default 30,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

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

Also add useful indexes:

- `programs(application_end_date)`
- `programs(source)`
- `programs(status)`
- full-text index over `title`, `summary`, `eligibility_text`, `raw_text`

Done when:

- Migrations run locally.
- A seed script can insert at least 5 sample programs.

### Milestone 4 - Data Collection

Goal:

Collect 100-300 support-program notices.

Tasks:

1. Implement one ingestion script per approved source.
2. Normalize fields into the `programs` table.
3. Save `raw_json` or `raw_text`.
4. Save `source_url`.
5. Deduplicate by `source + external_id` or canonical URL.
6. Add a manual seed file if official API coverage is insufficient.

Create scripts:

```text
scripts/ingest-source-1.ts
scripts/normalize-program.ts
scripts/seed-sample-programs.ts
```

Normalization rules:

- Convert dates to ISO format.
- Extract application deadline where possible.
- Keep unknown fields null instead of guessing.
- Store uncertain eligibility text in `eligibility_text`.
- Store original content in `raw_text` or `raw_json`.

Done when:

- Database contains at least 100 real or representative notices.
- Each notice has `title`, `source`, `source_url`, and `raw_text` or `raw_json`.
- At least 70% of notices have an application deadline or explicit unknown status.

### Milestone 5 - Search API

Goal:

Expose a simple HTTP API for program search and detail retrieval.

Endpoints:

```text
GET /health
POST /programs/search
GET /programs/:id
POST /programs/:id/check-eligibility
POST /programs/match
```

`POST /programs/search` input:

```json
{
  "query": "AI SaaS 창업지원",
  "region": "서울",
  "industry": "AI",
  "company_stage": "창업 1년 미만",
  "deadline_within_days": 30,
  "limit": 10
}
```

`POST /programs/search` output:

```json
{
  "results": [
    {
      "program_id": "uuid",
      "title": "지원사업명",
      "agency": "기관명",
      "deadline": "2026-07-15",
      "support_amount": "최대 7000만원",
      "summary": "요약",
      "source_url": "https://..."
    }
  ]
}
```

Done when:

- Search works by keyword.
- Search works by deadline.
- Search works by region where data is available.
- Detail endpoint returns source URL and raw source fields.

### Milestone 6 - Eligibility And Matching Logic

Goal:

Implement a conservative scoring system for matching company profiles to programs.

Scoring inputs:

- Region match
- Industry keyword match
- Company age match
- Employee count match
- Revenue range match
- Deadline availability
- Exclusion keywords
- Required certifications or documents

Output labels:

```text
likely
unlikely
needs_review
```

Create shared function:

```text
scoreProgramFit(program, companyProfile) -> {
  score: number;
  status: "likely" | "unlikely" | "needs_review";
  reasons: string[];
  risks: string[];
  missing_information: string[];
}
```

Rules:

- Never return `eligible: true` as a guarantee.
- If required data is missing, return `needs_review`.
- Include evidence from source fields where possible.

Done when:

- Matching function is unit-tested with at least 10 cases.
- API returns score, reasons, risks, and missing information.

### Milestone 7 - MCP Server

Goal:

Expose the search and matching API as MCP tools.

Initial MCP tools:

```text
search_programs
get_program_detail
check_eligibility
match_programs_to_company
summarize_program
```

Tool: `search_programs`

Input:

```json
{
  "query": "AI SaaS 창업지원",
  "region": "서울",
  "industry": "AI",
  "deadline_within_days": 30,
  "limit": 10
}
```

Output:

```json
{
  "results": [
    {
      "program_id": "uuid",
      "title": "지원사업명",
      "agency": "기관명",
      "deadline": "2026-07-15",
      "summary": "요약",
      "source_url": "https://..."
    }
  ]
}
```

Tool: `check_eligibility`

Input:

```json
{
  "program_id": "uuid",
  "company_profile": {
    "location": "서울",
    "founded_at": "2026-02-01",
    "business_type": "개인사업자",
    "industry": "AI SaaS",
    "employees": 1,
    "revenue": 0,
    "previous_grants": []
  }
}
```

Output:

```json
{
  "status": "likely",
  "score": 82,
  "matched_conditions": [
    "창업 3년 이내",
    "AI/디지털 분야 포함"
  ],
  "missing_information": [
    "사업자등록증 업종 코드"
  ],
  "warnings": [
    "중복수혜 제한 여부 확인 필요"
  ],
  "source_url": "https://..."
}
```

Done when:

- MCP server starts locally.
- Claude Desktop or Cursor can call at least `search_programs`.
- Every MCP output includes source URL when returning program data.

### Milestone 8 - Local MCP Wrapper

Goal:

Make the service easy to connect from local MCP clients.

Create an npm package or local executable:

```text
@yourname/korea-support-mcp
```

Example client config:

```json
{
  "mcpServers": {
    "korea-support": {
      "command": "npx",
      "args": ["-y", "@yourname/korea-support-mcp"],
      "env": {
        "KOREA_SUPPORT_API_KEY": "your_api_key"
      }
    }
  }
}
```

Done when:

- A user can copy one config block and connect.
- Missing API key produces a clear error.
- Invalid API key produces a clear error.

### Milestone 9 - API Key And Usage Logging

Goal:

Control access and prepare for billing.

Tasks:

1. Add API key generation script.
2. Store hashed API keys only.
3. Require API key for API and MCP calls.
4. Log each MCP tool call.
5. Enforce monthly limit by plan.

Plans for beta:

```text
free: 30 calls/month
pro_beta: 1000 calls/month
consultant_beta: 10000 calls/month
```

Done when:

- Requests without key are rejected.
- Requests with revoked key are rejected.
- Usage is visible in `usage_logs`.
- Monthly limit is enforced.

### Milestone 10 - Landing Page

Goal:

Create a simple public page for beta users.

Sections:

1. Hero
   - "Claude/Cursor에서 바로 쓰는 한국 정부지원사업 검색 도구"
2. Use case examples
3. Supported tools
   - Claude Desktop
   - Cursor
   - API
4. Features
   - 지원사업 검색
   - 신청 가능성 검토
   - 마감일 확인
   - 필요서류 요약
5. Beta signup form
6. Pricing preview
7. Terms note
   - "본 서비스는 공고 검색 및 요약 도구이며, 최종 신청 가능 여부는 원문 공고와 담당기관 확인이 필요합니다."

Done when:

- Page is deployed.
- Signup form stores email and role.
- Documentation link explains MCP setup.

### Milestone 11 - Beta Documentation

Goal:

Help beta users connect and test quickly.

Create:

```text
docs/claude-desktop-setup.md
docs/cursor-setup.md
docs/api-reference.md
docs/example-prompts.md
```

Example prompts:

```text
서울 소재 1인 AI SaaS 스타트업이 이번 달 신청 가능한 지원사업을 찾아줘.

부산 제조업 5년차 중소기업이 신청 가능한 디지털 전환 지원사업을 찾아줘.

이 공고에 개인사업자가 신청 가능한지 확인하고, 필요한 서류를 정리해줘.

내 회사 프로필 기준으로 신청 우선순위가 높은 사업 5개를 추천해줘.
```

Done when:

- A non-developer can follow docs with minimal help.
- At least 10 example prompts are provided.

### Milestone 12 - Beta Launch

Goal:

Recruit 20 beta users and identify repeat usage.

Target communities:

- Startup founder communities
- Government-support consultants
- Startup accelerators
- Small business communities
- AI automation communities
- LinkedIn contacts

Outreach message:

```text
안녕하세요. Claude/Cursor/ChatGPT에서 바로 쓸 수 있는 한국 정부지원사업 검색 MCP를 만들고 있습니다.

회사 조건을 입력하면 신청 가능한 공고, 마감일, 필요서류, 신청 가능성 점수를 자동으로 정리해주는 도구입니다.

정부지원사업을 자주 찾는 대표님/컨설턴트분들을 대상으로 무료 베타를 운영 중인데, 테스트해보실 의향이 있으실까요?
```

Beta success metrics:

- 20 beta users
- 5 repeat users
- 3 users request alerts or saved profiles
- 1-3 users ask about paid plan

Done when:

- Feedback from at least 10 users is collected.
- Usage data shows top tools and failure cases.
- A paid-plan decision can be made based on evidence.

### Milestone 13 - Payment Decision

Goal:

Add payment only after repeat usage is proven.

Initial pricing:

```text
Free
- 월 30회 MCP 호출
- 최근 14일 공고 검색
- 회사 프로필 1개

Pro: 월 19,000원
- 월 1,000회 호출
- 전체 공고 검색
- 회사 프로필 3개

Consultant: 월 79,000원
- 월 10,000회 호출
- 고객사 프로필 30개
- 매칭 리포트

Agency/API: 월 199,000원
- 월 50,000회 호출
- 팀 API key
- 상업적 고객 사용 허용
```

Do not implement payment before:

- At least 5 users have used the service more than once.
- At least 1 user has asked for paid access, saved profiles, or alerts.
- Data quality issues are understood.

## 4. Test Plan

Minimum automated tests:

- Program normalization test
- Search filter test
- Deadline filter test
- Fit scoring test
- API key auth test
- Usage logging test
- MCP tool smoke test

Manual tests:

1. Connect to Claude Desktop.
2. Ask for Seoul AI startup support programs.
3. Ask for manufacturing SME support programs.
4. Ask eligibility for one selected program.
5. Verify source URL is included.
6. Verify unsupported claim is not presented as guaranteed eligibility.

## 5. Security And Compliance Checklist

- Hash API keys.
- Do not store raw user secrets in logs.
- Do not store unnecessary personal information.
- Add clear disclaimer about eligibility.
- Respect robots.txt and terms when collecting data.
- Prefer official APIs.
- Include source URLs.
- Provide delete request contact.
- Rate-limit API keys.

## 6. Known Risks

### Risk: Data terms are unclear

Mitigation:

- Prefer official APIs.
- Document source terms.
- Store links and excerpts conservatively.
- Avoid republishing full copyrighted content where not permitted.

### Risk: Users expect guaranteed eligibility

Mitigation:

- Use likely, unlikely, needs_review.
- Always cite source.
- Add disclaimer in outputs.

### Risk: MCP is too technical for customers

Mitigation:

- Provide a web demo.
- Provide copy-paste Claude/Cursor setup.
- Sell the outcome, not the protocol.

### Risk: Data quality is poor

Mitigation:

- Start with fewer sources.
- Add manual review for top programs.
- Track missing deadlines and missing eligibility fields.

## 7. Future Extensions

Add only after MVP validation:

- Saved company profiles
- Weekly matching email
- KakaoTalk/Slack alerts
- Application checklist generation
- Document draft generation
- Consultant dashboard
- Nation-wide local government data
- Procurement/tender MCP
- Legal/regulation MCP
- DART/company research MCP

## 8. Definition Of MVP Done

MVP is done when:

- 100-300 notices are stored.
- `search_programs`, `get_program_detail`, and `check_eligibility` work through MCP.
- Claude or Cursor can call the MCP tools.
- API key and usage logging work.
- Landing page and setup docs are published.
- 20 beta users can be onboarded.

