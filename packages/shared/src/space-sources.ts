import type {
  SpaceProgram,
  SpaceProgramSummary,
  SpaceSourceComplianceCheck,
  SpaceSourceReview
} from "./types.js";

const disclaimer =
  "본 요약은 검토 보조용입니다. 최종 신청 가능 여부와 제출 요건은 원문 공고 및 담당기관에서 확인해야 합니다.";

const metadataOnlyLegalPolicy = {
  legalReviewStatus: "metadata_only_policy" as const,
  storagePolicy:
    "Store source URL, title, agency, dates, categories, short summary, deadline evidence snippet, and eligibility metadata only. Do not store full notice or full attachment text until source terms are reviewed.",
  commercialUseAllowed: undefined,
  attributionRequired: true,
  redistributionAllowed: false
};

export const spaceSourceReviews: SpaceSourceReview[] = [
  {
    sourceFamily: "KASA",
    sourceName: "우주항공청",
    officialUrl: "https://www.kasa.go.kr/",
    sourceType: "official_notices",
    mvpStatus: "metadata_only",
    ...metadataOnlyLegalPolicy,
    collectionPolicy: "Official notices first; store metadata, dates, categories, and source URL until reuse terms are reviewed.",
    coverage: "Core space policy, industry support, commercialization, and R&D notices.",
    knownGaps: ["Notice board structure and reuse terms must be confirmed before full-text storage."],
    notes: ["Primary MVP source."]
  },
  {
    sourceFamily: "KARI",
    sourceName: "한국항공우주연구원",
    officialUrl: "https://www.kari.re.kr/",
    sourceType: "official_notices",
    mvpStatus: "metadata_only",
    ...metadataOnlyLegalPolicy,
    collectionPolicy: "Collect deadline-bearing research project, enterprise-support, or public collaboration notices only; keep full documents out until terms are reviewed.",
    coverage: "Aerospace research projects, university/lab collaboration, technology transfer, industry cooperation, and enterprise support notices.",
    knownGaps: ["Many notices may be general announcements rather than concrete support or research project calls."],
    notes: ["Classify researcher/lab opportunities separately from direct company-support notices."]
  },
  {
    sourceFamily: "KASI",
    sourceName: "한국천문연구원",
    officialUrl: "https://www.kasi.re.kr/",
    sourceType: "official_notices",
    mvpStatus: "metadata_only",
    ...metadataOnlyLegalPolicy,
    collectionPolicy: "Collect public deadline-bearing astronomy, space-science, observation-infrastructure, and researcher-support notices conservatively.",
    coverage: "Astronomy, space science, researcher support, university/lab opportunities, observation infrastructure, and space surveillance collaboration notices.",
    knownGaps: ["Private-company eligibility may be uncommon or unclear; many opportunities are researcher, lab, or institute oriented."],
    notes: ["Researcher/lab eligibility should be shown separately from company eligibility."]
  },
  {
    sourceFamily: "DAPA",
    sourceName: "방위사업청",
    officialUrl: "https://www.dapa.go.kr/",
    sourceType: "public_defense_notices",
    mvpStatus: "metadata_only",
    ...metadataOnlyLegalPolicy,
    collectionPolicy: "Public metadata only; do not ingest restricted, login-gated, classified, or export-controlled details.",
    coverage: "Defense-space, surveillance, satellite, payload, defense-aerospace, and public R&D/procurement notices.",
    knownGaps: ["Eligibility, security, export-control, and defense qualification requirements usually need manual review."],
    notes: ["Always return needs_review warnings for defense or dual-use notices."]
  },
  {
    sourceFamily: "KRIT",
    sourceName: "국방기술진흥연구소",
    officialUrl: "https://www.krit.re.kr/",
    sourceType: "public_defense_rd_notices",
    mvpStatus: "metadata_only",
    ...metadataOnlyLegalPolicy,
    collectionPolicy: "Public metadata only; store source links and conservative summaries until reuse and sensitivity are reviewed.",
    coverage: "Defense R&D and defense-industry support notices with possible space or aerospace relevance.",
    knownGaps: ["Source reuse terms and notice sensitivity must be reviewed per source page."],
    notes: ["Treat as defense or dual-use by default when space/aerospace defense terms are present."]
  },
  {
    sourceFamily: "ADD",
    sourceName: "국방과학연구소",
    officialUrl: "https://www.add.re.kr/",
    sourceType: "public_defense_rd_proposal_notices",
    mvpStatus: "metadata_only",
    ...metadataOnlyLegalPolicy,
    collectionPolicy: "Public proposal-call metadata only; do not ingest restricted, login-gated, classified, or export-controlled details.",
    coverage: "Public defense R&D proposal calls with explicit defense-space, aerospace, drone, unmanned-system, or surveillance/reconnaissance relevance.",
    knownGaps: ["Eligibility, security, export-control, and proposal requirements require manual review from the original notice and attachments."],
    notes: ["Always treat ADD notices as defense or dual-use and keep generated records metadata-centered."]
  },
  {
    sourceFamily: "MOTIE_KEIT",
    sourceName: "산업통상자원부/한국산업기술기획평가원",
    officialUrl: "https://www.keit.re.kr/",
    sourceType: "industrial_rd_notices",
    mvpStatus: "metadata_only",
    ...metadataOnlyLegalPolicy,
    collectionPolicy: "Keyword-filter aerospace, space-parts, materials, advanced manufacturing, and commercialization notices.",
    coverage: "Aerospace parts/materials, advanced manufacturing, and industrial R&D programs.",
    knownGaps: ["Not all aerospace-adjacent programs are space-relevant enough for the MVP."],
    notes: ["Mark partial matches as adjacent_space or space_parts_materials."]
  },
  {
    sourceFamily: "MOTIE_KEIT_KIAT",
    sourceName: "산업통상자원부/KEIT/KIAT 계열",
    officialUrl: "https://www.bizinfo.go.kr/",
    sourceType: "industrial_support_notices",
    mvpStatus: "metadata_only",
    ...metadataOnlyLegalPolicy,
    collectionPolicy: "Use official Bizinfo public support-notice pages; keep only clear aerospace, space, drone, defense-aerospace, or industrial R&D support notices.",
    coverage: "Industrial R&D, commercialization, defense-aerospace, aerospace parts, and SME support notices surfaced through Bizinfo.",
    knownGaps: ["Bizinfo aggregates many non-space SME notices; classifier must stay conservative.", "Official source agency may differ from Bizinfo aggregator."],
    notes: ["Do not ingest event-only, portal-only, or generic manufacturing notices without explicit space/aerospace/defense/drone signals."]
  },
  {
    sourceFamily: "KIAT",
    sourceName: "한국산업기술진흥원",
    officialUrl: "https://www.kiat.or.kr/",
    sourceType: "industrial_support_rd_notices",
    mvpStatus: "metadata_only",
    ...metadataOnlyLegalPolicy,
    collectionPolicy: "Keyword-filter public KIAT business notices only; keep concrete deadline-bearing R&D, commercialization, or infrastructure calls with explicit space, aerospace, drone/UAM, or unmanned-system signals.",
    coverage: "Industrial technology R&D, commercialization, and infrastructure support notices with direct aerospace/space relevance.",
    knownGaps: ["The homepage feed can contain demand surveys, technology-transfer notices, and generic industry programs that are not support-program calls.", "Current public feed may produce zero records when no explicit aerospace/space notice is active."],
    notes: ["Exclude demand surveys, technology donation/transfer notices, events, seminars, guide pages, and generic manufacturing notices without direct domain signals."]
  },
  {
    sourceFamily: "TIPA_SMTECH",
    sourceName: "중소기업기술정보진흥원/SMTECH",
    officialUrl: "https://www.smtech.go.kr/",
    sourceType: "sme_rd_notices",
    mvpStatus: "metadata_only",
    ...metadataOnlyLegalPolicy,
    collectionPolicy: "Keyword-filter public SME R&D notices only; keep explicit space/aerospace, defense-aerospace, drone/UAM, or unmanned-system R&D calls.",
    coverage: "SME technology-development R&D calls, including selected deeptech challenge projects with explicit aerospace/space relevance.",
    knownGaps: ["IRIS-system rows on the SMTECH notice list use a javascript:goMove() handler that opens iris.go.kr root without exposing a notice id, so no stable per-notice IRIS detail URL can be reconstructed from this public page; SMTECH-system rows carry a stable notice02_detail.do detail URL which the crawler canonicalizes by stripping jsessionid."],
    notes: ["Do not include generic SME R&D, generic manufacturing, research-manpower, IR events, or broad support notices without explicit domain signals."]
  },
  {
    sourceFamily: "BIZINFO",
    sourceName: "기업마당",
    officialUrl: "https://www.bizinfo.go.kr/",
    sourceType: "sme_support_notice_aggregator",
    mvpStatus: "metadata_only",
    ...metadataOnlyLegalPolicy,
    collectionPolicy: "Keyword-filter public support notices only; store source URL, dates, agency metadata, and short summaries.",
    coverage: "SME support, regional cluster, commercialization, exhibition, drone, defense-aerospace, and space-industry notices.",
    knownGaps: ["Aggregator pages can include broad events or generic support programs that must be excluded unless clearly relevant."],
    notes: ["Use as a discovery source for real support-program notices, not as a generic SME-support corpus."]
  },
  {
    sourceFamily: "KSTARTUP",
    sourceName: "K-Startup 창업지원포털",
    officialUrl: "https://www.k-startup.go.kr/",
    sourceType: "startup_support_notice_aggregator",
    mvpStatus: "metadata_only",
    ...metadataOnlyLegalPolicy,
    collectionPolicy: "Keyword-filter public startup support notices only; keep explicit space, aerospace, satellite, drone/UAM, or defense-aerospace startup opportunities.",
    coverage: "Startup support, pre-founder support, mentoring, commercialization, and open-innovation notices with clear space/aerospace relevance.",
    knownGaps: ["K-Startup includes many generic startup, education-only, event-only, incubator, and networking notices."],
    notes: ["Exclude education-only, event-only, generic deeptech, and portal-like notices unless the public notice is a concrete deadline-bearing support program."]
  },
  {
    sourceFamily: "GNTP",
    sourceName: "경남테크노파크",
    officialUrl: "https://www.gntp.or.kr/",
    sourceType: "regional_cluster_support_notices",
    mvpStatus: "metadata_only",
    ...metadataOnlyLegalPolicy,
    collectionPolicy: "Keyword-filter public regional support notices only; keep explicit space/aerospace/aviation/drone or defense-aerospace regional opportunities.",
    coverage: "Gyeongnam regional aerospace, space-AI, aviation industry, and cluster support notices.",
    knownGaps: ["The support list includes many generic regional business, safety, ESG, consulting, and non-space programs."],
    notes: ["Use only concrete deadline-bearing support notices and preserve regional eligibility requirements."]
  },
  {
    sourceFamily: "DJTP",
    sourceName: "대전테크노파크",
    officialUrl: "https://www.djtp.or.kr/",
    sourceType: "regional_cluster_support_notices",
    mvpStatus: "metadata_only",
    ...metadataOnlyLegalPolicy,
    collectionPolicy: "Keyword-filter public Daejeon TP support notices only; keep explicit space-industry, defense-space materials/parts, drone, unmanned-system, or aerospace regional support calls.",
    coverage: "Daejeon regional space industry, defense-space materials/parts, 3D printing prototype support, drone/defense cluster, and commercialization support notices.",
    knownGaps: ["The business-notice list includes exhibitions, internships, general 3D-printing, tenant recruitment, selection results, and generic regional support programs.", "Many notices are PDF-first, and direct /pbanc/*.pdf paths can return 404, so deadline evidence may come from public list metadata."],
    notes: ["Preserve Daejeon regional eligibility and per-notice PMS viewer URLs; exclude event/exhibition-only and result notices."]
  },
  {
    sourceFamily: "JNTP",
    sourceName: "전남테크노파크",
    officialUrl: "https://www.jntp.or.kr/",
    sourceType: "regional_cluster_support_notices",
    mvpStatus: "metadata_only",
    ...metadataOnlyLegalPolicy,
    collectionPolicy: "Keyword-filter public Jeonnam TP regional business notices only; keep explicit satellite, space, aerospace, drone, UAM, or unmanned-system support calls.",
    coverage: "Jeonnam regional satellite, drone, aerospace, Goheung Drone Center, and space-industry support notices.",
    knownGaps: ["The regional business feed contains broad R&D, energy, plastics, agriculture, and generic regional support programs.", "Some detail pages expose attachments on a separate data domain; keep metadata and source URL unless terms are reviewed."],
    notes: ["Preserve Jeonnam regional eligibility and source URLs; exclude generic R&D or business support without direct space/aerospace/drone signals."]
  },
  {
    sourceFamily: "ITP",
    sourceName: "인천테크노파크",
    officialUrl: "https://www.itp.or.kr/",
    sourceType: "regional_cluster_support_notices",
    mvpStatus: "metadata_only",
    ...metadataOnlyLegalPolicy,
    collectionPolicy: "Keyword-filter public Incheon TP support notices only; keep explicit drone, PAV/UAM/AAV, aerospace, or aviation-industry support calls with readable deadlines.",
    coverage: "Incheon regional drone, PAV/UAM, aviation-industry, and mobility demonstration support notices.",
    knownGaps: ["Direct HTTP requests may return an error page for valid details; the ingestion uses a reader fallback for public metadata.", "The source includes broad startup, airport, event, seminar, and always-open notices that should not be included without direct aerospace/drone/PAV signals and a readable deadline."],
    notes: ["Preserve Incheon regional eligibility and keep evidence snippets short; exclude airport-only or generic startup notices without direct aerospace/drone/PAV terms."]
  },
  {
    sourceFamily: "MOLIT_KAIA",
    sourceName: "국토교통부/국토교통과학기술진흥원",
    officialUrl: "https://www.kaia.re.kr/",
    sourceType: "transport_rd_notices",
    mvpStatus: "metadata_only",
    ...metadataOnlyLegalPolicy,
    collectionPolicy: "Keyword-filter aviation, UAM, drone, aerospace infrastructure, and safety notices; mark UAM/drone as adjacent.",
    coverage: "Aviation, UAM, drone, aerospace infrastructure, and aviation safety R&D notices.",
    knownGaps: ["Many notices are aviation-only and should not be marketed as core space programs."],
    notes: ["Use adjacent categories unless the notice is explicitly space/aerospace."]
  }
];

