export const LEAVE_TYPES = [
  { value: "SICK", label: "Sakit" },
  { value: "FAMILY_EMERGENCY", label: "Keadaan Darurat Keluarga" },
  { value: "PERMIT", label: "Izin" },
  { value: "OTHER", label: "Lainnya" },
] as const;

export type LeaveTypeValue = (typeof LEAVE_TYPES)[number]["value"];

export const LEAVE_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type LeaveStatusValue = (typeof LEAVE_STATUSES)[number];

export const STATUS_LABELS: Record<LeaveStatusValue, string> = {
  PENDING: "Menunggu",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
};

export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];
export const ALLOWED_SELFIE_TYPES = ["image/jpeg", "image/png"];
export const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export function leaveTypeLabel(value: string): string {
  return LEAVE_TYPES.find((t) => t.value === value)?.label ?? value;
}
