ALTER TABLE "leave_requests" ADD COLUMN "processedAt" DATETIME;

-- Existing decisions only have updatedAt; preserve it as the best available time.
UPDATE "leave_requests" SET "processedAt" = "updatedAt" WHERE "status" IN ('APPROVED', 'REJECTED');

CREATE TABLE "daily_leave_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dateKey" TEXT NOT NULL,
    "cutoffAt" DATETIME NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT NOT NULL,
    "telegramStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "telegramSentAt" DATETIME,
    "telegramMessageId" INTEGER
);
CREATE UNIQUE INDEX "daily_leave_reports_dateKey_key" ON "daily_leave_reports"("dateKey");
