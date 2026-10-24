import type { Db } from "../db.ts";

// What the ledger settled each IST day. The settlement dashboard's main table.
export interface SettlementDay {
  date: string; // YYYY-MM-DD, IST
  payments: number;
  grossPaise: number;
  bankCreditedPaise: number; // what the bank statement credited that day
}

export async function settlementReport(db: Db): Promise<SettlementDay[]> {
  const { rows } = await db.query<{ date: string; payments: number; gross: number; bank: number }>(`
    WITH settled AS (
      SELECT to_char(settled_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS date,
             count(*)::int AS payments,
             sum(amount_paise)::int AS gross
        FROM payments
       WHERE status = 'SETTLED'
       GROUP BY 1
    ), credited AS (
      SELECT statement_date::text AS date, sum(amount_paise)::int AS bank
        FROM bank_lines
       GROUP BY 1
    )
    SELECT s.date, s.payments, s.gross, coalesce(c.bank, 0)::int AS bank
      FROM settled s LEFT JOIN credited c USING (date)
     ORDER BY s.date DESC`);
  return rows.map((r) => ({ date: r.date, payments: r.payments, grossPaise: r.gross, bankCreditedPaise: r.bank }));
}
