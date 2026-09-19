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

  // Cookie `Secure` hanya boleh aktif saat koneksi benar-benar HTTPS.
  // Tanpa pengecekan ini, deployment HTTP di LAN (mis. http://192.168.x.x:3000)
  // membuat browser membuang cookie sesi sehingga admin terus dilempar ke halaman login.
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const isHttps = forwardedProto
    ? forwardedProto.split(",")[0].trim() === "https"
    : request.nextUrl.protocol === "https:";

  response.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps,
    path: "/",
    maxAge: 60 * 60, // 1 hour
  });

  return response;
}
