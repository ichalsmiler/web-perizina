import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { parseStudentImportFile } from "@/lib/excel";

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file || file.size === 0) {
    return apiError("VALIDATION_001", "File wajib diunggah.", 400);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return apiError("VALIDATION_002", "File maksimal 2MB.", 400);
  }
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return apiError("VALIDATION_003", "File harus berformat .xlsx.", 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = parseStudentImportFile(buffer);
  if (!parsed.ok) {
    return apiError("VALIDATION_004", parsed.error, 400);
  }

  const errors: { row: number; nis: string; reason: string }[] = [];
  const createdStudentIds: string[] = [];
  const seenNis = new Set<string>();

  for (const row of parsed.rows) {
    if (!row.nis && !row.fullName && !row.grade && !row.class) {
      continue; // fully blank trailing row
    }
    if (!row.nis) {
      errors.push({ row: row.row, nis: row.nis, reason: "NIS wajib diisi." });
      continue;
    }
    if (!row.fullName) {
      errors.push({ row: row.row, nis: row.nis, reason: "Nama Lengkap wajib diisi." });
      continue;
    }
    if (seenNis.has(row.nis)) {
      errors.push({ row: row.row, nis: row.nis, reason: "NIS duplikat di dalam file." });
      continue;
    }

    const existing = await prisma.student.findUnique({ where: { nis: row.nis } });
    if (existing) {
      errors.push({ row: row.row, nis: row.nis, reason: "NIS sudah terdaftar." });
      continue;
    }

    const created = await prisma.student.create({
      data: {
        nis: row.nis,
        fullName: row.fullName,
        grade: row.grade,
        class: row.class,
      },
    });
    seenNis.add(row.nis);
    createdStudentIds.push(created.id);
  }

  const totalRows = parsed.rows.length;
  const successCount = createdStudentIds.length;
  const failureCount = errors.length;

  return apiSuccess(
    { totalRows, successCount, failureCount, createdStudentIds, errors },
    {
      message: `Import selesai: ${successCount} berhasil, ${failureCount} gagal.`,
    }
  );
}
