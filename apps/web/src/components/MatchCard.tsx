import Link from "next/link";
import type { MatchResultItem } from "../lib/types";
import { categoryLabel, dDayLabel, formatDate, sourceFamilyLabel, STATUS_LABELS } from "../lib/format";
import { Badge } from "./Badge";

const eligibilityLabel: Record<string, string> = {
  likely_eligible: "신청 가능성 높음",
  needs_review: "검토 필요",
  unlikely_eligible: "신청 어려움"
};

const eligibilityVariant: Record<string, "active" | "upcoming" | "stale"> = {
  likely_eligible: "active",
  needs_review: "upcoming",
  unlikely_eligible: "stale"
};

export function MatchCard({ item }: { item: MatchResultItem }) {
  const scoreColor =
    item.fitScore >= 70 ? "var(--c-accent)" : item.fitScore >= 45 ? "var(--c-warning)" : "var(--c-text-faint)";

  return (
    <article className={`card${item.defenseOrDualUse ? " card-defense" : ""}`}>
      <div className="card-badges">
        <Badge variant={eligibilityVariant[item.eligibilityStatus] ?? "stale"}>
          {eligibilityLabel[item.eligibilityStatus] ?? item.eligibilityStatus}
        </Badge>
        <Badge variant="category">{categoryLabel(item.spaceRelevance)}</Badge>
        {item.universityOrResearchPartnerRequired ? <Badge variant="research">연구실/대학 가능</Badge> : null}
        {item.defenseOrDualUse ? <Badge variant="defense">방산/이중용도</Badge> : null}
        <span style={{ marginLeft: "auto", fontSize: 18, fontWeight: 700, color: scoreColor }}>
          {item.fitScore}점
        </span>
      </div>

      <h3 className="card-title">
        <Link href={`/program/${encodeURIComponent(item.programId)}`}>{item.title}</Link>
      </h3>
      <div className="card-agency">
        {item.agency ?? sourceFamilyLabel(item.sourceFamily)} · {sourceFamilyLabel(item.sourceFamily)} ·{" "}
        {STATUS_LABELS[item.status] ?? item.status}
      </div>

      <dl className="card-meta">
        <dt>📅 마감</dt>
        <dd>
          {formatDate(item.deadline)}{" "}
          {item.deadline ? <span className="badge badge-closed">{dDayLabel(item.deadline)}</span> : null}
        </dd>
      </dl>

      {item.reasons.length > 0 ? (
        <div className="match-block match-block-positive">
          <strong>✓ 적합 요소</strong>
          <ul>
            {item.reasons.slice(0, 4).map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {item.risks.length > 0 ? (
        <div className="match-block match-block-risk">
          <strong>⚠ 위험 요소</strong>
          <ul>
            {item.risks.slice(0, 4).map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {item.missingInformation.length > 0 ? (
        <div className="match-block match-block-missing">
          <strong>? 확인 필요</strong>
          <ul>
            {item.missingInformation.slice(0, 4).map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="card-actions">
        <Link href={`/program/${encodeURIComponent(item.programId)}`}>상세 보기 →</Link>
        <a href={item.sourceUrl} target="_blank" rel="noreferrer">
          원문 페이지 →
        </a>
      </div>
    </article>
  );
}
