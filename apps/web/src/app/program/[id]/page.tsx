import Link from "next/link";
import { notFound } from "next/navigation";
import { getProgramServer } from "../../../lib/api.server";
import {
  categoryLabel,
  dDayLabel,
  formatDate,
  sourceFamilyLabel,
  STATUS_LABELS
} from "../../../lib/format";
import { Badge } from "../../../components/Badge";

export const dynamic = "force-dynamic";

export default async function ProgramDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const program = await getProgramServer(id).catch(() => null);
  if (!program) notFound();

  const statusVariant =
    program.status === "active"
      ? "active"
      : program.status === "closed"
        ? "closed"
        : program.status === "upcoming"
          ? "upcoming"
          : "stale";

  return (
    <main className="page">
      <Link href="/" className="detail-back">← 검색으로</Link>

      <header className="detail-header">
        <div className="badges">
          <Badge variant={statusVariant}>{STATUS_LABELS[program.status] ?? program.status}</Badge>
          <Badge variant="category">{categoryLabel(program.spaceCategory)}</Badge>
          {program.universityOrResearchPartnerRequired ? (
            <Badge variant="research">연구실/대학 가능</Badge>
          ) : null}
          {program.defenseOrDualUse ? <Badge variant="defense">방산/이중용도</Badge> : null}
        </div>
        <h1>{program.title}</h1>
        <div className="agency">
          {program.agency ?? sourceFamilyLabel(program.sourceFamily)}
          {" · "}
          {sourceFamilyLabel(program.sourceFamily)}
        </div>
      </header>

      <div className="detail-grid">
        <div style={{ display: "grid", gap: 16 }}>
          <section className="detail-section">
            <h2>일정</h2>
            <dl className="detail-table">
              <dt>신청 시작</dt>
              <dd>{formatDate(program.applicationStartDate)}</dd>
              <dt>신청 마감</dt>
              <dd>
                {formatDate(program.applicationEndDate)}{" "}
                <span className="badge badge-active">{dDayLabel(program.applicationEndDate)}</span>
              </dd>
              <dt>공고일</dt>
              <dd>{formatDate(program.announcementDate)}</dd>
              <dt>마감 근거</dt>
              <dd>
                {program.deadlineSource ?? "—"}
                {program.deadlineEvidenceUrl ? (
                  <>
                    {" · "}
                    <a href={program.deadlineEvidenceUrl} target="_blank" rel="noreferrer">
                      근거 보기 →
                    </a>
                  </>
                ) : null}
              </dd>
            </dl>
            {program.deadlineEvidenceText ? (
              <p style={{ marginTop: 12, fontSize: 13, color: "var(--c-text-muted)" }}>
                근거 텍스트: “{program.deadlineEvidenceText}”
              </p>
            ) : null}
          </section>

          <section className="detail-section">
            <h2>사업 개요</h2>
            <dl className="detail-table">
              <dt>지원 카테고리</dt>
              <dd>{categoryLabel(program.spaceCategory)}</dd>
              <dt>지역</dt>
              <dd>
                {program.region ?? "전국"}
                {program.targetRegions.length > 1
                  ? ` (${program.targetRegions.join(", ")})`
                  : ""}
              </dd>
              {program.supportAmountText ? (
                <>
                  <dt>지원 규모</dt>
                  <dd>{program.supportAmountText}</dd>
                </>
              ) : null}
              {program.targetCompanyType ? (
                <>
                  <dt>대상</dt>
                  <dd>{program.targetCompanyType}</dd>
                </>
              ) : null}
              {program.participationType ? (
                <>
                  <dt>참여 유형</dt>
                  <dd>{program.participationType}</dd>
                </>
              ) : null}
              <dt>컨소시엄</dt>
              <dd>
                {program.consortiumRequired === true
                  ? "필수"
                  : program.consortiumRequired === false
                    ? "불필요"
                    : "원문 확인 필요"}
              </dd>
              {program.industries.length > 0 ? (
                <>
                  <dt>산업 분야</dt>
                  <dd>{program.industries.join(", ")}</dd>
                </>
              ) : null}
              {program.technologyAreas.length > 0 ? (
                <>
                  <dt>기술 영역</dt>
                  <dd>{program.technologyAreas.join(", ")}</dd>
                </>
              ) : null}
            </dl>
            {program.eligibilityText ? (
              <p className="detail-summary" style={{ marginTop: 14 }}>
                <strong>신청 자격:</strong> {program.eligibilityText}
              </p>
            ) : null}
            {program.summary ? (
              <p className="detail-summary" style={{ marginTop: 12 }}>
                {program.summary}
              </p>
            ) : null}
          </section>

          {program.securityRequirements.length > 0 || program.restrictedNotice ? (
            <section className="detail-section">
              <h2>보안·접근 제한</h2>
              <ul style={{ paddingLeft: 18, margin: 0, fontSize: 14, lineHeight: 1.7 }}>
                {program.restrictedNotice ? (
                  <li>본 공고는 접근 제한이 있을 수 있습니다. 원문 확인 필요.</li>
                ) : null}
                {program.securityRequirements.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside style={{ display: "grid", gap: 16 }}>
          <section className="detail-section">
            <h2>원문 / 출처</h2>
            <div className="detail-links">
              <a href={program.sourceUrl} target="_blank" rel="noreferrer">
                공식 원문 페이지 →
              </a>
              {program.originalAgencyUrl ? (
                <a href={program.originalAgencyUrl} target="_blank" rel="noreferrer">
                  원기관 출처 →
                </a>
              ) : null}
            </div>
          </section>

          {program.attachmentUrls.length > 0 ? (
            <section className="detail-section">
              <h2>첨부 / 참고 링크 ({program.attachmentUrls.length}건)</h2>
              <div className="detail-attachments">
                {program.attachmentUrls.slice(0, 10).map((url) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer">
                    {url}
                  </a>
                ))}
                {program.attachmentUrls.length > 10 ? (
                  <span>+ {program.attachmentUrls.length - 10}건</span>
                ) : null}
              </div>
            </section>
          ) : null}

          <section className="detail-section">
            <h2>메타</h2>
            <dl className="detail-table" style={{ gridTemplateColumns: "110px 1fr" }}>
              <dt>데이터 정책</dt>
              <dd>{program.dataReusePolicy ?? "metadata_and_short_summary"}</dd>
              <dt>마지막 확인</dt>
              <dd>{formatDate(program.lastCheckedAt)}</dd>
              <dt>공고 ID</dt>
              <dd style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, wordBreak: "break-all" }}>
                {program.id}
              </dd>
            </dl>
          </section>
        </aside>
      </div>

      <div className="callout-warning">
        ⚠ 본 페이지는 자동 수집된 metadata + 짧은 요약입니다. 신청 전 반드시 원문과 첨부파일을
        직접 확인하시기 바랍니다.
      </div>
    </main>
  );
}
