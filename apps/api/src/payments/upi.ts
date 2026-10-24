import type { Payment } from "@ledgerloop/ledger";
import { todayIST } from "../db.ts";
import type { Db } from "../db.ts";
import { getInvoice } from "../invoices.ts";
import { getPayment } from "./payments.ts";

// A mock UPI flow for the hosted checkout. Nothing here talks to a real PSP or bank.
export const MERCHANT_VPA = "ledgerloop.demo@mockupi";

export class CheckoutError extends Error {}

export async function startUpiPayment(db: Db, invoiceNumber: string, payerVpa: string): Promise<{ payment: Payment; upiUri: string }> {
  if (!/^[a-z0-9.\-_]{2,64}@[a-z]{2,32}$/i.test(payerVpa)) throw new CheckoutError("Enter a UPI ID like name@okmock.");
  const invoice = await getInvoice(db, invoiceNumber);
  if (!invoice) throw new CheckoutError(`No invoice ${invoiceNumber}.`);
  if (invoice.duePaise <= 0) throw new CheckoutError(`${invoiceNumber} is already paid.`);

  const { rows } = await db.query<{ n: number }>("SELECT coalesce(max(substr(id, 5)::int), 1000)::int + 1 AS n FROM payments");
  const id = `PAY-${rows[0].n}`;
  await db.query(
    `INSERT INTO payments (id, invoice_id, payer_vpa, amount_paise, status)
     SELECT $1, id, $3, $4, 'PENDING' FROM invoices WHERE number = $2`,
    [id, invoiceNumber, payerVpa, invoice.duePaise],
  );
  const amount = (invoice.duePaise / 100).toFixed(2);
  const upiUri = `upi://pay?pa=${MERCHANT_VPA}&pn=LedgerLoop%20Demo&am=${amount}&cu=INR&tn=${invoiceNumber}`;
  return { payment: (await getPayment(db, id))!, upiUri };
}

// The mock UPI app approved the collect request: the payment settles at once and the bank
// statement for today gets a matching credit line.
export async function approveUpiPayment(db: Db, id: string, now = new Date()): Promise<Payment> {
  const payment = await getPayment(db, id);
  if (!payment) throw new CheckoutError(`No payment ${id}.`);
  if (payment.status !== "PENDING") return payment;
  const rrn = String(now.getTime()).slice(-12);
  await db.query("UPDATE payments SET status = 'SETTLED', rrn = $2, settled_at = $3 WHERE id = $1", [id, rrn, now]);
  await db.query(
    `INSERT INTO bank_lines (id, statement_date, amount_paise, rrn, posted_at, narration)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [`BNK-${id}`, todayIST(now), payment.amountPaise, rrn, now, `UPI/CR/${rrn}/${payment.payerVpa.toUpperCase()}`],
  );
  return (await getPayment(db, id))!;
}

export async function declineUpiPayment(db: Db, id: string): Promise<Payment> {
  const payment = await getPayment(db, id);
  if (!payment) throw new CheckoutError(`No payment ${id}.`);
  if (payment.status !== "PENDING") return payment;
  await db.query("UPDATE payments SET status = 'FAILED' WHERE id = $1", [id]);
  return (await getPayment(db, id))!;
}
