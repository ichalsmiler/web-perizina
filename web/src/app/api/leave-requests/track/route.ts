import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { leaveTypeLabel } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const ticketCode = request.nextUrl.searchParams.get("ticketCode")?.trim();

  if (!ticketCode) {
    return apiError("VALIDATION_001", "Kode tiket wajib diisi.", 400);
  }

  const leaveRequest = await prisma.leaveRequest.findUnique({
    where: { ticketCode },
    include: { student: true },
  });

  if (!leaveRequest) {
    return apiError(
      "NOT_FOUND_001",
      "Kode tiket tidak ditemukan. Periksa kembali kode Anda.",
      404
    );
  }

  return apiSuccess({
    ticketCode: leaveRequest.ticketCode,
    studentName: leaveRequest.student.fullName,
    leaveType: leaveRequest.leaveType,
    leaveTypeLabel: leaveTypeLabel(leaveRequest.leaveType),
    startDate: leaveRequest.startDate,
    endDate: leaveRequest.endDate,
    status: leaveRequest.status,
    rejectionReason:
      leaveRequest.status === "REJECTED" ? leaveRequest.adminNotes : null,
    submittedAt: leaveRequest.createdAt,
  });
}
