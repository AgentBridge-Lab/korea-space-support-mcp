# Korea Space Support MCP 작업 과정 보고서

작성일: 2026-06-07

## 1. 작업 목적

`Korea Space Support MCP`는 한국 우주·항공우주 분야의 정부지원사업, 연구과제, 기업지원 공고를 API/MCP 도구로 검색할 수 있게 만드는 MVP이다.

이번 작업의 핵심 목표는 다음과 같았다.

- 수동 curated real record가 아닌 자동 발견/수집 기반 데이터 파이프라인으로 전환
- KASA, KARI, KASI, DAPA, KAIA, 기업마당 등 공개 공고에서 우주·항공우주 관련 지원사업만 선별
- 기업뿐 아니라 대학 연구실, 출연연, 연구기관, 연구책임자, 소규모 연구팀이 활용 가능한 연구과제 공고 포함
- HWPX/HWP/PDF 첨부파일에서 마감일을 파싱해 마감일 없는 generated record 방지
- 포털 안내, 조달/입찰, BTL/민간투자, 전시 참가, 행사성 공고를 지원사업/연구과제 데이터에서 제외
- API/MCP/shared runtime에서 generated dataset을 안정적으로 사용하도록 검증 체계 보강

## 2. 주요 대상 파일

작업 대상은 다음 파일과 데이터였다.

- `scripts/ingest-space-programs.mjs`
  - 기관별 공고 discovery, 상세 페이지 fetch, 첨부파일 파싱, 공고 정규화, generated/excluded 데이터 생성
- `scripts/evaluate-space-mvp.mjs`
  - 수집 결과 검증 및 회귀 방지 검사
- `scripts/run-space-refresh.mjs`
  - 수집, 검증, 리포트 생성, diff/history 기록 실행
- `scripts/report-space-refresh.mjs`
  - 수집 결과 요약 리포트 출력
- `packages/shared/src/space-data.ts`
  - generated JSON을 runtime `SpaceProgram`으로 로드
- `packages/shared/src/space-search.ts`
  - 우주 지원사업 검색 로직
- `packages/shared/src/space-search.test.ts`
  - shared 검색/데이터 로드 테스트
- `packages/shared/src/space-sample-data.ts`
  - generated 데이터 부재 시 사용할 sample-only fallback 데이터
- `data/space-programs.generated.json`
  - 자동수집된 deadline-bearing 공고
- `data/space-programs.excluded.json`
  - 관련 후보였지만 마감일 등 필수 조건 미충족으로 제외한 공고
- `data/space-ingest-report.json`
  - 수집 통계
- `korea-space-support-mcp-agent-instructions.md`
  - 반복 작업용 실행지시서

## 3. 외부 리뷰 및 검토 과정

### 3.1 Claude CLI 리뷰

사용자 지시에 따라 Claude CLI로 독립 리뷰를 요청했다.

실행 조건:

- 모델: `claude-opus-4-8`
- effort: `xhigh`
- 방식: 파일 내용을 청크로 전달하지 않고, 리뷰 대상 파일 경로를 지정
- 결과 저장: `/tmp/claude-space-review.md`

Claude CLI 리뷰에서 확인된 주요 지적은 다음과 같았다.

- `scripts/ingest-space-programs.mjs`에 `curatedSources`가 남아 있어 수동 작성 real record가 generated 데이터에 병합됨
- KAIA curated record의 `applicationEndDate`가 공고일보다 빠른 잘못된 값으로 하드코딩됨
- DAPA 입찰공고, KASI BTL/민간투자 공고가 우주 키워드 때문에 classifier를 통과할 수 있음
- KARI/KASI 일부 실제 연구과제 공고가 마감일 파싱 실패로 excluded 처리됨
- KARI 위탁연구과제가 중소기업 대상 공고처럼 정규화됨
- Bizinfo 국제우주대회 전시관 참가기업 모집 공고가 지원사업/연구과제 공고처럼 포함됨
- KASI 상세 본문 추출이 site navigation chrome을 포함함
- 평가 스크립트가 `applicationEndDate >= announcementDate`, deadline 기반 status 일관성, future deadline active 여부를 검증하지 않음

위 리뷰 결과를 기준으로 1차 수정 작업을 진행했다.

### 3.2 독립 리뷰 서브에이전트

1차 수정과 검증 완료 후, 사용자 요청에 따라 독립 리뷰 서브에이전트를 실행했다.

서브에이전트 리뷰 범위:

- `scripts/ingest-space-programs.mjs`
- `scripts/evaluate-space-mvp.mjs`
- `packages/shared/src/space-search.test.ts`
- `packages/shared/src/space-sample-data.ts`
- `data/space-programs.generated.json`
- `data/space-programs.excluded.json`
- `data/space-ingest-report.json`
- `korea-space-support-mcp-agent-instructions.md`

서브에이전트가 지적한 주요 사항:

- KARI `space-kari-discovered-18406`은 연구자 대상 증거가 있지만 `universityOrResearchPartnerRequired`가 `false`로 남아 있었음
- `계약`, `용역`, `시스템` 같은 너무 넓은 exclusion regex가 실제 R&D/연구과제 공고를 false negative로 제외할 수 있음
- 상세 페이지 파싱 실패 시 list-level `defaultDeadline`만으로 metadata-only generated record가 생길 수 있음
- 주요 정책 회귀를 테스트/검증 스크립트가 충분히 잠그지 못함

이 지적은 모두 타당하다고 판단해 2차 수정에 반영했다.

## 4. 구현 및 수정 내역

### 4.1 수동 curated real record 제거

기존 `scripts/ingest-space-programs.mjs`에는 `curatedSources` 배열이 있었고, 이 배열이 discovered sources와 함께 병합되고 있었다.

문제점:

- 자동 수집이 아닌 수동 작성 레코드가 real generated dataset에 포함됨
- KAIA hardcoded deadline 오류처럼 사람이 입력한 값이 검증 없이 데이터로 들어감
- 반복 수집 작업의 신뢰성을 떨어뜨림

수정:

- `curatedSources` 배열 제거
- source 병합 로직을 `dedupeSources(discoveredSources)`로 변경
- 기존 curated ID가 generated 데이터에 남지 않도록 재수집
- sample fallback에 남아 있던 실제 KARI ID도 sample-only ID로 변경

삭제/제거 확인 대상:

- `space-kari-actual-2024-family`
- `space-kaia-2024-kuam-safety`

최종 확인 결과 위 ID들은 `scripts`, `data`, `packages`, `apps` 경로에서 검색되지 않는다.

### 4.2 기관별 자동 discovery 유지

현재 자동 discovery 대상은 다음 source family이다.

- `KARI`
- `KASI`
- `KASA`
- `DAPA`
- `MOLIT_KAIA`
- `BIZINFO`

최종 generated 데이터에는 DAPA가 포함되지 않았는데, 이는 현재 discovery된 DAPA 후보가 입찰/조달성 공고로 판정되어 제외되었기 때문이다.

### 4.3 조달/포털/행사성 공고 제외 강화

Claude CLI 리뷰에서 DAPA 입찰공고와 KASI BTL 민간투자 공고가 우주 키워드 때문에 classifier를 통과할 수 있다는 문제가 확인됐다.

1차 수정:

- `procurementNoticePattern` 추가
- `nonProgramNoticePattern` 추가
- KASA, KARI, KASI, DAPA, Bizinfo classifier에 exclusion 적용
- Bizinfo 전시관/전시회/박람회 참가 공고 제외

2차 수정:

- `계약`, `용역`, `시스템`을 너무 넓게 제외하던 패턴을 좁힘
- `안테나시스템` 같은 실제 R&D 과제 제목이 `시스템` 키워드 때문에 제외되는 문제 방지
- 조달/포털 맥락이 명확한 표현만 제외하도록 조정

최종적으로 다음 성격의 공고는 generated 데이터에서 제외된다.

- 입찰공고
- 낙찰/계약 결과
- BTL
- 민간투자사업
- 제3자 제안공고
- 전시관/전시회/박람회 참가기업 모집
- 포털/매뉴얼/사용자 교육/시스템 점검/운영 안내

단, `위탁연구과제`, `신규과제`, `공모`, `재공모`처럼 명확한 연구과제 공고는 제목에 `안내`가 있어도 제외하지 않는다.

### 4.4 KASI 상세 본문 추출 개선

기존 KASI 상세 페이지는 전용 selector가 없어 전체 HTML을 strip하면서 site navigation chrome이 summary/rawText에 섞일 수 있었다.

수정:

- `extractDetailTitle`에 KASI `board_header_tit strong` title 추출 추가
- `extractMainText`에 KASI `view_basic` 영역 추출 추가
- KASI generated record의 `summary`, `rawText`가 실제 본문인 `□ 추진 배경`, `지원 개요` 등으로 시작하도록 개선

확인된 KASI generated record:

- `space-kasi-discovered-32235`
- 제목: `우주과학탐사 전문가 국제회의 참석 지원 프로그램 공고`
- 마감일: `2026-03-11`
- 본문: 우주과학탐사 전문가 국제회의 참석 지원 프로그램의 추진 배경과 지원 개요 포함

### 4.5 KARI 연구과제/위탁연구 공고 포함

사용자가 기업뿐 아니라 대학 연구실, 연구팀, 소규모 연구자 단위도 사용할 수 있어야 한다고 요청했다.

이에 따라 KARI 위탁연구과제, 신규과제, 재공모 등은 기업지원 공고가 아니라 연구자/연구기관 대상 R&D 공고로 정규화했다.

수정:

- `researchApplicantPattern` 추가
- KARI discovery에서 위탁연구/연구개발/공모성 제목을 연구자 대상 후보로 표시
- `normalizeProgram`에서 제목, 본문, 첨부 텍스트를 함께 보고 연구자/연구기관 대상 여부 재판정
- `targetCompanyType`에 대학, 출연연, 연구기관, 연구팀, 기업 연구조직 등 반영
- `eligibilityText`를 기업 전용 문구가 아닌 연구자/연구기관 친화적 문구로 변경
- `universityOrResearchPartnerRequired`가 본문 증거를 기준으로 true가 되도록 수정

복구/포함된 주요 KARI 공고:

- `2026년도 차세대발사체개발사업 1단계 신규 위탁연구과제 공모`
- `2026년도 대전규제자유특구 연구개발사업 신규 위탁연구과제 재공모`
- `2026년도 달 착륙선 개발 사업 위탁연구과제 공모`
- `2026년도 기본사업 신규 위탁연구과제 1차 공모 안내`
- `2026년도 스페이스파이오니어사업 신규과제 재공모`
- `2026년도 스페이스파이오니어사업 신규과제 재공모(마이크로파 라디오미터 준광학 안테나시스템 및 저잡음 수신기)`

최종 보고서 기준 연구자/연구실/연구팀 관련 record 수는 `17`건이다.

### 4.6 HWPX/HWP/PDF 첨부파일 마감일 파싱

사용자가 마감일 누락과 HWPX 파싱 여부를 지적했다.

수정:

- PDF: `pdftotext` 사용
- HWPX: zip 내부 XML 및 `PrvText.txt` 파싱
- legacy HWP: `olefile`과 zlib 기반 BodyText 추출
- page HTML에서 마감일이 없으면 첨부파일 텍스트에서 마감일 탐색
- KARI 첨부 URL에서 preview URL보다 실제 `/attach/...` 다운로드 URL을 우선

추가한 마감일 패턴:

- 일반 날짜 범위
- `접수기간`, `신청기간`, `공모기간`, `제출기간`
- `재공모 일정`, `공모 일정`
- `'25년.12.29.(월) ~ '26.1.9.(금)` 같은 두 자리 연도 범위

