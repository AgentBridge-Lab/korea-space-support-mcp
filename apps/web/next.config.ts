import path from "node:path";
import type { NextConfig } from "next";

const monorepoRoot = path.join(__dirname, "../..");

const nextConfig: NextConfig = {
  turbopack: {
    root: monorepoRoot
  },
  outputFileTracingRoot: monorepoRoot,
  outputFileTracingIncludes: {
    "/**/*": [
      "../../data/space-programs.generated.json",
      "../../data/space-programs.excluded.json",
      "../../data/space-ingest-report.json"
    ]
  }
};

export default nextConfig;
