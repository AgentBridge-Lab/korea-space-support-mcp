import assert from "node:assert/strict";
import test from "node:test";
import { POST as matchPrograms } from "./match/route";
import { POST as searchPrograms } from "./search/route";

const jsonRequest = (body: unknown) => new Request("https://example.test/api/space-programs", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body)
});

test("search route returns 400 for malformed filter types", async () => {
  const response = await searchPrograms(jsonRequest({ query: { bad: true } }));
  assert.equal(response.status, 400);
});

test("match route returns 400 for malformed profile arrays", async () => {
  const response = await matchPrograms(jsonRequest({
    companyProfile: { technologyAreas: "bad", keywords: "bad" }
  }));
  assert.equal(response.status, 400);
});

test("search route still serves a bounded valid request", async () => {
  const response = await searchPrograms(jsonRequest({ query: "위성", includeClosed: true, limit: 2 }));
  assert.equal(response.status, 200);
  const body = await response.json() as { results?: unknown[] };
  assert.ok(Array.isArray(body.results));
  assert.ok(body.results.length <= 2);
});