이 수정으로 `space-kari-discovered-18406`의 마감일이 `2026-01-09`로 파싱되어 excluded에서 generated로 복구됐다.

### 4.7 generated/excluded 정책 정리

정책:

- generated record는 반드시 `applicationEndDate`가 있어야 한다.
- 마감일을 읽을 수 없는 후보는 `data/space-programs.excluded.json`으로 이동한다.
- 상세 페이지 파싱 실패 시 `defaultDeadline`만으로 generated record를 만들지 않는다.
- 수집 오류 fallback record는 generated에 남지 않도록 검증한다.

최종 excluded record:

- ID: `space-bizinfo-discovered-PBLN_000000000121786`
- 제목: `[경기] 2026년 드론산업 육성 지원사업 모집 공고(지역 수요기반 드론 활용 사업모델 발굴 및 실증 지원)`
- sourceFamily: `BIZINFO`
- reason: `no_readable_application_deadline`

### 4.8 검증 스크립트 보강

`scripts/evaluate-space-mvp.mjs`에 다음 검증을 추가했다.

- generated dataset이 비어 있지 않은지 확인
- 모든 generated record에 `sourceUrl`이 있는지 확인
- ID 중복 확인
- `spaceCategory`가 known category인지 확인
- relevance score 범위 확인
- 과거 마감일이면 status가 `closed`인지 확인
- deadline 기준 expected status와 저장된 status가 일치하는지 확인
- `applicationEndDate < announcementDate`인 record 실패 처리
- deadline 없는 generated record 실패 처리
- sample-only ID가 runtime dataset에 포함되면 실패 처리
- forbidden curated real ID가 generated에 포함되면 실패 처리
- 입찰/BTL/민간투자/전시 참가성 generated record 실패 처리
- ingestion error fallback generated record 실패 처리
- KARI/KASI 연구자 대상 증거가 있는데 `universityOrResearchPartnerRequired`가 true가 아니면 실패 처리
- ingest report count와 실제 generated/excluded count 일치 확인

### 4.9 테스트 수정

기존 shared test는 curated KARI real ID인 `space-kari-actual-2024-family`를 기대했다.

수정:

- 검색 테스트를 자동수집 KARI 위탁연구과제 ID 기준으로 변경
- sample-only fallback ID가 runtime generated dataset에 포함되지 않는지 확인 강화
- sample fallback의 실제 KARI ID를 `space-kari-sample-family`로 변경

## 5. 실행지시서 정비

반복 작업 재현성을 위해 `korea-space-support-mcp-agent-instructions.md`를 정비했다.

추가된 주요 지침:

- 대학 연구실, 출연연, 연구책임자, 소규모 연구팀을 primary user에 포함
- KARI 위탁연구과제와 우주과학/탐사 연구자 지원 프로그램 검색 질문 추가
- hand-authored/curated real notice record 생성 및 병합 금지
- 안내/포털/매뉴얼/시스템 공지는 실제 과제공고 또는 지원사업 공고가 아니면 제외
- 연구과제 공고는 제목에 `안내`가 있어도 제외하지 않음
- 조달/입찰/BTL/PPP/전시 참가/행사/채용/선정결과성 공고 제외
- generated record는 readable application deadline 필수
- HWPX/HWP/PDF 첨부 파싱 필수
- `application_end_date >= announcement_date`와 status 일관성 검증 필수
- 연구과제/위탁연구/전문가 지원 공고를 기업 전용으로 오분류하지 않도록 eligibility guidance 추가

## 6. 최종 수집 결과

최종 `data/space-ingest-report.json` 기준:

```json
{
  "generatedCount": 33,
  "discoveredSourceCount": 34,
  "excludedCount": 1,
  "sourceFamilies": [
    "BIZINFO",
    "KARI",
    "KASA",
    "KASI",
    "MOLIT_KAIA"
  ],
  "activeCount": 8,
  "closedCount": 25,
  "lastCheckedAt": "2026-06-07T06:45:41.110Z"
}
```

source family별 generated count:

```text
BIZINFO: 16
KARI: 10
KASA: 5
KASI: 1
MOLIT_KAIA: 1
```

상태별 count:

```text
active: 8
closed: 25
excluded: 1
```

## 7. 최종 검증 결과

최종 실행한 명령:

```bash
npm run verify:space
```

검증 구성:

```text
npm run check:space
npm test
npm run typecheck
npm run build
```

검증 결과:

- `check:space`: 통과
- shared test: 7개 통과
- typecheck: shared/api/mcp/web 모두 통과
- build: shared/api/mcp/web 모두 통과
- Next.js web build 통과

최종 `check:space` 요약:

```json
{
  "generated_count": 33,
  "source_family_count": 5,
  "source_families": [
    "BIZINFO",
    "KARI",
    "KASA",
    "KASI",
    "MOLIT_KAIA"
  ],
  "source_url_coverage": 100,
  "runtime_count": 33,
  "excluded_count": 1,
  "duplicate_id_count": 0,
  "warnings": [],
  "failures": []
}
```

## 8. 해결된 주요 이슈

### 8.1 curated real record 제거

해결 전:

- 수동 작성 KARI/KAIA record가 generated dataset에 포함됨
- KAIA record에 잘못된 deadline 존재

해결 후:

- 수동 curated source 제거
- generated record는 자동 discovery/parsing 기반만 허용
- forbidden curated ID 검증 추가

### 8.2 조달/BTL/전시성 공고 제거

해결 전:

- DAPA 입찰공고가 `C4I` 키워드 때문에 defense space로 분류될 수 있음
- KASI BTL 민간투자 공고가 우주상황인식 키워드 때문에 분류될 수 있음
- Bizinfo IAC 전시관 참가기업 모집이 우주산업 지원처럼 포함될 수 있음

해결 후:

- 조달/PPP/전시 참가성 공고 exclusion 강화
- generated dataset에서 해당 패턴 검색 시 결과 없음
- 평가 스크립트에서 정책 회귀 직접 검증

### 8.3 KARI 연구과제 마감일 복구

해결 전:

- 일부 KARI 연구과제 공고가 마감일 미검출로 excluded 처리됨
- HWPX/HWP/PDF 첨부 파싱과 두 자리 연도 범위 파싱이 부족함

해결 후:

- `재공모 일정`과 두 자리 연도 범위 파싱 추가
- 실제 download attachment 우선 처리
- `space-kari-discovered-18406` generated 복구
- `안테나시스템` 포함 스페이스파이오니어 과제도 regex 과확장 해소 후 복구

### 8.4 연구자/연구기관 대상 정규화

해결 전:

- KARI 위탁연구과제가 중소기업 대상 공고처럼 보일 수 있음
- 일부 연구자 대상 공고의 `universityOrResearchPartnerRequired`가 false로 남음

해결 후:

- 연구자/연구기관 대상 증거를 title, body, attachment에서 통합 판단
- KARI/KASI 연구자 대상 공고는 대학 연구실, 출연연, 연구팀, 기업 연구조직 참여 가능성으로 정규화
- KARI 18406 flag 정상화
- 평가 스크립트에서 연구자 대상 증거와 flag 불일치 검증

## 9. 남은 제한사항 및 후속 과제

현재 남은 제한사항:

- Bizinfo 일부 공고는 list에는 기간이 없어 상세/첨부에서 deadline을 못 읽으면 excluded 처리된다.
- DAPA는 현재 조달성 후보만 발견되어 generated에는 포함되지 않았다. 향후 실제 국방우주 R&D 지원 공고가 discovery되면 classifier가 처리할 수 있어야 한다.
- 공공누리/저작권 조건은 metadata 중심으로 보수적으로 처리하고 있으나, paid product 적용 전 source별 legal review가 필요하다.
- 현재 수집량은 MVP 초기 검증 수준이며, 50-150개 목표에는 추가 source family 확장 또는 historical pagination 확장이 필요하다.

후속 과제:

- IITP/NIPA와 추가 지역 TP source 확장

## 10. 결론

이번 작업으로 `Korea Space Support MCP`의 우주·항공우주 지원사업 수집 파이프라인은 수동 curated record 중심에서 자동 discovery/parsing 기반으로 전환되었다.

또한 기업지원 공고뿐 아니라 대학 연구실, 출연연, 연구기관, 소규모 연구팀 대상 연구과제 공고를 포함하도록 정규화 기준을 보완했다. HWPX/HWP/PDF 첨부파일 파싱, 조달/포털성 공고 제외, 마감일/status 일관성 검증, 정책 회귀 방지 검증을 추가해 반복 수집 작업의 안정성을 높였다.

초기 전환 기준 `33`개의 deadline-bearing generated record가 생성되었고, 이후 KRIT, K-Startup, KEIT, ADD, GNTP 확장을 거쳐 현재 generated dataset은 `38`개까지 확장되었다. `npm run verify:space`가 통과했다.

## 11. 추가 진행: KRIT 공개 공지 discovery 확장

보고서 작성 이후 다음 단계로 KRIT(국방기술진흥연구소) 공개 공지 discovery를 추가했다.

추가 목적:

- MVP source boundary의 `DAPA/KRIT public notices` 범위를 실제 ingestion 코드에 반영
- 방산/국방 R&D 중 우주, 위성, 항공우주, 항공, 드론, 무인기 등과 명시적으로 연결된 공개 지원사업 후보를 자동 발견
- 일반 방산, 조달, 설명회, 행사, 포털성 공고가 generated dataset으로 들어오는 것을 방지

수정 내용:

- `scripts/ingest-space-programs.mjs`에 `kritNoticeListUrl` 추가
- KRIT 공지 목록의 `fnView('notice', ..., nttId, page, ...)` 패턴을 파싱하는 `discoverKritSources` 추가
- KRIT 상세 페이지 구조에 맞춰 제목, 본문, 첨부파일 추출 개선
- KRIT 첨부 다운로드 경로인 `/common/download.do`를 attachment URL 및 attachment text extraction 후보에 포함
- `classifyKritNotice` 추가
  - 우주, 위성, 감시정찰, 정찰위성, 탑재체, C4I, 항공우주 신호는 `defense_space`
  - Aerospace, 항공, 드론, 무인기, 무인이동체, 항공전자, 항공기체, 항공엔진 신호는 `defense_aerospace_adjacent`
  - 설명회, 행사, 세미나, 채용, 홍보, 제도 안내, 조달/입찰/계약성 공고는 제외
- `docs/korea-space-data-sources.md`의 current ingestion notes를 수정해 KRIT 자동 discovery 포함 및 curated real record 금지를 명시

재수집 결과:

- generated count는 `33`건으로 유지
- discovered source count는 `34`건으로 유지
- excluded count는 `1`건으로 유지
- KRIT 현재 공개 공지 중 generated로 들어간 record는 없음

판단:

- 현재 KRIT 목록에는 `GE Aerospace` 사업설명회, 일반 무기체계 부품국산화, 일반 방산 스타트업/행사성 공고가 많다.
- `GE Aerospace`는 항공우주 키워드가 있지만 설명회 성격이라 제외했다.
- 일반 무기체계/부품국산화 공고는 우주·항공우주 신호가 명확하지 않아 제외했다.
- 따라서 KRIT discovery는 연결되었지만, 현재 generated dataset을 오염시키지 않는 보수적 동작을 한다.

추가 검증:

```bash
npm run refresh:space
npm run verify:space
```

결과:

- `check:space`: 통과
- shared test 7개: 통과
- typecheck: 통과
- build: 통과

## 12. 추가 진행: K-Startup 공개 창업지원사업 discovery 확장

KRIT 확장 이후 일반 연구자, 대학(원)생, 예비창업자, 소규모 연구팀이 활용할 수 있는 항공우주 창업지원 공고를 포함하기 위해 K-Startup discovery를 추가 보강했다.

추가 목적:

