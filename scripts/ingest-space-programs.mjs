import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const now = new Date().toISOString();
const execFileAsync = promisify(execFile);

const verifyIngestionDependencies = async () => {
  const missing = [];

  try {
    await execFileAsync("pdftotext", ["-v"]);
  } catch {
    missing.push("pdftotext");
  }

  try {
    await execFileAsync("python3", ["-c", "import curl_cffi, olefile"]);
  } catch {
    missing.push("python3 packages: curl_cffi olefile");
  }

  if (missing.length > 0) {
    throw new Error(`Missing ingestion dependencies: ${missing.join(", ")}`);
  }
};

const kasaBusinessListUrl = "https://www.kasa.go.kr/bbs/BBSMSTR_000000000018.do";
const dapaNoticeListUrl = "https://www.dapa.go.kr/dapa/doc/selectDoc.do?bbsSeq=443&menuSeq=3031";
const addProposalListUrl = "https://www.add.re.kr/kps/publicNtis/ntisList?menuId=MENU02201";
const djtpMainUrl = "https://www.djtp.or.kr/";
const djtpBusinessNoticeListUrl = "https://www.djtp.or.kr/pbanc?mid=a20101000000";
const gntpSupportListUrl = "https://www.gntp.or.kr/biz/apply";
const jntpMainUrl = "https://www.jntp.or.kr/base/main/view";
const jntpAnnouncementListUrl = "https://www.jntp.or.kr/base/apiAnnouncement/List?menuLevel=2&menuNo=45";
const kaiaListUrl = "https://www.kaia.re.kr/portal/bbs/list/B0000029.do?menuNo=200110";
const kariResearchListUrl = "https://www.kari.re.kr/kor/article/ATCLd4f64ac47";
const kasiNoticeListUrl = "https://www.kasi.re.kr/kor/publication/post/notice";
const kritNoticeListUrl = "https://www.krit.re.kr/krit/bbs/notice_list.do?gotoMenuNo=05010000";
const kStartupOngoingListUrl = "https://www.k-startup.go.kr/web/contents/bizpbanc-ongoing.do";
const keitSupportListJsonUrl = "https://itech.keit.re.kr/bsnsancm/retrieveSprtBsnsAncmListJson.do";
const keitSupportDetailUrl = "https://itech.keit.re.kr/bsnsancm/retrieveSprtBsnsAncmDetail.do";
const kiatMainUrl = "https://www.kiat.or.kr/front/user/main.do";
const kiatBusinessNoticeMenuId = "b159c9dac684471b87256f1e25404f5e";
const tipaSmtechNoticeListUrl = "https://www.smtech.go.kr/front/ifg/no/notice02_list.do";
const bizinfoListUrl = "https://www.bizinfo.go.kr/sii/siia/selectSIIA200View.do";
const itpSupportListUrls = [
  ["13", "https://www.itp.or.kr/intro.asp?tmid=13"],
  ["672", "https://www.itp.or.kr/intro.asp?tmid=672"]
];

const stripHtml = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/\s+/g, " ")
    .trim();

const cleanNoticeText = (text) =>
  text
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\b분류\s+\S+\s+담당부서\s+[^]+?조회수\s+\d+/g, " ")
    .replace(/담당부서\s+시스템관리용\s+담당자\s+관리자/g, " ")
    .replace(/\s*-->\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const procurementNoticePattern = /입찰|낙찰|제안요청|제안서|BTL|민간투자사업|제3자\s*제안|임대형\s*민간투자|우선협상|사업자\s*선정|구매\s*공고|용역\s*(?:입찰|계약|공고)|계약\s*(?:공고|체결|결과)/i;
const nonProgramNoticePattern = /포털|매뉴얼|가이드|사용자\s*교육|서비스\s*개시|운영\s*안내|시스템\s*(?:점검|안내|교육|매뉴얼)/i;
const researchApplicantPattern = /위탁연구|연구개발기관|국가연구개발혁신법|대학|출연연|연구기관|연구팀|연구책임자|전문가\s*지원|국제회의\s*참석\s*지원/i;

const fetchWithCurlCffi = async (url) => {
  const script = String.raw`
import json
import sys
from curl_cffi import requests

url = sys.argv[1]
headers = {
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    "User-Agent": "KoreaSpaceSupportMCP/0.1 metadata-only source discovery"
}
session = requests.Session(impersonate="safari")
try:
    root = "/".join(url.split("/")[:3])
    session.get(root, headers=headers, timeout=10)
    response = session.get(url, headers={**headers, "Referer": root + "/"}, timeout=20)
    print(json.dumps({
        "ok": 200 <= response.status_code < 400,
        "status": response.status_code,
        "url": response.url,
        "text": response.text
    }, ensure_ascii=False))
except Exception as error:
    print(json.dumps({"ok": False, "error": str(error)}, ensure_ascii=False))
`;

  try {
    const { stdout } = await execFileAsync("python3", ["-c", script, url], {
      maxBuffer: 16 * 1024 * 1024
    });
    const result = JSON.parse(stdout);
    if (result.ok && typeof result.text === "string") return result.text;
  } catch {
    return undefined;
  }
  return undefined;
};

const fetchBinaryWithCurlCffi = async (url) => {
  const script = String.raw`
import base64
import json
import sys
from curl_cffi import requests

url = sys.argv[1]
headers = {
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7"
}
session = requests.Session(impersonate="safari")
try:
    response = session.get(url, headers=headers, timeout=30)
    print(json.dumps({
        "ok": 200 <= response.status_code < 400,
        "status": response.status_code,
        "contentType": response.headers.get("content-type", ""),
        "contentDisposition": response.headers.get("content-disposition", ""),
        "body": base64.b64encode(response.content).decode("ascii")
    }, ensure_ascii=False))
except Exception as error:
    print(json.dumps({"ok": False, "error": str(error)}, ensure_ascii=False))
`;

  const { stdout } = await execFileAsync("python3", ["-c", script, url], {
    maxBuffer: 32 * 1024 * 1024
  });
  const result = JSON.parse(stdout);
  if (!result.ok || typeof result.body !== "string") return undefined;
  return {
    bytes: Buffer.from(result.body, "base64"),
    contentType: result.contentType ?? "",
    contentDisposition: result.contentDisposition ?? ""
  };
};

const toJinaReaderUrl = (url) =>
  /^https?:\/\//i.test(url)
    ? `https://r.jina.ai/${url}`
    : `https://r.jina.ai/http://${url}`;

const fetchWithJina = async (url) => {
  const response = await fetch(toJinaReaderUrl(url), {
    headers: {
      "user-agent": "KoreaSpaceSupportMCP/0.1 metadata-only source discovery"
    }
  });
  if (!response.ok) return undefined;
  return response.text();
};

const isFetchErrorPage = (text) =>
  /요청하신\s*페이지[^]+찾을\s*수\s*없습니다|errorPage|failed\s+to\s+fetch|unable\s+to\s+fetch|too\s+many\s+requests|rate\s+limit|access\s+denied/i.test(text);

const fetchPage = async (url, options = {}) => {
  const preferCurlCffi = options.preferCurlCffi === true;
  const preferJina = options.preferJina === true;
  const method = options.method ?? "GET";
  const strategies = preferJina
    ? ["jina", "node", "curl_cffi"]
    : preferCurlCffi
    ? ["curl_cffi", "node", "jina"]
    : ["node", "jina", "curl_cffi"];

  for (const strategy of strategies) {
    try {
      if (strategy === "curl_cffi") {
        const text = await fetchWithCurlCffi(url);
        if (text && !isFetchErrorPage(text)) return text;
      }
      if (strategy === "jina") {
        const text = await fetchWithJina(url);
        if (text && !isFetchErrorPage(text)) return text;
      }
      if (strategy === "node") {
        const response = await fetch(url, {
          method,
          headers: {
            "user-agent": "KoreaSpaceSupportMCP/0.1 metadata-only source review",
            ...(method === "POST" ? { "content-type": "application/json" } : {})
          },
          body: method === "POST" ? "" : undefined
        });
        if (response.ok) {
          const text = await response.text();
          if (!isFetchErrorPage(text)) return text;
        }
      }
    } catch {
      // Continue to the next strategy.
    }
  }

  throw new Error(`Fetch failed for ${url}`);
};

const decodeHtmlEntities = (value) =>
  value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)));

