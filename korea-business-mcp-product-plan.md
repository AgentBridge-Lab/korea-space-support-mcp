# Korea Business MCP - Product Plan

## 1. Product Summary

Working name:

```text
Korea Business MCP
```

One-line positioning:

> 한국 공공·기업 데이터를 AI 에이전트가 바로 사용할 수 있게 해주는 MCP 인프라

Customer-facing positioning:

> Claude, Cursor, ChatGPT 에이전트에서 바로 쓰는 한국 비즈니스 데이터 도구

Longer description:

Korea Business MCP is a hosted MCP/API product that lets AI agents search and use Korean public and business data such as government support programs, procurement notices, laws and regulations, company filings, patents, trademarks, commercial district data, and real-estate/public statistics.

The initial product should not be a broad marketplace. The first wedge is a high-value, narrow module:

```text
Korean government support-program search and matching MCP
```

Once repeat usage is proven, the product expands into a bundle of Korean business-data MCP modules.

## 2. Core Thesis

AI agents will increasingly perform business research, document drafting, eligibility checks, market analysis, and operational workflows. For Korea, the bottleneck is not the agent UI itself. The bottleneck is reliable access to Korean public/business data in a form agents can use safely.

Most Korean public data is fragmented across portals, institutions, PDFs, local governments, and legacy APIs. Existing services are built for human browsing, not agent tool-calling.

Korea Business MCP turns Korean public/business data into:

```text
structured tool calls
source-linked results
company-profile-aware matching
agent-readable summaries
usage-metered hosted APIs
```

## 3. Target Customers

### Primary Initial Customer: Government-Support Consultants

Profile:

- 정부지원사업 컨설턴트
- 창업 컨설턴트
- 중소기업 컨설팅 업체
- 사업계획서/정부과제 대행사
- 액셀러레이터/창업보육센터 운영자

Pain:

- 여러 고객사 조건에 맞는 지원사업을 계속 찾아야 한다.
- K-Startup, 기업마당, 지자체, 기관 공고가 흩어져 있다.
- 공고 PDF와 첨부파일을 읽고 자격조건, 마감일, 필요서류를 정리해야 한다.
- 중복수혜 제한, 창업연차, 지역, 업종 조건을 놓칠 수 있다.

Why they may pay:

- 한 명의 컨설턴트가 여러 고객사 프로필에 반복 사용 가능하다.
- 시간 절감 효과가 직접적이다.
- 고객사에게 리포트 형태로 결과를 전달할 수 있다.

### Secondary Customer: Startup Founders And SME Operators

Profile:

- 스타트업 대표
- 개인사업자/법인사업자
- 중소기업 경영지원 담당자
- 제조업·소상공인·SaaS 기업

Pain:

- 본인 회사가 어떤 지원사업에 맞는지 알기 어렵다.
- 매번 여러 사이트를 확인해야 한다.
- 마감일을 놓친다.
- 공고 원문 용어가 어렵다.

Why they may pay:

- 놓치면 손해인 공고를 찾는 데 가치가 있다.
- 신청 우선순위, 필요서류, 주의사항을 빠르게 알고 싶다.

### Secondary Customer: AI Automation Agencies And Developers

Profile:

- AI 자동화 에이전시
- MCP/LLM 앱 개발자
- n8n/LangGraph/Claude/Cursor 기반 자동화 구축자
- 기업 내부 자동화 담당자

Pain:

- 한국 공공데이터를 에이전트에 연결할 안정적인 MCP/API가 부족하다.
- 공식 API를 직접 연동하고 정규화하는 비용이 크다.

Why they may pay:

- 자신들의 자동화 상품에 한국 데이터 tool을 붙여 재판매할 수 있다.
- MCP/API로 바로 연결되면 구축 시간이 줄어든다.

## 4. Product Strategy

Do not start as a marketplace. Start as a managed MCP/API product.

Recommended sequence:

```text
Phase 1: Government Support Program MCP
Phase 2: Procurement/Tender MCP
Phase 3: Laws and Regulation MCP
Phase 4: Company Research MCP
Phase 5: Patent/Trademark MCP
Phase 6: Commercial District/Real Estate MCP
Phase 7: Korea Business MCP Bundle
Phase 8: Third-party MCP marketplace
```

Rationale:

