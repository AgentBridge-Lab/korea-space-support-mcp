# Korea Business MCP - Agent Execution Instructions

## 0. Objective

Build an MVP for `Korea Business MCP`, an agent-ready MCP/API infrastructure product for Korean public and business data.

Product positioning:

> Claude, Cursor, ChatGPT 에이전트가 한국 공공·기업 데이터를 바로 조회하고 업무문서까지 만들 수 있게 해주는 MCP API

Initial wedge:

```text
정부지원사업/창업지원사업 검색 MCP
```

Expansion modules:

```text
지원사업 MCP
조달/입찰 MCP
법령/규제 MCP
기업공시/리서치 MCP
특허/상표 MCP
상권/부동산 MCP
```

Do not build all modules at once. Build the support-program module first, then expand only after usage is proven.

## 1. Product Scope

### MVP Included

```text
한국 정부지원사업/창업지원사업 공고 검색
회사 프로필 기반 신청 가능성 매칭
마감일, 지원금, 필요서류, 주의사항 요약
MCP tools
HTTP API
간단한 웹 데모
API key
사용량 로그
베타 신청 랜딩페이지
데이터 출처/커버리지 고지
```

### MVP Excluded

```text
완전한 한국 공공데이터 마켓플레이스
모든 정부지원사업 완전 커버리지
자동 신청/제출
신청 대행
법률/세무/행정 자문
결제 기능
CRM
조달/법령/DART 모듈 동시 구현
```

## 2. Target Customers

### Primary Customer: 정부지원사업 컨설턴트

Pain:

- 여러 고객사 조건에 맞는 지원사업을 매주 찾아야 한다.
- 공고 원문, PDF, 첨부파일을 읽고 조건을 정리하는 시간이 오래 걸린다.
- 마감일과 중복수혜 제한을 놓칠 수 있다.

Why they pay:

- 고객사 여러 개에 반복 사용 가능하다.
- 검색, 요약, 자격검토 시간이 줄어든다.
- 월 구독 비용을 고객 컨설팅 비용에 전가하기 쉽다.

### Secondary Customer: 스타트업/중소기업 대표

Pain:

- K-Startup, 기업마당, 지자체, 기관 공고가 흩어져 있다.
- 내 회사가 신청 가능한지 판단하기 어렵다.
- 마감일을 놓친다.

Why they pay:

- 놓치면 손해인 공고를 찾는 데 가치가 있다.
- 신청 우선순위와 준비서류를 빠르게 알고 싶다.

### Secondary Customer: AI 자동화 에이전시/개발자

Pain:

- 고객용 AI 에이전트에 붙일 한국 공공데이터 tool이 부족하다.
- 공식 API를 직접 수집·정규화하기 번거롭다.

Why they pay:

- 자신들의 자동화 제품에 Korea Business MCP를 연결해 재판매할 수 있다.

## 3. Product Strategy

Build in this order:

```text
Phase 1: 지원사업 MCP
Phase 2: 조달/입찰 MCP
Phase 3: 법령/규제 MCP
Phase 4: 기업공시/DART + 특허 리서치 MCP
Phase 5: 한국 비즈니스 데이터 MCP 번들
Phase 6: 외부 개발자 MCP 등록/수수료형 마켓플레이스
```

Key rule:

MVP is not a marketplace. MVP is a managed MCP product with one high-value module.

## 4. Data Source Review

Create:

```text
docs/korea-business-data-sources.md
```

For every source, record:

```text
source_name
official_url
data_category
official_api_available
data_go_kr_available
license_or_terms
commercial_use_allowed
attribution_required
redistribution_allowed
rate_limits
available_fields
attachment_policy
update_frequency
coverage
known_gaps
mvp_status
```

Initial data source candidates:

```text
K-Startup
기업마당
창업진흥원
중소벤처기업부
NIPA
IITP
TIPA
KIAT
서울경제진흥원
경기도경제과학진흥원
각 지자체/테크노파크 지원사업 공고
공공데이터포털(data.go.kr)
```

Future module candidates:

```text
나라장터/조달청
국가법령정보센터
DART
KIPRIS
공공데이터포털 상권/부동산/인구 API
```

Source priority:

