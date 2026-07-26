/*
  Warnings:

  - Added the required column `parentName` to the `leave_requests` table without a default value. This is not possible if the table is not empty.
  - Added the required column `parentWhatsapp` to the `leave_requests` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_leave_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketCode" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "requestDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "leaveType" TEXT NOT NULL,
    "reason" TEXT,
    "parentName" TEXT NOT NULL,
    "parentWhatsapp" TEXT NOT NULL,
    "documentUrl" TEXT,
    "selfieUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "adminId" TEXT,
    "adminNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "leave_requests_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "leave_requests_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admin_users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_leave_requests" ("adminId", "adminNotes", "createdAt", "documentUrl", "endDate", "id", "leaveType", "reason", "requestDate", "selfieUrl", "startDate", "status", "studentId", "ticketCode", "updatedAt") SELECT "adminId", "adminNotes", "createdAt", "documentUrl", "endDate", "id", "leaveType", "reason", "requestDate", "selfieUrl", "startDate", "status", "studentId", "ticketCode", "updatedAt" FROM "leave_requests";
DROP TABLE "leave_requests";
ALTER TABLE "new_leave_requests" RENAME TO "leave_requests";
CREATE UNIQUE INDEX "leave_requests_ticketCode_key" ON "leave_requests"("ticketCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
