import Link from "next/link";
import { getIngestReportServer, getSourcesServer } from "../../lib/api.server";
import { formatDate, sourceFamilyLabel } from "../../lib/format";
import { Badge } from "../../components/Badge";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { label: string; variant: "active" | "upcoming" | "stale" }> = {
  metadata_only: { label: "metadata-only", variant: "active" },
  not_started: { label: "검토 시작 전", variant: "stale" },
  manual_review_required: { label: "수동 검토 필요", variant: "upcoming" },
  approved: { label: "승인됨", variant: "active" }
};

export default async function AboutPage() {
  const [sources, report] = await Promise.all([
    getSourcesServer().catch(() => []),
    getIngestReportServer().catch(() => null)
  ]);

  return (
    <main className="page">
      <Link href="/" className="detail-back">← 검색으로</Link>

      <header className="page-header">
        <h1>이 서비스에 대하여</h1>
        <p>
          마감일이 명확한 한국 공공 우주·항공·국방우주 R&D 지원사업 공고만 수집해, 에이전트와
          사람 모두가 곧바로 활용할 수 있도록 검색·매칭 인터페이스로 제공합니다.
        </p>
      </header>

      <div className="about-grid">
        <section className="detail-section">
          <h2>수집 정책</h2>
          <div className="about-policy">
            <div>
              <strong>✅ 포함되는 공고</strong>
              <ul>
                <li>기업·스타트업·연구자·대학 연구실·연구팀·컨소시엄을 대상으로 한 공개 공고</li>
                <li>신청 마감일이 HTML/PDF/HWP 본문에서 확인된 공고</li>
                <li>우주·항공·국방우주·드론/UAM·천문·위성·발사체·부품소재 R&D 지원</li>
              </ul>
            </div>
            <div>
              <strong>❌ 제외되는 공고</strong>
              <ul>
                <li>가이드·포털·큐레이션 인덱스</li>
                <li>행사·전시·박람회·세미나·포럼·컨퍼런스·공모전·아이디어 대회</li>
                <li>채용·조달·입찰·계약 결과·선정 결과</li>
                <li>마감일을 읽을 수 없는 공고 (별도 audit 로그에 사유와 함께 기록)</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="detail-section">
          <h2>데이터 정책 & 면책</h2>
          <ul className="about-bullets">
            <li>
              본 서비스는 공개 페이지의 <strong>metadata + 짧은 요약</strong>만 저장합니다. 본문 전체는
              저장하지 않으며, 신청 전 원문 확인이 필요합니다.
            </li>
            <li>
              방산/이중용도 공고는 <strong>공개 metadata</strong>만 노출하며, 보안 요건·수출통제 정보는
              원문에서 확인해야 합니다.
            </li>
            <li>
              마감일은 자동 추출되며 <strong>근거 출처</strong>를 함께 보관합니다(공식 HTML 본문/첨부 PDF
              /첨부 HWP). 상세 페이지에서 근거를 확인할 수 있습니다.
            </li>
            <li>
              데이터는 <strong>주 1회(월 09:00 KST)</strong> launchd 에이전트로 갱신됩니다. 최근 갱신:{" "}
              <code>{report?.lastCheckedAt ? formatDate(report.lastCheckedAt) : "—"}</code> · 현재 보유{" "}
              <strong>{report?.generatedCount ?? "—"}</strong>건.
            </li>
          </ul>
        </section>
      </div>

      <section className="detail-section" style={{ marginTop: 24 }}>
        <h2>출처 패밀리 ({sources.length}종)</h2>
        <div className="about-sources">
          {sources.map((s) => {
            const status = STATUS_LABEL[s.mvpStatus] ?? { label: s.mvpStatus, variant: "stale" as const };
            return (
              <article key={s.sourceFamily} className="about-source-card">
                <div className="about-source-head">
                  <div>
                    <div className="about-source-family">{s.sourceFamily}</div>
                    <div className="about-source-name">{sourceFamilyLabel(s.sourceFamily)}</div>
                  </div>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
                <a href={s.officialUrl} target="_blank" rel="noreferrer" className="about-source-link">
                  {s.officialUrl}
                </a>
                <p className="about-source-coverage">{s.coverage}</p>
                {s.knownGaps.length > 0 ? (
                  <details className="about-source-gaps">
                    <summary>알려진 한계 {s.knownGaps.length}건</summary>
                    <ul>
                      {s.knownGaps.map((g) => (
                        <li key={g}>{g}</li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <div className="callout-warning">
        ⚠ 본 서비스는 자동 수집 metadata 기반 검색 보조 도구입니다. 실제 신청·자격·서류 요건은
        반드시 원문과 첨부파일을 직접 확인해 주세요. 본 데이터를 근거로 한 결과에 대해 운영자는
        법적 책임을 지지 않습니다.
      </div>
    </main>
  );
}
