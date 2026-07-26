import { NextResponse } from "next/server";
import { buildStudentTemplateBuffer } from "@/lib/excel";

export async function GET() {
  const buffer = buildStudentTemplateBuffer();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-siswa-izinsiswa.xlsx"',
    },
  });
}
