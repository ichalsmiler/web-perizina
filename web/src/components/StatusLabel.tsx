import { STATUS_LABELS, type LeaveStatusValue } from "@/lib/constants";

const STYLES: Record<LeaveStatusValue, string> = {
  PENDING: "bg-info-soft text-link border-link",
  APPROVED: "bg-ok-soft text-ok-text border-ok",
  REJECTED: "bg-bad-soft text-bad-text border-bad",
};

/** Status selalu ditulis sebagai teks + ikon bentuk, tidak hanya warna. */
export default function StatusLabel({
  status,
  size = "sm",
}: {
  status: LeaveStatusValue;
  size?: "sm" | "lg";
}) {
  const iconSize = size === "lg" ? 18 : 14;
  return (
    <span
      className={`inline-flex items-center gap-1.5 border rounded font-semibold whitespace-nowrap ${
        STYLES[status]
      } ${size === "lg" ? "px-3 py-1.5 text-base" : "px-2 py-0.5 text-xs"}`}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        aria-hidden="true"
      >
        {status === "PENDING" && (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </>
        )}
        {status === "APPROVED" && <path d="M5 12.5l4.5 4.5L19 7.5" />}
        {status === "REJECTED" && <path d="M6 6l12 12M18 6L6 18" />}
      </svg>
      {STATUS_LABELS[status]}
    </span>
  );
}
