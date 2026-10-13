import assert from "node:assert/strict";
import test from "node:test";
import { approvedReportWhere, reportDateKey, reportWindow } from "./reportWindow";

test("report dates and cutoff use WITA regardless of server timezone", () => {
  assert.equal(reportDateKey(new Date("2026-10-12T16:00:00Z")), "2026-10-13");
  assert.equal(reportDateKey(new Date("2026-10-12T15:59:59Z")), "2026-10-12");
  assert.equal(reportWindow("2026-10-13").cutoffAt.toISOString(), "2026-10-12T23:30:00.000Z");
  assert.deepEqual(approvedReportWhere("2026-10-13"), {
    status: "APPROVED", startDate: { lte: new Date("2026-10-13T00:00:00Z") },
    endDate: { gte: new Date("2026-10-13T00:00:00Z") },
    processedAt: { lte: new Date("2026-10-12T23:30:00Z") },
  });
  for (const value of ["2026-02-30", "2026-13-01", "2026-1-1", "invalid"]) assert.throws(() => reportWindow(value));
  assert.doesNotThrow(() => reportWindow("2028-02-29"));
});
