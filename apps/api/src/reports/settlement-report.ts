import type { Db } from "../db.ts";

// What the ledger settled each IST day. The settlement dashboard's main table.
export interface SettlementDay {
  date: string; // YYYY-MM-DD, IST
  payments: number;
  grossPaise: number;
}

export async function settlementReport(db: Db): Promise<SettlementDay[]> {
  const { rows } = await db.query<{ date: string; payments: number; gross: number }>(`
    SELECT to_char(settled_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS date,
           count(*)::int AS payments,
           sum(amount_paise)::int AS gross
      FROM payments
     WHERE status = 'SETTLED'
     GROUP BY 1
     ORDER BY 1 DESC`);
  return rows.map((r) => ({ date: r.date, payments: r.payments, grossPaise: r.gross }));
}
