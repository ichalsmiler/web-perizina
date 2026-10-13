import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { apiError } from "@/lib/apiResponse";
import { prisma } from "@/lib/prisma";
import { reportWindow, type DailyReportRow } from "@/lib/reportWindow";
import { buildDailyReportWorkbook } from "@/lib/reportWorkbook";

export async function GET(request: NextRequest) {
  if (!await getAdminSession()) return apiError("AUTH_002", "Unauthorized.", 401);
  const dateKey = request.nextUrl.searchParams.get("date") ?? "";
  try { reportWindow(dateKey); } catch { return apiError("VALIDATION_001", "Tanggal tidak valid.", 400); }
  const report = await prisma.dailyLeaveReport.findUnique({ where: { dateKey } });
  if (!report) return apiError("NOT_FOUND_001", "Laporan belum tersedia.", 404);
  const buffer = buildDailyReportWorkbook(dateKey, JSON.parse(report.content) as DailyReportRow[]);
  return new NextResponse(new Uint8Array(buffer), { headers: {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="izin-siswa-${dateKey}.xlsx"`,
    "Cache-Control": "private, no-store",
  } });
}
