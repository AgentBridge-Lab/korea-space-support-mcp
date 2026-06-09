import { spawn } from "node:child_process";
import net from "node:net";
import { writeFile } from "node:fs/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const reportPath = "data/space-api-mcp-smoke-report.json";
const failures = [];
const warnings = [];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getFreePort = async () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.on("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : undefined;
    server.close(() => {
      if (port) resolve(port);
      else reject(new Error("Could not allocate a local port."));
    });
  });
});

const parseToolJson = (result) => {
  const text = result?.content?.find((item) => item.type === "text")?.text;
  if (!text) throw new Error("MCP tool returned no text content.");
  return JSON.parse(text);
};

const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const postJson = async (baseUrl, path, body) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload;
};

const waitForApi = async (baseUrl) => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return response.json();
    } catch {
      // Retry until the spawned Fastify server is listening.
    }
    await wait(250);
  }
  throw new Error("API server did not become ready.");
};

const runApiSmoke = async () => {
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn("node", ["apps/api/dist/index.js"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "ignore", "pipe"]
  });
  const stderr = [];
  let childExited = false;
  child.once("exit", () => {
    childExited = true;
  });
  child.stderr.on("data", (chunk) => stderr.push(String(chunk)));

  try {
    const health = await waitForApi(baseUrl);
    assert(health?.ok === true, "API /health did not report ok=true.");

    const researcher = await postJson(baseUrl, "/space-programs/search", {
      applicant_type: "researcher_or_lab",
      include_closed: true,
      include_adjacent: true,
      include_defense: true,
      limit: 5
    });
    assert(Array.isArray(researcher.results) && researcher.results.length > 0, "API researcher search returned no results.");
    assert(
      researcher.results.some((program) => program.university_or_research_partner_required === true),
      "API researcher search did not expose any university/research-partner result."
    );

    const defense = await postJson(baseUrl, "/space-programs/search", {
      defense_only: true,
      include_closed: true,
      limit: 5
    });
    assert(Array.isArray(defense.results) && defense.results.length > 0, "API defense_only search returned no results.");
    assert(
      defense.results.every((program) => program.defense_or_dual_use || String(program.space_category).includes("defense")),
      "API defense_only search returned a non-defense result."
    );

    const detailId = researcher.results[0]?.program_id;
    if (detailId) {
      const detailResponse = await fetch(`${baseUrl}/space-programs/${encodeURIComponent(detailId)}`);
      const detail = await detailResponse.json();
      assert(detailResponse.ok && detail?.program?.id === detailId, "API detail endpoint did not return the requested program.");
    }

    return {
      port,
      health,
      researcherCount: researcher.results?.length ?? 0,
      defenseCount: defense.results?.length ?? 0,
      sampleProgramId: detailId,
      stderr: stderr.join("").slice(0, 1000)
    };
  } finally {
    if (!childExited) {
      child.kill();
      await new Promise((resolve) => child.once("exit", resolve));
    }
  }
};

const runMcpSmoke = async () => {
  const client = new Client({ name: "bidscout-space-smoke", version: "0.1.0" }, { capabilities: {} });
  const transport = new StdioClientTransport({
    command: "node",
    args: ["apps/mcp/dist/index.js"],
    cwd: process.cwd(),
    stderr: "pipe"
  });
  const stderr = [];
  transport.stderr?.on("data", (chunk) => stderr.push(String(chunk)));

  try {
    await client.connect(transport);
    const tools = await client.listTools();
    const toolNames = tools.tools.map((tool) => tool.name);
    assert(toolNames.includes("search_space_programs"), "MCP tools did not include search_space_programs.");
    assert(toolNames.includes("get_space_ingest_report"), "MCP tools did not include get_space_ingest_report.");

    const researcher = parseToolJson(await client.callTool({
      name: "search_space_programs",
      arguments: {
        applicant_type: "researcher_or_lab",
        include_closed: true,
        include_adjacent: true,
        include_defense: true,
        limit: 5
      }
    }));
    assert(Array.isArray(researcher.results) && researcher.results.length > 0, "MCP researcher search returned no results.");
    assert(
      researcher.results.some((program) => program.university_or_research_partner_required === true),
      "MCP researcher search did not expose any university/research-partner result."
    );

    const defense = parseToolJson(await client.callTool({
      name: "search_space_programs",
      arguments: {
        defense_only: true,
        include_closed: true,
        limit: 5
      }
    }));
    assert(Array.isArray(defense.results) && defense.results.length > 0, "MCP defense_only search returned no results.");
    assert(
      defense.results.every((program) => program.defense_or_dual_use || String(program.space_category).includes("defense")),
      "MCP defense_only search returned a non-defense result."
    );

    const ingest = parseToolJson(await client.callTool({
      name: "get_space_ingest_report",
      arguments: {}
    }));
    assert(ingest?.report?.generatedCount > 0, "MCP ingest report did not expose generatedCount.");

    return {
      toolNames,
      researcherCount: researcher.results?.length ?? 0,
      defenseCount: defense.results?.length ?? 0,
      generatedCount: ingest.report?.generatedCount,
      stderr: stderr.join("").slice(0, 1000)
    };
  } finally {
    await client.close().catch(() => {});
  }
};

let api = null;
let mcp = null;

try {
  api = await runApiSmoke();
} catch (error) {
  failures.push(`API smoke threw: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  mcp = await runMcpSmoke();
} catch (error) {
  failures.push(`MCP smoke threw: ${error instanceof Error ? error.message : String(error)}`);
}

const report = {
  checkedAt: new Date().toISOString(),
  api,
  mcp,
  warnings,
  failures
};

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log("Space API/MCP smoke verification");
console.log("");
console.log(`API researcher results: ${api?.researcherCount ?? "not run"}`);
console.log(`API defense results: ${api?.defenseCount ?? "not run"}`);
console.log(`MCP tools: ${mcp?.toolNames?.length ?? "not run"}`);
console.log(`MCP researcher results: ${mcp?.researcherCount ?? "not run"}`);
console.log(`MCP defense results: ${mcp?.defenseCount ?? "not run"}`);
console.log(`MCP generated count: ${mcp?.generatedCount ?? "not run"}`);
console.log(`Warnings: ${warnings.length}`);
for (const warning of warnings) console.log(`  - ${warning}`);
console.log(`Failures: ${failures.length}`);
for (const failure of failures) console.log(`  - ${failure}`);
console.log(`Wrote ${reportPath}`);

if (failures.length > 0) {
  process.exitCode = 1;
}
