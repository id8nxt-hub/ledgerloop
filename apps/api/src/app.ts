import type { IncomingMessage, ServerResponse } from "node:http";
import type { Db } from "./db.ts";
import { getCreditNote, getInvoice, listInvoices } from "./invoices.ts";
import { paymentHistory } from "./payments/history.ts";
import { getPayment, listPayments } from "./payments/payments.ts";
import { approveUpiPayment, CheckoutError, declineUpiPayment, startUpiPayment } from "./payments/upi.ts";
import { reconcileAll, reconcileDay } from "./reconciliation/job.ts";
import { settlementReport } from "./reports/settlement-report.ts";

type Handler = (db: Db, params: string[], body: any) => Promise<unknown>;

// [method, path pattern, handler]. Capture groups become params.
const routes: [string, RegExp, Handler][] = [
  ["GET", /^\/api\/health$/, async () => ({ ok: true })],
  ["GET", /^\/api\/invoices$/, (db) => listInvoices(db)],
  ["GET", /^\/api\/invoices\/([\w-]+)$/, (db, [number]) => getInvoice(db, number)],
  ["GET", /^\/api\/credit-notes\/([\w-]+)$/, (db, [number]) => getCreditNote(db, number)],
  ["GET", /^\/api\/payments$/, (db) => listPayments(db)],
  ["GET", /^\/api\/payments\/([\w-]+)$/, (db, [id]) => getPayment(db, id)],
  ["GET", /^\/api\/customers\/([\w-]+)\/payments$/, (db, [id]) => paymentHistory(db, id)],
  ["GET", /^\/api\/reports\/settlement$/, (db) => settlementReport(db)],
  ["GET", /^\/api\/reconciliation$/, (db) => reconcileAll(db)],
  ["GET", /^\/api\/reconciliation\/(\d{4}-\d{2}-\d{2})$/, (db, [date]) => reconcileDay(db, date)],
  ["POST", /^\/api\/checkout$/, (db, _, body) => startUpiPayment(db, String(body?.invoiceNumber ?? ""), String(body?.payerVpa ?? ""))],
  ["POST", /^\/api\/mock-upi\/([\w-]+)\/approve$/, (db, [id]) => approveUpiPayment(db, id)],
  ["POST", /^\/api\/mock-upi\/([\w-]+)\/decline$/, (db, [id]) => declineUpiPayment(db, id)],
];

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  let text = "";
  for await (const chunk of req) text += chunk;
  return text ? JSON.parse(text) : null;
}

export function createHandler(db: Db) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    try {
      for (const [method, pattern, handler] of routes) {
        const match = pattern.exec(url.pathname);
        if (!match || req.method !== method) continue;
        const result = await handler(db, match.slice(1), method === "POST" ? await readJson(req) : null);
        if (result === null) return send(res, 404, { error: "not_found" });
        return send(res, 200, result);
      }
      send(res, 404, { error: "not_found" });
    } catch (error) {
      if (error instanceof CheckoutError) return send(res, 400, { error: "checkout", message: error.message });
      console.error(error);
      send(res, 500, { error: "internal" });
    }
  };
}
