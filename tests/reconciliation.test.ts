import assert from "node:assert/strict";
import test from "node:test";
import { reconcile } from "../apps/api/src/reconciliation/reconcile.ts";
import type { BankLine, LedgerPayment } from "../apps/api/src/reconciliation/reconcile.ts";

// 20 Oct 2026: three customers paid ₹588.82 for the Starter plan that morning, and the PSP
// dropped the RRN from two of the bank's lines.
const payments: LedgerPayment[] = [
  { id: "PAY-1041", amountPaise: 58882, rrn: "629309581104", createdAt: "2026-10-20T04:28:00.000Z" },
  { id: "PAY-1042", amountPaise: 58882, rrn: "629310020417", createdAt: "2026-10-20T04:32:00.000Z" },
  { id: "PAY-1043", amountPaise: 58882, rrn: "629310150932", createdAt: "2026-10-20T04:45:00.000Z" },
  { id: "PAY-1044", amountPaise: 176882, rrn: "629311402268", createdAt: "2026-10-20T06:10:00.000Z" },
];

const statement: BankLine[] = [
  { id: "BNK-20-01", amountPaise: 176882, rrn: "629311402268", postedAt: "2026-10-20T06:11:00.000Z", narration: "UPI/CR/629311402268/KAVERI FREIGHT/OKMOCK" },
  { id: "BNK-20-02", amountPaise: 58882, rrn: null, postedAt: "2026-10-20T04:29:00.000Z", narration: "UPI/CR/NA/SAFFRON LANE/OKMOCK" },
  { id: "BNK-20-03", amountPaise: 58882, rrn: null, postedAt: "2026-10-20T04:46:00.000Z", narration: "UPI/CR/NA/LOTUS POND/OKMOCK" },
  { id: "BNK-20-04", amountPaise: 58882, rrn: "629310020417", postedAt: "2026-10-20T04:33:00.000Z", narration: "UPI/CR/629310020417/TEESTA TEA/OKMOCK" },
];

// The bank does not sort its statement file, so neither do we.
function asTheBankSendsIt<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

test("reconciles the 20 Oct statement in full", () => {
  const report = reconcile(payments, asTheBankSendsIt(statement));
  assert.deepEqual(report.unmatchedBankLines, []);
  assert.deepEqual(report.unmatchedPayments, []);
  assert.equal(report.matched.length, 4);
  assert.equal(report.differencePaise, 0);
});

test("a line with an RRN the ledger does not know stays unmatched", () => {
  const stranger: BankLine = { id: "BNK-20-09", amountPaise: 58882, rrn: "999999999999", postedAt: "2026-10-20T09:00:00.000Z", narration: "UPI/CR/999999999999/UNKNOWN" };
  const report = reconcile(payments.slice(3), [statement[0], stranger]);
  assert.deepEqual(report.unmatchedBankLines, ["BNK-20-09"]);
  assert.equal(report.differencePaise, 58882);
});

test("an empty day reconciles to zero", () => {
  assert.deepEqual(reconcile([], []), { matched: [], unmatchedBankLines: [], unmatchedPayments: [], bankPaise: 0, ledgerPaise: 0, differencePaise: 0 });
});
