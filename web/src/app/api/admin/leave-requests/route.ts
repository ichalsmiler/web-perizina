import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const status = params.get("status");
  const startDate = params.get("startDate");
  const endDate = params.get("endDate");
  const studentName = params.get("studentName");
  const ticketCode = params.get("ticketCode");
  const page = Math.max(1, Number(params.get("page") ?? "1") || 1);
  const limit = Math.min(100, Math.max(1, Number(params.get("limit") ?? "10") || 10));

  const where: Prisma.LeaveRequestWhereInput = {};
  if (status) where.status = status;
  if (ticketCode) where.ticketCode = { contains: ticketCode };
  if (studentName) {
    where.student = { fullName: { contains: studentName } };
  }
  if (startDate || endDate) {
    where.startDate = {};
    if (startDate) where.startDate.gte = new Date(startDate);
    if (endDate) where.startDate.lte = new Date(endDate);
  }

  const [items, totalItems] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      include: { student: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.leaveRequest.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: items.map((r) => ({
      id: r.id,
      ticketCode: r.ticketCode,
      studentId: r.studentId,
      studentName: r.student.fullName,
      studentClass: `${r.student.grade} ${r.student.class}`,
      parentName: r.parentName,
      parentPhone: r.parentWhatsapp,
      leaveType: r.leaveType,
      startDate: r.startDate,
      endDate: r.endDate,
      status: r.status,
      submittedAt: r.createdAt,
    })),
    pagination: {
      totalItems,
      totalPages: Math.ceil(totalItems / limit) || 1,
      currentPage: page,
      itemsPerPage: limit,
    },
  });
}
