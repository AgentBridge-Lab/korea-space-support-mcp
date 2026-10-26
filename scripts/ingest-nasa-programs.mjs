import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const NASA_WINDOW = { from: "2026-04-01", through: "2026-10-26" };
const blogApi = "https://science.nasa.gov/wp-json/wp/v2/topic?internal-terms=6468&per_page=100";
const blogUrl = "https://science.nasa.gov/researchers/solicitations/roses-2025/";
const summaryUrl = "https://nspires.nasaprs.com/external/solicitations/summary.do?solNum=";
const summaryPolicyUrl = "https://nspires.nasaprs.com/external/viewrepositorydocument?cmdocumentid=1053488&solicitationId=%7BA952E51B-7AD4-B180-2F8C-4E8A79AFFAED%7D&viewSolicitationDocument=1";

// Reviewed source selectors and participation decisions, not hand-entered records.
// Titles, publication dates, due dates and documents are read from official sources.
const rosesReviews = [
  ["hamaq", 54, "A.12", "proposal", "foreign_pi", "항공 관측 기반 대기질 연구팀", "space_data"],
  ["apra", 56, "D.6", "noi", "foreign_pi", "천체물리 관측장비·서브오비탈·큐브위성 연구", "astronomy_space_science"],
  ["sat", 56, "D.7", "proposal", "foreign_pi", "우주망원경 전략기술 성숙도 향상", "astronomy_space_science"],
  ["aes", 62, "A.13", "proposal", "foreign_pi", "지구관측 자료를 이용한 미국 내 현안 해결", "space_data"],
  ["atmos", 63, "A.14", "noi", "foreign_pi", "위성·항공·모델 기반 대기 연구", "space_data"],
  ["bios", 64, "A.15", "step1", "foreign_pi", "지구관측 기반 생물권 연구", "space_data"],
  ["psef", 65, "C.4", "proposal", "foreign_pi", "행성과학 연구 기반시설 및 연구역량", "astronomy_space_science"],
  ["hwopsi", 68, "D.8", "noi", "foreign_pi", "Habitable Worlds Observatory 선행과학 연구", "astronomy_space_science"],
  ["hwoica", 69, "D.9", "proposal", "collaborator_only", "Habitable Worlds Observatory 관측장비 개념 평가", "astronomy_space_science"],
  ["tcan", 70, "D.4", "noi", "foreign_pi", "이론·계산 천체물리 연구 네트워크", "astronomy_space_science"],
  ["cryo", 71, "A.16", "noi", "foreign_pi", "위성관측 및 모델 기반 빙권 연구", "space_data"],
  ["hydro", 72, "A.17", "step1", "foreign_pi", "위성관측 및 모델 기반 수권 연구", "space_data"],
  ["geo", 77, "A.18", "noi", "foreign_pi", "지구관측 기반 지질재해·지각·자원 연구", "space_data"],
  ["lcas", 78, "B.7", "step1", "collaborator_only", "태양·우주환경 관측장비 및 저비용 비행실증", "astronomy_space_science"],
  ["ssf", 79, "B.8", "step1", "foreign_pi", "태양·지구 우주환경 미래 우주비행 과학 기반 연구", "astronomy_space_science"],
  ["ixpe-cycle4", 57, "D.3", "phase1", "foreign_pi", "IXPE Cycle 4 일반관측 연구", "astronomy_space_science"],
  ["nicer-cycle9", 57, "D.3", "phase1", "foreign_pi", "NICER Cycle 9 일반관측 연구", "astronomy_space_science"],
  ["nustar-cycle13", 76, "D.3", "phase1", "foreign_pi", "NuSTAR Cycle 13 일반관측 연구", "astronomy_space_science"],
  ["swift-cycle23", 80, "D.3", "phase1", "foreign_pi", "Swift Cycle 23 일반연구자 연구", "astronomy_space_science"],
  ["fermi-cycle20", 80, "D.3", "phase1", "foreign_pi", "Fermi Cycle 20 일반연구자 연구", "astronomy_space_science"],
  ["tess-cycle10", 80, "D.3", "phase1", "foreign_pi", "TESS Cycle 10 일반연구자 연구", "astronomy_space_science"]
].map(([key, amendment, code, stage, mode, description, category]) => ({ key, amendment, code, stage, mode, description, category }));