- 기업지원 중심 데이터셋에서 빠질 수 있는 예비창업자/개인 연구자/대학(원)생 대상 항공우주 지원사업 포착
- K-Startup의 공개 ongoing 공고와 키워드 검색 결과를 자동 discovery 대상으로 편입
- 단순 교육 참가자 모집, 행사/네트워킹, 입주기업 모집, generic deeptech 공고가 generated dataset으로 들어오지 않도록 보수적 필터 유지

수정 내용:

- `scripts/ingest-space-programs.mjs`에 `kStartupOngoingListUrl` 추가
- K-Startup 상세 페이지의 `biz_PBANC_view`/`conts` 본문 추출 경로 추가
- K-Startup 첨부 다운로드 경로인 `/afile/fileDownload/`를 attachment URL 후보에 포함
- `classifyKStartupNotice` 추가 및 보강
  - 우주, 위성, 항공우주, 우주항공 신호는 `space_commercialization` 또는 `satellite`
  - 드론, UAM, AAM, 무인기 신호는 `drone_uam_adjacent`
  - 방산/국방 신호는 `defense_aerospace_adjacent`
  - 교육생, 교육 참가자, 창업 교육, 세미나, 포럼, 컨퍼런스, 네트워킹, 설명회, 입주기업/입주자, 공모전은 제외
- `discoverKStartupSources`가 빈 검색어 첫 페이지뿐 아니라 `우주`, `항공`, `항공우주`, `위성`, `드론`, `UAM`, `AAM`, `방산` 검색 결과를 순회하도록 수정
- K-Startup 예비창업자 공고가 `대학` 키워드 때문에 연구기관 참여 필수 공고로 오분류되지 않도록 target/eligibility 정규화 보정
- `packages/shared/src/space-sources.ts`에 `KSTARTUP` source review 추가
- `docs/korea-space-data-sources.md`와 `docs/space-ingestion-runbook.md`에 K-Startup source rule 추가
- HTML entity `&nbsp;`가 generated summary에 남지 않도록 본문 정리 보강

수집 결과:

- generated count: `34`
- discovered source count: `35`
- excluded count: `1`
- source families: `BIZINFO`, `KARI`, `KASA`, `KASI`, `KSTARTUP`, `MOLIT_KAIA`
- K-Startup generated record: `1`
  - `항공우주기술 기반 예비창업자 지원사업 「2026 STAR-Exploration」`
  - source id: `space-kstartup-discovered-177853`
  - deadline: `2026-06-10`
  - status: `active`
  - target: 예비창업자, 대학(원)생, 일반인 등 항공우주 기술 기반 사업모델 보유자

후보 판단:

- `2026 STAR-Exploration`은 항공·우주 기술 기반 사업모델 발굴, 시제품 제작, 자금조달 등 사업 고도화 지원을 명시하므로 generated dataset에 포함했다.
- `2026 대전방산혁신클러스터 드론특화형 국방 창업 교육 참가자 모집공고`는 드론/국방 키워드가 있으나 교육 참가자 모집 성격이므로 제외했다.
- `방산 스타트업 챌린지`류 공고는 K-Startup에서는 행사/네트워크 category로 노출되며, 중복 aggregator 오염을 피하기 위해 K-Startup 경로에서는 generated에 추가하지 않았다.

검증:

```bash
npm run refresh:space
```

결과:

- `check:space`: 통과
- generated: `34`
- active: `9`
- closed: `25`
- warnings/failures: 없음

## 22. 추가 진행: KIAT 원천 사업공고 discovery 연결

한국산업기술진흥원(KIAT) 직접 사업공고 피드를 source family로 분리해 연결했다. 현재 KIAT 홈페이지 사업공고 피드에는 우주항공 직접 신호가 있는 active 공고가 없어 generated record는 0건이 정상이다. 수요조사, 기술나눔, 설명회, 교육, 안내성 공고가 다수 섞이는 구조라서 전체 수집이 아니라 명시적 우주/항공/UAM/드론 신호가 있는 deadline-bearing 과제 공고만 통과시키도록 설계했다.

수정 내용:

- `scripts/ingest-space-programs.mjs`
  - `kiatMainUrl`, `kiatBusinessNoticeMenuId` 추가
  - `classifyKiatBusinessNotice` 추가
  - `discoverKiatBusinessSources` 추가
  - KIAT 홈페이지 `board_id=90` 사업공고 feed parsing 추가
- `packages/shared/src/space-sources.ts`
  - `KIAT` source review 추가
  - metadata-only storage policy 적용
- `docs/korea-space-data-sources.md`, `docs/space-ingestion-runbook.md`, `docs/space-source-terms-review.md`
  - KIAT 수집 기준과 0건 정상 조건 문서화

현재 KIAT feed 검토 결과:

- `2026년도 산업통상부-공공기관 기술나눔 공고`: 과제 지원 공고가 아니므로 제외
- `2026년 한-중 산업기술국제협력 수요조사 공고`: 수요조사이므로 제외
- 바이오, 건설기계, 자동차부품, 일반 산업혁신기반구축 등: 우주항공 직접 신호가 없어 제외

검증:

```bash
npm run refresh:space
npm run verify:space
```

결과:

- generated count: `39`
- active count: `14`
- closed count: `25`
- excluded count: `1`
- discovered sources: `40`
- current KIAT generated record: `0`
- source registry: `KIAT` 포함
- `check:space`: warnings/failures 없음
- shared tests: `10`개 통과
- typecheck: shared/api/mcp/web 모두 통과
- build: shared/api/mcp/web 모두 통과

## 27. 추가 진행: BIZINFO discovery 병목 개선

`discoveryRunAudit` 도입 후 BIZINFO discovery가 약 `46.1s`로 전체 refresh의 가장 큰 병목임이 확인됐다. BIZINFO 매칭 공고는 active/closed 목록의 뒤쪽 페이지에도 흩어져 있어 페이지 수를 단순 축소하면 누락 위험이 있다. 따라서 조회 범위는 active/closed 각 30페이지로 유지하되, 페이지 fetch를 제한된 동시성으로 병렬화했다.

추가 목적:

- BIZINFO coverage 유지
- active/closed 뒤쪽 페이지에 있는 공고 누락 방지
- refresh 전체 실행시간 단축
- source별 병목 개선 효과를 `discoveryRunAudit`로 검증

수정 내용:

- `scripts/ingest-space-programs.mjs`
  - `fetchBizinfoPageSources` 추가
  - `fetchBizinfoPagesWithConcurrency` 추가
  - BIZINFO page fetch를 순차 60페이지에서 동시성 `6`의 chunk 병렬 조회로 변경
  - dedupe와 결과 정렬/생성 로직은 기존 source id 기준 유지

검토한 분포:

- active(`schEndAt=N`) 매칭은 page `10`, `12`, `19`, `28`에 분포
- closed(`schEndAt=Y`) 매칭은 page `4`, `7`, `8`, `14`, `16`, `17`, `19`, `29`에 분포
- 따라서 page 범위 축소는 보류하고 병렬화만 적용

성능 결과:

- 변경 전 BIZINFO discovery: 약 `46.1s`
- 변경 후 BIZINFO discovery: 약 `10.0s`
- generated count: `45` 유지
- BIZINFO discovered/generated/excluded: `17` / `16` / `1` 유지

검증:

```bash
npm run refresh:space
npm run verify:space
```

결과:

- generated count: `45`
- active count: `18`
- closed count: `27`
- excluded count: `1`
- discovered sources: `47`
- source family count: `11`
- `check:space`: warnings/failures 없음
- shared tests: `10`개 통과
- typecheck: shared/api/mcp/web 모두 통과
- build: shared/api/mcp/web 모두 통과

## 26. 추가 진행: discoveryRunAudit source 시도/소요시간 감사 지표 추가

`sourceFamilyAudit`는 discovery 결과가 있는 source family만 보여주므로, KIAT처럼 정상적으로 조회했지만 현재 matching 공고가 0건인 source는 반복 리포트에서 보이지 않는 한계가 있었다. 이를 보완하기 위해 source discovery 시도 단위의 `discoveryRunAudit`를 추가했다.

추가 목적:

- attempted source 전체 확인
- 0건 source와 error source 구분
- source별 discovery 소요시간 추적
- 반복 수집 병목 source 식별

수정 내용:

- `scripts/ingest-space-programs.mjs`
  - `runDiscovery`에서 `label`, `status`, `discoveredCount`, `durationMs`, `error` 기록
  - `discoveryRunAudit`를 `space-ingest-report.json`에 저장
  - source discovery 실행 목록을 명시 배열로 정리
- `scripts/evaluate-space-mvp.mjs`
  - `discoveryRunAudit` schema 검증 추가
  - discovered count 합계가 `discoveredSourceCount`와 일치하는지 검증
  - error status에는 error message가 있어야 하도록 검증
- `scripts/report-space-refresh.mjs`
  - `Source discovery runs` 섹션 출력 추가
- `packages/shared/src/types.ts`, `packages/shared/src/space-data.ts`
  - runtime ingest report schema와 sanitizer 확장
- `packages/shared/src/space-search.test.ts`
  - `discoveryRunAudit` 합계 검증 추가
- `docs/space-ingestion-runbook.md`
  - 반복 수집 acceptance gate와 review protocol에 `discoveryRunAudit` 확인 추가

최신 discovery run audit:

- `KARI`: ok, discovered `10`, `0.3s`
- `KASI`: ok, discovered `1`, `1.6s`
- `KASA`: ok, discovered `5`, `0.9s`
- `DAPA`: ok, discovered `0`, `0.6s`
- `ADD`: ok, discovered `3`, `0.4s`
- `KRIT`: ok, discovered `0`, `0.4s`
- `KSTARTUP`: ok, discovered `1`, `2.8s`
- `KEIT`: ok, discovered `0`, `0.7s`
- `KIAT`: ok, discovered `0`, `0.9s`
- `TIPA_SMTECH`: ok, discovered `1`, `0.5s`
- `DJTP`: ok, discovered `6`, `1.3s`
- `JNTP`: ok, discovered `1`, `0.6s`
- `GNTP`: ok, discovered `1`, `2.2s`
- `KAIA`: ok, discovered `1`, `0.5s`
- `BIZINFO`: ok, discovered `17`, `46.1s`

확인된 병목:

- `BIZINFO` discovery가 약 `46.1s`로 전체 refresh 시간의 대부분을 차지한다.
- 다음 성능 개선 단계에서는 Bizinfo page range 축소, keyword-first discovery, 또는 source별 병렬 fetch를 검토할 수 있다.

검증:

```bash
npm run refresh:space
npm run verify:space
```

결과:

- generated count: `45`
- active count: `18`
- closed count: `27`
- excluded count: `1`
- discovered sources: `47`
- source family count: `11`
- `check:space`: warnings/failures 없음
- shared tests: `10`개 통과
- typecheck: shared/api/mcp/web 모두 통과
- build: shared/api/mcp/web 모두 통과

## 25. 추가 진행: sourceFamilyAudit 반복 수집 감사 지표 추가

반복 수집 시 source family별 발견/생성/제외/오류 흐름을 바로 확인할 수 있도록 `data/space-ingest-report.json`에 `sourceFamilyAudit`를 추가했다. 이전에는 전체 generated/excluded count만 확인할 수 있어, 특정 source가 갑자기 0건으로 떨어지거나 discovery는 됐지만 generated로 남지 않는 상황을 빠르게 찾기 어려웠다.

추가 목적:

- source family별 discovery drift 감지
- generated spike/drop 확인
- excluded/error count의 source별 원인 추적
- recurring refresh report에서 source별 상태를 바로 확인

수정 내용:

