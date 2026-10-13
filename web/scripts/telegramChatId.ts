// Run locally on the server with: node --env-file=.env --import tsx scripts/telegramChatId.ts
async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token || !/^\d+:[A-Za-z0-9_-]+$/.test(token)) throw new Error("Missing token");
  const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates`, {
    method: "POST", body: new URLSearchParams({ limit: "100", timeout: "0" }),
    signal: AbortSignal.timeout(30_000), redirect: "error",
  });
  const data = await response.json() as {
    ok?: boolean; result?: { message?: { chat?: { type?: string; id?: number } } }[];
  };
  if (!response.ok || !data.ok) throw new Error("Telegram refused");
  const ids = new Set((data.result ?? []).flatMap((update) => {
    const chat = update.message?.chat;
    return chat?.type === "private" && typeof chat.id === "number" ? [chat.id] : [];
  }));
  console.log(ids.size ? `Chat pribadi yang ditemukan: ${[...ids].join(", ")}` : "Belum ada chat pribadi. Kirim /start ke bot, lalu jalankan lagi.");
}
main().catch(() => {
  console.error("Gagal membaca chat. Periksa token server dan koneksi. Bot dengan webhook aktif perlu memakai chat ID yang sudah diketahui.");
  process.exitCode = 1;
});
