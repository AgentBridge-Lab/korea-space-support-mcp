import { scoreSpaceProgramFit, searchSpacePrograms, type SpaceCompanyProfile } from "@bidscout/shared";

const tenderResults = [
  {
    title: "Cyber Security Testing Services",
    buyer: "Example Council",
    score: 84,
    deadline: "12 Aug 2026",
    risk: "Certification requirements need manual confirmation"
  },
  {
    title: "Digital Transformation Discovery Partner",
    buyer: "Example NHS Trust",
    score: 68,
    deadline: "30 Jul 2026",
    risk: "Healthcare domain experience may be required"
  }
];

export default function Home() {
  const demoProfile: SpaceCompanyProfile = {
    name: "위성영상 AI 스타트업",
    businessType: "법인사업자",
    region: "서울",
    foundedAt: "2025-03-01",
    industry: "위성데이터 AI 분석",
    technologyAreas: ["위성영상", "AI 위성데이터", "재난 관측", "우주부품"],
    keywords: ["위성", "AI", "우주데이터"],
    employeeCount: 6,
    revenue: 100000000,
    previousGrants: [],
    certifications: [],
    hasResearchPartner: false,
    canJoinConsortium: true
  };
  const spaceResults = searchSpacePrograms({
    query: "위성 AI 우주부품",
    status: "active",
    deadlineWithinDays: 90,
    includeAdjacent: true,
    includeDefense: true,
    sortBy: "deadline",
    limit: 4
  }).map((program) => ({
    program,
    fit: scoreSpaceProgramFit(program, demoProfile)
  }));

  return (
    <main>
      <section className="hero">
        <div className="heroInner">
          <p className="eyebrow">KASA · KARI · KASI · DAPA · KEIT · KAIA</p>
          <h1>우주 스타트업을 위한 정부지원사업 검색 MCP</h1>
          <p className="lead">
            위성, 발사체, 우주데이터, 항공우주 부품 기업이 신청 가능한 지원사업을
            Claude, Cursor, ChatGPT 에이전트가 검색하고 회사 조건과 매칭합니다.
          </p>
          <form className="signup">
            <input aria-label="Email" placeholder="you@example.com" type="email" />
            <button type="button">Join beta</button>
          </form>
        </div>
      </section>

      <section className="band">
        <div className="content twoCol">
          <div>
            <h2>Example prompt</h2>
            <p className="prompt">
              서울 소재 위성영상 AI 스타트업이고 창업 2년차입니다. 90일 안에 마감되는
              우주·항공우주 지원사업을 찾아서 신청 가능성, 위험요소, 필요서류를 정리해줘.
            </p>
          </div>
          <div className="results">
            {spaceResults.map(({ program, fit }) => (
              <article className="result" key={program.id}>
                <div>
                  <h3>{program.title}</h3>
                  <p>
                    {program.agency} · {program.spaceCategory}
                  </p>
                </div>
                <span>{fit.fitScore}</span>
                <p>Deadline: {program.applicationEndDate ?? "원문 확인 필요"}</p>
                <p>Risk: {fit.risks[0] ?? fit.missingInformation[0] ?? "세부 신청자격 원문 확인 필요"}</p>
                <a href={program.sourceUrl}>Source</a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="content">
        <h2>Built for space startups and R&D consultants</h2>
        <div className="grid">
          <div>
            <h3>Source review</h3>
            <p>KASA, KARI, KASI, DAPA, KRIT, KEIT, and KAIA are tracked with conservative collection policies.</p>
          </div>
          <div>
            <h3>MCP tools</h3>
            <p>Use search, detail lookup, fit scoring, eligibility checks, source review, and program summaries from Claude or Cursor.</p>
          </div>
          <div>
            <h3>Source-linked output</h3>
            <p>Every result includes category, status, deadline, source URL, last checked time, and defense/dual-use warnings.</p>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="content twoCol">
          <div>
            <p className="eyebrow dark">Secondary track</p>
            <h2>UK public tender MCP track remains available.</h2>
            <p className="prompt">
              BidScout MCP also keeps a Contracts Finder-first UK tender workflow for consultants
              and AI builders who need tender search, detail lookup, and bid-fit scoring.
            </p>
          </div>
          <div className="results">
            {tenderResults.map((result) => (
              <article className="result" key={result.title}>
                <div>
                  <h3>{result.title}</h3>
                  <p>{result.buyer}</p>
                </div>
                <span>{result.score}</span>
                <p>Deadline: {result.deadline}</p>
                <p>Risk: {result.risk}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="notice">
        <p>
          MVP coverage is source-linked sample data only and does not claim complete Korean space-program coverage.
          Korea Space Support MCP does not guarantee eligibility, compliance, funding selection, or procurement advice.
        </p>
      </section>
    </main>
  );
}
