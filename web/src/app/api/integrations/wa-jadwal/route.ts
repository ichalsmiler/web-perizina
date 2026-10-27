import { NextRequest, NextResponse } from "next/server";
import { checkWaGatewayToken } from "@/lib/integrationAuth";
import { getWaSchedule } from "@/lib/waSchedule";

// Dibaca gateway WA tiap menit untuk tahu kapan rekap dikirim.
export async function GET(request: NextRequest) {
  const denied = checkWaGatewayToken(request.headers.get("authorization"));
  if (denied) return denied;
  return NextResponse.json(await getWaSchedule(), { headers: { "Cache-Control": "no-store" } });
}
