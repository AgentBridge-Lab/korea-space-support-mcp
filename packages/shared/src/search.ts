import { sampleTenders } from "./sample-data.js";
import type { Tender, TenderSearchInput } from "./types.js";

const textIncludes = (value: string | undefined, needle: string): boolean =>
  (value ?? "").toLowerCase().includes(needle.toLowerCase());

const compact = (value: string): string => value.toLowerCase().replace(/[^a-z0-9가-힣]/g, "");

const tokenize = (value: string): string[] =>
  value
    .toLowerCase()
    .split(/[^a-z0-9가-힣]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);

const deadlineWithin = (deadlineAt: string | undefined, days: number): boolean => {
  if (!deadlineAt) return false;
  const deadline = new Date(deadlineAt).getTime();
  const now = Date.now();
  const max = now + days * 24 * 60 * 60 * 1000;
  return deadline >= now && deadline <= max;
};

export function searchTenders(input: TenderSearchInput): Tender[] {
  const limit = Math.max(1, Math.min(input.limit ?? 10, 50));

  return sampleTenders
    .filter((tender) => {
      if (input.query) {
        const q = input.query.toLowerCase();
        const haystack = `${tender.title} ${tender.buyerName ?? ""} ${tender.description ?? ""} ${tender.normalizedText}`.toLowerCase();
        const compactMatch = compact(haystack).includes(compact(q));
        const queryTokens = tokenize(q);
        const matchedTokenCount = queryTokens.filter((part) => haystack.includes(part)).length;
        const tokenMatch =
          queryTokens.length === 0 ||
          matchedTokenCount >= Math.max(1, Math.ceil(queryTokens.length / 2));

        if (!haystack.includes(q) && !compactMatch && !tokenMatch) {
          return false;
        }
      }

      if (input.region && !textIncludes(tender.region, input.region)) return false;

      if (input.cpvCodes?.length) {
        const hasCpv = input.cpvCodes.some((code) => tender.cpvCodes.includes(code));
        if (!hasCpv) return false;
      }

      if (input.deadlineWithinDays && !deadlineWithin(tender.deadlineAt, input.deadlineWithinDays)) {
        return false;
      }

      if (typeof input.minValue === "number" && typeof tender.valueMax === "number" && tender.valueMax < input.minValue) {
        return false;
      }

      if (typeof input.maxValue === "number" && typeof tender.valueMin === "number" && tender.valueMin > input.maxValue) {
        return false;
      }

      return true;
    })
    .slice(0, limit);
}

export function getTenderById(id: string): Tender | undefined {
  return sampleTenders.find((tender) => tender.id === id);
}
