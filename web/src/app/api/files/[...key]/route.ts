import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { readStoredFile } from "@/lib/storage";

// Stands in for S3 pre-signed URL access: only an authenticated Admin may
// read uploaded documents/selfies, mirroring the "private bucket" requirement.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "AUTH_002", message: "Unauthorized." } },
      { status: 401 }
    );
  }

  const { key } = await params;
  try {
    const { data, contentType } = await readStoredFile(key.join("/"));
    return new NextResponse(new Uint8Array(data), {
      headers: { "Content-Type": contentType },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND_001", message: "File not found." } },
      { status: 404 }
    );
  }
}
