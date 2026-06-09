import { writeFile } from "node:fs/promises";
import { getSpaceIngestReport, searchSpacePrograms } from "@bidscout/shared";

const reportPath = "data/space-search-sample-report.json";

const includesAny = (text, pattern) => pattern.test(text);

const programText = (program) => [
  program.title,
  program.summary,
  program.eligibilityText,
  program.targetCompanyType,
  program.participationType,
  program.industries?.join(" "),
  program.technologyAreas?.join(" ")
].join(" ");

const scenarios = [
  {
    name: "researcher_or_lab_general",
    purpose: "대학 연구실, 연구자, 연구팀 대상 과제 검색",
    input: {
      applicantType: "researcher_or_lab",
      includeClosed: true,
      includeAdjacent: true,
      includeDefense: true,
      limit: 10
    },
    minResults: 3,
    validate: (results) => results.some((program) => program.universityOrResearchPartnerRequired === true)
  },
  {
    name: "company_support_general",
    purpose: "기업/사업화 지원 공고 검색",
    input: {
      applicantType: "company",
      includeClosed: true,
      includeAdjacent: true,
      includeDefense: true,
      limit: 10
    },
    minResults: 3,
    validate: (results) => results.some((program) => includesAny(programText(program), /기업|중소|중견|사업화|상용화|수혜기업/))
  },
  {
    name: "startup_prefounder_general",
    purpose: "예비창업자/스타트업 항공우주 지원 검색",
    input: {
      applicantType: "startup_or_prefounder",
      includeClosed: true,
      includeAdjacent: true,
      includeDefense: true,
      limit: 10
    },
    minResults: 1,
    validate: (results) => results.some((program) => includesAny(programText(program), /예비창업|창업|스타트업|벤처/))
  },
  {
    name: "drone_uam_adjacent",
    purpose: "드론/UAM 인접분야 검색",
    input: {
      query: "드론",
      adjacentOnly: true,
      includeClosed: true,
      limit: 10
    },
    minResults: 1,
    validate: (results) => results.every((program) => program.spaceCategory.includes("adjacent"))
  },
  {
    name: "defense_only",
    purpose: "방산/국방 항공우주 검색",
    input: {
      defenseOnly: true,
      includeClosed: true,
      limit: 10
    },
    minResults: 1,
    validate: (results) => results.every((program) => program.defenseOrDualUse || program.spaceCategory.includes("defense"))
  },
  {
    name: "upcoming_deadlines_30_days",
    purpose: "30일 이내 active 마감 공고 정렬 검색",
    input: {
      deadlineWithinDays: 30,
      includeAdjacent: true,
      includeDefense: true,
      sortBy: "deadline",
      limit: 10
    },
    minResults: 0,
    warnIfEmpty: true,
    validate: (results) => results.every((program) => program.status === "active")
  }
];

const failures = [];
const warnings = [];
const samples = scenarios.map((scenario) => {
  const results = searchSpacePrograms(scenario.input);
  const valid = scenario.validate(results);

  if (results.length < scenario.minResults) {
    failures.push(`${scenario.name}: expected at least ${scenario.minResults} results, got ${results.length}`);
  }

  if (!valid) {
    failures.push(`${scenario.name}: result invariant failed`);
  }

  if (scenario.warnIfEmpty && results.length === 0) {
    warnings.push(`${scenario.name}: no current results; this can be valid outside active announcement windows`);
  }

  return {
    name: scenario.name,
    purpose: scenario.purpose,
    input: scenario.input,
    count: results.length,
    topResults: results.slice(0, 5).map((program) => ({
      id: program.id,
      sourceFamily: program.sourceFamily,
      title: program.title,
      status: program.status,
      spaceCategory: program.spaceCategory,
      deadline: program.applicationEndDate,
      sourceUrl: program.sourceUrl
    }))
  };
});

const report = {
  checkedAt: new Date().toISOString(),
  ingestReport: getSpaceIngestReport(),
  samples,
  warnings,
  failures
};

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log("Space search sample verification");
console.log("");
for (const sample of samples) {
  console.log(`- ${sample.name}: ${sample.count} results`);
  for (const result of sample.topResults.slice(0, 3)) {
    console.log(`  - [${result.sourceFamily}] ${result.title} (${result.deadline}, ${result.status})`);
  }
}
console.log("");
console.log(`Warnings: ${warnings.length}`);
for (const warning of warnings) console.log(`  - ${warning}`);
console.log(`Failures: ${failures.length}`);
for (const failure of failures) console.log(`  - ${failure}`);
console.log(`Wrote ${reportPath}`);

if (failures.length > 0) {
  process.exitCode = 1;
}
