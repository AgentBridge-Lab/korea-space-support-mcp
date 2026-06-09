"use client";

import { useState } from "react";
import type { CompanyProfile } from "../lib/types";

const REGIONS = [
  "전국",
  "서울",
  "부산",
  "대구",
  "인천",
  "광주",
  "대전",
  "울산",
  "세종",
  "경기",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주"
];

const BUSINESS_TYPES = [
  "대학 연구실",
  "출연연/정부연구기관",
  "기업 부설 연구소",
  "법인 기업",
  "예비창업자/개인"
];

const PROMPT_PRESETS: { label: string; value: Partial<CompanyProfile> }[] = [
  {
    label: "위성영상 AI 연구실",
    value: {
      name: "위성영상 AI 연구실",
      businessType: "대학 연구실",
      region: "서울",
      industry: "위성데이터 AI 분석",
      technologyAreas: ["위성영상", "AI", "재난 관측"],
      keywords: ["위성", "AI", "딥러닝"],
      employeeCount: 8,
      hasResearchPartner: true,
      canJoinConsortium: true
    }
  },
  {
    label: "발사체 부품 스타트업",
    value: {
      name: "발사체 부품 스타트업",
      businessType: "법인 기업",
      region: "대전",
      industry: "발사체 추진기관 부품",
      technologyAreas: ["발사체", "부품·소재", "추진기관"],
      keywords: ["발사체", "엔진", "부품"],
      employeeCount: 12,
      foundedAt: "2024-03-01",
      hasResearchPartner: false,
      canJoinConsortium: true
    }
  },
  {
    label: "드론·UAM 기체 연구",
    value: {
      name: "드론·UAM 기체 연구팀",
      businessType: "출연연/정부연구기관",
      region: "경남",
      industry: "UAM 기체 설계",
      technologyAreas: ["UAM", "드론", "항공기체"],
      keywords: ["드론", "UAM", "기체"],
      employeeCount: 15,
      hasResearchPartner: true,
      canJoinConsortium: true
    }
  }
];

const EMPTY_PROFILE: CompanyProfile = {
  technologyAreas: [],
  keywords: []
};

const splitCsv = (s: string) =>
  s
    .split(/[,\n]+/)
    .map((v) => v.trim())
    .filter(Boolean);

export function ProfileForm({
  initial,
  onApply
}: {
  initial?: CompanyProfile;
  onApply: (profile: CompanyProfile) => void;
}) {
  const [draft, setDraft] = useState<CompanyProfile>(initial ?? EMPTY_PROFILE);
  const [techText, setTechText] = useState((initial?.technologyAreas ?? []).join(", "));
  const [keywordText, setKeywordText] = useState((initial?.keywords ?? []).join(", "));

  const set = <K extends keyof CompanyProfile>(key: K, v: CompanyProfile[K]) =>
    setDraft((prev) => ({ ...prev, [key]: v }));

  const applyPreset = (preset: Partial<CompanyProfile>) => {
    const merged: CompanyProfile = { ...EMPTY_PROFILE, ...preset };
    setDraft(merged);
    setTechText((merged.technologyAreas ?? []).join(", "));
    setKeywordText((merged.keywords ?? []).join(", "));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onApply({
      ...draft,
      technologyAreas: splitCsv(techText),
      keywords: splitCsv(keywordText)
    });
  };

  return (
    <form className="profile-form" onSubmit={submit}>
      <div className="profile-presets">
        <span className="keyword-hint">예시 프로필:</span>
        {PROMPT_PRESETS.map((p) => (
          <button key={p.label} type="button" className="badge" onClick={() => applyPreset(p.value)} style={{ cursor: "pointer" }}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="profile-grid">
        <label className="profile-field">
          <span>연구실/팀 이름</span>
          <input
            className="filter-input"
            value={draft.name ?? ""}
            onChange={(e) => set("name", e.target.value)}
            placeholder="예: 위성영상 AI 연구실"
          />
        </label>

        <label className="profile-field">
          <span>유형</span>
          <select
            className="filter-select"
            value={draft.businessType ?? ""}
            onChange={(e) => set("businessType", e.target.value || undefined)}
          >
            <option value="">선택</option>
            {BUSINESS_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="profile-field">
          <span>지역</span>
          <select
            className="filter-select"
            value={draft.region ?? ""}
            onChange={(e) => set("region", e.target.value || undefined)}
          >
            <option value="">선택</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>

        <label className="profile-field">
          <span>창립/설립일</span>
          <input
            type="date"
            className="filter-input"
            value={draft.foundedAt ?? ""}
            onChange={(e) => set("foundedAt", e.target.value || undefined)}
          />
        </label>

        <label className="profile-field">
          <span>주요 산업/분야</span>
          <input
            className="filter-input"
            value={draft.industry ?? ""}
            onChange={(e) => set("industry", e.target.value)}
            placeholder="예: 위성데이터 AI 분석"
          />
        </label>

        <label className="profile-field">
          <span>인원수</span>
          <input
            type="number"
            min={1}
            className="filter-input"
            value={draft.employeeCount ?? ""}
            onChange={(e) => set("employeeCount", e.target.value ? Number(e.target.value) : undefined)}
            placeholder="예: 6"
          />
        </label>

        <label className="profile-field profile-field-wide">
          <span>기술 영역 (쉼표/줄바꿈으로 구분)</span>
          <textarea
            className="filter-input"
            rows={2}
            value={techText}
            onChange={(e) => setTechText(e.target.value)}
            placeholder="예: 위성영상, AI, 재난 관측"
          />
        </label>

        <label className="profile-field profile-field-wide">
          <span>키워드 (쉼표/줄바꿈으로 구분)</span>
          <textarea
            className="filter-input"
            rows={2}
            value={keywordText}
            onChange={(e) => setKeywordText(e.target.value)}
            placeholder="예: 위성, AI, 우주데이터"
          />
        </label>
      </div>

      <div className="profile-checks">
        <label className="filter-option">
          <input
            type="checkbox"
            checked={draft.hasResearchPartner ?? false}
            onChange={(e) => set("hasResearchPartner", e.target.checked)}
          />
          연구기관/대학 파트너 보유
        </label>
        <label className="filter-option">
          <input
            type="checkbox"
            checked={draft.canJoinConsortium ?? true}
            onChange={(e) => set("canJoinConsortium", e.target.checked)}
          />
          컨소시엄 참여 가능
        </label>
      </div>

      <button type="submit" className="profile-submit">
        매칭 점수 계산
      </button>
    </form>
  );
}
