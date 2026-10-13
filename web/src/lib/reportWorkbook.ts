import * as XLSX from "xlsx";
import { leaveTypeLabel } from "./constants";
import { REPORT_TIME_ZONE, type DailyReportRow } from "./reportWindow";

export function buildDailyReportWorkbook(dateKey: string, rows: DailyReportRow[]): Buffer {
  const worksheet = XLSX.utils.aoa_to_sheet([
    [`Laporan izin siswa ${dateKey} — batas persetujuan 07.30 WITA`],
    ["Kode Tiket", "Nama Siswa", "NIS", "Kelas", "Jenis Izin", "Mulai", "Selesai", "Disetujui (WITA)", "Disetujui Oleh"],
    ...rows.map((row) => [row.ticketCode, row.studentName, row.nis, row.studentClass,
      leaveTypeLabel(row.leaveType), row.startDate, row.endDate,
      new Date(row.approvedAt).toLocaleString("id-ID", { timeZone: REPORT_TIME_ZONE }), row.approvedBy]),
  ]);
  worksheet["!cols"] = [22, 30, 18, 18, 25, 14, 14, 24, 24].map((wch) => ({ wch }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Izin Disetujui");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
