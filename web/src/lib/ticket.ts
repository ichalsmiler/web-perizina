import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);

/** Generates a short, hard-to-guess public ticket code, e.g. "IZS-7K3PQR2X". */
export function generateTicketCode(): string {
  return `IZS-${nanoid()}`;
}
