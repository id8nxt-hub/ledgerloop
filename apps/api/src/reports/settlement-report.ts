import type { Db } from "../db.ts";

// What the ledger settled each IST day. The settlement dashboard's main table.
export interface SettlementDay {
  date: string; // YYYY-MM-DD, IST
  payments: number; // settled that day, including any refunded since
  grossPaise: number;
  refundsPaise: number;
  netPaise: number; // gross minus refunds
}

export async function settlementReport(db: Db): Promise<SettlementDay[]> {
  const { rows } = await db.query<{ date: string; payments: number; gross: number; refunds: number }>(`
    SELECT to_char(settled_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS date,
           count(*)::int AS payments,
           sum(amount_paise)::int AS gross,
           coalesce(sum(amount_paise) FILTER (WHERE status = 'REFUNDED'), 0)::int AS refunds
      FROM payments
     WHERE status IN ('SETTLED', 'REFUNDED')
     GROUP BY 1
     ORDER BY 1 DESC`);
  return rows.map((r) => ({
    date: r.date,
    payments: r.payments,
    grossPaise: r.gross,
    refundsPaise: r.refunds,
    netPaise: r.gross - r.refunds,
  }));
}
