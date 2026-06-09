import Link from "next/link";
import type { SearchResultItem } from "../lib/types";
import {
  categoryLabel,
  dDayLabel,
  daysUntil,
  formatDate,
  sourceFamilyLabel,
  STATUS_LABELS
} from "../lib/format";
import { Badge } from "./Badge";

export function ResultCard({ item }: { item: SearchResultItem }) {
  const d = daysUntil(item.deadline);
  const urgent = d !== null && d >= 0 && d <= 7 && item.status === "active";
  const statusVariant =
    item.status === "active"
      ? "active"
      : item.status === "closed"
        ? "closed"
        : item.status === "upcoming"
          ? "upcoming"
          : "stale";

  return (
    <article className={`card${item.defense_or_dual_use ? " card-defense" : ""}`}>
      <div className="card-badges">
        <Badge variant={statusVariant}>{STATUS_LABELS[item.status] ?? item.status}</Badge>
        <Badge variant="category">{categoryLabel(item.space_category)}</Badge>
        {item.university_or_research_partner_required ? (
          <Badge variant="research">연구실/대학 가능</Badge>
        ) : null}
        {item.defense_or_dual_use ? <Badge variant="defense">방산/이중용도</Badge> : null}
        {urgent ? <Badge variant="urgent">{dDayLabel(item.deadline)}</Badge> : null}
      </div>

      <h3 className="card-title">
        <Link href={`/program/${encodeURIComponent(item.program_id)}`}>{item.title}</Link>
      </h3>
      <div className="card-agency">
        {item.agency ?? sourceFamilyLabel(item.source_family)} · {sourceFamilyLabel(item.source_family)}
      </div>

      <dl className="card-meta">
        <dt>📅 마감</dt>
        <dd>
          {formatDate(item.deadline)} {item.deadline ? <span className="badge badge-closed">{dDayLabel(item.deadline)}</span> : null}
        </dd>
        {item.support_amount ? (
          <>
            <dt>💰 지원</dt>
            <dd>{item.support_amount}</dd>
          </>
        ) : null}
        {item.target_company_type ? (
          <>
            <dt>👥 대상</dt>
            <dd>{item.target_company_type}</dd>
          </>
        ) : null}
      </dl>

      {item.summary ? <p className="card-summary">{item.summary}</p> : null}

      <div className="card-actions">
        <Link href={`/program/${encodeURIComponent(item.program_id)}`}>상세 보기 →</Link>
        <a href={item.source_url} target="_blank" rel="noreferrer">
          원문 페이지 →
        </a>
      </div>
    </article>
  );
}