- `scripts/ingest-space-programs.mjs`
  - `discoveredSourceFamilies`, `generatedSourceFamilies`, `excludedSourceFamilies` 추가
  - `sourceFamilyAudit` 추가
  - source family별 `discoveredCount`, `normalizedCount`, `generatedCount`, `excludedCount`, `errorCount`, `activeCount`, `closedCount` 기록
- `scripts/evaluate-space-mvp.mjs`
  - `sourceFamilyAudit` array 검증 추가
  - audit generated/excluded/discovered 합계가 실제 파일 및 `discoveredSourceCount`와 일치하는지 검증
- `scripts/report-space-refresh.mjs`
  - refresh report에 `Discovery audit` 출력 추가
- `packages/shared/src/types.ts`, `packages/shared/src/space-data.ts`
  - `SpaceIngestReport` schema 확장
  - runtime loader sanitizer 추가
- `packages/shared/src/space-search.test.ts`
  - ingest audit report test에 `sourceFamilyAudit` 합계 검증 추가
- `docs/space-ingestion-runbook.md`
  - acceptance gate와 recurring review protocol에 `sourceFamilyAudit` 확인 추가

최신 audit 결과:

- `ADD`: discovered `3`, generated `3`, excluded `0`, errors `0`
- `BIZINFO`: discovered `17`, generated `16`, excluded `1`, errors `0`
- `DJTP`: discovered `6`, generated `5`, excluded `0`, errors `0`
- `GNTP`: discovered `1`, generated `1`, excluded `0`, errors `0`
- `JNTP`: discovered `1`, generated `1`, excluded `0`, errors `0`
- `KARI`: discovered `10`, generated `10`, excluded `0`, errors `0`
- `KASA`: discovered `5`, generated `5`, excluded `0`, errors `0`
- `KASI`: discovered `1`, generated `1`, excluded `0`, errors `0`
- `KSTARTUP`: discovered `1`, generated `1`, excluded `0`, errors `0`
- `MOLIT_KAIA`: discovered `1`, generated `1`, excluded `0`, errors `0`
- `TIPA_SMTECH`: discovered `1`, generated `1`, excluded `0`, errors `0`

검증:

```bash
npm run refresh:space
npm run verify:space
```

결과:

- generated count: `45`
- active count: `18`
- closed count: `27`
- excluded count: `1`
- discovered sources: `47`
- source family count: `11`
- `check:space`: warnings/failures 없음
- shared tests: `10`개 통과
- typecheck: shared/api/mcp/web 모두 통과
- build: shared/api/mcp/web 모두 통과

## 24. 추가 진행: JNTP 전남 고흥드론/우주항공 source 확장

전남테크노파크(JNTP) 지역사업공고를 source family로 추가했다. 처음에는 메인 페이지의 `지역사업공고` feed를 사용했으나 refresh마다 응답 구조가 간헐적으로 달라져 JNTP가 누락되는 현상이 있었다. 이를 공식 `apiAnnouncement/List` 목록 URL 우선 조회로 바꾸고, 메인 feed는 fallback으로만 사용하도록 정비했다.

추가 목적:

- 전남 고흥드론센터, 순천 위성, 우주항공산업센터 계열 지역 공고를 원천 source에서 포착
- Bizinfo aggregator에 이미 잡히는 전남TP 공고라도 원천 URL과 지역 eligibility를 별도 보존
- 에너지, 플라스틱, 농공단지, 일반 R&D 역량강화 같은 broad regional support 오수집 방지

수정 내용:

- `scripts/ingest-space-programs.mjs`
  - `jntpMainUrl`, `jntpAnnouncementListUrl` 추가
  - `classifyJntpSupportNotice` 추가
  - `discoverJntpSupportSources` 추가
  - JNTP source별 `region: 전남`, `targetRegions: [전남]` 설정
  - `apiAnnouncement/List` table row parser와 main feed fallback parser 추가
- `packages/shared/src/space-sources.ts`
  - `JNTP` source review 추가
  - metadata-only storage policy 적용
- `docs/korea-space-data-sources.md`, `docs/space-ingestion-runbook.md`, `docs/space-source-terms-review.md`
  - JNTP 수집 기준, 제외 기준, 전남 지역 요건 문서화

JNTP generated record:

- `space-jntp-discovered-1063`
  - title: `2026년 2차 고흥드론센터 입주기업 역량강화 지원사업`
  - agency: `전남테크노파크`
  - deadline: `2026-07-01`
  - category: `drone_uam_adjacent`
  - region: `전남`
  - deadlineSource: `source_metadata`

검증:

```bash
npm run refresh:space
npm run verify:space
```

결과:

- generated count: `45`
- active count: `18`
- closed count: `27`
- excluded count: `1`
- discovered sources: `47`
- source family count: `11`
- JNTP generated record: `1`

## 28. 추가 진행: Bizinfo HWP/HWPX 첨부 마감일 파싱 보강

반복 수집 중 Bizinfo 후보 1건이 실제 드론 지원사업 공고임에도 `applicationEndDate` 없이 excluded로 남는 문제가 확인됐다. 해당 상세 페이지의 HTML 신청기간은 `차수별 상이`로 표시되어 직접 마감일을 제공하지 않았고, 마감일은 공개 HWP 공고문 첨부의 제출기간 표에 있었다.

대상 record:

- `space-bizinfo-discovered-PBLN_000000000121786`
  - title: `[경기] 2026년 드론산업 육성 지원사업 모집 공고(지역 수요기반 드론 활용 사업모델 발굴 및 실증 지원)`
  - 기존 상태: `data/space-programs.excluded.json`
  - 기존 reason: `attachment_without_deadline`

원인:

- Bizinfo 상세 페이지의 일부 첨부는 `<a href="/cmm/fms/fileDown.do?...">` 외에도 `fileLoad(...)`, `fileBlank(...)` JavaScript 호출로 노출된다.
- 기존 첨부 스캐너는 첫 번째 readable HWPX 서식 파일에서 텍스트를 읽으면, 그 파일에 마감일이 없어도 뒤의 공고문 HWP까지 계속 확인하지 않았다.
- 공고문 HWP의 제출기간은 `신청서 및 계획서 5. 19(화) ~ 29(금)`처럼 연도 없는 범위라서 첨부 deadline 파서가 읽지 못했다.

수정 내용:

- `scripts/ingest-space-programs.mjs`
  - `fileLoad(...)`, `fileBlank(...)`의 JavaScript 문자열 조합을 파싱해 공개 첨부 후보로 추가
  - 직접 업로드 경로(`/webapp/upload/...`)와 `fileDown.do` 링크를 첨부 후보로 함께 관리
  - 첫 번째 readable 첨부에서 중단하지 않고, deadline-bearing 첨부를 찾을 때까지 최대 8개 후보를 확인
  - 첨부 텍스트에도 `findNoYearDeadline`을 적용해 공고 등록연도 기준으로 연도 없는 범위를 보정
  - `deadlineEvidenceText`가 HWP 내부 제어문자로 오염되지 않도록 짧은 보정 근거 문구 저장
- `docs/korea-space-data-sources.md`
  - Bizinfo `차수별 상이`와 JavaScript 첨부 처리 기준 추가
- `docs/space-ingestion-runbook.md`
  - 반복 작업 중 Bizinfo deadline troubleshooting 절차 추가

수정 후 generated record:

- `space-bizinfo-discovered-PBLN_000000000121786`
  - deadline: `2026-05-29`
  - deadlineSource: `attachment`
  - deadlineEvidenceUrl: `https://www.bizinfo.go.kr/cmm/fms/fileDown.do?atchFileId=FILE_000000000754667&fileSn=1`
  - deadlineEvidenceText: `[hwp] 신청서 및 계획서 5. 19(화) ~ 29(금) (공고일 2026-05-08 기준 2026-05-29로 보정)`

수집 결과:

- generated count: `46`
- active count: `18`
- closed count: `28`
- excluded count: `0`
- discovered sources: `47`
- Bizinfo discovered/generated/excluded: `17` / `17` / `0`

## 29. 추가 진행: ITP 인천 PAV/드론 source 확장 및 반복 운영 보강

남은 작업 1~4번 중 source 확장, 반복 운영 기준, deadline parser edge case 보강을 함께 진행했다. 추가 regional TP 후보를 검토한 결과, ITP(인천테크노파크)는 공개 목록에서 드론/PAV 직접 신호가 있고 reader fallback으로 상세 페이지를 읽을 수 있어 source family로 추가했다. 충남/경북/부산 TP는 현재 직접 접근 가능한 피드에서 항공우주 지원사업 신호가 약하거나 행사/홍보성이라 이번 generated source로 넣지 않았다.

추가 목적:

- 인천 PAV/UAM/AAV 및 드론 실증 지원사업 포착
- 공항-only 스타트업, broad AI/deeptech, 행사/전시/세미나, 상시 접수 공고의 오수집 방지
- 반복 수집 report에서 error, slow source, excluded candidate, fallback deadline을 watchpoint로 바로 확인

수정 내용:

- `scripts/ingest-space-programs.mjs`
  - ITP public support list reader fallback 수집 추가
  - `classifyItpSupportNotice` 추가
  - 직접 fetch가 generic error page를 반환하는 경우 reader fallback으로 넘어가도록 `isFetchErrorPage`, `preferJina` 처리 추가
  - ITP detail URL은 `tmid=13`으로 고정해야 상세 마감일이 노출되는 것을 반영
  - `상시`, `예산 소진`, `차수별 상이`, `별도 공지`, `수시 접수`, `선착순` 문구가 신청/접수/모집/공모/제출/지원 문맥에 붙어 있고 확정 마감일을 읽지 못한 후보는 `open_ended_or_variable_deadline`으로 분류
  - `마감일 YYYY-MM-DD` evidence context가 과도하게 길어지지 않도록 `extractDeadlineContext` 보강
  - ITP reader soft-error(`Failed to fetch`, rate limit, access denied 등)가 정상 markdown처럼 처리되지 않도록 error page 감지 강화
  - ITP 목록 URL별 fetch/parse 실패를 격리하고, 모든 목록이 파싱 불가능하면 discovery audit error로 드러나도록 보강
  - DJTP 임시 PDF URL이 404를 반환하는 회귀를 막기 위해 stable DJTP main source URL과 목록 metadata deadline evidence를 사용하도록 조정
- `scripts/report-space-refresh.mjs`
  - operational watchpoints 출력 추가: discovery error, 15초 초과 slow source, source error, 제외 후보 급증, `page_date_fallback` record
  - `durationMs` 누락 시 `NaN`이 출력되지 않도록 discovery run 출력 보강
- `packages/shared/src/space-sources.ts`
  - `ITP` source review 추가
- `docs/korea-space-data-sources.md`, `docs/space-ingestion-runbook.md`, `docs/space-source-terms-review.md`
  - ITP 수집 기준, DJTP direct PDF path 안정성, 변동형 마감일 처리 기준 문서화

ITP generated record:

- `space-itp-discovered-10697`
  - title: `2026년 파브(PAV) 실증기 개발 지원사업 모집공고(본공고)`
  - agency: `인천테크노파크`
  - deadline: `2026-05-15`
  - deadlineSource: `html`
  - sourceUrl: `https://www.itp.or.kr/intro.asp?seq=10697&tmid=13`

수집 결과:

- generated count: `47`
- active count: `18`
- closed count: `29`
- excluded count: `0`
- discovered sources: `48`
- source family count: `12`
- ITP discovered/generated/excluded: `1` / `1` / `0`
- DJTP discovered/generated/excluded: `6` / `5` / `0`
- `check:space`: warnings/failures 없음
- shared tests: `10`개 통과
- typecheck: shared/api/mcp/web 모두 통과
- build: shared/api/mcp/web 모두 통과

Claude CLI 리뷰 및 후속 조치:

