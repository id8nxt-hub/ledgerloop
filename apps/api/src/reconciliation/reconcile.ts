// Matches one day's bank statement against the ledger's settled UPI payments.
//
// Rules agreed with finance:
// 1. A bank line that carries an RRN matches the ledger payment with that RRN.
// 2. Some PSPs drop the RRN from the bank narration. A line without an RRN falls back to the
//    earliest unmatched payment with the same amount.
// 3. A line whose RRN the ledger does not know stays unmatched. Never guess.
//
// The bank does not promise any order within a statement file, so the same statement must
// always produce the same report.

export interface LedgerPayment {
  id: string;
  amountPaise: number;
  rrn: string | null;
  createdAt: string; // ISO
}

export interface BankLine {
  id: string;
  amountPaise: number;
  rrn: string | null;
  postedAt: string; // ISO
  narration: string;
}

export interface Match {
  bankLineId: string;
  paymentId: string;
  amountPaise: number;
  by: "rrn" | "amount";
}

export interface ReconciliationReport {
  matched: Match[]; // sorted by bank line id
  unmatchedBankLines: string[]; // sorted ids
  unmatchedPayments: string[]; // sorted ids
  bankPaise: number;
  ledgerPaise: number;
  differencePaise: number; // bank minus ledger
}

const byCreatedAt = (a: LedgerPayment, b: LedgerPayment) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);

export function reconcile(payments: LedgerPayment[], bankLines: BankLine[]): ReconciliationReport {
  const pool = [...payments].sort(byCreatedAt);
  const taken = new Set<string>();
  const matched: Match[] = [];
  const unmatchedBankLines: string[] = [];

  for (const line of bankLines) {
    const payment = line.rrn
      ? pool.find((p) => p.rrn === line.rrn && !taken.has(p.id))
      : pool.find((p) => p.amountPaise === line.amountPaise && !taken.has(p.id));
    if (!payment) {
      unmatchedBankLines.push(line.id);
      continue;
    }
    taken.add(payment.id);
    matched.push({ bankLineId: line.id, paymentId: payment.id, amountPaise: line.amountPaise, by: line.rrn ? "rrn" : "amount" });
  }

  const bankPaise = bankLines.reduce((sum, l) => sum + l.amountPaise, 0);
  const ledgerPaise = payments.reduce((sum, p) => sum + p.amountPaise, 0);
  return {
    matched: matched.sort((a, b) => a.bankLineId.localeCompare(b.bankLineId)),
    unmatchedBankLines: unmatchedBankLines.sort(),
    unmatchedPayments: pool.filter((p) => !taken.has(p.id)).map((p) => p.id).sort(),
    bankPaise,
    ledgerPaise,
    differencePaise: bankPaise - ledgerPaise,
  };
}