const normalizeUrl = (baseUrl, href) => {
  const withoutSession = decodeHtmlEntities(href).replace(/;jsessionid=[^?"]+/i, "");
  const url = new URL(withoutSession, baseUrl);
  for (const key of [...url.searchParams.keys()]) {
    if (!["menuNo", "pageIndex"].includes(key)) {
      url.searchParams.delete(key);
    }
  }
  url.searchParams.set("menuNo", "200110");
  return url.toString();
};

const normalizeAbsoluteUrl = (baseUrl, href) => {
  const withoutSession = decodeHtmlEntities(href).replace(/;jsessionid=[^?"]+/i, "");
  return new URL(withoutSession, baseUrl).toString();
};

const joinJavascriptStringPieces = (expression) =>
  [...String(expression ?? "").matchAll(/'([^']*)'/g)]
    .map((match) => match[1])
    .join("");

const slugId = (value) =>
  decodeHtmlEntities(value)
    .replace(/[^a-zA-Z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);

const parseDateRange = (text) => {
  const match = text.match(/(20\d{2}[-.]\d{2}[-.]\d{2})\s*~\s*(20\d{2}[-.]\d{2}[-.]\d{2})/);
  if (!match) return {};
  return {
    announcementDate: match[1].replaceAll(".", "-"),
    defaultDeadline: match[2].replaceAll(".", "-")
  };
};

const parseLooseDateRange = (text) => {
  const match = text.match(
    /(20\d{2})\s*[.-]\s*(\d{1,2})\s*[.-]\s*(\d{1,2})\s*~\s*(20\d{2})\s*[.-]\s*(\d{1,2})\s*[.-]\s*(\d{1,2})/
  );
  if (!match) return {};
  return {
    applicationStartDate: formatDate(match[1], match[2], match[3]),
    defaultDeadline: formatDate(match[4], match[5], match[6])
  };
};

const parseCompactDate = (value) => {
  const match = String(value ?? "").match(/^(20\d{2})(\d{2})(\d{2})$/);
  if (!match) return undefined;
  return formatDate(match[1], match[2], match[3]);
};

const formatDate = (year, month, day) => {
  const monthNumber = Number.parseInt(month, 10);
  const dayNumber = Number.parseInt(day, 10);
  if (monthNumber < 1 || monthNumber > 12 || dayNumber < 1 || dayNumber > 31) return undefined;
  return `${year}-${String(monthNumber).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;
};

const noYearDateRangePattern =
  /(\d{1,2})\s*(?:[.]|월)\s*(\d{1,2})\s*(?:일)?(?:\([^)]*\))?[\s\S]{0,30}?[~∼～\-–—]\s*(?:(\d{1,2})\s*(?:[.]|월)\s*)?(\d{1,2})\s*(?:일)?(?:\([^)]*\))?/;
const deadlineAnchors = ["마감일", "접수 기간", "접수기간", "신청기간", "모집기간", "공모기간", "제출기간", "신청 기간", "재공모 일정", "재공모일정", "공모 일정", "공모일정"];
const variableDeadlinePattern =
  /(?:신청|접수|모집|공모|제출|지원)[^\n.]{0,80}(?:상시|예산\s*소진|차수별\s*상이|별도\s*공지|수시\s*접수|선착순)|(?:상시|예산\s*소진|차수별\s*상이|수시\s*접수|선착순)[^\n.]{0,80}(?:신청|접수|모집|공모|제출|지원)/;

const extractDetailTitle = (html) => {
  const addTitle = html.match(/<th[^>]*>\s*공고명\s*<\/th>\s*<td[^>]*colspan="3"[^>]*>([\s\S]*?)<\/td>/i);
  if (addTitle) return stripHtml(addTitle[1]);

  const kasaTitle = html.match(/<h2[^>]*class="[^"]*\bboard-view__title\b[^"]*"[^>]*>([\s\S]*?)<\/h2>/i);
  if (kasaTitle) return stripHtml(kasaTitle[1]);

  const kasiTitle = html.match(/<div[^>]*class="[^"]*\bboard_header_tit\b[^"]*"[^>]*>[\s\S]*?<strong[^>]*>([\s\S]*?)<\/strong>/i);
  if (kasiTitle) return stripHtml(kasiTitle[1]);

  const kritTitle = html.match(/<th[^>]*>\s*제목\s*<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/i);
  if (kritTitle) return stripHtml(kritTitle[1]);

  const match = html.match(/<dl[^>]*class="[^"]*\bd_view\b[^"]*"[^>]*>[\s\S]*?<dt[^>]*>([\s\S]*?)<\/dt>/i);
  return match ? stripHtml(match[1]) : undefined;
};

const extractMainText = (html) => {
  const gntpView = html.match(/사업정보([\s\S]*?)(?:개인정보처리방침|Copyright|패밀리 사이트)/i);
  if (gntpView) return stripHtml(gntpView[1]);

  const addView = html.match(/<table[^>]*class="[^"]*\bboard\b[^"]*\bview\b[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (addView) return stripHtml(addView[1]);

  const kasaView = html.match(/<div[^>]*class="[^"]*\bprogram__board-view\b[^"]*"[^>]*>([\s\S]*?)(?:<div[^>]*class="[^"]*\bboard-view__button-box\b|<div[^>]*class="[^"]*\bboard-view__navi-box\b)/i);
  if (kasaView) return stripHtml(kasaView[1]);

  const kaiaView = html.match(/<dl[^>]*class="[^"]*\bd_view\b[^"]*"[^>]*>([\s\S]*?)<\/dl>/i);
  if (kaiaView) return stripHtml(kaiaView[1]);

  const dapaView = html.match(/<main[^>]*id="cont"[^>]*>([\s\S]*?)(?:<div[^>]*class="[^"]*\bsatisfaction\b|<footer|<\/main>)/i)
    ?? html.match(/<div[^>]*id="cont"[^>]*>([\s\S]*?)(?:<div[^>]*class="[^"]*\bsatisfaction\b|<footer|<\/div>\s*<footer)/i);
  if (dapaView) return stripHtml(dapaView[1]);

  const kasiView = html.match(/<div[^>]*class="[^"]*\bview_basic\b[^"]*"[^>]*>([\s\S]*?)(?:<div[^>]*class="[^"]*\bboard_file\b|<div[^>]*class="[^"]*\bsns\b|<!--\s*공공누리 view\s*-->)/i);
  if (kasiView) return stripHtml(kasiView[1]);

  const kritView = html.match(/<div[^>]*class="[^"]*\btbTypeView\b[^"]*"[^>]*>([\s\S]*?)(?:<div[^>]*class="[^"]*\bar\b|<div[^>]*class="[^"]*\btbTypeView\s+type2\b)/i);
  if (kritView) return stripHtml(kritView[1]);

  const kStartupView = html.match(/<div[^>]*class="[^"]*\bbiz_PBANC_view\b[^"]*"[^>]*>([\s\S]*?)(?:<div[^>]*class="[^"]*\bboard_file\b|<div[^>]*data-ax5uploader="download1")/i)
    ?? html.match(/<div[^>]*class="[^"]*\bconts\b[^"]*"[^>]*>([\s\S]*?)(?:<div[^>]*class="[^"]*\bboard_file\b|<div[^>]*id="footer")/i);
  if (kStartupView) return stripHtml(kStartupView[1]);

  return stripHtml(html);
};

const extractAttachmentUrls = (html, pageUrl) => {
  const attachments = [];
  const javascriptAttachments = [];
  const linkPattern = /<a\s+[^>]*href="([^"]*(?:\/portal\/cmm\/fms\/FileDown\.do|\/cmm\/fms\/FileDown\.do|\/jfile\/board\/readDownloadFile\.do|\/attach\/|\/common\/download\.do|\/afile\/fileDownload\/|\/fileDownloadDev|\/dextnj\/streamDownload)[^"]*)"[^>]*>/gi;
  for (const match of html.matchAll(linkPattern)) {
    const href = decodeHtmlEntities(match[1]);
    if (!href.startsWith("javascript:")) {
      attachments.push(normalizeAbsoluteUrl(pageUrl, href));
    }
  }

  for (const match of html.matchAll(/fn_egov_downFile\('([^']+)'\s*,\s*'([^']+)'\)/gi)) {
    attachments.push(normalizeAbsoluteUrl(pageUrl, `/cmm/fms/FileDown.do?atchFileId=${match[1]}&fileSn=${match[2]}`));
  }

  for (const match of html.matchAll(/(?:fileLoad|fileBlank)\(([^)]*)\)/gi)) {
    const [pathExpression] = match[1].split(",");
    const href = joinJavascriptStringPieces(pathExpression);
    if (href) {
      javascriptAttachments.push(normalizeAbsoluteUrl(pageUrl, href));
    }
  }

  return [...new Set([...javascriptAttachments, ...attachments])];
};

const classifyKaiaNotice = (text) => {
  if (/우주|위성|탑재체|발사체|궤도/.test(text)) {
    return {
      spaceCategory: "aerospace",
      relevanceScore: 72,
      industries: ["항공우주", "국토교통 R&D"],
      technologyAreas: ["항공우주", "위성", "우주기술"]
    };
  }
  if (/UAM|도심항공|AAM|드론|무인이동체|자율비행/i.test(text)) {
    return {
      spaceCategory: "drone_uam_adjacent",
      relevanceScore: 64,
      industries: ["UAM", "드론", "항공", "국토교통 R&D"],
      technologyAreas: ["UAM", "드론", "자율비행", "항공안전"]
    };
  }
  if (/항공|공항|비행|조류탐지/.test(text)) {
    return {
      spaceCategory: "aviation_industry",
      relevanceScore: 58,
      industries: ["항공", "공항", "국토교통 R&D"],
      technologyAreas: ["항공산업", "공항 안전", "탐지 기술"]
    };
  }
  return undefined;
};

const classifyKasaNotice = (text) => {
  if (/편의점|관리위탁|채용|합격자|인사|행사|이벤트|선정결과/.test(text)) return undefined;
  if (procurementNoticePattern.test(text) || nonProgramNoticePattern.test(text)) return undefined;

  if (/인공위성|위성|통신·항법|통신항법/.test(text)) {
    return {
      spaceCategory: "satellite",
      relevanceScore: 94,
      industries: ["우주산업", "인공위성", "R&D"],
      technologyAreas: ["인공위성", "탑재체", "위성통신", "우주기술"]
    };
  }
  if (/우주기술실용화|투·융자|투융자|사업화|우주항공 분야/.test(text)) {
    return {
      spaceCategory: "space_commercialization",
      relevanceScore: 90,
      industries: ["우주산업", "항공우주", "사업화", "R&D"],
      technologyAreas: ["우주기술 사업화", "우주산업", "기술개발", "실증"]
    };
  }
  if (/탐사|달|우주과학|우주소형|우주기술|우주산업|우주부품|우주\s*R&D/i.test(text)) {
    return {
      spaceCategory: "core_space",
      relevanceScore: 88,
      industries: ["우주산업", "우주과학", "R&D"],
      technologyAreas: ["우주탐사", "우주과학", "우주기술"]
    };
  }
  if (/항공|기체|항공기|첨단제조/.test(text)) {
    return {
      spaceCategory: "aerospace",
      relevanceScore: 76,
      industries: ["항공우주", "항공", "첨단제조", "R&D"],
      technologyAreas: ["항공기체", "항공우주 부품", "첨단제조"]
    };
  }
  return undefined;
};

const classifyKariNotice = (text) => {
  if (/채용|초빙|교육과정|인턴|캠프|견학|행사|선정결과/.test(text)) return undefined;
  if (procurementNoticePattern.test(text) || nonProgramNoticePattern.test(text)) return undefined;

  if (/발사체|누리호|차세대발사체|로켓|추진|엔진/.test(text)) {
    return {
      spaceCategory: "launch_vehicle",
      relevanceScore: 92,
      industries: ["우주산업", "발사체", "R&D"],
      technologyAreas: ["발사체", "추진기관", "로켓", "우주기술"]
    };
  }
  if (/달|착륙선|탐사|우주탐사/.test(text)) {
    return {
      spaceCategory: "core_space",
      relevanceScore: 90,
      industries: ["우주산업", "우주탐사", "R&D"],
      technologyAreas: ["달 탐사", "우주탐사", "우주기술"]
    };
  }
  if (/스페이스파이오니어|위성|탑재체|SAR|라디오미터|안테나|우주전략기술/i.test(text)) {
    return {
      spaceCategory: "satellite",
      relevanceScore: 88,
      industries: ["우주산업", "인공위성", "R&D"],
      technologyAreas: ["위성", "탑재체", "우주전략기술", "우주부품"]
    };
  }
  if (/항공우주|항공|무인기|AAM|UAM/.test(text)) {
    return {
      spaceCategory: "aerospace",
      relevanceScore: 76,
      industries: ["항공우주", "항공", "R&D"],
      technologyAreas: ["항공우주", "항공기술", "무인기"]
    };
  }
  if (/위탁연구과제|연구개발사업|신규과제|공모|재공모/.test(text)) {
    return {
      spaceCategory: "aerospace",
      relevanceScore: 70,
      industries: ["항공우주", "R&D"],
      technologyAreas: ["항공우주", "연구개발"]
    };
  }
  return undefined;
};

const classifyKasiNotice = (text) => {
  if (/채용|초빙|교육과정|인턴|캠프|견학|행사|사칭|선정결과|합격자|UST|신입생\s*모집/.test(text)) return undefined;
  if (procurementNoticePattern.test(text) || nonProgramNoticePattern.test(text)) return undefined;

  if (/우주과학탐사|우주과학|우주탐사|국제회의\s*참석\s*지원/.test(text)) {
    return {
      spaceCategory: "astronomy_space_science",
      relevanceScore: 84,
      industries: ["우주과학", "우주탐사", "연구자 지원"],
      technologyAreas: ["우주과학탐사", "국제협력", "우주과학"],
      supportAmountText: /600\s*만원/.test(text) ? "1인당 총 600만원 이내 국외출장비 지원" : "우주과학 연구자/전문가 지원",
      participationType: "우주과학 연구자/전문가 지원 프로그램"
    };
  }
  if (/우주상황인식|우주위험감시|우주감시|SSA|우주잔해물/.test(text)) {
    return {
      spaceCategory: "space_observation_infrastructure",
      relevanceScore: 78,
      industries: ["우주상황인식", "우주 인프라", "연구개발"],
      technologyAreas: ["우주상황인식", "우주감시", "우주 인프라"],
      supportAmountText: "우주상황인식/우주감시 관련 공고",
      participationType: "우주 인프라/R&D 공고"
    };
  }
  return undefined;
};

const classifyDapaNotice = (text) => {
  if (/포상|유공자|시민참여|행사|채용|교육 모집|사용자 교육|컨퍼런스|세미나|포럼|박람회|전시회|학술대회|공청회|설명회|간담회/.test(text)) return undefined;
  if (procurementNoticePattern.test(text) || nonProgramNoticePattern.test(text)) return undefined;

  if (/위성|우주|감시정찰|정찰위성|탑재체|C4I|항공우주/.test(text)) {
    return {
      spaceCategory: "defense_space",
      relevanceScore: 88,
      industries: ["국방우주", "방산", "위성", "국방 R&D"],
      technologyAreas: ["국방우주", "위성", "감시정찰", "방산기술"]
    };
  }
  if (/(?:드론|무인기|무인이동체|항공전자|항공기체|항공엔진)/.test(text)) {
    return {
      spaceCategory: "defense_aerospace",
      relevanceScore: 74,
      industries: ["방산", "국방기술", "항공우주", "국방 R&D"],
      technologyAreas: ["방산 항공전자", "무인기", "드론", "국방 항공우주"]
    };
  }
  return undefined;
};

const classifyAddProposalNotice = (text) => {
  if (/비용분석서|작성\s*지침|결과안내|채용|포상|유공자|경진대회|설명회|행사|세미나|공청회/.test(text)) return undefined;
  if (/입찰|낙찰|구매|계약|용역\s*(?:입찰|계약|공고)/.test(text) || nonProgramNoticePattern.test(text)) return undefined;

  if (/위성|우주|감시정찰|정찰위성|탑재체|C4I|국방우주/.test(text)) {
    return {
      spaceCategory: "defense_space",
      relevanceScore: 86,
      industries: ["국방우주", "방산", "국방 R&D"],
      technologyAreas: ["국방우주", "위성", "감시정찰", "방산기술"],
      supportAmountText: "국방과학연구소 공개 제안서 공모",
      participationType: "국방 R&D 제안서 공모",
      targetCompanyType: "연구개발기관, 대학, 출연연, 기업 연구조직 등 국방 R&D 수행기관",
      eligibilityText: "국방 R&D 세부과제 수행 연구개발기관 대상 공개 제안서 공모입니다. 세부 자격, 보안요건, 제출서류는 원문 및 첨부파일 확인 필요.",
      universityOrResearchPartnerRequired: true,
      defenseOrDualUse: true
    };
  }

  if (/항공용|항공\s*소재|항공\s*센서|항공기|전투기|드론|군집드론|무인기|무인이동체|저피탐|스텔스|RCS/i.test(text)) {
    return {
      spaceCategory: "defense_aerospace_adjacent",
      relevanceScore: 76,
      industries: ["방산", "국방기술", "항공우주", "국방 R&D"],
      technologyAreas: ["방산 항공우주", "항공소재", "무인기", "드론", "저피탐"],
      supportAmountText: "국방과학연구소 공개 제안서 공모",
      participationType: "국방/항공우주 인접 R&D 제안서 공모",
      targetCompanyType: "연구개발기관, 대학, 출연연, 기업 연구조직 등 국방 R&D 수행기관",
      eligibilityText: "국방/항공우주 인접 R&D 세부과제 수행 연구개발기관 대상 공개 제안서 공모입니다. 세부 자격, 보안요건, 제출서류는 원문 및 첨부파일 확인 필요.",
      universityOrResearchPartnerRequired: true,
      defenseOrDualUse: true
    };
  }

  return undefined;
};

const classifyKritNotice = (text) => {
  if (/설명회|행사|컨퍼런스|세미나|채용|홍보|성과|제도\s*안내|선물\s*신고/.test(text)) return undefined;
  if (procurementNoticePattern.test(text) || nonProgramNoticePattern.test(text)) return undefined;

  if (/위성|우주|감시정찰|정찰위성|탑재체|C4I|항공우주/.test(text)) {
    return {
      spaceCategory: "defense_space",
      relevanceScore: 82,
      industries: ["국방우주", "방산", "국방 R&D"],
      technologyAreas: ["국방우주", "위성", "감시정찰", "방산기술"],
      supportAmountText: "국방기술진흥연구소 공개 방산/국방 R&D 공고",
      participationType: "국방/방산 R&D 공고"
    };
  }
  if (/Aerospace|항공|드론|무인기|무인이동체|항공전자|항공기체|항공엔진/i.test(text)) {
    return {
      spaceCategory: "defense_aerospace_adjacent",
      relevanceScore: 70,
      industries: ["방산", "국방기술", "항공우주", "국방 R&D"],
      technologyAreas: ["방산 항공우주", "무인기", "드론", "항공전자"],
      supportAmountText: "국방기술진흥연구소 공개 방산/항공우주 인접 R&D 공고",
      participationType: "방산/항공우주 인접 R&D 공고"
    };
  }
  return undefined;
};

const classifyKStartupNotice = (text) => {
  if (/교육생|교육\s*참가자|창업\s*교육|세미나|포럼|컨퍼런스|경진대회|오디션|네트워킹|설명회|입주기업|입주자|공모전/.test(text)) return undefined;
  if (procurementNoticePattern.test(text) || nonProgramNoticePattern.test(text)) return undefined;

  if (/우주|위성|항공우주|우주항공|우주\s*기업|우주\s*분야/.test(text)) {
    return {
      spaceCategory: /위성/.test(text) ? "satellite" : "space_commercialization",
      relevanceScore: 78,
      industries: ["우주산업", "항공우주", "스타트업"],
      technologyAreas: ["우주기술 사업화", "위성", "딥테크"],
      supportAmountText: "K-Startup 공개 창업지원사업 공고",
      participationType: "창업기업/스타트업 지원사업",
      targetCompanyType: "예비창업자, 대학(원)생, 일반인 등 항공우주 기술 기반 사업모델 보유자",
      eligibilityText: "항공·우주 기술 기반 사업모델을 구상 중인 예비창업자 또는 개인 연구자/대학(원)생 대상 가능성이 있는 창업지원 공고입니다. 세부 자격은 원문 확인 필요.",
      universityOrResearchPartnerRequired: false
    };
  }
  if (/드론|UAM|AAM|무인기|무인이동체/i.test(text)) {
    return {
      spaceCategory: "drone_uam_adjacent",
      relevanceScore: 64,
      industries: ["드론", "UAM", "항공", "스타트업"],
      technologyAreas: ["드론", "무인이동체", "사업화", "실증"],
      supportAmountText: "K-Startup 공개 드론/UAM 인접 창업지원사업 공고",
      participationType: "드론/UAM 인접 창업지원사업",
      targetCompanyType: "드론/UAM 분야 예비창업자 또는 창업기업",
      universityOrResearchPartnerRequired: false
    };
  }
  if (/(?<!후)방산|국방|방위\s*R&D|K방산/.test(text)) {
    return {
      spaceCategory: "defense_aerospace_adjacent",
      relevanceScore: 60,
      industries: ["방산", "국방기술", "스타트업"],
      technologyAreas: ["방산", "국방 R&D", "사업화"],
      supportAmountText: "K-Startup 공개 방산 인접 창업지원사업 공고",
      participationType: "방산 인접 창업지원사업",
      defenseOrDualUse: true,
      targetCompanyType: "방산/국방기술 분야 예비창업자 또는 창업기업",
      universityOrResearchPartnerRequired: false
    };
  }
  return undefined;
};

const classifyKeitSupportNotice = (text) => {
  if (/통합\s*시행계획|의향조사|설명회|행사|세미나|포럼|교육|매뉴얼|인터넷공시|수요조사/.test(text)) return undefined;
  if (procurementNoticePattern.test(text) || nonProgramNoticePattern.test(text)) return undefined;

  if (/우주|위성|항공우주|우주항공|우주\s*부품|우주\s*소재/.test(text)) {
    return {
      spaceCategory: /위성/.test(text) ? "satellite" : "space_parts_materials",
      relevanceScore: 82,
      industries: ["산업기술 R&D", "항공우주", "우주부품"],
      technologyAreas: ["우주부품", "항공우주 소재", "산업기술 R&D"],
      supportAmountText: "KEIT 산업기술 R&D 신규지원 공고",
      participationType: "산업기술 R&D 신규지원 과제",
      targetCompanyType: "기업, 대학, 연구기관 등 산업기술 R&D 수행기관",
      eligibilityText: "항공우주/우주부품 분야 산업기술 R&D 수행기관 대상 가능성이 있는 신규지원 공고입니다. 세부 신청 자격은 원문 및 첨부파일 확인 필요.",
      universityOrResearchPartnerRequired: true
    };
  }

  if (/항공\s*부품|항공\s*소재|항공\s*산업|항공기체|항공전자|항공엔진|항공\s*제조/.test(text)) {
    return {
      spaceCategory: "aerospace",
      relevanceScore: 72,
      industries: ["산업기술 R&D", "항공", "항공우주"],
      technologyAreas: ["항공부품", "항공소재", "항공제조", "산업기술 R&D"],
      supportAmountText: "KEIT 산업기술 R&D 신규지원 공고",
      participationType: "항공/항공우주 산업기술 R&D 과제",
      targetCompanyType: "기업, 대학, 연구기관 등 산업기술 R&D 수행기관",
      eligibilityText: "항공/항공우주 산업기술 R&D 수행기관 대상 가능성이 있는 신규지원 공고입니다. 세부 신청 자격은 원문 및 첨부파일 확인 필요.",
      universityOrResearchPartnerRequired: true
    };
  }

  if (/드론|UAM|AAM|무인기|무인이동체|자율비행/i.test(text)) {
    return {
      spaceCategory: "drone_uam_adjacent",
      relevanceScore: 68,
      industries: ["산업기술 R&D", "드론", "UAM", "항공"],
      technologyAreas: ["드론", "UAM", "무인이동체", "자율비행"],
      supportAmountText: "KEIT 산업기술 R&D 신규지원 공고",
      participationType: "드론/UAM 인접 산업기술 R&D 과제",
      targetCompanyType: "기업, 대학, 연구기관 등 산업기술 R&D 수행기관",
      eligibilityText: "드론/UAM 인접 산업기술 R&D 수행기관 대상 가능성이 있는 신규지원 공고입니다. 세부 신청 자격은 원문 및 첨부파일 확인 필요.",
      universityOrResearchPartnerRequired: true
    };
  }

  return undefined;
};

const classifyKiatBusinessNotice = (text) => {
  if (/수요조사|기술나눔|설명회|행사|세미나|포럼|교육|매뉴얼|컨설팅|간담회|공청회|의견수렴|채용|입찰/.test(text)) return undefined;
  if (procurementNoticePattern.test(text) || nonProgramNoticePattern.test(text)) return undefined;

  if (/우주|위성|항공우주|우주항공|발사체|우주\s*산업|우주\s*기술/i.test(text)) {
    return {
      spaceCategory: /위성/.test(text) ? "satellite" : "space_commercialization",
      relevanceScore: 78,
      industries: ["산업기술 R&D", "우주항공", "사업화"],
      technologyAreas: ["우주항공", "위성", "산업기술 R&D", "사업화"],
      supportAmountText: "KIAT 산업기술 R&D/기반구축 지원사업",
      participationType: "산업기술 R&D/기반구축 지원사업",
      targetCompanyType: "기업, 대학, 연구기관 등 산업기술 R&D 또는 기반구축 수행기관",
      eligibilityText: "우주항공 분야 산업기술 R&D 또는 기반구축 지원사업일 가능성이 있는 공고입니다. 세부 신청 자격, 수행기관 요건, 제출 서류는 원문 및 첨부파일 확인 필요.",
      universityOrResearchPartnerRequired: true,
      inferDateFromText: false,
      preferHtmlDeadline: false
    };
  }

  if (/항공\s*산업|항공\s*부품|항공\s*소재|항공\s*제조|항공기체|항공전자|항공엔진/.test(text)) {
    return {
      spaceCategory: "aerospace",
      relevanceScore: 70,
      industries: ["산업기술 R&D", "항공", "항공우주"],
      technologyAreas: ["항공산업", "항공부품", "항공소재", "산업기술 R&D"],
      supportAmountText: "KIAT 항공/항공우주 산업기술 지원사업",
      participationType: "항공/항공우주 산업기술 R&D 또는 기반구축 지원사업",
      targetCompanyType: "기업, 대학, 연구기관 등 항공/항공우주 산업기술 수행기관",
      eligibilityText: "항공/항공우주 산업기술 R&D 또는 기반구축 수행기관 대상 가능성이 있는 공고입니다. 세부 신청 자격은 원문 및 첨부파일 확인 필요.",
      universityOrResearchPartnerRequired: true,
      inferDateFromText: false,
      preferHtmlDeadline: false
    };
  }

  if (/드론|UAM|AAM|무인기|무인이동체|자율비행/i.test(text)) {
    return {
      spaceCategory: "drone_uam_adjacent",
      relevanceScore: 68,
      industries: ["산업기술 R&D", "드론", "UAM", "항공"],
      technologyAreas: ["드론", "UAM", "무인이동체", "자율비행"],
      supportAmountText: "KIAT 드론/UAM 인접 산업기술 지원사업",
      participationType: "드론/UAM 인접 산업기술 R&D 또는 기반구축 지원사업",
      targetCompanyType: "기업, 대학, 연구기관 등 드론/UAM 인접 산업기술 수행기관",
      eligibilityText: "드론/UAM 인접 산업기술 R&D 또는 기반구축 수행기관 대상 가능성이 있는 공고입니다. 세부 신청 자격은 원문 및 첨부파일 확인 필요.",
      universityOrResearchPartnerRequired: true,
      inferDateFromText: false,
      preferHtmlDeadline: false
    };
  }

  return undefined;
};

const classifyGntpSupportNotice = (text) => {
  if (/컨설팅|ESG|정보보호|세미나|교육|채용|입주|평가위원|용역|입찰/.test(text)) return undefined;
  if (procurementNoticePattern.test(text) || nonProgramNoticePattern.test(text)) return undefined;

  if (/우주항공|우주\s*항공|우주산업|위성|우주\s*AI|우주항공AI/.test(text)) {
    return {
      spaceCategory: /위성/.test(text) ? "satellite" : "space_commercialization",
      relevanceScore: 78,
      industries: ["경남 우주항공", "우주항공 AI", "지역기업 지원"],
      technologyAreas: ["우주항공 AI", "국산화", "상용기술개발", "사업화"],
      supportAmountText: "경남테크노파크 우주항공 지역기업 지원사업",
      participationType: "지역 우주항공 기업지원/R&D 지원사업",
      targetCompanyType: "경남 소재 우주항공/ICT/AI 관련 기업",
      eligibilityText: "경남 지역 우주항공 ICT·AI 산업 관련 기업 대상 가능성이 있는 지원사업입니다. 세부 자격과 지역 요건은 원문 및 첨부파일 확인 필요."
    };
  }

  if (/항공산업|항공\s*부품|항공\s*기업|항공\s*분야|항공\s*ICT|항공\s*AI/.test(text)) {
    return {
      spaceCategory: "aviation_industry",
      relevanceScore: 70,
      industries: ["경남 항공산업", "항공부품", "지역기업 지원"],
      technologyAreas: ["항공산업", "항공부품", "사업화", "기술개발"],
      supportAmountText: "경남테크노파크 항공산업 지역기업 지원사업",
      participationType: "지역 항공산업 기업지원사업",
      targetCompanyType: "경남 소재 항공산업 관련 기업",
      eligibilityText: "경남 지역 항공산업 관련 기업 대상 가능성이 있는 지원사업입니다. 세부 자격과 지역 요건은 원문 및 첨부파일 확인 필요."
    };
  }

  if (/(?<!후)방산|국방|방위산업/.test(text) && /우주항공|항공|드론|무인기|무인이동체|항공산업/.test(text)) {
    return {
      spaceCategory: "defense_aerospace_adjacent",
      relevanceScore: 66,
      industries: ["경남 방산", "항공우주", "지역기업 지원"],
      technologyAreas: ["방산 항공우주", "항공산업", "사업화"],
      supportAmountText: "경남테크노파크 방산/항공우주 지역기업 지원사업",
      participationType: "지역 방산/항공우주 기업지원사업",
      defenseOrDualUse: true
    };
  }

  return undefined;
};

const classifyDjtpSupportNotice = (text) => {
  if (/선정결과|인턴십|전시|박람회|컨퍼런스|학술대회|설명회|행사|세미나|교육|입주기업|입주자|채용|입찰|수요조사|공청회/.test(text)) return undefined;
  if (procurementNoticePattern.test(text) || nonProgramNoticePattern.test(text)) return undefined;

  if (/국방[\s\S]{0,10}우주|우주[\s\S]{0,10}국방|우주산업|우주\s*소부장|우주항공|위성/i.test(text)) {
    return {
      spaceCategory: /국방|방산/.test(text) ? "defense_aerospace_adjacent" : "space_commercialization",
      relevanceScore: /우주산업/.test(text) ? 80 : 74,
      industries: ["대전 우주산업", "우주항공", "지역기업 지원"],
      technologyAreas: ["우주산업", "우주항공 소부장", "시제품 제작", "사업화"],
      supportAmountText: "대전테크노파크 우주산업/국방우주 지역기업 지원사업",
      participationType: "지역 우주산업 기업지원/R&D·사업화 지원사업",
      targetCompanyType: "대전 소재 또는 대전 우주산업 관련 기업, 창업기업, 연구조직",
      eligibilityText: "대전 지역 우주산업, 국방우주 소부장, 우주항공 기술 관련 기업 또는 연구조직 대상 가능성이 있는 지역 지원사업입니다. 세부 지역 요건, 지원 항목, 제출서류는 원문 PDF 확인 필요.",
      universityOrResearchPartnerRequired: false,
      defenseOrDualUse: /국방|방산/.test(text),
      inferDateFromText: false,
      preferHtmlDeadline: false
    };
  }

  if (/국방[\s\S]{0,10}드론|드론[\s\S]{0,10}국방|무인기|무인이동체|UAM|AAM/i.test(text)) {
    return {
      spaceCategory: "defense_aerospace_adjacent",
      relevanceScore: 70,
      industries: ["대전 방산", "드론", "항공우주", "지역기업 지원"],
      technologyAreas: ["국방드론", "무인이동체", "기술지원", "시험장비"],
      supportAmountText: "대전테크노파크 국방·드론 지역기업 지원사업",
      participationType: "지역 국방드론/무인이동체 기업지원사업",
      targetCompanyType: "대전 소재 또는 대전 방산·드론 분야 기업, 창업기업, 연구조직",
      eligibilityText: "대전 지역 방산·드론·무인이동체 관련 기업 또는 연구조직 대상 가능성이 있는 지원사업입니다. 세부 지역 요건, 장비활용/기술지원 범위, 제출서류는 원문 PDF 확인 필요.",
      universityOrResearchPartnerRequired: false,
      defenseOrDualUse: true,
      inferDateFromText: false,
      preferHtmlDeadline: false
    };
  }

  return undefined;
};

const classifyJntpSupportNotice = (text) => {
  if (/선정결과|전시|박람회|컨퍼런스|설명회|행사|세미나|교육|입주기업\s*모집|입주자|채용|입찰|수요조사|공청회/.test(text)) return undefined;
  if (procurementNoticePattern.test(text) || nonProgramNoticePattern.test(text)) return undefined;

  if (/위성|우주산업|우주항공|우주\s*기술|우주\s*부품|순천형\s*위성/i.test(text)) {
    return {
      spaceCategory: /위성/.test(text) ? "satellite" : "space_commercialization",
      relevanceScore: 80,
      industries: ["전남 우주항공", "위성", "지역기업 지원"],
      technologyAreas: ["위성", "우주항공 부품", "시제품 제작", "실증"],
      supportAmountText: "전남테크노파크 우주항공 지역기업 지원사업",
      participationType: "지역 우주항공 기업지원/R&D·사업화 지원사업",
      targetCompanyType: "전남 소재 또는 전남 우주항공/위성 관련 기업, 연구조직",
      eligibilityText: "전남 지역 우주항공, 위성, 드론 산업 관련 기업 또는 연구조직 대상 가능성이 있는 지역 지원사업입니다. 세부 지역 요건, 지원 항목, 제출서류는 원문 확인 필요.",
      universityOrResearchPartnerRequired: false,
      inferDateFromText: false,
      preferHtmlDeadline: true
    };
  }

  if (/고흥드론센터|드론|무인기|무인이동체|UAM|AAM/i.test(text)) {
    return {
      spaceCategory: "drone_uam_adjacent",
      relevanceScore: 72,
      industries: ["전남 드론", "우주항공", "지역기업 지원"],
      technologyAreas: ["드론", "무인이동체", "기술개발", "실증", "사업화"],
      supportAmountText: "전남테크노파크 드론/우주항공 지역기업 지원사업",
      participationType: "지역 드론/무인이동체 기업지원사업",
      targetCompanyType: "고흥드론센터 입주기업 또는 전남 드론/우주항공 분야 기업, 연구조직",
      eligibilityText: "고흥드론센터 입주기업 또는 전남 드론/우주항공 분야 기업 대상 가능성이 있는 지원사업입니다. 세부 입주계약, 지역 요건, 지원 항목, 제출서류는 원문 확인 필요.",
      universityOrResearchPartnerRequired: false,
      inferDateFromText: false,
      preferHtmlDeadline: true
    };
  }

  return undefined;
};

const classifyItpSupportNotice = (text) => {
  if (/설명회|사전예고|전시|박람회|참관|홍보관|행사|세미나|교육|채용|입주|결과|선정|상시/.test(text)) return undefined;
  if (procurementNoticePattern.test(text) || nonProgramNoticePattern.test(text)) return undefined;

  if (/드론|무인기|무인이동체/i.test(text)) {
    return {
      spaceCategory: "drone_uam_adjacent",
      relevanceScore: 72,
      industries: ["인천 드론", "항공", "지역기업 지원"],
      technologyAreas: ["드론", "도시관리 실증", "무인이동체", "실증"],
      supportAmountText: "인천테크노파크 드론/항공 지역 지원사업",
      participationType: "지역 드론/무인이동체 기업지원·실증사업",
      targetCompanyType: "인천 소재 또는 인천 드론/항공 분야 기업, 연구조직",
      eligibilityText: "인천 지역 드론, 무인이동체, 항공 실증 분야 기업 또는 연구조직 대상 가능성이 있는 지원사업입니다. 세부 지역 요건, 지원 항목, 제출서류는 원문 확인 필요.",
      universityOrResearchPartnerRequired: false,
      inferDateFromText: false,
      preferHtmlDeadline: true
    };
  }

  if (/PAV|파브|AAV|UAM|AAM/i.test(text)) {
    return {
      spaceCategory: "drone_uam_adjacent",
      relevanceScore: 70,
      industries: ["인천 PAV", "UAM", "항공", "지역기업 지원"],
      technologyAreas: ["PAV", "UAM", "AAV", "부품개발", "시험인증", "실증기"],
      supportAmountText: "인천테크노파크 PAV/UAM 지역 지원사업",
      participationType: "지역 PAV/UAM 기업지원·실증사업",
      targetCompanyType: "인천 소재 또는 인천 PAV/UAM/항공 분야 기업, 연구조직",
      eligibilityText: "인천 지역 PAV, UAM, AAV 또는 항공 분야 기업·연구조직 대상 가능성이 있는 지원사업입니다. 세부 지역 요건, 지원 항목, 제출서류는 원문 확인 필요.",
      universityOrResearchPartnerRequired: false,
      inferDateFromText: false,
      preferHtmlDeadline: true
    };
  }

  if (/항공우주|항공\s*산업|항공\s*부품|항공\s*실증|항공\s*선도기업/.test(text)) {
    return {
      spaceCategory: "aviation_industry",
      relevanceScore: 66,
      industries: ["인천 항공산업", "항공우주", "지역기업 지원"],
      technologyAreas: ["항공산업", "항공부품", "사업화", "실증"],
      supportAmountText: "인천테크노파크 항공산업 지역 지원사업",
      participationType: "지역 항공산업 기업지원사업",
      targetCompanyType: "인천 소재 또는 인천 항공산업 관련 기업, 연구조직",
      eligibilityText: "인천 지역 항공산업 관련 기업 또는 연구조직 대상 가능성이 있는 지원사업입니다. 세부 지역 요건, 지원 항목, 제출서류는 원문 확인 필요.",
      universityOrResearchPartnerRequired: false,
      inferDateFromText: false,
      preferHtmlDeadline: true
    };
  }

  return undefined;
};

const classifyTipaSmtechNotice = (text) => {
  if (/설명회|행사|세미나|교육|평가위원|매뉴얼|가이드|시스템\s*점검|투자설명회|IR\s*모집/i.test(text)) return undefined;
  if (procurementNoticePattern.test(text) || nonProgramNoticePattern.test(text)) return undefined;

  if (/방산[\s\S]{0,12}우주항공|우주항공|항공우주|위성|발사체|우주\s*산업|우주\s*기술/i.test(text)) {
    return {
      spaceCategory: /방산|국방|방위/.test(text) ? "defense_aerospace_adjacent" : "space_commercialization",
      relevanceScore: /방산[\s\S]{0,12}우주항공|우주항공|항공우주/.test(text) ? 82 : 76,
      industries: ["중소기업 R&D", "우주항공", "딥테크"],
      technologyAreas: ["우주항공", "딥테크", "방산"],
      supportAmountText: "중소기업 기술개발 R&D 지원사업",
      targetCompanyType: "우주항공·방산·딥테크 분야 중소기업 또는 R&D 수행기업",
      eligibilityText: "중소기업 기술개발사업 계열 공고입니다. 세부 신청 자격, IRIS/SMTECH 접수 요건, 품목·분야 요건은 원문 및 연계 시스템 확인 필요.",
      participationType: "중소기업 R&D 과제",
      universityOrResearchPartnerRequired: false,
      inferDateFromText: false,
      preferHtmlDeadline: false,
      defenseOrDualUse: /방산|국방|방위/.test(text)
    };
  }

  if (/드론|UAM|AAM|무인기|무인이동체|자율비행/i.test(text)) {
    return {
      spaceCategory: "drone_uam_adjacent",
      relevanceScore: 72,
      industries: ["중소기업 R&D", "드론/UAM", "딥테크"],
      technologyAreas: ["드론", "UAM", "무인이동체"],
      supportAmountText: "중소기업 기술개발 R&D 지원사업",
      targetCompanyType: "드론/UAM/무인이동체 분야 중소기업 또는 R&D 수행기업",
      eligibilityText: "중소기업 기술개발사업 계열 공고입니다. 세부 신청 자격, IRIS/SMTECH 접수 요건, 품목·분야 요건은 원문 및 연계 시스템 확인 필요.",
      participationType: "중소기업 R&D 과제",
      universityOrResearchPartnerRequired: false,
      inferDateFromText: false,
      preferHtmlDeadline: false,
      defenseOrDualUse: /방산|국방|방위/.test(text)
    };
  }

  return undefined;
};

const classifyBizinfoNotice = (text) => {
  if (/전후방산업|인턴십|코믹콘|게임|뷰티|관광|숙박|소상공인|착한가격|묘목|포럼|피칭\s*행사|컨퍼런스|세미나|경진대회|공모전|아이디어\s*대회|전시관\s*참가|전시회\s*참가|박람회\s*참가/.test(text)) return undefined;
  if (procurementNoticePattern.test(text) || nonProgramNoticePattern.test(text)) return undefined;

  if (/위성|우주산업|우주항공|국제우주대회|우주항공용|우주\s*기업|우주\s*분야/.test(text)) {
    return {
      spaceCategory: /위성/.test(text) ? "satellite" : "space_commercialization",
      relevanceScore: 84,
      industries: ["우주산업", "항공우주", "중소기업 지원"],
      technologyAreas: ["우주산업", "위성", "우주기술 사업화"]
    };
  }
  if (/항공부품|항공산업|항공\s*기업|항공\s*분야|항공우주/.test(text)) {
    return {
      spaceCategory: "aviation_industry",
      relevanceScore: 72,
      industries: ["항공", "항공우주", "중소기업 지원"],
      technologyAreas: ["항공부품", "항공산업", "인증", "사업화"]
    };
  }
  if (/드론|UAM|AAM|무인기|무인이동체/i.test(text)) {
    return {
      spaceCategory: "drone_uam_adjacent",
      relevanceScore: 68,
      industries: ["드론", "UAM", "항공", "중소기업 지원"],
      technologyAreas: ["드론", "무인이동체", "실증", "사업화"]
    };
  }
  if (/(?<!후)방산|국방|방위\s*R&D|K방산/.test(text)) {
    return {
      spaceCategory: "defense_aerospace_adjacent",
      relevanceScore: 66,
      industries: ["방산", "국방기술", "중소기업 지원"],
      technologyAreas: ["방산", "국방 R&D", "기술사업화"]
    };
  }
  return undefined;
};

const fetchBizinfoPageSources = async ({ schEndAt, cpage }) => {
  const pageUrl = `${bizinfoListUrl}?rows=15&cpage=${cpage}&schEndAt=${schEndAt}`;
  const html = await fetchPage(pageUrl);
  const rows = html.match(/<tr>[\s\S]*?<\/tr>/gi) ?? [];
  const pageSources = [];

  for (const row of rows) {
    const link = row.match(/pblancId=(PBLN_\d+)[^>]*title="([^"]+)/i);
    if (!link) continue;

    const title = stripHtml(link[2]).replace(/\s*페이지\s*이동$/, "");
    const classification = classifyBizinfoNotice(title);
    if (!classification) continue;

    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => stripHtml(match[1]));
    const { announcementDate, defaultDeadline } = parseDateRange(cells[3] ?? "");
    const sourceFamily = /한국산업기술기획평가원|산업통상부|한국산업기술진흥원/.test(row)
      ? "MOTIE_KEIT_KIAT"
      : "BIZINFO";
    const agency = cells[4] || "기업마당";
    const executingAgency = cells[5];

    pageSources.push({
      id: `space-bizinfo-discovered-${link[1]}`,
      url: `https://www.bizinfo.go.kr/sii/siia/selectSIIA200Detail.do?pblancId=${encodeURIComponent(link[1])}`,
      source: "bizinfo_discovered_support_notice",
      sourceFamily,
      agency: executingAgency ? `${agency}/${executingAgency}` : agency,
      defaultTitle: title,
      announcementDate,
      defaultDeadline,
      supportAmountText: "기업마당 지원사업 공고",
      participationType: "중소기업/산업기술 지원사업",
      defenseOrDualUse: /(?<!후)방산|국방|방위\s*R&D|K방산/.test(title),
      inferDateFromText: false,
      ...classification
    });
  }

  return pageSources;
};

const fetchBizinfoPagesWithConcurrency = async (pages, concurrency = 6) => {
  const results = [];
  for (let index = 0; index < pages.length; index += concurrency) {
    const chunk = pages.slice(index, index + concurrency);
    const chunkResults = await Promise.all(chunk.map((page) => fetchBizinfoPageSources(page)));
    results.push(...chunkResults.flat());
  }
  return results;
};

const discoverBizinfoSources = async () => {
  const discovered = [];
  const seen = new Set();
  const pages = [];

  for (const schEndAt of ["N", "Y"]) {
    for (let cpage = 1; cpage <= 30; cpage += 1) {
      pages.push({ schEndAt, cpage });
    }
  }

  for (const source of await fetchBizinfoPagesWithConcurrency(pages)) {
    if (seen.has(source.id)) continue;
    seen.add(source.id);
    discovered.push(source);
  }

  return discovered.slice(0, 24);
};

const discoverKariSources = async () => {
  const html = await fetchPage(kariResearchListUrl);
  const discovered = [];
  const rows = html.match(/<li>[\s\S]*?<\/li>/gi) ?? [];

  for (const row of rows) {
    const link = row.match(/href="(\/kor\/article\/ATCLd4f64ac47\/(\d+))"[\s\S]*?<strong>([\s\S]*?)<\/strong>/i);
    if (!link) continue;

    const title = stripHtml(link[3]);
    const classification = classifyKariNotice(title);
    if (!classification) continue;

    const announcementDate = row.match(/<p[^>]*class="[^"]*\bdate\b[^"]*"[^>]*>[\s\S]*?등록일<\/span>\s*(20\d{2}-\d{2}-\d{2})/i)?.[1];
    const researchApplicantNotice = researchApplicantPattern.test(title);

    discovered.push({
      id: `space-kari-discovered-${link[2]}`,
      url: normalizeAbsoluteUrl(kariResearchListUrl, link[1]),
      source: "kari_discovered_research_notice",
      sourceFamily: "KARI",
      agency: "한국항공우주연구원",
      defaultTitle: title,
      announcementDate,
      supportAmountText: "한국항공우주연구원 위탁연구/R&D 공고",
      participationType: "항공우주 R&D 위탁연구과제",
      targetCompanyType: researchApplicantNotice
        ? "대학, 출연연, 연구기관, 연구팀, 기업 연구조직 등 국가연구개발혁신법상 연구개발기관"
        : undefined,
      eligibilityText: researchApplicantNotice
        ? "대학 연구실, 출연연, 연구기관, 연구팀, 기업 연구조직 등 연구개발기관 참여 가능성이 있는 항공우주 R&D 공고입니다. 세부 자격은 원문 및 첨부파일 확인 필요."
        : undefined,
      consortiumRequired: false,
      universityOrResearchPartnerRequired: researchApplicantNotice,
      inferDateFromText: false,
      preferHtmlDeadline: true,
      ...classification
    });
  }

  return discovered.slice(0, 10);
};

const discoverItpSupportSources = async () => {
  const discovered = [];
  const seen = new Set();
  const rowPattern = /\|\s*\d+\s*\|\s*([^|]+?)\s*\|\s*\[([^\]]+)\]\(javascript:fncShow\('(\d+)'\)\)\s*\|\s*(20\d{2}-\d{2}-\d{2})\s*\|\s*!\[[^\]]*:\s*([^\]]+)\][^|]*\|\s*[^|]+\|/gi;
  let parsedRowCount = 0;
  let failedListCount = 0;

  for (const [tmid, listUrl] of itpSupportListUrls) {
    let markdown;
    try {
      markdown = await fetchPage(listUrl, { preferJina: true });
    } catch {
      failedListCount += 1;
      continue;
    }

    const matches = [...markdown.matchAll(rowPattern)];
    if (matches.length === 0) {
      failedListCount += 1;
      continue;
    }
    parsedRowCount += matches.length;

    for (const match of matches) {
      const field = stripHtml(match[1]);
      const title = stripHtml(match[2]);
      const seq = match[3];
      const announcementDate = match[4];
      const statusText = stripHtml(match[5]);
      const combinedText = `${field} ${title} ${statusText}`;
      const classification = classifyItpSupportNotice(combinedText);
      if (!classification || seen.has(seq)) continue;
      seen.add(seq);

      discovered.push({
        id: `space-itp-discovered-${seq}`,
        url: `https://www.itp.or.kr/intro.asp?seq=${encodeURIComponent(seq)}&tmid=13`,
        source: "itp_discovered_support_notice",
        sourceFamily: "ITP",
        agency: "인천테크노파크",
        defaultTitle: title,
        announcementDate,
        region: "인천",
        targetRegions: ["인천"],
        supportAmountText: "인천테크노파크 지역 항공/드론/PAV 지원사업",
        participationType: "지역 항공/드론/PAV 기업지원사업",
        inferDateFromText: false,
        preferJina: true,
        ...classification
      });
    }
  }

  if (parsedRowCount === 0 && failedListCount > 0) {
    throw new Error("ITP support list returned no parseable support rows.");
  }

  return discovered.slice(0, 8);
};

