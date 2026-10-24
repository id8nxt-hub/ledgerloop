import { assertPaise, divideRoundHalfUp } from "./money.ts";
import type { Paise } from "./money.ts";

// GST slabs LedgerLoop bills at, in percent.
export const GST_RATES = [0, 5, 12, 18, 28] as const;
export type GstRate = (typeof GST_RATES)[number];

export function assertGstRate(rate: number): GstRate {
  if (!(GST_RATES as readonly number[]).includes(rate)) throw new RangeError(`unsupported GST rate: ${rate}%`);
  return rate as GstRate;
}

// GST on a taxable value, rounded half up to the paisa.
// Apply it once per rate, to the summed taxable value of that rate (see AGENTS.md).
export function gstOn(taxablePaise: Paise, rate: GstRate): Paise {
  assertPaise(taxablePaise, "taxable value");
  return divideRoundHalfUp(taxablePaise * assertGstRate(rate), 100);
}
