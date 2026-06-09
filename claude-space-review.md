# Korea Space Support-Program Ingestion & Refresh — Review

> Note: requested output path was `/tmp/claude-space-review.md`, but this session's sandbox blocks all
> writes outside the working directory, and the pre-existing `/tmp` file could not be overwritten. Saved
> here instead (allowed path, new non-source file).

Scope reviewed: ingestion (`scripts/ingest-space-programs.mjs`), check (`scripts/evaluate-space-mvp.mjs`),
report (`scripts/report-space-refresh.mjs`), refresh driver (`scripts/run-space-refresh.mjs`),
runtime data layer (`packages/shared/src/space-data.ts`, `space-search.ts`, `space-sources.ts`, `types.ts`,
`date-utils.ts`), generated/excluded/report/diff/history data, and the docs/README/agent-instructions.

Current date assumed: **2026-06-07 Asia/Seoul**. Dataset: 35 generated, 4 excluded, 9 active, 26 closed.

Findings are ordered by severity. Each cites file:line.

---

## CRITICAL / HIGH

### H1. Generated dataset contains hand-inserted records — violates the "automated discovery only" rule
`scripts/ingest-space-programs.mjs:30-62` defines `curatedSources`, two fully hand-authored records
(`space-kari-actual-2024-family`, `space-kaia-2024-kuam-safety`) with hardcoded `defaultTitle`,
`defaultDeadline`, `industries`, `technologyAreas`, etc. They are merged straight into the generated
output at `scripts/ingest-space-programs.mjs:1127`
(`dedupeSources([...curatedSources, ...discoveredSources])`) and, because both carry a `defaultDeadline`,
survive into `data/space-programs.generated.json:1-108` (records #1 and #2).

This directly contradicts the stated constraint ("Generated records must come from automated public-source
discovery, not manual insertion") and the project's own rules:
- `docs/space-ingestion-runbook.md:3` ("must come from automated public-source discovery, not one-off manual record insertion"),
- `docs/space-ingestion-runbook.md:116-118` ("Do not hand-add the record"),
- `korea-space-support-mcp-agent-instructions.md:778` ("Do not add generated program records by hand").

Both curated records are also **2-year-old, `closed` (2024) notices** that add no value to an
active-programs tool. Recommend removing `curatedSources` entirely (or routing them to a clearly-labelled,
non-generated fixture) and letting discovery populate the dataset.

### H2. Manual-entry data corruption: deadline precedes announcement
The curated K-UAM record sets `defaultDeadline: "2024-02-29"` (`scripts/ingest-space-programs.mjs:53`),
but the notice's real application window is **2024-05-14 ~ 2024-05-29** (visible in the record's own
`summary`/`rawText`, `data/space-programs.generated.json:86`, `96`). The emitted record therefore has
`announcementDate: "2024-05-14"` with `applicationEndDate: "2024-02-29"`
(`data/space-programs.generated.json:84-85`) — a deadline ~3 months *before* the announcement, which is
logically impossible. This is exactly the class of error the "no manual insertion" rule exists to prevent,
and nothing in `evaluate-space-mvp.mjs` catches it (no announcement <= deadline invariant — see M9).

### H3. Event/exhibition participation notice incorrectly included (false positive)
`space-bizinfo-discovered-PBLN_000000000122592` — "제77회 국제우주대회(IAC) 한국전시관 참가기업 모집 공고"
(`data/space-programs.generated.json:1080`). The body
(`data/space-programs.generated.json:1116`) is an **exhibition-booth participation recruitment**
(전시부스 공간/전시 비품/전시품 운송/홍보 그래픽 지원). The Bizinfo collection policy explicitly excludes
exhibitions/events (`docs/space-ingestion-runbook.md:102` "Exclude … exhibition…"; `space-sources.ts:96-98`
"exhibition … notices … must be excluded unless clearly relevant"), and the task's exclusion list names
"event-only records."

Root cause: `classifyBizinfoNotice` (`scripts/ingest-space-programs.mjs:460-496`) has no
exhibition/event exclusion. Its exclusion regex (`scripts/ingest-space-programs.mjs:461`) covers
`코믹콘|게임|뷰티|관광|포럼|피칭 행사|컨퍼런스|세미나` but **not** `전시|박람회|국제우주대회|참가기업 모집`.
Add 전시/박람회/참가기업-모집/대회-참가 to the exclusion (carefully, so genuine cluster support survives).

### H4. Procurement / bid / BTL solicitation notices pass the classifiers (latent false positives)
The defense and astronomy classifiers admit procurement/bid notices; they are currently kept out of the
generated set only **by accident** (deadline could not be parsed), not by design:
- `space-dapa-discovered-58677` — "무기체계 연구개발사업 **입찰공고**(공군전술C4I체계…)"
  (`data/space-programs.excluded.json:21-27`) matched `classifyDapaNotice` via `C4I`
  (`scripts/ingest-space-programs.mjs:441`). The DAPA exclusion list
  (`scripts/ingest-space-programs.mjs:439`) has no `입찰|계약|조달|제안공고`.
- `space-kasi-discovered-32256` — "한국우주상황인식정보관 임대형 민간투자사업(BTL) **제3자 제안공고**"
  (`data/space-programs.excluded.json:12-19`) matched `classifyKasiNotice` via 우주상황인식
  (`scripts/ingest-space-programs.mjs:425`). `classifyKasiNotice` exclusion
  (`scripts/ingest-space-programs.mjs:413`) has no `입찰|제안공고|BTL|민간투자`.

The task and runbook require excluding procurement/admission notices
(`docs/space-ingestion-runbook.md:14-16`). Because exclusion here depends on a parser failure, any future
notice of the same type **with** a readable bid deadline would be wrongly published as a "program." Add
explicit `입찰|입찰공고|제안공고|조달|계약|민간투자|BTL` exclusions to `classifyDapaNotice` and
`classifyKasiNotice` (and defensively to the others).

---

## MEDIUM

### M5. Researcher/lab calls are included but mislabeled as company programs (coverage quality)
The KARI 위탁연구과제 records are genuine research-subcontract calls for institutions/labs/researchers
(their `rawText` states eligibility "국가연구개발혁신법 제2조 제3호에 해당하는 기관·단체", e.g.
`data/space-programs.generated.json:206`). Inclusion is correct, but the per-record metadata is wrong:
- `eligibilityText` falls back to the **company-oriented** string
  ("중소·중견기업 또는 항공우주 분야 기업 관련 조건…") for every KARI record
  (`data/space-programs.generated.json:142`, `197`, `309`, …), produced by the
  `text.includes("중소")` fallback in `scripts/ingest-space-programs.mjs:1090-1093`.
- `targetCompanyType` is left `undefined` and `universityOrResearchPartnerRequired: false`
  (`scripts/ingest-space-programs.mjs:1099`; `data/space-programs.generated.json:150`).

So the largest block of genuine researcher/lab opportunities is surfaced to users as if they were
SME-company programs — the opposite of the scope requirement to classify researcher/lab opportunities
distinctly (`space-sources.ts:31-33,42-44`; runbook KARI/KASI rules `docs/space-ingestion-runbook.md:71-83`).
`discoverKariSources` should set a researcher-oriented `eligibilityText`/`targetCompanyType` (as
`discoverKasiSources` already does at `scripts/ingest-space-programs.mjs:624-625`) when 위탁연구/공모 is
detected.

### M6. Refresh discards the diff/history exactly when something breaks
`scripts/run-space-refresh.mjs:139-141` awaits `ingest:space`, then `check:space`, then `report:space`
sequentially **before** computing or writing the diff/history
(`scripts/run-space-refresh.mjs:143-176`). `evaluate-space-mvp.mjs` signals failure with
`process.exitCode = 1` (`scripts/evaluate-space-mvp.mjs:165-167`), which makes `runNpmScript` reject
(`scripts/run-space-refresh.mjs:31-33`) and aborts the run. Result: on any refresh where `check:space`
fails (a new unknown category, a past-deadline/status mismatch, etc.) **no `space-refresh-diff.json` and no
`space-refresh-history.jsonl` line are written** — losing the audit trail on precisely the runs that matter.
Recommend computing/writing the diff and history in a `finally` (or not hard-failing the chain on check
errors), so the diff/history always reflect what changed.

### M7. Curated records pollute the generated count without an audit signal
`generatedCount: 35` (`data/space-ingest-report.json:2`) includes the 2 hand-inserted records, while
`discoveredSourceCount: 37` (`data/space-ingest-report.json:3`) counts only discovery output. So 33 of 35
generated records are discovered and 2 are manual, but no field distinguishes them, and
`evaluate-space-mvp.mjs` has no check that flags manually-inserted/`*-actual-*` records. Combined with H1,
this makes the "automated discovery only" guarantee unverifiable from the artifacts. Add a check that fails
if any generated record's `source`/`id` indicates manual curation.

### M8. KASI detail summaries are site-navigation junk (data quality)
`space-kasi-discovered-32235` has a `summary`/`rawText` dominated by the site's global nav menu
("본문 바로가기 대메뉴 … 광학천문 전파천문 …", `data/space-programs.generated.json:642,653`); the actual
notice body ("□ 추진 배경 …") appears only at the very end. Cause: `extractMainText`
(`scripts/ingest-space-programs.mjs:269-281`) has no KASI detail-container pattern, so it falls back to
`stripHtml(whole page)`, and `pickRelevantText` (`scripts/ingest-space-programs.mjs:771-796`) anchors on the
title found in the breadcrumb/nav, slicing 1600 chars of chrome. Add a KASI detail-body selector (and/or
strip the known nav block in `cleanNoticeText`), otherwise user-facing summaries for KASI are unusable.

### M9. `check:space` lacks key invariants and drifts past-due over time
`scripts/evaluate-space-mvp.mjs`:
- No `announcementDate <= applicationEndDate` invariant — would have caught H2.
- No presence/plausibility check on `announcementDate`.
- The stored-status check (`scripts/evaluate-space-mvp.mjs:110-112`) compares the **file's** snapshot status
  against `Date.now()`. Records currently stored `status: "active"` with near deadlines (e.g.
  2026-06-10/06-11) will fail this check once run standalone after those dates, even though runtime
  `deriveSpaceProgramStatus` (`date-utils.ts:24-33`) recomputes correctly. Within `refresh:space` ingestion
  re-runs first so it passes, but `verify:space`/standalone `check:space` becomes time-fragile. Consider
  deriving status from the deadline in the check rather than trusting the stored snapshot.

### M10. Deadline-extraction gap drops a real core research call (false negative)
`space-kari-discovered-18406` — "2026년도 스페이스파이오니어사업 신규과제 재공모" is a genuine core
space research call but landed in `data/space-programs.excluded.json:3-10` with
`no_readable_application_deadline`, while its sibling
`space-kari-discovered-18410` (스페이스파이오니어 재공모) parsed fine with deadline 2026-02-02
(`data/space-programs.generated.json:534`). For KARI, `preferHtmlDeadline` is set
(`scripts/ingest-space-programs.mjs:574`) and the 스페이스파이오니어 pages express the period as
`'26.1.21.(수) ~ '26.2.2.(월)` (short-year, see `data/space-programs.generated.json:545`). The
short-year/anchor handling in `findDeadline` (`scripts/ingest-space-programs.mjs:806-855`) and
`findNoYearDeadline` (`scripts/ingest-space-programs.mjs:582-589`) is missing this case for 18406. Worth
hardening, since it silently drops eligible core research calls.

---

## LOW

### L11. `sourceFamily` filter implicitly unlocks defense/dual-use records
`packages/shared/src/space-search.ts:53-59`: `explicitlyRequestedDefense` is true whenever
`input.sourceFamily === program.sourceFamily`. So filtering by e.g. `sourceFamily: "BIZINFO"` exposes all
`defenseOrDualUse` BIZINFO records (방산 clusters) without the caller setting `includeDefense`. This
contradicts the "defense always needs explicit opt-in / needs_review" intent (`space-sources.ts:54,143-146`).
Gate defense visibility on `includeDefense`/category-defense only, not on a family filter.

### L12. Report's researcher detector is over-broad
`scripts/report-space-refresh.mjs:53-58` counts a record as researcher/lab if title/eligibility/participation
match `…|신규과제|공모`. Nearly every KARI/KASA R&D 공고 matches, so the "Researcher/lab/team records" count
is inflated (e.g. company-facing 항공기 부품 공고 counted). Cosmetic (report only), but tighten if the count
is used for acceptance.

### L13. Tangential BIZINFO inclusions tied to scope by a single keyword
Several BIZINFO records are general SME/consulting programs that touch scope only via 방산/드론, e.g.
`space-bizinfo-discovered-PBLN_000000000122053` "창원 … 제조 DX·AX 확산 컨설팅"
(`data/space-programs.generated.json:1484`) is a digital-transformation consulting program whose only
aerospace/defense tie is that target firms are 기계·방산 제조기업. These pass the documented Bizinfo policy
(explicit defense/drone signal) so they are not policy violations, but they dilute relevance; consider a
minimum-relevance or stronger-signal threshold for BIZINFO.

### L14. Coarse hardcoded eligibility flags
`consortiumRequired: true` is hardcoded for all KAIA notices
(`scripts/ingest-space-programs.mjs:753`) and `universityOrResearchPartnerRequired: true` for all KASI
notices (`scripts/ingest-space-programs.mjs:627`), regardless of the notice text. `inferConsortiumRequired`
(`scripts/ingest-space-programs.mjs:1034-1041`) exists but is overridden by these fallbacks. Acceptable as a
conservative default, but it can mislead the matching logic (`README`/agent-instructions decision rules).

### L15. KAIA bird-management R&D is marginal scope
`space-kaia-discovered-12952` "공항 조류탐지 및 한국형 조류관리 핵심기술 개발"
(`data/space-programs.generated.json:927`, `aviation_industry`, relevance 58) is airport bird-strike R&D —
aviation-adjacent at best. It is shown by default in search because `aviation_industry` does not contain the
substring "adjacent" (`space-search.ts:48-50`). Low impact; flag only if precision matters.

---

## What is working well
- Deadline-bearing gating: records without `applicationEndDate` are routed to `excluded.json` with a reason
  (`scripts/ingest-space-programs.mjs:1173-1184`), matching the "deadline-unknown excluded" constraint.
- Hiring/admission/award exclusions are present in the per-source classifiers
  (`scripts/ingest-space-programs.mjs:329,367,413,439`) and no 채용/신입생/UST/포상 notices leaked into the
  generated set.
- Status is re-derived at runtime from the deadline in KST end-of-day terms
  (`date-utils.ts:3-33`, `space-data.ts:74`), so closed/active stays correct without re-ingestion.
- Defense/dual-use and adjacent categories are hidden by default in search
  (`space-search.ts:48-60`), consistent with the needs_review policy.
- Diff/history mechanics (added/removed/deadline-changed/status-changed, new/resolved exclusions) are sound
  and append-only (`scripts/run-space-refresh.mjs:56-99,159-176`) — subject to the M6 abort caveat.
- Researcher/lab calls *are* present in the dataset (KARI 위탁연구 x9+, KASI 32235), so coverage exists even
  though labeling quality needs M5/M8 fixes.

## Suggested priority order
1. Remove `curatedSources` / forbid manual records + add a check that fails on them (H1, H2, M7, M9).
2. Add exhibition/event and procurement/입찰/제안공고/BTL exclusions to the classifiers (H3, H4).
3. Fix KARI researcher eligibility/targetCompanyType labeling (M5) and KASI body extraction (M8).
4. Make refresh write diff/history even when `check:space` fails (M6).
5. Harden short-year deadline parsing (M10); tighten defense-by-family search gate (L11).
