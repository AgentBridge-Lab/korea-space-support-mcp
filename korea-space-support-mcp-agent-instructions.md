# Korea Space Support MCP - Agent Execution Instructions

## 0. Objective

Build a narrow MVP for `Korea Space Support MCP`, an MCP/API product that helps AI agents search Korean space, aerospace, satellite, launch, downstream space-data, and space-tech commercialization support programs.

Product positioning:

> Claude/Cursor/ChatGPT에서 바로 쓰는 한국 우주분야 지원사업 검색 도구

Narrow wedge:

```text
한국 우주·항공우주 분야 정부지원사업/연구과제/기업지원 공고 MCP
```

This is a niche version of `Korea Business MCP`. Do not build a generic support-program search product first.

## 1. Target Users

### Primary Users

```text
우주/항공우주 스타트업 대표
위성 데이터·지상국·탑재체·소부장 기업
드론/항공우주 부품 제조기업
대학 연구실, 출연연, 연구책임자, 소규모 연구팀
우주기술 사업화 컨설턴트
정부 R&D 과제 컨설턴트
대학/출연연 기술사업화 담당자
```

### Secondary Users

```text
방산/항공 부품기업
AI/위성영상 분석 스타트업
스마트시티/재난/환경 위성데이터 활용 기업
우주항공 클러스터 입주 희망 기업
투자자/액셀러레이터
```

## 2. Customer Jobs

Users should be able to ask:

```text
우리 회사가 신청 가능한 우주분야 지원사업을 찾아줘.
위성데이터 활용 스타트업이 신청 가능한 R&D 과제를 찾아줘.
우주항공청 신규과제 중 기업 참여 가능한 공고만 정리해줘.
항우연/KARI 패밀리기업이나 기술사업화 지원 공고를 찾아줘.
항우연/KARI 위탁연구과제 중 대학 연구실이나 연구팀이 신청 가능한 공고를 찾아줘.
우주과학/탐사 분야 연구자 지원 프로그램을 찾아줘.
사천/경남 우주항공 클러스터 관련 기업지원 공고를 찾아줘.
이 공고에 스타트업 단독 신청이 가능한지 확인해줘.
마감일 임박한 우주·항공우주 지원사업을 우선순위로 정리해줘.
```

## 3. MVP Scope

### Included

```text
우주·항공우주 관련 공고 50-150개 수집
우주분야 키워드 필터링
공고 검색 API
MCP tools
회사 프로필 기반 적합도 평가
지원대상/필요서류/마감일 요약
원문 링크/마지막 확인 시각 제공
간단한 웹 데모
데이터 소스 검토 문서
```

MVP source boundary:

```text
Track A - Core space: KASA, KARI, KASI
Track B - Defense space: DAPA, KRIT, ADD public notices only
Track C - Aerospace industry: MOTIE/KEIT/KIAT and MOLIT/KAIA notices only when they clearly match aerospace, aviation, UAM, drone, or space-adjacent keywords
```

Do not ingest every notice from all agencies in the MVP. Collect only notices classified as:

```text
core_space
satellite
launch_vehicle
space_data
astronomy_space_science
defense_space
aerospace
aviation_industry
drone_uam_adjacent
```

### Excluded

```text
한국 전체 지원사업 커버리지
모든 R&D 과제 자동 수집
자동 신청서 작성/제출
법률/행정 자문
과제 선정 가능성 보장
결제 기능
마켓플레이스
투자유치 자동화
```

## 4. Space Domain Definition

Treat a notice as space-relevant if it matches one or more categories:

```text
우주항공
우주산업
위성
위성정보
위성영상
발사체
우주탐사
우주기술
우주부품
탑재체
지상국
천문
천문연
우주과학
우주감시
우주상황인식
감시정찰
국방우주
방산우주
방위사업
항공우주
우주 소부장
우주 데이터
우주기술 사업화
우주항공 클러스터
KASA
KARI
KASI
항우연
천문연
KAIA 항공우주
```

Optional adjacent categories:

```text
드론
UAM
항공 부품
항공기체
항공엔진
항공전자
항공안전
첨단제조
소부장
방산 항공전자
스마트시티 위성데이터 활용
재난/환경 위성정보 활용
```

Rule:

Adjacent categories should be marked as `adjacent_space` instead of `core_space`.

## 5. Data Source Review

Create:

```text
docs/korea-space-data-sources.md
```

For each source, record:

```text
source_name
official_url
source_type
official_api_available
license_or_terms
commercial_use_allowed
attribution_required
redistribution_allowed
fields_available
attachment_policy
update_frequency
coverage
space_relevance
mvp_status
known_gaps
```

Initial source candidates:

```text
우주항공청(KASA) 사업공고/공지사항
한국항공우주연구원(KARI) 뉴스룸/공지사항/기업지원/연구과제 공고
한국천문연구원(KASI) 공지/사업/장비·관측·우주과학·연구자 지원 공고
방위사업청(DAPA) 방산·우주·감시정찰·위성 관련 사업공고
국방기술진흥연구소/KRIT 국방 R&D 및 방산기업 지원 공고
국방과학연구소/ADD 관련 공개 공고
국토교통과학기술진흥원(KAIA) 항공우주·국토교통 R&D 공고
국토교통부(MOLIT) 항공정책·드론·UAM·항공안전·항공산업 관련 공고
산업통상자원부(MOTIE) 항공우주·소부장·첨단제조·산업기술 R&D 공고
한국산업기술기획평가원(KEIT) 항공우주·소부장·첨단제조 R&D 공고
정보통신기획평가원(IITP) 위성통신/우주 ICT 관련 과제
NIPA 위성데이터/AI/디지털 전환 관련 사업
TIPA 중소기업 R&D 중 우주·항공우주 키워드 공고
KIAT 산업기술 R&D 중 항공우주/소부장 공고
기업마당 우주·항공우주 키워드 공고
K-Startup 우주기술/딥테크/초격차/신산업 공고
경남/사천/대전/전남 등 우주항공 클러스터 관련 지자체 공고
테크노파크 우주항공 기업지원 공고
```

Priority:

```text
1. KASA official notices
2. Defense/public defense-tech sources: DAPA, KRIT, ADD public notices
3. KASI astronomy/space-science, researcher-support, and observation-infrastructure notices
4. KARI research-project and enterprise/industry support notices
5. MOTIE/KEIT/KIAT aerospace, materials, parts, and advanced manufacturing R&D
6. MOLIT/KAIA aviation, drone, UAM, aerospace infrastructure R&D
7. 기업마당/K-Startup keyword-filtered notices
8. Regional aerospace cluster notices
```

Important source policy:

- Prefer official APIs where available.
- If only webpage notices exist, store metadata and source URL first.
- Do not create or merge hand-authored/curated real notice records. Every real generated record must come from automated source discovery and parsing.
- 안내/포털/매뉴얼/시스템 공지는 과제공고 또는 지원사업 공고가 아니면 제외한다. 단, 제목에 `위탁연구과제`, `신규과제`, `공모`, `재공모`가 포함된 연구과제 공고는 `안내`라는 단어가 있어도 제외하지 않는다.
- Exclude procurement-only, bid, contract, BTL, PPP, hiring, event, exhibition-booth, award-result, and portal-navigation notices unless they are also explicit grant/R&D/support-program calls.
- Generated records must have a readable application deadline. If no deadline is extractable from the page or attachments, put the candidate in `data/space-programs.excluded.json` with reason `no_readable_application_deadline`.
- Parse HWPX/HWP/PDF attachments when page HTML does not expose the deadline. Prefer real download URLs over preview URLs.
- Validate that `application_end_date >= announcement_date` and that stored `status` matches the current deadline-derived status.
- Do not republish full attached documents unless terms allow it.
- If a KASA/KARI notice is marked with non-commercial terms, do not use it in a paid product beyond source-link metadata until legal review.
- For defense and dual-use notices, store only public metadata, source URL, and conservative summaries unless reuse terms are clearly safe.
- Do not collect login-gated, restricted, classified, export-controlled, or non-public defense information.
- When a notice is defense-related, always expose a warning that eligibility, security requirements, export-control restrictions, and procurement qualification must be checked in the official source.