const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const englishDate = "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\.?\\s*\\d{1,2}(?:st|nd|rd|th)?[,]?\\s+20\\d{2}";
const memo = new Map();
const pdfMemo = new Map();
const htmlMemo = new Map();
const readerFallbacks = new Set();
const decode = (s) => s.replace(/&amp;|&#038;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&#8217;/g, "'").replace(/&#8211;|&#8212;/g, "-").replace(/&nbsp;|&#160;/g, " ");
const strip = (s) => decode(s.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
export const inNasaPublicationWindow = (date) => date >= NASA_WINDOW.from && date <= NASA_WINDOW.through;

export function parseEnglishDate(text) {
  text = text.replace(/(\d{1,2})\s+([A-Za-z]+)\s+(20\d{2})/, "$2 $1, $3");
  const match = text.match(/([A-Za-z]+)\.?\s*(\d{1,2})(?:st|nd|rd|th)?[,]?\s+(20\d{2})/);
  if (!match) return undefined;
  const month = months.indexOf(match[1].slice(0, 3).toLowerCase()) + 1;
  if (!month) return undefined;
  const date = `${match[3]}-${String(month).padStart(2, "0")}-${match[2].padStart(2, "0")}`;
  return new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date ? date : undefined;
}

export function nasaEasternDeadline(date, hour = 23, minute = 59, second = 59) {
  const offset = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", timeZoneName: "longOffset" })
    .formatToParts(new Date(`${date}T12:00:00Z`)).find((part) => part.type === "timeZoneName").value.replace("GMT", "");
  return `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}${offset}`;
}

async function getBytes(url) {
  if (!memo.has(url)) memo.set(url, (async () => {
    const cacheDir = process.env.NASA_HTTP_CACHE_DIR;
    const cachePath = cacheDir ? join(cacheDir, createHash("sha256").update(url).digest("hex")) : undefined;
    if (cachePath) {
      try {
        const cached = JSON.parse(await readFile(`${cachePath}.json`, "utf8"));
        if (Date.now() - cached.fetchedAt < 3600000) return Buffer.from(cached.body, "base64");
      } catch { /* Fetch if the optional, temporary one-hour cache is absent. */ }
    }
    let lastError;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(30000), headers: { "user-agent": "KoreaSpaceSupportMCP/0.1 public metadata research" } });
        if (!response.ok) throw new Error(`NASA source HTTP ${response.status}: ${url}`);
        const bytes = Buffer.from(await response.arrayBuffer());
        if (cachePath) {
          await mkdir(cacheDir, { recursive: true });
          await writeFile(`${cachePath}.json`, JSON.stringify({ fetchedAt: Date.now(), body: bytes.toString("base64") }));
        }
        return bytes;
      } catch (error) { lastError = error; }
    }
    throw lastError;
  })());
  return memo.get(url);
}
const getHtml = async (url) => {
  if (!htmlMemo.has(url)) htmlMemo.set(url, (async () => {
    try { return (await getBytes(url)).toString("utf8"); }
    catch {
      const text = (await getBytes(`https://r.jina.ai/${url}`)).toString("utf8");
      if (/rate limit|failed to fetch|access denied/i.test(text)) throw new Error(`NASA public reader failed: ${url}`);
      readerFallbacks.add(url);
      return text;
    }
  })());
  return htmlMemo.get(url);
};

async function pdfText(url, extractPdfText) {
  const key = url.match(/cmdocumentid=(\d+)/)?.[1] ?? url;
  if (!pdfMemo.has(key)) pdfMemo.set(key, (async () => {
    const bytes = await getBytes(url);
    if (bytes.subarray(0, 4).toString() !== "%PDF") throw new Error(`NASA document is not a PDF: ${url}`);
    const dir = await mkdtemp(join(tmpdir(), "nasa-source-"));
    try { const path = join(dir, "notice.pdf"); await writeFile(path, bytes); return await extractPdfText(path); }
    finally { await rm(dir, { recursive: true, force: true }); }
  })());
  return pdfMemo.get(key);
}