const findNoYearDeadline = (text, announcementDate) => {
  const year = announcementDate?.match(/^20\d{2}/)?.[0];
  if (!year) return undefined;

  const toNoYearDate = (month, day) => formatDate(year, month, day);
  const specificAnchors = ["신청서 및 계획서", "신청서", "사업계획서", "신청양식"];
  for (const anchor of specificAnchors) {
    const index = text.indexOf(anchor);
    if (index < 0) continue;
    const context = text.slice(index, index + 240);
    const range = context.match(noYearDateRangePattern);
    if (range) {
      const endMonth = range[3] ?? range[1];
      const date = toNoYearDate(endMonth, range[4]);
      if (date) return date;
    }
  }

  const deadlineContext = text.match(/(?:신청\s*접수|접수|제출|신청)[\s\S]{0,180}?(\d{1,2})\s*월\s*(\d{1,2})\s*일[\s\S]{0,40}?까지/);
  if (!deadlineContext) return undefined;
  return toNoYearDate(deadlineContext[1], deadlineContext[2]);
};

const extractNoYearDeadlineContext = (text, announcementDate) => {
  const year = announcementDate?.match(/^20\d{2}/)?.[0];
  if (!year) return undefined;

  const specificAnchors = ["신청서 및 계획서", "신청서", "사업계획서", "신청양식"];
  for (const anchor of specificAnchors) {
    const index = text.indexOf(anchor);
    if (index < 0) continue;
    const context = text.slice(index, index + 240);
    const range = context.match(noYearDateRangePattern);
    if (range) {
      const endMonth = range[3] ?? range[1];
      const endDate = formatDate(year, endMonth, range[4]);
      return `${anchor} ${range[0]} (공고일 ${announcementDate} 기준 ${endDate}로 보정)`;
    }
  }

  const deadlineContext = text.match(/(?:신청\s*접수|접수|제출|신청)[\s\S]{0,180}?(\d{1,2})\s*월\s*(\d{1,2})\s*일[\s\S]{0,40}?까지/);
  if (!deadlineContext) return undefined;
  const endDate = formatDate(year, deadlineContext[1], deadlineContext[2]);
  return `${deadlineContext[0]} (공고일 ${announcementDate} 기준 ${endDate}로 보정)`;
};

