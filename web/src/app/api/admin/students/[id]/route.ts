import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/apiResponse";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const student = await prisma.student.findUnique({ where: { id } });
  if (!student) {
    return apiError("NOT_FOUND_001", "Student record not found.", 404);
  }
  return apiSuccess(student);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = await prisma.student.findUnique({ where: { id } });
  if (!existing) {
    return apiError("NOT_FOUND_001", "Student record not found.", 404);
  }

  const body = await request.json().catch(() => null);
  const nis = body?.nis ? String(body.nis).trim() : existing.nis;
  const fullName = body?.fullName ? String(body.fullName).trim() : existing.fullName;
  const grade = body?.grade ? String(body.grade).trim() : existing.grade;
  const studentClass = body?.class ? String(body.class).trim() : existing.class;
  const parentName =
    body?.parentName !== undefined ? String(body.parentName || "").trim() || null : existing.parentName;
  const parentPhone =
    body?.parentPhone !== undefined ? String(body.parentPhone || "").trim() || null : existing.parentPhone;
  const parentEmail =
    body?.parentEmail !== undefined ? String(body.parentEmail || "").trim() || null : existing.parentEmail;

  if (nis !== existing.nis) {
    const dup = await prisma.student.findUnique({ where: { nis } });
    if (dup) {
      return apiError("VALIDATION_001", "NIS sudah terdaftar.", 400);
    }
  }

  const updated = await prisma.student.update({
    where: { id },
    data: { nis, fullName, grade, class: studentClass, parentName, parentPhone, parentEmail },
  });

  return apiSuccess(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = await prisma.student.findUnique({ where: { id } });
  if (!existing) {
    return apiError("NOT_FOUND_001", "Student record not found.", 404);
  }

  await prisma.student.update({ where: { id }, data: { isActive: false } });
  return apiSuccess({ id, isActive: false });
}