export function parseNspires(html, url) {
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => strip(m[1]));
  const documents = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((m) => ({ url: new URL(decode(m[1]), url).href, title: strip(m[2]) })).filter((d) => /viewrepositorydocument/.test(d.url));
  return { rows: rows.filter((row) => /^(?:Release|Close|\S+.*(?:Due|due))\b/.test(row) && row.length < 300), documents, text: strip(html), url };
}

function articleBody(post) {
  let text = strip(post.content.rendered);
  const start = text.indexOf("Scientific Information Policy");
  if (start >= 0) text = text.slice(start + "Scientific Information Policy".length);
  return text.split(/Explore More|Keep Exploring/)[0];
}

export function selectNasaEntryDeadline(metadata, article, stage) {
  const rowPattern = stage === "noi" ? /NOIs? Due/i : stage === "step1" ? /Step[- ]1.*Due/i : stage === "phase1" ? /Phase[- ]1.*Due/i : /Proposals Due/i;
  // Budget invitations and the NSPIRES administrative Close field are not entry deadlines.
  const row = metadata.rows.find((r) => rowPattern.test(r) && !/budget|Phase[- ]2|Step[- ]2/i.test(r));
  if (row && parseEnglishDate(row)) {
    const time = row.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)/i);
    const hour = time ? Number(time[1]) % 12 + (/PM/i.test(time[4]) ? 12 : 0) : 23;
    return { date: nasaEasternDeadline(parseEnglishDate(row), hour, time ? Number(time[2]) : 59, time ? Number(time[3] ?? 0) : 59), evidence: row, url: metadata.url };
  }
  const stageLabel = stage === "step1" ? "Step[- ]1" : stage === "phase1" ? "Phase[- ]1" : stage === "noi" ? "(?:Mandatory\\s+)?(?:Notices of Intent|NOIs)" : "[Pp]roposals";
  const pattern = new RegExp(`(?:${stageLabel})[\\s\\S]{0,100}?(?:due|deadline)[\\s\\S]{0,50}?(${englishDate})`, "i");
  const match = article.text.match(pattern) ?? article.text.match(new RegExp(`(?:due date|deadline)[\\s\\S]{0,30}?(?:${stageLabel})[\\s\\S]{0,160}?(${englishDate})`, "i"));
  if (!match) throw new Error(`No verified NASA ${stage} entry deadline on ${article.url}`);
  // D.3 ARK/RPS observing Phase-1 proposals close at 4:30 pm Eastern (D.3 §15).
  return { date: nasaEasternDeadline(parseEnglishDate(match[1]), stage === "phase1" ? 16 : 23, stage === "phase1" ? 30 : 59, stage === "phase1" ? 0 : 59), evidence: match[0], url: article.url };
}

