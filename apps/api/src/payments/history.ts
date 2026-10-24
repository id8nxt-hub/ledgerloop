import type { Payment } from "@ledgerloop/ledger";
import type { Db } from "../db.ts";
import { PAYMENT_SQL, toPayment } from "./payments.ts";
import type { PaymentRow } from "./payments.ts";

// A customer's payment history, newest payment first. Used by the customer statement page.
export async function paymentHistory(db: Db, customerId: string): Promise<Payment[]> {
  const { rows: invoices } = await db.query<{ id: number }>(
    "SELECT id FROM invoices WHERE customer_id = $1 ORDER BY issued_on DESC",
    [customerId],
  );
  const history: Payment[] = [];
  for (const invoice of invoices) {
    const { rows } = await db.query<PaymentRow>(`${PAYMENT_SQL} WHERE p.invoice_id = $1`, [invoice.id]);
    history.push(...rows.map(toPayment));
  }
  return history.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
}
