import assert from "node:assert/strict";
import test from "node:test";
import { deriveSpaceProgramStatus, isPastKoreaDate, koreaDateEndOfDayTime } from "./date-utils.js";

test("date-only deadlines use Korea end-of-day", () => {
  assert.equal(koreaDateEndOfDayTime("2026-06-08"), new Date("2026-06-08T23:59:59+09:00").getTime());
  assert.equal(isPastKoreaDate("2026-06-08", new Date("2026-06-08T14:59:00Z").getTime()), false);
  assert.equal(isPastKoreaDate("2026-06-08", new Date("2026-06-08T15:00:00Z").getTime()), true);
});

test("space program status is derived from live deadline", () => {
  const beforeDeadline = new Date("2026-06-08T14:59:00Z").getTime();
  const afterDeadline = new Date("2026-06-08T15:00:00Z").getTime();

  assert.equal(deriveSpaceProgramStatus("2026-06-08", "active", beforeDeadline), "active");
  assert.equal(deriveSpaceProgramStatus("2026-06-08", "active", afterDeadline), "closed");
  assert.equal(deriveSpaceProgramStatus(undefined, "active", beforeDeadline), "stale");
  assert.equal(deriveSpaceProgramStatus("2026-06-08", "cancelled", beforeDeadline), "cancelled");
});