MVP source limit:

```text
Start with 3-5 source families only:
1. KASA
2. KARI
3. KASI
4. DAPA/KRIT public notices
5. MOTIE/KEIT or MOLIT/KAIA aerospace keyword-filtered notices
```

Move all other sources to backlog until the first ingestion pipeline and classification quality are verified.

## 6. Data Model

Use a narrow schema, but keep future expansion possible.

### `space_programs`

```sql
create table space_programs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  external_id text,
  title text not null,
  agency text,
  source_url text not null,
  source_type text,
  source_family text,
  space_category text not null,
  relevance_score int,
  data_reuse_policy text,
  commercial_use_allowed boolean,
  defense_or_dual_use boolean default false,
  restricted_notice boolean default false,
  region text,
  target_regions text[],
  industries text[],
  technology_areas text[],
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
  security_requirements text[],
  export_control_notes text,
  qualification_notes text,
  participation_type text,
  lead_applicant_allowed text,
  consortium_required boolean,
  university_or_research_partner_required boolean,
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

### `space_program_documents`

```sql
create table space_program_documents (
  id uuid primary key default gen_random_uuid(),
  space_program_id uuid references space_programs(id),
  document_url text not null,
  document_title text,
  document_type text,
  retrieved_at timestamptz,
  access_status text,
  reuse_policy text,
  content_hash text,
  text_excerpt text,
  notes text
);
```

### `space_program_versions`

```sql
create table space_program_versions (
  id uuid primary key default gen_random_uuid(),
  space_program_id uuid references space_programs(id),
  version_hash text not null,
  changed_fields text[],
  raw_json jsonb,
  raw_text text,
  source_url text,
  observed_at timestamptz not null default now()
);
```

### `space_company_profiles`

```sql
create table space_company_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text,
  business_type text,
  region text,
  founded_at date,
  industry text,
  technology_areas text[],
  keywords text[],
  employee_count int,
  revenue numeric,
  previous_grants text[],
  certifications text[],
  has_research_partner boolean,
  can_join_consortium boolean,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### Shared tables

```text
api_keys
usage_logs
sources
```

Indexes:

```text
space_programs(source, external_id)
space_programs(application_end_date)
space_programs(status)
space_programs(space_category)
space_programs(relevance_score)
full-text index over title, agency, summary, eligibility_text, raw_text
```

## 7. Space-Specific Normalization

Extract these fields when possible:

```text
space_category
technology_areas
support_amount
application_deadline
agency
target_company_type
lead_applicant_allowed
consortium_required
university_or_research_partner_required
participation_type
required_documents
restrictions
security_requirements
export_control_notes
qualification_notes
```

Eligibility guidance:

- 기업지원 공고는 기업 대상 자격을 요약한다.
- 연구과제/위탁연구/전문가 지원 공고는 기업 전용으로 오분류하지 않는다.
- 대학 연구실, 출연연, 연구기관, 연구책임자, 소규모 연구팀, 기업 연구조직이 참여 가능한 가능성이 있으면 `target_company_type`, `eligibility_text`, `university_or_research_partner_required`에 연구자/연구기관 친화적으로 반영한다.
- `중소기업` 키워드만 보고 모든 공고를 중소기업 대상 공고로 정규화하지 않는다.

`space_category` values:

```text
core_space
satellite
launch_vehicle
space_data
astronomy_space_science
space_observation_infrastructure
defense_space
defense_aerospace
space_parts_materials
space_commercialization
aerospace
aviation_industry
aviation_safety
drone_uam_adjacent
defense_aerospace_adjacent
adjacent_space
unknown
```

`technology_areas` examples:

