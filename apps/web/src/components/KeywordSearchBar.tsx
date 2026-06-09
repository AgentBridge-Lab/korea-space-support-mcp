"use client";

const SUGGESTIONS = [
  "위성 영상",
  "발사체",
  "우주 부품",
  "드론 / UAM",
  "위성 데이터 AI",
  "방산 R&D",
  "천문 관측"
];

export function KeywordSearchBar({
  value,
  onChange,
  count
}: {
  value: string;
  onChange: (next: string) => void;
  count: number;
}) {
  return (
    <div className="keyword-bar">
      <label htmlFor="keyword-input" className="keyword-label">
        키워드로 검색 <span className="keyword-hint">관련도순으로 정렬됩니다</span>
      </label>
      <div className="keyword-input-wrap">
        <input
          id="keyword-input"
          type="search"
          className="keyword-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="예: 위성 AI · 발사체 부품 · 우주 데이터"
          autoComplete="off"
        />
        {value ? (
          <button type="button" className="keyword-clear" onClick={() => onChange("")} aria-label="검색어 지우기">
            ×
          </button>
        ) : null}
      </div>
      <div className="keyword-meta">
        <div className="keyword-suggestions">
          <span className="keyword-hint">추천:</span>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className={`badge${value === s ? " badge-active" : ""}`}
              onClick={() => onChange(s)}
              style={{ cursor: "pointer" }}
            >
              {s}
            </button>
          ))}
        </div>
        {value ? (
          <span className="keyword-hint">"{value}" 검색 결과 {count}건</span>
        ) : null}
      </div>
    </div>
  );
}
