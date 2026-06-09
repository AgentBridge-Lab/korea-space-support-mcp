import type { Metadata } from "next";
import Link from "next/link";
import "./styles.css";
import { getIngestReportServer } from "../lib/api";
import { formatDate } from "../lib/format";

export const metadata: Metadata = {
  title: "Korea Space Support — 한국 우주·항공 R&D 지원사업 검색",
  description: "마감일이 명확한 한국 우주·항공·국방우주 지원사업 공고를 검색합니다."
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const report = await getIngestReportServer().catch(() => null);
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body>
        <header className="topbar">
          <div className="topbar-inner">
            <Link href="/" className="brand">
              <span className="brand-mark">KS</span>
              <span>Korea Space Support</span>
            </Link>
            <div className="topbar-meta">
              {report?.lastCheckedAt ? (
                <span className="refresh-chip">최근 갱신 {formatDate(report.lastCheckedAt)}</span>
              ) : null}
              <a href="https://github.com/AgentBridge-Lab/korea-space-support-mcp" target="_blank" rel="noreferrer">
                GitHub
              </a>
            </div>
          </div>
        </header>
        {children}
        <footer className="footer">
          <span>Korea Space Support MCP · MIT License · 자동 수집 metadata. 신청 전 원문 확인 필수.</span>
        </footer>
      </body>
    </html>
  );
}
