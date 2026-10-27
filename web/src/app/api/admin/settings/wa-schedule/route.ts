import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { getWaSchedule, saveWaSchedule } from "@/lib/waSchedule";
import { parseWaSchedule } from "@/lib/waScheduleRules";

// Alamat status gateway WA (hanya localhost). Kosong/gagal = status tidak diketahui.
const WA_GATEWAY_STATUS_URL =
  process.env.WA_GATEWAY_STATUS_URL ?? "http://127.0.0.1:3001/status";

async function gatewayStatus(): Promise<{ reachable: boolean; connected: boolean; groupSet: boolean }> {
  try {
    const res = await fetch(WA_GATEWAY_STATUS_URL, {
      signal: AbortSignal.timeout(2000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error();
    const json = await res.json();
    return { reachable: true, connected: !!json.connected, groupSet: !!json.group };
  } catch {
    return { reachable: false, connected: false, groupSet: false };
  }
}

export async function GET() {
  const [schedule, gateway] = await Promise.all([getWaSchedule(), gatewayStatus()]);
  return apiSuccess({ schedule, gateway });
}

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = parseWaSchedule(body);
  if ("error" in parsed) {
    return apiError("VALIDATION_001", parsed.error, 400);
  }
  await saveWaSchedule(parsed.value);
  return apiSuccess({ schedule: parsed.value }, { message: "Jadwal disimpan." });
}
