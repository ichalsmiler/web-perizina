import { prisma } from "@/lib/prisma";
import { deleteStoredFile } from "@/lib/storage";
import { ATTACHMENT_RETENTION_DAYS } from "@/lib/constants";

/*
 * Masa simpan foto selfie dan dokumen pendukung, dihitung dari waktu pengajuan.
 * Catatan izinnya tetap disimpan; hanya lampirannya yang dihapus.
 * Pengajuan yang masih Menunggu tidak disentuh sampai diputuskan admin.
 */
export { ATTACHMENT_RETENTION_DAYS };

const DAY_MS = 24 * 60 * 60 * 1000;

/** Tanggal lampiran sebuah pengajuan dijadwalkan dihapus (paling cepat). */
export function attachmentsDeleteAfter(submittedAt: Date): Date {
  return new Date(submittedAt.getTime() + ATTACHMENT_RETENTION_DAYS * DAY_MS);
}

export async function purgeExpiredAttachments(now = new Date()) {
  const cutoff = new Date(now.getTime() - ATTACHMENT_RETENTION_DAYS * DAY_MS);
  const rows = await prisma.leaveRequest.findMany({
    where: {
      status: { not: "PENDING" },
      createdAt: { lte: cutoff },
      attachmentsPurgedAt: null,
    },
    select: { id: true, ticketCode: true, selfieUrl: true, documentUrl: true },
  });

  let purged = 0;
  const failures: { ticketCode: string; error: string }[] = [];
  for (const r of rows) {
    try {
      if (r.selfieUrl) await deleteStoredFile(r.selfieUrl);
      if (r.documentUrl) await deleteStoredFile(r.documentUrl);
      await prisma.leaveRequest.update({
        where: { id: r.id },
        data: { selfieUrl: "", documentUrl: null, attachmentsPurgedAt: now },
      });
      purged++;
    } catch (e) {
      // Catatan tidak ditandai, jadi dicoba lagi pada jadwal berikutnya.
      failures.push({ ticketCode: r.ticketCode, error: (e as Error).message });
    }
  }
  return { checked: rows.length, purged, failures, cutoff };
}
