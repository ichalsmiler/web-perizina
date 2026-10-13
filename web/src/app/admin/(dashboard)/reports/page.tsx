import { getAdminSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { reportDateKey, reportWindow, REPORT_TIME_ZONE, type DailyReportRow } from "@/lib/reportWindow";
import { leaveTypeLabel } from "@/lib/constants";
import ReportRefresh from "@/components/ReportRefresh";

const deliveryLabels: Record<string, string> = {
  PENDING: "Belum dikirim", SENDING: "Pengiriman sedang berlangsung / perlu diperiksa bila tertahan",
  SENT: "Terkirim", FAILED: "Pengiriman gagal", UNKNOWN: "Status belum pasti — periksa Telegram sebelum mencoba ulang",
};

export default async function DailyReportsPage({ searchParams }: {
  searchParams: Promise<{ date?: string }>;
}) {
  if (!await getAdminSession()) redirect("/admin/login");
  const params = await searchParams;
  const dateKey = params.date ?? reportDateKey();
  try { reportWindow(dateKey); } catch { return <p>Tanggal laporan tidak valid.</p>; }
  const report = await prisma.dailyLeaveReport.findUnique({ where: { dateKey } });
  const rows = report ? JSON.parse(report.content) as DailyReportRow[] : [];
  const time = (date: Date) => date.toLocaleString("id-ID", { timeZone: REPORT_TIME_ZONE });
  const telegramEnabled = process.env.TELEGRAM_REPORT_ENABLED === "true";

  return <div>
    <ReportRefresh />
    <h1 className="text-xl font-semibold mb-2">Laporan Izin Pukul 07.30 WITA</h1>
    <p className="text-sm text-neutral-medium mb-6">Arsip harian izin yang berlaku pada tanggal laporan dan sudah disetujui hingga pukul 07.30 WITA. Persetujuan setelah jam tersebut tidak mengubah arsip.</p>
    <form className="flex flex-wrap gap-3 items-end mb-6">
      <label className="text-sm">Tanggal laporan<input name="date" type="date" defaultValue={dateKey} className="block border rounded-md px-3 py-2 mt-1" required /></label>
      <button className="bg-primary text-white rounded-md px-4 py-2 text-sm">Tampilkan</button>
      {report && <a href={`/api/admin/reports/daily/export?date=${dateKey}`} className="bg-neutral-dark text-white rounded-md px-4 py-2 text-sm">Unduh Excel</a>}
    </form>
    {!report ? <div className="bg-white rounded-lg p-5 shadow-sm">Laporan {dateKey} belum tersedia. Laporan dibuat otomatis pukul 07.30 WITA setelah penjadwal server diaktifkan.</div> : <>
      <div className="bg-white rounded-lg p-5 shadow-sm mb-4 text-sm space-y-1">
        <p className="font-semibold">{new Set(rows.map((row) => row.studentId)).size} siswa · {rows.length} permohonan disetujui</p>
        <p>Dibuat: {time(report.generatedAt)} WITA</p>
        <p>Telegram: {deliveryLabels[report.telegramStatus] ?? report.telegramStatus}{!telegramEnabled && report.telegramStatus === "PENDING" ? " (dinonaktifkan)" : ""}</p>
        {report.telegramSentAt && <p>Dikirim: {time(report.telegramSentAt)} WITA</p>}
      </div>
      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-sm"><thead><tr className="border-b text-left">
          {["Siswa", "NIS", "Kelas", "Jenis Izin", "Periode", "Disetujui (WITA)"].map((title) => <th key={title} className="p-3">{title}</th>)}
        </tr></thead><tbody>
          {!rows.length ? <tr><td colSpan={6} className="p-4">Tidak ada izin yang memenuhi kriteria pada tanggal ini.</td></tr> : rows.map((row) => <tr key={row.ticketCode} className="border-b last:border-0">
            <td className="p-3">{row.studentName}<div className="text-xs text-neutral-medium">{row.ticketCode}</div></td>
            <td className="p-3">{row.nis}</td><td className="p-3">{row.studentClass}</td>
            <td className="p-3">{leaveTypeLabel(row.leaveType)}</td>
            <td className="p-3">{row.startDate} – {row.endDate}</td>
            <td className="p-3">{time(new Date(row.approvedAt))}</td>
          </tr>)}
        </tbody></table>
      </div>
    </>}
  </div>;
}
