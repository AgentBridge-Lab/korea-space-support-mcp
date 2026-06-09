"use client";

import type { ApplicantType, SearchInput } from "../lib/types";
import { APPLICANT_LABELS, CATEGORY_LABELS, SOURCE_FAMILY_LABELS } from "../lib/format";

const APPLICANT_OPTIONS: ApplicantType[] = ["researcher_or_lab", "company", "startup_or_prefounder"];

const CATEGORY_OPTIONS = Object.keys(CATEGORY_LABELS);
const SOURCE_OPTIONS = Object.keys(SOURCE_FAMILY_LABELS);

const DEADLINE_PRESETS = [
  { label: "전체", value: "" },
  { label: "30일", value: "30" },
  { label: "60일", value: "60" },
  { label: "90일", value: "90" }
];

export function FilterPanel({
  value,
  onChange,
  onReset
}: {
  value: SearchInput;
  onChange: (next: SearchInput) => void;
  onReset: () => void;
}) {
  const set = <K extends keyof SearchInput>(key: K, v: SearchInput[K]) => onChange({ ...value, [key]: v });

  return (
    <aside className="filter">
      <div className="filter-group">
        <label className="filter-label">신청자 유형</label>
        {APPLICANT_OPTIONS.map((opt) => (
          <label key={opt} className="filter-option">
            <input
              type="radio"
              name="applicantType"
              checked={value.applicantType === opt}
              onChange={() => set("applicantType", opt)}
            />
            {APPLICANT_LABELS[opt]}
          </label>
        ))}
        <label className="filter-option">
          <input
            type="radio"
            name="applicantType"
            checked={!value.applicantType}
            onChange={() => set("applicantType", undefined)}
          />
          전체
        </label>
      </div>

      <div className="filter-group">
        <label className="filter-label">우주 카테고리</label>
        <select
          className="filter-select"
          value={value.spaceCategory ?? ""}
          onChange={(e) => set("spaceCategory", e.target.value || undefined)}
        >
          <option value="">전체</option>
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {CATEGORY_LABELS[opt]}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label className="filter-label">출처 패밀리</label>
        <select
          className="filter-select"
          value={value.sourceFamily ?? ""}
          onChange={(e) => set("sourceFamily", e.target.value || undefined)}
        >
          <option value="">전체</option>
          {SOURCE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {SOURCE_FAMILY_LABELS[opt]}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label className="filter-label">마감 윈도우</label>
        <div className="filter-row" style={{ gap: 6, flexWrap: "wrap" }}>
          {DEADLINE_PRESETS.map((preset) => {
            const active = String(value.deadlineWithinDays ?? "") === preset.value;
            return (
              <button
                key={preset.value || "all"}
                type="button"
                className={active ? "badge badge-active" : "badge"}
                onClick={() => set("deadlineWithinDays", preset.value ? Number(preset.value) : undefined)}
                style={{ cursor: "pointer" }}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="filter-group">
        <label className="filter-label">옵션</label>
        <label className="filter-option">
          <input
            type="checkbox"
            checked={value.includeClosed ?? false}
            onChange={(e) => set("includeClosed", e.target.checked || undefined)}
          />
          마감된 공고 포함
        </label>
        <label className="filter-option">
          <input
            type="checkbox"
            checked={value.includeDefense ?? true}
            onChange={(e) => set("includeDefense", e.target.checked)}
          />
          방산/이중용도 포함
        </label>
        <label className="filter-option">
          <input
            type="checkbox"
            checked={value.includeAdjacent ?? true}
            onChange={(e) => set("includeAdjacent", e.target.checked)}
          />
          인접 카테고리 포함
        </label>
        <label className="filter-option">
          <input
            type="checkbox"
            checked={value.defenseOnly ?? false}
            onChange={(e) => set("defenseOnly", e.target.checked || undefined)}
          />
          방산만 보기
        </label>
      </div>

      <button type="button" className="filter-reset" onClick={onReset}>
        필터 초기화
      </button>
    </aside>
  );
}
