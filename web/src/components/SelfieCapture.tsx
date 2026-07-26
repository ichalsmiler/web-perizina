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
  const [status, setStatus] = useState<"idle" | "streaming" | "denied" | "captured">(
    "idle"
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function startCamera() {
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
      {status === "idle" && (
        <button
          type="button"
          onClick={startCamera}
          className="border border-secondary text-secondary rounded-md py-2 text-sm font-medium hover:bg-secondary hover:text-white transition-colors"
        >
          Aktifkan Kamera untuk Selfie
        </button>
      )}

      {status === "denied" && (
        <p className="text-sm text-danger">
          Akses kamera ditolak. Mohon izinkan akses kamera pada browser Anda
          untuk melanjutkan pengajuan (selfie wajib diambil langsung, tidak
          bisa unggah dari galeri).
        </p>
      )}

      <video
        ref={videoRef}
        className={`w-full rounded-md bg-neutral-dark ${
          status === "streaming" ? "block" : "hidden"
        }`}
        playsInline
        muted
      />
      {status === "streaming" && (
        <button
          type="button"
          onClick={capture}
          className="bg-secondary text-white rounded-md py-2 text-sm font-medium hover:bg-primary transition-colors"
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
          />
          <button
            type="button"
            onClick={retake}
            className="text-sm text-secondary hover:underline self-start"
          >
            Ambil ulang
          </button>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
