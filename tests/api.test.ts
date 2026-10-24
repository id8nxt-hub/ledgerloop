import assert from "node:assert/strict";
import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { after, before, test } from "node:test";
import { createHandler } from "../apps/api/src/app.ts";
import { openDb } from "../apps/api/src/db.ts";

// These tests call the API's real request handler in process. No port is opened, so the suite
// also runs where networking is blocked, loopback included (agent sandboxes, locked-down CI).
let handle: ReturnType<typeof createHandler>;
let close = async () => {};

before(async () => {
  const db = await openDb(); // in memory, fresh demo data
  handle = createHandler(db);
  close = async () => {
    await db.close();
  };
});
after(() => close());

// Records what the handler sends: status, headers and body, the parts of ServerResponse it uses.
class RecordedResponse {
  statusCode = 200;
  readonly headers: Record<string, string> = {};
  readonly finished: Promise<string>;
  #chunks: Buffer[] = [];
  #finish: (text: string) => void = () => {};
  constructor() {
    this.finished = new Promise((resolve) => (this.#finish = resolve));
  }
  setHeader(name: string, value: string | number) {
    this.headers[name.toLowerCase()] = String(value);
    return this;
  }
  getHeader(name: string) {
    return this.headers[name.toLowerCase()];
  }
  writeHead(status: number, headers: Record<string, string | number> = {}) {
    this.statusCode = status;
    for (const [name, value] of Object.entries(headers)) this.setHeader(name, value);
    return this;
  }
  write(chunk: string | Buffer) {
    this.#chunks.push(Buffer.from(chunk));
    return true;
  }
  end(chunk?: string | Buffer) {
    if (chunk !== undefined) this.write(chunk);
    this.#finish(Buffer.concat(this.#chunks).toString("utf8"));
    return this;
  }
}

// One request through the handler: the body goes in as a JSON stream, as a client would send it.
async function request(method: string, path: string, body?: unknown) {
  const stream = Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))]);
  const req = Object.assign(stream, { method, url: path, headers: { host: "localhost" } });
  const res = new RecordedResponse();
  await handle(req as unknown as IncomingMessage, res as unknown as ServerResponse);
  const text = await res.finished;
  return { status: res.statusCode, headers: res.headers, body: JSON.parse(text) };
}
const get = (path: string) => request("GET", path);
const post = (path: string, body?: unknown) => request("POST", path, body);

test("health", async () => {
  const res = await get("/api/health");
  assert.equal(res.status, 200);
  assert.match(res.headers["content-type"], /^application\/json/);
  assert.deepEqual(res.body, { ok: true });
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
