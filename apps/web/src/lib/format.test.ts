import assert from "node:assert/strict";
import test from "node:test";
import { formatDate } from "./format";

test("international deadlines display the Korean calendar date and time", () => {
  assert.equal(formatDate("2026-10-28T17:00:00-04:00"), "2026.10.29 06:00 KST");
  assert.equal(formatDate("2027-01-28T16:30:00-05:00"), "2027.01.29 06:30 KST");
  assert.equal(formatDate("2026-12-03T23:59:00Z"), "2026.12.04 08:59 KST");
});

test("Korean date-only notices retain their calendar date", () => {
  assert.equal(formatDate("2026-10-28"), "2026.10.28");
  assert.equal(formatDate(), "—");
});