- A marketplace needs two-sided network effects.
- A single managed MCP can be built by one person.
- Support programs have clear customer pain and repeat usage potential.
- Once API key, usage logging, data ingestion, and MCP delivery are built, additional modules reuse the same infrastructure.

## 5. Initial Product: Support Program MCP

Initial product name:

```text
Korea Support Program MCP
```

Positioning:

> Claude/Cursor/ChatGPT에서 바로 쓰는 한국 정부지원사업 검색 도구

Core jobs:

```text
내 회사 조건에 맞는 지원사업 찾기
마감일 임박 공고 찾기
신청 가능성 검토
필요서류 요약
중복수혜/제한조건 확인
신청 우선순위 추천
신청서 초안 목차 생성
```

Example user prompt:

```text
서울 소재 1인 AI SaaS 스타트업이고 창업 1년 미만이야.
이번 달 신청 가능한 정부지원사업을 찾아주고,
지원금, 마감일, 필요서류, 주의사항을 정리해줘.
```

## 6. Expansion Modules

### Module 1: Support Program MCP

Data:

```text
K-Startup
기업마당
중소벤처기업부/창업진흥원 공고
NIPA/IITP/TIPA/KIAT
서울경제진흥원
경기도경제과학진흥원
지자체/테크노파크 공고
공공데이터포털 API
```

Tools:

```text
search_support_programs
get_support_program_detail
match_programs_to_company
check_support_program_eligibility
summarize_support_program
```

Buyer:

```text
정부지원사업 컨설턴트
스타트업 대표
중소기업 경영지원 담당자
```

### Module 2: Procurement/Tender MCP

Data:

```text
나라장터/조달청
공공기관 입찰공고
지자체 입찰공고
공공데이터포털 조달 관련 API
```

Tools:

```text
search_procurement_notices
match_tenders_to_company
summarize_tender_requirements
generate_bid_checklist
track_tender_deadlines
```

Buyer:

```text
입찰 컨설턴트
공공조달 참여기업
B2G 영업팀
SI/용역업체
```

### Module 3: Laws And Regulation MCP

Data:

```text
국가법령정보센터
행정규칙
고시/공고
지자체 조례
개인정보/AI/금융/노동/세무 관련 가이드
```

Tools:

```text
search_laws_and_regulations
compare_law_versions
track_effective_dates
summarize_compliance_obligations
find_related_rules
```

Buyer:

```text
노무사
세무사
행정사
컴플라이언스 담당자
공공 SI
AI/핀테크/헬스케어 스타트업
```

Important:

This module must be positioned as information retrieval and source-linked summarization, not legal advice.

### Module 4: Company Research MCP

Data:

```text
DART
KRX 공개정보
공공 조달 수주 정보
정부과제 참여 정보
특허/상표 공개정보
행정처분 공개정보 where legally available
```

Tools:

```text
search_company_profile
summarize_company_filings
track_executive_or_shareholder_changes
find_related_patents
generate_due_diligence_brief
```

Buyer:

```text
B2B 영업팀
투자자
컨설팅사
M&A 리서처
스타트업 분석가
```

### Module 5: Patent/Trademark MCP

Data:

```text
KIPRIS
특허청 공개정보
상표 공개정보
```

Tools:

```text
search_patents
search_trademarks
summarize_claims
find_similar_patents
track_assignee_activity
```

Buyer:

```text
스타트업 대표
변리사 사무소
R&D 조직
기술사업화 컨설턴트
```

### Module 6: Commercial District And Real Estate MCP

Data:

```text
상가업소 데이터
인구/유동인구 데이터
아파트 실거래가
공시지가
지하철/교통
학교/상권/행정구역 데이터
```

Tools:

```text
analyze_commercial_area
compare_locations
summarize_real_estate_transactions
score_franchise_location
find_population_and_traffic_signals
```

Buyer:

```text
프랜차이즈 창업자
상권분석 컨설턴트
부동산 중개/시행사
지역 마케팅 업체
```

## 7. Core Differentiation

Existing tools are usually:

```text
human-facing portals
one-off search sites
static public-data APIs
consulting services
generic RAG chatbots
```

Korea Business MCP should be:

```text
agent-native
source-linked
company-profile-aware
usage-metered
module-expandable
MCP/API-first
web-demo accessible
```

Differentiators:

1. **MCP-native delivery**
   - Claude, Cursor, ChatGPT-compatible tools, LangGraph, n8n, and custom agents can call the data directly.

2. **Korean data normalization**
   - Converts scattered Korean public data into consistent fields and tool responses.

3. **Company profile matching**
   - Not just search. The system checks whether a company appears to fit a program, tender, rule, or opportunity.

4. **Source-linked evidence**
   - Every answer includes official source URLs and last-checked timestamps.

5. **Consultant workflow support**
   - Multiple company profiles, repeat searches, matching reports, and alerts can become paid features.

## 8. MVP Scope

MVP should include only Support Program MCP.

Included:

```text
100-300 support-program notices
search_support_programs
get_support_program_detail
match_programs_to_company
check_support_program_eligibility
simple web demo
API key
usage logs
landing page
setup docs
```

Excluded:

```text
procurement/tender module
law/regulation module
DART/company module
patent module
commercial district module
payment
alerts
marketplace
auto application submission
full document drafting
```

## 9. User Delivery Model

### Web Demo

For non-technical users:

```text
스타트업 대표
컨설턴트
중소기업 담당자
```

Inputs:

```text
지역
사업자 유형
창업일
업종
직원 수
매출
키워드
이전 수혜 여부
```

Outputs:

```text
추천 공고
신청 가능성 점수
추천 이유
주의사항
누락정보
마감일
지원금
필요서류
원문 링크
```

### Hosted MCP

For developers and AI builders:

```text
https://api.koreabusinessmcp.com/mcp
```

### Local MCP Wrapper

For Claude Desktop/Cursor users:

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

## 10. Data Source Policy

Source priority:

```text
1. Official API with clear terms
2. Public data with commercial reuse allowed
3. Metadata + source-link only
4. Crawling only after terms and robots.txt review
```

Required per result:

```text
source name
source URL
last checked timestamp
status
coverage limitation where relevant
```

Do not:

```text
republish full copyrighted documents without permission
scrape aggressively
store unnecessary personal data
hide data uncertainty
claim complete coverage without evidence
```

## 11. Data Model

Use shared infrastructure for all modules.

Core tables:

```text
sources
api_keys
usage_logs
users
company_profiles
```

Support-program tables:

```text
support_programs
support_program_versions
support_program_documents
support_program_matches
```

Future module tables:

```text
procurement_notices
law_documents
company_records
patent_records
commercial_area_records
```

The schema should allow:

```text
source tracking
version tracking
raw payload storage
normalized fields
source-linked answers
usage metering
module-level billing
```

## 12. Pricing Hypothesis

Start free beta. Charge only after repeat usage.

Support Program MCP pricing:

```text
Free
- 월 30회 MCP/API 호출
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

Future bundle pricing:

```text
Support Program MCP only
Korea Business MCP Basic Bundle
Korea Business MCP Consultant Bundle
Korea Business MCP API/Agency Bundle
```

## 13. Beta Validation Plan

Goal:

Validate whether users repeatedly use support-program matching.

Target:

```text
20 beta users
5 repeat users
3 users with saved/reused company profiles
1-3 users asking for paid access, alerts, or reports
```

Recruit:

```text
정부지원사업 컨설턴트
창업 컨설턴트
스타트업 대표
중소기업 경영지원 담당자
AI 자동화 에이전시
```

Outreach message:

```text
안녕하세요. Claude/Cursor/ChatGPT에서 바로 쓸 수 있는 한국 정부지원사업 검색 MCP를 만들고 있습니다.

회사 조건을 입력하면 신청 가능한 공고, 마감일, 지원금, 필요서류, 신청 가능성 점수를 자동으로 정리해주는 도구입니다.