- 리뷰 파일: `docs/reviews/claude-opus-space-review-2026-06-07.md`
- 먼저 파일 경로를 넘겨 `Read/Grep/Glob`로 직접 읽는 `claude-opus-4-8`, `xhigh` 리뷰를 여러 번 시도했으나 파일 읽기 단계에서 장시간 멈춰 0바이트 결과만 남았다.
- 같은 모델의 단일 파일 읽기 동작은 확인했고, 최종적으로 핵심 파일 구간을 stdin으로 넘기는 방식으로 Claude 리뷰 결과를 저장했다. 완료된 리뷰는 `opus-4-8`, `medium` effort 결과다.
- Claude 리뷰 요지:
  - blocker 없음
  - ITP reader soft-error가 0건 정상 처리로 조용히 지나갈 수 있음
  - ITP 목록 URL 하나의 실패가 전체 ITP discovery를 중단할 수 있음
  - 변동형 마감일 regex가 `결과는 별도 공지` 같은 boilerplate를 과매칭할 수 있음
  - `extractDeadlineContext`의 plain hyphen 매칭 때문에 근거 snippet 품질이 낮아질 수 있음
  - operational watchpoints에서 routine exclusion과 `NaN` 출력 가능성이 있음
- 반영한 후속 수정:
  - reader soft-error 감지 강화
  - ITP 목록별 try/catch 및 전부 파싱 실패 시 audit error화
  - 변동형 마감일 regex를 신청/접수 문맥에 묶음
  - deadline context range separator에서 plain ASCII hyphen 제거
  - exclusion watchpoint 임계값 및 duration 출력 guard 추가
- 최종 재검증:
  - `npm run ingest:space`: `47` records, `48` discovered, excluded without deadline `0`
  - `npm run report:space`: operational watchpoints `none`
  - `npm run verify:space`: check/test/typecheck/build 모두 통과

## 13. 추가 진행: KEIT/ITECH 지원사업공고 discovery 연결

K-Startup 확장 이후 산업통상자원부/KEIT 계열 산업기술 R&D 신규지원 공고를 더 안정적으로 포착하기 위해 ITECH `지원사업공고(KEIT)` discovery를 연결했다.

추가 목적:

- 항공우주 부품, 소재, 제조, 드론/UAM, 무인이동체 등 산업기술 R&D 신규지원 공고가 KEIT에 직접 게시될 때 자동 수집
- Bizinfo aggregator에만 의존하지 않고 KEIT 원천 ITECH detail URL을 확보
- KEIT `과제기획공고`의 인터넷공시/기술수요조사/공청회성 공고가 실제 지원사업처럼 generated dataset에 들어오는 것을 방지

수정 내용:

- `scripts/ingest-space-programs.mjs`에 `keitSupportListJsonUrl`, `keitSupportDetailUrl` 추가
- ITECH `retrieveSprtBsnsAncmListJson.do` POST JSON 목록을 조회하는 `fetchKeitSupportList` 추가
- `discoverKeitSupportSources` 추가
  - 현재 연도와 직전 연도 대상
  - 빈 검색어 및 `우주`, `항공우주`, `항공`, `위성`, `드론`, `UAM`, `AAM`, `무인기`, `무인이동체` 검색어 순회
  - `maxRcveEndDe`, `minRcveStrDe` 같은 compact date 값을 `YYYY-MM-DD`로 변환
- `classifyKeitSupportNotice` 추가
  - 우주/위성/항공우주/우주부품/우주소재는 `space_parts_materials` 또는 `satellite`
  - 항공부품/항공소재/항공산업/항공기체/항공전자/항공엔진/항공제조는 `aerospace`
  - 드론/UAM/AAM/무인기/무인이동체/자율비행은 `drone_uam_adjacent`
  - 통합 시행계획, 의향조사, 설명회, 행사, 세미나, 교육, 매뉴얼, 인터넷공시, 수요조사는 제외
- `docs/korea-space-data-sources.md`와 `docs/space-ingestion-runbook.md`에 KEIT 직접 수집 정책 추가

수집 결과:

- generated count: `34`
- discovered source count: `35`
- excluded count: `1`
- KEIT generated record: `0`

판단:

- 현재 ITECH `지원사업공고(KEIT)` 2026년 목록은 지식서비스산업기술개발, 기계장비산업기술개발 등 3건이다.
- 키워드 검색 기준으로 항공우주/우주/위성/드론/UAM 직접 신호가 있는 신규지원 공고는 발견되지 않았다.
- `과제기획공고(KEIT)`는 831건 이상으로 많지만, 인터넷공시/기술수요조사/공청회 등 미래 기획·의견수렴 성격이 강해 현재 generated dataset에는 넣지 않았다.
- 따라서 KEIT discovery는 연결되었지만 현재 dataset을 오염시키지 않는 0건 동작이 정상이다.

검증:

```bash
npm run refresh:space
```

결과:

- `check:space`: 통과
- generated: `34`
- active: `9`
- closed: `25`
- warnings/failures: 없음

## 14. 추가 진행: ADD 공개 제안서 공모 discovery 확장

KEIT 직접 수집 연결 이후 방산/국방 R&D 중 항공우주·드론·무인기 인접 연구과제 공모를 포착하기 위해 ADD(국방과학연구소) 공개 `제안서 공모 > 공모안내` discovery를 추가했다.

추가 목적:

- ADD 공개 제안서 공모 중 항공우주, 드론, 무인기, 스텔스 전투기, 항공 소재/센서 등과 명시적으로 연결된 R&D 세부과제 공모 수집
- 일반 AI, 전장상황 인식, 미래도전 일반 공모, 경진대회, 지침성 문서가 generated dataset에 들어오는 것을 방지
- defense/dual-use source로서 public metadata와 원문 URL 중심 수집 원칙 유지

수정 내용:

- `scripts/ingest-space-programs.mjs`에 `addProposalListUrl` 추가
- ADD 상세 페이지의 `board view` table에서 공고명, 일자, 본문을 추출하도록 `extractDetailTitle`, `extractMainText` 보강
- ADD 첨부 다운로드 경로인 `/fileDownloadDev`를 attachment URL 후보에 포함
- `classifyAddProposalNotice` 추가
  - 위성, 우주, 감시정찰, 정찰위성, 탑재체, C4I, 국방우주 신호는 `defense_space`
  - 항공용, 항공소재, 항공센서, 항공기, 전투기, 드론, 군집드론, 무인기, 무인이동체, 저피탐, 스텔스, RCS 신호는 `defense_aerospace_adjacent`
  - 비용분석서, 작성 지침, 결과안내, 채용, 포상, 경진대회, 설명회, 행사, 세미나, 공청회, 구매/입찰/계약성 공고는 제외
- `discoverAddProposalSources` 추가
  - 공개 목록 1~3페이지 순회
  - `titleId`가 중복 query parameter로 노출되는 구조를 고려해 첫 번째 `titleId`를 source id로 사용
  - 목록의 공고일, 접수시작일, 접수마감일을 우선 deadline evidence로 사용
- `packages/shared/src/space-sources.ts`에 `ADD` source review 추가
- `scripts/evaluate-space-mvp.mjs`에 경진대회/비용분석서 작성 지침 회귀 방지 패턴 추가
- `docs/korea-space-data-sources.md`, `docs/space-ingestion-runbook.md`에 ADD 수집 기준 추가

수집 결과:

- generated count: `37`
- discovered source count: `38`
- excluded count: `1`
- ADD generated record: `3`

ADD generated records:

- `space-add-discovered-1712`
  - title: `[공모] 미래도전국방기술 연구개발사업 \`26년 국과연 주관 PM과제(세부과제) 제안서 공모(스텔스 전투기 세부형상 설계, 스텔스 소요기술 통합 Testbed 구축 및 RCS 검증)`
  - deadline: `2026-06-12`
  - category: `defense_aerospace_adjacent`
- `space-add-discovered-1711`
  - title: `[공모] 미래도전국방기술 연구개발사업 \`26년 국과연 주관 PM과제(세부과제) 제안서 공모(항공용 다기능 복합소재 및 저피탐 센서 기술)`
  - deadline: `2026-06-12`
  - category: `defense_aerospace_adjacent`
- `space-add-discovered-1710`
  - title: `[공모] 미래도전국방기술 연구개발사업 \`26년 국과연 주관 PM과제(세부과제) 제안서 공모(군집드론 통제를 위한 LLM, 음성인식 기반 HMI 및 지능형 임무분석기술)`
  - deadline: `2026-06-15`
  - category: `defense_aerospace_adjacent`

제외 판단:

- `피지컬 AI 플랫폼`, `뉴로-심볼릭 전장상황 통합인식`, `초광대역 위협표적 교전기술`은 국방 R&D 공모이지만 항공우주/우주/드론 직접 신호가 부족해 제외했다.
- `룬샷 경진대회 난제 해결방안 제안서 공모`는 경진대회 성격이므로 제외했다.
- `2026년도 제안서 작성용 비용분석서 작성 지침`은 지침성 문서이므로 제외했다.

검증:

```bash
npm run refresh:space
```

결과:

- `check:space`: 통과
- generated: `37`
- active: `12`
- closed: `25`
- source families: `ADD`, `BIZINFO`, `KARI`, `KASA`, `KASI`, `KSTARTUP`, `MOLIT_KAIA`
- warnings/failures: 없음

## 15. 추가 진행: GNTP 지역 우주항공 클러스터 discovery 연결

ADD 직접 수집 이후 지역 우주항공 클러스터 지원사업을 보강하기 위해 경남테크노파크(GNTP) 공개 `사업신청` discovery를 추가했다. 경남권 우주항공·항공산업 지원은 기업뿐 아니라 산학연 컨소시엄, 연구팀, 소규모 기술개발 조직에 직접적인 적용 가능성이 있어 별도 source family로 관리한다.

추가 목적:

- 경남 지역 우주항공, 항공산업, 드론/무인기, 우주항공 AI 상용화 지원사업 자동 수집
- 지역 TP 목록에 섞여 있는 안전관리, ESG, 컨설팅, 교육, 입주, 평가위원, 용역/입찰 공고의 오수집 방지
- 지역 제한과 세부 자격을 사용자가 놓치지 않도록 eligibility와 source URL을 보존

수정 내용:

- `scripts/ingest-space-programs.mjs`에 `gntpSupportListUrl` 추가
- GNTP 사이트가 요구하는 `POST` 방식 목록/상세 조회를 지원하도록 `fetchPage`에 method 옵션 추가
- GNTP detail 페이지의 `사업정보` 영역에서 본문을 추출하도록 `extractMainText` 보강
- `classifyGntpSupportNotice` 추가
  - 우주항공, 우주산업, 위성, 우주 AI는 `space_commercialization`
  - 항공산업, 항공부품, 항공제조, 항공정비는 `aviation_industry`
  - 방산+항공/드론/무인기 신호는 `defense_aerospace_adjacent`
  - 컨설팅, ESG, 정보보호, 세미나, 교육, 채용, 입주, 평가위원, 용역, 입찰, 구매성 공고는 제외
- `discoverGntpSupportSources` 추가
  - `table-contents` 행과 `goPage('S', ..., '/biz/applyInfo/{id}')` 구조를 파싱
  - 목록의 접수시작일, 접수마감일, 담당부서, 담당팀, 담당자, 상태를 source metadata로 보존
- `packages/shared/src/space-sources.ts`에 `GNTP` source review 추가
- `docs/korea-space-data-sources.md`, `docs/space-ingestion-runbook.md`에 GNTP 반복 수집 기준 추가

수집 결과:

- generated count: `38`
- active count: `13`
- closed count: `25`
- excluded count: `1`
- GNTP generated record: `1`

GNTP generated record:

