import assert from "node:assert/strict";
import test from "node:test";
import {
  parseCompanyProfile,
  parseJsonRecord,
  parseSearchBody,
  RequestValidationError
} from "./request-validation";

test("search validation accepts bounded supported filters", () => {
  assert.deepEqual(parseSearchBody({ query: "위성", limit: 5, include_closed: true }), {
    query: "위성",
    spaceCategory: undefined,
    sourceFamily: undefined,
    status: undefined,
    region: undefined,
    technologyAreas: undefined,
    companyStage: undefined,
    applicantType: undefined,
    deadlineWithinDays: undefined,
    includeAdjacent: undefined,
    includeDefense: undefined,
    defenseOnly: undefined,
    adjacentOnly: undefined,
    includeClosed: true,
    sortBy: undefined,
    limit: 5
  });
});

test("search and profile validation reject malformed types", () => {
  assert.throws(() => parseSearchBody({ query: { bad: true } }), RequestValidationError);
  assert.throws(
    () => parseCompanyProfile({ technologyAreas: "not-an-array", keywords: [] }),
    RequestValidationError
  );
});

test("JSON parser rejects oversized request bodies", async () => {
  const request = new Request("https://example.test/api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: "x".repeat(33 * 1024) })
  });
  await assert.rejects(() => parseJsonRecord(request), RequestValidationError);
});
