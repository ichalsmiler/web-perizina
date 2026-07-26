import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/apiResponse";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";

  if (query.length < 2) {
    return apiError(
      "VALIDATION_001",
      "Masukkan minimal 2 karakter nama atau NIS untuk mencari.",
      400
    );
  }

  const students = await prisma.student.findMany({
    where: {
      isActive: true,
      OR: [
        { nis: { equals: query } },
        { fullName: { contains: query } },
      ],
    },
    select: {
      id: true,
      fullName: true,
      nis: true,
      grade: true,
      class: true,
    },
    take: 10,
    orderBy: { fullName: "asc" },
  });

  return apiSuccess(students);
}
