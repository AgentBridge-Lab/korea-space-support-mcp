import type { SpaceCategory, SpaceClassification } from "./types.js";

type KeywordRule = {
  category: SpaceCategory;
  keywords: string[];
  score: number;
  reason: string;
};

const keywordRules: KeywordRule[] = [
  {
    category: "defense_space",
    keywords: ["국방우주", "방산우주", "감시정찰위성", "방위사업", "방위사업청", "국방기술", "국방과제"],
    score: 92,
    reason: "국방우주 또는 감시정찰 위성 관련 키워드가 있습니다."
  },
  {
    category: "satellite",
    keywords: ["위성", "위성체", "위성영상", "위성정보", "위성통신", "탑재체", "지상국", "국가위성"],
    score: 90,
    reason: "위성 또는 위성 활용 관련 키워드가 있습니다."
  },
  {
    category: "launch_vehicle",
    keywords: ["발사체", "우주발사체", "누리호", "나로호", "차세대발사체", "엔진시험"],
    score: 92,
    reason: "발사체 관련 키워드가 있습니다."
  },
  {
    category: "space_data",
    keywords: ["우주데이터", "위성데이터", "위성자료", "위성영상 ai", "재난 관측", "환경 관측"],
    score: 86,
    reason: "우주/위성 데이터 활용 관련 키워드가 있습니다."
  },
  {
    category: "astronomy_space_science",
    keywords: ["천문", "천문연", "우주과학", "우주감시", "우주상황인식", "관측자료", "우주관측"],
    score: 84,
    reason: "천문/우주과학 또는 우주감시 관련 키워드가 있습니다."
  },
  {
    category: "space_commercialization",
    keywords: ["우주기술 사업화", "우주산업", "우주기업", "우주항공청", "kasa", "항우연", "kari"],
    score: 88,
    reason: "우주기술 사업화 또는 우주산업 지원 키워드가 있습니다."
  },
  {
    category: "space_parts_materials",
    keywords: ["우주부품", "항공우주 소부장", "우주소재", "항공소재", "첨단제조", "항공우주 부품"],
    score: 78,
    reason: "항공우주 부품/소재/제조 관련 키워드가 있습니다."
  },
  {
    category: "drone_uam_adjacent",
    keywords: ["uam", "드론", "무인이동체", "항공안전", "실증 인프라"],
    score: 62,
    reason: "드론/UAM/항공안전 인접 분야 키워드가 있습니다."
  },
  {
    category: "aviation_industry",
    keywords: ["항공산업", "항공기체", "항공전자", "항공엔진", "미래 비행체", "aam"],
    score: 58,
    reason: "항공산업 인접 분야 키워드가 있습니다."
  }
];

const restrictedKeywords = ["비공개", "접근제한", "보안요건", "보안심사", "군사보안", "대외비", "비밀", "수출통제", "itar"];
const defenseKeywords = ["국방", "방산", "방위사업", "감시정찰", "군", "무기체계", "국방기술"];

const normalize = (value: string): string => value.toLowerCase().replace(/\s+/g, " ").trim();

const compact = (value: string): string => normalize(value).replace(/[^a-z0-9가-힣]/g, "");

const keywordMatches = (text: string, keywords: string[]): string[] => {
  const normalizedText = normalize(text);
  const compactText = compact(text);

  return keywords.filter((keyword) => {
    const normalizedKeyword = normalize(keyword);
    return normalizedText.includes(normalizedKeyword) || compactText.includes(compact(normalizedKeyword));
  });
};

export function classifySpaceRelevance(text: string, sourceFamily?: string): SpaceClassification {
  const matches = keywordRules
    .map((rule) => ({
      rule,
      matchedKeywords: keywordMatches(text, rule.keywords)
    }))
    .filter((match) => match.matchedKeywords.length > 0)
    .sort((a, b) => b.rule.score - a.rule.score || b.matchedKeywords.length - a.matchedKeywords.length);

  const best = matches[0];
  const matchedKeywords = [...new Set(matches.flatMap((match) => match.matchedKeywords))];
  const sourceBoost =
    sourceFamily && ["KASA", "KARI", "KASI", "DAPA", "KRIT"].includes(sourceFamily) ? 4 : 0;
  const defenseOrDualUse =
    keywordMatches(text, defenseKeywords).length > 0 || sourceFamily === "DAPA" || sourceFamily === "KRIT";
  const restrictedNotice = keywordMatches(text, restrictedKeywords).length > 0;

  if (!best) {
    return {
      spaceCategory: "unknown",
      relevanceScore: Math.min(40, sourceBoost + 20),
      defenseOrDualUse,
      restrictedNotice,
      matchedKeywords: [],
      reasons: sourceFamily ? [`${sourceFamily} source family is known, but no strong space keyword matched.`] : [],
      warnings: ["우주분야 관련성이 낮거나 수동 분류가 필요합니다."]
    };
  }

  const relevanceScore = Math.max(0, Math.min(100, best.rule.score + sourceBoost + Math.min(6, matchedKeywords.length)));
  const warnings = [
    best.rule.category.includes("adjacent") || best.rule.category === "aviation_industry"
      ? "핵심 우주 공고가 아니라 항공/UAM/드론 인접 분야일 수 있습니다."
      : undefined,
    defenseOrDualUse ? "국방/방산 또는 dual-use 가능성이 있어 보안요건과 참여자격 확인이 필요합니다." : undefined,
    restrictedNotice ? "제한/보안/수출통제 관련 표현이 있어 metadata 중심 검토가 필요합니다." : undefined
  ].filter((warning): warning is string => Boolean(warning));

  return {
    spaceCategory: best.rule.category,
    relevanceScore,
    defenseOrDualUse,
    restrictedNotice,
    matchedKeywords,
    reasons: [...new Set(matches.map((match) => match.rule.reason))],
    warnings
  };
}
