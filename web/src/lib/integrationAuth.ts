import { timingSafeEqual } from "crypto";
import { apiError } from "@/lib/apiResponse";

/**
 * Pemeriksaan token untuk endpoint yang dipanggil gateway WA (Bearer WA_REKAP_TOKEN).
 * Mengembalikan respons galat, atau null bila token valid.
 */
export function checkWaGatewayToken(authorization: string | null) {
  const expected = process.env.WA_REKAP_TOKEN;
  if (!expected) {
    return apiError("INTEGRATION_001", "Rekap WA belum diaktifkan (WA_REKAP_TOKEN kosong).", 503);
  }
  const given = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return apiError("AUTH_002", "Unauthorized.", 401);
  }
  return null;
}
