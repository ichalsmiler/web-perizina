import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { ADMIN_COOKIE_NAME, signAdminToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = body?.email ? String(body.email).trim().toLowerCase() : "";
  const password = body?.password ? String(body.password) : "";

  if (!email || !password) {
    return apiError("VALIDATION_001", "Email dan password wajib diisi.", 400);
  }

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin) {
    return apiError("AUTH_001", "Invalid username or password.", 401);
  }

  const passwordMatches = await bcrypt.compare(password, admin.passwordHash);
  if (!passwordMatches) {
    return apiError("AUTH_001", "Invalid username or password.", 401);
  }

  const token = signAdminToken({
    sub: admin.id,
    email: admin.email,
    fullName: admin.fullName,
  });

  const response = apiSuccess({
    token,
    user: { id: admin.id, name: admin.fullName },
  });

  response.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60, // 1 hour
  });

  return response;
}
