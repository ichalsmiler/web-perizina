"use client";

import { useEffect, useState } from "react";
import {
  DAY_LABELS,
  MAX_SESSIONS,
  describeWaSchedule,
  parseWaSchedule,
  type WaSchedule,
} from "@/lib/waScheduleRules";

type Gateway = { reachable: boolean; connected: boolean; groupSet: boolean };

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

function nextSessionTime(times: string[]): string {
  // Sesi baru: 30 menit setelah sesi terakhir, tidak melewati 23:59.
  const last = [...times].sort().at(-1);
  if (!last) return "07:00";
  const [h, m] = last.split(":").map(Number);
  const total = Math.min(h * 60 + m + 30, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function GatewayStatus({ gateway }: { gateway: Gateway }) {
  let text: string;
  let tone: string;
  if (!gateway.reachable) {
    text = "Gateway WA tidak berjalan di server ini. Rekap tidak akan terkirim sampai gateway dipasang (install.sh dengan WA_GATEWAY=1).";
    tone = "alert-bad";
  } else if (!gateway.connected) {
    text = "Gateway berjalan, tetapi bot WhatsApp belum terhubung. Scan QR di halaman /qr gateway.";
    tone = "alert-bad";
  } else if (!gateway.groupSet) {
    text = "Bot terhubung, tetapi grup tujuan belum dipilih. Pilih grup di halaman /qr gateway.";
    tone = "alert-bad";
  } else {
    text = "Bot WhatsApp terhubung dan grup tujuan sudah dipilih.";
    tone = "bg-ok-soft text-ok-text border border-ok rounded px-3 py-2.5 text-sm";
  }
  return (
    <p role="status" className={tone}>
      {text}
    </p>
  );
}

export default function SettingsPage() {
  const [saved, setSaved] = useState<WaSchedule | null>(null);
  const [draft, setDraft] = useState<WaSchedule | null>(null);
  const [gateway, setGateway] = useState<Gateway | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function load() {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch("/api/admin/settings/wa-schedule", { cache: "no-store" });
      const json = await res.json();
      if (!json.success) throw new Error();
      setSaved(json.data.schedule);
      setDraft(json.data.schedule);
      setGateway(json.data.gateway);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch
    load();
  }, []);

  if (loading && !draft) {
    return <p className="card p-5 text-muted">Memuat pengaturan...</p>;
  }
  if (loadError || !draft || !saved) {
    return (
      <div role="alert" className="alert-bad flex flex-wrap items-center justify-between gap-3">
        <span>Pengaturan gagal dimuat. Periksa koneksi ke server.</span>
        <button type="button" onClick={load} className="btn btn-sm btn-secondary">
          Muat ulang
        </button>
      </div>
    );
  }

  const check = parseWaSchedule(draft);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const update = (patch: Partial<WaSchedule>) => {
    setDraft({ ...draft, ...patch });
    setMessage(null);
  };
  const setTime = (i: number, part: "h" | "m", value: string) => {
    const [h, m] = draft.times[i].split(":");
    const times = [...draft.times];
    times[i] = part === "h" ? `${value}:${m}` : `${h}:${value}`;
    update({ times });
  };

  async function save() {
    if ("error" in check) {
      setMessage({ ok: false, text: check.error });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings/wa-schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(check.value),
      });
      const json = await res.json();
      if (!json.success) {
        setMessage({ ok: false, text: json.error?.message ?? "Gagal menyimpan jadwal." });
        return;
      }
      setSaved(json.data.schedule);
      setDraft(json.data.schedule);
      setMessage({ ok: true, text: "Jadwal disimpan. Gateway memakai jadwal baru dalam 1 menit." });
    } catch {
      setMessage({ ok: false, text: "Gagal terhubung ke server." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Pengaturan</h1>
      <p className="text-sm text-muted mt-1 mb-5">
        Jadwal rekap izin yang dikirim bot ke grup WhatsApp guru.
      </p>

      {gateway && <GatewayStatus gateway={gateway} />}

      <section className="card mt-4" aria-labelledby="h-jadwal">
        <div className="p-5 sm:p-6">
          <h2 id="h-jadwal" className="text-lg font-semibold">
            Rekap ke grup WhatsApp
          </h2>
          <p className="hint mt-1">
            Isi rekap: izin yang diajukan hari ini dan sudah disetujui. Setiap sesi
            memuat ulang daftar sesi sebelumnya ditambah izin yang baru disetujui.
          </p>

          <label className="flex items-center gap-3 mt-4 min-h-[44px] cursor-pointer">
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(e) => update({ enabled: e.target.checked })}
              className="w-5 h-5 flex-none accent-[var(--brand)]"
            />
            <span className="font-medium">Kirim rekap otomatis</span>
          </label>
        </div>

        <fieldset
          disabled={!draft.enabled}
          className="p-5 sm:p-6 border-t border-line disabled:opacity-60"
        >
          <legend className="sr-only">Hari kirim</legend>
          <p className="label" aria-hidden="true">
            Hari kirim
          </p>
          <div className="flex flex-wrap gap-2">
            {DAY_LABELS.map((d) => {
              const on = draft.days.includes(d.value);
              return (
                <label
                  key={d.value}
                  className={`inline-flex items-center gap-2 min-h-[44px] px-3 rounded border cursor-pointer text-sm ${
                    on ? "border-brand bg-sunken font-semibold text-heading" : "border-field"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(e) =>
                      update({
                        days: e.target.checked
                          ? [...draft.days, d.value]
                          : draft.days.filter((x) => x !== d.value),
                      })
                    }
                    className="w-4 h-4 accent-[var(--brand)]"
                  />
                  {d.label}
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset
          disabled={!draft.enabled}
          className="p-4 sm:p-6 border-t border-line disabled:opacity-60"
        >
          <legend className="sr-only">Sesi pengiriman</legend>
          {/* p-4 di HP: satu sesi (label, jam, menit, Hapus) harus muat satu baris di 375px. */}
          <div className="flex items-baseline justify-between gap-3">
            <p className="label mb-0" aria-hidden="true">
              Sesi pengiriman (jam WITA, format 24 jam)
            </p>
            <span className="hint whitespace-nowrap">
              {draft.times.length}/{MAX_SESSIONS}
            </span>
          </div>

          <ol className="mt-3 flex flex-col gap-2">
            {draft.times.map((t, i) => {
              const [h, m] = t.split(":");
              const duplicate = draft.times.indexOf(t) !== i;
              return (
                <li
                  key={i}
                  className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-2 p-2 sm:p-3 rounded border border-line bg-sunken"
                >
                  <span className="w-[52px] sm:w-16 text-sm font-semibold text-heading">Sesi {i + 1}</span>
                  <span className="flex items-center gap-1">
                    <label className="sr-only" htmlFor={`jam-${i}`}>
                      Jam sesi {i + 1}
                    </label>
                    <select
                      id={`jam-${i}`}
                      value={h}
                      onChange={(e) => setTime(i, "h", e.target.value)}
                      className="field w-[68px] sm:w-[76px] !px-2 font-mono"
                    >
                      {HOURS.map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                    <span className="font-mono font-semibold" aria-hidden="true">
                      :
                    </span>
                    <label className="sr-only" htmlFor={`menit-${i}`}>
                      Menit sesi {i + 1}
                    </label>
                    <select
                      id={`menit-${i}`}
                      value={m}
                      onChange={(e) => setTime(i, "m", e.target.value)}
                      className="field w-[68px] sm:w-[76px] !px-2 font-mono"
                    >
                      {MINUTES.map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                  </span>
                  <button
                    type="button"
                    onClick={() => update({ times: draft.times.filter((_, j) => j !== i) })}
                    disabled={draft.times.length === 1}
                    className="btn btn-sm btn-bad-outline ml-auto !px-3"
                    aria-label={`Hapus sesi ${i + 1}`}
                  >
                    Hapus
                  </button>
                  {duplicate && (
                    <span className="basis-full text-sm font-medium text-bad-text">
                      Jam sama dengan sesi lain
                    </span>
                  )}
                </li>
              );
            })}
          </ol>

          <button
            type="button"
            onClick={() => update({ times: [...draft.times, nextSessionTime(draft.times)] })}
            disabled={draft.times.length >= MAX_SESSIONS}
            className="btn btn-sm btn-secondary mt-3"
          >
            Tambah sesi
          </button>
        </fieldset>

        <div className="p-5 sm:p-6 border-t border-line bg-sunken rounded-b-[8px]">
          <p className="text-sm">
            {!draft.enabled
              ? "Rekap otomatis dimatikan. Bot tidak mengirim apa pun sampai diaktifkan lagi."
              : "value" in check
                ? `Rekap dikirim ${describeWaSchedule(check.value)}.`
                : check.error}
          </p>
          {message && (
            <p
              role={message.ok ? "status" : "alert"}
              className={
                message.ok
                  ? "mt-3 bg-ok-soft text-ok-text border border-ok rounded px-3 py-2.5 text-sm"
                  : "alert-bad mt-3"
              }
            >
              {message.text}
            </p>
          )}
          <div className="flex flex-col min-[420px]:flex-row gap-3 mt-4">
            <button
              type="button"
              onClick={save}
              disabled={saving || !dirty}
              className="btn btn-primary"
            >
              {saving ? "Menyimpan..." : dirty ? "Simpan jadwal" : "Tersimpan"}
            </button>
            {dirty && (
              <button
                type="button"
                onClick={() => {
                  setDraft(saved);
                  setMessage(null);
                }}
                className="btn btn-secondary"
              >
                Batalkan perubahan
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