const discoverKasiSources = async () => {
  const discovered = [];
  const seen = new Set();

  for (let cPage = 1; cPage <= 5; cPage += 1) {
    const pageUrl = `${kasiNoticeListUrl}?cPage=${cPage}`;
    const html = await fetchPage(pageUrl);
    const blocks = html.match(/<div[^>]*class="[^"]*\btitle_wr\b[^"]*"[^>]*>[\s\S]*?(?=<div[^>]*class="[^"]*\btitle_wr\b|<nav[^>]*class="[^"]*\bpagination_block\b|$)/gi) ?? [];

    for (const block of blocks) {
      const link = block.match(/href="([^"]*\/kor\/publication\/post\/notice\/(\d+))"/i);
      if (!link || seen.has(link[2])) continue;

      const title = stripHtml(block.match(/<strong[^>]*class="[^"]*\btitle\b[^"]*"[^>]*>([\s\S]*?)<\/strong>/i)?.[1] ?? "")
        .replace(/\s*첨부파일 있음$/, "");
      const blockText = stripHtml(block);
      const combinedText = `${title} ${blockText}`;
      const classification = classifyKasiNotice(combinedText);
      if (!classification) continue;

      seen.add(link[2]);
      const announcementDate = blockText.match(/20\d{2}-\d{2}-\d{2}/)?.[0];
      const defaultDeadline = findDeadline(blockText) ?? findNoYearDeadline(blockText, announcementDate);

      discovered.push({
        id: `space-kasi-discovered-${link[2]}`,
        url: normalizeAbsoluteUrl(kasiNoticeListUrl, link[1]),
        source: "kasi_discovered_research_notice",
        sourceFamily: "KASI",
        agency: "한국천문연구원",
        defaultTitle: title,
        announcementDate,
        defaultDeadline,
        targetCompanyType: "대학 연구실, 출연연, 연구자, 연구팀",
        eligibilityText: "우주과학탐사 분야 연구자, 전문가, 대학 연구실, 출연연 또는 관련 연구팀 대상 가능성이 있는 공고입니다. 세부 자격은 원문 확인 필요.",
        consortiumRequired: false,
        universityOrResearchPartnerRequired: true,
        inferDateFromText: false,
        preferHtmlDeadline: true,
        ...classification
      });
    }
  }

  return discovered.slice(0, 8);
};

