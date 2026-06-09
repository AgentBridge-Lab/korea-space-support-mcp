# 한국 정부지원사업 MCP - 에이전트 실행지시서

## 0. 목표

`한국 정부지원사업 MCP` MVP를 만든다.

제품 포지셔닝:

> Claude/Cursor/ChatGPT에서 바로 쓰는 한국 정부지원사업 검색 도구

핵심 기능:

- 정부지원사업, 창업지원사업, 중소기업 지원사업, R&D 과제, 바우처 공고를 수집한다.
- 공고를 에이전트가 검색하기 쉬운 구조로 정규화한다.
- 회사 프로필 기준으로 신청 가능성이 높은 공고를 추천한다.
- 자격조건, 마감일, 지원금, 필요서류, 주의사항을 요약한다.
- MCP tool과 HTTP API로 제공한다.
- 비개발자용 웹 데모를 제공한다.

MVP 범위:

```text
공고 100-300개
공식 API 또는 재사용 가능한 공개 데이터 우선
검색 API
MCP 서버
회사 프로필 기반 매칭
API key 및 사용량 로그
간단한 랜딩페이지
무료 베타 배포
```

MVP에서 만들지 말 것:

```text
지원사업 신청 대행 플랫폼
완전한 CRM
마켓플레이스
자동 제출 기능
결제 기능
법률/세무/행정 자문 기능
모든 정부·지자체 사업 완전 커버리지
```

## 1. 에이전트 작업 원칙

- 작게 만들고 빠르게 검증한다.
- 공식 API, 공공데이터, 이용조건이 명확한 데이터부터 사용한다.
- 모든 결과에 원문 출처 URL을 포함한다.
- 공고 원문과 정규화 필드를 분리 저장한다.
- “신청 가능 확정”이라고 말하지 않는다.
- 신청 가능성은 `likely`, `unlikely`, `needs_review`로만 표현한다.
- 최종 신청 가능 여부는 원문 공고와 담당기관 확인이 필요하다고 명시한다.
- 크롤링은 약관, robots.txt, 호출량을 확인한 뒤 최소한으로 한다.
- 개인정보를 불필요하게 저장하지 않는다.
- 처음에는 벡터DB보다 구조화 필터와 키워드 검색을 우선한다.
- LLM 요약은 검색/필터가 안정화된 뒤 붙인다.

## 2. 권장 기술스택

기존 코드베이스가 없다면 아래를 사용한다.

```text
Frontend/Landing: Next.js
Backend API: TypeScript + Fastify 또는 Hono
MCP Server: TypeScript MCP SDK
Database: Supabase Postgres 또는 로컬 Postgres
Search: Postgres full-text search
Hosting: Railway 또는 Render
Auth: API key 우선, Supabase Auth는 이후
Payment: Toss Payments 또는 Stripe, 베타 검증 이후
Monitoring: Sentry
DNS: Cloudflare
```

권장 프로젝트 구조:

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
      search.ts
      scoring.ts
      normalization.ts
