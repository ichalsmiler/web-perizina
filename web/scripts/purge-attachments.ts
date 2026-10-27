// Hapus selfie + dokumen yang melewati masa simpan. Dijalankan harian oleh
// timer systemd izinsiswa-purge (dipasang install.sh): npm run purge-attachments
import { ATTACHMENT_RETENTION_DAYS, purgeExpiredAttachments } from "@/lib/attachmentRetention";
import { prisma } from "@/lib/prisma";

async function main() {
  const result = await purgeExpiredAttachments();
  console.log(
    `Masa simpan ${ATTACHMENT_RETENTION_DAYS} hari (diajukan sebelum ${result.cutoff.toISOString()}): ` +
      `${result.purged} dari ${result.checked} pengajuan dihapus lampirannya.`
  );
  for (const f of result.failures) {
    console.error(`Gagal menghapus lampiran ${f.ticketCode}: ${f.error}`);
  }
  if (result.failures.length) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