const discoverKasaSources = async () => {
  const html = await fetchPage(kasaBusinessListUrl, { preferCurlCffi: true });
  const discovered = [];
  const seen = new Set();
  const rowPattern = /<div[^>]*class="[^"]*\bprogram__board-row\b[^"]*"[^>]*>[\s\S]*?(?=<div[^>]*class="[^"]*\bprogram__board-row\b|<div[^>]*class="[^"]*\bboard_pager\b|<\/form>)/gi;

  for (const rowMatch of html.matchAll(rowPattern)) {
    const row = rowMatch[0];
    const idMatch = row.match(/fn_search_detail\('([^']+)'\)/i);
    const titleMatch = row.match(/<strong[^>]*class="[^"]*\bboard__subject-text\b[^"]*"[^>]*>([\s\S]*?)<\/strong>/i);
    if (!idMatch || !titleMatch) continue;

    const nttId = idMatch[1];
    if (seen.has(nttId)) continue;
    seen.add(nttId);

    const title = stripHtml(titleMatch[1]);
    const classification = classifyKasaNotice(title);
    if (!classification) continue;

    const dateMatch = row.match(/aria-label="등록일"[\s\S]*?<span[^>]*class="[^"]*\btd\b[^"]*"[^>]*>([^<]+)<\/span>/i);
    const fileMatch = row.match(/fn_zipDownload\('([^']+)'\)/i);

    discovered.push({
      id: `space-kasa-discovered-${slugId(nttId)}`,
      url: `https://www.kasa.go.kr/bbs/BBSMSTR_000000000018/view.do?nttId=${encodeURIComponent(nttId)}`,
      source: "kasa_discovered_business_notice",
      sourceFamily: "KASA",
      agency: "우주항공청",
      defaultTitle: title,
      announcementDate: dateMatch ? stripHtml(dateMatch[1]) : undefined,
      supportAmountText: "우주항공청 사업공고",
      participationType: "우주항공청 R&D/사업 공고",
      consortiumRequired: false,
      inferDateFromText: false,
      preferCurlCffi: true,
      seedAttachmentUrls: fileMatch
        ? [`https://www.kasa.go.kr/cmm/fms/zipDownload.do?atchFileIdStr=${encodeURIComponent(fileMatch[1])}&zipFileName=zipDownload.zip`]
        : [],
      ...classification
    });
  }

  return discovered.slice(0, 10);
};

const discoverDapaSources = async () => {
  const html = await fetchPage(dapaNoticeListUrl, { preferCurlCffi: true });
  const discovered = [];
  const rows = html.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];

  for (const row of rows) {
    const docMatch = row.match(/fn_selectDoc\('(\d+)'\)/i);
    const titleMatch = row.match(/<p[^>]*class="[^"]*\btext\b[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
    if (!docMatch || !titleMatch) continue;

    const title = stripHtml(titleMatch[1]).replace(/\s*새 글$/, "");
    const classification = classifyDapaNotice(title);
    if (!classification) continue;

    const docSeq = docMatch[1];
    const dateMatch = row.match(/<td>\s*(20\d{2}-\d{2}-\d{2})\s*<\/td>/);
    const attachmentUrls = [...row.matchAll(/href="([^"]*\/jfile\/board\/readDownloadFile\.do[^"]*)"/gi)]
      .map((match) => normalizeAbsoluteUrl(dapaNoticeListUrl, match[1]));

    discovered.push({
      id: `space-dapa-discovered-${docSeq}`,
      url: `https://www.dapa.go.kr/dapa/doc/selectDoc.do?bbsSeq=443&docSeq=${docSeq}&menuSeq=3031`,
      source: "dapa_discovered_notice",
      sourceFamily: "DAPA",
      agency: "방위사업청",
      defaultTitle: title,
      announcementDate: dateMatch ? dateMatch[1] : undefined,
      supportAmountText: "방위사업청 공개 공지/사업 공고",
      participationType: "방산/국방기술 공개 공고",
      defenseOrDualUse: true,
      inferDateFromText: false,
      preferCurlCffi: true,
      seedAttachmentUrls: attachmentUrls,
      ...classification
    });
  }

  return discovered.slice(0, 8);
};

const discoverAddProposalSources = async () => {
  const discovered = [];
  const seen = new Set();

  for (let pageNum = 1; pageNum <= 3; pageNum += 1) {
    const html = await fetchPage(`${addProposalListUrl}&pageNum=${pageNum}&rowCnt=10`);
    const rows = html.match(/<tr>[\s\S]*?<\/tr>/gi) ?? [];

    for (const row of rows) {
      const hrefMatch = row.match(/href="([^"]*\/kps\/publicNtis\/ntisView[^"]*)"/i);
      const titleMatch = row.match(/title="([^"]+)"/i);
      const titleId = hrefMatch?.[1].match(/[?&]titleId=(\d+)/)?.[1];
      if (!hrefMatch || !titleMatch || !titleId || seen.has(titleId)) continue;

      const title = stripHtml(titleMatch[1]);
      const classification = classifyAddProposalNotice(title);
      if (!classification) continue;

      const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => stripHtml(match[1]));
      const noticeNumber = cells[0]?.replace(/\D/g, "");
      const announcementDate = cells[2]?.match(/20\d{2}-\d{2}-\d{2}/)?.[0];
      const applicationStartDate = cells[3]?.match(/20\d{2}-\d{2}-\d{2}/)?.[0];
      const defaultDeadline = cells[4]?.match(/20\d{2}-\d{2}-\d{2}/)?.[0];

      seen.add(titleId);
      discovered.push({
        id: `space-add-discovered-${titleId}`,
        url: normalizeAbsoluteUrl(addProposalListUrl, hrefMatch[1].replace(/&titleId=0$/, "")),
        source: "add_discovered_proposal_notice",
        sourceFamily: "ADD",
        agency: "국방과학연구소",
        defaultTitle: title,
        announcementDate,
        applicationStartDate,
        defaultDeadline,
        externalNoticeNumber: noticeNumber,
        inferDateFromText: false,
        ...classification
      });
    }
  }

  return discovered.slice(0, 8);
};

const discoverKritSources = async () => {
  const html = await fetchPage(kritNoticeListUrl, { preferCurlCffi: true });
  const discovered = [];
  const seen = new Set();
  const rows = html.match(/<li(?:\s+class="notice")?>[\s\S]*?<\/li>/gi) ?? [];

  for (const row of rows) {
    const link = row.match(/fnView\('notice'\s*,\s*''\s*,\s*'(\d+)'\s*,\s*'(\d+)'[\s\S]*?<\/span>\s*([^<]+)<\/a>/i);
    if (!link || seen.has(link[1])) continue;

    const title = stripHtml(link[3]);
    const classification = classifyKritNotice(title);
    if (!classification) continue;

    seen.add(link[1]);
    const dateMatch = row.match(/<li[^>]*class="[^"]*\bdate\b[^"]*"[^>]*>\s*(20\d{2}-\d{2}-\d{2})\s*<\/li>/i);
    const url = `https://www.krit.re.kr/krit/bbs/notice_view.do?bbsId=notice&article_category=&nttId=${encodeURIComponent(link[1])}&page=${encodeURIComponent(link[2])}&searchCnd=&searchWrd=&startd=&endd=&csrf=&menu_no=05010000`;

    discovered.push({
      id: `space-krit-discovered-${link[1]}`,
      url,
      source: "krit_discovered_notice",
      sourceFamily: "KRIT",
      agency: "국방기술진흥연구소",
      defaultTitle: title,
      announcementDate: dateMatch ? dateMatch[1] : undefined,
      defenseOrDualUse: true,
      inferDateFromText: false,
      preferCurlCffi: true,
      ...classification
    });
  }

  return discovered.slice(0, 8);
};

const discoverKStartupSources = async () => {
  const discovered = [];
  const seen = new Set();
  const searchTerms = ["", "우주", "항공", "항공우주", "위성", "드론", "UAM", "AAM", "방산"];

  for (const searchTerm of searchTerms) {
    const url = searchTerm
      ? `${kStartupOngoingListUrl}?schStr=${encodeURIComponent(searchTerm)}`
      : kStartupOngoingListUrl;
    const html = await fetchPage(url);
    const rows = html.match(/<li[^>]*class="[^"]*\bnotice\b[^"]*"[^>]*>[\s\S]*?<\/li>/gi) ?? [];

    for (const row of rows) {
      const idMatch = row.match(/go_view\((\d+)\)/i);
      const title = stripHtml(row.match(/<p[^>]*class="[^"]*\btit\b[^"]*"[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? "");
      if (!idMatch || !title || seen.has(idMatch[1])) continue;

      const category = stripHtml(row.match(/<span[^>]*class="[^"]*\bflag\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i)?.[1] ?? "");
      if (category && !/사업화|기술개발|R&D|글로벌|멘토링|컨설팅|창업교육/.test(category)) continue;

      const combinedText = `${category} ${title}`;
      const classification = classifyKStartupNotice(combinedText);
      if (!classification) continue;

      seen.add(idMatch[1]);
      const agency = stripHtml(row.match(/<span[^>]*class="[^"]*\blist\b[^"]*"[^>]*>[\s\S]*?<\/i>\s*([^<]+)<\/span>[\s\S]*?<span[^>]*class="[^"]*\blist\b[^"]*"[^>]*>[\s\S]*?<\/i>\s*([^<]+)<\/span>/i)?.[2] ?? "K-Startup");
      const announcementDate = row.match(/등록일자\s*(20\d{2}-\d{2}-\d{2})/)?.[1];
      const applicationStartDate = row.match(/시작일자\s*(20\d{2}-\d{2}-\d{2})/)?.[1];
      const defaultDeadline = row.match(/마감일자\s*(20\d{2}-\d{2}-\d{2})/)?.[1];

      discovered.push({
        id: `space-kstartup-discovered-${idMatch[1]}`,
        url: `https://www.k-startup.go.kr/web/contents/bizpbanc-ongoing.do?schM=view&pbancSn=${encodeURIComponent(idMatch[1])}&pbancEndYn=N`,
        source: "kstartup_discovered_support_notice",
        sourceFamily: "KSTARTUP",
        agency,
        defaultTitle: title,
        announcementDate,
        applicationStartDate,
        defaultDeadline,
        inferDateFromText: false,
        ...classification
      });
    }
  }

  return discovered.slice(0, 12);
};

const fetchKeitSupportList = async ({ year, searchTerm, pageIndex }) => {
  const body = new URLSearchParams({
    bsnsYy: year,
    searchKeyword: searchTerm,
    pageIndex: String(pageIndex),
    orderBySe: "default"
  });
  const response = await fetch(keitSupportListJsonUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "user-agent": "KoreaSpaceSupportMCP/0.1 metadata-only source discovery"
    },
    body
  });
  if (!response.ok) throw new Error(`KEIT support list failed: ${response.status}`);
  return response.json();
};

const discoverKeitSupportSources = async () => {
  const discovered = [];
  const seen = new Set();
  const currentYear = new Date().getFullYear();
  const years = [String(currentYear), String(currentYear - 1)];
  const searchTerms = ["", "우주", "항공우주", "항공", "위성", "드론", "UAM", "AAM", "무인기", "무인이동체"];

  for (const year of years) {
    for (const searchTerm of searchTerms) {
      const firstPage = await fetchKeitSupportList({ year, searchTerm, pageIndex: 1 });
      const pageCount = Math.min(firstPage.paginationInfo?.totalPageCount ?? 1, 3);

      for (let pageIndex = 1; pageIndex <= pageCount; pageIndex += 1) {
        const page = pageIndex === 1
          ? firstPage
          : await fetchKeitSupportList({ year, searchTerm, pageIndex });

        for (const item of page.list ?? []) {
          const id = item.ancmId;
          const title = stripHtml(item.ancmTl ?? "");
          if (!id || !title || seen.has(id)) continue;

          const classification = classifyKeitSupportNotice(title);
          if (!classification) continue;

          seen.add(id);
          const bsnsYy = String(item.bsnsYy ?? year);
          const defaultDeadline = parseCompactDate(item.maxRcveEndDe);
          const applicationStartDate = parseCompactDate(item.minRcveStrDe);

          discovered.push({
            id: `space-keit-discovered-${id}`,
            url: `${keitSupportDetailUrl}?ancmId=${encodeURIComponent(id)}&bsnsYy=${encodeURIComponent(bsnsYy)}&searchBsnsYy=${encodeURIComponent(bsnsYy)}`,
            source: "keit_discovered_support_notice",
            sourceFamily: "MOTIE_KEIT",
            agency: "한국산업기술기획평가원",
            defaultTitle: title,
            announcementDate: item.ancmDe,
            applicationStartDate,
            defaultDeadline,
            inferDateFromText: false,
            ...classification
          });
        }
      }
    }
  }

  return discovered.slice(0, 12);
};

