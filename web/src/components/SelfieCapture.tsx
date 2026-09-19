"use client";

import { useEffect, useRef, useState } from "react";

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
  const [isInsecureContext, setIsInsecureContext] = useState(false);

  useEffect(() => {
    // Dihitung di client saja: window tidak ada saat render di server, dan
    // menghitungnya langsung saat render membuat HTML server & client berbeda.
    setIsInsecureContext(
      !window.isSecureContext || !navigator.mediaDevices?.getUserMedia
    );
  }, []);

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
    startCamera();
  }

  return (
    <div className="flex flex-col gap-3">
      {(status === "idle" || status === "starting") && !isInsecureContext && (
        <button
          type="button"
          onClick={startCamera}
          disabled={status === "starting"}
          className="flex items-center justify-center gap-2 border-2 border-secondary text-secondary rounded-md py-3.5 text-base font-medium hover:bg-secondary hover:text-white active:bg-secondary active:text-white transition-colors disabled:opacity-60"
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
          {status === "starting"
            ? "Membuka kamera..."
            : "Aktifkan Kamera untuk Selfie"}
        </button>
      )}

      {status === "denied" && (
        <div className="text-sm bg-danger/5 border border-danger/20 rounded-md p-4 flex flex-col gap-3">
          <p className="text-danger font-medium">Kamera belum bisa diakses.</p>
          <p className="text-neutral-dark leading-relaxed">
            Ketuk ikon gembok/kamera di bilah alamat browser, pilih{" "}
            <strong>Izinkan kamera</strong>, lalu coba lagi.
          </p>
          <button
            type="button"
            onClick={startCamera}
            className="self-start min-h-[44px] px-4 border border-secondary text-secondary rounded-md text-sm font-medium"
          >
            Coba lagi
          </button>
        </div>
      )}

      {isInsecureContext && status !== "captured" && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 flex flex-col gap-2">
          <p className="text-sm font-semibold text-amber-900 flex items-center gap-1.5">
            <span>📷</span> Unggah Foto Selfie / Orang Tua
          </p>
          <p className="text-xs text-amber-800 leading-relaxed">
            Karena halaman diakses melalui jaringan lokal (HTTP), kamera langsung tidak diizinkan oleh browser HP demi keamanan. Silakan unggah foto selfie Anda melalui tombol di bawah:
          </p>
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
            className="mt-2 block w-full text-sm text-neutral-dark file:mr-3 file:py-2.5 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-secondary file:text-white hover:file:bg-primary file:cursor-pointer border border-neutral-medium rounded-md bg-white p-1"
          />
        </div>
      )}

      <video
        ref={videoRef}
        className={`w-full aspect-[3/4] sm:aspect-video object-cover rounded-md bg-neutral-dark ${
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
          className="bg-secondary text-white rounded-md py-3.5 text-base font-medium hover:bg-primary active:bg-primary transition-colors"
        >
          Ambil Foto
        </button>
      )}

      {status === "captured" && previewUrl && (
        <div className="flex flex-col gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Pratinjau selfie verifikasi"
            className="w-full rounded-md"
            style={{ transform: "scaleX(-1)" }}
          />
          <button
            type="button"
            onClick={retake}
            className="self-start min-h-[44px] px-4 text-sm font-medium text-secondary hover:underline"
          >
            Ambil ulang
          </button>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
