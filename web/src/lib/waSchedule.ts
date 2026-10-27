import { prisma } from "@/lib/prisma";
import { DEFAULT_WA_SCHEDULE, parseWaSchedule, type WaSchedule } from "@/lib/waScheduleRules";

export const WA_SCHEDULE_KEY = "waSchedule";

export async function getWaSchedule(): Promise<WaSchedule> {
  const row = await prisma.appSetting.findUnique({ where: { key: WA_SCHEDULE_KEY } });
  if (!row) return DEFAULT_WA_SCHEDULE;
  try {
    const parsed = parseWaSchedule(JSON.parse(row.value));
    return "value" in parsed ? parsed.value : DEFAULT_WA_SCHEDULE;
  } catch {
    return DEFAULT_WA_SCHEDULE;
  }
}

export async function saveWaSchedule(schedule: WaSchedule): Promise<void> {
  const value = JSON.stringify(schedule);
  await prisma.appSetting.upsert({
    where: { key: WA_SCHEDULE_KEY },
    update: { value },
    create: { key: WA_SCHEDULE_KEY, value },
  });
}