```text
1. 공식 API + 상업적 이용 가능
2. 공공누리/공공데이터 이용조건 명확
3. 원문 URL + 메타데이터 저장만 허용 가능
4. 약관 검토 필요한 크롤링
```

Done when:

- At least 8 Korean data sources are documented.
- At least 1 source is approved for MVP ingestion.
- Each source has legal/reuse uncertainty marked.
- Do-not-use sources are listed if terms are unsafe.

## 5. Architecture

Recommended architecture:

```text
Official Korean public/business data sources
        ↓
Ingestion scripts / API fetchers
        ↓
Normalization pipeline
        ↓
Postgres database
        ↓
Search + matching API
        ↓
Hosted MCP server
        ↓
Claude / Cursor / ChatGPT-compatible agents / LangGraph / n8n
```

Recommended stack:

```text
Frontend/Landing: Next.js
Backend API: TypeScript + Fastify or Hono
MCP Server: TypeScript MCP SDK
Database: Supabase Postgres
Search: Postgres full-text search first
Queue/Cron: Railway cron or GitHub Actions
Hosting: Railway or Render
Auth: API key first
Monitoring: Sentry
Payment: Toss Payments or Stripe after validation
DNS: Cloudflare
```

## 6. Database Schema

Use module-neutral naming so future data types can be added.

### `sources`

```sql
create table sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  official_url text not null,
  license_notes text,
  commercial_use_allowed boolean,
  attribution_required boolean,
  mvp_status text not null default 'candidate',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### `support_programs`

```sql
create table support_programs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references sources(id),
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
  announcement_date date,
  summary text,
  eligibility_text text,
  required_documents text[],
  restrictions text[],
  raw_text text,
  raw_json jsonb,
  attachment_urls text[],
  status text not null default 'active',
  content_hash text,
  last_checked_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### `support_program_versions`

```sql
create table support_program_versions (
  id uuid primary key default gen_random_uuid(),
  support_program_id uuid references support_programs(id),
  version_hash text not null,
  changed_fields text[],
  raw_json jsonb,
  raw_text text,
  source_url text,
  observed_at timestamptz not null default now()
);
```

### `company_profiles`

```sql
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
```

### `api_keys`

```sql
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
```

### `usage_logs`

```sql
create table usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  api_key_id uuid references api_keys(id),
  module text not null,
  tool_name text not null,
  request_hash text,
  result_count int,
  latency_ms int,
  created_at timestamptz not null default now()
);
```

Indexes:

```text
support_programs(source, external_id)
support_programs(application_end_date)
support_programs(status)
support_programs(region)
full-text index over title, agency, summary, eligibility_text, raw_text
usage_logs(api_key_id, created_at)
```

## 7. MVP MCP Tools

Implement support-program tools first.

### `search_support_programs`

Purpose:

Search Korean support programs by company profile, region, industry, keyword, deadline, and company stage.

Input:

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

Output:

```json
{
  "results": [
    {
      "program_id": "uuid",
      "title": "2026년 초기창업기업 AI 서비스 사업화 지원사업",
      "agency": "창업진흥원",
      "deadline": "2026-07-15",
      "support_amount": "최대 7000만원",
      "status": "active",
      "summary": "AI 서비스 사업화를 지원하는 공고",
      "source": "K-Startup",
      "source_url": "https://...",
      "last_checked_at": "2026-06-06T00:00:00Z"
    }
  ]
}
```

### `get_support_program_detail`

Purpose:

Return detailed source-linked information for a selected program.

### `match_programs_to_company`

Purpose:

Rank programs for a company profile.

Input:

```json
{
  "company_profile": {
    "region": "서울",
    "founded_at": "2026-02-01",
    "business_type": "개인사업자",
    "industry": "AI SaaS",
    "employee_count": 1,
    "revenue": 0,
    "previous_grants": [],
    "keywords": ["생성형 AI", "MCP", "SaaS"]
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
      "program_id": "uuid",
      "title": "지원사업명",
      "fit_score": 82,
      "eligibility_status": "likely",
      "reasons": [
        "창업 3년 이내 기업 대상",
        "AI/디지털 분야 포함",
        "서울 소재 기업 신청 가능"
      ],
      "risks": [
        "중복수혜 제한 확인 필요"
      ],
      "missing_information": [
        "사업자등록증 업종 코드"
      ],
      "source_url": "https://..."
    }
  ]
}
```

