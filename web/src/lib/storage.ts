import { randomUUID } from "crypto";
import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";

// Local-disk stand-in for the private AWS S3 bucket described in DATABASE.md/API.md.
// Files are kept outside `public/` and can only be read through the authenticated
// `/api/files/[...key]` route, mirroring "access only via pre-signed URL".
const STORAGE_ROOT = path.join(process.cwd(), "storage");

export type UploadKind = "documents" | "selfies";

export async function saveUploadedFile(
  file: File,
  kind: UploadKind
): Promise<string> {
  const dir = path.join(STORAGE_ROOT, kind);
  await mkdir(dir, { recursive: true });

  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const fileName = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, fileName), buffer);

  return `${kind}/${fileName}`;
}

/** Resolves a stored file key (e.g. "documents/abc.pdf") to its bytes and best-guess content type. */
export async function readStoredFile(
  key: string
): Promise<{ data: Buffer; contentType: string }> {
  const safeKey = key.replace(/\.\./g, "");
  const filePath = path.join(STORAGE_ROOT, safeKey);
  const data = await readFile(filePath);
  const ext = safeKey.split(".").pop()?.toLowerCase();
  const contentType =
    ext === "pdf"
      ? "application/pdf"
      : ext === "png"
        ? "image/png"
        : ext === "jpg" || ext === "jpeg"
          ? "image/jpeg"
          : "application/octet-stream";
  return { data, contentType };
}
