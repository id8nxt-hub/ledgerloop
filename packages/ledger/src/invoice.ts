import { assertGstRate, gstOn } from "./gst.ts";
import type { GstRate } from "./gst.ts";
import { assertPaise } from "./money.ts";
import type { Paise } from "./money.ts";

export interface LineItem {
  sku: string;
  description: string;
  qty: number; // whole units
  unitPricePaise: Paise;
  gstRate: GstRate;
}

export interface RateSummary {
  rate: GstRate;
  taxablePaise: Paise;
  taxPaise: Paise;
}

export interface Totals {
  taxablePaise: Paise;
  taxPaise: Paise;
  totalPaise: Paise;
  byRate: RateSummary[]; // one row per GST rate on the document, lowest rate first
}

export function lineAmount(line: LineItem): Paise {
  if (!Number.isSafeInteger(line.qty) || line.qty <= 0) throw new RangeError(`qty must be a positive whole number (${line.sku})`);
  assertPaise(line.unitPricePaise, `unit price of ${line.sku}`);
  assertGstRate(line.gstRate);
  return line.qty * line.unitPricePaise;
}

// The invoice total, from line items to the amount the customer pays.
export function invoiceTotals(lines: LineItem[]): Totals {
  const byRate = new Map<GstRate, RateSummary>();
  for (const line of lines) {
    const amount = lineAmount(line);
    const row = byRate.get(line.gstRate) ?? { rate: line.gstRate, taxablePaise: 0, taxPaise: 0 };
    row.taxablePaise += amount;
    row.taxPaise += gstOn(amount, line.gstRate);
    byRate.set(line.gstRate, row);
  }
  const rows = [...byRate.values()].sort((a, b) => a.rate - b.rate);
  const taxablePaise = rows.reduce((sum, r) => sum + r.taxablePaise, 0);
  const taxPaise = rows.reduce((sum, r) => sum + r.taxPaise, 0);
  return { taxablePaise, taxPaise, totalPaise: taxablePaise + taxPaise, byRate: rows };
}
