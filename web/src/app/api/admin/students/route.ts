import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = params.get("query")?.trim();
  const page = Math.max(1, Number(params.get("page") ?? "1") || 1);
  const limit = Math.min(100, Math.max(1, Number(params.get("limit") ?? "20") || 20));

  const where: Prisma.StudentWhereInput = query
    ? { OR: [{ fullName: { contains: query } }, { nis: { contains: query } }] }
    : {};

  const [items, totalItems] = await Promise.all([
    prisma.student.findMany({
      where,
      orderBy: { fullName: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.student.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: items,
    pagination: {
      totalItems,
      totalPages: Math.ceil(totalItems / limit) || 1,
      currentPage: page,
      itemsPerPage: limit,
    },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const nis = body?.nis ? String(body.nis).trim() : "";
  const fullName = body?.fullName ? String(body.fullName).trim() : "";
  const grade = body?.grade ? String(body.grade).trim() : "";
  const studentClass = body?.class ? String(body.class).trim() : "";
  const parentName = body?.parentName ? String(body.parentName).trim() : null;
  const parentPhone = body?.parentPhone ? String(body.parentPhone).trim() : null;
  const parentEmail = body?.parentEmail ? String(body.parentEmail).trim() : null;

  if (!nis || !fullName || !grade || !studentClass) {
    return apiError(
      "VALIDATION_001",
      "NIS, Nama Lengkap, Tingkat, dan Kelas wajib diisi.",
      400
    );
  }

  const existing = await prisma.student.findUnique({ where: { nis } });
  if (existing) {
    return apiError("VALIDATION_002", "NIS sudah terdaftar.", 400);
  }

  const student = await prisma.student.create({
    data: {
      nis,
      fullName,
      grade,
      class: studentClass,
      parentName,
      parentPhone,
      parentEmail,
    },
  });

  return apiSuccess(student, { status: 201 });
}
