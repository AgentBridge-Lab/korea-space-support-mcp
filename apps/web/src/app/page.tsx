"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { searchPrograms } from "../lib/api";
import type { SearchInput, SearchResultItem } from "../lib/types";
import { FilterPanel } from "../components/FilterPanel";
import { KeywordSearchBar } from "../components/KeywordSearchBar";
import { ResultCard } from "../components/ResultCard";
import { TabBar, type TabKey } from "../components/TabBar";

const DEFAULT_INPUT: SearchInput = {
  applicantType: "researcher_or_lab",
  includeAdjacent: true,
  includeDefense: true,
  includeClosed: false,
  sortBy: "deadline",
  limit: 30
};

const KEYWORD_TAB_INPUT: SearchInput = {
  ...DEFAULT_INPUT,
  applicantType: undefined,
  sortBy: "relevance"
};

const DEBOUNCE_MS = 350;

export default function HomePage() {
  const [tab, setTab] = useState<TabKey>("filter");
  const [input, setInput] = useState<SearchInput>(DEFAULT_INPUT);
  const [queryDraft, setQueryDraft] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (queryDraft === query) return;
    const timer = setTimeout(() => setQuery(queryDraft), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [queryDraft, query]);

  const effectiveInput = useMemo<SearchInput>(
    () => (tab === "keyword" ? { ...input, query: query.trim() || undefined } : input),
    [tab, input, query]
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    searchPrograms(effectiveInput, controller.signal)
      .then((items) => setResults(items))
      .catch((err) => {
        if ((err as Error).name === "AbortError") return;
        setError("API에 연결할 수 없습니다. apps/api 서버(:4000)가 실행 중인지 확인해주세요.");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [effectiveInput]);

  const handleSort = useCallback((next: SearchInput["sortBy"]) => {
    setInput((prev) => ({ ...prev, sortBy: next }));
  }, []);

  const handleTab = useCallback((next: TabKey) => {
    setTab(next);
    if (next === "keyword") {
      setInput((prev) => ({ ...prev, sortBy: "relevance", applicantType: undefined }));
    } else if (next === "filter") {
      setInput((prev) => ({ ...prev, sortBy: prev.sortBy === "relevance" ? "deadline" : prev.sortBy }));
    }
  }, []);

  const handleResetFilters = useCallback(() => {
    setInput(tab === "keyword" ? KEYWORD_TAB_INPUT : DEFAULT_INPUT);
    if (tab === "keyword") {
      setQueryDraft("");
      setQuery("");
    }
  }, [tab]);

  const summaryText = useMemo(() => {
    if (loading) return <>검색 중…</>;
    if (error) return null;
    return (
      <>
        총 <strong>{results.length}</strong>건
      </>
    );
  }, [loading, error, results.length]);

  return (
    <main className="page">
      <div className="page-header">
        <h1>한국 우주·항공 R&D 지원사업 검색</h1>
        <p>마감일이 확인된 공개 공고만 보여줍니다. 가이드·포털·결과 공고는 자동 제외됩니다.</p>
      </div>

      <TabBar active={tab} onChange={handleTab} />

      {tab === "keyword" ? (
        <KeywordSearchBar value={queryDraft} onChange={setQueryDraft} count={results.length} />
      ) : null}

      <div className="search-grid">
        <FilterPanel value={input} onChange={setInput} onReset={handleResetFilters} />

        <section>
          <div className="results-bar">
            <span className="results-count">{summaryText}</span>
            <label>
              정렬:{" "}
              <select
                className="filter-select"
                style={{ width: "auto", display: "inline-block", marginLeft: 4 }}
                value={input.sortBy ?? "deadline"}
                onChange={(e) => handleSort(e.target.value as SearchInput["sortBy"])}
              >
                <option value="deadline">마감일순</option>
                <option value="relevance">관련도순</option>
                <option value="announcement_date">공고일순</option>
              </select>
            </label>
          </div>

          {error ? (
            <div className="error">{error}</div>
          ) : loading ? (
            <div className="skeleton-list">
              <div className="skeleton" />
              <div className="skeleton" />
              <div className="skeleton" />
            </div>
          ) : results.length === 0 ? (
            <div className="empty">조건에 맞는 활성 공고가 없습니다. 필터를 완화해 보세요.</div>
          ) : (
            <div className="results-list">
              {results.map((item) => (
                <ResultCard key={item.program_id} item={item} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
