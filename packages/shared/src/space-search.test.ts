import assert from "node:assert/strict";
import test from "node:test";
import {
  getExcludedSpacePrograms,
  getSpaceIngestReport,
  getSpacePrograms,
  searchSpacePrograms
} from "./index.js";

test("runtime space data excludes sample-only records by default", () => {
  const ids = getSpacePrograms().map((program) => program.id);

  assert.equal(ids.includes("space-kari-sample-family"), false);
  assert.equal(ids.includes("space-kasa-001"), false);
  assert.equal(ids.includes("space-dapa-003"), false);
});

test("generated runtime records are deadline-bearing program notices", () => {
  const programs = getSpacePrograms();

  assert.ok(programs.length > 0);
  assert.equal(programs.some((program) => !program.applicationEndDate), false);
});

test("ingest audit report and excluded candidates are readable", () => {
  const report = getSpaceIngestReport();
  const excluded = getExcludedSpacePrograms();

  assert.ok(report);
  assert.equal(report.generatedCount, getSpacePrograms().length);
  assert.equal(report.excludedCount, excluded.length);
  assert.ok(report.sourceFamilyAudit?.length);
  assert.equal(report.sourceFamilyAudit.reduce((sum, item) => sum + item.generatedCount, 0), report.generatedCount);
  assert.ok(report.discoveryRunAudit?.length);
  assert.equal(report.discoveryRunAudit.reduce((sum, item) => sum + item.discoveredCount, 0), report.discoveredSourceCount);
  assert.ok(excluded.every((program) => program.reason.length > 0 && program.sourceUrl.startsWith("https://")));
});

test("companyStage filter is applied to searchable program text", () => {
  const matches = searchSpacePrograms({
    companyStage: "위탁연구과제",
    includeAdjacent: true,
    includeDefense: true,
    includeClosed: true,
    limit: 10
  });

  assert.ok(matches.some((program) => program.id === "space-kari-discovered-18659"));
});

test("companyStage filter can exclude non-matching programs", () => {
  const matches = searchSpacePrograms({
    companyStage: "존재하지않는기업단계",
    includeAdjacent: true,
    includeDefense: true,
    limit: 10
  });

  assert.equal(matches.length, 0);
});

test("applicantType can find researcher and lab oriented programs", () => {
  const matches = searchSpacePrograms({
    applicantType: "researcher_or_lab",
    includeAdjacent: true,
    includeDefense: true,
    includeClosed: true,
    limit: 20
  });

  assert.ok(matches.length > 0);
  assert.ok(matches.some((program) => program.universityOrResearchPartnerRequired));
});

test("applicantType can find company oriented programs", () => {
  const matches = searchSpacePrograms({
    applicantType: "company",
    includeAdjacent: true,
    includeDefense: true,
    includeClosed: true,
    limit: 20
  });

  assert.ok(matches.length > 0);
  assert.ok(matches.some((program) => /기업|중소|중견|사업화|상용화/.test(`${program.title} ${program.eligibilityText ?? ""} ${program.targetCompanyType ?? ""}`)));
});

test("defenseOnly and adjacentOnly expose explicit defense and adjacent searches", () => {
  const defenseMatches = searchSpacePrograms({
    defenseOnly: true,
    includeAdjacent: true,
    includeClosed: true,
    limit: 20
  });
  const adjacentMatches = searchSpacePrograms({
    adjacentOnly: true,
    includeDefense: true,
    includeClosed: true,
    limit: 20
  });

  assert.ok(defenseMatches.length > 0);
  assert.equal(defenseMatches.every((program) => program.defenseOrDualUse || program.spaceCategory.includes("defense")), true);
  assert.ok(adjacentMatches.length > 0);
  assert.equal(adjacentMatches.every((program) => program.spaceCategory.includes("adjacent")), true);
});

test("defenseOnly includes defense-adjacent categories without a separate adjacent opt-in", () => {
  const matches = searchSpacePrograms({
    defenseOnly: true,
    includeClosed: true,
    limit: 20
  });

  assert.ok(matches.length > 0);
  assert.equal(matches.every((program) => program.defenseOrDualUse || program.spaceCategory.includes("defense")), true);
});

test("generated records exclude pure event/exhibition/contest notices", () => {
  const programs = getSpacePrograms();
  const eventOnlyPattern = /(?:컨퍼런스|학술대회|박람회|전시회\s*참가|경진대회|공모전|아이디어\s*대회|피칭\s*행사|설명회\s*개최|포럼\s*개최|세미나\s*개최)/;
  const offenders = programs.filter((program) => eventOnlyPattern.test(program.title));
  assert.equal(offenders.length, 0, `event-only notices leaked into generated records: ${offenders.map((p) => p.title).join(" | ")}`);
});

test("BIZINFO records carry an original-agency provenance URL", () => {
  const bizinfo = getSpacePrograms().filter((program) => program.sourceFamily === "BIZINFO");
  if (bizinfo.length === 0) return;
  const withProvenance = bizinfo.filter((program) => program.originalAgencyUrl);
  assert.ok(
    withProvenance.length / bizinfo.length >= 0.8,
    `BIZINFO originalAgencyUrl coverage too low: ${withProvenance.length}/${bizinfo.length}`
  );
  assert.ok(withProvenance.every((program) => /^https?:\/\//.test(program.originalAgencyUrl ?? "")));
});
