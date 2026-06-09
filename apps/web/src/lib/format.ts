export const formatDate = (iso?: string): string => {
  if (!iso) return "—";
  return iso.replace(/^(\d{4})-(\d{2})-(\d{2}).*/, "$1.$2.$3");
};

export const daysUntil = (iso?: string): number | null => {
  if (!iso) return null;
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((startOfTarget.getTime() - startOfToday.getTime()) / 86_400_000);
};

export const dDayLabel = (iso?: string): string => {
  const d = daysUntil(iso);
  if (d === null) return "";
  if (d === 0) return "D-Day";
  if (d > 0) return `D-${d}`;
  return `마감 ${-d}일 경과`;
};

export const CATEGORY_LABELS: Record<string, string> = {
  satellite: "위성",
  launch_vehicle: "발사체",
  space_commercialization: "우주산업화",
  space_data: "우주데이터",
  space_parts_materials: "부품·소재",
  astronomy_space_science: "천문·우주과학",
  defense_space: "국방우주",
  defense_aerospace: "방산·항공",
  defense_aerospace_adjacent: "방산·항공 인접",
  drone_uam_adjacent: "드론·UAM",
  aviation_industry: "항공산업",
  rd_general: "일반 R&D"
};

export const categoryLabel = (key?: string): string => {
  if (!key) return "—";
  return CATEGORY_LABELS[key] ?? key;
};

export const SOURCE_FAMILY_LABELS: Record<string, string> = {
  KARI: "한국항공우주연구원 (KARI)",
  KASA: "우주항공청 (KASA)",
  KASI: "한국천문연구원 (KASI)",
  DAPA: "방위사업청 (DAPA)",
  ADD: "국방과학연구소 (ADD)",
  KRIT: "국방기술진흥연구소 (KRIT)",
  KSTARTUP: "K-Startup",
  KEIT: "산업기술기획평가원 (KEIT)",
  KIAT: "산업기술진흥원 (KIAT)",
  TIPA_SMTECH: "중소기업기술정보진흥원 (TIPA/SMTECH)",
  GNTP: "경남테크노파크",
  DJTP: "대전테크노파크",
  JNTP: "전남테크노파크",
  ITP: "인천테크노파크",
  KAIA: "국토교통과학기술진흥원 (KAIA)",
  MOLIT_KAIA: "국토교통부/KAIA",
  BIZINFO: "기업마당 (Bizinfo)",
  MOTIE_KEIT_KIAT: "산업부/KEIT/KIAT"
};

export const sourceFamilyLabel = (key?: string): string => {
  if (!key) return "—";
  return SOURCE_FAMILY_LABELS[key] ?? key;
};

export const APPLICANT_LABELS: Record<string, string> = {
  company: "기업",
  startup_or_prefounder: "스타트업/예비창업자",
  researcher_or_lab: "연구자/연구실"
};

export const STATUS_LABELS: Record<string, string> = {
  active: "모집중",
  closed: "마감",
  upcoming: "예정",
  stale: "확인 필요"
};
