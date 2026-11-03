import type { SpaceCompanyProfile, SpaceProgramSearchInput } from "@bidscout/shared";

const maxBodyBytes = 32 * 1024;
const maxStringLength = 300;
const maxArrayItems = 20;
const maxArrayItemLength = 100;

export class RequestValidationError extends Error {}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const pick = (record: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys) {
    if (record[key] !== undefined) return record[key];
  }
  return undefined;
};

const optionalString = (value: unknown, field: string, maxLength = maxStringLength) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || value.length > maxLength) {
    throw new RequestValidationError(`${field} must be a string of at most ${maxLength} characters`);
  }
  return value;
};

const optionalBoolean = (value: unknown, field: string) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "boolean") throw new RequestValidationError(`${field} must be a boolean`);
  return value;
};

const optionalNumber = (value: unknown, field: string, { integer = false, min = 0, max = Number.MAX_SAFE_INTEGER } = {}) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    throw new RequestValidationError(`${field} must be a valid number`);
  }
  return value;
};

const optionalStringArray = (value: unknown, field: string) => {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || value.length > maxArrayItems) {
    throw new RequestValidationError(`${field} must contain at most ${maxArrayItems} strings`);
  }
  if (value.some((item) => typeof item !== "string" || item.length > maxArrayItemLength)) {
    throw new RequestValidationError(`${field} contains an invalid string`);
  }
  return value;
};

const optionalEnum = <T extends string>(value: unknown, field: string, allowed: readonly T[]) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new RequestValidationError(`${field} has an unsupported value`);
  }
  return value as T;
};

export const parseJsonRecord = async (request: Request): Promise<Record<string, unknown>> => {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > maxBodyBytes) {
    throw new RequestValidationError("request body is too large");
  }

  const reader = request.body?.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let receivedBytes = 0;
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        receivedBytes += value.byteLength;
        if (receivedBytes > maxBodyBytes) {
          await reader.cancel("request body is too large");
          throw new RequestValidationError("request body is too large");
        }
        text += decoder.decode(value, { stream: true });
      }
      text += decoder.decode();
    } finally {
      reader.releaseLock();
    }
  }

  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    throw new RequestValidationError("request body must be valid JSON");
  }
  if (!isRecord(parsed)) throw new RequestValidationError("request body must be a JSON object");
  return parsed;
};

const categories = [
  "core_space", "satellite", "launch_vehicle", "space_data", "astronomy_space_science",
  "space_observation_infrastructure", "defense_space", "defense_aerospace", "space_parts_materials",
  "space_commercialization", "aerospace", "aviation_industry", "aviation_safety", "drone_uam_adjacent",
  "defense_aerospace_adjacent", "adjacent_space", "unknown"
] as const;

export const parseSearchBody = (body: Record<string, unknown>): SpaceProgramSearchInput => ({
  query: optionalString(body.query, "query"),
  spaceCategory: optionalEnum(pick(body, "spaceCategory", "space_category"), "spaceCategory", categories),
  sourceFamily: optionalString(pick(body, "sourceFamily", "source_family"), "sourceFamily", 100),
  status: optionalEnum(body.status, "status", ["active", "closed", "cancelled", "stale"] as const),
  region: optionalString(body.region, "region", 100),
  technologyAreas: optionalStringArray(pick(body, "technologyAreas", "technology_areas"), "technologyAreas"),
  companyStage: optionalString(pick(body, "companyStage", "company_stage"), "companyStage", 100),
  applicantType: optionalEnum(
    pick(body, "applicantType", "applicant_type"),
    "applicantType",
    ["researcher_or_lab", "company", "startup_or_prefounder"] as const
  ),
  deadlineWithinDays: optionalNumber(
    pick(body, "deadlineWithinDays", "deadline_within_days"),
    "deadlineWithinDays",
    { integer: true, min: 1, max: 3650 }
  ),
  includeAdjacent: optionalBoolean(pick(body, "includeAdjacent", "include_adjacent"), "includeAdjacent"),
  includeDefense: optionalBoolean(pick(body, "includeDefense", "include_defense"), "includeDefense"),
  defenseOnly: optionalBoolean(pick(body, "defenseOnly", "defense_only"), "defenseOnly"),
  adjacentOnly: optionalBoolean(pick(body, "adjacentOnly", "adjacent_only"), "adjacentOnly"),
  includeClosed: optionalBoolean(pick(body, "includeClosed", "include_closed"), "includeClosed"),
  sortBy: optionalEnum(pick(body, "sortBy", "sort_by"), "sortBy", ["relevance", "deadline", "recent"] as const),
  limit: optionalNumber(body.limit, "limit", { integer: true, min: 1, max: 50 })
});

export const parseCompanyProfile = (value: unknown): SpaceCompanyProfile => {
  if (!isRecord(value)) throw new RequestValidationError("companyProfile must be a JSON object");
  return {
    name: optionalString(value.name, "companyProfile.name"),
    businessType: optionalString(value.businessType, "companyProfile.businessType"),
    region: optionalString(value.region, "companyProfile.region", 100),
    foundedAt: optionalString(value.foundedAt, "companyProfile.foundedAt", 40),
    industry: optionalString(value.industry, "companyProfile.industry"),
    technologyAreas: optionalStringArray(value.technologyAreas, "companyProfile.technologyAreas") ?? [],
    keywords: optionalStringArray(value.keywords, "companyProfile.keywords") ?? [],
    employeeCount: optionalNumber(value.employeeCount, "companyProfile.employeeCount", { integer: true, min: 0, max: 10_000_000 }),
    revenue: optionalNumber(value.revenue, "companyProfile.revenue", { min: 0 }),
    previousGrants: optionalStringArray(value.previousGrants, "companyProfile.previousGrants") ?? [],
    certifications: optionalStringArray(value.certifications, "companyProfile.certifications") ?? [],
    hasResearchPartner: optionalBoolean(value.hasResearchPartner, "companyProfile.hasResearchPartner"),
    canJoinConsortium: optionalBoolean(value.canJoinConsortium, "companyProfile.canJoinConsortium"),
    description: optionalString(value.description, "companyProfile.description", 1000)
  };
};

export const getCompanyProfileValue = (body: Record<string, unknown>) =>
  pick(body, "companyProfile", "company_profile");