function makeProgram({ key, title, published, sourceUrl, announcementUrl, category, description, deadline, mode, eligibilityUrls, attachments = [], extraRestrictions = [], funding, participation, documents }) {
  if (!inNasaPublicationWindow(published)) throw new Error(`NASA publication outside requested window: ${published} ${title}`);
  const foreignPi = mode === "foreign_pi";
  const observing = mode === "observing";
  const eligibility = observing ? "한국 기관 소속 연구자도 관측 제안을 제출할 수 있습니다. 관측시간 배정과 연구비 지원은 별개입니다."
    : foreignPi ? "한국 기관의 연구자도 자체·국내 재원으로 PI 또는 공동연구자로 참여할 수 있습니다. 한국 기관 연구비·출장비를 NASA에서 지원하지 않습니다."
      : "한국 기관 소속 연구자는 미국 주관팀의 무자금 협력자로 참여할 수 있습니다. 한국 기관의 단독 주관 및 NASA 연구비 직접 수령은 허용되지 않습니다.";
  return {
    id: `space-nasa-${key}`, source: "nasa_reviewed_international_call", externalId: key,
    title, agency: "NASA / 국제공동연구", sourceUrl, originalAgencyUrl: announcementUrl,
    sourceType: "official_international_research_call", sourceFamily: "NASA_INTERNATIONAL",
    spaceCategory: category, relevanceScore: 88, dataReusePolicy: "metadata_and_short_summary",
    defenseOrDualUse: false, restrictedNotice: false, region: "국제", targetRegions: ["전국", "대한민국", "국제"],
    industries: ["우주과학", "항공우주", "국제공동연구"], technologyAreas: [description, "NASA", "국제협력"],
    targetCompanyType: "한국 대학·출연연·연구기관의 연구자·연구팀(공고별 국제참여 조건 적용)",
    announcementDate: published, applicationEndDate: deadline.date,
    deadlineSource: deadline.source ?? "source_metadata", deadlineEvidenceText: deadline.evidence.slice(0, 500), deadlineEvidenceUrl: deadline.url,
    summary: `${description}. ${eligibility}`, eligibilityText: eligibility,
    supportAmountText: funding ?? "한국 기관 연구비는 자체·국내 재원으로 부담(no exchange of funds).",
    requiredDocuments: documents ?? ["해당 공고의 제안서·필수 서식", "외국기관의 재원 지원 확약서(해당 시)", "NSPIRES 연구자·기관 등록 또는 Foreign PI 절차"],
    restrictions: ["한국 기관 참여 가능 여부는 국적보다 소속기관·제안 역할 및 공고별 조건으로 판단", funding ?? "NASA의 한국 기관 연구비 직접지원 없음", ...(deadline.note ? [deadline.note] : []), ...extraRestrictions],
    securityRequirements: [], participationType: participation ?? (observing ? "국제 관측시간 신청" : foreignPi ? "국제공동연구·외국기관 무자금 PI/Co-I" : "미국 주관팀의 무자금 Collaborator"),
    leadApplicantAllowed: observing || foreignPi ? "한국 기관 소속 PI 가능(공고별 자격 및 자체 재원 조건 적용)" : "미국 기관 주관, 한국 기관은 무자금 협력자",
    consortiumRequired: !observing && !foreignPi, universityOrResearchPartnerRequired: true,
    qualificationNotes: `국제참여 근거: ${eligibilityUrls.join(" ; ")}`,
    attachmentUrls: [...new Set([...attachments, ...eligibilityUrls.filter((u) => /viewrepositorydocument|\.pdf/.test(u))])],
    status: new Date(deadline.date).getTime() < Date.now() ? "closed" : "active", lastCheckedAt: new Date().toISOString()
  };
}

async function mapFour(items, fn) {
  const results = [];
  for (let index = 0; index < items.length; index += 4) results.push(...await Promise.all(items.slice(index, index + 4).map(fn)));
  return results;
}