- `space-gntp-discovered-3766`
  - title: `2026년도 우주항공AI 국산화 상용기술개발 지원기업 추가 모집`
  - agency: `경남테크노파크`
  - deadline: `2026-06-12`
  - category: `space_commercialization`
  - eligibility: 경남 소재 우주항공/ICT/AI 관련 기업 중심으로 원문과 첨부 확인 필요

제외 판단:

- 안전관리 컨설팅, 해양수산, 전력반도체, 지진안전, ESG, 제조 DX/AX 컨설팅 등은 지역 지원사업이지만 우주항공 직접 신호가 부족하거나 일반 컨설팅 성격이므로 제외했다.
- 방산 스타트업 인큐베이팅처럼 국방 또는 창업 신호만 있고 항공우주/드론/무인기 직접 신호가 없는 공고는 GNTP source에서는 generated dataset에 넣지 않는다.
- 안내/포털성 curated record는 과제 공고나 지원사업 공고가 아니므로 generated dataset에 포함하지 않는다.

검증:

```bash
npm run refresh:space
```

결과:

- `check:space`: 통과
- generated: `38`
- active: `13`
- closed: `25`
- source families: `ADD`, `BIZINFO`, `GNTP`, `KARI`, `KASA`, `KASI`, `KSTARTUP`, `MOLIT_KAIA`
- warnings/failures: 없음

## 16. 추가 진행: deadline evidence 저장 및 첨부 파싱 추적 보강

GNTP 확장 이후 반복 수집 과정에서 마감일이 어디서 추출됐는지 바로 검토할 수 있도록 generated record별 deadline evidence metadata를 추가했다. 기존에는 `applicationEndDate`만 저장되어 HTML 본문, 목록 metadata, PDF/HWPX/HWP 첨부 중 어느 경로에서 마감일이 확인됐는지 추적하기 어려웠다.

추가 목적:

- HWPX/HWP/PDF 파싱 여부와 마감일 근거 위치를 generated dataset에 보존
- `page_date_fallback` 같은 낮은 신뢰도 경로가 증가할 때 반복 수집 리뷰에서 즉시 발견
- 마감일이 없는 후보를 수동 추가하지 않고 parser/attachment extraction 개선으로 처리한다는 원칙 강화

수정 내용:

- `scripts/ingest-space-programs.mjs`
  - `extractAttachmentText`가 `{ text, url, format }`을 반환하도록 변경
  - K-Startup `/afile/fileDownload/`, ADD `/fileDownloadDev`, GNTP `/dextnj/streamDownload` 경로를 첨부 텍스트 후보에 포함
  - `chooseDeadlineCandidate`와 `makeDeadlineEvidence` 추가
  - generated record에 `deadlineSource`, `deadlineEvidenceText`, `deadlineEvidenceUrl` 저장
- `packages/shared/src/types.ts`, `packages/shared/src/space-data.ts`
  - deadline evidence 필드 타입과 runtime sanitizer 반영
- `scripts/evaluate-space-mvp.mjs`
  - `applicationEndDate`가 있는 generated record는 유효한 `deadlineSource`, `deadlineEvidenceText`, `deadlineEvidenceUrl`을 가져야 하도록 검증 추가
- `scripts/report-space-refresh.mjs`
  - 반복 수집 리포트에 deadline evidence 분포 출력 추가
  - `page_date_fallback` 레코드가 생기면 별도 검토 대상으로 표시
- `docs/korea-space-data-sources.md`, `docs/space-ingestion-runbook.md`
  - deadline evidence 필수 필드와 반복 수집 리뷰 기준 추가

수집 결과:

- generated count: `38`
- active count: `13`
- closed count: `25`
- excluded count: `1`

deadline evidence 분포:

- `source_metadata`: `22`
- `html`: `9`
- `attachment`: `6`
- `html_no_year_deadline`: `1`
- `page_date_fallback`: `0`

검증:

```bash
npm run refresh:space
```

결과:

- `check:space`: 통과
- generated: `38`
- source families: `ADD`, `BIZINFO`, `GNTP`, `KARI`, `KASA`, `KASI`, `KSTARTUP`, `MOLIT_KAIA`
- warnings/failures: 없음

## 17. 추가 진행: excluded 후보 deadline 파싱 실패 원인 분류

deadline evidence 저장 이후 excluded 후보도 단순히 `no_readable_application_deadline`로만 남기지 않고, 반복 수집 리뷰에서 파싱 실패 원인을 바로 볼 수 있도록 진단 필드를 추가했다.

추가 목적:

- HTML 본문에 날짜가 없는 경우, 첨부가 있으나 읽지 못한 경우, 첨부 텍스트에 마감일이 없는 경우, fetch/parse 오류를 구분
- excluded 후보를 수동으로 추가하지 않고 parser/attachment extraction 개선 대상으로 분류
- `report:space`와 `check:space`가 excluded audit 품질을 같이 검증하도록 보강

수정 내용:

- `scripts/ingest-space-programs.mjs`
  - `describeMissingDeadline` 추가
  - excluded record에 `reasonCategory`, `deadlineExtractionStatus`, `deadlineExtractionNote` 저장
  - 상세 수집 오류 fallback record에도 deadline extraction 진단값 기록
- `scripts/evaluate-space-mvp.mjs`
  - `no_readable_application_deadline` excluded record는 진단 필드 3종을 반드시 가져야 하도록 검증 추가
- `scripts/report-space-refresh.mjs`
  - Notable exclusions에 reason category 분포와 deadline extraction status 분포 출력
  - 각 excluded 후보에 진단 note를 함께 표시
- `packages/shared/src/types.ts`, `packages/shared/src/space-data.ts`
  - excluded record 진단 필드 타입과 sanitizer 반영
- `docs/space-ingestion-runbook.md`
  - 반복 수집 excluded 리뷰 기준과 보고 템플릿에 reason category 항목 추가

현재 excluded 진단 결과:

- excluded count: `1`
- reasonCategory: `attachment_unreadable_or_without_deadline`
- deadlineExtractionStatus: `attachment_fetch_or_text_extraction_failed`
- 대상: `[경기] 2026년 드론산업 육성 지원사업 모집 공고(지역 수요기반 드론 활용 사업모델 발굴 및 실증 지원)`

검증:

```bash
npm run refresh:space
```

결과:

- `check:space`: 통과
- generated: `38`
- excluded: `1`
- warnings/failures: 없음

## 18. 추가 진행: API/MCP 검색 필터 세분화

연구자/대학 연구실/연구팀 대상 공고와 기업/창업/방산/인접분야 공고를 사용자가 직접 구분해 검색할 수 있도록 shared search, API, MCP 입력 스키마를 보강했다.

추가 목적:

- 일반 연구자, 대학 연구실, 출연연, 소규모 연구팀이 활용할 수 있는 연구과제 공고를 기업지원 공고와 분리 검색
- 기업, 스타트업/예비창업자, 방산/dual-use, 인접분야(drone/UAM/defense-aerospace) 검색을 명시적으로 지원
- 기존 `includeDefense`, `includeAdjacent`의 보수적 기본값은 유지하면서 전용 검색 필터 제공

수정 내용:

- `packages/shared/src/types.ts`
  - `SpaceProgramSearchInput`에 `applicantType`, `defenseOnly`, `adjacentOnly` 추가
- `packages/shared/src/space-search.ts`
  - `applicantType: researcher_or_lab | company | startup_or_prefounder` 필터 추가
  - `defenseOnly`는 defense/dual-use 또는 defense category만 반환
  - `adjacentOnly`는 adjacent category만 반환
  - `defenseOnly`와 `adjacentOnly`는 각각 방산/인접분야 레코드를 자동 포함하도록 기본 제외 정책과 충돌하지 않게 처리
- `apps/api/src/index.ts`, `apps/mcp/src/index.ts`
  - camelCase와 snake_case 입력 모두 지원
  - `applicantType/applicant_type`, `defenseOnly/defense_only`, `adjacentOnly/adjacent_only` 추가
  - 검색 응답에 `target_company_type`, `participation_type`, `university_or_research_partner_required` 노출
- `packages/shared/src/space-search.test.ts`
  - 연구자/연구실 필터 테스트
  - 기업 대상 필터 테스트
  - 방산 전용 및 인접분야 전용 필터 테스트
- `docs/space-ingestion-runbook.md`
  - API/MCP 검색 필터 사용 기준 추가

검증:

```bash
npm --workspace @bidscout/shared test
npm run typecheck
```

결과:

- shared test: `10`개 통과
- typecheck: shared/api/mcp/web 모두 통과

## 19. 추가 진행: 정기 수집 scheduler wrapper 구성

반복 수집을 cron, launchd, systemd 등 외부 scheduler에서 안전하게 실행할 수 있도록 `refresh:space` 전용 wrapper를 추가했다. OS scheduler 등록 자체는 운영 환경에서 수행하되, repo에는 중복 실행 방지와 로그/상태 기록을 담당하는 실행 스크립트를 제공한다.

추가 목적:

- 정기 수집 중 중복 실행 방지
- scheduler 실행 결과를 별도 log/state 파일로 감사 가능하게 유지
- lock이 남았을 때 stale lock 판단 기준 제공
- cron 등록 전 dry-run으로 설정 확인 가능

수정 내용:

- `scripts/run-scheduled-space-refresh.mjs` 추가
  - `data/.space-refresh.lock` 기반 중복 실행 방지
  - `SPACE_REFRESH_LOCK_STALE_MINUTES` 환경변수 지원, 기본 `240`분
  - `data/space-refresh-scheduler.log` append log 기록
  - `data/space-refresh-scheduler-last.json` 최신 실행 상태 기록
  - 다른 fresh lock이 있으면 실패가 아니라 skip으로 종료
  - `--dry-run` 지원
- `package.json`
  - `refresh:space:scheduled` script 추가
- `docs/space-ingestion-runbook.md`
  - scheduled wrapper 사용법, dry-run, weekly/daily cron 예시, 산출물 설명 추가

검증:

```bash
npm run refresh:space:scheduled -- --dry-run
```

결과:

- dryRun: `true`
- lockDir: `data/.space-refresh.lock`
- schedulerLogPath: `data/space-refresh-scheduler.log`
- schedulerStatePath: `data/space-refresh-scheduler-last.json`
- staleLockMinutes: `240`
- lockExists: `false`

## 20. 추가 진행: source별 terms/license 검토 문서화

각 기관/포털의 공고를 full-text 재배포 대상으로 간주하지 않도록 source terms/reuse 검토 체계를 문서와 source registry에 반영했다. 현재 MVP 정책은 전 source family에 대해 metadata-only이며, broader storage는 별도 약관/저작권/공공누리/보안성 검토 후에만 허용한다.

추가 목적:

- source별 legal/reuse 검토 상태를 API/MCP source review에 노출
- full notice body, full attachment text, 문서 mirror를 기본 금지로 명시
- paid product 또는 broader storage 전 검토 checklist 제공
- 방산/dual-use source의 보안·수출통제 수동 검토 필요성을 구조화

수정 내용:

- `packages/shared/src/types.ts`
  - `SpaceSourceLegalReviewStatus` 추가
  - `SpaceSourceReview`에 `legalReviewStatus`, `storagePolicy` 추가
- `packages/shared/src/space-sources.ts`
  - 공통 `metadataOnlyLegalPolicy` 추가
  - 현재 source family 전체에 `metadata_only_policy`, attribution required, redistribution false, storage policy 적용
  - compliance warning에 legal review status와 storage policy 포함
- `docs/space-source-terms-review.md` 추가
  - allowed MVP storage와 금지 항목 정리
  - source별 current policy table 추가
  - broader storage 전 review checklist 추가