export function getSpaceSourceReview(sourceFamily: string): SpaceSourceReview | undefined {
  return spaceSourceReviews.find((source) => source.sourceFamily === sourceFamily);
}

export function checkSpaceProgramSourceCompliance(program: SpaceProgram): SpaceSourceComplianceCheck {
  const review = getSpaceSourceReview(program.sourceFamily);
  const warnings: string[] = [];

  if (!review) {
    return {
      sourceFamily: program.sourceFamily,
      status: "unknown",
      allowedForMvp: false,
      canStoreFullText: false,
      warnings: ["Source family is not in the MVP source registry."]
    };
  }

  if (review.mvpStatus === "backlog") {
    warnings.push("Source is marked backlog and should not be ingested before MVP source quality is verified.");
  }

  if (review.mvpStatus === "needs_legal_review") {
    warnings.push("Source needs legal/reuse review before paid-product ingestion.");
  }

  if (review.legalReviewStatus !== "approved") {
    warnings.push(`Source legal review status is ${review.legalReviewStatus ?? "not_started"}; keep metadata-only handling.`);
  }

  if (review.mvpStatus === "metadata_only") {
    warnings.push("Store metadata and source URL only until reuse terms are reviewed.");
  }

  if (review.storagePolicy) {
    warnings.push(`Storage policy: ${review.storagePolicy}`);
  }

  if (program.defenseOrDualUse) {
    warnings.push("Defense or dual-use notice: keep public metadata only and require manual review.");
  }

  if (program.restrictedNotice) {
    warnings.push("Restricted notice: do not store full text or documents.");
  }

  return {
    sourceFamily: review.sourceFamily,
    status: review.mvpStatus,
    allowedForMvp: review.mvpStatus !== "backlog" && review.mvpStatus !== "needs_legal_review",
    canStoreFullText:
      review.mvpStatus === "approved" && !program.defenseOrDualUse && !program.restrictedNotice,
    warnings
  };
}

