import { gstOn } from "./gst.ts";
import type { GstRate } from "./gst.ts";
import { lineAmount } from "./invoice.ts";
import type { LineItem, RateSummary } from "./invoice.ts";
import type { Paise } from "./money.ts";

// A credit note gives back some lines of an invoice (unused SMS packs, a returned seat).
export interface CreditedLine extends LineItem {
  creditTaxPaise: Paise; // shown per line on the credit note PDF
}

export interface CreditNoteTotals {
  lines: CreditedLine[];
  taxablePaise: Paise;
  taxPaise: Paise;
  totalPaise: Paise;
  byRate: RateSummary[];
}

export function creditNoteTotals(returned: LineItem[]): CreditNoteTotals {
  const lines = returned.map((line) => ({ ...line, creditTaxPaise: gstOn(lineAmount(line), line.gstRate) }));

  const byRate = new Map<GstRate, RateSummary>();
  for (const line of lines) {
    const row = byRate.get(line.gstRate) ?? { rate: line.gstRate, taxablePaise: 0, taxPaise: 0 };
    row.taxablePaise += lineAmount(line);
    row.taxPaise += line.creditTaxPaise;
    byRate.set(line.gstRate, row);
  }

  const taxablePaise = lines.reduce((sum, l) => sum + lineAmount(l), 0);
  const taxPaise = lines.reduce((sum, l) => sum + l.creditTaxPaise, 0);
  return {
    lines,
    taxablePaise,
    taxPaise,
    totalPaise: taxablePaise + taxPaise,
    byRate: [...byRate.values()].sort((a, b) => a.rate - b.rate),
  };
}
