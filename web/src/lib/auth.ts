import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (
    !secret ||
    Buffer.byteLength(secret.trim(), "utf8") < 32 ||
    secret === "change-me-to-a-long-random-string"
  ) {
    throw new Error("JWT_SECRET must be configured with at least 32 random bytes.");
  }
  return secret;
}
export const ADMIN_COOKIE_NAME = "izinsiswa_admin_token";

export type AdminTokenPayload = {
  sub: string;
  email: string;
  fullName: string;
};

export function signAdminToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { algorithm: "HS256", expiresIn: "1h" });
}

export function verifyAdminToken(token: string): AdminTokenPayload | null {
  try {
    const payload = jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] });
    if (
      typeof payload === "string" ||
      typeof payload.sub !== "string" || !payload.sub ||
      typeof payload.email !== "string" || !payload.email ||
      typeof payload.fullName !== "string" || !payload.fullName ||
      typeof payload.exp !== "number"
    ) return null;
    return { sub: payload.sub, email: payload.email, fullName: payload.fullName };
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
