import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { approvedReportWhere, reportDateKey, reportWindow, type DailyReportRow } from "./reportWindow";

/** One immutable snapshot per WITA day. Runs without an open browser. */
export async function generateDailyReport(now = new Date()) {
  const dateKey = reportDateKey(now);
  const { cutoffAt } = reportWindow(dateKey);
  if (now < cutoffAt) return null;

  const existing = await prisma.dailyLeaveReport.findUnique({ where: { dateKey } });
  if (existing) return existing;

  const items = await prisma.leaveRequest.findMany({
    where: approvedReportWhere(dateKey),
    include: { student: true, admin: true },
    orderBy: [{ student: { grade: "asc" } }, { student: { class: "asc" } }, { student: { fullName: "asc" } }, { ticketCode: "asc" }],
  });
  const rows: DailyReportRow[] = items.map((item) => ({
    ticketCode: item.ticketCode,
    studentId: item.studentId,
    studentName: item.student.fullName,
    nis: item.student.nis,
    studentClass: `${item.student.grade} ${item.student.class}`,
    leaveType: item.leaveType,
    startDate: item.startDate.toISOString().slice(0, 10),
    endDate: item.endDate.toISOString().slice(0, 10),
    approvedAt: item.processedAt!.toISOString(),
    approvedBy: item.admin?.fullName ?? "",
  }));
  try {
    return await prisma.dailyLeaveReport.create({
      data: { dateKey, cutoffAt, generatedAt: now, content: JSON.stringify(rows) },
    });
  } catch (error) {
    // Another scheduler/process may have saved the same day while we were reading.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return prisma.dailyLeaveReport.findUniqueOrThrow({ where: { dateKey } });
    }
    throw error;
  }
}
