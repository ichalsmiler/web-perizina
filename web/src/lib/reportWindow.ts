export const REPORT_TIME_ZONE = "Asia/Makassar";

export function reportDateKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: REPORT_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)!.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function reportWindow(dateKey: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) throw new Error("Tanggal tidak valid.");
  // Leave dates are date-only form values, stored at UTC midnight by the existing API.
  const leaveDate = new Date(`${dateKey}T00:00:00.000Z`);
  if (Number.isNaN(leaveDate.getTime()) || leaveDate.toISOString().slice(0, 10) !== dateKey) {
    throw new Error("Tanggal tidak valid.");
  }
  return { leaveDate, cutoffAt: new Date(`${dateKey}T07:30:00+08:00`) };
}

export function approvedReportWhere(dateKey: string) {
  const { leaveDate, cutoffAt } = reportWindow(dateKey);
  return {
    status: "APPROVED",
    startDate: { lte: leaveDate },
    endDate: { gte: leaveDate },
    processedAt: { lte: cutoffAt },
  };
}

export type DailyReportRow = {
  ticketCode: string;
  studentId: string;
  studentName: string;
  nis: string;
  studentClass: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  approvedAt: string;
  approvedBy: string;
};
