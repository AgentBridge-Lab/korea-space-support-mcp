import type { CompanyProfile, MatchResultItem, SearchInput, SearchResultItem, SpaceProgramDetail } from "./types";

const SERVER_API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4000";

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

export const getProgramServer = async (id: string): Promise<SpaceProgramDetail | null> => {
  const res = await fetch(`${SERVER_API_BASE_URL}/space-programs/${encodeURIComponent(id)}`, {
    cache: "no-store"
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Detail fetch failed: ${res.status}`);
  const data = (await res.json()) as { program: SpaceProgramDetail };
  return data.program ?? null;
};

export const getIngestReportServer = async (): Promise<{ lastCheckedAt?: string; generatedCount?: number } | null> => {
  try {
    const res = await fetch(`${SERVER_API_BASE_URL}/space-programs/ingest-report`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { report?: { lastCheckedAt?: string; generatedCount?: number } };
    return data.report ?? null;
  } catch {
    return null;
  }
};