export function summarizeSpaceProgram(program: SpaceProgram): SpaceProgramSummary {
  const compliance = checkSpaceProgramSourceCompliance(program);
  const warnings = [
    ...compliance.warnings,
    program.defenseOrDualUse
      ? "국방/방산 또는 dual-use 공고이므로 보안요건, 수출통제, 참여자격 확인이 필요합니다."
      : undefined,
    program.restrictedNotice ? "제한 공고로 표시되어 원문 metadata 중심 검토가 필요합니다." : undefined,
    program.consortiumRequired ? "컨소시엄 구성이 필요할 수 있습니다." : undefined,
    program.universityOrResearchPartnerRequired ? "대학 또는 출연연 파트너가 필요할 수 있습니다." : undefined
  ].filter((warning): warning is string => Boolean(warning));

  return {
    title: program.title,
    agency: program.agency,
    purpose: program.summary ?? program.title,
    target: program.eligibilityText ?? "지원대상은 원문 공고 확인이 필요합니다.",
    spaceCategory: program.spaceCategory,
    technologyAreas: program.technologyAreas,
    supportAmount: program.supportAmountText,
    applicationDeadline: program.applicationEndDate,
    participationType: program.participationType,
    consortiumRequired: program.consortiumRequired,
    universityOrResearchPartnerRequired: program.universityOrResearchPartnerRequired,
    requiredDocuments: program.requiredDocuments,
    restrictions: program.restrictions,
    securityRequirements: program.securityRequirements,
    warnings,
    sourceUrl: program.sourceUrl,
    lastCheckedAt: program.lastCheckedAt,
    disclaimer
  };
}