export async function discoverNasaSources({ extractPdfText }) {
  const posts = JSON.parse(await getHtml(`${blogApi}&after=${NASA_WINDOW.from}T00:00:00&before=${NASA_WINDOW.through}T23:59:59`));
  if (!Array.isArray(posts) || posts.length === 0) throw new Error("NASA ROSES discovery returned no dated official announcements");
  const policyText = await pdfText(summaryPolicyUrl, extractPdfText);
  if (!/non-U\.S\. organizations.*?welcome.*?no.*?exchange of funds/i.test(policyText)) throw new Error("NASA foreign-participation policy requires renewed review");
  const audit = [];
  const programs = await mapFour(rosesReviews, async (review) => {
    const post = posts.find((p) => new RegExp(`^Amendment ${review.amendment}:`).test(decode(p.title.rendered)));
    if (!post) throw new Error(`NASA reviewed announcement missing: Amendment ${review.amendment}`);
    const body = articleBody(post);
    const allLinks = [...post.content.rendered.matchAll(/href="([^"]+)"/g)].map((m) => decode(m[1]).replace(/^http:/, "https:"));
    const candidates = [...new Set(allLinks.filter((u) => /summary\.do|solicitation\.nasaprs\.com\/NNH/.test(u)))];
    const pages = await Promise.all(candidates.map(async (u) => {
      const canonical = /solicitation\.nasaprs\.com\/(NNH[^/?]+)/.exec(u);
      const url = canonical ? `${summaryUrl}${canonical[1]}` : u;
      return parseNspires(await getHtml(url), url);
    }));
    const meta = pages.find((p) => p.documents.some((d) => d.title.startsWith(`${review.code} `)));
    if (!meta) throw new Error(`NASA program document missing: ${review.code}`);
    const doc = meta.documents.find((d) => d.title.startsWith(`${review.code} `));
    const programText = await pdfText(doc.url, extractPdfText);
    if (review.key === "hwoica" && !/non-U\.S\. organizations as unfunded Collaborators/i.test(programText)) throw new Error("HWO-ICA foreign role changed; review required");
    if (review.key === "lcas" && !/foreign nationals can participate only at no cost to NASA/i.test(programText)) throw new Error("H-LCAS foreign role changed; review required");
    const deadline = selectNasaEntryDeadline(meta, { text: body, url: post.link }, review.stage);
    if (["noi", "step1"].includes(review.stage)) deadline.note = `신규 참여 마감은 필수 ${review.stage === "noi" ? "NOI(사전 의향서)" : "Step-1"} 기준. 이후 본 제안서 마감만으로 신규 신청 가능으로 표시하지 않음.`;
    const relevantRows = meta.rows.filter((r) => /Due/i.test(r) && !/budget/i.test(r));
    const extra = review.code === "D.3" ? ["미국 기관 PI의 선정 제안에만 NASA 연구비 지원. 외국기관 PI 및 그 미국 Co-I도 해당 PI 연구비 대상이 아님."] : [];
    if (review.key === "aes") extra.push("연구는 미국의 지역·현안 또는 미국의 국가 우선순위에 대한 직접적 편익을 대상으로 해야 함.");
    if (["hwoica", "lcas"].includes(review.key)) extra.push("하드웨어·기술 자료 접근에는 해당 공고의 ITAR/EAR·수출통제 조건 적용.");
    const program = makeProgram({ key: `roses25-${review.key}`, title: `NASA ${review.code} ${review.description}${review.code === "D.3" ? "" : ` (${review.key.toUpperCase()})`}`,
      published: post.date.slice(0, 10), sourceUrl: meta.url, announcementUrl: post.link, category: review.category, description: review.description,
      deadline, mode: review.mode, eligibilityUrls: [doc.url, summaryPolicyUrl], attachments: meta.documents.filter((d) => /Foreign PI Instructions/i.test(d.title)).map((d) => d.url).concat(doc.url),
      extraRestrictions: [...extra, ...relevantRows.filter((r) => !/Release|Close/.test(r)).slice(0, review.code === "D.3" ? 0 : 4).map((r) => `NSPIRES 일정: ${r}`)] });
    audit.push({ id: program.id, announcementUrl: post.link, publishedDate: program.announcementDate, participationMode: review.mode, entryDeadline: deadline.date, eligibilityEvidenceUrls: [doc.url, summaryPolicyUrl] });
    return program;
  });
  programs.push(...await discoverAdditionalCalls(extractPdfText, audit));
  const used = new Set(audit.map((r) => r.announcementUrl));
  const excluded = posts.filter((p) => !used.has(p.link)).map((p) => ({ title: strip(p.title.rendered), sourceUrl: p.link, publishedDate: p.date.slice(0, 10), reason: /Amendment (52|53|58):/.test(p.title.rendered) ? "미국 소속·교육기관 등 별도 자격 제한: 한국 기관 연구자의 국제참여 공고로 채택하지 않음" : "모집 신규 개시가 아닌 수정·정정·마감 연장·결과·안내" }));
  await writeFile("data/nasa-review-audit.json", JSON.stringify({ checkedAt: new Date().toISOString(), publicationWindow: NASA_WINDOW, scope: "한국 기관 소속 연구자의 국제참여. 신규 세부요소·최종 실공고·새 관측 사이클 포함; 단순 정정·연장 제외.", officialAnnouncementCount: posts.length, generatedCount: programs.length, publicReaderFallbackUrls: [...readerFallbacks], included: audit.sort((a, b) => a.id.localeCompare(b.id)), excluded }, null, 2) + "\n");
  return programs.map((program) => ({ id: program.id, url: program.sourceUrl, dedupeKey: program.id, sourceFamily: program.sourceFamily, defaultTitle: program.title, normalizedProgram: program }));
}