정부지원사업을 자주 찾는 대표님/컨설턴트분들을 대상으로 무료 베타를 운영하려고 하는데, 테스트해보실 의향이 있으실까요?
```

Validation questions:

```text
현재 지원사업을 어디서 찾나요?
고객사/회사 프로필을 몇 개나 관리하나요?
어떤 조건을 확인하는 데 시간이 가장 오래 걸리나요?
ChatGPT/Claude/Cursor를 업무에 쓰고 있나요?
MCP/API가 필요한가요, 웹 UI가 더 필요한가요?
어떤 결과물이 있으면 돈을 낼 수 있나요?
```

## 14. Quality Metrics

MVP quality metrics:

```text
source_url coverage: 100%
deadline extraction accuracy: 90%+
duplicate rate: below 5%
closed/expired notice handling: reviewed sample 90%+
top-10 relevance: 70%+
MCP tool success rate: 95%+
fit-score usefulness: 3 beta users confirm usefulness
```

Track failure cases:

```text
wrong region match
wrong company-stage match
missing deadline
outdated notice
duplicate program
unclear eligibility
unsupported PDF-only detail
```

## 15. Legal And Compliance

Before paid launch:

```text
이용약관
개인정보처리방침
데이터 출처/재사용 고지
환불정책
면책 문구
고객 데이터 삭제 절차
고객지원 연락처
통신판매업 검토
결제/세금계산서/현금영수증 처리
```

Required disclaimer:

```text
본 서비스는 공고 검색, 요약, 신청 가능성 검토를 돕는 도구입니다.
최종 신청 가능 여부와 제출 요건은 반드시 원문 공고 및 담당기관을 통해 확인해야 합니다.
```

Avoid:

```text
지원사업 선정 보장
신청 가능 확정
모든 정부지원사업 완전 커버
자동 신청 대행
법률/세무/행정 자문
```

## 16. Risks And Mitigations

### Risk: Data licensing uncertainty

Mitigation:

- Prefer official APIs and clear reuse terms.
- Store source links.
- Avoid republishing full documents unless allowed.
- Document every source.

### Risk: Users do not understand MCP

Mitigation:

- Lead with web demo.
- Sell the outcome, not the protocol.
- Provide Claude/Cursor copy-paste setup.

### Risk: Search quality is poor

Mitigation:

- Start with narrow categories.
- Use structured fields before vector search.
- Review top results manually.

### Risk: Coverage expectations are too high

Mitigation:

- State coverage clearly.
- Start with selected sources.
- Do not claim complete Korean support-program coverage.

### Risk: Product becomes consulting-heavy

Mitigation:

- Keep onboarding self-serve.
- Build reusable company profiles and reports.
- Avoid custom implementation unless paid.

## 17. Competitive Positioning

Do not position as:

```text
another public-data portal
another support-program search website
another government-project consulting service
generic RAG chatbot
```

Position as:

```text
Korean business-data tools for AI agents
MCP/API infrastructure for Korean public data
company-profile-aware support-program matching
source-linked Korean public-data automation
```

Competitor comparison:

```text
Official portals
- Strength: authoritative
- Weakness: fragmented, human-facing, no agent workflow

Consultants
- Strength: domain expertise
- Weakness: labor-intensive, not scalable

Generic AI chatbots
- Strength: flexible
- Weakness: no reliable Korean public-data source integration

Korea Business MCP
- Strength: agent-native, source-linked, structured, reusable API/MCP
- Weakness: narrow initial coverage
```

## 18. MVP Development Sequence

1. Build project skeleton
   - API, MCP, web, shared package.

2. Document data sources
   - `docs/korea-business-data-sources.md`.

3. Add sample support-program data
   - 20-50 representative records.

4. Implement search API
   - `/support-programs/search`.

5. Implement detail API
   - `/support-programs/:id`.

6. Implement company-profile matching
   - `scoreSupportProgramFit`.

7. Implement MCP tools
   - `search_support_programs`, `get_support_program_detail`, `match_programs_to_company`.

8. Build web demo
   - company profile input and top matches.

9. Add API key and usage logging
   - prepare beta control.

10. Publish landing and docs
   - beta signup, setup guides, example prompts.

11. Recruit beta users
   - 20 users, 5 repeat users.

12. Decide next module
   - procurement, laws, or DART based on demand.

## 19. MVP Definition Of Done

MVP is done when:

```text
Data source review is documented.
At least one safe source is ingested or represented with approved sample data.
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

## 20. Long-Term Vision

Korea Business MCP can become the Korean business-data infrastructure layer for AI agents.

Long-term product:

```text
One API key
Multiple Korean business-data modules
MCP-native tools
Source-linked evidence
Company-profile-aware matching
Usage-based billing
Developer/agency resale support
Future third-party MCP marketplace
```

Strategic moat:

```text
Korean data normalization
source-specific ingestion know-how
agent-ready tool schemas
usage logs and customer workflows
company-profile matching engine
module bundle distribution
```

