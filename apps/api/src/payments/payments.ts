import type { Payment, PaymentStatus } from "@ledgerloop/ledger";
import type { Db } from "../db.ts";

export interface PaymentRow {
  id: string;
  invoice_number: string;
  method: "UPI";
  payer_vpa: string;
  amount_paise: number;
  status: PaymentStatus;
  rrn: string | null;
  created_at: Date;
  settled_at: Date | null;
}

export const PAYMENT_SQL = `
  SELECT p.id, i.number AS invoice_number, p.method, p.payer_vpa, p.amount_paise, p.status, p.rrn,
         p.created_at, p.settled_at
    FROM payments p JOIN invoices i ON i.id = p.invoice_id`;

export function toPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    method: row.method,
    payerVpa: row.payer_vpa,
    amountPaise: row.amount_paise,
    status: row.status,
    rrn: row.rrn,
    createdAt: new Date(row.created_at).toISOString(),
    settledAt: row.settled_at ? new Date(row.settled_at).toISOString() : null,
  };
}

export async function listPayments(db: Db): Promise<Payment[]> {
  const { rows } = await db.query<PaymentRow>(`${PAYMENT_SQL} ORDER BY p.created_at DESC, p.id DESC`);
  return rows.map(toPayment);
}

export async function getPayment(db: Db, id: string): Promise<Payment | null> {
  const { rows } = await db.query<PaymentRow>(`${PAYMENT_SQL} WHERE p.id = $1`, [id]);
  return rows[0] ? toPayment(rows[0]) : null;
}
