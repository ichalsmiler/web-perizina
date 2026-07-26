import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/apiResponse";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const r = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { student: true, admin: true },
  });

  if (!r) {
    return apiError("NOT_FOUND_001", "Request ID does not exist.", 404);
  }

  return apiSuccess({
    id: r.id,
    ticketCode: r.ticketCode,
    student: {
      id: r.student.id,
      fullName: r.student.fullName,
      nis: r.student.nis,
      grade: r.student.grade,
      class: r.student.class,
      parentName: r.student.parentName,
      parentPhone: r.student.parentPhone,
      parentEmail: r.student.parentEmail,
    },
    submitter: {
      parentName: r.parentName,
      parentWhatsapp: r.parentWhatsapp,
    },
    leaveType: r.leaveType,
    startDate: r.startDate,
    endDate: r.endDate,
    reason: r.reason,
    documentUrl: r.documentUrl ? `/api/files/${r.documentUrl}` : null,
    selfieUrl: `/api/files/${r.selfieUrl}`,
    status: r.status,
    adminNotes: r.adminNotes,
    processedBy: r.admin?.fullName ?? null,
    submittedAt: r.createdAt,
    updatedAt: r.updatedAt,
  });
}
