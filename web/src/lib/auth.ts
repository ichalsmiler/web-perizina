import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET ?? "local-dev-secret-change-me";
export const ADMIN_COOKIE_NAME = "izinsiswa_admin_token";

export type AdminTokenPayload = {
  sub: string;
  email: string;
  fullName: string;
};

export function signAdminToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
}

export function verifyAdminToken(token: string): AdminTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AdminTokenPayload;
  } catch {
    return null;
  }
}

/** Reads and verifies the admin session from cookies in a Server Component / Route Handler. */
export async function getAdminSession(): Promise<AdminTokenPayload | null> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

/** Reads and verifies the admin session from a raw NextRequest (used inside route handlers). */
export function getAdminSessionFromCookieHeader(
  cookieHeader: string | null
): AdminTokenPayload | null {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${ADMIN_COOKIE_NAME}=`));
  if (!match) return null;
  const token = decodeURIComponent(match.split("=").slice(1).join("="));
  return verifyAdminToken(token);
}