async function discoverAdditionalCalls(extractPdfText, audit) {
  const programs = [];
  const niacUrl = `${summaryUrl}NNH26ZTR001N-27NIAC_A1`;
  const niac = parseNspires(await getHtml(niacUrl), niacUrl);
  const niacDoc = niac.documents.find((d) => /^2027 NIAC Phase I Solicitation Document/.test(d.title));
  if (!niacDoc) throw new Error("NIAC solicitation document missing");
  const niacText = await pdfText(niacDoc.url, extractPdfText);
  if (!/non-U\.S\. organizations/i.test(niacText)) throw new Error("NIAC international eligibility requires review");
  const niacRow = niac.rows.find((row) => /NIAC27A.*Due/.test(row));
  const niacDeadline = selectNasaEntryDeadline({ ...niac, rows: [niacRow] }, { text: niac.text, url: niacUrl }, "proposal");
  programs.push(makeProgram({ key: "niac-2027-phase1", title: "NASA NIAC 2027 Phase I — 미국 주관팀 국제협력", published: parseEnglishDate(niac.rows.find((r) => /^Release /.test(r))), sourceUrl: niacUrl,
    announcementUrl: "https://science.nasa.gov/astrophysics/programs/physics-of-the-cosmos/community/niac-phase-i-forum-7-october-2026/", category: "core_space", description: "혁신적 미래 우주·항공 개념의 초기 타당성 연구", deadline: niacDeadline, mode: "collaborator_only", eligibilityUrls: [niacDoc.url], attachments: [niacDoc.url],
    extraRestrictions: ["Step A 마감 기준. Step B는 초청된 미국 주관 제안만 제출 가능.", "해외 기관은 파트너로 참여 가능하며 주관 불가."], funding: "최대 225,000달러는 미국 선정 주관팀 지원 규모. 한국 기관에는 no-exchange-of-funds 적용." }));

  const jwstAnnouncement = "https://science.nasa.gov/astrophysics/programs/physics-of-the-cosmos/community/jwst-cycle-6-call-for-proposals/";
  const jwstUrl = "https://jwst-docs.stsci.edu/jwst-opportunities-and-policies/jwst-call-for-proposals-for-cycle-6";
  const jwstText = strip(await getHtml(jwstUrl));
  if (!/both domestic and foreign/i.test(jwstText)) throw new Error("JWST foreign eligibility changed");
  const jwstDeadline = jwstText.match(new RegExp(`(?:due on|deadline:)[\\s\\S]{0,100}?(${englishDate})`, "i"));
  if (!jwstDeadline) throw new Error("JWST Cycle 6 deadline missing");
  const jwstAnn = strip(await getHtml(jwstAnnouncement));
  const jwstPub = jwstAnn.match(/(\d{1,2}\s+July\s+2026)/)?.[1];
  if (!jwstPub) throw new Error("JWST dated NASA announcement missing");
  programs.push(makeProgram({ key: "jwst-cycle6", title: "NASA/ESA/CSA JWST Cycle 6 GO·Survey·Archival Research", published: parseEnglishDate(jwstPub), sourceUrl: jwstUrl, announcementUrl: jwstAnnouncement, category: "astronomy_space_science", description: "JWST Cycle 6 관측시간·서베이·아카이브 연구 제안", mode: "observing", eligibilityUrls: [jwstUrl, `${jwstUrl}/jwst-key-policies`],
    deadline: { date: nasaEasternDeadline(parseEnglishDate(jwstDeadline[1]), 20, 0, 0), evidence: `Cycle 6 proposals due ${jwstDeadline[1]} at 8:00 pm US Eastern Time`, url: jwstUrl }, funding: "한국 기관도 PI로 관측 제안 가능. NASA 연구비는 자격을 갖춘 미국 연구자 대상.", documents: ["STScI 계정", "APT 제안서·공고의 익명화 서식"] }));

  const irtfUrl = "https://irtfweb.ifa.hawaii.edu/observing/callforproposals/";
  const irtfText = strip(await getHtml(irtfUrl));
  const irtfAbout = "https://irtfweb.ifa.hawaii.edu/information/about.php";
  if (!/open to the entire astronomical community/i.test(strip(await getHtml(irtfAbout)))) throw new Error("IRTF international eligibility changed");
  const irtfEnd = irtfText.match(/5:00PM on (October\s+01,\s+2026) HST/i);
  const irtfStart = irtfText.match(/September\s+01,\s+2026/i);
  if (!irtfEnd || !irtfStart) throw new Error("IRTF 2027A publication window/deadline missing");
  programs.push(makeProgram({ key: "irtf-2027a", title: "NASA IRTF 2027A 관측 제안", published: parseEnglishDate(irtfStart[0]), sourceUrl: irtfUrl, announcementUrl: "https://science.nasa.gov/astrophysics/programs/cosmic-origins/community/reminder-2027a-nasa-irtf-call-for-proposals/", category: "astronomy_space_science", description: "NASA 적외선망원경 2027A 학기 관측시간 신청", mode: "observing", eligibilityUrls: [irtfAbout, irtfUrl],
    deadline: { date: `${parseEnglishDate(irtfEnd[1])}T17:00:00-10:00`, evidence: irtfEnd[0], url: irtfUrl }, funding: "관측시간 배정 공고. 한국 기관 직접 연구비 지급 공고가 아님.", documents: ["IRTF 온라인 관측 제안서", "과학·기술 제안서 및 DAPR 서식"] }));

  const xrismUrl = "https://xrism.isas.jaxa.jp/research/proposer/key_program/index.html";
  const xrismNewsUrl = "https://xrism.isas.jaxa.jp/research/news/index.html";
  const xrismHtml = await getHtml(xrismUrl);
  const xrismNews = strip(await getHtml(xrismNewsUrl));
  const xrismText = strip(xrismHtml);
  if (!/worldwide scientific community/i.test(xrismText + xrismNews)) throw new Error("XRISM worldwide eligibility missing");
  const xrismStart = xrismNews.match(/(September 4, 2026)[\s\S]{0,600}?Key Program/);
  if (!xrismStart) throw new Error("XRISM Key Program publication date missing");
  // The landing page links the authoritative, full call; follow it for the deadline.
  const xrismLinks = [...xrismHtml.matchAll(/href="([^"]+)"/g)].map((m) => new URL(decode(m[1]), xrismUrl).href);
  let xrismCallText = xrismText;
  let xrismEvidenceUrl = xrismUrl;
  for (const url of xrismLinks.filter((u) => /\.html|\.pdf/.test(u) && /key|kp|call|proposal/i.test(u)).slice(0, 8)) {
    try {
      const text = /\.pdf/.test(url) ? await pdfText(url, extractPdfText) : strip(await getHtml(url));
      if (/December\s+[34],?\s+2026/i.test(text)) { xrismCallText = text; xrismEvidenceUrl = url; break; }
    } catch { /* Other linked proposer documents can supply the public deadline. */ }
  }
  if (!/December\s+[34],?\s+2026/i.test(xrismCallText)) throw new Error("XRISM Key Program deadline missing");
  const xrismDeadline = xrismText.match(new RegExp(`(\\d{2}:\\d{2})\\s*UT[^.]{0,35}?(${englishDate})`, "i"));
  if (!xrismDeadline) throw new Error("XRISM explicit UTC deadline missing");
  programs.push(makeProgram({ key: "xrism-key-program1", title: "NASA/JAXA XRISM 제1차 Key Program — JAXA 국제 접수", published: parseEnglishDate(xrismStart[1]), sourceUrl: xrismUrl, announcementUrl: xrismNewsUrl, category: "astronomy_space_science", description: "NASA·JAXA 공동 XRISM 임무 대규모 X선 관측 연구", mode: "observing", eligibilityUrls: [xrismNewsUrl, xrismUrl],
    deadline: { date: `${parseEnglishDate(xrismDeadline[2])}T${xrismDeadline[1]}:00Z`, evidence: xrismDeadline[0], url: xrismUrl }, funding: "국제 공동임무 관측시간 기회. 한국 기관의 NASA 연구비 직접지원은 없음.", participation: "국제 관측시간 신청(JAXA ARK/RPS 접수)", extraRestrictions: ["NASA 국내용 GO 접수와 구분. 한국 소속 PI는 JAXA의 국제 Key Program 절차 이용."], documents: ["JAXA ARK/RPS 계정", "Key Program 제안서 및 공고별 서식"] }));
  for (const p of programs) audit.push({ id: p.id, announcementUrl: p.originalAgencyUrl, publishedDate: p.announcementDate, participationMode: p.participationType, entryDeadline: p.applicationEndDate, eligibilityEvidenceUrls: [p.sourceUrl], qualificationNotes: p.qualificationNotes });
  return programs;
}
