import assert from "node:assert/strict";
import test from "node:test";
import { assertRefreshDependencies } from "./verify-space-refresh-dependencies.mjs";

test("refresh dependency preflight passes when required packages resolve", () => {
  assert.doesNotThrow(() => {
    assertRefreshDependencies({ resolvePackage: () => "/project/node_modules/typescript/package.json" });
  });
});

test("refresh dependency preflight stops before ingestion when a dependency is missing", () => {
  assert.throws(
    () => assertRefreshDependencies({ resolvePackage: () => { throw new Error("missing"); } }),
    /Run npm ci before refreshing\. No source data was changed\./
  );
});
