import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { createHandler } from "../apps/api/src/app.ts";
import { openDb } from "../apps/api/src/db.ts";

let base = "";
let close = async () => {};

before(async () => {
  const db = await openDb(); // in memory, fresh demo data
  const server = createServer(createHandler(db));
  await new Promise<void>((resolve) => server.listen(0, resolve));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
  close = async () => {
    server.close();
    await db.close();
  };
});
after(() => close());

const get = async (path: string) => {
  const res = await fetch(base + path);
  return { status: res.status, body: await res.json() };
};
const post = async (path: string, body?: unknown) => {
  const res = await fetch(base + path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, body: await res.json() };
};

test("health", async () => {
  assert.deepEqual((await get("/api/health")).body, { ok: true });
});

test("lists the demo invoices with an amount due", async () => {
  const { body } = await get("/api/invoices");
  assert.equal(body.length, 12);
  const starter = body.find((i: { number: string }) => i.number === "INV-2026-0186");
  assert.equal(starter.totalPaise, 58882);
  assert.equal(starter.duePaise, 0);
});

test("unknown invoice is a 404", async () => {
  assert.equal((await get("/api/invoices/INV-1999-0001")).status, 404);
});

test("UPI checkout: approve settles the payment", async () => {
  const start = await post("/api/checkout", { invoiceNumber: "INV-2026-0188", payerVpa: "saffron.lane@okmock" });
  assert.equal(start.status, 200);
  assert.equal(start.body.payment.status, "PENDING");
  assert.match(start.body.upiUri, /^upi:\/\/pay\?pa=ledgerloop\.demo@mockupi/);
  const approved = await post(`/api/mock-upi/${start.body.payment.id}/approve`);
  assert.equal(approved.body.status, "SETTLED");
  assert.match(approved.body.rrn, /^\d{12}$/);
  assert.equal((await get("/api/invoices/INV-2026-0188")).body.duePaise, 0);
});

test("UPI checkout: decline fails the payment", async () => {
  const start = await post("/api/checkout", { invoiceNumber: "INV-2026-0187", payerVpa: "accounts.nimbus@okmock" });
  assert.equal((await post(`/api/mock-upi/${start.body.payment.id}/decline`)).body.status, "FAILED");
});

test("checkout refuses a paid invoice and a bad UPI ID", async () => {
  assert.equal((await post("/api/checkout", { invoiceNumber: "INV-2026-0186", payerVpa: "kaveri.freight@okmock" })).status, 400);
  assert.equal((await post("/api/checkout", { invoiceNumber: "INV-2026-0187", payerVpa: "not a vpa" })).status, 400);
});

test("customer payment history is newest first", async () => {
  const { body } = await get("/api/customers/C-005/payments");
  assert.deepEqual(body.map((p: { id: string }) => p.id), ["PAY-1050", "PAY-1049", "PAY-1043"]);
});

test("settlement report has one row per settled day", async () => {
  const { body } = await get("/api/reports/settlement");
  const day = body.find((d: { date: string }) => d.date === "2026-10-21");
  assert.deepEqual(day, { date: "2026-10-21", payments: 2, grossPaise: 288510 });
});
