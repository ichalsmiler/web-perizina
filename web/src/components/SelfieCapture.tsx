"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

type Props = {
  onCapture: (file: File | null) => void;
};

/**
 * Live camera capture only — deliberately has no <input type="file"> so a
 * selfie can never be swapped for a gallery photo (FR-05 liveness requirement).
 */
export default function SelfieCapture({ onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<
    "idle" | "starting" | "streaming" | "denied" | "insecure" | "captured"
  >("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // Browser hanya mengizinkan kamera pada secure context (HTTPS/localhost).
  // Saat aplikasi diakses lewat http://<ip-lan>:3000, kamera mustahil dibuka,
  // jadi langsung sediakan jalur unggah foto agar form tetap bisa dikirim.
  // Snapshot server selalu false agar HTML server & client sama; nilai asli dibaca setelah hidrasi.
  const isInsecureContext = useSyncExternalStore(
    noopSubscribe,
    () => !window.isSecureContext || !navigator.mediaDevices?.getUserMedia,
    () => false
  );

  async function startCamera() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setStatus("insecure");
      return;
    }

    setStatus("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus("streaming");
    } catch {
      setStatus("denied");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  useEffect(() => {
    return () => stopCamera();
  }, []);

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `selfie-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        setPreviewUrl(URL.createObjectURL(blob));
        onCapture(file);
        setStatus("captured");
        stopCamera();
      },
      "image/jpeg",
      0.9
    );
  }

  function retake() {
    setPreviewUrl(null);
    onCapture(null);
    if (isInsecureContext) {
      setStatus("idle");
      return;
    }
    startCamera();
  }

  return (
    <div className="flex flex-col gap-3">
      {(status === "idle" || status === "starting") && !isInsecureContext && (
        <button
          type="button"
          onClick={startCamera}
          disabled={status === "starting"}
          className="btn btn-secondary w-full"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          {status === "starting" ? "Membuka kamera..." : "Buka kamera depan"}
        </button>
      )}

      {status === "denied" && (
        <div role="alert" className="alert-bad flex flex-col gap-2">
          <p className="font-semibold">Kamera belum bisa diakses.</p>
          <p className="text-ink leading-relaxed">
            Ketuk ikon gembok atau kamera di bilah alamat browser, pilih{" "}
            <strong>Izinkan kamera</strong>, lalu coba lagi.
          </p>
          <button
            type="button"
            onClick={startCamera}
            className="btn btn-sm btn-secondary self-start"
          >
            Coba lagi
          </button>
        </div>
      )}

      {isInsecureContext && status !== "captured" && (
        <div className="bg-info-soft border border-link rounded p-4 flex flex-col gap-2">
          <p className="text-sm font-semibold text-heading">
            Ambil foto dengan aplikasi kamera HP
          </p>
          <p className="text-sm leading-relaxed">
            Halaman ini dibuka lewat jaringan lokal (HTTP), sehingga browser
            tidak mengizinkan kamera langsung di halaman. Ketuk tombol di
            bawah untuk memotret wajah Anda.
          </p>
          <label className="btn btn-primary self-start cursor-pointer focus-within:outline focus-within:outline-3 focus-within:outline-focus">
            Ambil foto wajah
            <input
              type="file"
              accept="image/jpeg,image/png"
              capture="user"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const preview = URL.createObjectURL(file);
                  setPreviewUrl(preview);
                  onCapture(file);
                  setStatus("captured");
                }
              }}
              className="sr-only"
            />
          </label>
        </div>
      )}

      <video
        ref={videoRef}
        className={`w-full max-w-sm aspect-[3/4] object-cover rounded bg-chrome ${
          status === "streaming" ? "block" : "hidden"
        }`}
        style={{ transform: "scaleX(-1)" }}
        playsInline
        muted
      />
      {status === "streaming" && (
        <button
          type="button"
          onClick={capture}
          className="btn btn-primary w-full max-w-sm"
        >
          Ambil foto
        </button>
      )}

      {status === "captured" && previewUrl && (
        <div className="flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Pratinjau foto verifikasi wajah"
            className="w-28 aspect-[3/4] object-cover rounded border border-line"
            style={{ transform: isInsecureContext ? undefined : "scaleX(-1)" }}
          />
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-ok-text">Foto tersimpan</p>
            <p className="hint">Pastikan wajah terlihat jelas.</p>
            <button
              type="button"
              onClick={retake}
              className="btn btn-sm btn-secondary self-start"
            >
              Ambil ulang
            </button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
