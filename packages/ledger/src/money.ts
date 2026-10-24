// Money in LedgerLoop is always an integer number of paise (₹1 = 100 paise).
// Rupees appear only at the edges: parsing input and formatting for people.

export type Paise = number;

export function assertPaise(value: number, what = "amount"): Paise {
  if (!Number.isSafeInteger(value)) throw new TypeError(`${what} must be a whole number of paise, got ${value}`);
  return value;
}

// "333.10" or 333.1 -> 33310. Only for input at the edge (forms, CSV); never for arithmetic.
export function rupeesToPaise(rupees: number | string): Paise {
  const text = typeof rupees === "number" ? rupees.toFixed(2) : rupees.trim();
  const match = /^(-)?(\d+)(?:\.(\d{1,2}))?$/.exec(text);
  if (!match) throw new TypeError(`not a rupee amount: ${rupees}`);
  const [, minus, whole, fraction = ""] = match;
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return minus ? -paise : paise;
}

// Divides two integers and rounds half up (away from zero for negatives), staying in integers.
export function divideRoundHalfUp(numerator: number, denominator: number): number {
  assertPaise(numerator, "numerator");
  assertPaise(denominator, "denominator");
  if (denominator <= 0) throw new RangeError("denominator must be positive");
  const sign = numerator < 0 ? -1 : 1;
  const n = Math.abs(numerator);
  const quotient = Math.floor(n / denominator);
  const remainder = n - quotient * denominator;
  return sign * (remainder * 2 >= denominator ? quotient + 1 : quotient);
}

const inr = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// 33310 -> "₹333.10", 12345678 -> "₹1,23,456.78"
export function formatINR(paise: Paise): string {
  assertPaise(paise);
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  return `${sign}₹${inr.format(Math.floor(abs / 100) + (abs % 100) / 100)}`;
}
