import type { Tender } from "./types.js";

const now = new Date().toISOString();

export const sampleTenders: Tender[] = [
  {
    id: "tender-cyber-001",
    source: "contracts_finder_sample",
    externalId: "CF-SAMPLE-001",
    title: "Cyber Security Testing Services",
    buyerName: "Example Council",
    description:
      "A local authority seeks penetration testing, vulnerability assessment, and security audit services for public-facing digital systems.",
    cpvCodes: ["72000000", "72800000"],
    region: "North West",
    country: "England",
    valueMin: 80000,
    valueMax: 120000,
    currency: "GBP",
    publishedAt: now,
    deadlineAt: "2026-08-12T17:00:00Z",
    noticeType: "opportunity",
    procurementStage: "open",
    status: "active",
    isCancelled: false,
    isAwarded: false,
    sourceUrl: "https://www.contractsfinder.service.gov.uk/",
    documentUrls: [],
    normalizedText:
      "cyber security testing penetration testing vulnerability assessment security audit public sector digital systems",
    lastCheckedAt: now
  },
  {
    id: "tender-digital-002",
    source: "contracts_finder_sample",
    externalId: "CF-SAMPLE-002",
    title: "Digital Transformation Discovery Partner",
    buyerName: "Example NHS Trust",
    description:
      "Discovery and service design partner required for digital transformation of internal operations and patient communication workflows.",
    cpvCodes: ["72000000", "72224000"],
    region: "London",
    country: "England",
    valueMin: 50000,
    valueMax: 180000,
    currency: "GBP",
    publishedAt: now,
    deadlineAt: "2026-07-30T12:00:00Z",
    noticeType: "opportunity",
    procurementStage: "open",
    status: "active",
    isCancelled: false,
    isAwarded: false,
    sourceUrl: "https://www.contractsfinder.service.gov.uk/",
    documentUrls: [],
    normalizedText:
      "digital transformation discovery service design internal operations patient communication workflows consultancy",
    lastCheckedAt: now
  },
  {
    id: "tender-training-003",
    source: "contracts_finder_sample",
    externalId: "CF-SAMPLE-003",
    title: "SME Business Training Framework",
    buyerName: "Example Combined Authority",
    description:
      "Framework for suppliers delivering business training, mentoring, and digital skills workshops to small and medium-sized enterprises.",
    cpvCodes: ["80500000", "79400000"],
    region: "West Midlands",
    country: "England",
    valueMin: 10000,
    valueMax: 75000,
    currency: "GBP",
    publishedAt: now,
    deadlineAt: "2026-09-05T17:00:00Z",
    noticeType: "opportunity",
    procurementStage: "open",
    status: "active",
    isCancelled: false,
    isAwarded: false,
    sourceUrl: "https://www.contractsfinder.service.gov.uk/",
    documentUrls: [],
    normalizedText:
      "business training mentoring digital skills workshops small medium enterprises SME consulting",
    lastCheckedAt: now
  }
];
