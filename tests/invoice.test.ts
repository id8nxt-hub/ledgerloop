import assert from "node:assert/strict";
import test from "node:test";
import { invoiceTotals } from "../packages/ledger/src/index.ts";
import type { LineItem } from "../packages/ledger/src/index.ts";

const starter: LineItem = { sku: "LL-STARTER", description: "Starter plan, monthly", qty: 1, unitPricePaise: 49900, gstRate: 18 };
const seat: LineItem = { sku: "LL-SEAT", description: "Extra seat, monthly", qty: 2, unitPricePaise: 14900, gstRate: 18 };

test("single line invoice", () => {
  const totals = invoiceTotals([starter]);
  assert.equal(totals.taxablePaise, 49900);
  assert.equal(totals.taxPaise, 8982);
  assert.equal(totals.totalPaise, 58882);
});

test("lines at one rate share a GST row", () => {
  const totals = invoiceTotals([starter, seat]);
  assert.deepEqual(totals.byRate, [{ rate: 18, taxablePaise: 79700, taxPaise: 14346 }]);
  assert.equal(totals.totalPaise, 94046);
});

test("no lines, no total", () => {
  assert.deepEqual(invoiceTotals([]), { taxablePaise: 0, taxPaise: 0, totalPaise: 0, byRate: [] });
});

test("rejects quantities and rates we cannot bill", () => {
  assert.throws(() => invoiceTotals([{ ...starter, qty: 0 }]));
  assert.throws(() => invoiceTotals([{ ...starter, unitPricePaise: 499.5 }]));
  assert.throws(() => invoiceTotals([{ ...starter, gstRate: 15 as never }]));
});
