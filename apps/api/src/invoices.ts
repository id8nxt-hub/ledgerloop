import { creditNoteTotals, invoiceTotals } from "@ledgerloop/ledger";
import type { CreditNoteTotals, GstRate, LineItem, Totals } from "@ledgerloop/ledger";
import type { Db } from "./db.ts";

interface LineRow {
  sku: string;
  description: string;
  qty: number;
  unit_price_paise: number;
  gst_rate: number;
}

function toLineItem(row: LineRow): LineItem {
  return {
    sku: row.sku,
    description: row.description,
    qty: row.qty,
    unitPricePaise: row.unit_price_paise,
    gstRate: row.gst_rate as GstRate,
  };
}

export interface InvoiceSummary {
  number: string;
  customer: string;
  issuedOn: string;
  dueOn: string;
  totalPaise: number;
  paidPaise: number; // settled payments only
  duePaise: number;
}

export interface InvoiceDetail extends InvoiceSummary {
  customerId: string;
  gstin: string;
  lines: LineItem[];
  totals: Totals;
  creditNotes: string[];
}

const INVOICE_SQL = `
  SELECT i.id, i.number, i.issued_on::text AS issued_on, i.due_on::text AS due_on,
         c.id AS customer_id, c.name AS customer, c.gstin,
         coalesce((SELECT sum(p.amount_paise) FROM payments p
                    WHERE p.invoice_id = i.id AND p.status = 'SETTLED'), 0)::int AS paid
    FROM invoices i JOIN customers c ON c.id = i.customer_id`;

interface InvoiceRow {
  id: number;
  number: string;
  issued_on: string;
  due_on: string;
  customer_id: string;
  customer: string;
  gstin: string;
  paid: number;
}

function summary(row: InvoiceRow, totals: Totals): InvoiceSummary {
  return {
    number: row.number,
    customer: row.customer,
    issuedOn: row.issued_on,
    dueOn: row.due_on,
    totalPaise: totals.totalPaise,
    paidPaise: row.paid,
    duePaise: Math.max(0, totals.totalPaise - row.paid),
  };
}

export async function listInvoices(db: Db): Promise<InvoiceSummary[]> {
  const { rows } = await db.query<InvoiceRow>(`${INVOICE_SQL} ORDER BY i.issued_on DESC, i.number DESC`);
  const { rows: lines } = await db.query<LineRow & { invoice_id: number }>(
    "SELECT * FROM invoice_lines ORDER BY invoice_id, position",
  );
  return rows.map((row) => summary(row, invoiceTotals(lines.filter((l) => l.invoice_id === row.id).map(toLineItem))));
}

export async function getInvoice(db: Db, number: string): Promise<InvoiceDetail | null> {
  const { rows } = await db.query<InvoiceRow>(`${INVOICE_SQL} WHERE i.number = $1`, [number]);
  if (!rows[0]) return null;
  const { rows: lineRows } = await db.query<LineRow>(
    "SELECT * FROM invoice_lines WHERE invoice_id = $1 ORDER BY position",
    [rows[0].id],
  );
  const { rows: notes } = await db.query<{ number: string }>(
    "SELECT number FROM credit_notes WHERE invoice_id = $1 ORDER BY number",
    [rows[0].id],
  );
  const lines = lineRows.map(toLineItem);
  const totals = invoiceTotals(lines);
  return {
    ...summary(rows[0], totals),
    customerId: rows[0].customer_id,
    gstin: rows[0].gstin,
    lines,
    totals,
    creditNotes: notes.map((n) => n.number),
  };
}

export interface CreditNoteDetail extends CreditNoteTotals {
  number: string;
  invoiceNumber: string;
  issuedOn: string;
  reason: string;
}

export async function getCreditNote(db: Db, number: string): Promise<CreditNoteDetail | null> {
  const { rows } = await db.query<{ id: number; number: string; invoice: string; issued_on: string; reason: string }>(
    `SELECT n.id, n.number, i.number AS invoice, n.issued_on::text AS issued_on, n.reason
       FROM credit_notes n JOIN invoices i ON i.id = n.invoice_id WHERE n.number = $1`,
    [number],
  );
  if (!rows[0]) return null;
  const { rows: lineRows } = await db.query<LineRow>(
    "SELECT * FROM credit_note_lines WHERE credit_note_id = $1 ORDER BY position",
    [rows[0].id],
  );
  return {
    number: rows[0].number,
    invoiceNumber: rows[0].invoice,
    issuedOn: rows[0].issued_on,
    reason: rows[0].reason,
    ...creditNoteTotals(lineRows.map(toLineItem)),
  };
}
