import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME, verifyAdminToken } from "@/lib/auth";

const PUBLIC_ADMIN_PATHS = ["/admin/login"];
const PUBLIC_ADMIN_API_PATHS = [
  "/api/admin/auth/login",
  "/api/admin/auth/logout",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const session = token ? verifyAdminToken(token) : null;

  const isApi = pathname.startsWith("/api/admin");
  const isPublic = isApi
    ? PUBLIC_ADMIN_API_PATHS.some((p) => pathname.startsWith(p))
    : PUBLIC_ADMIN_PATHS.some((p) => pathname.startsWith(p));

  if (isPublic || session) {
    return NextResponse.next();
  }

  if (isApi) {
    return NextResponse.json(
      { success: false, error: { code: "AUTH_002", message: "Unauthorized." } },
      { status: 401 }
    );
  }

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