```text
위성체
위성영상
위성통신
지상국
발사체
탑재체
우주탐사
우주과학
천문관측
우주감시
우주상황인식
감시정찰위성
국방우주
항공전자
항공엔진
항공기체
항공안전
우주부품
항공기체
항공소재
소부장
첨단제조
드론
UAM
AI 위성데이터
재난/환경 관측
```

## 8. MVP MCP Tools

### `search_space_programs`

Purpose:

Search Korean space/aerospace-related support programs.

Input:

```json
{
  "query": "위성데이터 AI 스타트업",
  "space_category": "space_data",
  "region": "서울",
  "company_stage": "창업 3년 이내",
  "deadline_within_days": 60,
  "limit": 10
}
```

Output:

```json
{
  "results": [
    {
      "program_id": "uuid",
      "title": "우주기술 실용화 촉진 지원사업",
      "agency": "우주항공청",
      "space_category": "space_commercialization",
      "deadline": "2026-07-15",
      "support_amount": "최대 5억원",
      "status": "active",
      "summary": "공공 우주기술의 민간 사업화를 지원하는 R&D 사업",
      "source_url": "https://...",
      "last_checked_at": "2026-06-06T00:00:00Z"
    }
  ]
}
```

### `get_space_program_detail`

Purpose:

Return detailed source-linked information for one program.

Must include:

```text
source_url
last_checked_at
status
agency
eligibility_text
required_documents
restrictions
participation_type
consortium_required
```

### `match_space_programs_to_company`

Purpose:

Rank space-related programs for a company profile.

Input:

```json
{
  "company_profile": {
    "region": "서울",
    "founded_at": "2025-03-01",
    "business_type": "법인사업자",
    "industry": "위성데이터 AI 분석",
    "technology_areas": ["위성영상", "AI 위성데이터", "재난 관측"],
    "employee_count": 6,
    "revenue": 100000000,
    "has_research_partner": false,
    "can_join_consortium": true,
    "previous_grants": []
  },
  "deadline_within_days": 90,
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
      "fit_score": 84,
      "eligibility_status": "likely",
      "space_relevance": "core_space",
      "reasons": [
        "위성데이터 활용 분야와 일치",
        "창업 3년 이내 기업 대상",
        "컨소시엄 참여 가능 조건과 일치"
      ],
      "risks": [
        "주관기관 단독 신청 가능 여부 확인 필요"
      ],
      "missing_information": [
        "연구기관 파트너 보유 여부"
      ],
      "source_url": "https://..."
    }
  ]
}
```

### `check_space_program_eligibility`

Purpose:

Check a single program against a company profile.

Allowed statuses:

```text
likely
unlikely
needs_review
```

Never return:

```text
eligible: true
선정 가능
신청 가능 확정
```

### `summarize_space_program`

Purpose:

Summarize:

```text
사업 목적
지원 대상
우주분야 관련성
지원금/지원내용
신청 기간
참여 방식
컨소시엄/주관기관 조건
필요서류
주의사항
원문 링크
```

## 9. Matching Logic

Create:

```text
scoreSpaceProgramFit(program, companyProfile)
```

Return:

```text
score
eligibility_status
space_relevance
reasons
risks
missing_information
source_evidence
```

Scoring factors:

```text
우주분야 핵심성
기술분야 일치
지역 일치
창업연차
사업자 유형
기업 규모
매출 조건
컨소시엄 가능 여부
연구기관/대학 파트너 필요 여부
국방/방산 참여자격
보안·수출통제·방산 인증 필요 가능성
천문/우주과학 연구기관 협력 필요 여부
산업부 R&D의 소부장/제조역량 조건
국토부/KAIA 과제의 실증·인프라·항공안전 조건
이전 수혜 제한
마감일
지원금 규모
필수 인증/서류
```

Decision rules:

```text
If defense_or_dual_use is true, never return likely without a needs_review warning unless eligibility is explicit and public.
If restricted_notice is true, return needs_review and only show source metadata.
If university_or_research_partner_required is true and company has no partner, add a high-priority risk.
If consortium_required is true and company cannot join consortium, return unlikely or needs_review.
If source terms are non-commercial or unclear, avoid storing full text and return source-linked metadata.
```

