"use client";

export type TabKey = "filter" | "keyword" | "match";

const TABS: { key: TabKey; label: string; future?: boolean }[] = [
  { key: "filter", label: "필터 검색" },
  { key: "keyword", label: "키워드 검색" },
  { key: "match", label: "내 연구실로 매칭", future: true }
];

export function TabBar({ active, onChange }: { active: TabKey; onChange: (key: TabKey) => void }) {
  return (
    <div role="tablist" className="tabs" aria-label="검색 모드">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          role="tab"
          aria-selected={active === tab.key}
          disabled={tab.future}
          className="tab"
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
          {tab.future ? <span className="tab-future">추후</span> : null}
        </button>
      ))}
    </div>
  );
}
