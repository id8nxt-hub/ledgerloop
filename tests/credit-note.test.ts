import assert from "node:assert/strict";
import test from "node:test";
import { creditNoteTotals } from "../packages/ledger/src/index.ts";

test("credits a single returned seat", () => {
  const note = creditNoteTotals([{ sku: "LL-SEAT", description: "Extra seat, monthly", qty: 1, unitPricePaise: 14900, gstRate: 18 }]);
  assert.equal(note.taxablePaise, 14900);
  assert.equal(note.taxPaise, 2682);
  assert.equal(note.totalPaise, 17582);
  assert.equal(note.lines[0].creditTaxPaise, 2682);
});
