import * as XLSX from "xlsx";

export const STUDENT_TEMPLATE_HEADERS = [
  "NIS",
  "Nama Lengkap",
  "Tingkat",
  "Kelas",
] as const;

export function buildStudentTemplateBuffer(): Buffer {
  const worksheet = XLSX.utils.aoa_to_sheet([
    [...STUDENT_TEMPLATE_HEADERS],
    ["0012345678", "Nama Siswa Contoh", "10", "IPA 1"],
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Siswa");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export type StudentImportRow = {
  row: number;
  nis: string;
  fullName: string;
  grade: string;
  class: string;
};

export type StudentImportParseResult =
  | { ok: true; rows: StudentImportRow[] }
  | { ok: false; error: string };

/** Parses an uploaded student-import workbook, checking the header row matches the template. */
export function parseStudentImportFile(buffer: Buffer): StudentImportParseResult {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch {
    return { ok: false, error: "File tidak dapat dibaca. Pastikan file berformat .xlsx." };
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { ok: false, error: "File Excel tidak memiliki sheet." };
  }
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<(string | number | undefined)[]>(sheet, {
    header: 1,
    blankrows: false,
  });

  if (data.length === 0) {
    return { ok: false, error: "File Excel kosong." };
  }

  const header = (data[0] || []).map((h) => String(h ?? "").trim());
  const expected = STUDENT_TEMPLATE_HEADERS;
  const headerMatches =
    header.length >= expected.length &&
    expected.every((h, i) => header[i]?.toLowerCase() === h.toLowerCase());

  if (!headerMatches) {
    return {
      ok: false,
      error: `Format file tidak sesuai template. Header yang diharapkan: ${expected.join(", ")}.`,
    };
  }

  const rows: StudentImportRow[] = data.slice(1).map((line, idx) => ({
    row: idx + 2, // +2: 1-indexed plus header row
    nis: String(line[0] ?? "").trim(),
    fullName: String(line[1] ?? "").trim(),
    grade: String(line[2] ?? "").trim(),
    class: String(line[3] ?? "").trim(),
  }));

  return { ok: true, rows };
}
