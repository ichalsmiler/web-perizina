import type { DailyLeaveReport } from "@prisma/client";
import { prisma } from "./prisma";
import type { DailyReportRow } from "./reportWindow";
import { sendDailyReportToTelegram, TelegramDeliveryError } from "./telegramReport";

export async function deliverDailyReport(report: DailyLeaveReport) {
  if (process.env.TELEGRAM_REPORT_ENABLED !== "true") return "DISABLED";
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim() ?? "";
  if (!token || !chatId) throw new Error("Isi TELEGRAM_BOT_TOKEN dan TELEGRAM_CHAT_ID di environment server.");

  const claimed = await prisma.dailyLeaveReport.updateMany({
    where: { id: report.id, telegramStatus: { in: ["PENDING", "FAILED"] } },
    data: { telegramStatus: "SENDING" },
  });
  if (!claimed.count) return "SKIPPED";

  let messageId: number;
  try {
    messageId = await sendDailyReportToTelegram(report.dateKey, JSON.parse(report.content) as DailyReportRow[], { token, chatId });
  } catch (error) {
    await prisma.dailyLeaveReport.update({
      where: { id: report.id },
      data: { telegramStatus: error instanceof TelegramDeliveryError && !error.uncertain ? "FAILED" : "UNKNOWN" },
    });
    throw error;
  }
  // If persistence fails after sending, SENDING prevents an automatic duplicate.
  await prisma.dailyLeaveReport.update({
    where: { id: report.id },
    data: { telegramStatus: "SENT", telegramSentAt: new Date(), telegramMessageId: messageId },
  });
  return "SENT";
}
