import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx";
import { sendDailyReportToTelegram, TelegramDeliveryError } from "./telegramReport";
import { buildDailyReportWorkbook } from "./reportWorkbook";
import type { DailyReportRow } from "./reportWindow";

const config = { token: "123456:fake-token-for-tests", chatId: "123456" };
const rows: DailyReportRow[] = [{
  ticketCode: "TEST", studentId: "student-test", studentName: "=HYPERLINK(\"example\")", nis: "00123",
  studentClass: "10 A", leaveType: "PERMIT", startDate: "2026-10-13", endDate: "2026-10-13",
  approvedAt: "2026-10-12T23:00:00Z", approvedBy: "Admin",
}];

test("Telegram sends protected Excel document to verified private chat", async () => {
  let calls = 0;
  const transport: typeof fetch = async (url, init) => {
    calls++;
    if (String(url).endsWith("/getChat")) return Response.json({ ok: true, result: { id: 123456, type: "private" } });
    assert.ok(String(url).endsWith("/sendDocument"));
    const form = init?.body as FormData;
    assert.equal(form.get("chat_id"), config.chatId);
    assert.equal(form.get("protect_content"), "true");
    assert.match(String(form.get("caption")), /1 siswa/);
    const document = form.get("document") as File;
    assert.equal(document.name, "izin-siswa-2026-10-13.xlsx");
    const workbook = XLSX.read(Buffer.from(await document.arrayBuffer()), { type: "buffer" });
    assert.equal(workbook.Sheets[workbook.SheetNames[0]]["C3"].v, "00123");
    assert.equal(workbook.Sheets[workbook.SheetNames[0]]["B3"].t, "s");
    assert.equal(workbook.Sheets[workbook.SheetNames[0]]["B3"].f, undefined);
    return Response.json({ ok: true, result: { message_id: 42 } });
  };
  assert.equal(await sendDailyReportToTelegram("2026-10-13", rows, config, transport), 42);
  assert.equal(calls, 2);
  const empty = XLSX.read(buildDailyReportWorkbook("2026-10-13", []), { type: "buffer" });
  assert.ok(empty.Sheets[empty.SheetNames[0]]["A2"]);
});

test("Telegram refuses non-private recipients before uploading student data", async () => {
  let calls = 0;
  await assert.rejects(sendDailyReportToTelegram("2026-10-13", rows, config, async () => {
    calls++;
    return Response.json({ ok: true, result: { id: 123456, type: "group" } });
  }), /chat pribadi/);
  assert.equal(calls, 1);
});

test("network failures redact bot token and mark uncertain document delivery", async () => {
  await assert.rejects(sendDailyReportToTelegram("2026-10-13", rows, config, async (url) => {
    if (String(url).endsWith("/getChat")) return Response.json({ ok: true, result: { id: 123456, type: "private" } });
    throw new Error(`network failure ${config.token}`);
  }), (error: unknown) => error instanceof TelegramDeliveryError && error.uncertain && !error.message.includes(config.token));
  await assert.rejects(sendDailyReportToTelegram("2026-10-13", rows, config, async () =>
    Response.json({ ok: false, error_code: 403, description: config.token }, { status: 403 })),
  (error: unknown) => error instanceof TelegramDeliveryError && !error.uncertain && !error.message.includes(config.token));
  await assert.rejects(sendDailyReportToTelegram("2026-10-13", rows, config, async (url) =>
    Response.json(String(url).endsWith("/getChat") ? { ok: true, result: { id: 123456, type: "private" } } : {})),
  (error: unknown) => error instanceof TelegramDeliveryError && error.uncertain);
});
