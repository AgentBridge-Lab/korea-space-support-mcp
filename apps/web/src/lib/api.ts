import type { CompanyProfile, MatchResultItem, SearchInput, SearchResultItem } from "./types";

const stripUndefined = <T extends Record<string, unknown>>(obj: T): Partial<T> => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) continue;
    out[k] = v;
  }
  return out as Partial<T>;
};

export const searchPrograms = async (input: SearchInput, signal?: AbortSignal): Promise<SearchResultItem[]> => {
  const res = await fetch("/api/space-programs/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(stripUndefined(input as Record<string, unknown>)),
    signal
  });
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  const data = (await res.json()) as { results: SearchResultItem[] };
  return data.results ?? [];
};

export const matchPrograms = async (
  profile: CompanyProfile,
  filters: SearchInput,
  signal?: AbortSignal
): Promise<MatchResultItem[]> => {
  const body = {
    companyProfile: {
      ...profile,
      technologyAreas: profile.technologyAreas ?? [],
      keywords: profile.keywords ?? []
    },
    ...stripUndefined(filters as Record<string, unknown>)
  };
  const res = await fetch("/api/space-programs/match", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal
  });
  if (!res.ok) throw new Error(`Match failed: ${res.status}`);
  const data = (await res.json()) as { matches: MatchResultItem[] };
  return data.matches ?? [];
};
