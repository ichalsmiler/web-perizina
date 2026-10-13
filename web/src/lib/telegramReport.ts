import { buildDailyReportWorkbook } from "./reportWorkbook";
import type { DailyReportRow } from "./reportWindow";

export class TelegramDeliveryError extends Error {
  constructor(message: string, public readonly uncertain = false) { super(message); }
}

/** Private-chat delivery only. Never expose URLs, tokens or API response text in errors. */
export async function sendDailyReportToTelegram(
  dateKey: string, rows: DailyReportRow[],
  config: { token: string; chatId: string },
  transport: typeof fetch = fetch,
): Promise<number> {
  if (!/^\d+:[A-Za-z0-9_-]+$/.test(config.token) || !/^[1-9]\d*$/.test(config.chatId)) {
    throw new TelegramDeliveryError("Konfigurasi Telegram bot/chat pribadi tidak valid.");
  }
  async function call(method: string, body: FormData | URLSearchParams, sending = false) {
    let response: Response;
    try {
      response = await transport(`https://api.telegram.org/bot${config.token}/${method}`, {
        method: "POST", body, signal: AbortSignal.timeout(30_000), redirect: "error",
      });
    } catch {
      throw new TelegramDeliveryError("Koneksi Telegram gagal. Periksa status pengiriman sebelum mencoba kembali.", sending);
    }
    let result: { ok?: boolean; result?: { id?: number; type?: string; message_id?: number }; error_code?: number };
    try { result = await response.json(); } catch {
      throw new TelegramDeliveryError("Respons Telegram tidak valid.", sending);
    }
    if (typeof result.ok !== "boolean") throw new TelegramDeliveryError("Status respons Telegram tidak dapat dipastikan.", sending);
    if (!response.ok || !result.ok) {
      const code = typeof result.error_code === "number" ? result.error_code : response.status;
      throw new TelegramDeliveryError(`Telegram menolak permintaan (kode ${code}).`, sending && (code >= 500 || response.status >= 500));
    }
    return result.result;
  }
  const chat = await call("getChat", new URLSearchParams({ chat_id: config.chatId }));
  if (chat?.type !== "private" || String(chat.id) !== config.chatId) {
    throw new TelegramDeliveryError("Tujuan laporan harus chat pribadi yang dikonfigurasi.");
  }
  const form = new FormData();
  form.set("chat_id", config.chatId);
  form.set("protect_content", "true");
  const count = new Set(rows.map((row) => row.studentId)).size;
  form.set("caption", `Laporan Izin Siswa — ${dateKey}\nBatas persetujuan: 07.30 WITA\n${count} siswa · ${rows.length} permohonan disetujui dan berlaku hari ini.${rows.length ? "" : "\nTidak ada izin yang memenuhi kriteria."}`);
  form.set("document", new Blob([new Uint8Array(buildDailyReportWorkbook(dateKey, rows))], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  }), `izin-siswa-${dateKey}.xlsx`);
  const message = await call("sendDocument", form, true);
  if (typeof message?.message_id !== "number") throw new TelegramDeliveryError("Status pengiriman Telegram tidak dapat dipastikan.", true);
  return message.message_id;
}