const discoverKiatBusinessSources = async () => {
  const html = await fetchPage(kiatMainUrl, { preferCurlCffi: true });
  const discovered = [];
  const seen = new Set();
  const itemPattern = /mainContentsGo\('90','([^']+)'\)[\s\S]*?<p class="tit">([\s\S]*?)<\/p>[\s\S]*?<span class="data">([^<]+)<\/span>/gi;

  for (const match of html.matchAll(itemPattern)) {
    const contentsId = match[1];
    const title = stripHtml(match[2]);
    const applicationPeriod = stripHtml(match[3]);
    if (!contentsId || !title || seen.has(contentsId)) continue;

    const classification = classifyKiatBusinessNotice(title);
    if (!classification) continue;

    const { applicationStartDate, defaultDeadline } = parseLooseDateRange(applicationPeriod);
    if (!defaultDeadline) continue;

    seen.add(contentsId);
    const url = `https://www.kiat.or.kr/front/board/boardContentsView.do?MenuId=${encodeURIComponent(kiatBusinessNoticeMenuId)}&board_id=90&contents_id=${encodeURIComponent(contentsId)}`;

    discovered.push({
      id: `space-kiat-discovered-${slugId(contentsId)}`,
      url,
      source: "kiat_discovered_business_notice",
      sourceFamily: "KIAT",
      agency: "한국산업기술진흥원",
      defaultTitle: title,
      sourceTextOverride: `${title} 접수기간 ${applicationStartDate} ~ ${defaultDeadline}`,
      applicationStartDate,
      defaultDeadline,
      ...classification
    });
  }

  return discovered.slice(0, 8);
};

