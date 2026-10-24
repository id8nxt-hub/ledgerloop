// Payment statuses as the ledger records them. Ledger v1 renamed SUCCESS to SETTLED when
// settlement moved into the ledger; SUCCESS is no longer emitted anywhere.
export const PAYMENT_STATUSES = ["PENDING", "SETTLED", "FAILED", "REFUNDED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export type PaymentMethod = "UPI";

export interface Payment {
  id: string; // PAY-…
  invoiceNumber: string;
  method: PaymentMethod;
  payerVpa: string; // synthetic, e.g. asha.k@okmock
  amountPaise: number;
  status: PaymentStatus;
  rrn: string | null; // UPI retrieval reference number, set once the payment settles
  createdAt: string; // ISO
  settledAt: string | null;
}
