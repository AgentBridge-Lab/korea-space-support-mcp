import assert from "node:assert/strict";
import test from "node:test";
import { inNasaPublicationWindow, nasaEasternDeadline, parseEnglishDate, selectNasaEntryDeadline } from "./ingest-nasa-programs.mjs";

test("NASA publication window uses posting dates with inclusive boundaries", () => {
  assert.equal(inNasaPublicationWindow("2026-04-01"), true);
  assert.equal(inNasaPublicationWindow("2026-10-26"), true);
  assert.equal(inNasaPublicationWindow("2026-03-31"), false);
  assert.equal(inNasaPublicationWindow("2026-10-27"), false);
  assert.equal(inNasaPublicationWindow("2025-07-10"), false);
});

test("mandatory NOI is the entry deadline even when the full proposal is still open", () => {
  const result = selectNasaEntryDeadline({ url: "https://nspires.nasaprs.com/example", rows: ["Release Jul 24, 2026", "HWOPSI25 Mandatory NOIs Due Sep 10, 2026", "HWOPSI25 Proposals Due Oct 26, 2026 11:59:59 PM Eastern Daylight Time"] }, { text: "", url: "https://science.nasa.gov/example" }, "noi");
  assert.equal(result.date, "2026-09-10T23:59:59-04:00");
});

test("optional NOIs do not replace the proposal deadline", () => {
  const result = selectNasaEntryDeadline({ url: "https://nspires.nasaprs.com/example", rows: ["SAT25 NOIs Due Jun 25, 2026", "SAT25 Proposals Due Aug 06, 2026"] }, { text: "", url: "https://science.nasa.gov/example" }, "proposal");
  assert.equal(result.date, "2026-08-06T23:59:59-04:00");
});

test("ARK observing deadlines ignore invited budgets and administrative close dates", () => {
  const result = selectNasaEntryDeadline({ url: "https://nspires.nasaprs.com/example", rows: ["FERMI25 Phase 2 Budget Proposals Due Aug 14, 2026", "Close Aug 31, 2026"] }, { text: "The due date for Phase-1 Proposals (submitted via ARK RPS) for all three is January 28, 2027.", url: "https://science.nasa.gov/example" }, "phase1");
  assert.equal(result.date, "2027-01-28T16:30:00-05:00");
  assert.equal(result.url, "https://science.nasa.gov/example");
});

test("NASA deadlines preserve exact Eastern times and seasonal offsets", () => {
  assert.equal(nasaEasternDeadline("2026-10-28", 17, 0, 0), "2026-10-28T17:00:00-04:00");
  assert.equal(nasaEasternDeadline("2026-11-20"), "2026-11-20T23:59:59-05:00");
  assert.equal(parseEnglishDate("22 July 2026"), "2026-07-22");
  assert.equal(parseEnglishDate("October14, 2026"), "2026-10-14");
});