const discoverTipaSmtechSources = async () => {
  const html = await fetchPage(tipaSmtechNoticeListUrl);
  const discovered = [];
  const rows = html.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];

  for (const row of rows) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => stripHtml(match[1]));
    if (cells.length < 7) continue;

    const systemName = cells[1] ?? "";
    const businessName = cells[2] ?? "";
    const title = cells[3] ?? "";
    const applicationPeriod = cells[4] ?? "";
    const announcementDate = cells[5]?.match(/20\d{2}-\d{2}-\d{2}/)?.[0];
    if (!title) continue;

    const combinedText = `${systemName} ${businessName} ${title}`;
    const classification = classifyTipaSmtechNotice(combinedText);
    if (!classification) continue;

    const { applicationStartDate, defaultDeadline } = parseLooseDateRange(applicationPeriod);
    if (!defaultDeadline) continue;

    const rawDetailHref = row.match(/href="([^"]*\/front\/ifg\/no\/notice02_detail\.do[^"]*)"/i)?.[1];
    const decodedDetailHref = rawDetailHref ? decodeHtmlEntities(rawDetailHref) : undefined;
    const ancmIdFromHref = decodedDetailHref?.match(/[?&]ancmId=([^&#]+)/i)?.[1];
    const dtlAncmSnFromHref = decodedDetailHref?.match(/[?&]dtlAncmSn=([^&#]+)/i)?.[1];
    const titleCode = title.match(/20\d{2}-[A-Z0-9]+-\d+/i)?.[0];
    const id = ancmIdFromHref && dtlAncmSnFromHref
      ? `${ancmIdFromHref}-${dtlAncmSnFromHref}`
      : titleCode ?? slugId(title);
    const url = rawDetailHref
      ? normalizeAbsoluteUrl(tipaSmtechNoticeListUrl, rawDetailHref)
      : `${tipaSmtechNoticeListUrl}#${encodeURIComponent(id)}`;

    discovered.push({
      id: `space-tipa-smtech-discovered-${slugId(id)}`,
      url,
      source: "tipa_smtech_discovered_rd_notice",
      sourceFamily: "TIPA_SMTECH",
      agency: "중소기업기술정보진흥원/SMTECH",
      defaultTitle: title,
      sourceTextOverride: `${businessName} ${title} 접수기간 ${applicationStartDate} ~ ${defaultDeadline} 공고일 ${announcementDate ?? ""} 시스템 ${systemName}`,
      announcementDate,
      applicationStartDate,
      defaultDeadline,
      supportAmountText: `${businessName || "중소기업 기술개발사업"} R&D 공고`,
      ...classification
    });
  }

  return discovered.slice(0, 8);
};

const discoverDjtpSupportSources = async () => {
  const pages = await Promise.all(
    Array.from({ length: 6 }, (_, index) => fetchPage(`${djtpBusinessNoticeListUrl}&nPage=${index + 1}`))
  );
  const discovered = [];
  const seen = new Set();

  for (const row of pages.flatMap((html) => html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) ?? [])) {
    const noticeCell = row.match(/<td[^>]*aria-label="공고명"[^>]*>([\s\S]*?)<\/td>/i)?.[1];
    if (!noticeCell) continue;

    const viewerHref = decodeHtmlEntities(noticeCell.match(/<a[^>]+href="([^"]+)"/i)?.[1] ?? "");
    const businessHref = decodeHtmlEntities(row.match(/<a[^>]+href="([^"]*business\.jsp\?gubun=pbancView[^"]+)"/i)?.[1] ?? "");
    const id = stripHtml(noticeCell.match(/<strong>([\s\S]*?)<\/strong>/i)?.[1] ?? "");
    const title = stripHtml(noticeCell)
      .replace(new RegExp(`^${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`), "")
      .trim();
    const category = stripHtml(row.match(/<span class="btn_line2">([\s\S]*?)<\/span>/i)?.[1] ?? "");
    const department = stripHtml(row.match(/<td[^>]*aria-label="부서"[^>]*>([\s\S]*?)<\/td>/i)?.[1] ?? "");
    const applicationPeriod = stripHtml(row.match(/<td[^>]*aria-label="접수기간"[^>]*>([\s\S]*?)<\/td>/i)?.[1] ?? "");
    if (!viewerHref || !id || !title) continue;
    if (seen.has(id)) continue;

    const combinedText = `${category} ${title} ${department}`;
    const classification = classifyDjtpSupportNotice(combinedText);
    if (!classification) continue;

    const { applicationStartDate, defaultDeadline } = parseLooseDateRange(applicationPeriod);
    if (!defaultDeadline) continue;

    seen.add(id);
    const viewerUrl = normalizeAbsoluteUrl(djtpBusinessNoticeListUrl, viewerHref);
    const businessUrl = businessHref
      ? normalizeAbsoluteUrl(djtpBusinessNoticeListUrl, businessHref)
      : `https://pms.dips.or.kr/sso/business.jsp?gubun=pbancView&pbanc_no=${encodeURIComponent(id)}`;

    discovered.push({
      id: `space-djtp-discovered-${slugId(id)}`,
      url: viewerUrl,
      source: "djtp_discovered_support_notice",
      sourceFamily: "DJTP",
      agency: "대전테크노파크",
      defaultTitle: `[${id}]${title}`,
      dedupeKey: `DJTP:${title.replace(/^\[[^\]]+\]\s*/, "").replace(/\s+/g, " ").trim()}`,
      sourceTextOverride: `${category} [${id}]${title} ${department} 접수기간 ${applicationStartDate ? `${applicationStartDate} ~ ` : ""}${defaultDeadline} 사업신청 ${businessUrl}`,
      applicationStartDate,
      defaultDeadline,
      region: "대전",
      targetRegions: ["대전"],
      seedAttachmentUrls: [viewerUrl],
      ...classification
    });
  }

  const capped = discovered.slice(0, 12);
  if (discovered.length > capped.length) {
    console.warn(`DJTP discovery capped ${discovered.length} matching notices to ${capped.length}.`);
  }

  return capped;
};

const discoverJntpSupportSources = async () => {
  const [listHtml, mainHtml] = await Promise.all([
    fetchPage(jntpAnnouncementListUrl),
    fetchPage(jntpMainUrl)
  ]);
  const discovered = [];
  const seen = new Set();
  const itemPattern = /<a href="([^"]*\/base\/apiAnnouncement\/read\?announcement=(\d+)[^"]*)">[\s\S]*?<span class="(?:before|ing|end)">([^<]+)<\/span>[\s\S]*?<span class="applications[^"]*">([^<]+)<\/span>[\s\S]*?<h2>([\s\S]*?)<\/h2>[\s\S]*?<p class="date">([^<]+)<\/p>/gi;

  const pushCandidate = ({ href, announcementId, statusText, category, title, applicationPeriod }) => {
    if (!announcementId || !title || seen.has(announcementId)) return;

    const combinedText = `${category} ${title} ${statusText}`;
    const classification = classifyJntpSupportNotice(combinedText);
    if (!classification) return;

    const { applicationStartDate, defaultDeadline } = parseLooseDateRange(applicationPeriod);
    if (!defaultDeadline) return;

    seen.add(announcementId);
    discovered.push({
      id: `space-jntp-discovered-${announcementId}`,
      url: normalizeAbsoluteUrl(jntpMainUrl, href),
      source: "jntp_discovered_support_notice",
      sourceFamily: "JNTP",
      agency: "전남테크노파크",
      defaultTitle: title,
      sourceTextOverride: `${category} ${title} ${statusText} 접수기간 ${applicationStartDate} ~ ${defaultDeadline}`,
      applicationStartDate,
      defaultDeadline,
      statusText,
      region: "전남",
      targetRegions: ["전남"],
      ...classification
    });
  };

  const listRows = listHtml.match(/<tr>[\s\S]*?<\/tr>/gi) ?? [];
  for (const row of listRows) {
    const link = row.match(/href="([^"]*\/base\/apiAnnouncement\/read\?announcement=(\d+)[^"]*)"/i);
    const title = stripHtml(row.match(/<td class="tit">[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i)?.[1] ?? "");
    const applicationPeriod = stripHtml(row.match(/<td class="date">([\s\S]*?)<\/td>/i)?.[1] ?? "");
    if (!link || !title || !applicationPeriod) continue;

    pushCandidate({
      href: decodeHtmlEntities(link[1]),
      announcementId: link[2],
      statusText: stripHtml(row.match(/<span class="applications[^"]*">([^<]+)<\/span>/i)?.[1] ?? ""),
      category: "",
      title,
      applicationPeriod
    });
  }

  for (const match of mainHtml.matchAll(itemPattern)) {
    pushCandidate({
      href: decodeHtmlEntities(match[1]),
      announcementId: match[2],
      statusText: stripHtml(match[3]),
      category: stripHtml(match[4]),
      title: stripHtml(match[5]),
      applicationPeriod: stripHtml(match[6])
    });
  }

  const looseBlocks = mainHtml.match(/<li>\s*<a href="[^"]*\/base\/apiAnnouncement\/read\?announcement=\d+[\s\S]*?<\/a>\s*<\/li>/gi) ?? [];
  for (const block of looseBlocks) {
    const link = block.match(/href="([^"]*\/base\/apiAnnouncement\/read\?announcement=(\d+)[^"]*)"/i);
    const title = stripHtml(block.match(/<h2>([\s\S]*?)<\/h2>/i)?.[1] ?? "");
    const applicationPeriod = stripHtml(block.match(/<p class="date">([^<]+)<\/p>/i)?.[1] ?? "");
    if (!link || !title || !applicationPeriod) continue;

    pushCandidate({
      href: decodeHtmlEntities(link[1]),
      announcementId: link[2],
      statusText: stripHtml(block.match(/<span class="(?:before|ing|end)">([^<]+)<\/span>/i)?.[1] ?? ""),
      category: stripHtml(block.match(/<span class="applications[^"]*">([^<]+)<\/span>/i)?.[1] ?? ""),
      title,
      applicationPeriod
    });
  }

  return discovered.slice(0, 8);
};

const discoverGntpSupportSources = async () => {
  const html = await fetchPage(gntpSupportListUrl, { method: "POST" });
  const discovered = [];
  const rows = html.match(/<tr[^>]*class="[^"]*\btable-contents\b[^"]*"[^>]*>[\s\S]*?<\/tr>/gi) ?? [];

  for (const row of rows) {
    const idMatch = row.match(/goPage\('S'\s*,\s*null\s*,\s*'\/biz\/applyInfo\/(\d+)'\)/i);
    const titleMatch = row.match(/<a[^>]*class="[^"]*\bcolor-fix\b[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
    if (!idMatch || !titleMatch) continue;

    const title = stripHtml(titleMatch[1]);
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => stripHtml(match[1]));
    const department = cells[1] ?? "";
    const team = cells[2] ?? "";
    const manager = cells[3] ?? "";
    const applicationStartDate = cells[5]?.match(/20\d{2}-\d{2}-\d{2}/)?.[0];
    const defaultDeadline = cells[6]?.match(/20\d{2}-\d{2}-\d{2}/)?.[0];
    const statusText = cells[7] ?? "";
    const combinedText = `${title} ${department} ${team} ${manager}`;
    const classification = classifyGntpSupportNotice(combinedText);
    if (!classification) continue;

    discovered.push({
      id: `space-gntp-discovered-${idMatch[1]}`,
      url: `https://www.gntp.or.kr/biz/applyInfo/${encodeURIComponent(idMatch[1])}`,
      source: "gntp_discovered_support_notice",
      sourceFamily: "GNTP",
      agency: "경남테크노파크",
      defaultTitle: title,
      region: "경남",
      targetRegions: ["경남"],
      announcementDate: applicationStartDate,
      applicationStartDate,
      defaultDeadline,
      statusText,
      inferDateFromText: false,
      fetchMethod: "POST",
      ...classification
    });
  }

  return discovered.slice(0, 8);
};

const discoverKaiaSources = async () => {
  const html = await fetchPage(kaiaListUrl);
  const rows = html.match(/<tr>[\s\S]*?<\/tr>/gi) ?? [];
  const discovered = [];

  for (const row of rows) {
    const link = row.match(/<a\s+[^>]*href="([^"]*\/portal\/bbs\/view\/B0000029\/(\d+)\.do[^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!link) continue;

    const cellTexts = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => stripHtml(match[1]));
    const businessName = cellTexts[1] ?? "";
    const title = stripHtml(link[3]);
    const combinedText = `${businessName} ${title}`;
    const classification = classifyKaiaNotice(combinedText);
    if (!classification) continue;

    const { announcementDate, defaultDeadline } = parseDateRange(stripHtml(row));

    discovered.push({
      id: `space-kaia-discovered-${link[2]}`,
      url: normalizeUrl(kaiaListUrl, link[1]),
      source: "kaia_discovered_notice",
      sourceFamily: "MOLIT_KAIA",
      agency: "국토교통과학기술진흥원",
      defaultTitle: title,
      defaultDeadline,
      announcementDate,
      supportAmountText: `${businessName || "국토교통 R&D"} 공고`,
      participationType: "국토교통 R&D 과제",
      consortiumRequired: true,
      inferDateFromText: false,
      ...classification
    });
  }

  return discovered.slice(0, 8);
};

const dedupeSources = (sources) => {
  const byKey = new Map();
  for (const source of sources) {
    const key = source.dedupeKey || source.url || source.id;
    const previous = byKey.get(key);
    if (!previous) {
      byKey.set(key, source);
      continue;
    }

    const previousDeadline = previous.defaultDeadline ?? "";
    const currentDeadline = source.defaultDeadline ?? "";
    if (currentDeadline > previousDeadline) byKey.set(key, source);
  }
  return [...byKey.values()];
};

const pickRelevantText = (text, source) => {
  const titleIndex = text.indexOf(source.defaultTitle);
  if (titleIndex >= 0) return text.slice(titleIndex, titleIndex + 1600);

  const normalizedTitle = source.defaultTitle.replace(/\.{3,}$/, "").trim();
  if (normalizedTitle) {
    const normalizedTitleIndex = text.indexOf(normalizedTitle);
    if (normalizedTitleIndex >= 0) return text.slice(normalizedTitleIndex, normalizedTitleIndex + 1600);
  }

  const anchors = [
    "패밀리기업 모집",
    "중소기업지원",
    "지원사업",
    "기술사업화",
    "재공모 일정",
    "재공모일정",
    "공모 일정",
    "공모일정",
    "공고기간",
    "첨부파일"
  ];
  const index = anchors
    .map((anchor) => text.indexOf(anchor))
    .filter((position) => position >= 0)
    .sort((a, b) => a - b)[0];

  if (index === undefined) return text.slice(0, 1200);
  return text.slice(index, index + 1600);
};

const findDate = (text) => {
  const match = text.match(/20\d{2}[.\-/년]\s?\d{1,2}[.\-/월]\s?\d{1,2}/);
  if (!match) return undefined;
  const [year, month, day] = match[0].match(/\d+/g) ?? [];
  if (!year || !month || !day) return undefined;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const findDeadline = (text) => {
  const isoRange = text.match(/20\d{2}-\d{2}-\d{2}\s*~\s*(20\d{2}-\d{2}-\d{2})/);
  if (isoRange) return isoRange[1];

  const toDate = (year, month, day) => {
    const monthNumber = Number.parseInt(month, 10);
    const dayNumber = Number.parseInt(day, 10);
    if (monthNumber < 1 || monthNumber > 12 || dayNumber < 1 || dayNumber > 31) return undefined;
    return `${year}-${String(monthNumber).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;
  };

  const rangePattern =
    /(20\d{2})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})일?[\s\S]{0,80}?[~∼～\-–—]\s*(?:(20\d{2})\s*[.\-/년]\s*)?(\d{1,2})\s*[.\-/월]\s*(\d{1,2})일?/i
  ;
  const shortYearRangePattern =
    /[’']?\s*(\d{2})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})일?[\s\S]{0,80}?[~∼～\-–—]\s*(?:(\d{1,2})\s*[.\-/월]\s*)?(\d{1,2})일?/i
  ;
  const shortYearFullRangePattern =
    /[’']?\s*(\d{2})\s*(?:[.\-/]|년\.?)\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})일?\.?[\s\S]{0,80}?[~∼～\-–—]\s*[’']?\s*(\d{2})\s*(?:[.\-/]|년\.?)\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})일?/i
  ;

  for (const anchor of deadlineAnchors) {
    let searchFrom = 0;
    while (searchFrom < text.length) {
      const index = text.indexOf(anchor, searchFrom);
      if (index < 0) break;
      const context = text.slice(index, index + 900);
      const genericRange = context.match(rangePattern);
      if (genericRange) {
        const year = genericRange[4] ?? genericRange[1];
        const date = toDate(year, genericRange[5], genericRange[6]);
        if (date) return date;
      }
      const shortYearRange = context.match(shortYearRangePattern);
      if (shortYearRange) {
        const year = `20${shortYearRange[1]}`;
        const month = shortYearRange[4] ?? shortYearRange[2];
        const date = toDate(year, month, shortYearRange[5]);
        if (date) return date;
      }
      const shortYearFullRange = context.match(shortYearFullRangePattern);
      if (shortYearFullRange) {
        const date = toDate(`20${shortYearFullRange[4]}`, shortYearFullRange[5], shortYearFullRange[6]);
        if (date) return date;
      }
      searchFrom = index + anchor.length;
    }
  }

  const untilMatch = text.match(/(?:마감|까지|기한)[^\d]*(20\d{2})[.\-/년]\s?(\d{1,2})[.\-/월]\s?(\d{1,2})/);
  if (untilMatch) {
    const date = toDate(untilMatch[1], untilMatch[2], untilMatch[3]);
    if (date) return date;
  }

  return undefined;
};

const extractDeadlineContext = (text) => {
  for (const anchor of deadlineAnchors) {
    let searchFrom = 0;
    while (searchFrom < text.length) {
      const index = text.indexOf(anchor, searchFrom);
      if (index < 0) break;
      const context = text.slice(index, index + 900);
      if (anchor === "마감일" && /20\d{2}-\d{2}-\d{2}/.test(context)) {
        return text.slice(index, index + 160);
      }
      if (/[~∼～–—]/.test(context) || /20\d{2}-\d{2}-\d{2}/.test(context)) return context;
      searchFrom = index + anchor.length;
    }
  }
  return text.slice(0, 300);
};

const extractPdfTextFromAttachments = async (urls) => {
  const candidates = urls
    .filter((url) => /FileDown\.do|\/webapp\/upload\//i.test(url))
    .slice(0, 2);

  for (const url of candidates) {
    let dir;
    try {
      const binary = await fetchBinaryWithCurlCffi(url);
      if (!binary || !binary.bytes.subarray(0, 4).equals(Buffer.from("%PDF"))) continue;

      dir = await mkdtemp(join(tmpdir(), "space-attachment-"));
      const pdfPath = join(dir, "attachment.pdf");
      await writeFile(pdfPath, binary.bytes);
      const { stdout } = await execFileAsync("pdftotext", [pdfPath, "-"], {
        maxBuffer: 8 * 1024 * 1024
      });
      const text = stdout.replace(/\s+/g, " ").trim();
      if (text.length > 0) return text;
    } catch {
      // Try the next attachment.
    } finally {
      if (dir) await rm(dir, { recursive: true, force: true });
    }
  }

  return undefined;
};

const extractHwpxText = async (path) => {
  const script = String.raw`
import html
import re
import sys
import zipfile
from xml.etree import ElementTree

path = sys.argv[1]
parts = []
with zipfile.ZipFile(path) as z:
    names = [name for name in z.namelist() if name.endswith(".xml")]
    names += [name for name in z.namelist() if name.endswith("PrvText.txt")]
    for name in names:
        raw = z.read(name)
        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError:
            text = raw.decode("utf-16", "ignore")
        if name.endswith(".xml"):
            text = re.sub(r"<[^>]+>", " ", text)
        parts.append(html.unescape(text))
print(re.sub(r"\s+", " ", " ".join(parts)).strip())
`;
  const { stdout } = await execFileAsync("python3", ["-c", script, path], {
    maxBuffer: 8 * 1024 * 1024
  });
  return stdout.replace(/\s+/g, " ").trim();
};

const extractLegacyHwpText = async (path) => {
  const script = String.raw`
import re
import sys
import zlib

import olefile

path = sys.argv[1]
ole = olefile.OleFileIO(path)
compressed = False
try:
    header = ole.openstream("FileHeader").read()
    flags = int.from_bytes(header[36:40], "little") if len(header) >= 40 else 0
    compressed = bool(flags & 1)
except Exception:
    compressed = False

parts = []
for name in ole.listdir(streams=True):
    joined = "/".join(name)
    if not joined.startswith("BodyText/Section"):
        continue
    raw = ole.openstream(name).read()
    if compressed:
        try:
            raw = zlib.decompress(raw, -15)
        except Exception:
            pass
    text = raw.decode("utf-16le", "ignore")
    # HWP records include binary/control data. Keep readable Korean, ASCII, numbers,
    # punctuation used in dates, and whitespace so deadline regexes can still work.
    text = re.sub(r"[^0-9A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ\\s.,:;()\\[\\]~∼～\\-–—/년월일시분까지]", " ", text)
    parts.append(text)

print(re.sub(r"\\s+", " ", " ".join(parts)).strip())
`;
  const { stdout } = await execFileAsync("python3", ["-c", script, path], {
    maxBuffer: 12 * 1024 * 1024
  });
  return stdout.replace(/\s+/g, " ").trim();
};

const extractAttachmentText = async (urls, announcementDate) => {
  const candidates = urls
    .filter((url) => /FileDown\.do|readDownloadFile\.do|\/attach\/|\/common\/download\.do|\/afile\/fileDownload\/|\/fileDownloadDev|\/dextnj\/streamDownload|\/webapp\/upload\//i.test(url))
    .filter((url) => !/\/attach\/preview\//.test(url))
    .slice(0, 8);
  let firstReadable;

  for (const url of candidates) {
    let dir;
    try {
      const binary = await fetchBinaryWithCurlCffi(url);
      if (!binary) continue;

      dir = await mkdtemp(join(tmpdir(), "space-attachment-"));

      if (binary.bytes.subarray(0, 4).equals(Buffer.from("%PDF"))) {
        const pdfPath = join(dir, "attachment.pdf");
        await writeFile(pdfPath, binary.bytes);
        const { stdout } = await execFileAsync("pdftotext", [pdfPath, "-"], {
          maxBuffer: 8 * 1024 * 1024
        });
        const text = stdout.replace(/\s+/g, " ").trim();
        if (text.length > 0) {
          const result = { text, url, format: "pdf" };
          if (findDeadline(text) ?? findNoYearDeadline(text, announcementDate)) return result;
          firstReadable ??= result;
        }
      }

      if (binary.bytes.subarray(0, 2).equals(Buffer.from("PK"))) {
        const hwpxPath = join(dir, "attachment.hwpx");
        await writeFile(hwpxPath, binary.bytes);
        const text = await extractHwpxText(hwpxPath);
        if (text.length > 0) {
          const result = { text, url, format: "hwpx" };
          if (findDeadline(text) ?? findNoYearDeadline(text, announcementDate)) return result;
          firstReadable ??= result;
        }
      }

      if (binary.bytes.subarray(0, 8).equals(Buffer.from("d0cf11e0a1b11ae1", "hex"))) {
        const hwpPath = join(dir, "attachment.hwp");
        await writeFile(hwpPath, binary.bytes);
        const text = await extractLegacyHwpText(hwpPath);
        if (text.length > 0) {
          const result = { text, url, format: "hwp" };
          if (findDeadline(text) ?? findNoYearDeadline(text, announcementDate)) return result;
          firstReadable ??= result;
        }
      }
    } catch {
      // Try the next attachment.
    } finally {
      if (dir) await rm(dir, { recursive: true, force: true });
    }
  }

  return firstReadable;
};

const koreaDateEndOfDayTime = (value) => {
  if (!value) return undefined;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59+09:00` : value;
  const time = new Date(normalized).getTime();
  return Number.isNaN(time) ? undefined : time;
};

const inferStatus = (deadline) => {
  if (!deadline) return "stale";
  const deadlineTime = koreaDateEndOfDayTime(deadline);
  if (deadlineTime === undefined) return "stale";
  return deadlineTime < Date.now() ? "closed" : "active";
};

const makeDeadlineEvidence = ({ source, date, text, url, format }) => ({
  source,
  date,
  url,
  text: cleanNoticeText(`${format ? `[${format}] ` : ""}${text ?? ""}`).slice(0, 500)
});

const chooseDeadlineCandidate = ({
  source,
  pageUrl,
  relevantText,
  pageText,
  attachmentResult,
  htmlDeadline,
  htmlNoYearDeadline,
  attachmentDeadline,
  attachmentDeadlineEvidenceText,
  fallbackDate
}) => {
  const candidates = [];

  if (source.defaultDeadline) {
    candidates.push(makeDeadlineEvidence({
      source: "source_metadata",
      date: source.defaultDeadline,
      text: `${source.defaultTitle ?? ""} ${source.applicationStartDate ?? ""} ~ ${source.defaultDeadline}`,
      url: pageUrl
    }));
  }

  const htmlCandidate = htmlDeadline
    ? makeDeadlineEvidence({
      source: "html",
      date: htmlDeadline,
      text: extractDeadlineContext(relevantText),
      url: pageUrl
    })
    : undefined;
  const attachmentCandidate = attachmentDeadline && attachmentResult
    ? makeDeadlineEvidence({
      source: "attachment",
      date: attachmentDeadline,
      text: attachmentDeadlineEvidenceText ?? extractDeadlineContext(attachmentResult.text),
      url: attachmentResult.url,
      format: attachmentResult.format
    })
    : undefined;

  if (source.preferHtmlDeadline) {
    if (htmlCandidate) candidates.push(htmlCandidate);
    if (attachmentCandidate) candidates.push(attachmentCandidate);
  } else {
    if (attachmentCandidate) candidates.push(attachmentCandidate);
    if (htmlCandidate) candidates.push(htmlCandidate);
  }

  if (htmlNoYearDeadline) {
    candidates.push(makeDeadlineEvidence({
      source: "html_no_year_deadline",
      date: htmlNoYearDeadline,
      text: extractDeadlineContext(pageText),
      url: pageUrl
    }));
  }

  if (source.inferDateFromText !== false && fallbackDate) {
    candidates.push(makeDeadlineEvidence({
      source: "page_date_fallback",
      date: fallbackDate,
      text: pageText,
      url: pageUrl
    }));
  }

  return candidates.find((candidate) => candidate.date);
};

const describeMissingDeadline = ({ source, text, attachmentResult, attachmentUrls, error }) => {
  const deadlineSignalText = `${text ?? ""} ${attachmentResult?.text ?? ""}`;

  if (error) {
    return {
      reasonCategory: "fetch_or_parse_error",
      deadlineExtractionStatus: "not_attempted_after_error",
      deadlineExtractionNote: `수집 또는 상세 파싱 오류로 deadline extraction을 완료하지 못했습니다: ${error}`
    };
  }

  if (source.defaultDeadline) {
    return {
      reasonCategory: "invalid_source_metadata_deadline",
      deadlineExtractionStatus: "source_metadata_unusable",
      deadlineExtractionNote: "Source metadata에 deadline 후보가 있었지만 유효한 applicationEndDate로 정규화되지 않았습니다."
    };
  }

  if (variableDeadlinePattern.test(deadlineSignalText)) {
    return {
      reasonCategory: "open_ended_or_variable_deadline",
      deadlineExtractionStatus: "open_ended_or_variable_deadline_without_readable_final_date",
      deadlineExtractionNote: "본문에 상시, 예산 소진, 차수별 상이, 별도 공지 등 변동형 접수 문구가 있으나 공개 페이지/첨부에서 확정 마감일을 읽지 못했습니다."
    };
  }

  if (attachmentResult?.text) {
    return {
      reasonCategory: "attachment_without_deadline",
      deadlineExtractionStatus: `checked_${attachmentResult.format}_attachment_without_deadline`,
      deadlineExtractionNote: `공개 첨부(${attachmentResult.format}) 텍스트를 확인했지만 신청/접수 마감일 패턴을 찾지 못했습니다.`
    };
  }

  if (attachmentUrls?.length) {
    return {
      reasonCategory: "attachment_unreadable_or_without_deadline",
      deadlineExtractionStatus: "attachment_fetch_or_text_extraction_failed",
      deadlineExtractionNote: "공개 첨부 URL은 있었지만 지원 형식 텍스트 추출에 실패했거나 마감일을 읽지 못했습니다."
    };
  }

  if (/(?:신청|접수|모집|공모|제출|지원)/.test(text)) {
    return {
      reasonCategory: "html_without_deadline",
      deadlineExtractionStatus: "checked_html_without_deadline",
      deadlineExtractionNote: "HTML 본문에 지원/접수 관련 문구는 있으나 날짜 범위 또는 마감일 패턴을 찾지 못했습니다."
    };
  }

  return {
    reasonCategory: "no_deadline_evidence",
    deadlineExtractionStatus: "no_application_deadline_signal",
    deadlineExtractionNote: "HTML 본문과 공개 metadata에서 신청/접수 마감일 근거를 찾지 못했습니다."
  };
};

const inferConsortiumRequired = (text, fallback) => {
  if (typeof fallback === "boolean") return fallback;
  if (/공동(?:계약|수급|참여)[^.\n]{0,30}(?:허용하지|불가|금지|제한)/.test(text)) return false;
  if (/(?:컨소시엄|공동수급|공동참여|공동계약)[^.\n]{0,30}(?:가능|허용)/.test(text)) return false;
  if (/(?:컨소시엄|공동수급|공동참여|공동계약)[^.\n]{0,50}(?:필수|의무|구성해야|구성하여야)/.test(text)) return true;
  if (/(?:필수|의무)[^.\n]{0,50}(?:컨소시엄|공동수급|공동참여|공동계약)/.test(text)) return true;
  return undefined;
};

const extractBizinfoOriginalAgencyUrl = (html) => {
  const match = html.match(/<a[^>]+href="([^"]+)"[^>]*id="barogagi"/i)
    ?? html.match(/<a[^>]+id="barogagi"[^>]*href="([^"]+)"/i);
  if (!match) return undefined;
  const url = decodeHtmlEntities(match[1]).replace(/#none$/, "");
  return /^https?:\/\//i.test(url) ? url : undefined;
};

const normalizeProgram = async (source) => {
  const html = await fetchPage(source.url, {
    preferCurlCffi: source.preferCurlCffi === true,
    preferJina: source.preferJina === true,
    method: source.fetchMethod ?? "GET"
  });
  const originalAgencyUrl = source.sourceFamily === "BIZINFO" || source.sourceFamily === "MOTIE_KEIT_KIAT"
    ? extractBizinfoOriginalAgencyUrl(html)
    : undefined;
  const text = cleanNoticeText(extractMainText(html));
  const pageTitle = extractDetailTitle(html) ?? source.defaultTitle;
  const relevantText = source.sourceTextOverride
    ? cleanNoticeText(source.sourceTextOverride)
    : pickRelevantText(text, { ...source, defaultTitle: pageTitle });
  const pageAnnouncementDate = source.announcementDate ?? findDate(text);
  const attachmentUrls = [...new Set([
    ...(source.seedAttachmentUrls ?? []),
    ...extractAttachmentUrls(html, source.url)
  ])];
  const attachmentResult = source.defaultDeadline ? undefined : await extractAttachmentText(attachmentUrls, pageAnnouncementDate);
  const attachmentText = attachmentResult?.text;
  const htmlDeadline = source.sourceFamily === "KASA" ? undefined : findDeadline(relevantText);
  const htmlNoYearDeadline = findNoYearDeadline(text, pageAnnouncementDate);
  const attachmentDirectDeadline = attachmentText ? findDeadline(attachmentText) : undefined;
  const attachmentNoYearDeadline = attachmentText && !attachmentDirectDeadline
    ? findNoYearDeadline(attachmentText, pageAnnouncementDate)
    : undefined;
  const attachmentDeadline = attachmentDirectDeadline ?? attachmentNoYearDeadline;
  const attachmentDeadlineEvidenceText = attachmentNoYearDeadline
    ? extractNoYearDeadlineContext(attachmentText, pageAnnouncementDate)
    : undefined;
  const fallbackDate = findDate(text);
  const deadlineCandidate = chooseDeadlineCandidate({
    source,
    pageUrl: source.url,
    relevantText,
    pageText: text,
    attachmentResult,
    htmlDeadline,
    htmlNoYearDeadline,
    attachmentDeadline,
    attachmentDeadlineEvidenceText,
    fallbackDate
  });
  const deadline = deadlineCandidate?.date;
  const missingDeadline = deadline
    ? undefined
    : describeMissingDeadline({ source, text, attachmentResult, attachmentUrls });
  const defenseOrDualUse = source.defenseOrDualUse ?? /국방|방산|방위사업|감시정찰|군|무기체계/.test(relevantText);
  const restrictedNotice = /비공개|접근제한|보안요건|보안심사|군사보안|대외비|비밀|수출통제|ITAR/i.test(relevantText);
  const consortiumRequired = inferConsortiumRequired(`${relevantText} ${attachmentText ?? ""}`, source.consortiumRequired);
  const applicantEvidence = `${pageTitle} ${relevantText} ${attachmentText ?? ""}`;
  const researcherOrInstitutionNotice = researchApplicantPattern.test(applicantEvidence);
  const targetCompanyType = source.targetCompanyType
    ?? (researcherOrInstitutionNotice
      ? "대학, 출연연, 연구기관, 연구팀, 기업 연구조직 등 연구개발기관"
      : undefined);
  const eligibilityText = source.eligibilityText
    ?? (researcherOrInstitutionNotice
      ? "대학 연구실, 출연연, 연구기관, 연구팀, 기업 연구조직 등 연구개발기관 참여 가능성이 있는 공고입니다. 세부 신청 자격은 원문 및 첨부파일 확인 필요."
      : text.includes("중소")
        ? "중소·중견기업 또는 항공우주 분야 기업 관련 조건이 포함된 공개 페이지입니다. 세부 조건은 원문 확인 필요."
        : "세부 신청 조건은 원문 확인 필요.");

  return {
    id: source.id,
    source: source.source,
    externalId: source.id,
    title: pageTitle,
    agency: source.agency,
    sourceUrl: source.url,
    sourceType: "public_webpage",
    sourceFamily: source.sourceFamily,
    spaceCategory: source.spaceCategory,
    relevanceScore: source.relevanceScore,
    dataReusePolicy: "metadata_and_short_summary",
    commercialUseAllowed: undefined,
    defenseOrDualUse,
    restrictedNotice,
    region: source.region ?? "전국",
    targetRegions: source.targetRegions ?? [source.region ?? "전국"],
    industries: source.industries ?? ["항공우주", "중소기업", "기술사업화"],
    technologyAreas: source.technologyAreas ?? ["항공우주", "인공위성", "발사체", "항공"],
    supportAmountText: source.supportAmountText,
    applicationStartDate: source.applicationStartDate,
    announcementDate: pageAnnouncementDate,
    applicationEndDate: deadline,
    deadlineSource: deadlineCandidate?.source,
    deadlineEvidenceText: deadlineCandidate?.text,
    deadlineEvidenceUrl: deadlineCandidate?.url,
    deadlineExtractionStatus: deadline ? "found" : missingDeadline?.deadlineExtractionStatus,
    deadlineExtractionNote: missingDeadline?.deadlineExtractionNote,
    missingDeadlineReasonCategory: missingDeadline?.reasonCategory,
    summary: relevantText.slice(0, 320),
    targetCompanyType,
    eligibilityText,
    requiredDocuments: [],
    restrictions: ["자동 수집 metadata입니다. 원문과 첨부파일 확인 필요."],
    securityRequirements: defenseOrDualUse ? ["국방/방산 관련 참여자격, 보안요건, 수출통제 확인 필요"] : [],
    participationType: source.participationType,
    consortiumRequired,
    universityOrResearchPartnerRequired:
      source.universityOrResearchPartnerRequired === false && source.sourceFamily === "KSTARTUP"
        ? false
        : source.universityOrResearchPartnerRequired === true || researcherOrInstitutionNotice,
    rawText: relevantText.slice(0, 1200),
    attachmentUrls: attachmentUrls.length > 0 ? attachmentUrls : [source.url],
    originalAgencyUrl,
    status: inferStatus(deadline),
    lastCheckedAt: now
  };
};

const discoveryRunAudit = [];
const runDiscovery = async (label, discover) => {
  const startedAt = Date.now();
  try {
    const sources = await discover();
    discoveryRunAudit.push({
      label,
      status: "ok",
      discoveredCount: sources.length,
      durationMs: Date.now() - startedAt
    });
    return sources;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`Discovery warning (${label}): ${errorMessage}`);
    discoveryRunAudit.push({
      label,
      status: "error",
      discoveredCount: 0,
      durationMs: Date.now() - startedAt,
      error: errorMessage
    });
    return [];
  }
};

await verifyIngestionDependencies();

const discoverySources = [
  ["KARI", discoverKariSources],
  ["KASI", discoverKasiSources],
  ["KASA", discoverKasaSources],
  ["DAPA", discoverDapaSources],
  ["ADD", discoverAddProposalSources],
  ["KRIT", discoverKritSources],
  ["KSTARTUP", discoverKStartupSources],
  ["KEIT", discoverKeitSupportSources],
  ["KIAT", discoverKiatBusinessSources],
  ["TIPA_SMTECH", discoverTipaSmtechSources],
  ["DJTP", discoverDjtpSupportSources],
  ["JNTP", discoverJntpSupportSources],
  ["ITP", discoverItpSupportSources],
  ["GNTP", discoverGntpSupportSources],
  ["KAIA", discoverKaiaSources],
  ["BIZINFO", discoverBizinfoSources]
];
const discoveredSources = [];
for (const [label, discover] of discoverySources) {
  discoveredSources.push(...(await runDiscovery(label, discover)));
}

const sources = dedupeSources(discoveredSources);
const results = [];
for (const source of sources) {
  try {
    results.push(await normalizeProgram(source));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const missingDeadline = describeMissingDeadline({
      source,
      text: "",
      attachmentResult: undefined,
      attachmentUrls: source.seedAttachmentUrls ?? [],
      error: errorMessage
    });
    results.push({
      id: source.id,
      source: source.source,
      sourceFamily: source.sourceFamily,
      externalId: source.id,
      title: source.defaultTitle,
      agency: source.agency,
      sourceUrl: source.url,
      sourceType: "public_webpage",
      spaceCategory: source.spaceCategory,
      relevanceScore: Math.max(30, source.relevanceScore - 20),
      dataReusePolicy: "metadata_only_until_terms_reviewed",
      commercialUseAllowed: undefined,
      defenseOrDualUse: source.defenseOrDualUse ?? false,
      restrictedNotice: true,
      region: "전국",
      targetRegions: ["전국"],
      industries: source.industries ?? [],
      technologyAreas: source.technologyAreas ?? [],
      supportAmountText: source.supportAmountText,
      announcementDate: source.announcementDate,
      applicationEndDate: undefined,
      summary: "자동 수집 중 오류가 발생해 metadata record만 생성했습니다. 원문 URL을 직접 확인해야 합니다.",
      targetCompanyType: source.targetCompanyType,
      eligibilityText: source.eligibilityText ?? "수집 오류로 세부 신청 조건은 원문 확인 필요.",
      requiredDocuments: [],
      restrictions: ["수집 오류 발생", "원문 확인 필요", "metadata-only record"],
      securityRequirements: source.defenseOrDualUse ? ["보안요건 및 참여자격 원문 확인 필요"] : [],
      participationType: source.participationType,
      consortiumRequired: source.consortiumRequired,
      universityOrResearchPartnerRequired: source.universityOrResearchPartnerRequired ?? false,
      rawText: "",
      attachmentUrls: source.seedAttachmentUrls?.length ? source.seedAttachmentUrls : [source.url],
      status: "stale",
      deadlineExtractionStatus: missingDeadline.deadlineExtractionStatus,
      deadlineExtractionNote: missingDeadline.deadlineExtractionNote,
      missingDeadlineReasonCategory: missingDeadline.reasonCategory,
      error: errorMessage,
      lastCheckedAt: now
    });
  }
}

const programNoticeResults = results.filter((program) => program.applicationEndDate);
const excludedResults = results
  .filter((program) => !program.applicationEndDate)
  .map((program) => ({
    id: program.id,
    sourceFamily: program.sourceFamily,
    title: program.title,
    sourceUrl: program.sourceUrl,
    status: program.status,
    reason: "no_readable_application_deadline",
    reasonCategory: program.missingDeadlineReasonCategory ?? "no_deadline_evidence",
    deadlineExtractionStatus: program.deadlineExtractionStatus ?? "unknown",
    deadlineExtractionNote: program.deadlineExtractionNote ?? "마감일 파싱 실패 원인이 기록되지 않았습니다.",
    lastCheckedAt: program.lastCheckedAt
  }));
const countByFamily = (items) => {
  const counts = new Map();
  for (const item of items) {
    const key = item.sourceFamily ?? "UNKNOWN";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort(([left], [right]) => left.localeCompare(right)));
};
const sourceFamilyAudit = [...new Set([
  ...discoveredSources.map((source) => source.sourceFamily ?? "UNKNOWN"),
  ...sources.map((source) => source.sourceFamily ?? "UNKNOWN"),
  ...results.map((program) => program.sourceFamily ?? "UNKNOWN")
])].sort().map((sourceFamily) => {
  const discovered = discoveredSources.filter((source) => (source.sourceFamily ?? "UNKNOWN") === sourceFamily);
  const normalized = results.filter((program) => (program.sourceFamily ?? "UNKNOWN") === sourceFamily);
  const generated = programNoticeResults.filter((program) => (program.sourceFamily ?? "UNKNOWN") === sourceFamily);
  const excluded = excludedResults.filter((program) => (program.sourceFamily ?? "UNKNOWN") === sourceFamily);
  const errors = normalized.filter((program) => program.error);

  return {
    sourceFamily,
    discoveredCount: discovered.length,
    normalizedCount: normalized.length,
    generatedCount: generated.length,
    excludedCount: excluded.length,
    errorCount: errors.length,
    activeCount: generated.filter((program) => inferStatus(program.applicationEndDate) === "active").length,
    closedCount: generated.filter((program) => inferStatus(program.applicationEndDate) === "closed").length
  };
});
const ingestReport = {
  generatedCount: programNoticeResults.length,
  discoveredSourceCount: discoveredSources.length,
  excludedCount: excludedResults.length,
  sourceFamilies: [...new Set(programNoticeResults.map((program) => program.sourceFamily))].sort(),
  discoveredSourceFamilies: countByFamily(discoveredSources),
  generatedSourceFamilies: countByFamily(programNoticeResults),
  excludedSourceFamilies: countByFamily(excludedResults),
  discoveryRunAudit,
  sourceFamilyAudit,
  activeCount: programNoticeResults.filter((program) => inferStatus(program.applicationEndDate) === "active").length,
  closedCount: programNoticeResults.filter((program) => inferStatus(program.applicationEndDate) === "closed").length,
  lastCheckedAt: now
};

await mkdir("data", { recursive: true });
await writeFile("data/space-programs.generated.json", `${JSON.stringify(programNoticeResults, null, 2)}\n`);
await writeFile("data/space-programs.excluded.json", `${JSON.stringify(excludedResults, null, 2)}\n`);
await writeFile("data/space-ingest-report.json", `${JSON.stringify(ingestReport, null, 2)}\n`);
console.log(
  `Wrote ${programNoticeResults.length} records to data/space-programs.generated.json (${discoveredSources.length} discovered, ${excludedResults.length} excluded without deadline)`
);
