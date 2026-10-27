import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/apiResponse";
import { leaveTypeLabel } from "@/lib/constants";
import { checkWaGatewayToken } from "@/lib/integrationAuth";

// Dipanggil gateway WA (wa-gateway/server.js) untuk rekap pagi ke grup guru.
// Isi: izin yang DIAJUKAN sejak `since` (gateway mengirim awal hari ini, WITA)
// dan sudah DISETUJUI admin. Format respons mengikuti fetchIzin() di gateway.

function startOfTodayWita(): Date {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Makassar" });
  return new Date(`${today}T00:00:00+08:00`);
}

export async function GET(request: NextRequest) {
  const denied = checkWaGatewayToken(request.headers.get("authorization"));
  if (denied) return denied;

  const sinceParam = request.nextUrl.searchParams.get("since");
  const since = sinceParam ? new Date(sinceParam) : startOfTodayWita();
  if (Number.isNaN(since.getTime())) {
    return apiError("VALIDATION_001", "Parameter since tidak valid.", 400);
  }

  const rows = await prisma.leaveRequest.findMany({
    where: { status: "APPROVED", createdAt: { gte: since } },
    include: { student: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    izin: rows.map((r) => ({
      nama: r.student.fullName,
      kelas: `${r.student.grade} ${r.student.class}`,
      izin: leaveTypeLabel(r.leaveType),
    })),
  });
}
