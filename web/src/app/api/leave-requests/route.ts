import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { saveUploadedFile } from "@/lib/storage";
import { generateTicketCode } from "@/lib/ticket";
import {
  ALLOWED_DOCUMENT_TYPES,
  ALLOWED_SELFIE_TYPES,
  LEAVE_TYPES,
  MAX_DOCUMENT_SIZE_BYTES,
} from "@/lib/constants";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const studentId = String(formData.get("studentId") ?? "");
  const leaveType = String(formData.get("leaveType") ?? "");
  const startDateRaw = String(formData.get("startDate") ?? "");
  const endDateRaw = String(formData.get("endDate") ?? "");
  const reason = formData.get("reason") ? String(formData.get("reason")) : null;
  const parentName = String(formData.get("parentName") ?? "").trim();
  const parentWhatsapp = String(formData.get("parentWhatsapp") ?? "").trim();
  const document = formData.get("document") as File | null;
  const selfie = formData.get("selfie") as File | null;

  if (!studentId || !leaveType || !startDateRaw || !endDateRaw) {
    return apiError("VALIDATION_001", "Data wajib tidak lengkap.", 400);
  }

  if (!parentName) {
    return apiError("VALIDATION_012", "Nama orang tua/wali wajib diisi.", 400);
  }
  if (!/^\d{9,12}$/.test(parentWhatsapp)) {
    return apiError(
      "VALIDATION_013",
      "Nomor WhatsApp orang tua/wali harus berupa angka, 9-12 digit.",
      400
    );
  }

  if (!LEAVE_TYPES.some((t) => t.value === leaveType)) {
    return apiError("VALIDATION_002", "Jenis izin tidak valid.", 400);
  }

  const startDate = new Date(startDateRaw);
  const endDate = new Date(endDateRaw);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return apiError("VALIDATION_003", "Tanggal tidak valid.", 400);
  }
  if (endDate < startDate) {
    return apiError(
      "VALIDATION_004",
      "Tanggal selesai tidak boleh sebelum tanggal mulai.",
      400
    );
  }
  if (startDate < startOfToday()) {
    return apiError(
      "VALIDATION_005",
      "Tidak dapat mengajukan izin untuk tanggal yang sudah lewat.",
      400
    );
  }

  if (reason && reason.length > 500) {
    return apiError("VALIDATION_006", "Catatan maksimal 500 karakter.", 400);
  }

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student || !student.isActive) {
    return apiError("VALIDATION_007", "Siswa tidak ditemukan.", 400);
  }

  if (!selfie || selfie.size === 0) {
    return apiError("VALIDATION_008", "Selfie verifikasi wajib diambil.", 400);
  }
  if (!ALLOWED_SELFIE_TYPES.includes(selfie.type)) {
    return apiError("VALIDATION_009", "Format selfie tidak didukung.", 400);
  }

  if (document && document.size > 0) {
    if (!ALLOWED_DOCUMENT_TYPES.includes(document.type)) {
      return apiError(
        "VALIDATION_010",
        "Unsupported file type. Please upload PDF, JPG, or PNG.",
        400
      );
    }
    if (document.size > MAX_DOCUMENT_SIZE_BYTES) {
      return apiError("VALIDATION_011", "File size exceeds 5MB limit.", 400);
    }
  }

  const selfieUrl = await saveUploadedFile(selfie, "selfies");
  const documentUrl =
    document && document.size > 0
      ? await saveUploadedFile(document, "documents")
      : null;

  const ticketCode = generateTicketCode();

  const leaveRequest = await prisma.leaveRequest.create({
    data: {
      ticketCode,
      studentId: student.id,
      startDate,
      endDate,
      leaveType,
      reason,
      parentName,
      parentWhatsapp,
      documentUrl,
      selfieUrl,
      status: "PENDING",
    },
  });

  return apiSuccess(
    {
      id: leaveRequest.id,
      ticketCode: leaveRequest.ticketCode,
      studentName: student.fullName,
      status: leaveRequest.status,
    },
    { status: 201, message: "Leave request submitted successfully." }
  );
}
