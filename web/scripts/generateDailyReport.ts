import { generateDailyReport } from "../src/lib/dailyReport";
import { prisma } from "../src/lib/prisma";
import { deliverDailyReport } from "../src/lib/deliverDailyReport";

async function main() {
  const report = await generateDailyReport();
  // Do not log student information to system logs.
  console.log(report ? `Laporan ${report.dateKey} tersedia.` : "Belum pukul 07.30 WITA; laporan belum dibuat.");
  if (report) console.log(`Telegram: ${await deliverDailyReport(report)}`);
}

main().catch(() => {
  // A raw network/SDK error could contain credentials or student data.
  console.error("Pembuatan/pengiriman laporan gagal; periksa konfigurasi dan status laporan di dashboard.");
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