Risk examples:

```text
대학/출연연 주관 과제로 보임
기업 단독 신청 가능 여부 불명확
컨소시엄 필수 가능성
중복수혜 제한 확인 필요
TRL/기술성숙도 조건 확인 필요
국방/방산 과제로 보안요건 또는 참여자격 제한 가능성
방산기업/국방과제 수행실적 필요 가능성
천문연/우주과학 공고로 민간기업 직접지원이 아닐 수 있음
산업부 R&D로 제조·소부장 역량 증빙이 필요할 수 있음
국토부/KAIA 항공 실증 과제로 인증·안전·실증지 요건이 있을 수 있음
우주 분야가 아니라 항공/드론 인접 분야일 수 있음
```

## 10. HTTP API

Endpoints:

```text
GET /health
POST /space-programs/search
GET /space-programs/:id
POST /space-programs/match
POST /space-programs/:id/check-eligibility
POST /space-programs/:id/summarize
```

Requirements:

- Invalid input returns 400.
- Every program response includes source URL.
- Every response includes last checked timestamp.
- Expired/closed programs must be marked clearly.
- Adjacent aerospace/drone programs must be marked as adjacent, not core space.

## 11. Web Demo

Build a simple web demo for non-technical users.

Inputs:

```text
회사명
지역
사업자 유형
창업일
기술분야
직원 수
매출
연구기관 파트너 보유 여부
컨소시엄 참여 가능 여부
이전 수혜 여부
```

Outputs:

```text
추천 우주분야 지원사업
우주분야 관련성
신청 가능성 점수
추천 이유
위험/주의사항
누락정보
마감일
지원금
참여 방식
원문 링크
```

Landing headline:

```text
우주 스타트업을 위한 정부지원사업 검색 MCP
```

Subheadline:

```text
위성, 발사체, 우주데이터, 항공우주 부품 기업이 신청 가능한 지원사업을 AI 에이전트가 찾아줍니다.
```

## 12. Data Collection Sequence

Recurring ingestion and review work must follow `docs/space-ingestion-runbook.md`.

For routine refreshes:

```bash
npm run refresh:space
```

For classifier, parser, source, or generated-data changes:

```bash
npm run verify:space
```

Do not add generated program records by hand. If a real public notice is missing, improve the crawler, classifier, deadline parser, or attachment metadata extraction and rerun ingestion.

1. Create source review document.
   - `docs/korea-space-data-sources.md`

2. Create a source shortlist.
   - Pick only 3-5 source families for MVP.
   - Mark each source as `approved`, `metadata_only`, `needs_legal_review`, or `backlog`.

3. Manually collect 20 representative notices.
   - KASA notices
   - KARI industry/support notices
   - KASI public notices
   - DAPA/KRIT public defense-space notices
   - MOTIE/KEIT or MOLIT/KAIA aerospace keyword-filtered notices
   - KAIA aerospace notices
   - 기업마당/K-Startup keyword matches

4. Build sample JSON seed file.
   - `scripts/seed-space-programs.ts`

5. Implement keyword classifier.
   - `classifySpaceRelevance(text)`

6. Add manual review labels.
   - `core_space`
   - `adjacent_space`
   - `defense_space`
   - `aerospace`
   - `needs_review`

7. Implement search API.

8. Implement matching logic.

9. Implement MCP tools.

10. Build web demo.

11. Add API key and usage logs.

12. Recruit beta users.

## 13. Quality Evaluation

Create test queries:

```text
위성데이터 AI 스타트업 지원사업
우주항공청 기업 참여 R&D 과제
항우연 패밀리기업 지원 공고
천문연 우주과학 기업 협력 공고
국방 우주 감시정찰 위성 관련 기업지원
방위사업청 우주 방산 R&D 공고
산업부 항공우주 소부장 R&D 과제
국토부 항공안전 UAM 실증 지원사업
사천 우주항공 클러스터 기업지원
발사체 부품 중소기업 지원사업
항공우주 소부장 R&D 과제
위성영상 재난 분석 스타트업 지원
드론/UAM 인접분야 지원사업
```

