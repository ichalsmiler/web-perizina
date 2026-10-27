/**
 * Jadwal rekap izin ke grup WhatsApp: tipe dan aturan validasi.
 * Tanpa akses database, supaya bisa dipakai halaman admin dan server sekaligus.
 */
export type WaSchedule = {
  enabled: boolean;
  /** Hari kirim, mengikuti Date.getDay(): 0 = Minggu, 1 = Senin, ..., 6 = Sabtu. */
  days: number[];
  /** Jam kirim WITA, format 24 jam "HH:MM", urut naik. */
  times: string[];
};

export const MAX_SESSIONS = 10;

export const DEFAULT_WA_SCHEDULE: WaSchedule = {
  enabled: true,
  days: [1, 2, 3, 4, 5],
  times: ["07:15", "07:45", "08:15"],
};

export const DAY_LABELS: { value: number; label: string }[] = [
  { value: 1, label: "Senin" },
  { value: 2, label: "Selasa" },
  { value: 3, label: "Rabu" },
  { value: 4, label: "Kamis" },
  { value: 5, label: "Jumat" },
  { value: 6, label: "Sabtu" },
  { value: 0, label: "Minggu" },
];

const TIME_24H = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Memeriksa dan merapikan input. Mengembalikan pesan galat bila tidak valid. */
export function parseWaSchedule(input: unknown): { value: WaSchedule } | { error: string } {
  if (typeof input !== "object" || input === null) return { error: "Format jadwal tidak valid." };
  const raw = input as Record<string, unknown>;

  if (typeof raw.enabled !== "boolean") return { error: "Status aktif tidak valid." };

  if (!Array.isArray(raw.days)) return { error: "Hari kirim tidak valid." };
  const days = [...new Set(raw.days)].filter(
    (d): d is number => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6
  );
  if (days.length !== raw.days.length || days.length === 0) {
    return { error: "Pilih minimal satu hari kirim." };
  }

  if (!Array.isArray(raw.times) || raw.times.length === 0) {
    return { error: "Tambahkan minimal satu sesi." };
  }
  if (raw.times.length > MAX_SESSIONS) {
    return { error: `Maksimal ${MAX_SESSIONS} sesi per hari.` };
  }
  if (!raw.times.every((t) => typeof t === "string" && TIME_24H.test(t))) {
    return { error: "Jam harus format 24 jam, 00:00 sampai 23:59." };
  }
  const times = [...(raw.times as string[])].sort();
  if (new Set(times).size !== times.length) {
    return { error: "Ada dua sesi dengan jam yang sama." };
  }

  return { value: { enabled: raw.enabled, days: days.sort((a, b) => a - b), times } };
}

/** Ringkasan untuk dibaca manusia, mis. "Senin sampai Jumat pukul 07.15, 07.45, dan 08.15 WITA". */
export function describeWaSchedule(s: WaSchedule): string {
  const order = DAY_LABELS.map((d) => d.value);
  const days = [...s.days].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const idx = days.map((d) => order.indexOf(d));
  const consecutive = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
  const name = (d: number) => DAY_LABELS.find((x) => x.value === d)?.label ?? "";

  let dayText: string;
  if (days.length === 7) dayText = "Setiap hari";
  else if (days.length >= 3 && consecutive) dayText = `${name(days[0])} sampai ${name(days[days.length - 1])}`;
  else dayText = joinId(days.map(name));

  const times = [...s.times].sort().map((t) => t.replace(":", "."));
  return `${dayText} pukul ${joinId(times)} WITA`;
}

function joinId(items: string[]): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} dan ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, dan ${items[items.length - 1]}`;
}