- `docs/korea-space-data-sources.md`, `docs/space-ingestion-runbook.md`
  - terms review 문서 참조와 metadata-only acceptance gate 추가

현재 정책:

- full notice body 저장: 금지
- full attachment text 저장: 금지
- public deadline metadata extraction: 허용
- short summary와 short deadline evidence snippet: 허용
- source URL/attribution 유지: 필수
- defense/dual-use source: public metadata only + manual review

검증:

```bash
npm run verify:space
```

결과:

- `check:space`: 통과
- shared test: `10`개 통과
- typecheck: shared/api/mcp/web 모두 통과
- build: shared/api/mcp/web 모두 통과

## 21. 추가 진행: TIPA/SMTECH 중소기업 R&D source 확장

KIAT/IITP/NIPA/TIPA 및 지역 TP 확장 후보 중 공개 목록 구조가 안정적이고 우주항공 직접 신호가 확인된 TIPA/SMTECH `R&D 사업공고`를 먼저 연결했다. 현재는 전체 SMTECH 공고를 수집하지 않고, 우주항공·방산우주항공·드론/UAM 등 직접 신호가 있는 deadline-bearing SME R&D 공고만 포함한다.

추가 목적:

- 중소기업 기술개발 R&D 공고 중 우주항공/방산우주항공 딥테크 과제 포착
- 일반 중소기업 R&D, 연구인력지원, 투자설명회, 세미나, generic manufacturing 공고 오수집 방지
- IRIS 연계형 행처럼 stable detail URL이 없는 경우에도 목록 metadata와 deadline evidence를 보존

수정 내용:

- `scripts/ingest-space-programs.mjs`
  - `tipaSmtechNoticeListUrl` 추가
  - `classifyTipaSmtechNotice` 추가
  - `discoverTipaSmtechSources` 추가
  - SMTECH 접수기간 형식(`2026. 04. 23 ~ 2026. 06. 23`) 처리를 위한 `parseLooseDateRange` 추가
  - 목록 기반 record가 주변 행을 summary/rawText에 포함하지 않도록 `sourceTextOverride` 처리 추가
- `packages/shared/src/space-sources.ts`
  - `TIPA_SMTECH` source review 추가
- `docs/korea-space-data-sources.md`, `docs/space-ingestion-runbook.md`, `docs/space-source-terms-review.md`
  - TIPA/SMTECH 수집 기준과 metadata-only terms policy 추가

수집 결과:

- generated count: `39`
- active count: `14`
- closed count: `25`
- excluded count: `1`
- source family count: `9`
- TIPA/SMTECH generated record: `1`

TIPA/SMTECH generated record:

- `space-tipa-smtech-discovered-2026-DCP-32`
  - title: `(2026-DCP-32_방산·우주항공·해양_딥테크 챌린지 프로젝트(DCP*))`
  - agency: `중소기업기술정보진흥원/SMTECH`
  - deadline: `2026-06-23`
  - category: `defense_aerospace_adjacent`
  - deadlineSource: `source_metadata`

검증:

```bash
npm run refresh:space
```

결과:

- `check:space`: 통과
- generated: `39`
- source families: `ADD`, `BIZINFO`, `GNTP`, `KARI`, `KASA`, `KASI`, `KSTARTUP`, `MOLIT_KAIA`, `TIPA_SMTECH`
- warnings/failures: 없음

## 23. 추가 진행: DJTP 대전 지역 우주/국방드론 source 확장

추가 지역 TP 후보 중 현재 public 사업공고 feed에 우주산업 직접 신호가 확인된 대전테크노파크(DJTP)를 연결했다. DJTP는 일반 게시판 상세보다 홈페이지 사업공고 feed가 지원사업명, 접수기간, PDF URL을 안정적으로 제공하므로, 해당 feed를 기준으로 자동 discovery한다.

추가 목적:

- 대전 우주산업 혁신 기반 조성사업, 국방·우주 소부장 3D프린팅, 국방드론 기술지원 등 지역 우주/방산항공 기업지원 공고 포착
- 전시회, 컨퍼런스, 인턴십, 선정결과, 입주공고, 일반 3D프린팅 공고의 오수집 방지
- PDF-first 공고의 원천 PDF URL과 대전 지역 eligibility 보존

수정 내용:

- `scripts/ingest-space-programs.mjs`
  - `djtpMainUrl` 추가
  - `classifyDjtpSupportNotice` 추가
  - `discoverDjtpSupportSources` 추가
  - DJTP source별 `region: 대전`, `targetRegions: [대전]` 설정
  - DJTP 내부 개정/중복 공고 제거를 위한 `dedupeKey`와 deadline 우선 dedupe 보강
  - GNTP에도 `region: 경남`, `targetRegions: [경남]` metadata 보강
- `packages/shared/src/space-sources.ts`
  - `DJTP` source review 추가
  - metadata-only storage policy 적용
- `docs/korea-space-data-sources.md`, `docs/space-ingestion-runbook.md`, `docs/space-source-terms-review.md`
  - DJTP 수집 기준, 제외 기준, PDF-first handling, 대전 지역 요건 문서화

DJTP generated records:

- `space-djtp-discovered-2026-01-0072`
  - 국방·우주 소부장 3D프린팅 공동제조센터 구축사업 시제품제작지원
  - deadline: `2026-11-30`
- `space-djtp-discovered-2026-01-0070`
  - 대전 방산혁신클러스터 국방·드론분야 기술지원(보유장비활용)
  - deadline: `2026-10-30`
- `space-djtp-discovered-2026-01-0092`
  - 우주산업 혁신 기반 조성사업 하반기 지원기업 모집
  - deadline: `2026-06-12`
- `space-djtp-discovered-2026-01-0080`
  - 국방·드론분야 기술사업화 민-군 브릿지 코디네이터 지원기업 모집
  - deadline: `2026-05-27`
- `space-djtp-discovered-2026-01-0086`
  - 국방·드론분야 기술사업화 제품화패키지 지원기업 모집
  - deadline: `2026-05-22`

검증:

```bash
npm run refresh:space
npm run verify:space
```

결과:

- generated count: `44`
- active count: `17`
- closed count: `27`
- excluded count: `1`
- discovered sources: `46`
- source family count: `10`
- DJTP generated record: `5`
- `check:space`: warnings/failures 없음
- shared tests: `10`개 통과
- typecheck: shared/api/mcp/web 모두 통과
- build: shared/api/mcp/web 모두 통과

## 30. 추가 진행: 정기 운영 자동화 및 API/MCP 검색 샘플 회귀 검증

이전 남은 작업 중 정기 반복 운영과 실제 검색 UX 확인을 진행했다. 기존 `refresh:space:scheduled` wrapper는 유지하면서, 운영자가 macOS에서 바로 등록할 수 있는 launchd plist와 검색 샘플 검증 스크립트를 추가했다.

수정 내용:

- `scripts/verify-space-search-samples.mjs`
  - API/MCP가 공통으로 사용하는 `searchSpacePrograms` 검색 코어를 직접 검증
  - 연구자/대학 연구실, 기업 지원, 예비창업자/스타트업, 드론/UAM 인접분야, 방산/국방, 30일 이내 마감 샘플 질의 실행
  - 결과를 `data/space-search-sample-report.json`에 저장
  - 안정적인 검색군은 failure로, 시점에 따라 달라질 수 있는 30일 이내 active 마감은 warning으로 분리
- `package.json`
  - `check:space-search` 추가
  - `verify:space`에 `check:space-search` 포함
- `scripts/run-space-refresh.mjs`
  - 정기 refresh 체인에 `check:space-search` 추가
- `ops/launchd/com.bidscout.space-refresh.plist`
  - 매주 월요일 09:00 local time에 `npm run refresh:space:scheduled` 실행하는 launchd plist 추가
  - stdout/stderr는 `data/space-refresh-launchd.log`, `data/space-refresh-launchd.err.log`에 기록
- `packages/shared/src/space-search.ts`
  - `defenseOnly: true`가 `includeAdjacent` 없이도 `defense_aerospace_adjacent` 같은 방산 인접 분야를 반환하도록 수정
- `packages/shared/src/space-search.test.ts`
  - `defenseOnly` 단독 사용 회귀 테스트 추가
- `docs/space-ingestion-runbook.md`
  - launchd 등록 예시, 검색 샘플 검증, `data/space-search-sample-report.json` 운영 기준 문서화

검증 중 발견한 이슈:

- `defenseOnly: true` 샘플 질의가 `0`건을 반환했다.
- 원인: 검색 필터에서 adjacent 제외가 defense-only 필터보다 먼저 적용되어 `defense_aerospace_adjacent` 결과가 빠졌다.
- 조치: adjacent 제외 조건에 `!input.defenseOnly`를 추가하고 회귀 테스트로 고정했다.
- 실제 `refresh:space` 재실행 중 Bizinfo 신규 공고 `2026년 국방기술을 활용한 창업경진대회 모집 공고`가 생성 데이터에 들어와 `check:space`가 실패했다.
- 원인: Bizinfo 방산 키워드 필터가 경진대회/공모전류 행사성 모집을 지원사업 공고로 오수집했다.
- 조치: Bizinfo title classifier에서 `경진대회`, `공모전`, `아이디어 대회`를 제외하고 refresh를 재실행했다.

검색 샘플 검증 결과:

```bash
npm run check:space-search
```

- researcher_or_lab_general: `10` results
- company_support_general: `10` results
- startup_prefounder_general: `10` results
- drone_uam_adjacent: `4` results
- defense_only: `10` results
- upcoming_deadlines_30_days: `10` results
- warnings: `0`
- failures: `0`
- report: `data/space-search-sample-report.json`

최종 refresh 결과:

```bash
npm run refresh:space
```

- generated count: `47`
- active count: `20`
- closed count: `27`
- excluded count: `1`
- discovered sources: `49`
- source family count: `12`
- operational watchpoints: `none`
- removed by diff: `[BIZINFO] 2026년 국방기술을 활용한 창업경진대회 모집 공고`

Scheduled wrapper dry-run:

```bash
npm run refresh:space:scheduled -- --dry-run
```

결과:

- ok: `true`
- lockDir: `data/.space-refresh.lock`
- staleLockMinutes: `240`
- lockExists: `false`

최종 검증:

```bash
npm run verify:space
```

- `check:space`: generated `47`, excluded `1`, warnings/failures 없음
- `check:space-search`: warnings/failures 없음
- shared tests: `11`개 통과
- typecheck: shared/api/mcp/web 모두 통과
- build: shared/api/mcp/web 모두 통과

## 31. 추가 진행: Claude 재리뷰 반영 및 smoke harness 보강

최근 DJTP provenance 개선과 API/MCP surface smoke 추가분에 대해 Claude CLI 재리뷰를 요청했다. 파일 직접 읽기 방식은 이전과 동일하게 장시간 멈춰 0바이트 결과만 남겼고, 좁은 코드 구간을 stdin으로 넘기는 fallback 방식으로 리뷰 결과를 저장했다.

리뷰 파일:

- `docs/reviews/claude-opus-space-review-2026-06-09.md`

Claude 리뷰 요지:

- blocker 없음
- high: API smoke에서 stdout pipe를 열어두고 drain하지 않아 로그가 많아지면 프로세스가 멈출 수 있음
- medium: API/MCP smoke 중 예외가 발생하면 report JSON이 작성되지 않고 opaque stack trace만 남을 수 있음
- medium: DJTP `sourceTextOverride`에 `applicationStartDate`가 없을 때 `undefined` 문자열이 들어갈 수 있음
- low: DJTP `<tr>` regex가 attribute가 있는 row를 놓칠 수 있음
- low: DJTP discovery cap이 조용히 적용될 수 있음

반영한 수정:

- `scripts/verify-space-api-mcp-smoke.mjs`
  - API child process stdout을 `ignore`로 변경해 pipe backpressure hang 방지
  - API/MCP smoke 각각을 try/catch로 감싸 실패해도 `data/space-api-mcp-smoke-report.json`이 남도록 수정
  - API child가 이미 종료된 경우 `exit` 이벤트를 기다리다 멈추지 않도록 `childExited` guard 추가
  - MCP client close 실패는 cleanup 단계에서 흡수
- `scripts/ingest-space-programs.mjs`
  - DJTP row regex를 `<tr\b[^>]*>`로 보강
  - `sourceTextOverride`에서 접수 시작일이 없을 때 `undefined`가 들어가지 않도록 수정
  - DJTP cap을 `8`에서 `12`로 완화하고 cap 발생 시 `console.warn`으로 명시

검증:

```bash
npm run ingest:space
npm run report:space
npm run check:space-surfaces
npm run verify:space
```

결과:

- generated count: `49`
- active count: `20`
- closed count: `29`
- excluded count: `1`
- discovered sources: `52`
- DJTP discovered/generated/excluded: `9` / `7` / `0`
- `check:space`: warnings/failures 없음
- `check:space-search`: warnings/failures 없음
- `check:space-surfaces`: warnings/failures 없음
- shared tests: `11`개 통과
- typecheck: shared/api/mcp/web 모두 통과
- build: shared/api/mcp/web 모두 통과
- operational watchpoint: ITP discovery `18.0s` slow warning 1건. 기능 실패는 아니며 reader fallback/network latency로 추정.

## 32. 추가 진행: 실제 API/MCP surface smoke 검증

이전 단계에서 shared 검색 코어(`searchSpacePrograms`) 샘플 검증은 추가했지만, 실제 API endpoint와 MCP tool 표면이 같은 입력을 정상 처리하는지는 별도 검증이 없었다. 이번 작업에서 API 서버와 MCP stdio 서버를 실제로 띄워 smoke test하는 스크립트를 추가했다.

수정 내용:

- `scripts/verify-space-api-mcp-smoke.mjs`
  - 임시 로컬 포트로 `apps/api/dist/index.js` 실행
  - `/health` 확인
  - `/space-programs/search`에 `applicant_type=researcher_or_lab`, `defense_only=true` 요청
  - `/space-programs/:id` detail endpoint 확인
  - MCP SDK `Client + StdioClientTransport`로 `apps/mcp/dist/index.js` 실행
  - `listTools()`로 `search_space_programs`, `get_space_ingest_report` 노출 확인
  - MCP `search_space_programs`에 연구자/방산 검색 입력을 실제 tool call로 호출
  - MCP `get_space_ingest_report`의 `generatedCount` 확인
  - 결과를 `data/space-api-mcp-smoke-report.json`에 저장
- `package.json`
  - `check:space-surfaces` 추가
  - `verify:space`에 `check:space-surfaces` 포함
- `docs/space-ingestion-runbook.md`
  - API/MCP surface smoke 실행 기준과 artifact 문서화

검증:

```bash
npm run check:space-surfaces
```

결과:

- API researcher results: `5`
- API defense results: `5`
- MCP tools: `11`
- MCP researcher results: `5`
- MCP defense results: `5`
- MCP generated count: `49`
- warnings: `0`
- failures: `0`
- report: `data/space-api-mcp-smoke-report.json`

## 33. 추가 진행: DJTP 공고별 provenance 개선

이전 DJTP 수집은 homepage card의 `bizOpen('/pbanc/...pdf')` 값을 사용했다. 직접 `/pbanc/*.pdf` URL은 404를 반환할 수 있어 source URL을 homepage로 둔 상태였는데, 공고별 추적성이 약했다. 이번 작업에서 대전테크노파크 사업공고 목록과 PMS viewer 구조를 다시 확인해 공고별 source URL을 개선했다.

확인 결과:

- `https://www.djtp.or.kr/pbanc?mid=a20101000000` 목록 table에 공고번호, PDF viewer URL, PMS 신청 URL, 접수기간, 담당부서가 노출됨
- 직접 PDF URL 예: `https://www.djtp.or.kr/pbanc/EBz1rOk8RFq77UmR1780015141292.pdf` 는 `404 application/json` 반환
- PMS viewer URL 예: `https://pms.dips.or.kr/pdfviewer/web/viewer.html?file=/pbanc/EBz1rOk8RFq77UmR1780015141292.pdf#view=FitV&pagemode=thumbs&page=1` 는 `200 text/html` 반환
- 목록은 `nPage` 페이지네이션이어서 1페이지만 보면 기존 장기/종료 DJTP 공고가 빠짐

수정 내용:

- `scripts/ingest-space-programs.mjs`
  - `djtpBusinessNoticeListUrl` 추가
  - DJTP discovery를 homepage card 파싱에서 `/pbanc?mid=a20101000000&nPage=1..6` table 파싱으로 변경
  - `sourceUrl`과 `deadlineEvidenceUrl`을 homepage 대신 공고별 PMS PDF viewer URL로 변경
  - PMS 신청 URL(`business.jsp?gubun=pbancView&pbanc_no=...`)은 `sourceTextOverride` provenance에 보존
  - 직접 PDF path는 source URL로 쓰지 않음
- `docs/space-ingestion-runbook.md`, `docs/korea-space-data-sources.md`, `docs/space-source-terms-review.md`, `packages/shared/src/space-sources.ts`
  - DJTP source rule을 사업공고 list + PMS viewer URL 기준으로 갱신

DJTP 결과:

- discovered: `8`
- generated: `7`
- excluded: `0`
- active: `3`
- closed: `4`
- 기존 5건 유지
- 추가 생성:
  - `space-djtp-discovered-2026-01-0033`
    - title: `[2026-01-0033]대전 방산혁신클러스터 국방·드론분야 기술사업화 지원사업 "사업화패키지" 지원기업 모집 공고`
    - deadline: `2026-03-24`
  - `space-djtp-discovered-2026-01-0034`
    - title: `[2026-01-0034]대전 방산혁신클러스터 국방·드론분야 기술사업화 지원사업 "고도화패키지" 지원기업 모집 공고`
    - deadline: `2026-03-24`

검증:

```bash
npm run ingest:space
npm run report:space
npm run verify:space
```

결과:

- generated count: `49`
- active count: `20`
- closed count: `29`
- excluded count: `1`
- discovered sources: `51`
- source family count: `12`
- DJTP discovered/generated/excluded: `8` / `7` / `0`
- operational watchpoints: `none`
- `check:space`: warnings/failures 없음
- `check:space-search`: warnings/failures 없음
- shared tests: `11`개 통과
- typecheck: shared/api/mcp/web 모두 통과
- build: shared/api/mcp/web 모두 통과

## 2026-06-09 SMTECH/IRIS 출처 정비

- SMTECH 공고 리스트(`notice02_list.do`)에서 SMTECH 시스템 행은 `notice02_detail.do?ancmId=...&buclCd=...&dtlAncmSn=...&schdSe=...&aplySn=...` 형태의 안정 detail URL을 노출한다. 크롤러는 HTML 엔티티 디코드 후 `ancmId`/`dtlAncmSn`로 안정 id를 추출하도록 강화하였다(`normalizeAbsoluteUrl`이 `;jsessionid=...`을 이미 제거).
- IRIS 시스템 행은 `href="javascript:goMove()"`로 `iris.go.kr` 루트만 열 뿐 공고 id를 노출하지 않는다. 공개 페이지만으로 IRIS 개별 공고 detail URL을 재구성할 안전한 경로가 없으므로, 해당 행은 현재 정책대로 SMTECH 리스트 앵커를 메타데이터 출처로 유지한다. 해당 한계는 `space-sources.ts` `knownGaps`에 기록됨.
- `npm run verify:space`: PASS (generated 49, excluded 1, families 12, warnings/failures 0).

## 2026-06-09 Bizinfo 원기관 출처 URL 추가

- 기업마당(`BIZINFO`, `MOTIE_KEIT_KIAT`) 상세 페이지에 일관되게 노출되는 `<a id="barogagi" ...>` "출처 바로가기" 링크에서 원기관(주관기관) 공고 URL을 안정적으로 추출하도록 `normalizeProgram`에 `extractBizinfoOriginalAgencyUrl` 로직 추가. 결과는 `SpaceProgram.originalAgencyUrl` 신규 옵션 필드로 저장(타입·로더 업데이트).
- K-Startup은 "사업안내 바로가기"가 `javascript:fn_open_window('...')` 호출로만 노출되고 대상 URL이 구글드라이브 폴더·운영기관 홈페이지 등 공고 detail이 아닌 경우가 많아 동일 필드로 surface하지 않음. 운영기관은 기존 `agency`에 이미 포함되어 있음.
- `npm run verify:space`: PASS. generated 48, excluded 1, discovered 51, families 12, BIZINFO 원기관 URL 적재율 15/15.

## 2026-06-09 추가 소스 확장 타당성 점검

- IRIS, NRF, NTIS는 모두 초기 HTML에 공고 행이 포함되지 않고 form submit / AJAX(`retrieveBsnsAncmBtinSituList.do` 등) 로 로드. 인증 세션·CSRF 의존이라 anonymous 자동 수확 비안전.
- 지역 TP(BTP/JBTP/JNTP/KDIA/MSS 등)는 BIZINFO `originalAgencyUrl`로 이미 원기관 링크가 노출돼 별도 직접 크롤러 추가 가치는 현시점 낮음.
- 결론: 즉시 안전 자동화 가능한 신규 family 없음. 인계서 항목 4 보류, 대학 산학협력단 등은 case-by-case로 후속 검토.

## 2026-06-09 분류기 negative 가드 + 회귀 테스트 보강

- `classifyDapaNotice` 가드 확장: 컨퍼런스/세미나/포럼/박람회/전시회/학술대회/공청회/설명회/간담회. 효과: 이전에 deadline 단계에서만 걸러지던 "「항공우주무기체계 기술발전 컨퍼런스 2026」 개최 안내"가 분류 단계에서 조기 차단됨. discovered 51→50, excluded 1→0.
- 회귀 테스트 두 건 추가 (`packages/shared/src/space-search.test.ts`):
  - 순수 행사/박람회/공모전·경진대회·아이디어 대회·피칭 행사·설명회/포럼/세미나 개최 공고가 generated에 새지 않는지 검증.
  - BIZINFO `originalAgencyUrl` 적재율이 80% 이상이고 모두 http(s) URL인지 검증.
- `npm run verify:space`: PASS. 13/13 tests, generated 48, excluded 0, discovered 50, families 12.

## 2026-06-09 launchd 자동 갱신 등록

- `~/Library/LaunchAgents/com.bidscout.space-refresh.plist` 설치 후 `launchctl bootstrap gui/$(id -u)`로 로드. 매주 월요일 09:00 KST에 `npm run refresh:space:scheduled` 실행.
- plist 보강:
  - 프로그램을 `/usr/bin/env npm` → 절대경로 `/opt/homebrew/bin/npm`로 변경.
  - `EnvironmentVariables.PATH`에 `/usr/bin`을 `/opt/homebrew/bin`보다 앞에 두어 `python3`가 `/usr/bin/python3`(curl_cffi/olefile 설치된 인터프리터)로 잡히게 함. Homebrew 3.14는 이 패키지가 없어서 우선되면 ingest 사전점검에서 실패함.
- `launchctl kickstart -k`로 1회 실행 검증: `last exit code = 0`, diff/history 정상 갱신, `space-refresh-launchd.err.log` 비어있음.
- 언로드: `launchctl bootout gui/$(id -u)/com.bidscout.space-refresh && rm ~/Library/LaunchAgents/com.bidscout.space-refresh.plist`.
