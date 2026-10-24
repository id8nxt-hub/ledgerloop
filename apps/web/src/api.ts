// Typed fetches against the LedgerLoop API (proxied to :5100 by Vite).
import type { CreditNoteTotals, LineItem, Payment, Totals } from "@ledgerloop/ledger";

export interface InvoiceSummary {
  number: string;
  customer: string;
  issuedOn: string;
  dueOn: string;
  totalPaise: number;
  paidPaise: number;
  duePaise: number;
}

export interface InvoiceDetail extends InvoiceSummary {
  customerId: string;
  gstin: string;
  lines: LineItem[];
  totals: Totals;
  creditNotes: string[];
}

export interface CreditNoteDetail extends CreditNoteTotals {
  number: string;
  invoiceNumber: string;
  issuedOn: string;
  reason: string;
}

export interface SettlementDay {
  date: string;
  payments: number;
  grossPaise: number;
  refundsPaise: number;
  netPaise: number;
}

export interface DayReconciliation {
  date: string;
  report: {
    matched: { bankLineId: string; paymentId: string; amountPaise: number; by: "rrn" | "amount" }[];
    unmatchedBankLines: string[];
    unmatchedPayments: string[];
    bankPaise: number;
    ledgerPaise: number;
    differencePaise: number;
  };
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  invoices: () => get<InvoiceSummary[]>("/api/invoices"),
  invoice: (number: string) => get<InvoiceDetail>(`/api/invoices/${number}`),
  creditNote: (number: string) => get<CreditNoteDetail>(`/api/credit-notes/${number}`),
  payments: () => get<Payment[]>("/api/payments"),
  settlement: () => get<SettlementDay[]>("/api/reports/settlement"),
  reconciliation: () => get<DayReconciliation[]>("/api/reconciliation"),
};