### `check_support_program_eligibility`

Purpose:

Check a single program against a company profile. Never guarantee eligibility.

Allowed statuses:

```text
likely
unlikely
needs_review
```

### `summarize_support_program`

Purpose:

Summarize the program, required documents, key deadlines, restrictions, and open questions.

### Future tools

Add only after MVP validation:

```text
watch_support_programs
run_saved_search
generate_application_checklist
draft_application_outline
search_procurement_notices
search_laws_and_regulations
search_company_filings
search_patents
```

## 8. Matching Logic

Create:

```text
scoreSupportProgramFit(program, companyProfile)
```

Return:

```text
score
eligibility_status
reasons
risks
missing_information
source_evidence
```

Scoring factors:

```text
지역 일치
업종 키워드 일치
창업연차
예비창업자/개인사업자/법인사업자 조건
매출 조건
직원 수 조건
이전 수혜 제한
중복수혜 제한
필수 인증/서류
마감일
지원금 규모
제외 키워드
```

Rules:

- `eligible: true` 같은 확정 표현 금지.
- 정보가 부족하면 `needs_review`.
- 중복수혜/이전수혜/업종코드 미확인은 risk 또는 missing_information.
- 원문 근거 문장을 source_evidence로 보존.

## 9. HTTP API

Endpoints:

```text
GET /health
POST /support-programs/search
GET /support-programs/:id
POST /support-programs/match
POST /support-programs/:id/check-eligibility
POST /support-programs/:id/summarize
```

Requirements:

- Invalid input returns 400.
- Missing API key returns 401 after auth is enabled.
- Revoked API key returns 403.
- Every response includes source URL where program data is returned.
- No endpoint should expose raw secrets or full user profile logs.

## 10. Web Demo

Build a simple web demo because many Korean customers will not understand MCP.

Inputs:

```text
사업자 유형
지역
창업일
업종
직원 수
매출
키워드
이전 수혜 여부
```

Outputs:

```text
추천 지원사업
신청 가능성 점수
추천 이유
주의사항
누락 정보
마감일
지원금
필요서류
원문 링크
마지막 확인 시각
```

Web demo positioning:

```text
MCP를 모르는 사용자는 웹에서 먼저 체험한다.
개발자/AI 자동화 고객은 MCP/API를 연결한다.
```

## 11. Local MCP Wrapper

Create an npm package later:

```text
@korea-business/mcp
```

Example config:

```json
{
  "mcpServers": {
    "korea-business": {
      "command": "npx",
      "args": ["-y", "@korea-business/mcp"],
      "env": {
        "KOREA_BUSINESS_API_KEY": "your_api_key"
      }
    }
  }
}
```

The local wrapper should call the hosted API so authentication, usage, and billing stay centralized.

## 12. API Key And Usage Logging

Implement before beta expansion.

Tasks:

```text
Generate API keys
Hash API keys before storing
Require API key for MCP/API calls
Log module and tool name
Log result count and latency
Enforce monthly limits
Admin script to revoke keys
```

Beta limits:

```text
free: 30 calls/month
pro_beta: 1000 calls/month
consultant_beta: 10000 calls/month
```

## 13. Landing Page

Headline:

```text
Claude/Cursor에서 바로 쓰는 한국 정부지원사업 검색 도구
```

Subheadline:

```text
회사 조건을 입력하면 신청 가능한 지원사업을 찾고, 마감일·지원금·필요서류·주의사항을 정리합니다.
```

Sections:

```text
1. Hero
2. 예시 질문
3. 웹 데모
4. MCP/API 연결
5. 대상 고객
6. 데이터 출처 정책
7. 커버리지 한계
8. 무료 베타 신청
9. 가격 예정
10. 면책 문구
```

Disclaimer:

```text
본 서비스는 공고 검색, 요약, 신청 가능성 검토를 돕는 도구입니다.
최종 신청 가능 여부와 제출 요건은 반드시 원문 공고 및 담당기관을 통해 확인해야 합니다.
```

Avoid claims:

```text
지원사업 선정 보장
신청 가능 확정
모든 정부지원사업 완전 커버
자동 신청 대행
```

## 14. Documentation

Create:

```text
docs/claude-desktop-setup.md
docs/cursor-setup.md
docs/api-reference.md
docs/example-prompts.md
docs/korea-business-data-sources.md
docs/coverage-policy.md
docs/disclaimer.md
```

