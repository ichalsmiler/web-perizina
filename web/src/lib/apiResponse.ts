import { NextResponse } from "next/server";

export function apiSuccess<T>(data: T, init?: { status?: number; message?: string }) {
  return NextResponse.json(
    { success: true, data, ...(init?.message ? { message: init.message } : {}) },
    { status: init?.status ?? 200 }
  );
}

export function apiError(code: string, message: string, status = 400) {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status }
  );
}