migrations/
scripts/
docs/
```

## 3. 마일스톤 1 - 프로젝트 초기화

목표:

실행 가능한 기본 프로젝트 구조를 만든다.

작업:

1. TypeScript 프로젝트를 초기화한다.
2. `apps/api`를 만든다.
3. `apps/mcp`를 만든다.
4. `apps/web`을 만든다.
5. `packages/shared`를 만든다.
6. `migrations` 폴더를 만든다.
7. `.env.example`을 만든다.
8. 루트 `README.md`에 실행 방법을 적는다.

완료조건:

- `npm install` 또는 선택한 패키지 매니저 설치가 성공한다.
- API 서버가 로컬에서 실행된다.
- MCP 서버가 로컬에서 실행된다.
- 웹 페이지가 로컬에서 실행된다.
- README에 로컬 실행 방법이 적혀 있다.

## 4. 마일스톤 2 - 데이터 소스 검토

목표:

합법적이고 안정적으로 수집 가능한 초기 데이터 소스를 고른다.

생성할 문서:

```text
docs/korea-data-sources.md
```

각 데이터 소스별로 기록할 항목:

```text
소스명
공식 URL
공식 API 여부
공공데이터포털 등록 여부
이용조건/라이선스
상업적 이용 가능 여부
출처표시 필요 여부
제공 필드
첨부파일/PDF 제공 여부
업데이트 주기
호출 제한
커버리지
알려진 누락/한계
MVP 사용 여부
```

초기 후보:

```text
K-Startup 창업지원포털
기업마당
공공데이터포털(data.go.kr) 지원사업 관련 API
중소벤처기업부/창업진흥원 공고
서울경제진흥원
경기도경제과학진흥원
NIPA
IITP
TIPA
KIAT
각 지자체·테크노파크 지원사업 공고
```

우선순위:

```text
1순위: 공식 API가 있고 이용조건이 명확한 데이터
2순위: 공공누리 등 상업적 이용 조건이 명확한 공고
3순위: 원문 링크와 메타데이터만 저장하는 공고
4순위: 약관 검토가 필요한 크롤링 대상
```

완료조건:

- 후보 데이터 소스 5개 이상이 문서화되어 있다.
- MVP에 사용할 데이터 소스 1-3개가 선정되어 있다.
- 약관/라이선스 불확실성이 명시되어 있다.
- “처음부터 쓰지 말아야 할 소스”도 명시되어 있다.

## 5. 마일스톤 3 - DB 스키마

목표:

지원사업 공고, 공고 변경 이력, 첨부파일, 회사 프로필, API key, 사용량 로그를 저장하는 스키마를 만든다.

마이그레이션:

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

```sql
create table program_versions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references programs(id),
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
create table program_documents (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references programs(id),
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

권장 인덱스:

```text
programs(source, external_id)
programs(application_end_date)
programs(status)
programs(region)
programs using full-text index over title, agency, summary, eligibility_text, raw_text
```

완료조건:

- 마이그레이션이 로컬에서 실행된다.
- 샘플 공고 5개 이상을 넣을 수 있다.
- 검색 인덱스가 생성되어 있다.

## 6. 마일스톤 4 - 데이터 수집

목표:

초기 공고 100-300개를 수집한다.

작업:

1. 승인된 데이터 소스별 수집 스크립트를 만든다.
2. 공고 원문을 `raw_text` 또는 `raw_json`에 저장한다.
3. 정규화 필드를 `programs`에 저장한다.
4. `source_url`을 반드시 저장한다.
5. `source + external_id` 또는 canonical URL로 중복 제거한다.
6. `content_hash`를 계산한다.
7. 공고가 변경되면 `program_versions`에 기록한다.
8. 마감/종료/취소/정정 상태를 추적한다.

생성할 스크립트:

```text
scripts/ingest-kstartup.ts
scripts/ingest-bizinfo.ts
scripts/normalize-program.ts
scripts/seed-sample-programs.ts
```

정규화 규칙:

- 날짜는 ISO 형식으로 변환한다.
- 마감일이 명확하지 않으면 추측하지 말고 null로 둔다.
- 지원금은 원문 문자열과 숫자 필드를 모두 저장한다.
- 대상 지역, 업종, 창업연차, 기업규모는 가능한 경우만 구조화한다.
- 불확실한 조건은 `eligibility_text`와 `restrictions`에 보존한다.
- 첨부파일은 처음에는 URL만 저장하고, 본문 추출은 후순위로 둔다.

완료조건:

- 공고 100개 이상이 DB에 저장되어 있다.
- 모든 공고에 `title`, `source`, `source_url`, `last_checked_at`이 있다.
- 검토 샘플 기준 중복률이 5% 미만이다.
- 마감일 추출 가능 여부가 문서화되어 있다.

## 7. 마일스톤 5 - 검색 API

목표:

지원사업 검색과 상세 조회 API를 만든다.

엔드포인트:

```text
GET /health
POST /programs/search
GET /programs/:id
POST /programs/match
POST /programs/:id/check-eligibility
POST /programs/:id/summarize
```

`POST /programs/search` 입력 예시:

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

응답 예시:

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

완료조건:

- 키워드 검색이 동작한다.
- 지역 필터가 동작한다.
- 마감일 필터가 동작한다.
- 업종/창업연차 필터가 가능한 범위에서 동작한다.
- 모든 결과에 원문 URL과 마지막 확인 시각이 포함된다.
- 잘못된 입력은 400으로 응답한다.

## 8. 마일스톤 6 - 회사 프로필 매칭/신청 가능성 점수

목표:

회사 조건과 공고 조건을 비교해 신청 가능성 점수와 이유를 제공한다.

함수:

```text
scoreProgramFit(program, companyProfile) -> {
  score: number;
  eligibility_status: "likely" | "unlikely" | "needs_review";
  reasons: string[];
  risks: string[];
  missing_information: string[];
}
```

점수 요소:

```text
지역 일치
업종/키워드 일치
창업연차 일치
개인사업자/법인사업자/예비창업자 조건
매출 조건
고용인원 조건
이전 수혜 제한
필수 인증/서류
마감일
지원금 규모
제외 키워드
```

규칙:

- 신청 가능성을 확정하지 않는다.
- 정보가 부족하면 `needs_review`를 반환한다.
- 중복수혜 제한이 있으면 risk에 넣는다.
- 이전 수혜 여부가 없으면 missing_information에 넣는다.
- 원문 근거 필드를 함께 반환한다.

완료조건:

- 매칭 함수에 대한 단위 테스트 10개 이상이 있다.
- 결과에 점수, 상태, 이유, 위험, 누락정보가 포함된다.
- 잘못된 “신청 가능 확정” 표현이 없다.

## 9. 마일스톤 7 - MCP 서버

목표:

검색/매칭 API를 MCP tool로 노출한다.

초기 MCP tools:

```text
search_programs
get_program_detail
match_programs_to_company
check_eligibility
summarize_program
```

후순위 tools:

```text
watch_programs
run_saved_search
extract_required_documents
draft_application_outline
generate_deadline_calendar
```

Tool 요구사항:

- API key를 요구한다.
- 입력을 검증한다.
- 사용량을 기록한다.
- 모든 공고 결과에 출처 URL을 포함한다.
- 공고 상태와 마지막 확인 시각을 포함한다.
- 마감/종료/변경/불확실 상태를 경고한다.

`search_programs` 입력 예시:

```json
{
  "query": "AI SaaS 창업지원",
  "region": "서울",
  "industry": "AI",
  "deadline_within_days": 30,
  "limit": 10
}
```

`check_eligibility` 입력 예시:

```json
{
  "program_id": "uuid",
  "company_profile": {
    "region": "서울",
    "founded_at": "2026-02-01",
    "business_type": "개인사업자",
    "industry": "AI SaaS",
    "employee_count": 1,
    "revenue": 0,
    "previous_grants": []
  }
}
```

완료조건:

- MCP 서버가 로컬에서 실행된다.
- Claude Desktop 또는 Cursor에서 `search_programs`를 호출할 수 있다.
- `match_programs_to_company`가 설명 가능한 결과를 반환한다.
- 모든 결과에 원문 URL이 포함된다.

## 10. 마일스톤 8 - Local MCP Wrapper

목표:

Claude Desktop/Cursor 사용자가 쉽게 연결하도록 로컬 wrapper를 만든다.

패키지명 예시:

```text
@k-support/mcp
```

설정 예시:

```json
{
  "mcpServers": {
    "korea-support": {
      "command": "npx",
      "args": ["-y", "@k-support/mcp"],
      "env": {
        "KOREA_SUPPORT_API_KEY": "your_api_key"
      }
    }
  }
}
```

완료조건:

- 사용자가 설정 블록을 복사해 붙여넣으면 연결된다.
- API key가 없으면 명확한 에러가 나온다.
- 잘못된 API key면 명확한 에러가 나온다.

## 11. 마일스톤 9 - 웹 데모

목표:

MCP를 모르는 컨설턴트/대표도 제품 가치를 확인할 수 있게 한다.

입력:

```text
회사명
사업자 유형
지역
창업일
업종
직원 수
매출
키워드
이전 수혜 여부
```

출력:

```text
추천 지원사업
신청 가능성 점수
추천 이유
위험/주의사항
누락 정보
마감일
지원금
필요서류
원문 링크
마지막 확인 시각
```

완료조건:

- 비개발자가 브라우저에서 회사 조건을 입력해 결과를 볼 수 있다.
- 결과에 원문 링크가 있다.
- 신청 가능성 확정이 아니라 검토 보조임을 명시한다.

## 12. 마일스톤 10 - API Key와 사용량 로그

목표:

무료 베타와 향후 결제를 위한 접근 제어를 만든다.

작업:

1. API key 생성 스크립트를 만든다.
2. API key는 hash만 저장한다.
3. API와 MCP 호출에 API key를 요구한다.
4. tool call을 `usage_logs`에 기록한다.
5. 월별 호출 제한을 적용한다.
6. key 생성/폐기 관리자 스크립트를 만든다.

베타 플랜:

```text
free: 월 30회 호출
pro_beta: 월 1000회 호출
consultant_beta: 월 10000회 호출
```

완료조건:

- API key 없는 요청은 거절된다.
- 폐기된 key는 거절된다.
- 월 호출 제한이 적용된다.
- 사용량 로그에 tool 이름, 결과 수, latency가 기록된다.

## 13. 마일스톤 11 - 랜딩페이지

목표:

무료 베타 사용자를 모집한다.

랜딩 구성:

```text
1. Hero: Claude/Cursor에서 바로 쓰는 한국 정부지원사업 검색 도구
2. 사용 예시
3. 대상 고객
4. 웹 데모
5. MCP/API 연결 방법
6. 데이터 출처 정책
7. 커버리지 한계
8. 무료 베타 신청
9. 가격 예정
10. 면책 문구
```

핵심 문구:

```text
회사 조건을 입력하면 신청 가능한 정부지원사업을 찾고, 마감일·필요서류·주의사항을 정리합니다.
```

피해야 할 문구:

```text
지원사업 선정 보장
신청 가능 확정
모든 정부지원사업 완전 커버
자동 신청 대행
```

면책 문구:

```text
본 서비스는 공고 검색, 요약, 신청 가능성 검토를 돕는 도구입니다.
최종 신청 가능 여부와 제출 요건은 반드시 원문 공고 및 담당기관을 통해 확인해야 합니다.
```

완료조건:

- 베타 신청 폼이 동작한다.
- 데이터 커버리지 한계가 명확히 보인다.
- 면책 문구가 보인다.
- Claude/Cursor 연결 문서로 이동할 수 있다.

## 14. 마일스톤 12 - 문서화

생성할 문서:

```text
docs/claude-desktop-setup.md
docs/cursor-setup.md
docs/api-reference.md
docs/example-prompts.md
docs/korea-data-sources.md
docs/coverage-policy.md
docs/disclaimer.md
```

예시 프롬프트:

```text
서울 소재 1인 AI SaaS 스타트업이 이번 달 신청 가능한 지원사업을 찾아줘.

부산 제조업 5년차 중소기업이 신청 가능한 디지털 전환 지원사업을 찾아줘.

이 공고에 개인사업자가 신청 가능한지 확인하고, 필요한 서류를 정리해줘.

내 회사 프로필 기준으로 신청 우선순위가 높은 사업 5개를 추천해줘.

경기도 소재 예비창업자가 신청 가능한 창업지원사업을 마감일순으로 정리해줘.
```

완료조건:

- 베타 사용자가 문서만 보고 Claude/Cursor에 연결할 수 있다.
- API 사용 예시가 있다.
- 데이터 출처와 커버리지 한계가 설명되어 있다.

## 15. 마일스톤 13 - 품질평가

목표:

검색/매칭 결과가 실제로 쓸 만한지 측정한다.

테스트셋:

```text
AI/SaaS 창업지원 질의 10개
제조업 디지털전환 질의 10개
예비창업자 질의 10개
소상공인/중소기업 질의 10개
R&D 과제 질의 10개
```

측정 지표:

```text
원문 URL 포함률
마감일 추출 정확도
중복 공고 비율
종료/마감 공고 처리 정확도
상위 10개 검색 관련도
신청 가능성 점수 유용성
false positive
false negative
```

최소 기준:

```text
원문 URL 포함률: 100%
마감일 추출 정확도: 검토 샘플 기준 90% 이상
중복률: 5% 미만
상위 10개 검색 관련도: 타깃 질의 기준 70% 이상
MCP tool 성공률: 95% 이상
```

완료조건:

- 품질평가 결과가 문서화되어 있다.
- 실패 사례가 정리되어 있다.
- 베타 사용자 3명 이상이 매칭 이유가 유용하다고 응답한다.

## 16. 마일스톤 14 - 무료 베타 배포

목표:

무료 베타 사용자 20명을 모집한다.

타깃:

```text
정부지원사업 컨설턴트
창업 컨설턴트
스타트업 대표
중소기업 경영지원 담당자
세무사/노무사/행정사 사무소
액셀러레이터/창업보육센터
AI 자동화 에이전시
```

채널:

```text
LinkedIn
창업 커뮤니티
스타트업 단톡방
정부지원사업 컨설턴트 네트워크
네이버 카페
페이스북 스타트업 그룹
X/Twitter
AI 자동화 커뮤니티
```

아웃리치 메시지:

```text
안녕하세요. Claude/Cursor/ChatGPT에서 바로 쓸 수 있는 한국 정부지원사업 검색 MCP를 만들고 있습니다.

회사 조건을 입력하면 신청 가능한 공고, 마감일, 지원금, 필요서류, 신청 가능성 점수를 자동으로 정리해주는 도구입니다.

정부지원사업을 자주 찾는 대표님/컨설턴트분들을 대상으로 무료 베타를 운영하려고 하는데, 테스트해보실 의향이 있으실까요?
```

성공 기준:

```text
베타 사용자 20명
반복 사용자 5명
회사 프로필 저장/재사용 사용자 3명
유료 플랜 또는 알림 기능 문의 1-3명
```

완료조건:

- 사용자 10명 이상에게 피드백을 받았다.
- 반복 사용 여부가 측정되었다.
- 결제 기능을 붙일지 판단할 근거가 생겼다.

## 17. 마일스톤 15 - 유료화 준비

유료화 전에 필요한 것:

```text
이용약관
개인정보처리방침
데이터 출처/재사용 고지
환불정책
면책 문구
고객 데이터 삭제 절차
고객지원 연락처
전자상거래/통신판매업 검토
토스페이먼츠 또는 Stripe 결제 검토
세금계산서/현금영수증 처리 방식
```

결제를 붙이기 전 조건:

- 5명 이상이 2회 이상 반복 사용한다.
- 1명 이상이 유료 기능을 문의한다.
- 데이터 품질 문제와 커버리지 한계가 파악되어 있다.

초기 가격 가설:

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

## 18. MVP 완료 정의

MVP는 아래 조건을 만족하면 완료로 본다.

- 데이터 소스 검토 문서가 있다.
- 공식 또는 재사용 가능한 소스 1개 이상이 수집된다.
- 공고 100-300개가 검색 가능하다.
- `search_programs`, `get_program_detail`, `match_programs_to_company`, `check_eligibility`가 MCP에서 동작한다.
- Claude Desktop 또는 Cursor에서 MCP 서버를 사용할 수 있다.
- 비개발자용 웹 데모가 동작한다.
- 모든 결과에 원문 URL, 마감일, 상태, 마지막 확인 시각이 포함된다.
- API key와 사용량 로그가 동작한다.
- 랜딩페이지와 연결 문서가 공개되어 있다.
- 무료 베타 사용자 20명을 온보딩할 수 있다.