Example prompts:

```text
서울 소재 1인 AI SaaS 스타트업이 이번 달 신청 가능한 지원사업을 찾아줘.

부산 제조업 5년차 중소기업이 신청 가능한 디지털 전환 지원사업을 찾아줘.

이 공고에 개인사업자가 신청 가능한지 확인하고 필요한 서류를 정리해줘.

내 회사 프로필 기준으로 신청 우선순위가 높은 사업 5개를 추천해줘.
```

## 15. Quality Evaluation

Create test set:

```text
AI/SaaS 창업지원 질의 10개
제조업 디지털전환 질의 10개
예비창업자 질의 10개
중소기업 일반 질의 10개
R&D 과제 질의 10개
```

Track:

```text
source_url coverage
deadline extraction accuracy
duplicate rate
closed/expired notice handling
top-10 relevance
fit-score usefulness
false positives
false negatives
MCP tool success rate
```

Minimum targets:

```text
source_url coverage: 100%
deadline extraction accuracy: 90% on reviewed sample
duplicate rate: below 5%
top-10 relevance: above 70% for target queries
MCP tool success rate: above 95%
```

## 16. Beta Launch

Goal:

Recruit 20 beta users.

Target:

```text
정부지원사업 컨설턴트
창업 컨설턴트
스타트업 대표
중소기업 경영지원 담당자
세무사/노무사/행정사 사무소
액셀러레이터/창업보육센터
AI 자동화 에이전시
```

Outreach message:

```text
안녕하세요. Claude/Cursor/ChatGPT에서 바로 쓸 수 있는 한국 정부지원사업 검색 MCP를 만들고 있습니다.

회사 조건을 입력하면 신청 가능한 공고, 마감일, 지원금, 필요서류, 신청 가능성 점수를 자동으로 정리해주는 도구입니다.

정부지원사업을 자주 찾는 대표님/컨설턴트분들을 대상으로 무료 베타를 운영하려고 하는데, 테스트해보실 의향이 있으실까요?
```

Beta success:

```text
20 beta users
5 repeat users
3 users with saved/reused company profiles
1-3 users asking about paid plan, alerts, or consultant features
```

## 17. Paid Launch Checklist

Do this before payment:

```text
이용약관
개인정보처리방침
데이터 출처/재사용 고지
환불정책
면책 문구
고객 데이터 삭제 절차
고객지원 연락처
통신판매업 검토
토스페이먼츠/Stripe 결제 검토
세금계산서/현금영수증 처리 방식
```

Do not implement payment until:

```text
5 users use the product more than once
1 user asks for paid access or paid feature
data quality issues are understood
coverage limitations are clear
```

Pricing hypothesis:

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
- 저장 검색

Agency/API: 월 199,000원
- 월 50,000회 호출
- 팀 API key
- 상업적 고객 사용 허용
- webhook
```

## 18. MVP Development Sequence

1. Project setup
   - API, MCP, web, shared package skeleton.

2. Data source review
   - `docs/korea-business-data-sources.md`.

3. Sample data
   - 20-50 representative support-program samples.

4. Database schema
   - `sources`, `support_programs`, `company_profiles`, `api_keys`, `usage_logs`.

5. Search API
   - `/support-programs/search`, `/support-programs/:id`.

6. Matching engine
   - `scoreSupportProgramFit`.

7. MCP server
   - `search_support_programs`, `get_support_program_detail`, `match_programs_to_company`.

8. Web demo
   - Non-technical company-profile matching form.

9. API key and usage logs
   - Beta access control.

10. Docs and landing
   - Setup guides, examples, beta form.

11. Beta launch
   - 20 users.

12. Iterate
   - Add alerts, saved profiles, report generation only after repeat usage.

## 19. MVP Definition Of Done

MVP is done when:

```text
Korean data source review is documented.
At least one safe source is ingested.
100-300 support programs are searchable, or source limitation is documented.
search_support_programs works through MCP.
get_support_program_detail works through MCP.
match_programs_to_company works through MCP.
Web demo works for non-technical users.
Every result includes source URL, deadline, status, and last checked time.
API key and usage logging work.
Landing page and setup guide are published.
20 beta users can be onboarded.
```

