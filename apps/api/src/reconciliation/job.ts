import type { Db } from "../db.ts";
import { reconcile } from "./reconcile.ts";
import type { BankLine, LedgerPayment, ReconciliationReport } from "./reconcile.ts";

export interface DayReconciliation {
  date: string; // YYYY-MM-DD, IST
  report: ReconciliationReport;
}

// Reconciles one IST day: the bank's credit lines against payments the ledger settled that day.
export async function reconcileDay(db: Db, date: string): Promise<DayReconciliation> {
  const { rows: payments } = await db.query<{ id: string; amount_paise: number; rrn: string | null; created_at: Date }>(
    `SELECT id, amount_paise, rrn, created_at FROM payments
      WHERE status IN ('SETTLED', 'REFUNDED')
        AND (settled_at AT TIME ZONE 'Asia/Kolkata')::date = $1::date`,
    [date],
  );
  // Read the statement as the bank sent it.
  const { rows: lines } = await db.query<{ id: string; amount_paise: number; rrn: string | null; posted_at: Date; narration: string }>(
    "SELECT id, amount_paise, rrn, posted_at, narration FROM bank_lines WHERE statement_date = $1::date",
    [date],
  );
  const ledger: LedgerPayment[] = payments.map((p) => ({
    id: p.id,
    amountPaise: p.amount_paise,
    rrn: p.rrn,
    createdAt: new Date(p.created_at).toISOString(),
  }));
  const bank: BankLine[] = lines.map((l) => ({
    id: l.id,
    amountPaise: l.amount_paise,
    rrn: l.rrn,
    postedAt: new Date(l.posted_at).toISOString(),
    narration: l.narration,
  }));
  return { date, report: reconcile(ledger, bank) };
}

// Every statement day the bank has sent, newest first.
export async function reconcileAll(db: Db): Promise<DayReconciliation[]> {
  const { rows } = await db.query<{ date: string }>(
    "SELECT DISTINCT statement_date::text AS date FROM bank_lines ORDER BY date DESC",
  );
  const days: DayReconciliation[] = [];
  for (const { date } of rows) days.push(await reconcileDay(db, date));
  return days;
}
