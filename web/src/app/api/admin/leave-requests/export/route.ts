import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { leaveTypeLabel } from "@/lib/constants";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const status = params.get("status");
  const startDate = params.get("startDate");
  const endDate = params.get("endDate");

  const where: Prisma.LeaveRequestWhereInput = {};
  if (status) where.status = status;
  if (startDate || endDate) {
    where.startDate = {};
    if (startDate) where.startDate.gte = new Date(startDate);
    if (endDate) where.startDate.lte = new Date(endDate);
  }

  const items = await prisma.leaveRequest.findMany({
    where,
    include: { student: true, admin: true },
    orderBy: { createdAt: "desc" },
  });

  const header = [
    "Kode Tiket",
    "Nama Siswa",
    "NIS",
    "Kelas",
    "Nama Pengaju (Ortu/Wali)",
    "WhatsApp Pengaju",
    "Jenis Izin",
    "Tanggal Mulai",
    "Tanggal Selesai",
    "Status",
    "Diproses Oleh",
    "Alasan Penolakan",
    "Diajukan Pada",
  ];

  const rows = items.map((r) =>
    [
      r.ticketCode,
      r.student.fullName,
      r.student.nis,
      `${r.student.grade} ${r.student.class}`,
      r.parentName,
      r.parentWhatsapp,
      leaveTypeLabel(r.leaveType),
      r.startDate.toISOString().slice(0, 10),
      r.endDate.toISOString().slice(0, 10),
      r.status,
      r.admin?.fullName ?? "",
      r.adminNotes ?? "",
      r.createdAt.toISOString(),
    ]
      .map((v) => csvEscape(String(v)))
      .join(",")
  );

  const csv = [header.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="izinsiswa-laporan-${Date.now()}.csv"`,
    },
  });
}