Metrics:

```text
source_url coverage: 100%
space relevance classification accuracy: 85%+
deadline extraction accuracy: 90%+
duplicate rate: below 5%
expired notice marking accuracy: 90%+
top-10 relevance: 75%+
MCP tool success rate: 95%+
```

Manual review:

At least 30 notices should be manually reviewed for:

```text
core_space vs adjacent_space
space vs aerospace vs defense_space vs astronomy_space_science
company eligibility
deadline
support amount
consortium requirement
security/defense participation restriction
research institute or university lead requirement
MOTIE/MOLIT/KASA/KARI/KASI/DAPA source classification
source URL validity
```

## 14. Beta Launch

Target beta users:

```text
우주 스타트업 5명
항공우주 부품기업 5명
R&D/정부과제 컨설턴트 5명
대학/출연연/천문·우주과학 기술사업화 담당자 3명
우주산업 투자/액셀러레이터 관계자 2명
방산/국방우주 기업 관계자 2명
항공/UAM/드론 기업 관계자 2명
```

Outreach message:

```text
안녕하세요. 우주·항공우주·국방우주 기업이 신청 가능한 정부지원사업과 R&D 과제를 찾아주는 MCP 도구를 만들고 있습니다.

회사 기술분야와 조건을 입력하면 우주항공청, 항우연, 천문연, 방위사업청/국방 R&D, 산업부, 국토부/KAIA, 기업마당/K-Startup 등에서 관련 공고를 찾아 마감일, 지원금, 신청 가능성, 컨소시엄 조건, 필요서류를 정리해주는 도구입니다.

무료 베타로 테스트해보실 의향이 있으실까요?
```

Beta success:

```text
20 beta users
5 repeat users
3 users ask for alerts or saved company profiles
2 users say they would pay for monitoring/reporting
```

## 15. Paid Feature Hypothesis

Do not add payment before repeat usage.

Potential paid features:

```text
우주분야 공고 주간 알림
회사 프로필 저장
마감 임박 알림
공고별 신청 체크리스트
컨소시엄 필요 여부 요약
R&D 과제/기업지원 분류
지원사업 리포트 PDF
컨설턴트용 고객사 다중 관리
```

Pricing hypothesis:

```text
Free
- 월 30회 호출
- 최근 30일 공고
- 회사 프로필 1개

Space Pro: 월 29,000원
- 월 1,000회 호출
- 전체 공고 검색
- 회사 프로필 3개
- 주간 알림

Space Consultant: 월 99,000원
- 월 10,000회 호출
- 고객사 프로필 30개
- 매칭 리포트
- 마감 알림
```

## 16. Compliance And Disclaimers

Required disclaimer:

```text
본 서비스는 우주·항공우주 분야 지원사업 공고 검색, 요약, 신청 가능성 검토를 돕는 도구입니다.
최종 신청 가능 여부와 제출 요건은 반드시 원문 공고 및 담당기관을 통해 확인해야 합니다.
```

Avoid claims:

```text
선정 가능성 보장
신청 가능 확정
우주분야 모든 공고 완전 커버
자동 신청 대행
정부과제 컨설팅 자문
```

Before paid launch:

```text
이용약관
개인정보처리방침
데이터 출처/재사용 고지
환불정책
면책 문구
고객 데이터 삭제 절차
고객지원 연락처
결제/세금계산서 처리
```

## 17. MVP Definition Of Done

MVP is done when:

```text
docs/korea-space-data-sources.md exists.
At least 5 source candidates are documented.
50-150 space/aerospace-related notices are searchable, or limitation is documented.
search_space_programs works through MCP.
get_space_program_detail works through MCP.
match_space_programs_to_company works through MCP.
Web demo works for non-technical users.
Every result includes source URL, deadline, status, space category, and last checked time.
Core vs adjacent space relevance is labeled.
20 beta users can be onboarded.
```
