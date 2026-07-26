import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { getAdminSession } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getAdminSession();
  if (!session) {
    return apiError("AUTH_002", "Unauthorized.", 401);
  }

  const body = await request.json().catch(() => null);
  const status = body?.status;
  const rejectionReason = body?.rejectionReason
    ? String(body.rejectionReason).trim()
    : "";

  if (status !== "Approved" && status !== "Rejected") {
    return apiError("VALIDATION_001", "Invalid status.", 400);
  }

  const existing = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!existing) {
    return apiError("NOT_FOUND_001", "Request ID does not exist.", 404);
  }
  if (existing.status !== "PENDING") {
    return apiError(
      "VALIDATION_002",
      "Request has already been processed.",
      400
    );
  }

  if (status === "Rejected") {
    if (rejectionReason.length < 10 || rejectionReason.length > 250) {
      return apiError(
        "VALIDATION_003",
        "Missing rejection reason (10-250 characters required).",
        400
      );
    }
  }

  const updated = await prisma.leaveRequest.update({
    where: { id },
    data: {
      status: status === "Approved" ? "APPROVED" : "REJECTED",
      adminId: session.sub,
      adminNotes: status === "Rejected" ? rejectionReason : null,
    },
  });

  return apiSuccess({
    id: updated.id,
    status: updated.status,
    approvedBy: session.fullName,
    approvedAt: updated.updatedAt,
  });
}
